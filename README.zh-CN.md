# pi-norm-spec

基于 Rust 与 TypeScript 的 pi 运行时适配器。

Rust 负责约束计算和版本化 bridge；TypeScript 只负责接入 pi ExtensionAPI。
本仓库不重新实现 `.norm` parser、collect 或 validator。

> 当前状态：`0.1.0-alpha.1` 启动阶段。Gate B 已在四个 native hosted target
> 完成。Gate C 的 session-scoped JSONL bridge、request cancellation、薄
> TypeScript client 和 ExtensionAPI lifecycle 已在本地全绿；精确 Gate C 候选仍需
> hosted 验证。Pi 注入、拦截、修改后反馈、pi 专用 Skill 和 npm 平台包尚未完成。

参与开发前请阅读 `AGENTS.md`、`docs/ARCHITECTURE.md` 和
`docs/planning/v0.1-execution.md`。
