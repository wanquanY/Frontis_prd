# Frontis FDE 二级功能开发任务清单 v1

> **用途：** 将《Frontis FDE 二级功能完善需求方案 v1》拆解为可执行的前端开发任务。  
> **适用阶段：** 当前原型深化阶段，仅针对本地 mock 状态与前端交互实现。  
> **关联文档：** `Frontis FDE 二级功能完善需求方案 v1.md`

---

## 1. 任务拆解原则

本次任务拆解遵循以下原则：

1. 不新增一级导航。
2. 优先打通业务闭环，再补丰富细节。
3. 所有跨模块状态流转统一收口到 `useFdeWorkbench.ts`。
4. `types.ts` 与 `mockData.ts` 先行扩展，再推进页面实现。
5. 各页面继续沿用当前“列表 + 详情”原型结构，不做大改版。

---

## 2. 涉及文件范围

### 核心状态与模型

1. `src/feature/fde/types.ts`
2. `src/feature/fde/mockData.ts`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/utils.ts`

### 页面与模块组件

1. `src/feature/fde/components/FdeWorkbenchView.tsx`
2. `src/feature/fde/components/FdeOpportunityWorkbench.tsx`
3. `src/feature/fde/components/FdeLeadWorkbench.tsx`
4. `src/feature/fde/components/FdeDeliveryWorkbench.tsx`
5. `src/feature/fde/components/FdeOperationsMonitorView.tsx`
6. `src/feature/fde/components/FdeFeedbackBoardView.tsx`
7. `src/feature/fde/components/FdeEvolutionTasksView.tsx`
8. `src/feature/fde/components/FdeReleasePushView.tsx`

### 对应样式文件

1. `src/feature/fde/components/FdeWorkbenchView.module.less`
2. `src/feature/fde/components/FdeOpportunityWorkbench.module.less`
3. `src/feature/fde/components/FdeLeadWorkbench.module.less`
4. `src/feature/fde/components/FdeDeliveryWorkbench.module.less`
5. `src/feature/fde/components/FdeOperationsMonitorView.module.less`
6. `src/feature/fde/components/FdeFeedbackBoardView.module.less`
7. `src/feature/fde/components/FdeEvolutionTasksView.module.less`
8. `src/feature/fde/components/FdeReleasePushView.module.less`

---

## 3. 实施阶段总览

### Phase 0：基础改造

目标：先把数据模型、跨模块流转和公共状态能力补齐。

### Phase 1：主链路打通

目标：完成“线索 → 商机 → 交付 → 回流 → 进化 → 发布”的可演示闭环。

### Phase 2：运营与审核增强

目标：补告警处理、交付阻塞、进化审核和发布回退。

### Phase 3：协作与管理增强

目标：补待办、统一时间线、全局搜索筛选等管理能力。

---

## 4. 任务包清单

## WP-00 基础模型与状态中心扩展

### 目标

为后续所有模块补齐统一的数据结构、状态流转方法和跨模块关联字段。

### 主要文件

1. `src/feature/fde/types.ts`
2. `src/feature/fde/mockData.ts`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/utils.ts`

### 需要完成的内容

1. 新增商机优先级、风险等级、跟进记录、阻塞项、审核意见、发布时间线等类型。
2. 为线索、商机、交付、告警、回流样本、进化审核、发布结果建立关联字段。
3. 在 `useFdeWorkbench.ts` 中新增跨模块动作方法。
4. 建立统一的时间线数据结构。
5. 为后续任务准备更完整的 mock 数据。

### 建议新增动作

1. `createOpportunity`
2. `convertLeadToOpportunity`
3. `updateOpportunityStage`
4. `convertOpportunityToDelivery`
5. `updateDeliveryStep`
6. `toggleDeliveryBlocker`
7. `assignOperationsAlert`
8. `createEvolutionTaskFromFeedback`
9. `reviewEvolutionTask`
10. `createReleaseFromEvolution`
11. `updateReleaseStatus`
12. `rollbackRelease`

### 验收标准

1. 所有核心流转都能在 hook 中找到明确方法。
2. 各模块间能通过 id 或关联字段串起来。
3. mock 数据能支撑后续页面渲染。

### 依赖关系

无，必须最先完成。

---

## WP-01 线索转商机链路

### 目标

替换当前“线索直接成单”的跳跃逻辑，让线索先进入商机层。

### 主要文件

1. `src/feature/fde/components/FdeLeadWorkbench.tsx`
2. `src/feature/fde/components/FdeLeadWorkbench.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 将当前“转为正式订单”按钮改为“转为商机”。
2. 线索详情中增加跟进记录区。
3. 新增下次回访时间、优先级、最近跟进时间。
4. 新增来源渠道筛选和超时提醒标识。
5. 转商机后自动生成商机关联数据，并跳转到商机工作台对应详情。

### 验收标准

1. 新建线索后可以转为商机。
2. 商机可继承线索中的联系人、来源、预算、感兴趣场景等信息。
3. 线索状态和商机状态不再混淆。

### 依赖关系

依赖 `WP-00`。

---

## WP-02 商机推进与成单链路

### 目标

补齐商机工作台的操作层，让商机可以推进、记录、成单。

### 主要文件

1. `src/feature/fde/components/FdeOpportunityWorkbench.tsx`
2. `src/feature/fde/components/FdeOpportunityWorkbench.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 增加新建商机能力。
2. 增加编辑商机信息能力。
3. 增加阶段推进 / 回退。
4. 增加下一动作维护。
5. 增加负责人调整。
6. 增加跟进时间线。
7. 增加风险标记。
8. 增加“转正式订单”动作。

### 验收标准

1. 商机可以完整从“初步沟通”推进到“已成交”。
2. 已成交商机可以转为交付工单。
3. 商机详情中能看到最近跟进记录和下一动作。

### 依赖关系

依赖 `WP-00` 和 `WP-01`。

---

## WP-03 配置交付步骤工作区

### 目标

把当前交付模块从“只读状态展示”升级为“可推进的交付执行台”。

### 主要文件

1. `src/feature/fde/components/FdeDeliveryWorkbench.tsx`
2. `src/feature/fde/components/FdeDeliveryWorkbench.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 为交付步骤增加推进和回退动作。
2. 为每个步骤增加基础表单区。
3. 增加 blocker 列表和处理状态。
4. 增加专家团配置清单。
5. 增加 API 联调状态区。
6. 增加成员初始化状态区。
7. 增加上线验收区。

### 建议的二级工作区结构

1. 客户确认
2. 设备配置
3. 专家团配置
4. API 联调
5. 成员初始化
6. 发货前检查
7. 上线验收

### 验收标准

1. 交付单可以推进步骤。
2. 存在 blocker 时可被显式标记。
3. 上线前的检查项和验收结果可以完整展示。

### 依赖关系

依赖 `WP-00` 和 `WP-02`。

---

## WP-04 运营监控告警处理

### 目标

让运营监控模块从静态健康面板升级为“告警处理台”。

### 主要文件

1. `src/feature/fde/components/FdeOperationsMonitorView.tsx`
2. `src/feature/fde/components/FdeOperationsMonitorView.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 增加告警列表。
2. 增加告警等级和告警来源。
3. 增加确认、关闭、分配动作。
4. 增加处理结果记录。
5. 增加按专家、接口、设备节点查看问题。
6. 增加风险客户直达回流或交付的跳转入口。
7. 增加趋势区。

### 验收标准

1. 每个客户都能看到具体告警项，而不是只有总数。
2. 告警可分配责任人并记录处理状态。
3. 风险客户能联动到其他模块继续处理。

### 依赖关系

依赖 `WP-00` 和 `WP-03`。

---

## WP-05 数据回流样本与任务创建

### 目标

让回流模块明确展示“问题从哪里来”，并支持按信号创建进化任务。

### 主要文件

1. `src/feature/fde/components/FdeFeedbackBoardView.tsx`
2. `src/feature/fde/components/FdeFeedbackBoardView.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 增加回流样本列表。
2. 增加问题分类维度。
3. 增加问题信号筛选。
4. 支持勾选信号创建进化任务。
5. 增加进化前后效果对比槽位。
6. 增加手动补充建议和备注。

### 验收标准

1. 回流模块不再只有指标卡和建议文案。
2. 可以基于部分信号创建进化任务。
3. 所创建的进化任务能带入问题来源和技能变更说明。

### 依赖关系

依赖 `WP-00` 和 `WP-04`。

---

## WP-06 进化任务审核流

### 目标

补齐进化任务的审核动作和审核结果流转。

### 主要文件

1. `src/feature/fde/components/FdeEvolutionTasksView.tsx`
2. `src/feature/fde/components/FdeEvolutionTasksView.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 增加开始、暂停、重试、终止动作。
2. 增加提交审核动作。
3. 增加审核通过 / 驳回动作。
4. 增加审核意见记录。
5. 增加候选版本差异摘要。
6. 增加从任务创建发布单的入口。

### 验收标准

1. 待审核任务可以通过或驳回。
2. 审核意见可以被记录并回看。
3. 审核通过任务可进入版本推送模块。

### 依赖关系

依赖 `WP-00` 和 `WP-05`。

---

## WP-07 版本推送与回退

### 目标

把版本推送模块升级为可执行的发布控制台。

### 主要文件

1. `src/feature/fde/components/FdeReleasePushView.tsx`
2. `src/feature/fde/components/FdeReleasePushView.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 增加创建发布单能力。
2. 增加目标客户选择。
3. 增加灰度比例设置。
4. 增加开始推送、暂停、全量发布。
5. 增加回退动作。
6. 增加回退原因记录。
7. 增加客户维度发布结果。
8. 增加发布说明模板化结构。

### 验收标准

1. 审核通过的进化任务可生成发布单。
2. 发布单支持灰度与回退。
3. 每个客户的推送结果能被单独展示。

### 依赖关系

依赖 `WP-00` 和 `WP-06`。

---

## WP-08 待办中心与跨模块联动

### 目标

为负责人和工程师补齐统一待办与快速处理入口。

### 主要文件

1. `src/feature/fde/components/FdeWorkbenchView.tsx`
2. `src/feature/fde/components/FdeWorkbenchView.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 在工作台头部或首页增加待办区。
2. 区分负责人和工程师的待办类型。
3. 增加跨模块快捷跳转。
4. 增加统一时间线摘要。

### 建议待办类型

1. 待分配线索
2. 待推进商机
3. 待处理 blocker
4. 待处理告警
5. 待审核进化任务
6. 待发布版本

### 验收标准

1. 负责人和工程师进入后看到的待办明显不同。
2. 点击待办可跳到对应模块和对象。

### 依赖关系

依赖前面主链路任务包基本完成。

---

## WP-09 全局搜索、筛选与统一日志

### 目标

增强多模块协作效率和管理视角下的信息检索能力。

### 主要文件

1. `src/feature/fde/components/FdeWorkbenchView.tsx`
2. `src/feature/fde/components/FdeWorkbenchView.module.less`
3. `src/feature/fde/hooks/useFdeWorkbench.ts`
4. `src/feature/fde/types.ts`
5. `src/feature/fde/mockData.ts`

### 需要完成的内容

1. 增加客户名、负责人、场景、状态搜索。
2. 增加统一筛选条件。
3. 增加统一日志时间线。
4. 增加跨模块操作记录查看。

### 验收标准

1. 用户可快速定位任意客户或任务。
2. 核心流转的操作历史可回看。

### 依赖关系

建议放在最后阶段。

---

## 5. 推荐执行顺序

建议按以下顺序逐包推进：

1. `WP-00` 基础模型与状态中心扩展
2. `WP-01` 线索转商机链路
3. `WP-02` 商机推进与成单链路
4. `WP-03` 配置交付步骤工作区
5. `WP-05` 数据回流样本与任务创建
6. `WP-06` 进化任务审核流
7. `WP-07` 版本推送与回退
8. `WP-04` 运营监控告警处理
9. `WP-08` 待办中心与跨模块联动
10. `WP-09` 全局搜索、筛选与统一日志

说明：

1. `WP-04` 虽然业务上很重要，但在纯原型阶段可稍后于主链路完成。
2. `WP-08` 和 `WP-09` 属于管理增强能力，建议在主链路稳定后再补。

---

## 6. 每阶段建议交付物

### 第一阶段交付物

1. 可演示的线索转商机
2. 可演示的商机推进与成单
3. 可演示的交付推进

### 第二阶段交付物

1. 可演示的回流建任务
2. 可演示的进化审核
3. 可演示的版本推送与回退

### 第三阶段交付物

1. 可演示的运营告警处理
2. 可演示的待办中心
3. 可演示的统一日志与搜索

---

## 7. 开发注意事项

1. 不建议一次性同时改所有模块，容易让 `useFdeWorkbench.ts` 失控。
2. 建议每完成一个任务包就同步更新 `types.ts`、`mockData.ts` 和 hook 返回结构。
3. 各模块新增的本地交互要优先复用当前的选中项状态和列表详情模式。
4. 样式层面应继续沿用现有 FDE 视觉语言，不要改整体框架。

---

## 8. 结论

这份任务清单的核心是把需求文档转成可执行的开发包，并明确每个任务包的目标文件、依赖和验收点。后续实现时建议按任务包逐个推进，而不是跨多个模块零散修改，这样最容易保持当前 FDE 框架稳定，并逐步把原型提升为可演示的完整工作台。
