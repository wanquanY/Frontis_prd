import { useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, InputNumber, Modal, Progress, Select, message } from "antd";

import type {
  FdeDeliveryOrderItem,
  FdeOpportunityFollowUpPayload,
  FdeOpportunityItem,
  FdeOpportunityStage,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import {
  FDE_OPPORTUNITY_STAGE_ORDER,
  formatWanAmount,
  getFdeMemberName,
} from "@/feature/fde/utils";

import styles from "./FdeOpportunityWorkbench.module.less";

interface FdeOpportunityWorkbenchProps {
  items: FdeOpportunityItem[];
  deliveryOrders: FdeDeliveryOrderItem[];
  members: FdeTeamMemberItem[];
  selectedOpportunityId: string;
  setSelectedOpportunityId: (opportunityId: string) => void;
  updateOpportunityStage: (
    opportunityId: string,
    direction: "next" | "previous",
  ) => FdeOpportunityStage | null;
  updateOpportunityFollowUp: (
    opportunityId: string,
    payload: FdeOpportunityFollowUpPayload,
  ) => void;
  convertOpportunityToDelivery: (opportunityId: string) => string | null;
}

interface OpportunityFollowUpFormState extends FdeOpportunityFollowUpPayload {
  blockersText: string;
}

const RISK_LEVEL_OPTIONS: FdeOpportunityItem["riskLevel"][] = ["低风险", "关注", "高风险"];

const getStageClassName = (stage: string): string => {
  if (stage === "初步沟通") {
    return styles.stageBlue;
  }

  if (stage === "产品演示") {
    return styles.stagePurple;
  }

  if (stage === "方案推荐") {
    return styles.stageAmber;
  }

  if (stage === "商务谈判") {
    return styles.stageGreen;
  }

  return styles.stageRose;
};

const getPriorityClassName = (priority: FdeOpportunityItem["priority"]): string => {
  if (priority === "高") {
    return styles.priorityHigh;
  }

  if (priority === "中") {
    return styles.priorityMedium;
  }

  return styles.priorityLow;
};

const getRiskClassName = (riskLevel: FdeOpportunityItem["riskLevel"]): string => {
  if (riskLevel === "高风险") {
    return styles.riskHigh;
  }

  if (riskLevel === "关注") {
    return styles.riskAttention;
  }

  return styles.riskLow;
};

const createOpportunityFollowUpFormState = (
  opportunity: FdeOpportunityItem,
): OpportunityFollowUpFormState => ({
  amountWan: opportunity.amountWan,
  blockers: opportunity.blockers,
  blockersText: opportunity.blockers.join("\n"),
  budgetLabel: opportunity.budgetLabel,
  estimatedSignDate: opportunity.estimatedSignDate,
  nextAction: opportunity.nextAction,
  nextActionDate: opportunity.nextActionDate,
  riskLevel: opportunity.riskLevel,
  summary: opportunity.summary,
});

/**
 * 商机工作台。
 */
export const FdeOpportunityWorkbench = ({
  items,
  deliveryOrders,
  members,
  selectedOpportunityId,
  setSelectedOpportunityId,
  updateOpportunityStage,
  updateOpportunityFollowUp,
  convertOpportunityToDelivery,
}: FdeOpportunityWorkbenchProps): JSX.Element => {
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<OpportunityFollowUpFormState | null>(null);
  const stageGroups = useMemo(
    () =>
      FDE_OPPORTUNITY_STAGE_ORDER.map(stage => ({
        items: items.filter(item => item.stage === stage),
        stage,
      })),
    [items],
  );
  const selectedOpportunity = useMemo(
    () => items.find(item => item.id === selectedOpportunityId) ?? items[0] ?? null,
    [items, selectedOpportunityId],
  );
  const selectedDeliveryOrder = useMemo(
    () =>
      deliveryOrders.find(item => item.sourceOpportunityId === selectedOpportunity?.id) ?? null,
    [deliveryOrders, selectedOpportunity?.id],
  );
  const totalAmount = useMemo(
    () => items.reduce((total, item) => total + item.amountWan, 0),
    [items],
  );
  const convertedAmount = useMemo(
    () =>
      items
        .filter(item => item.stage === "已成交")
        .reduce((total, item) => total + item.amountWan, 0),
    [items],
  );
  const averageWinRate = useMemo(() => {
    if (!items.length) {
      return 0;
    }

    return Math.round(items.reduce((total, item) => total + item.winRate, 0) / items.length);
  }, [items]);
  const currentMonthLeads = useMemo(() => items.length + 9, [items.length]);
  const topOpportunities = useMemo(
    () => [...items].sort((left, right) => right.amountWan - left.amountWan).slice(0, 5),
    [items],
  );
  const selectedStageIndex = useMemo(
    () =>
      selectedOpportunity
        ? FDE_OPPORTUNITY_STAGE_ORDER.findIndex(item => item === selectedOpportunity.stage)
        : -1,
    [selectedOpportunity],
  );
  const canMoveToPreviousStage = selectedStageIndex > 0;
  const canMoveToNextStage =
    selectedStageIndex > -1 && selectedStageIndex < FDE_OPPORTUNITY_STAGE_ORDER.length - 1;
  const canConvertToDelivery =
    selectedOpportunity?.stage === "已成交" || Boolean(selectedDeliveryOrder);

  const handleFormFieldChange = <TKey extends keyof OpportunityFollowUpFormState>(
    field: TKey,
    value: OpportunityFollowUpFormState[TKey],
  ): void => {
    setFormState(previous =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    );
  };

  const handleStageUpdate = (direction: "next" | "previous"): void => {
    if (!selectedOpportunity) {
      return;
    }

    const nextStage = updateOpportunityStage(selectedOpportunity.id, direction);
    if (!nextStage) {
      message.warning("当前商机不存在，无法调整阶段。");
      return;
    }

    if (nextStage === selectedOpportunity.stage) {
      message.info("当前阶段无法继续调整。");
      return;
    }

    message.success(`商机阶段已更新为${nextStage}。`);
  };

  const handleOpenEditModal = (): void => {
    if (!selectedOpportunity) {
      return;
    }

    setFormState(createOpportunityFollowUpFormState(selectedOpportunity));
    setIsEditModalOpen(true);
  };

  const handleSubmitFollowUp = (): void => {
    if (!selectedOpportunity || !formState) {
      return;
    }

    if (!formState.nextAction.trim() || !formState.summary.trim()) {
      message.warning("请先补全下一动作和跟进摘要。");
      return;
    }

    updateOpportunityFollowUp(selectedOpportunity.id, {
      amountWan: formState.amountWan,
      blockers: formState.blockersText
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean),
      budgetLabel: formState.budgetLabel,
      estimatedSignDate: formState.estimatedSignDate,
      nextAction: formState.nextAction,
      nextActionDate: formState.nextActionDate,
      riskLevel: formState.riskLevel,
      summary: formState.summary,
    });
    setIsEditModalOpen(false);
    message.success("已更新商机跟进计划。");
  };

  const handleConvertToDelivery = (): void => {
    if (!selectedOpportunity) {
      return;
    }

    const nextOrderId = convertOpportunityToDelivery(selectedOpportunity.id);
    if (!nextOrderId) {
      message.warning("当前商机不存在，无法转入配置交付。");
      return;
    }

    message.success(selectedDeliveryOrder ? "已打开交付工单。" : "已转入配置交付。");
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无商机数据" />;
  }

  return (
    <>
      <div className={styles.workbench}>
        <section className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>商机总金额</span>
            <strong className={styles.metricValue}>{formatWanAmount(totalAmount)}</strong>
            <span className={styles.metricHint}>覆盖官网咨询、转介绍和服务页留资</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>已成交金额</span>
            <strong className={styles.metricValue}>{formatWanAmount(convertedAmount)}</strong>
            <span className={styles.metricHint}>正式转单后自动进入配置交付</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>平均胜率</span>
            <strong className={styles.metricValue}>{averageWinRate}%</strong>
            <span className={styles.metricHint}>按当前负责人评估口径推算</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>本月新增商机</span>
            <strong className={styles.metricValue}>{currentMonthLeads}</strong>
            <span className={styles.metricHint}>包含线索转商机和直接入池商机</span>
          </article>
        </section>

        <section className={styles.kanbanSection}>
          {stageGroups.map(group => (
            <article key={group.stage} className={styles.stageColumn}>
              <div className={classNames(styles.stageHeader, getStageClassName(group.stage))}>
                <span>{group.stage}</span>
                <span className={styles.stageCount}>{group.items.length}</span>
              </div>

              <div className={styles.stageList}>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={classNames(
                      styles.stageCard,
                      item.id === selectedOpportunity?.id && styles.stageCardActive,
                    )}
                    onClick={() => setSelectedOpportunityId(item.id)}
                  >
                    <div className={styles.stageCardTitle}>{item.companyName}</div>
                    <div className={styles.stageCardScene}>{item.scenarioName}</div>
                    <div className={styles.stageCardMeta}>
                      <span>{formatWanAmount(item.amountWan)}</span>
                      <span>{item.nextActionDate}</span>
                    </div>
                    <Progress
                      percent={item.winRate}
                      showInfo={false}
                      strokeColor="var(--fdeAccent)"
                    />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.analyticsGrid}>
          <article className={styles.detailCard}>
            {selectedOpportunity ? (
              <>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardEyebrow}>当前商机</div>
                    <h2 className={styles.cardTitle}>{selectedOpportunity.companyName}</h2>
                  </div>
                  <div className={styles.cardTags}>
                    <div
                      className={classNames(
                        styles.priorityBadge,
                        getPriorityClassName(selectedOpportunity.priority),
                      )}
                    >
                      {selectedOpportunity.priority}优先
                    </div>
                    <div
                      className={classNames(
                        styles.priorityBadge,
                        getRiskClassName(selectedOpportunity.riskLevel),
                      )}
                    >
                      {selectedOpportunity.riskLevel}
                    </div>
                    <div
                      className={classNames(
                        styles.stageBadge,
                        getStageClassName(selectedOpportunity.stage),
                      )}
                    >
                      {selectedOpportunity.stage}
                    </div>
                  </div>
                </div>

                <p className={styles.cardSummary}>{selectedOpportunity.summary}</p>

                <div className={styles.actionRow}>
                  <Button disabled={!canMoveToPreviousStage} onClick={() => handleStageUpdate("previous")}>
                    回退阶段
                  </Button>
                  <Button type="primary" ghost disabled={!canMoveToNextStage} onClick={() => handleStageUpdate("next")}>
                    推进阶段
                  </Button>
                  <Button onClick={handleOpenEditModal}>编辑跟进</Button>
                  <Button
                    type="primary"
                    disabled={!canConvertToDelivery}
                    onClick={handleConvertToDelivery}
                  >
                    {selectedDeliveryOrder ? "查看交付单" : "转正式订单"}
                  </Button>
                </div>
                {!canConvertToDelivery ? (
                  <div className={styles.actionHint}>商机推进到“已成交”后才可转入配置交付。</div>
                ) : null}

                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>联系人</span>
                    <span className={styles.detailValue}>
                      {selectedOpportunity.contactName} · {selectedOpportunity.contactPhone}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>业务场景</span>
                    <span className={styles.detailValue}>{selectedOpportunity.scenarioName}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>行业</span>
                    <span className={styles.detailValue}>{selectedOpportunity.industry}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>负责人</span>
                    <span className={styles.detailValue}>
                      {getFdeMemberName(members, selectedOpportunity.ownerId)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>预算</span>
                    <span className={styles.detailValue}>{selectedOpportunity.budgetLabel}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>来源</span>
                    <span className={styles.detailValue}>{selectedOpportunity.source}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>下一动作</span>
                    <span className={styles.detailValue}>{selectedOpportunity.nextAction}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>下一动作时间</span>
                    <span className={styles.detailValue}>{selectedOpportunity.nextActionDate}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>预计签约</span>
                    <span className={styles.detailValue}>
                      {selectedOpportunity.estimatedSignDate}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>预计金额</span>
                    <span className={styles.detailValue}>
                      {formatWanAmount(selectedOpportunity.amountWan)}
                    </span>
                  </div>
                </div>

                <div className={styles.followUpGrid}>
                  <article className={styles.followUpCard}>
                    <div className={styles.cardEyebrow}>跟进时间线</div>
                    <div className={styles.timelineList}>
                      {selectedOpportunity.timeline.map(item => (
                        <div key={item.id} className={styles.timelineItem}>
                          <div className={styles.timelineHeader}>
                            <strong>{item.title}</strong>
                            <span className={styles.timelineTime}>{item.createdAt}</span>
                          </div>
                          <p className={styles.timelineDetail}>{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className={styles.followUpCard}>
                    <div className={styles.cardEyebrow}>当前阻塞项</div>
                    {selectedOpportunity.blockers.length ? (
                      <div className={styles.blockerList}>
                        {selectedOpportunity.blockers.map(item => (
                          <div key={item} className={styles.blockerItem}>
                            <span className={styles.blockerDot} />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.emptyHint}>当前无明显阻塞，可继续推进商机。</div>
                    )}
                    <div className={styles.originHint}>
                      {selectedOpportunity.sourceLeadId
                        ? "该商机来自线索工单转化。"
                        : "该商机为直接入池商机。"}
                    </div>
                    {selectedDeliveryOrder ? (
                      <div className={styles.deliveryHint}>
                        已关联交付工单：{selectedDeliveryOrder.orderNo}
                      </div>
                    ) : null}
                  </article>
                </div>
              </>
            ) : null}
          </article>

          <article className={styles.rankCard}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardEyebrow}>TOP 商机</div>
                <h2 className={styles.cardTitle}>按金额排序</h2>
              </div>
            </div>
            <div className={styles.rankList}>
              {topOpportunities.map((item, index) => (
                <div key={item.id} className={styles.rankItem}>
                  <div className={styles.rankIndex}>{index + 1}</div>
                  <div className={styles.rankInfo}>
                    <div className={styles.rankCompany}>{item.companyName}</div>
                    <div className={styles.rankScene}>
                      {item.stage} / {item.scenarioName}
                    </div>
                  </div>
                  <div className={styles.rankAmount}>{formatWanAmount(item.amountWan)}</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>

      <Modal
        title="编辑商机跟进"
        open={isEditModalOpen}
        okText="保存跟进"
        cancelText="取消"
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleSubmitFollowUp}
      >
        {formState ? (
          <div className={styles.modalForm}>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>下一动作</span>
              <Input
                value={formState.nextAction}
                onChange={event => handleFormFieldChange("nextAction", event.target.value)}
              />
            </div>
            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>下一动作时间</span>
                <Input
                  value={formState.nextActionDate}
                  onChange={event =>
                    handleFormFieldChange("nextActionDate", event.target.value)
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>预计签约时间</span>
                <Input
                  value={formState.estimatedSignDate}
                  onChange={event =>
                    handleFormFieldChange("estimatedSignDate", event.target.value)
                  }
                />
              </div>
            </div>
            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>预算说明</span>
                <Input
                  value={formState.budgetLabel}
                  onChange={event => handleFormFieldChange("budgetLabel", event.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>风险等级</span>
                <Select
                  value={formState.riskLevel}
                  options={RISK_LEVEL_OPTIONS.map(item => ({
                    label: item,
                    value: item,
                  }))}
                  onChange={value => handleFormFieldChange("riskLevel", value)}
                />
              </div>
            </div>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>预计金额（万）</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={1}
                value={formState.amountWan}
                onChange={value => handleFormFieldChange("amountWan", value ?? 0)}
              />
            </div>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>跟进摘要</span>
              <Input.TextArea
                rows={3}
                value={formState.summary}
                onChange={event => handleFormFieldChange("summary", event.target.value)}
              />
            </div>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>阻塞项</span>
              <Input.TextArea
                rows={3}
                placeholder="每行一个阻塞项"
                value={formState.blockersText}
                onChange={event => handleFormFieldChange("blockersText", event.target.value)}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};
