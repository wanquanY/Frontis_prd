import { useMemo } from "react";

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
  label: string;
  value: string;
}

interface DashboardTeamOverviewItem {
  activeDeliveryCount: number;
  activeVersionCount: number;
  convertedAmountWan: number;
  deliveredCustomerCount: number;
  member: FdeTeamMemberItem;
}

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
        label: "商机总金额",
        value: formatWanAmount(totalOpportunityAmount),
      },
      {
        label: "已成交金额",
        value: formatWanAmount(convertedOpportunityAmount),
      },
      {
        actionTab: "delivery",
        label: "配置中订单",
        value: `${activeDeliveryCount}`,
      },
      {
        actionTab: "operations",
        label: "已交付租户",
        value: `${deliveredCustomerCount}`,
      },
    ];
  }, [deliveryOrders, operationsCustomers, opportunities]);

  const teamOverviewRows = useMemo<DashboardTeamOverviewItem[]>(
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
          const convertedAmountWan = opportunities
            .filter(item => item.ownerId === member.id && item.status === "已成单")
            .reduce((total, item) => total + item.amountWan, 0);

          return {
            activeDeliveryCount,
            activeVersionCount,
            convertedAmountWan,
            deliveredCustomerCount,
            member,
          };
        })
        .sort(
          (left, right) =>
            right.convertedAmountWan +
            right.activeDeliveryCount +
            right.activeVersionCount +
            right.deliveredCustomerCount -
            (left.convertedAmountWan +
              left.activeDeliveryCount +
              left.activeVersionCount +
              left.deliveredCustomerCount),
        ),
    [deliveryOrders, members, opportunities, operationsCustomers, versionTasks],
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
              </button>
            );
          })()
        ))}
      </section>

      <section className={styles.sectionPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>团队概括</h2>
          </div>
        </div>
        <div className={styles.teamTable}>
          <div className={styles.teamHeader}>
            <span>成员</span>
            <span>配置交付</span>
            <span>运行租户</span>
            <span>版本任务</span>
            <span>已成交金额</span>
          </div>
          {teamOverviewRows.map(item => (
            <div key={item.member.id} className={styles.teamRow}>
              <div className={styles.memberCell}>
                <span className={styles.memberName}>{item.member.name}</span>
                <span className={styles.memberRole}>{item.member.title}</span>
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
              <div className={styles.teamMetric}>
                <span className={styles.teamMetricLabel}>已成交金额</span>
                <span className={styles.teamValue}>{formatWanAmount(item.convertedAmountWan)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
