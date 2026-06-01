import { useEffect, useMemo, useState } from "react";

import { Button, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockTenantManagementSnapshot,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";
import type { OperationsTenant } from "@/feature/operations/types";
import {
  getMockSubscriptionPlanPurchaseOption,
  getMockTenantActiveSubscriptionBillingCycle,
  getMockTenantActiveSubscriptionContractCode,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSubscriptionBillingCycle,
  MockSubscriptionPlanPurchaseOption,
} from "@/feature/subscription/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsBillingConsole.module.less";

interface TenantPlanEditorState {
  billingCycle: MockSubscriptionBillingCycle;
  contractCode: string;
  open: boolean;
  seatCount: number;
  tenantId?: string;
}

interface OperationsBillingConsoleProps {
  embedded?: boolean;
  tenants: OperationsTenant[];
  onApplyTenantSubscriptionPlan: (
    tenantId: string,
    purchaseOption: MockSubscriptionPlanPurchaseOption,
  ) => boolean;
}

interface TenantBillingRecord {
  snapshot: MockTenantManagementSnapshot | null;
  tenant: OperationsTenant;
}

const formatAmount = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;
const SUBSCRIPTION_TODAY = "2026-05-25";

const buildStatusClassName = (tone?: "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const getLatestSubscriptionOrder = (
  snapshot: MockTenantManagementSnapshot | null,
): MockTenantSubscriptionOrderItem | null =>
  snapshot?.subscriptionOrders.find(order => order.status === "paid") ?? null;

const getTenantSubscriptionStatus = (
  snapshot: MockTenantManagementSnapshot | null,
): { label: string; tone?: "success" | "warning" | "danger" } => {
  if (!snapshot || snapshot.edition === "personal" || !snapshot.subscriptionOrders.length) {
    return { label: "未开通", tone: "warning" };
  }

  if (snapshot.planExpiresAt && snapshot.planExpiresAt < SUBSCRIPTION_TODAY) {
    return { label: "已到期", tone: "danger" };
  }

  return { label: "有效", tone: "success" };
};

const createTenantPlanEditor = (tenantId?: string): TenantPlanEditorState => ({
  billingCycle: "monthly",
  contractCode: "",
  open: Boolean(tenantId),
  seatCount: 1,
  tenantId,
});

/**
 * 运营后台订阅运营控制台，承载租户订阅开通和追加席位。
 */
export const OperationsBillingConsole = ({
  embedded = false,
  tenants,
  onApplyTenantSubscriptionPlan,
}: OperationsBillingConsoleProps): JSX.Element => {
  const [tenantPlanEditor, setTenantPlanEditor] =
    useState<TenantPlanEditorState>(createTenantPlanEditor());
  const tenantBillingRecords = useMemo<TenantBillingRecord[]>(
    () =>
      tenants.map(tenant => ({
        tenant,
        snapshot: getMockTenantManagementSnapshot(tenant.id),
      })),
    [tenants],
  );
  const selectedTenantRecord = tenantBillingRecords.find(
    item => item.tenant.id === tenantPlanEditor.tenantId,
  );
  const lockedTenantBillingCycle = getMockTenantActiveSubscriptionBillingCycle(
    selectedTenantRecord?.snapshot,
  );
  const lockedTenantContractCode = getMockTenantActiveSubscriptionContractCode(
    selectedTenantRecord?.snapshot,
  );
  const purchasePreview = tenantPlanEditor.tenantId
    ? getMockSubscriptionPlanPurchaseOption(
        {
          billingCycle: tenantPlanEditor.billingCycle,
          contractCode: tenantPlanEditor.contractCode,
          seatCount: tenantPlanEditor.seatCount,
        },
        selectedTenantRecord?.snapshot,
      )
    : null;

  useEffect(() => {
    if (!tenantPlanEditor.open || !lockedTenantBillingCycle) {
      return;
    }

    setTenantPlanEditor(current => ({
      ...current,
      billingCycle: lockedTenantBillingCycle,
      contractCode: lockedTenantContractCode,
    }));
  }, [
    lockedTenantBillingCycle,
    lockedTenantContractCode,
    tenantPlanEditor.open,
    tenantPlanEditor.tenantId,
  ]);

  const handleSubmitTenantPlan = (): void => {
    if (!tenantPlanEditor.tenantId || !purchasePreview) {
      message.warning("请选择租户并填写席位数量。");
      return;
    }

    const succeeded = onApplyTenantSubscriptionPlan(tenantPlanEditor.tenantId, purchasePreview);

    if (!succeeded) {
      message.error("订阅开通失败，请检查租户状态。");
      return;
    }

    message.success("订阅已开通。");
    setTenantPlanEditor(createTenantPlanEditor());
  };

  return (
    <div className={embedded ? styles.embeddedRoot : adminStyles.consolePage}>
      {embedded ? null : (
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h1 className={adminStyles.consoleTitle}>订阅运营</h1>
          </div>
        </header>
      )}

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <h2 className={adminStyles.consoleSectionTitle}>租户订阅</h2>
        </div>
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>租户</th>
                <th>当前计划</th>
                <th>席位</th>
                <th>付费周期</th>
                <th>最近订单</th>
                <th>渠道码</th>
                <th>负责人</th>
                <th>到期时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tenantBillingRecords.map(item => {
                const latestOrder = getLatestSubscriptionOrder(item.snapshot);
                const subscriptionStatus = getTenantSubscriptionStatus(item.snapshot);
                const isPointsBilling = item.snapshot?.billingMode !== "cost";

                return (
                  <tr key={item.tenant.id}>
                    <td>
                      <strong>{item.tenant.name}</strong>
                      <div className={adminStyles.consoleSectionMeta}>{item.tenant.adminName}</div>
                    </td>
                    <td>{item.snapshot?.planLabel ?? "个人版"}</td>
                    <td>
                      {item.snapshot?.usedSeats ?? item.tenant.members.length}/
                      {item.snapshot?.totalSeats ?? item.tenant.seatCount}
                    </td>
                    <td>{latestOrder?.billingCycleLabel ?? "-"}</td>
                    <td>
                      {latestOrder ? (
                        <span className={adminStyles.consoleHtmlTableStrong}>
                          {latestOrder.orderNo}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{latestOrder?.contractCode ?? "-"}</td>
                    <td>{latestOrder?.ownerName ?? "-"}</td>
                    <td>{item.snapshot?.planExpiresAt ?? "-"}</td>
                    <td>
                      <span className={buildStatusClassName(subscriptionStatus.tone)}>
                        {subscriptionStatus.label}
                      </span>
                    </td>
                    <td>
                      {isPointsBilling ? (
                        <Button
                          size="small"
                          type="link"
                          onClick={() =>
                            setTenantPlanEditor(createTenantPlanEditor(item.tenant.id))
                          }
                        >
                          购买/追加席位
                        </Button>
                      ) : (
                        <span className={adminStyles.consoleSidebarItemMeta}>不支持</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={tenantPlanEditor.open}
        title="购买/追加席位"
        width={620}
        onCancel={() => setTenantPlanEditor(createTenantPlanEditor())}
        onOk={handleSubmitTenantPlan}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.modalField}>
            <span>租户</span>
            <Select
              value={tenantPlanEditor.tenantId}
              options={tenantBillingRecords.map(item => ({
                value: item.tenant.id,
                label: item.tenant.name,
              }))}
              onChange={tenantId => {
                const nextRecord = tenantBillingRecords.find(item => item.tenant.id === tenantId);
                const nextBillingCycle = getMockTenantActiveSubscriptionBillingCycle(
                  nextRecord?.snapshot,
                );
                const nextContractCode = getMockTenantActiveSubscriptionContractCode(
                  nextRecord?.snapshot,
                );

                setTenantPlanEditor(current => ({
                  ...current,
                  tenantId,
                  billingCycle: nextBillingCycle ?? current.billingCycle,
                  contractCode: nextContractCode,
                }));
              }}
            />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>购买席位</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={1}
                precision={0}
                value={tenantPlanEditor.seatCount}
                onChange={value =>
                  setTenantPlanEditor(current => ({
                    ...current,
                    seatCount: value ?? 1,
                  }))
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>计费周期</span>
              <Select<MockSubscriptionBillingCycle>
                value={tenantPlanEditor.billingCycle}
                disabled={Boolean(lockedTenantBillingCycle)}
                options={[
                  { value: "monthly", label: "按月支付" },
                  { value: "yearly", label: "按年支付" },
                ]}
                onChange={billingCycle =>
                  setTenantPlanEditor(current => ({
                    ...current,
                    billingCycle,
                    contractCode: billingCycle === "monthly" ? "" : current.contractCode,
                  }))
                }
              />
            </div>
            {tenantPlanEditor.billingCycle === "yearly" ? (
              <div className={styles.modalField}>
                <span>渠道码</span>
                <Input
                  value={tenantPlanEditor.contractCode}
                  onChange={event =>
                    setTenantPlanEditor(current => ({
                      ...current,
                      contractCode: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
          {purchasePreview ? (
            <div className={styles.previewPanel}>
              <div className={styles.previewRow}>
                <span>购买内容</span>
                <strong>{purchasePreview.planLabel}</strong>
              </div>
              <div className={styles.previewRow}>
                <span>单价</span>
                <strong>{purchasePreview.priceLabel}</strong>
              </div>
              <div className={styles.previewRow}>
                <span>统一到期日</span>
                <strong>{purchasePreview.expiresAt}</strong>
              </div>
              {purchasePreview.prorationLabel ? (
                <div className={styles.previewRow}>
                  <span>计费周期</span>
                  <strong>{purchasePreview.prorationLabel}</strong>
                </div>
              ) : null}
              {purchasePreview.ownerName ? (
                <div className={styles.previewRow}>
                  <span>签约负责人</span>
                  <strong>{purchasePreview.ownerName}</strong>
                </div>
              ) : null}
              <div className={styles.previewRow}>
                <span>支付金额</span>
                <strong>{formatAmount(purchasePreview.amount)}</strong>
              </div>
              {purchasePreview.ruleMessage ? (
                <div className={styles.previewHint}>{purchasePreview.ruleMessage}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
