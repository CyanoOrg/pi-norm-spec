# pi-norm-spec

基于 Rust 与 TypeScript 的 pi 适配器，面向 canonical norm-spec 引擎：
按会话的 `.norm` 约定注入与编辑后软性约定校验。Rust 负责约定
求值并暴露版本化 bridge；TypeScript 只提供最小的 pi ExtensionAPI 入口。
本仓库不实现 `.norm` parser 或 validator——格式语义保留在上游
[norm-spec](https://github.com/CyanoOrg/norm-spec)。

## 为什么

约定只有在 agent 工作时到达它才有意义。磁盘上一棵通过校验的 `.norm`
树本身是惰性的；常见的替代——一份常驻指令文件——花 token 重建同样的
歧义，而其效力随距离与竞争上下文衰减。

本适配器按缓存想要的方式递送约定知识：

> 把作用于当前工作目录的约定分页递送到 agent 行动时刻的感知点，
> 并在编辑后据此核对。

递送是宿主相关的。pi 的 `context` 事件在每个 provider turn 前带着
消息列表的副本触发，因此注入是真正的 **ephemeral**：新收集的约定
搭当前轮的尾部，从不进入会话日志——下一轮重新从磁盘收集与渲染。
不累积，也不过期。同一套格式与语义运行在不同宿主上的另一个适配器
是 [dsh-norm-spec](https://github.com/CyanoOrg/dsh-norm-spec)——递送层
是宿主相关的部分，这条边界正是意义所在。

**状态：`0.1.0-beta.1` 发布准备中。GitHub 仓库公开且受保护；
npm 包尚未发布。Gate B 至 E3 已完成（执行状态见 `docs/planning/status.md`）；
剩余 E4——首个公开 beta 的发布检查点。**

## 它做什么

- 每个会话启动一个经过校验的 Rust bridge，面向密封、checksum 固定的
  upstream norm-spec payload（无 `PATH` 回退）。
- 在每个 `context` 事件上收集当前项目路径的约定，作为一条隐藏的
  custom message 追加到返回的消息副本——先剥离上一轮的注入，因此每轮
  恰好有一条新鲜提醒在场（D009）。
- 内置 `write`/`edit` 成功后追加有界的软性校验反馈（D011）；
  绿色结果保持沉默，原始工具结果不被改动。
- 注册一个 pi 专用 Skill 与 `norm-status` 斜杠命令（面向人类）用于
  约定检查；enforcement 不在当前契约内（D010）。

## 文档

- `AGENTS.md`、`docs/ARCHITECTURE.md`——边界与 Rust/TypeScript 分工
- `docs/decisions.md`——决策记录 D001+ 及其理由
- `docs/planning/v0.1-execution.md`、`docs/planning/status.md`——gate、
  执行状态与精确候选证据
- `ROADMAP.md`——里程碑规划（经 E3/E4 到 beta，再到 stable）

## 许可证

MIT © 2026 Wade
