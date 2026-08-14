# Bridge Protocol

`pi-norm-spec/bridge/v1` is the process contract between the TypeScript pi
adapter and one session-scoped `pi-norm-bridge` child. It does not define
`.norm` syntax or validation semantics.

## Transport

- The adapter starts `pi-norm-bridge serve --payload <sealed-payload>`.
- Standard input and standard output carry UTF-8 newline-delimited JSON.
- Every input frame must end with `\n` and may contain at most 1 MiB including
  the terminator.
- Request IDs contain 1–128 UTF-8 bytes and are unique within one session. A
  session accepts at most 65,536 unique IDs.
- The bridge permits one active collect, prompt-context, or validate operation.
  Control requests remain available while that operation runs.

## Events

The first successful output is `ready`; it binds the exact sealed payload and
the complete upstream compatibility identity:

```json
{"apiVersion":"pi-norm-spec/bridge/v1","type":"event","event":"ready","payload":{"tag":"v0.1.0-rc.1"},"compatibility":{"apiVersion":"norm-spec/compatibility/v1"}}
```

Payload or handshake failure emits `startupFailed` and exits non-zero. Invalid
framing, protocol mismatch, reused IDs, unexpected input closure, and internal
correlation failures emit `fatal` and exit non-zero. Both events contain a
stable `error` object.

## Requests

Every request has the common fields below:

```json
{"apiVersion":"pi-norm-spec/bridge/v1","type":"request","id":"request-1","method":"status"}
```

Supported methods:

| Method | Parameters | Behavior |
|---|---|---|
| `status` | none | Return the active sealed payload identity. |
| `collect` | `root`, `target` | Run the verified upstream collect protocol. |
| `promptContext` | `root`, `target` | Collect and render `pi-norm-spec/prompt-context/v1` for ephemeral host injection. |
| `validate` | `root` | Run strict upstream validation for all `.norm` files. |
| `cancel` | `requestId` | Cancel exactly one active semantic request. |
| `shutdown` | none | Cancel active work if needed, acknowledge, then exit zero. |

Unknown methods, invalid parameters, a second concurrent semantic operation,
or cancellation of a non-active request return a request-scoped error and do
not change the bridge lifecycle. Prompt-context results follow
`docs/planning/gate-d-design.md`: complete normalized content, a typed empty
state, and no truncation or lossy TypeScript summary.

## Responses

Every request receives exactly one terminal response with the same ID:

```json
{"apiVersion":"pi-norm-spec/bridge/v1","type":"response","id":"request-1","status":"ok","result":{}}
{"apiVersion":"pi-norm-spec/bridge/v1","type":"response","id":"request-2","status":"error","error":{"code":"pi-norm-spec/bridge/busy","message":"another upstream operation is already active","path":null}}
{"apiVersion":"pi-norm-spec/bridge/v1","type":"response","id":"request-3","status":"cancelled"}
```

`cancel` has its own request ID. When accepted, its `ok` result names the
target and the target later receives `cancelled`. A shutdown received during
active work emits the work's terminal response before the shutdown
acknowledgement.

## Failure policy

The adapter must reject all pending promises on `startupFailed`, `fatal`,
malformed output, unexpected EOF, or non-zero exit. It must not synthesize an
empty collection, start a one-shot fallback, or silently restart the child.

## Platform runtime locator

The TypeScript resolver maps the four supported Node platform/architecture
pairs to `pi-norm-spec-linux-x64`, `pi-norm-spec-darwin-arm64`,
`pi-norm-spec-darwin-x64`, or `pi-norm-spec-win32-x64`. Each optional package
exports `runtime.json` with this contract:

```json
{"apiVersion":"pi-norm-spec/platform-runtime/v1","bridge":"bin/pi-norm-bridge","payload":"upstream"}
```

`bridge` and `payload` are non-empty portable relative paths with no empty,
`.` or `..` component. The resolver constructs explicit package-local paths;
missing packages, unsupported platforms, invalid metadata, and unsafe paths
are typed startup failures. Gate E owns producing and publishing these packages.

D012 keeps this locator focused on portable executable paths. Production
packages additionally carry versioned root/platform
`pi-norm-spec/package-release/v1` manifests. The resolver must match product
version, full pi source revision, target, package/runtime APIs, and the exact
upstream pin across those manifests before launch. Linux resolution is
glibc-specific; musl and an unidentified libc are unsupported rather than a
request to search for another executable.
