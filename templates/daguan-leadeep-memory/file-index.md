# file-index.md

## 文件定义

`file-index.md` 定义当前用户使用当前 Agent 时可召回的文件线索和文件索引，用来帮助 ME 找到可引用、可读取、可输出的文件。它不保存文件全文，不代表文件一定会进入回答上下文。

## 作用范围

- tenant_id:
- user_id:
- member_id:
- agent_id:
- session_id:
- index_version:
- updated_at:

## 文件条目

### FILE-0001

- file_id:
- title:
- file_type: prd / spreadsheet / image / transcript / export / attachment / other
- source_channel: web / leadeep / feishu / migration
- source_session_id:
- owner_scope: user / tenant_member / session
- agent_scope:
- permission_scope:
- created_at:
- updated_at:
- summary:
- related_topics:
- retrieval_tags:
- citation_policy:
- output_allowed: yes / no / confirm_first
- status: active / archived / deleted / permission_lost

## 召回规则

- 文件线索可跨会话召回，但每次使用文件内容前必须校验权限。
- 文件线索只在当前 `tenant_id + user_id + member_id + agent_id` 下默认可召回。
- 不同 Agent 之间不得直接共享文件线索，除非用户或管理员明确授权复制。
- 文件摘要可用于判断相关性，文件全文不能默认进入上下文。
- Leadeep 输出文件、Web 上传文件、飞书附件和迁移文件使用同一套索引结构。

## 异常处理

| 异常         | 处理方式                                 |
| ------------ | ---------------------------------------- |
| 文件已删除   | 告知用户文件不可用，并保留历史引用记录   |
| 无读取权限   | 不读取文件内容，提示权限不足             |
| 文件索引过期 | 重新索引或提示用户重新上传               |
| 多文件同名   | 结合来源、时间、session 和摘要让用户确认 |
