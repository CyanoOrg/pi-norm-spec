# pi-norm-spec

基于 Rust 与 TypeScript 的 pi 运行时适配器。

Rust 负责约束计算和版本化 bridge；TypeScript 只负责接入 pi ExtensionAPI。
本仓库不重新实现 `.norm` parser、collect 或 validator。

> 当前状态：`0.1.0-alpha.1` 启动阶段。Gate B 和 Gate C 已在四个 native hosted
> target 完成。Gate D 的 path-scoped ephemeral injection、唯一的 pi 专用
> Skill、非破坏性 zero-`.norm` onboarding 和 package-shaped 隔离安装已在 `f080395`
> 通过真实 pi `0.84.1` host 的四平台验证，functional Alpha checkpoint 已完成。
> D011 修改后软验证反馈已实现，并通过本地真实 host 与 package-shaped 路径；最终
> hosted 验证仍待完成。拦截和生产 npm 平台包尚未完成。

参与开发前请阅读 `AGENTS.md`、`docs/ARCHITECTURE.md` 和
`docs/planning/v0.1-execution.md`。
