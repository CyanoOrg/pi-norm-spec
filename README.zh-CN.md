# pi-norm-spec

基于 Rust 与 TypeScript 的 pi 运行时适配器。

Rust 负责约束计算和版本化 bridge；TypeScript 只负责接入 pi ExtensionAPI。
本仓库不重新实现 `.norm` parser、collect 或 validator。

> 当前状态：`0.1.0-alpha.1` 私有开发身份。Gate B 和 Gate C 已在四个 native hosted
> target 完成。Gate D 的 path-scoped ephemeral injection、唯一的 pi 专用
> Skill、非破坏性 zero-`.norm` onboarding 和 package-shaped 隔离安装已在 `f080395`
> 通过真实 pi `0.84.1` host 的四平台验证，functional Alpha checkpoint 已完成。
> D011 修改后软验证反馈已在精确候选 `e74c4e1` 完成：真实 host 与
> package-shaped 路径已通过四个 native hosted target。D012 已定义生产包契约和
> 首个公开 beta 演练。E1 的 source-controlled package inputs、严格 release
> identity、glibc-aware resolver 和 bundled launcher 已在精确候选 `486be76`
> 完成，六个 hosted job 与四个 native package 路径全部通过。E2 实现候选
> `6b924e6` 已加入精确 retained artifacts、checksums 与聚合集合验证；root 和
> macOS arm64 路径已在本地通过，四平台 hosted closure 仍待完成；拦截不在当前契约内。

参与开发前请阅读 `AGENTS.md`、`docs/ARCHITECTURE.md` 和
`docs/planning/v0.1-execution.md`。
