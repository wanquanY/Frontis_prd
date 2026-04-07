import type { JSX } from "react";

import classNames from "classnames";
import { Button } from "antd";

import type { FdeDeliveryOrderItem } from "@/feature/fde/types";

import {
  type AgentSelectMode,
  type DeliveryDetailTabKey,
  type DeviceAllocationRecord,
  DELIVERY_STEP_GUIDES,
  buildDefaultDeviceRecord,
  hasPendingDevicePrefill,
  isDeliveryItemDelivered,
  shouldAllowSkipStep,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryStepPanelProps {
  deliveryOrder: FdeDeliveryOrderItem;
  selectedDetailTab: DeliveryDetailTabKey;
  deviceRecord: DeviceAllocationRecord | null;
  onOpenDeviceModal: (order: FdeDeliveryOrderItem) => void;
  onAdvanceStep: (skipCurrentStep?: boolean) => void;
  onOpenExpertGroupModal: (order: FdeDeliveryOrderItem) => void;
  onOpenAgentModal: (order: FdeDeliveryOrderItem, mode: AgentSelectMode) => void;
  onDeliverAgentGroup: (deliveryOrderId: string, groupId: string) => void;
  onDeliverSingleAgent: (deliveryOrderId: string, agentName: string) => void;
  onOpenAdmin: () => void;
}

const getDeliveryItemStatusClassName = (statusLabel: string): string => {
  if (statusLabel.includes("已")) {
    return styles.deliveryStatusDone;
  }

  if (statusLabel.includes("待")) {
    return styles.deliveryStatusPending;
  }

  return styles.deliveryStatusNeutral;
};

/**
 * FDE 配置交付中的步骤内容面板。
 */
export const FdeDeliveryStepPanel = ({
  deliveryOrder,
  selectedDetailTab,
  deviceRecord,
  onOpenDeviceModal,
  onAdvanceStep,
  onOpenExpertGroupModal,
  onOpenAgentModal,
  onDeliverAgentGroup,
  onDeliverSingleAgent,
  onOpenAdmin,
}: FdeDeliveryStepPanelProps): JSX.Element => {
  if (selectedDetailTab === "deviceConfig") {
    const isCurrentStep = deliveryOrder.currentStep === "deviceConfig";
    const isReadOnlyStep =
      deliveryOrder.completedSteps.includes("deviceConfig") ||
      deliveryOrder.skippedSteps?.includes("deviceConfig");
    const currentDeviceRecord = deviceRecord ?? buildDefaultDeviceRecord(deliveryOrder);
    const allowSkipCurrentStep =
      isCurrentStep && shouldAllowSkipStep(deliveryOrder, "deviceConfig");
    const hasPendingPrefill = hasPendingDevicePrefill(currentDeviceRecord);

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>{DELIVERY_STEP_GUIDES.deviceConfig.title}</div>
          <div className={styles.sectionActions}>
            {isReadOnlyStep ? (
              <span className={styles.deliveryHint}>当前阶段已完成，内容仅供查看。</span>
            ) : null}
            {isCurrentStep ? (
              <Button onClick={() => onOpenDeviceModal(deliveryOrder)}>配置设备额度</Button>
            ) : null}
            {allowSkipCurrentStep ? (
              <Button onClick={() => onAdvanceStep(true)}>跳过此步骤</Button>
            ) : null}
            {isCurrentStep ? (
              <Button type="primary" onClick={() => onAdvanceStep()}>
                {DELIVERY_STEP_GUIDES.deviceConfig.buttonLabel}
              </Button>
            ) : null}
          </div>
        </div>
        <div className={styles.infoRows}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>分配状态</span>
            <span className={styles.infoValue}>
              {currentDeviceRecord.isConfigured
                ? "已配置设备额度"
                : hasPendingPrefill
                  ? "已按订单预填，待确认分配"
                  : "待配置设备额度"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>云端工作站额度</span>
            <span className={styles.infoValue}>
              {currentDeviceRecord.cloudWorkbenchQuota ?? 0} 台
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>本地工作站额度</span>
            <span className={styles.infoValue}>
              {currentDeviceRecord.localWorkbenchQuota ?? 0} 台
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>本地客户端额度</span>
            <span className={styles.infoValue}>
              {currentDeviceRecord.localClientQuota ?? 0} 个
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>生效时间</span>
            <span className={styles.infoValue}>{currentDeviceRecord.effectiveAt || "待设置"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>最近保存时间</span>
            <span className={styles.infoValue}>{currentDeviceRecord.configuredAt || "未保存"}</span>
          </div>
        </div>
      </section>
    );
  }

  if (selectedDetailTab === "agentConfig") {
    const isCurrentStep = deliveryOrder.currentStep === "agentConfig";
    const isReadOnlyStep =
      deliveryOrder.completedSteps.includes("agentConfig") ||
      deliveryOrder.skippedSteps?.includes("agentConfig");
    const allowSkipCurrentStep =
      isCurrentStep && shouldAllowSkipStep(deliveryOrder, "agentConfig");
    const deliveryEntries = [
      ...(deliveryOrder.agentGroups ?? []).map(group => ({
        id: group.id,
        kind: "group" as const,
        title: group.name,
        sourceLabel: group.sourceLabel,
        statusLabel: group.statusLabel,
        versionLabel: `${group.agents.length} 个 AI 专家`,
        agentNames: group.agents.map(item => item.name),
      })),
      ...(deliveryOrder.agentPackages ?? []).map(item => ({
        id: item.name,
        kind: "agent" as const,
        title: item.name,
        sourceLabel: item.sourceLabel,
        statusLabel: item.statusLabel,
        versionLabel: item.releaseVersion,
        agentNames: [] as string[],
      })),
    ];

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>{DELIVERY_STEP_GUIDES.agentConfig.title}</div>
          <div className={styles.sectionActions}>
            {isReadOnlyStep ? (
              <span className={styles.deliveryHint}>当前阶段已完成，内容仅供查看。</span>
            ) : null}
            {isCurrentStep ? (
              <Button onClick={() => onOpenExpertGroupModal(deliveryOrder)}>
                添加 AI 专家团
              </Button>
            ) : null}
            {isCurrentStep ? (
              <Button onClick={() => onOpenAgentModal(deliveryOrder, "single")}>
                直接添加单个 AI 专家
              </Button>
            ) : null}
            {allowSkipCurrentStep ? (
              <Button onClick={() => onAdvanceStep(true)}>跳过此步骤</Button>
            ) : null}
            {isCurrentStep ? (
              <Button type="primary" onClick={() => onAdvanceStep()}>
                {DELIVERY_STEP_GUIDES.agentConfig.buttonLabel}
              </Button>
            ) : null}
          </div>
        </div>
        {deliveryEntries.length ? (
          <div className={styles.deliveryList}>
            {deliveryEntries.map(item => (
              <div key={`${item.kind}-${item.id}`} className={styles.deliveryCard}>
                <div className={styles.deliveryCardHeader}>
                  <div className={styles.deliveryCardHeading}>
                    <div className={styles.deliveryCardTitleRow}>
                      <div className={styles.deliveryCardTitle}>{item.title}</div>
                      <span className={styles.deliveryTypeTag}>
                        {item.kind === "group" ? "专家团" : "AI 专家"}
                      </span>
                    </div>
                    <div className={styles.deliveryMetaRow}>
                      <span className={styles.deliveryMetaTag}>{item.sourceLabel}</span>
                      <span className={styles.deliveryMetaTag}>
                        {item.kind === "group" ? item.versionLabel : `版本 ${item.versionLabel}`}
                      </span>
                    </div>
                  </div>
                  <div className={styles.deliveryActions}>
                    <span
                      className={classNames(
                        styles.deliveryStatus,
                        getDeliveryItemStatusClassName(item.statusLabel),
                      )}
                    >
                      {item.statusLabel}
                    </span>
                    {isCurrentStep && !isDeliveryItemDelivered(item.statusLabel) ? (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() =>
                          item.kind === "group"
                            ? onDeliverAgentGroup(deliveryOrder.id, item.id)
                            : onDeliverSingleAgent(deliveryOrder.id, item.id)
                        }
                      >
                        下发到租户
                      </Button>
                    ) : null}
                  </div>
                </div>
                {item.kind === "group" ? (
                  <div className={styles.deliveryTagList}>
                    {item.agentNames.map(name => (
                      <span key={name} className={styles.deliveryTag}>
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyHint}>当前未添加待下发的 AI 专家记录</div>
        )}
      </section>
    );
  }

  if (selectedDetailTab === "apiTest") {
    const isCurrentStep = deliveryOrder.currentStep === "apiTest";
    const isReadOnlyStep =
      deliveryOrder.completedSteps.includes("apiTest") ||
      deliveryOrder.skippedSteps?.includes("apiTest");
    const allowSkipCurrentStep = isCurrentStep && shouldAllowSkipStep(deliveryOrder, "apiTest");

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>{DELIVERY_STEP_GUIDES.apiTest.title}</div>
          <div className={styles.sectionActions}>
            {isReadOnlyStep ? (
              <span className={styles.deliveryHint}>当前阶段已完成，内容仅供查看。</span>
            ) : null}
            {isCurrentStep ? <Button onClick={onOpenAdmin}>进入企业管理后台</Button> : null}
            {allowSkipCurrentStep ? (
              <Button onClick={() => onAdvanceStep(true)}>跳过此步骤</Button>
            ) : null}
            {isCurrentStep ? (
              <Button type="primary" onClick={() => onAdvanceStep()}>
                {DELIVERY_STEP_GUIDES.apiTest.buttonLabel}
              </Button>
            ) : null}
          </div>
        </div>
        <div className={styles.lineList}>
          {(deliveryOrder.adminTodo ?? []).map(item => (
            <div key={item} className={styles.lineItem}>
              {item}
            </div>
          ))}
        </div>
        {deliveryOrder.apiTargets.length ? (
          <div className={styles.subSection}>
            <div className={styles.subSectionTitle}>待补接口</div>
            <div className={styles.inlineText}>{deliveryOrder.apiTargets.join("、")}</div>
          </div>
        ) : null}
      </section>
    );
  }

  const isCurrentStep = deliveryOrder.currentStep === "preflight";
  const isReadOnlyStep =
    deliveryOrder.completedSteps.includes("preflight") ||
    deliveryOrder.skippedSteps?.includes("preflight");

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>{DELIVERY_STEP_GUIDES.preflight.title}</div>
        <div className={styles.sectionActions}>
          {isReadOnlyStep ? (
            <span className={styles.deliveryHint}>当前阶段已完成，内容仅供查看。</span>
          ) : null}
          {isCurrentStep ? (
            <Button type="primary" onClick={() => onAdvanceStep()}>
              {DELIVERY_STEP_GUIDES.preflight.buttonLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div className={styles.subSection}>
        <div className={styles.subSectionTitle}>验收检查</div>
        <div className={styles.lineList}>
          {deliveryOrder.preflightChecks.map(item => (
            <div key={item} className={styles.lineItem}>
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.subSection}>
        <div className={styles.subSectionTitle}>交接事项</div>
        <div className={styles.lineList}>
          {(deliveryOrder.handoffItems ?? []).map(item => (
            <div key={item} className={styles.lineItem}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
