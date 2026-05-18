import { useEffect, useMemo, useState } from "react";

import { Empty } from "antd";
import classNames from "classnames";

import type {
  OperationsPointsUsageRecord,
  OperationsRegistrationStrategy,
  OperationsTenant,
} from "@/feature/operations/types";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
  MockSubscriptionPlanPurchaseOption,
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
  pointsUsageRecords: OperationsPointsUsageRecord[];
  registrationStrategy: OperationsRegistrationStrategy;
  salesChannelContractCodes: MockSalesChannelContractCode[];
  tenants: OperationsTenant[];
  onApplyTenantSubscriptionPlan: (
    tenantId: string,
    purchaseOption: MockSubscriptionPlanPurchaseOption,
  ) => boolean;
  onCreateSalesChannelContractCode: (payload: MockSalesChannelContractCodeInput) => void;
  onUpdateSalesChannelContractCode: (
    code: string,
    updates: Partial<MockSalesChannelContractCodeInput>,
  ) => void;
  onUpdateRegistrationStrategy: (
    patch: Partial<
      Pick<
        OperationsRegistrationStrategy,
        | "defaultGiftPoints"
        | "pointsPerCny"
        | "minimumDeductPoints"
        | "roundingUnit"
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
  pointsUsageRecords,
  registrationStrategy,
  salesChannelContractCodes,
  tenants,
  onApplyTenantSubscriptionPlan,
  onCreateSalesChannelContractCode,
  onUpdateSalesChannelContractCode,
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
          pointsUsageRecords={pointsUsageRecords}
          registrationStrategy={registrationStrategy}
          tenants={tenants}
          onUpdateRegistrationStrategy={onUpdateRegistrationStrategy}
        />
      ) : (
        <OperationsBillingConsole
          embedded={true}
          salesChannelContractCodes={salesChannelContractCodes}
          tenants={tenants}
          onApplyTenantSubscriptionPlan={onApplyTenantSubscriptionPlan}
          onCreateSalesChannelContractCode={onCreateSalesChannelContractCode}
          onUpdateSalesChannelContractCode={onUpdateSalesChannelContractCode}
        />
      )}
    </div>
  );
};
