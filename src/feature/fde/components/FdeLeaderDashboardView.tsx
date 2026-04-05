import { useMemo } from "react";

import classNames from "classnames";
import { Empty } from "antd";

import type {
  FdeDeliveryOrderItem,
  FdeOperationsCustomerItem,
  FdeOpportunityItem,
  FdeTeamMemberItem,
  FdeVersionManagementTaskItem,
  FdeWorkbenchTabKey,
} from "@/feature/fde/types";
import { formatWanAmount, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeLeaderDashboardView.module.less";

type DashboardTone = "high" | "medium" | "normal";

interface FdeLeaderDashboardViewProps {
  members: FdeTeamMemberItem[];
  opportunities: FdeOpportunityItem[];
  deliveryOrders: FdeDeliveryOrderItem[];
  operationsCustomers: FdeOperationsCustomerItem[];
  versionTasks: FdeVersionManagementTaskItem[];
  onNavigate: (tab: FdeWorkbenchTabKey) => void;
}

interface DashboardMetricItem {
  actionTab?: FdeWorkbenchTabKey;
  hint: string;
  label: string;
  value: string;
}

interface DashboardFocusItem {
  actionLabel: string;
  actionTab?: FdeWorkbenchTabKey;
  detail: string;
  ownerName: string;
  title: string;
  tone: DashboardTone;
}

interface DashboardTeamLoadItem {
  activeDeliveryCount: number;
  activeVersionCount: number;
  deliveredCustomerCount: number;
  member: FdeTeamMemberItem;
  riskCount: number;
}

const DELIVERY_STEP_LABELS: Record<FdeDeliveryOrderItem["currentStep"], string> = {
  deviceConfig: "设备分配",
  agentConfig: "租户 Agent 下发",
  apiTest: "企业后台配置",
  preflight: "交付验收",
};

const getFocusToneClassName = (tone: DashboardTone): string => {
  if (tone === "high") {
    return styles.focusItemHigh;
  }

  if (tone === "medium") {
    return styles.focusItemMedium;
  }

  return styles.focusItemNormal;
};

const getMemberStatusLabel = (member: FdeTeamMemberItem): string => {
  if (member.accountStatus === "disabled") {
    return "已禁用";
  }

  if (member.status === "busy") {
    return "忙碌";
  }

  if (member.status === "offline") {
    return "离线";
  }

  return "在线";
};

const getMemberStatusClassName = (member: FdeTeamMemberItem): string => {
  if (member.accountStatus === "disabled") {
    return styles.memberStatusDisabled;
  }

  if (member.status === "busy") {
    return styles.memberStatusBusy;
  }

  if (member.status === "offline") {
    return styles.memberStatusOffline;
  }

  return styles.memberStatusOnline;
};

/**
 * FDE 负责人首页总览看板。
 */
export const FdeLeaderDashboardView = ({
  members,
  opportunities,
  deliveryOrders,
  operationsCustomers,
  versionTasks,
  onNavigate,
}: FdeLeaderDashboardViewProps): JSX.Element => {
  const metrics = useMemo<DashboardMetricItem[]>(() => {
    const totalOpportunityAmount = opportunities.reduce((total, item) => total + item.amountWan, 0);
    const convertedOpportunityAmount = opportunities
      .filter(item => item.stage === "已成交")
      .reduce((total, item) => total + item.amountWan, 0);
    const activeDeliveryCount = deliveryOrders.filter(item => item.deliveryStatus !== "已交付").length;
    const deliveredCustomerCount = operationsCustomers.filter(item => item.isDelivered).length;

    return [
      {
        hint: "全部在跟商机累计金额",
        label: "商机总金额",
        value: formatWanAmount(totalOpportunityAmount),
      },
      {
        hint: "已进入成交阶段的金额",
        label: "已成交金额",
        value: formatWanAmount(convertedOpportunityAmount),
      },
      {
        actionTab: "delivery",
        hint: "待配置与配置中的订单",
        label: "配置中订单",
        value: `${activeDeliveryCount}`,
      },
      {
        actionTab: "operations",
        hint: "已进入持续运营的客户",
        label: "已交付客户",
        value: `${deliveredCustomerCount}`,
      },
    ];
  }, [deliveryOrders, operationsCustomers, opportunities]);

  const focusItems = useMemo<DashboardFocusItem[]>(() => {
    return deliveryOrders
      .filter(item => item.deliveryStatus !== "已交付")
      .sort((left, right) => left.stepProgress - right.stepProgress)
      .slice(0, 5)
      .map(item => ({
          actionLabel: "查看交付",
          actionTab: "delivery",
          detail: `${DELIVERY_STEP_LABELS[item.currentStep]}，计划 ${item.launchTargetDate} 上线`,
          ownerName: getFdeMemberName(members, item.assignedToId),
          title: `${item.customerName} 交付仍未完成`,
          tone: "medium",
      }));
  }, [deliveryOrders, members]);

  const teamLoadRows = useMemo<DashboardTeamLoadItem[]>(
    () =>
      members
        .map(member => {
          const activeDeliveryCount = deliveryOrders.filter(
            item => item.assignedToId === member.id && item.deliveryStatus !== "已交付",
          ).length;
          const deliveredCustomerCount = operationsCustomers.filter(
            item => item.assignedToId === member.id && item.isDelivered,
          ).length;
          const activeVersionCount = versionTasks.filter(
            item => item.assignedToId === member.id && item.status !== "当前版本",
          ).length;
          const riskCount =
            operationsCustomers.filter(
              item => item.assignedToId === member.id && item.health === "risk",
            ).length +
            versionTasks.filter(
              item => item.assignedToId === member.id && item.status === "已回退",
            ).length;

          return {
            activeDeliveryCount,
            activeVersionCount,
            deliveredCustomerCount,
            member,
            riskCount,
          };
        })
        .sort((left, right) => {
          if (right.riskCount !== left.riskCount) {
            return right.riskCount - left.riskCount;
          }

          return (
            right.activeDeliveryCount +
            right.activeVersionCount +
            right.deliveredCustomerCount -
            (left.activeDeliveryCount + left.activeVersionCount + left.deliveredCustomerCount)
          );
        }),
    [deliveryOrders, members, operationsCustomers, versionTasks],
  );

  if (!members.length) {
    return <Empty description="当前暂无团队数据" />;
  }

  return (
    <div className={styles.page}>
      <section className={styles.metricGrid}>
        {metrics.map(item => (
          (() => {
            const targetTab = item.actionTab;

            if (!targetTab) {
              return (
                <div key={item.label} className={styles.metricCard}>
                  <span className={styles.metricLabel}>{item.label}</span>
                  <strong className={styles.metricValue}>{item.value}</strong>
                  <span className={styles.metricHint}>{item.hint}</span>
                </div>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                className={styles.metricCard}
                onClick={() => onNavigate(targetTab)}
              >
                <span className={styles.metricLabel}>{item.label}</span>
                <strong className={styles.metricValue}>{item.value}</strong>
                <span className={styles.metricHint}>{item.hint}</span>
              </button>
            );
          })()
        ))}
      </section>

      <section className={styles.sectionPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>今日重点</h2>
            <p className={styles.panelDescription}>只保留当前仍在推进中的配置交付事项。</p>
          </div>
        </div>
        {focusItems.length ? (
          <div className={styles.focusList}>
            {focusItems.map(item => (
              <div
                key={`${item.title}-${item.ownerName}`}
                className={classNames(styles.focusItem, getFocusToneClassName(item.tone))}
              >
                <div className={styles.focusMain}>
                  <div className={styles.focusTitle}>{item.title}</div>
                  <div className={styles.focusDetail}>{item.detail}</div>
                </div>
                <div className={styles.focusMeta}>
                  <span className={styles.focusOwner}>负责人：{item.ownerName}</span>
                  {(() => {
                    const targetTab = item.actionTab;

                    if (!targetTab) {
                      return null;
                    }

                    return (
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => onNavigate(targetTab)}
                      >
                        {item.actionLabel}
                      </button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyBlock}>当前暂无需要优先处理的事项。</div>
        )}
      </section>

      <section className={styles.sectionPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>团队负载</h2>
            <p className={styles.panelDescription}>用同一口径看成员状态和当前承接压力。</p>
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => onNavigate("teamManagement")}
            >
              查看成员
            </button>
          </div>
        </div>
        <div className={styles.teamTable}>
          <div className={styles.teamHeader}>
            <span>成员</span>
            <span>状态</span>
            <span>配置交付</span>
            <span>运行客户</span>
            <span>版本任务</span>
            <span>风险项</span>
            <span>聚焦场景</span>
          </div>
          {teamLoadRows.map(item => (
            <div key={item.member.id} className={styles.teamRow}>
              <div className={styles.memberCell}>
                <span className={styles.memberName}>{item.member.name}</span>
                <span className={styles.memberRole}>{item.member.title}</span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>状态</span>
                <span
                  className={classNames(
                    styles.memberStatus,
                    getMemberStatusClassName(item.member),
                  )}
                >
                  {getMemberStatusLabel(item.member)}
                </span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>配置交付</span>
                <span className={styles.teamValue}>{item.activeDeliveryCount}</span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>运行客户</span>
                <span className={styles.teamValue}>{item.deliveredCustomerCount}</span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>版本任务</span>
                <span className={styles.teamValue}>{item.activeVersionCount}</span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>风险项</span>
                <span className={styles.teamValue}>{item.riskCount}</span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>聚焦场景</span>
                <span className={styles.teamScenes}>
                  {item.member.focusScenes.length ? item.member.focusScenes.join(" / ") : "暂无"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
