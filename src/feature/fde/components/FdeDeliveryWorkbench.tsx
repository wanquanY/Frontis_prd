import { useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, InputNumber, Modal, Progress, Select, message } from "antd";

import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type {
  FdeDeliveryAcceptanceStatus,
  FdeDeliveryApiIntegrationItem,
  FdeDeliveryApiStatus,
  FdeDeliveryBlockerItem,
  FdeDeliveryBlockerStatus,
  FdeDeliveryOrderItem,
  FdeDeliveryOrderUpdatePayload,
  FdeDeliveryStepKey,
  FdeDeviceMode,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { getFdeDeliveryStepIndex, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchProps {
  items: FdeDeliveryOrderItem[];
  members: FdeTeamMemberItem[];
  selectedOrderId: string;
  setSelectedOrderId: (orderId: string) => void;
  updateDeliveryStep: (orderId: string, direction: "next" | "previous") => FdeDeliveryStepKey | null;
  updateDeliveryOrder: (orderId: string, payload: FdeDeliveryOrderUpdatePayload) => void;
  addDeliveryBlocker: (orderId: string, blocker: Omit<FdeDeliveryBlockerItem, "id">) => void;
  updateDeliveryBlockerStatus: (
    orderId: string,
    blockerId: string,
    status: FdeDeliveryBlockerStatus,
  ) => void;
}

interface DeliveryOrderFormState {
  acceptanceChecklistText: string;
  acceptanceStatus: FdeDeliveryAcceptanceStatus;
  acceptanceSummary: string;
  acceptedAt: string;
  apiIntegrationsText: string;
  cloudNodeName: string;
  expertNamesText: string;
  handoverOwner: string;
  launchTargetDate: string;
  localDeviceName: string;
  memberActivatedCount: number;
  memberCount: number;
  memberSummary: string;
  memberTargetCount: number;
  memberTrainingCompletedCount: number;
  mode: FdeDeviceMode;
  osOwner: string;
  pairingCode: string;
  preflightChecksText: string;
  region: string;
  existingApiIntegrationIds: string[];
}

interface DeliveryBlockerFormState {
  detail: string;
  dueDate: string;
  ownerId: string;
  title: string;
}

const DELIVERY_API_STATUS_OPTIONS: FdeDeliveryApiStatus[] = ["待联调", "联调中", "已完成"];
const DELIVERY_ACCEPTANCE_OPTIONS: FdeDeliveryAcceptanceStatus[] = ["待验收", "验收中", "已完成"];
const DELIVERY_MODE_OPTIONS: FdeDeviceMode[] = ["云端设备", "本地设备", "混合部署"];

const getBlockerStatusClassName = (status: FdeDeliveryBlockerStatus): string => {
  if (status === "已解决") {
    return styles.blockerResolved;
  }

  if (status === "处理中") {
    return styles.blockerProcessing;
  }

  return styles.blockerPending;
};

const getApiStatusClassName = (status: FdeDeliveryApiStatus): string => {
  if (status === "已完成") {
    return styles.apiDone;
  }

  if (status === "联调中") {
    return styles.apiProcessing;
  }

  return styles.apiPending;
};

const getAcceptanceStatusClassName = (status: FdeDeliveryAcceptanceStatus): string => {
  if (status === "已完成") {
    return styles.acceptanceDone;
  }

  if (status === "验收中") {
    return styles.acceptanceProcessing;
  }

  return styles.acceptancePending;
};

const parseMultilineText = (value: string): string[] =>
  value
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

const createDeliveryOrderFormState = (order: FdeDeliveryOrderItem): DeliveryOrderFormState => ({
  acceptanceChecklistText: order.acceptance.checklist.join("\n"),
  acceptanceStatus: order.acceptance.status,
  acceptanceSummary: order.acceptance.summary,
  acceptedAt: order.acceptance.acceptedAt,
  apiIntegrationsText: order.apiIntegrations
    .map(item => `${item.name} | ${item.status} | ${item.note}`)
    .join("\n"),
  cloudNodeName: order.deviceConfig.cloudNodeName,
  expertNamesText: order.expertNames.join("\n"),
  handoverOwner: order.acceptance.handoverOwner,
  launchTargetDate: order.launchTargetDate,
  localDeviceName: order.deviceConfig.localDeviceName,
  memberActivatedCount: order.memberInit.activatedCount,
  memberCount: order.memberCount,
  memberSummary: order.memberInit.summary,
  memberTargetCount: order.memberInit.targetCount,
  memberTrainingCompletedCount: order.memberInit.trainingCompletedCount,
  mode: order.deviceConfig.mode,
  osOwner: order.deviceConfig.osOwner,
  pairingCode: order.deviceConfig.pairingCode,
  preflightChecksText: order.preflightChecks.join("\n"),
  region: order.deviceConfig.region,
  existingApiIntegrationIds: order.apiIntegrations.map(item => item.id),
});

const createBlockerFormState = (members: FdeTeamMemberItem[]): DeliveryBlockerFormState => ({
  detail: "",
  dueDate: "",
  ownerId: members[0]?.id ?? "",
  title: "",
});

const parseApiIntegrations = (
  value: string,
  existingApiIntegrationIds: string[],
): FdeDeliveryApiIntegrationItem[] =>
  value
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const [namePart, statusPart, notePart] = item.split("|").map(part => part.trim());
      const parsedStatus = DELIVERY_API_STATUS_OPTIONS.includes(statusPart as FdeDeliveryApiStatus)
        ? (statusPart as FdeDeliveryApiStatus)
        : "待联调";

      return {
        id: existingApiIntegrationIds[index] ?? `delivery-api-draft-${index + 1}`,
        name: namePart || `接口 ${index + 1}`,
        note: notePart ?? "",
        status: parsedStatus,
      };
    });

const getNextBlockerStatus = (status: FdeDeliveryBlockerStatus): FdeDeliveryBlockerStatus => {
  if (status === "待处理") {
    return "处理中";
  }

  if (status === "处理中") {
    return "已解决";
  }

  return "待处理";
};

const getStepWorkspaceMeta = (
  order: FdeDeliveryOrderItem,
): {
  description: string;
  title: string;
  values: Array<{ label: string; value: string }>;
} => {
  if (order.currentStep === "customerConfirm") {
    return {
      description: "确认客户试点范围、目标上线时间和交接负责人。",
      title: "客户确认",
      values: [
        { label: "目标上线", value: order.launchTargetDate },
        { label: "目标成员数", value: `${order.memberCount} 人` },
        { label: "交接负责人", value: order.acceptance.handoverOwner || "待确认" },
      ],
    };
  }

  if (order.currentStep === "deviceConfig") {
    return {
      description: "确认云端节点、本地设备和配对信息。",
      title: "设备配置",
      values: [
        { label: "部署方式", value: order.deviceConfig.mode },
        { label: "云端设备", value: order.deviceConfig.cloudNodeName },
        { label: "本地设备", value: order.deviceConfig.localDeviceName },
      ],
    };
  }

  if (order.currentStep === "agentConfig") {
    return {
      description: "核对专家团配置是否匹配客户业务场景。",
      title: "专家团配置",
      values: order.expertNames.map(item => ({
        label: "专家团",
        value: item,
      })),
    };
  }

  if (order.currentStep === "apiTest") {
    return {
      description: "逐项确认业务 API 的联调状态与缺口。",
      title: "API 联调",
      values: order.apiIntegrations.map(item => ({
        label: item.name,
        value: `${item.status} · ${item.note || "待补充说明"}`,
      })),
    };
  }

  if (order.currentStep === "memberInit") {
    return {
      description: "跟踪成员开通、培训和试用进度。",
      title: "成员初始化",
      values: [
        { label: "目标成员", value: `${order.memberInit.targetCount} 人` },
        { label: "已激活", value: `${order.memberInit.activatedCount} 人` },
        { label: "已培训", value: `${order.memberInit.trainingCompletedCount} 人` },
      ],
    };
  }

  return {
    description: "核对发货前检查项，并准备上线验收资料。",
    title: "发货前检查",
    values: order.preflightChecks.map(item => ({
      label: "检查项",
      value: item,
    })),
  };
};

/**
 * 配置交付视图。
 */
export const FdeDeliveryWorkbench = ({
  items,
  members,
  selectedOrderId,
  setSelectedOrderId,
  updateDeliveryStep,
  updateDeliveryOrder,
  addDeliveryBlocker,
  updateDeliveryBlockerStatus,
}: FdeDeliveryWorkbenchProps): JSX.Element => {
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<DeliveryOrderFormState | null>(null);
  const [blockerFormState, setBlockerFormState] = useState<DeliveryBlockerFormState>(
    createBlockerFormState(members),
  );
  const selectedOrder = useMemo(
    () => items.find(item => item.id === selectedOrderId) ?? items[0] ?? null,
    [items, selectedOrderId],
  );
  const activeStepIndex = useMemo(
    () => (selectedOrder ? getFdeDeliveryStepIndex(selectedOrder.currentStep) : -1),
    [selectedOrder],
  );
  const unresolvedBlockers = useMemo(
    () => selectedOrder?.blockers.filter(item => item.status !== "已解决") ?? [],
    [selectedOrder],
  );
  const memberInitPercent = useMemo(() => {
    if (!selectedOrder || selectedOrder.memberInit.targetCount <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (selectedOrder.memberInit.activatedCount / selectedOrder.memberInit.targetCount) * 100,
      ),
    );
  }, [selectedOrder]);
  const currentStepWorkspace = useMemo(
    () => (selectedOrder ? getStepWorkspaceMeta(selectedOrder) : null),
    [selectedOrder],
  );
  const canMoveToPreviousStep = activeStepIndex > 0;
  const canMoveToNextStep = activeStepIndex > -1 && activeStepIndex < FDE_DELIVERY_STEPS.length - 1;

  const handleOrderFormFieldChange = <TKey extends keyof DeliveryOrderFormState>(
    field: TKey,
    value: DeliveryOrderFormState[TKey],
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

  const handleBlockerFieldChange = <TKey extends keyof DeliveryBlockerFormState>(
    field: TKey,
    value: DeliveryBlockerFormState[TKey],
  ): void => {
    setBlockerFormState(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleStageUpdate = (direction: "next" | "previous"): void => {
    if (!selectedOrder) {
      return;
    }

    const nextStep = updateDeliveryStep(selectedOrder.id, direction);
    if (!nextStep) {
      message.warning("当前交付单不存在，无法调整步骤。");
      return;
    }

    if (nextStep === selectedOrder.currentStep) {
      message.info("当前步骤无法继续调整。");
      return;
    }

    const nextStepLabel = FDE_DELIVERY_STEPS.find(item => item.key === nextStep)?.label ?? nextStep;
    message.success(`交付步骤已更新为${nextStepLabel}。`);
  };

  const handleOpenEditModal = (): void => {
    if (!selectedOrder) {
      return;
    }

    setFormState(createDeliveryOrderFormState(selectedOrder));
    setIsEditModalOpen(true);
  };

  const handleSubmitOrderUpdate = (): void => {
    if (!selectedOrder || !formState) {
      return;
    }

    if (!formState.launchTargetDate.trim() || !formState.handoverOwner.trim()) {
      message.warning("请先补全目标上线时间和交接负责人。");
      return;
    }

    updateDeliveryOrder(selectedOrder.id, {
      acceptance: {
        status: formState.acceptanceStatus,
        acceptedAt: formState.acceptedAt.trim(),
        handoverOwner: formState.handoverOwner.trim(),
        summary: formState.acceptanceSummary.trim(),
        checklist: parseMultilineText(formState.acceptanceChecklistText),
      },
      apiIntegrations: parseApiIntegrations(
        formState.apiIntegrationsText,
        formState.existingApiIntegrationIds,
      ),
      deviceConfig: {
        mode: formState.mode,
        cloudNodeName: formState.cloudNodeName.trim(),
        localDeviceName: formState.localDeviceName.trim(),
        pairingCode: formState.pairingCode.trim(),
        osOwner: formState.osOwner.trim(),
        region: formState.region.trim(),
      },
      expertNames: parseMultilineText(formState.expertNamesText),
      launchTargetDate: formState.launchTargetDate,
      memberCount: formState.memberCount,
      memberInit: {
        targetCount: formState.memberTargetCount,
        activatedCount: formState.memberActivatedCount,
        trainingCompletedCount: formState.memberTrainingCompletedCount,
        summary: formState.memberSummary.trim(),
      },
      preflightChecks: parseMultilineText(formState.preflightChecksText),
    });
    setIsEditModalOpen(false);
    message.success("已更新交付执行台信息。");
  };

  const handleOpenBlockerModal = (): void => {
    setBlockerFormState(createBlockerFormState(members));
    setIsBlockerModalOpen(true);
  };

  const handleSubmitBlocker = (): void => {
    if (!selectedOrder) {
      return;
    }

    if (!blockerFormState.title.trim() || !blockerFormState.ownerId) {
      message.warning("请先补全 blocker 标题和负责人。");
      return;
    }

    addDeliveryBlocker(selectedOrder.id, {
      detail: blockerFormState.detail.trim(),
      dueDate: blockerFormState.dueDate.trim(),
      ownerId: blockerFormState.ownerId,
      status: "待处理",
      title: blockerFormState.title.trim(),
    });
    setIsBlockerModalOpen(false);
    message.success("已新增交付 blocker。");
  };

  const handleUpdateBlockerStatus = (blockerId: string, status: FdeDeliveryBlockerStatus): void => {
    if (!selectedOrder) {
      return;
    }

    const nextStatus = getNextBlockerStatus(status);
    updateDeliveryBlockerStatus(selectedOrder.id, blockerId, nextStatus);
    message.success(`blocker 状态已更新为${nextStatus}。`);
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无配置交付工单" />;
  }

  return (
    <>
      <div className={styles.workbench}>
        <aside className={styles.orderList}>
          <div className={styles.sectionTitle}>正式订单</div>
          <div className={styles.orderListBody}>
            {items.map(item => {
              const openBlockerCount = item.blockers.filter(blocker => blocker.status !== "已解决").length;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(
                    styles.orderItem,
                    item.id === selectedOrder?.id && styles.orderItemActive,
                  )}
                  onClick={() => setSelectedOrderId(item.id)}
                >
                  <div className={styles.orderItemHeader}>
                    <strong>{item.customerName}</strong>
                    <span className={styles.orderProgress}>{item.stepProgress}%</span>
                  </div>
                  <div className={styles.orderItemMeta}>{item.orderNo}</div>
                  <div className={styles.orderItemMeta}>{item.scenarioName}</div>
                  <div className={styles.orderItemMeta}>
                    当前步骤：
                    {FDE_DELIVERY_STEPS.find(step => step.key === item.currentStep)?.label}
                  </div>
                  {openBlockerCount ? (
                    <div className={styles.orderBlockerCount}>阻塞 {openBlockerCount} 项</div>
                  ) : null}
                  <Progress
                    percent={item.stepProgress}
                    showInfo={false}
                    strokeColor="var(--fdeAccent)"
                  />
                </button>
              );
            })}
          </div>
        </aside>

        <article className={styles.detailPanel}>
          {selectedOrder ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailEyebrow}>配置交付</div>
                  <h2 className={styles.detailTitle}>{selectedOrder.customerName}</h2>
                  <p className={styles.detailDescription}>
                    {selectedOrder.scenarioName} · 当前负责人：
                    {getFdeMemberName(members, selectedOrder.assignedToId)}
                  </p>
                </div>
                <div className={styles.detailMeta}>
                  <span>{selectedOrder.orderNo}</span>
                  <span>目标上线：{selectedOrder.launchTargetDate}</span>
                </div>
              </div>

              <div className={styles.actionRow}>
                <Button disabled={!canMoveToPreviousStep} onClick={() => handleStageUpdate("previous")}>
                  回退步骤
                </Button>
                <Button type="primary" ghost disabled={!canMoveToNextStep} onClick={() => handleStageUpdate("next")}>
                  推进下一步
                </Button>
                <Button onClick={handleOpenEditModal}>编辑交付信息</Button>
                <Button onClick={handleOpenBlockerModal}>新增 blocker</Button>
              </div>

              <div className={styles.stepRail}>
                {FDE_DELIVERY_STEPS.map((step, index) => {
                  const isCompleted = index < activeStepIndex;
                  const isCurrent = index === activeStepIndex;

                  return (
                    <div key={step.key} className={styles.stepItem}>
                      <div
                        className={classNames(
                          styles.stepBadge,
                          isCompleted && styles.stepBadgeDone,
                          isCurrent && styles.stepBadgeCurrent,
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className={styles.stepLabel}>{step.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.contentGrid}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>客户与交付概览</div>
                  <div className={styles.factGrid}>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>行业</span>
                      <span className={styles.factValue}>{selectedOrder.industry}</span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>成员初始化</span>
                      <span className={styles.factValue}>{selectedOrder.memberCount} 人</span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>Agent 专家团</span>
                      <span className={styles.factValue}>
                        {selectedOrder.expertNames.join(" / ")}
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>API 对接</span>
                      <span className={styles.factValue}>{selectedOrder.apiTargets.join(" / ")}</span>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>设备配置</div>
                  <div className={styles.factGrid}>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>部署方式</span>
                      <span className={styles.factValue}>{selectedOrder.deviceConfig.mode}</span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>云端设备</span>
                      <span className={styles.factValue}>
                        {selectedOrder.deviceConfig.cloudNodeName}
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>本地设备</span>
                      <span className={styles.factValue}>
                        {selectedOrder.deviceConfig.localDeviceName}
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>设备配对码</span>
                      <span className={styles.factValue}>
                        {selectedOrder.deviceConfig.pairingCode}
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>OS 提供方</span>
                      <span className={styles.factValue}>{selectedOrder.deviceConfig.osOwner}</span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>地域</span>
                      <span className={styles.factValue}>{selectedOrder.deviceConfig.region}</span>
                    </div>
                  </div>
                </section>
              </div>

              {currentStepWorkspace ? (
                <section className={styles.card}>
                  <div className={styles.cardTitle}>{currentStepWorkspace.title}工作区</div>
                  <div className={styles.sectionHint}>{currentStepWorkspace.description}</div>
                  <div className={styles.workspaceGrid}>
                    {currentStepWorkspace.values.map(item => (
                      <div
                        key={`${currentStepWorkspace.title}-${item.label}-${item.value}`}
                        className={styles.workspaceItem}
                      >
                        <span className={styles.factLabel}>{item.label}</span>
                        <span className={styles.factValue}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className={styles.contentGrid}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>交付 blocker</div>
                  <div className={styles.sectionHint}>
                    当前未解决 blocker：{unresolvedBlockers.length} 项
                  </div>
                  {selectedOrder.blockers.length ? (
                    <div className={styles.blockerList}>
                      {selectedOrder.blockers.map(item => (
                        <div key={item.id} className={styles.blockerItem}>
                          <div className={styles.blockerHeader}>
                            <strong>{item.title}</strong>
                            <span
                              className={classNames(
                                styles.statusTag,
                                getBlockerStatusClassName(item.status),
                              )}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className={styles.blockerMeta}>
                            负责人：{getFdeMemberName(members, item.ownerId)} · 截止：
                            {item.dueDate || "待确认"}
                          </div>
                          <div className={styles.blockerDetail}>{item.detail || "待补充处理说明"}</div>
                          <Button
                            size="small"
                            className={styles.inlineButton}
                            onClick={() => handleUpdateBlockerStatus(item.id, item.status)}
                          >
                            {item.status === "待处理"
                              ? "开始处理"
                              : item.status === "处理中"
                                ? "解除阻塞"
                                : "重新打开"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyHint}>当前没有 blocker，可继续推进交付。</div>
                  )}
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>API 联调状态</div>
                  <div className={styles.apiList}>
                    {selectedOrder.apiIntegrations.map(item => (
                      <div key={item.id} className={styles.apiItem}>
                        <div className={styles.apiHeader}>
                          <strong>{item.name}</strong>
                          <span
                            className={classNames(
                              styles.statusTag,
                              getApiStatusClassName(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className={styles.apiNote}>{item.note || "待补充联调说明"}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className={styles.contentGrid}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>成员初始化</div>
                  <div className={styles.memberProgressRow}>
                    <div className={styles.memberProgressInfo}>
                      <span className={styles.factLabel}>成员开通进度</span>
                      <strong className={styles.progressValue}>{memberInitPercent}%</strong>
                    </div>
                    <Progress
                      percent={memberInitPercent}
                      showInfo={false}
                      strokeColor="var(--fdeAccent)"
                    />
                  </div>
                  <div className={styles.factGrid}>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>目标成员</span>
                      <span className={styles.factValue}>
                        {selectedOrder.memberInit.targetCount} 人
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>已激活</span>
                      <span className={styles.factValue}>
                        {selectedOrder.memberInit.activatedCount} 人
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>已培训</span>
                      <span className={styles.factValue}>
                        {selectedOrder.memberInit.trainingCompletedCount} 人
                      </span>
                    </div>
                  </div>
                  <div className={styles.sectionHint}>{selectedOrder.memberInit.summary}</div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>上线验收</div>
                  <div className={styles.acceptanceHeader}>
                    <span
                      className={classNames(
                        styles.statusTag,
                        getAcceptanceStatusClassName(selectedOrder.acceptance.status),
                      )}
                    >
                      {selectedOrder.acceptance.status}
                    </span>
                    <span className={styles.factLabel}>
                      验收时间：{selectedOrder.acceptance.acceptedAt || "待安排"}
                    </span>
                  </div>
                  <div className={styles.factGrid}>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>交接负责人</span>
                      <span className={styles.factValue}>
                        {selectedOrder.acceptance.handoverOwner || "待确认"}
                      </span>
                    </div>
                    <div className={styles.factItem}>
                      <span className={styles.factLabel}>验收结论</span>
                      <span className={styles.factValue}>{selectedOrder.acceptance.summary}</span>
                    </div>
                  </div>
                  <div className={styles.checkList}>
                    {selectedOrder.acceptance.checklist.map(item => (
                      <div key={item} className={styles.checkItem}>
                        <span className={styles.checkDot} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className={styles.card}>
                <div className={styles.cardTitle}>发货前检查</div>
                <div className={styles.checkList}>
                  {selectedOrder.preflightChecks.map(item => (
                    <div key={item} className={styles.checkItem}>
                      <span className={styles.checkDot} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <Empty description="请选择交付工单" />
          )}
        </article>
      </div>

      <Modal
        title="编辑交付执行台"
        open={isEditModalOpen}
        okText="保存交付信息"
        cancelText="取消"
        width={760}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleSubmitOrderUpdate}
      >
        {formState ? (
          <div className={styles.modalForm}>
            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>目标上线时间</span>
                <Input
                  value={formState.launchTargetDate}
                  onChange={event =>
                    handleOrderFormFieldChange("launchTargetDate", event.target.value)
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>成员总数</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
                  value={formState.memberCount}
                  onChange={value => handleOrderFormFieldChange("memberCount", value ?? 0)}
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>部署方式</span>
                <Select
                  value={formState.mode}
                  options={DELIVERY_MODE_OPTIONS.map(item => ({
                    label: item,
                    value: item,
                  }))}
                  onChange={value => handleOrderFormFieldChange("mode", value)}
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>云端设备</span>
                <Input
                  value={formState.cloudNodeName}
                  onChange={event =>
                    handleOrderFormFieldChange("cloudNodeName", event.target.value)
                  }
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>本地设备</span>
                <Input
                  value={formState.localDeviceName}
                  onChange={event =>
                    handleOrderFormFieldChange("localDeviceName", event.target.value)
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>设备配对码</span>
                <Input
                  value={formState.pairingCode}
                  onChange={event =>
                    handleOrderFormFieldChange("pairingCode", event.target.value)
                  }
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>OS 提供方</span>
                <Input
                  value={formState.osOwner}
                  onChange={event => handleOrderFormFieldChange("osOwner", event.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>部署地域</span>
                <Input
                  value={formState.region}
                  onChange={event => handleOrderFormFieldChange("region", event.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>专家团配置</span>
              <Input.TextArea
                rows={3}
                placeholder="每行一个专家名称"
                value={formState.expertNamesText}
                onChange={event =>
                  handleOrderFormFieldChange("expertNamesText", event.target.value)
                }
              />
            </div>

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>API 联调清单</span>
              <Input.TextArea
                rows={4}
                placeholder="每行格式：接口名 | 状态 | 备注"
                value={formState.apiIntegrationsText}
                onChange={event =>
                  handleOrderFormFieldChange("apiIntegrationsText", event.target.value)
                }
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>目标成员数</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
                  value={formState.memberTargetCount}
                  onChange={value =>
                    handleOrderFormFieldChange("memberTargetCount", value ?? 0)
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>已激活成员</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
                  value={formState.memberActivatedCount}
                  onChange={value =>
                    handleOrderFormFieldChange("memberActivatedCount", value ?? 0)
                  }
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>已培训成员</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
                  value={formState.memberTrainingCompletedCount}
                  onChange={value =>
                    handleOrderFormFieldChange("memberTrainingCompletedCount", value ?? 0)
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>成员初始化说明</span>
                <Input
                  value={formState.memberSummary}
                  onChange={event =>
                    handleOrderFormFieldChange("memberSummary", event.target.value)
                  }
                />
              </div>
            </div>

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>发货前检查</span>
              <Input.TextArea
                rows={3}
                placeholder="每行一个检查项"
                value={formState.preflightChecksText}
                onChange={event =>
                  handleOrderFormFieldChange("preflightChecksText", event.target.value)
                }
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>验收状态</span>
                <Select
                  value={formState.acceptanceStatus}
                  options={DELIVERY_ACCEPTANCE_OPTIONS.map(item => ({
                    label: item,
                    value: item,
                  }))}
                  onChange={value => handleOrderFormFieldChange("acceptanceStatus", value)}
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>验收时间</span>
                <Input
                  value={formState.acceptedAt}
                  onChange={event => handleOrderFormFieldChange("acceptedAt", event.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>交接负责人</span>
              <Input
                value={formState.handoverOwner}
                onChange={event =>
                  handleOrderFormFieldChange("handoverOwner", event.target.value)
                }
              />
            </div>

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>验收结论</span>
              <Input.TextArea
                rows={3}
                value={formState.acceptanceSummary}
                onChange={event =>
                  handleOrderFormFieldChange("acceptanceSummary", event.target.value)
                }
              />
            </div>

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>验收检查清单</span>
              <Input.TextArea
                rows={3}
                placeholder="每行一个验收检查项"
                value={formState.acceptanceChecklistText}
                onChange={event =>
                  handleOrderFormFieldChange("acceptanceChecklistText", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="新增交付 blocker"
        open={isBlockerModalOpen}
        okText="保存 blocker"
        cancelText="取消"
        onCancel={() => setIsBlockerModalOpen(false)}
        onOk={handleSubmitBlocker}
      >
        <div className={styles.modalForm}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>blocker 标题</span>
            <Input
              value={blockerFormState.title}
              onChange={event => handleBlockerFieldChange("title", event.target.value)}
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>负责人</span>
            <Select
              value={blockerFormState.ownerId}
              options={members.map(item => ({
                label: item.name,
                value: item.id,
              }))}
              onChange={value => handleBlockerFieldChange("ownerId", value)}
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>预计解决时间</span>
            <Input
              value={blockerFormState.dueDate}
              onChange={event => handleBlockerFieldChange("dueDate", event.target.value)}
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>处理说明</span>
            <Input.TextArea
              rows={3}
              value={blockerFormState.detail}
              onChange={event => handleBlockerFieldChange("detail", event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
