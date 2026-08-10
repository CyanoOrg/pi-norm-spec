import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BOOTSTRAP_STATUS =
  "pi-norm-spec 0.2.0-alpha.1: bridge identity only; injection and enforcement are not implemented";

/** Register the bootstrap pi adapter. */
export default function registerNormContext(pi: ExtensionAPI): void {
  pi.registerCommand("norm-status", {
    description: "Show pi-norm-spec bootstrap status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(BOOTSTRAP_STATUS, "info");
    },
  });
}
