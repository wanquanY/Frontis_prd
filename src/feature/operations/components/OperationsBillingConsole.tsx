import { useEffect, useMemo, useState } from "react";

import { Button, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockTenantManagementSnapshot,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";
import type { OperationsTenant } from "@/feature/operations/types";
import {
  getActiveMockSubscriptionPlanTemplates,
  getMockSubscriptionPlanTemplate,
  getMockSubscriptionPlanPurchaseOption,
  getMockTenantActiveSubscriptionPlanKey,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSubscriptionPlanKey,
  MockSubscriptionPlanPurchaseOption,
} from "@/feature/subscription/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsBillingConsole.module.less";

interface TenantPlanEditorState {
  open: boolean;
  planKey?: MockSubscriptionPlanKey;
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
  const activeSeatPackages = getActiveMockSubscriptionPlanTemplates();
  const visibleSeatPackages =
    activeSeatPackages.length > 0
      ? activeSeatPackages
      : [getMockSubscriptionPlanTemplate("team-monthly-seat-package")];
  const lockedTenantPlanKey = getMockTenantActiveSubscriptionPlanKey(
    selectedTenantRecord?.snapshot,
  );
  const defaultPlanKey = visibleSeatPackages[0]?.key;
  const selectedPlanKey = lockedTenantPlanKey ?? tenantPlanEditor.planKey ?? defaultPlanKey;
  const purchasePreview = tenantPlanEditor.tenantId
    ? getMockSubscriptionPlanPurchaseOption(
        {
          planKey: selectedPlanKey,
          seatCount: tenantPlanEditor.seatCount,
        },
        selectedTenantRecord?.snapshot,
      )
    : null;

  useEffect(() => {
    if (!tenantPlanEditor.open || !lockedTenantPlanKey) {
      return;
    }

    setTenantPlanEditor(current => ({
      ...current,
      planKey: lockedTenantPlanKey,
    }));
  }, [lockedTenantPlanKey, tenantPlanEditor.open, tenantPlanEditor.tenantId]);

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
                <th>有效时间</th>
                <th>最近订单</th>
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
                const nextPlanKey = getMockTenantActiveSubscriptionPlanKey(nextRecord?.snapshot);

                setTenantPlanEditor(current => ({
                  ...current,
                  tenantId,
                  planKey: nextPlanKey ?? current.planKey ?? defaultPlanKey,
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
              <span>席位包</span>
              <Select<MockSubscriptionPlanKey>
                value={selectedPlanKey}
                disabled={Boolean(lockedTenantPlanKey)}
                options={visibleSeatPackages.map(item => ({
                  value: item.key,
                  label: item.title,
                }))}
                onChange={planKey =>
                  setTenantPlanEditor(current => ({
                    ...current,
                    planKey,
                  }))
                }
              />
            </div>
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
                  <span>折算规则</span>
                  <strong>{purchasePreview.prorationLabel}</strong>
                </div>
              ) : null}
              <div className={styles.previewRow}>
                <span>支付金额</span>
                <strong>{formatAmount(purchasePreview.amount)}</strong>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
