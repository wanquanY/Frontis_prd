# team.md

## 文件定义

`team.md` 定义当前用户使用当前 ME / Agent 时，工作台中已添加专家的团队清单。它记录专家 ID、能力画像摘要、适用场景、工作台状态和专家详情配置引用。

`team.md` 不是专家详情配置本体。查看专家的完整能力配置、工具权限、提示词、模型策略或参数时，必须通过 `expert_id` 读取专家详情配置。

## 隔离范围

- tenant_id:
- user_id:
- member_id:
- agent_id:
- workspace_id:
- team_version:
- updated_at:
- updated_by:

## 专家条目

### EXPERT-0001

- expert_id:
- expert_name:
- expert_type: built_in / tenant_custom / user_custom / imported
- workspace_status: active / disabled / removed
- capability_profile:
  - primary_capabilities:
  - supported_tasks:
  - input_requirements:
  - output_types:
  - best_for:
  - not_suitable_for:
- detail_config_ref:
- added_at:
- added_by:
- last_config_synced_at:
- removed_at:
- remove_reason:

## 同步规则

- 用户或管理员向 ME 工作台添加专家时，系统自动在 `team.md` 中新增专家条目。
- 用户或管理员从 ME 工作台移除专家时，系统同步更新 `workspace_status` 为 `removed`，或按产品规则从列表中移除。
- 专家详情配置发生变更时，`team.md` 只同步能力画像摘要、状态和详情引用，不复制专家详情配置全文。
- `team.md` 只对当前 `tenant_id + user_id + member_id + agent_id` 生效，不同 Agent 默认拥有不同专家团队。
- Agent 运行时可读取 `team.md` 判断当前工作台有哪些专家可用，再通过 `expert_id` 获取专家详情配置。

## 专家详情查看规则

| 场景                 | 处理方式                                              |
| -------------------- | ----------------------------------------------------- |
| 用户查看专家详情     | 通过 `expert_id` 打开专家详情配置                     |
| Agent 需要调用专家   | 先检查 `workspace_status`，再读取 `detail_config_ref` |
| 专家已从工作台移除   | 不再参与推荐和调用                                    |
| 专家详情配置不可访问 | 提示专家配置不可用，并记录异常                        |

## 变更记录

| 时间 | 事件 | expert_id | 操作人 | 结果 |
| ---- | ---- | --------- | ------ | ---- |
|      |      |           |        |      |
