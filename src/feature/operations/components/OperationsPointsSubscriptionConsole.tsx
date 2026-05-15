import { useEffect, useMemo, useState } from "react";

import { Empty } from "antd";
import classNames from "classnames";

import type {
  OperationsPointsUsageRecord,
  OperationsReferralRecord,
  OperationsRegistrationStrategy,
  OperationsTenant,
} from "@/feature/operations/types";
import type { MockPointsPackageOption } from "@/feature/points/types";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
  MockSubscriptionPlanKey,
  MockSubscriptionPlanPurchaseOption,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
} from "@/feature/subscription/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import { OperationsBillingConsole } from "./OperationsBillingConsole";
import { OperationsPointsConsole } from "./OperationsPointsConsole";

type PointsSubscriptionTabKey = "points" | "subscription";

interface PointsSubscriptionTabOption {
  key: PointsSubscriptionTabKey;
  label: string;
}

interface OperationsPointsSubscriptionConsoleProps {
  canManageBilling: boolean;
  canManagePoints: boolean;
  pointsPackages: MockPointsPackageOption[];
  pointsUsageRecords: OperationsPointsUsageRecord[];
  referralRecords: OperationsReferralRecord[];
  registrationStrategy: OperationsRegistrationStrategy;
  salesChannelContractCodes: MockSalesChannelContractCode[];
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  tenants: OperationsTenant[];
  onApplyTenantSubscriptionPlan: (
    tenantId: string,
    purchaseOption: MockSubscriptionPlanPurchaseOption,
  ) => boolean;
  onCreateSalesChannelContractCode: (payload: MockSalesChannelContractCodeInput) => void;
  onCreateSubscriptionPlan: (payload: MockSubscriptionPlanTemplateInput) => void;
  onCreatePointsPackage: (
    payload: Pick<
      MockPointsPackageOption,
      "title" | "description" | "points" | "price" | "tagLabel"
    >,
  ) => void;
  onUpdatePointsPackage: (
    packageId: string,
    updates: Partial<
      Pick<
        MockPointsPackageOption,
        "title" | "description" | "points" | "price" | "status" | "sortOrder" | "tagLabel"
      >
    >,
  ) => void;
  onUpdateSalesChannelContractCode: (
    code: string,
    updates: Partial<MockSalesChannelContractCodeInput>,
  ) => void;
  onUpdateSubscriptionPlan: (
    planKey: MockSubscriptionPlanKey,
    updates: Partial<MockSubscriptionPlanTemplateInput>,
  ) => void;
  onUpdateRegistrationStrategy: (
    patch: Partial<
      Pick<
        OperationsRegistrationStrategy,
        | "defaultGiftPoints"
        | "pointsPerCny"
        | "minimumDeductPoints"
        | "roundingUnit"
        | "referralDailyRewardLimit"
        | "referralEnabled"
        | "referralInviteeRewardPoints"
        | "referralInviterRewardPoints"
        | "referralMonthlyRewardLimit"
      >
    >,
  ) => void;
}

/**
 * 运营后台积分和订阅运营控制台，统一承载积分运营与订阅运营。
 */
export const OperationsPointsSubscriptionConsole = ({
  canManageBilling,
  canManagePoints,
  pointsPackages,
  pointsUsageRecords,
  referralRecords,
  registrationStrategy,
  salesChannelContractCodes,
  subscriptionPlans,
  tenants,
  onApplyTenantSubscriptionPlan,
  onCreateSalesChannelContractCode,
  onCreateSubscriptionPlan,
  onCreatePointsPackage,
  onUpdatePointsPackage,
  onUpdateSalesChannelContractCode,
  onUpdateSubscriptionPlan,
  onUpdateRegistrationStrategy,
}: OperationsPointsSubscriptionConsoleProps): JSX.Element => {
  const availableTabs = useMemo<PointsSubscriptionTabOption[]>(
    () =>
      [
        canManagePoints ? { key: "points" as const, label: "积分运营" } : null,
        canManageBilling ? { key: "subscription" as const, label: "订阅运营" } : null,
      ].filter((item): item is PointsSubscriptionTabOption => Boolean(item)),
    [canManageBilling, canManagePoints],
  );
  const [activeTab, setActiveTab] = useState<PointsSubscriptionTabKey>(
    canManagePoints ? "points" : "subscription",
  );

  useEffect(() => {
    if (!availableTabs.some(item => item.key === activeTab)) {
      setActiveTab(availableTabs[0]?.key ?? "points");
    }
  }, [activeTab, availableTabs]);

  if (!availableTabs.length) {
    return <Empty description="当前角色暂无积分和订阅运营权限" />;
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>积分和订阅运营</h1>
        </div>
      </header>

      <div className={adminStyles.consoleTabs}>
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={classNames(adminStyles.consoleTabButton, {
              [adminStyles.consoleTabButtonActive]: activeTab === tab.key,
            })}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "points" ? (
        <OperationsPointsConsole
          embedded={true}
          pointsPackages={pointsPackages}
          pointsUsageRecords={pointsUsageRecords}
          referralRecords={referralRecords}
          registrationStrategy={registrationStrategy}
          tenants={tenants}
          onCreatePointsPackage={onCreatePointsPackage}
          onUpdatePointsPackage={onUpdatePointsPackage}
          onUpdateRegistrationStrategy={onUpdateRegistrationStrategy}
        />
      ) : (
        <OperationsBillingConsole
          embedded={true}
          salesChannelContractCodes={salesChannelContractCodes}
          subscriptionPlans={subscriptionPlans}
          tenants={tenants}
          onApplyTenantSubscriptionPlan={onApplyTenantSubscriptionPlan}
          onCreateSalesChannelContractCode={onCreateSalesChannelContractCode}
          onCreateSubscriptionPlan={onCreateSubscriptionPlan}
          onUpdateSalesChannelContractCode={onUpdateSalesChannelContractCode}
          onUpdateSubscriptionPlan={onUpdateSubscriptionPlan}
        />
      )}
    </div>
  );
};
