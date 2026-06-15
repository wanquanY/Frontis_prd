# user.md

## 文件定义

`user.md` 定义当前用户在当前大观租户成员身份、当前 Agent 下的用户画像、工作角色、稳定偏好和协作习惯。它不保存页面聊天历史原文，也不保存单个 session 的临时任务上下文。

## 身份信息

- user_id:
- tenant_id:
- member_id:
- agent_id:
- display_name:
- role:
- department:
- active_status:

## 隔离规则

- 本画像只对当前 `tenant_id + user_id + member_id + agent_id` 生效。
- 同一用户使用不同 Agent 时，应分别维护各自的 `user.md`。
- 不同 Agent 之间不得直接共享用户偏好，除非用户明确授权复制。

## 工作画像

- 常用工作场景：
- 主要负责对象：
- 高频任务：
- 常用文件类型：
- 关键协作对象：

## 稳定偏好

- 回答偏好：
- 文档偏好：
- 决策偏好：
- 风险偏好：
- 引用来源偏好：

## 权限与隐私

- 可使用渠道: web / leadeep / feishu
- Leadeep 权限状态:
- 可见文件范围:
- 不应记住的信息:

## 变更记录

| 时间 | 来源 | 变更内容 | 确认方式 |
| ---- | ---- | -------- | -------- |
|      |      |          |          |
