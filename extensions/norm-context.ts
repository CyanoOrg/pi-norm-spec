import { fileURLToPath } from "node:url";

import type {
  ContextEvent,
  ExtensionAPI,
  ExtensionContext,
  ToolResultEvent,
} from "@earendil-works/pi-coding-agent";

import {
  BridgeClient,
  BridgeClientError,
  BridgeRequestCancelledError,
  type BridgeLaunch,
} from "./bridge-client.ts";
import { resolvePlatformRuntime } from "./runtime-resolver.ts";
import { mutationPath, nextTargetSet } from "./target-tracking.ts";
import {
  parseValidationResponse,
  presentValidation,
  presentValidationFailure,
  shouldValidateAfterTool,
  type ToolResultContentPatch,
} from "./validation-feedback.ts";

const STATUS_KEY = "pi-norm-spec";
const CONTEXT_MESSAGE_TYPE = "pi-norm-spec-context";
const PROMPT_CONTEXT_MULTI_API = "pi-norm-spec/prompt-context-multi/v1";
const LAYOUT_INDEX_API = "pi-norm-spec/layout-index/v1";
const INCOMPLETE_BEHAVIOR = "enforcement is not implemented";
const PI_NORM_SKILL = fileURLToPath(
  new URL("../skills/pi-norm-spec/SKILL.md", import.meta.url),
);

interface PromptContextMultiScope {
  target: string;
  conventionPaths: string[];
}

interface PromptContextMultiResult {
  apiVersion: typeof PROMPT_CONTEXT_MULTI_API;
  root: string;
  scopes: PromptContextMultiScope[];
  prompt: string | null;
}

interface LayoutIndexResult {
  apiVersion: typeof LAYOUT_INDEX_API;
  prompt: string | null;
}

export interface NormContextOptions {
  resolveRuntime?: () => Promise<BridgeLaunch>;
}

class NormBridgeLifecycle {
  private readonly resolveRuntime: () => Promise<BridgeLaunch>;
  private client: BridgeClient | undefined;
  private failure: BridgeClientError | undefined;
  private contextFailure: BridgeClientError | undefined;
  private lastContext: PromptContextMultiResult | undefined;
  private targetSet: string[] = ["."];
  private lastMutationPath: string | undefined;
  private layoutIndexPrompt: string | undefined;
  private onboardingNotified = false;
  private validationFailure: BridgeClientError | undefined;
  private validationTail: Promise<void> = Promise.resolve();
  private generation = 0;

  constructor(resolveRuntime: () => Promise<BridgeLaunch>) {
    this.resolveRuntime = resolveRuntime;
  }

  async start(ctx: ExtensionContext): Promise<void> {
    const generation = ++this.generation;
    const previous = this.client;
    this.client = undefined;
    this.failure = undefined;
    this.contextFailure = undefined;
    this.lastContext = undefined;
    this.targetSet = ["."];
    this.lastMutationPath = undefined;
    this.layoutIndexPrompt = undefined;
    this.onboardingNotified = false;
    this.validationFailure = undefined;
    this.validationTail = Promise.resolve();
    ctx.ui.setStatus(STATUS_KEY, "norm: starting");
    try {
      if (previous && previous.getStatus().state !== "failed") {
        await previous.shutdown();
      }
      if (generation !== this.generation) return;
      const launch = await this.resolveRuntime();
      if (generation !== this.generation) return;
      const client = await BridgeClient.start({
        ...launch,
        onFailure: (failure) => {
          if (generation === this.generation) this.recordFailure(ctx, failure);
        },
      });
      if (generation !== this.generation) {
        await client.shutdown();
        return;
      }
      this.client = client;
      const payload = client.getStatus().ready?.payload;
      const tag = typeof payload?.tag === "string" ? payload.tag : "unknown";
      ctx.ui.setStatus(STATUS_KEY, `norm: ${tag}`);
      void this.refreshLayoutIndex(client, ctx);
    } catch (error) {
      if (generation === this.generation) this.recordFailure(ctx, asBridgeError(error));
    }
  }

  async stop(ctx: ExtensionContext): Promise<void> {
    ++this.generation;
    const client = this.client;
    this.client = undefined;
    this.validationTail = Promise.resolve();
    ctx.ui.setStatus(STATUS_KEY, undefined);
    if (!client || client.getStatus().state === "failed") return;
    try {
      await client.shutdown();
    } catch (error) {
      ctx.ui.notify(`pi-norm-spec shutdown failed: ${errorMessage(error)}`, "error");
    }
  }

  updateTarget(toolName: string, input: Readonly<Record<string, unknown>>): void {
    this.targetSet = nextTargetSet(this.targetSet, toolName, input);
    if (toolName === "write" || toolName === "edit") {
      this.lastMutationPath = mutationPath(input);
    }
  }

  async inject(
    messages: ContextEvent["messages"],
    ctx: ExtensionContext,
  ): Promise<{ messages: ContextEvent["messages"] }> {
    const withoutPriorContext = messages.filter((message) => !isContextMessage(message));
    const client = this.client;
    if (!client || client.getStatus().state !== "ready") {
      return { messages: withoutPriorContext };
    }

    try {
      const value = await client.request<unknown>(
        "promptContextMulti",
        { root: ctx.cwd, targets: this.targetSet },
        ctx.signal,
      );
      const context = parsePromptContextMulti(value);
      this.contextFailure = undefined;
      this.lastContext = context;
      this.setContextStatus(ctx, context);
      if (context.prompt === null) {
        this.notifyOnboarding(ctx);
        return { messages: withoutPriorContext };
      }

      const blocks = [this.layoutIndexPrompt, context.prompt].filter(
        (block): block is string => block !== undefined,
      );
      return {
        messages: [
          ...withoutPriorContext,
          {
            role: "custom" as const,
            customType: CONTEXT_MESSAGE_TYPE,
            content: blocks.join("\n"),
            display: false,
            details: {
              apiVersion: context.apiVersion,
              targets: context.scopes.map((scope) => scope.target),
              conventionPaths: uniqueConventionPaths(context),
            },
            timestamp: Date.now(),
          },
        ],
      };
    } catch (error) {
      if (error instanceof BridgeRequestCancelledError) {
        return { messages: withoutPriorContext };
      }
      this.recordContextFailure(ctx, asBridgeError(error));
      return { messages: withoutPriorContext };
    }
  }

  async validateAfterTool(
    event: ToolResultEvent,
    ctx: ExtensionContext,
  ): Promise<ToolResultContentPatch | undefined> {
    if (!shouldValidateAfterTool(event)) return undefined;
    const generation = this.generation;
    return this.enqueueValidation(async () => {
      if (generation !== this.generation) return undefined;
      const client = this.client;
      if (!client || client.getStatus().state !== "ready") {
        const failure =
          this.failure ??
          new BridgeClientError(
            "pi-norm-spec/client/validation-unavailable",
            "the verified bridge is not ready for post-edit validation",
          );
        return this.recordValidationFailure(ctx, event, failure);
      }

      try {
        const value = await client.request<unknown>("validate", { root: ctx.cwd }, ctx.signal);
        if (generation !== this.generation) return undefined;
        const response = parseValidationResponse(value);
        this.validationFailure = undefined;
        const presentation = presentValidation(response, event.content);
        ctx.ui.setStatus(STATUS_KEY, presentation.status);
        if (presentation.notice) {
          ctx.ui.notify(presentation.notice.message, presentation.notice.level);
        }
        const edited = this.lastMutationPath;
        this.lastMutationPath = undefined;
        if (edited !== undefined && (edited === ".norm" || edited.endsWith("/.norm"))) {
          await this.refreshLayoutIndex(client, ctx);
        }
        return presentation.patch;
      } catch (error) {
        if (error instanceof BridgeRequestCancelledError) return undefined;
        return this.recordValidationFailure(ctx, event, asBridgeError(error));
      }
    });
  }

  status(): string {
    const status = this.client?.getStatus();
    if (this.failure) {
      return `pi-norm-spec runtime failed [${this.failure.code}]: ${this.failure.message}`;
    }
    if (this.contextFailure) {
      return `pi-norm-spec context failed [${this.contextFailure.code}]: ${this.contextFailure.message}`;
    }
    if (status?.state === "ready") {
      const tag = typeof status.ready?.payload.tag === "string" ? status.ready.payload.tag : "unknown";
      const target =
        typeof status.ready?.payload.target === "string" ? status.ready.payload.target : "unknown";
      const collected = this.lastContext
        ? `; context ${uniqueConventionPaths(this.lastContext).length} @ ${this.lastContext.scopes
            .map((scope) => scope.target)
            .join(",")}`
        : "";
      return `pi-norm-spec runtime ready: ${tag} (${target})${collected}; ${INCOMPLETE_BEHAVIOR}`;
    }
    return `pi-norm-spec runtime is not started; ${INCOMPLETE_BEHAVIOR}`;
  }

  private setContextStatus(ctx: ExtensionContext, context: PromptContextMultiResult): void {
    const count = uniqueConventionPaths(context).length;
    const targets = context.scopes.map((scope) => scope.target).join(",");
    ctx.ui.setStatus(STATUS_KEY, count === 0 ? `norm: empty @ ${targets}` : `norm: ${count} @ ${targets}`);
  }

  private async refreshLayoutIndex(client: BridgeClient, ctx: ExtensionContext): Promise<void> {
    try {
      const value = await client.request<unknown>("layoutIndex", { root: ctx.cwd }, ctx.signal);
      const layout = parseLayoutIndex(value);
      this.layoutIndexPrompt = layout.prompt ?? undefined;
    } catch {
      // Keep the previously rendered block: the layout is auxiliary guidance
      // and a failed refresh must not blank it silently (D019).
    }
  }

  private recordContextFailure(ctx: ExtensionContext, failure: BridgeClientError): void {
    const repeated = sameFailure(this.contextFailure, failure);
    this.contextFailure = failure;
    this.lastContext = undefined;
    ctx.ui.setStatus(STATUS_KEY, "norm: context failed");
    if (!repeated) {
      ctx.ui.notify(`pi-norm-spec context failed [${failure.code}]: ${failure.message}`, "error");
    }
  }

  private recordValidationFailure(
    ctx: ExtensionContext,
    event: ToolResultEvent,
    failure: BridgeClientError,
  ): ToolResultContentPatch {
    const repeated = sameFailure(this.validationFailure, failure);
    this.validationFailure = failure;
    const presentation = presentValidationFailure(failure, event.content);
    ctx.ui.setStatus(STATUS_KEY, presentation.status);
    if (!repeated && presentation.notice) {
      ctx.ui.notify(presentation.notice.message, presentation.notice.level);
    }
    return presentation.patch ?? { content: event.content };
  }

  private enqueueValidation<T>(task: () => Promise<T>): Promise<T> {
    const result = this.validationTail.then(task, task);
    this.validationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private notifyOnboarding(ctx: ExtensionContext): void {
    if (this.onboardingNotified) return;
    this.onboardingNotified = true;
    ctx.ui.notify(
      "pi-norm-spec found no .norm conventions. The pi-norm-spec Skill can guide an explicit setup; no project files were created.",
      "info",
    );
  }

  private recordFailure(ctx: ExtensionContext, failure: BridgeClientError): void {
    if (this.failure === failure) return;
    this.failure = failure;
    ctx.ui.setStatus(STATUS_KEY, "norm: failed");
    ctx.ui.notify(`pi-norm-spec runtime failed [${failure.code}]: ${failure.message}`, "error");
  }
}

/** Register the session-scoped Rust bridge lifecycle and status command. */
export function registerNormContext(pi: ExtensionAPI, options: NormContextOptions = {}): void {
  const lifecycle = new NormBridgeLifecycle(options.resolveRuntime ?? resolvePlatformRuntime);

  pi.on("session_start", async (_event, ctx) => lifecycle.start(ctx));
  pi.on("session_shutdown", async (_event, ctx) => lifecycle.stop(ctx));
  pi.on("resources_discover", () => ({ skillPaths: [PI_NORM_SKILL] }));
  pi.on("tool_call", (event) => lifecycle.updateTarget(event.toolName, event.input));
  pi.on("tool_result", (event, ctx) => lifecycle.validateAfterTool(event, ctx));
  pi.on("context", async (event, ctx) => lifecycle.inject(event.messages, ctx));

  pi.registerCommand("norm-status", {
    description: "Show the pi-norm-spec runtime status",
    handler: async (_args, ctx) => {
      const status = lifecycle.status();
      ctx.ui.notify(status, status.includes("failed") ? "error" : "info");
    },
  });
}

export default registerNormContext;

function asBridgeError(error: unknown): BridgeClientError {
  return error instanceof BridgeClientError
    ? error
    : new BridgeClientError("pi-norm-spec/client/startup-failed", errorMessage(error));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePromptContextMulti(value: unknown): PromptContextMultiResult {
  if (
    !isRecord(value) ||
    value.apiVersion !== PROMPT_CONTEXT_MULTI_API ||
    typeof value.root !== "string" ||
    !Array.isArray(value.scopes)
  ) {
    throw new BridgeClientError(
      "pi-norm-spec/client/context-invalid",
      "bridge prompt context had an unexpected schema or empty-state contract",
    );
  }
  const scopes = value.scopes.map((scope) => {
    if (
      !isRecord(scope) ||
      typeof scope.target !== "string" ||
      !Array.isArray(scope.conventionPaths) ||
      !scope.conventionPaths.every((path) => typeof path === "string")
    ) {
      throw new BridgeClientError(
        "pi-norm-spec/client/context-invalid",
        "bridge prompt context had an unexpected schema or empty-state contract",
      );
    }
    return { target: scope.target, conventionPaths: [...scope.conventionPaths] };
  });
  const everyScopeEmpty = scopes.every((scope) => scope.conventionPaths.length === 0);
  if (
    !(typeof value.prompt === "string" || value.prompt === null) ||
    everyScopeEmpty !== (value.prompt === null)
  ) {
    throw new BridgeClientError(
      "pi-norm-spec/client/context-invalid",
      "bridge prompt context had an unexpected schema or empty-state contract",
    );
  }
  return {
    apiVersion: PROMPT_CONTEXT_MULTI_API,
    root: value.root,
    scopes,
    prompt: value.prompt,
  };
}

function parseLayoutIndex(value: unknown): LayoutIndexResult {
  if (
    !isRecord(value) ||
    value.apiVersion !== LAYOUT_INDEX_API ||
    !Array.isArray(value.entries) ||
    !(typeof value.prompt === "string" || value.prompt === null) ||
    (value.entries.length === 0) !== (value.prompt === null)
  ) {
    throw new BridgeClientError(
      "pi-norm-spec/client/layout-index-invalid",
      "bridge layout index had an unexpected schema or empty-state contract",
    );
  }
  return { apiVersion: LAYOUT_INDEX_API, prompt: value.prompt };
}

function uniqueConventionPaths(context: PromptContextMultiResult): string[] {
  const paths = new Set<string>();
  for (const scope of context.scopes) {
    for (const path of scope.conventionPaths) paths.add(path);
  }
  return [...paths];
}

function isContextMessage(value: unknown): boolean {
  return isRecord(value) && value.role === "custom" && value.customType === CONTEXT_MESSAGE_TYPE;
}

function sameFailure(left: BridgeClientError | undefined, right: BridgeClientError): boolean {
  return left?.code === right.code && left.message === right.message && left.path === right.path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
