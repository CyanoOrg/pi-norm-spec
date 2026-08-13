import { createInterface } from "node:readline";

const apiVersion = "pi-norm-spec/bridge/v1";
const mode = process.argv[2] ?? "ready";
const emit = (frame) => process.stdout.write(`${JSON.stringify(frame)}\n`);

if (mode === "startup-failure") {
  emit({
    apiVersion,
    type: "event",
    event: "startupFailed",
    error: { code: "fake/startup", message: "fake startup failure", path: null },
  });
  process.exitCode = 1;
} else if (mode === "malformed") {
  process.stdout.write("{not-json}\n");
} else {
  emit({
    apiVersion,
    type: "event",
    event: "ready",
    payload: { tag: "v0.1.0-rc.1", target: "test-target" },
    compatibility: { apiVersion: "norm-spec/compatibility/v1" },
  });
  if (mode === "crash-after-ready") {
    setTimeout(() => process.exit(19), 20);
  }

  let active;
  const lines = createInterface({ input: process.stdin });
  lines.on("line", (line) => {
    const request = JSON.parse(line);
    if (request.method === "status") {
      emit({ apiVersion, type: "response", id: request.id, status: "ok", result: { healthy: true } });
    } else if (request.method === "collect" && mode === "crash") {
      process.exit(17);
    } else if (request.method === "collect") {
      active = request.id;
    } else if (request.method === "cancel") {
      emit({
        apiVersion,
        type: "response",
        id: request.id,
        status: "ok",
        result: { requestId: request.params.requestId, accepted: request.params.requestId === active },
      });
      if (request.params.requestId === active) {
        emit({ apiVersion, type: "response", id: active, status: "cancelled" });
        active = undefined;
      }
    } else if (request.method === "shutdown") {
      if (active) {
        emit({ apiVersion, type: "response", id: active, status: "cancelled" });
        active = undefined;
      }
      emit({ apiVersion, type: "response", id: request.id, status: "ok" });
      setImmediate(() => process.exit(0));
    }
  });
}
