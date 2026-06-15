# memory.md

## 文件定义

`memory.md` 定义当前用户使用当前 Agent 时可跨会话召回的长期记忆。它保存的是经过确认、纠正或可追溯的记忆条目，不保存完整聊天历史，也不替代页面历史记录。

## 作用范围

- tenant_id:
- user_id:
- member_id:
- agent_id:
- memory_version:
- updated_at:

## 记忆条目

### MEM-0001

- type: preference / goal / correction / task_conclusion / object_fact / expert_preference
- scope: user / tenant_member / project / object / session_candidate
- agent_scope:
- source_channel: web / leadeep / feishu / migration
- source_session_id:
- source_message_id:
- content:
- evidence:
- confidence: high / medium / low
- status: candidate / active / disabled / deleted
- created_at:
- updated_at:
- expires_at:

## 记忆类型定义

| 类型              | 定义                     | 示例                                        |
| ----------------- | ------------------------ | ------------------------------------------- |
| preference        | 用户稳定偏好             | 用户偏好先给结论再给拆解                    |
| goal              | 用户长期目标或阶段目标   | 用户正在推进 V1.1 PRD 评审                  |
| correction        | 用户明确纠正过的信息     | 用户指出“问策”不是“问测”                    |
| task_conclusion   | 被采纳的任务结论         | V1 只做 Leadeep 绑定会话，不做 App 内多会话 |
| object_fact       | 与业务对象相关的稳定事实 | 某 PRD 文件是 V1.1 定价方案主文档           |
| expert_preference | 专家或工具调用偏好       | 产品问题优先调用 PRD 专家                   |

## 更新规则

- 记忆只在当前 `tenant_id + user_id + member_id + agent_id` 下默认生效。
- 候选记忆进入 `candidate` 后，需满足确认规则才能变为 `active`。
- 用户纠正后，旧记忆不得静默保留为生效状态。
- 历史聊天原文不能整体写入 `memory.md`。
- 交叉用户迁移时，只迁移关键摘要、文件线索和可解释的记忆条目。
- 不同 Agent 之间默认不共享长期记忆；跨 Agent 复制必须有明确授权、来源记录和审计记录。
