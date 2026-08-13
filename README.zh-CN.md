# pi-norm-spec

基于 Rust 与 TypeScript 的 pi 运行时适配器。

Rust 负责约束计算和版本化 bridge；TypeScript 只负责接入 pi ExtensionAPI。
本仓库不重新实现 `.norm` parser、collect 或 validator。

> 当前状态：`0.1.0-alpha.1` 启动阶段。Gate B 的 Rust runtime 路径已 pin 并验证
> 完整的公开 norm-spec `0.1.0-rc.1` payload，消费 compatibility、collect、
> validate 机器响应，并执行全部 82 个 conformance case。精确 Gate B 候选已在四个
> native hosted target 全绿。下一步是 Gate C bridge lifecycle；pi 注入、拦截、
> 修改后反馈和 npm 平台分发尚未完成。

参与开发前请阅读 `AGENTS.md`、`docs/ARCHITECTURE.md` 和
`docs/planning/v0.1-execution.md`。
