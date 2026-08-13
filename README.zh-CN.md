# pi-norm-spec

基于 Rust 与 TypeScript 的 pi 运行时适配器。

Rust 负责约束计算和版本化 bridge；TypeScript 只负责接入 pi ExtensionAPI。
本仓库不重新实现 `.norm` parser、collect 或 validator。

> 当前状态：`0.1.0-alpha.1` 启动阶段。Gate B 和 Gate C 已在四个 native hosted
> target 完成。Session-scoped JSONL bridge、request cancellation、薄
> TypeScript client、ExtensionAPI lifecycle 和精确公开 payload 路径均已 hosted
> 全绿。下一步是 Gate D 的 path-scoped injection。拦截、修改后反馈、pi 专用
> Skill 和 npm 平台包尚未完成。

参与开发前请阅读 `AGENTS.md`、`docs/ARCHITECTURE.md` 和
`docs/planning/v0.1-execution.md`。
