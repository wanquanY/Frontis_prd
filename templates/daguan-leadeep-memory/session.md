# session.md

## 文件定义

`session.md` 定义当前用户使用当前 Agent 时，单个会话的短期任务上下文。它服务当前 session，不默认跨会话共享；只有被用户确认或被规则判定为长期有效的内容，才能转为同一 Agent 下的 `memory.md` 候选。

## 会话身份

- session_id:
- session_type: web_normal / leadeep_bound / feishu_bound
- tenant_id:
- user_id:
- member_id:
- agent_id:
- bound_channel:
- created_at:
- updated_at:

## 当前任务上下文

- current_goal:
- current_stage:
- accepted_decisions:
- working_assumptions:
- open_questions:
- recent_outputs:

## 隔离规则

- 本文件只对当前 `tenant_id + user_id + member_id + agent_id + session_id` 生效。
- 当前 session 的短期上下文不得直接进入其他 session。
- 当前 Agent 的 session 上下文不得直接进入其他 Agent。

## 临时文件

| file_id | 文件名 | 来源 | 当前用途 | 是否已进入 file-index |
| ------- | ------ | ---- | -------- | --------------------- |
|         |        |      |          |                       |

## 不应沉淀的内容

- 未采纳方案：
- 低置信推断：
- 一次性临时偏好：
- 工具过程细节：

## 转长期记忆候选

| 内容 | 推荐类型 | 推荐原因 | 是否需要用户确认 |
| ---- | -------- | -------- | ---------------- |
|      |          |          |                  |
