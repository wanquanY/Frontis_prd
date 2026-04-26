import { Button } from "antd";

import type { MockTenantManagementSnapshot } from "@/feature/auth/types";

import adminStyles from "./FrontisAdminViews.module.less";
import { getRoleLabel } from "./FrontisWebViews";

interface TenantOverviewViewProps {
  onOpenTeamPlanPurchase?: () => void;
  tenantSnapshot: MockTenantManagementSnapshot;
}

/**
 * 租户总览视图。
 */
export const TenantOverviewView = ({
  onOpenTeamPlanPurchase,
  tenantSnapshot,
}: TenantOverviewViewProps): JSX.Element => {
  const adminUser =
    tenantSnapshot.users.find(item => item.id === tenantSnapshot.adminUserId) ?? null;
  const availableSeats = Math.max(tenantSnapshot.totalSeats - tenantSnapshot.usedSeats, 0);
  const isPersonalEdition = tenantSnapshot.edition === "personal";

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>租户总览</h1>
        </div>
      </header>

      <div className={adminStyles.consoleSummaryStrip}>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>当前版本</span>
          <span className={adminStyles.consoleSummaryValue}>
            {isPersonalEdition ? "个人版" : "团队版"}
          </span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>积分余额</span>
          <span className={adminStyles.consoleSummaryValue}>
            {tenantSnapshot.pointsBalance.toLocaleString("zh-CN")}
          </span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>席位使用</span>
          <span className={adminStyles.consoleSummaryValue}>
            {tenantSnapshot.usedSeats}/{tenantSnapshot.totalSeats}
          </span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>本月累计消耗</span>
          <span className={adminStyles.consoleSummaryValue}>
            {tenantSnapshot.monthlyUsedPoints.toLocaleString("zh-CN")}
          </span>
        </div>
      </div>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>当前租户信息</h2>
          </div>
        </div>

        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>租户名称</span>
            <span className={adminStyles.consoleInfoValue}>{tenantSnapshot.tenantName}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>租户编码</span>
            <span className={adminStyles.consoleInfoValue}>{tenantSnapshot.tenantCode}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>当前套餐</span>
            <span className={adminStyles.consoleInfoValue}>{tenantSnapshot.planLabel}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>租户管理员</span>
            <span className={adminStyles.consoleInfoValue}>
              {adminUser ? `${adminUser.name} · ${getRoleLabel(adminUser.role)}` : "未配置"}
            </span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>可用席位</span>
            <span className={adminStyles.consoleInfoValue}>{availableSeats} 个</span>
          </div>
          {tenantSnapshot.planExpiresAt ? (
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>有效期至</span>
              <span className={adminStyles.consoleInfoValue}>{tenantSnapshot.planExpiresAt}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>版本与席位</h2>
          </div>
          {isPersonalEdition && onOpenTeamPlanPurchase ? (
            <div className={adminStyles.consoleActions}>
              <Button type="primary" onClick={onOpenTeamPlanPurchase}>
                开通团队版
              </Button>
            </div>
          ) : null}
        </div>

        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>版本状态</span>
            <span className={adminStyles.consoleInfoValue}>
              {isPersonalEdition ? "当前为个人版" : "当前为团队版"}
            </span>
          </div>
          {!isPersonalEdition ? (
            <>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>基础席位</span>
                <span className={adminStyles.consoleInfoValue}>{tenantSnapshot.includedSeats} 个</span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>扩容席位</span>
                <span className={adminStyles.consoleInfoValue}>{tenantSnapshot.extraSeatCount} 个</span>
              </div>
            </>
          ) : null}
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>组织管理</span>
            <span className={adminStyles.consoleInfoValue}>
              {isPersonalEdition ? "开通团队版后解锁" : "已开通"}
            </span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>成员邀请</span>
            <span className={adminStyles.consoleInfoValue}>
              {isPersonalEdition ? "开通团队版后解锁" : "已开通"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
