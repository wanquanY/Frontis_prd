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
import { formatWanAmount } from "@/feature/fde/utils";

import styles from "./FdeLeaderDashboardView.module.less";

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

interface DashboardTeamLoadItem {
  activeDeliveryCount: number;
  activeVersionCount: number;
  deliveredCustomerCount: number;
  member: FdeTeamMemberItem;
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
      .filter(item => item.status === "已成单")
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
        hint: "已进入持续运营的租户",
        label: "已交付租户",
        value: `${deliveredCustomerCount}`,
      },
    ];
  }, [deliveryOrders, operationsCustomers, opportunities]);

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

          return {
            activeDeliveryCount,
            activeVersionCount,
            deliveredCustomerCount,
            member,
          };
        })
        .sort(
          (left, right) =>
            right.activeDeliveryCount +
            right.activeVersionCount +
            right.deliveredCustomerCount -
            (left.activeDeliveryCount + left.activeVersionCount + left.deliveredCustomerCount),
        ),
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
            <span>运行租户</span>
            <span>版本任务</span>
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
                <span className={styles.teamMetricLabel}>运行租户</span>
                <span className={styles.teamValue}>{item.deliveredCustomerCount}</span>
              </div>
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>版本任务</span>
                <span className={styles.teamValue}>{item.activeVersionCount}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
