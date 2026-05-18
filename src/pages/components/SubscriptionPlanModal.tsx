import { useEffect, useState } from "react";

import { Button, Input, InputNumber, Modal } from "antd";
import classNames from "classnames";

import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import {
  getActiveMockSubscriptionPlanTemplates,
  getMockSubscriptionPlanTemplate,
  getMockSubscriptionPlanPurchaseOption,
  getMockTenantActiveSubscriptionBillingCycle,
  getMockTenantActiveSubscriptionContractCode,
  getMockSubscriptionPricingPolicy,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSubscriptionBillingCycle,
  MockSubscriptionPlanKey,
  MockSubscriptionPlanPurchaseInput,
  MockSubscriptionPlanPurchaseOption,
  MockSubscriptionPurchaseMode,
} from "@/feature/subscription/types";

import styles from "./SubscriptionPlanModal.module.less";

export type SubscriptionPlanKey = MockSubscriptionPlanKey;
export type SubscriptionPlanPurchaseOption = MockSubscriptionPlanPurchaseOption;

interface SubscriptionPlanModalProps {
  currentPlanKey: SubscriptionPlanKey;
  open: boolean;
  purchaseMode?: MockSubscriptionPurchaseMode;
  tenantSnapshot?: MockTenantManagementSnapshot | null;
  onClose: () => void;
  onSelectPlan: (purchaseInput: MockSubscriptionPlanPurchaseInput) => void;
}

export const SUBSCRIPTION_PLAN_LABELS: Record<string, string> = {
  lite: "Lite 个人版",
  "team-seat-package": "团队席位包",
  "pro-monthly": "Pro 团队版",
  "pro-yearly": "Pro 团队版",
  "enterprise-contract-yearly": "企业版",
};

export { getMockSubscriptionPlanPurchaseOption, getMockSubscriptionPlanTemplate };

export const resolveSubscriptionPlanKey = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): SubscriptionPlanKey => {
  if (!tenantSnapshot) {
    return "lite";
  }

  if (tenantSnapshot.teamPlanPackageId) {
    return tenantSnapshot.teamPlanPackageId;
  }

  if (tenantSnapshot.planLabel.includes("企业")) {
    return "enterprise-contract-yearly";
  }

  if (tenantSnapshot.planLabel.toLowerCase().includes("pro")) {
    const latestSubscriptionOrder = tenantSnapshot.subscriptionOrders[0];

    return latestSubscriptionOrder?.billingCycle === "monthly" ? "pro-monthly" : "pro-yearly";
  }

  return "lite";
};

const getCurrentPlanLabel = (currentPlanKey: SubscriptionPlanKey): string =>
  SUBSCRIPTION_PLAN_LABELS[currentPlanKey] ?? getMockSubscriptionPlanTemplate(currentPlanKey).title;

export const resolveSubscriptionPlanLabel = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
  currentPlanKey: SubscriptionPlanKey = "lite",
): string => {
  if (tenantSnapshot?.edition === "team" && tenantSnapshot.planLabel.trim()) {
    return tenantSnapshot.planLabel;
  }

  return getCurrentPlanLabel(currentPlanKey);
};

/**
 * 用户侧团队扩充弹窗，用于按席位购买 Pro，并通过年付签约码自动判定企业版。
 */
export const SubscriptionPlanModal = ({
  currentPlanKey,
  open,
  purchaseMode = "addSeats",
  tenantSnapshot,
  onClose,
  onSelectPlan,
}: SubscriptionPlanModalProps): JSX.Element => {
  const pricingPolicy = getMockSubscriptionPricingPolicy();
  const [billingCycle, setBillingCycle] = useState<MockSubscriptionBillingCycle>("monthly");
  const [seatCount, setSeatCount] = useState<number>(1);
  const [contractCode, setContractCode] = useState<string>("");
  const isRenewMode = purchaseMode === "renew";
  const lockedAddSeatBillingCycle = isRenewMode
    ? null
    : getMockTenantActiveSubscriptionBillingCycle(tenantSnapshot);
  const lockedAddSeatContractCode = isRenewMode
    ? ""
    : getMockTenantActiveSubscriptionContractCode(tenantSnapshot);
  const purchasePreview = getMockSubscriptionPlanPurchaseOption(
    {
      billingCycle,
      contractCode,
      purchaseMode,
      seatCount,
    },
    tenantSnapshot,
  );
  const isCurrentLite = currentPlanKey === "lite";
  const defaultSeatCount = isRenewMode ? Math.max(tenantSnapshot?.totalSeats ?? 1, 1) : 1;
  const seatFieldLabel = isRenewMode ? "续约席位" : "新增席位";
  const teamSeatPackage =
    getActiveMockSubscriptionPlanTemplates()[0] ??
    getMockSubscriptionPlanTemplate("team-seat-package");
  const currentSeatCount = tenantSnapshot?.totalSeats ?? 1;
  const usedSeatCount = tenantSnapshot?.usedSeats ?? 1;

  useEffect(() => {
    if (!open) {
      return;
    }

    setBillingCycle(lockedAddSeatBillingCycle ?? "monthly");
    setSeatCount(defaultSeatCount);
    setContractCode(lockedAddSeatContractCode);
  }, [defaultSeatCount, lockedAddSeatBillingCycle, lockedAddSeatContractCode, open]);

  const handleSelectBillingCycle = (nextBillingCycle: MockSubscriptionBillingCycle): void => {
    if (lockedAddSeatBillingCycle) {
      return;
    }

    setBillingCycle(nextBillingCycle);

    if (nextBillingCycle === "monthly") {
      setContractCode("");
    }
  };

  const handleSubmit = (): void => {
    onSelectPlan({
      billingCycle,
      contractCode,
      purchaseMode,
      seatCount,
    });
  };

  return (
    <Modal
      open={open}
      title={null}
      footer={null}
      width={980}
      centered
      destroyOnClose
      className={styles.planModal}
      onCancel={onClose}
    >
      <div className={styles.subscriptionLayout}>
        <section className={classNames(styles.planCard, styles.statusCard)}>
          <span className={styles.planSequence}>01</span>
          <span className={styles.planDot} aria-hidden={true} />
          <div className={styles.planHeader}>
            <h3 className={styles.planTitle}>当前团队</h3>
            <span className={styles.planAudience}>
              {resolveSubscriptionPlanLabel(tenantSnapshot, currentPlanKey)}
            </span>
          </div>
          <div className={styles.planDivider} />
          <div className={styles.statusRows}>
            <div>
              <span>当前席位</span>
              <strong>{currentSeatCount} 个</strong>
            </div>
            <div>
              <span>已用席位</span>
              <strong>{usedSeatCount} 个</strong>
            </div>
            <div>
              <span>到期时间</span>
              <strong>{tenantSnapshot?.planExpiresAt ?? "-"}</strong>
            </div>
          </div>
        </section>

        <section className={classNames(styles.planCard, styles.proCard)}>
          <span className={styles.planSequence}>02</span>
          <span className={styles.planDot} aria-hidden={true} />
          <div className={styles.planHeader}>
            <h3 className={styles.planTitle}>{teamSeatPackage.title}</h3>
            <span className={styles.planAudience}>
              {isCurrentLite ? "购买后开通团队协作" : "增加或续费团队席位"}
            </span>
          </div>
          <div className={styles.priceGrid}>
            <div>
              <span>月付</span>
              <strong>¥{pricingPolicy.proMonthlySeatPrice} / 席 / 月</strong>
            </div>
            <div>
              <span>年付</span>
              <strong>¥{pricingPolicy.proYearlySeatPrice} / 席 / 年</strong>
            </div>
            <div>
              <span>年付签约价</span>
              <strong>¥{pricingPolicy.enterpriseYearlySeatPrice} / 席 / 年</strong>
            </div>
          </div>
          <div className={styles.purchaseForm}>
            <div className={styles.formField}>
              <span className={styles.fieldLabel}>当前版本</span>
              <strong>{resolveSubscriptionPlanLabel(tenantSnapshot, currentPlanKey)}</strong>
            </div>
            <div className={styles.formField}>
              <span className={styles.fieldLabel}>{seatFieldLabel}</span>
              <InputNumber
                className={styles.fullWidthInput}
                disabled={isRenewMode}
                min={1}
                precision={0}
                value={seatCount}
                onChange={value => setSeatCount(value ?? 1)}
              />
            </div>
            <div className={styles.formField}>
              <span className={styles.fieldLabel}>付费方式</span>
              <div className={styles.cycleSwitch}>
                <button
                  type="button"
                  className={classNames(
                    styles.cycleButton,
                    billingCycle === "monthly" && styles.cycleButtonActive,
                  )}
                  disabled={Boolean(lockedAddSeatBillingCycle)}
                  onClick={() => handleSelectBillingCycle("monthly")}
                >
                  按月支付
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.cycleButton,
                    billingCycle === "yearly" && styles.cycleButtonActive,
                  )}
                  disabled={Boolean(lockedAddSeatBillingCycle)}
                  onClick={() => handleSelectBillingCycle("yearly")}
                >
                  按年支付
                </button>
              </div>
            </div>
            {billingCycle === "yearly" ? (
              <div className={styles.formField}>
                <span className={styles.fieldLabel}>签约码</span>
                <Input
                  value={contractCode}
                  placeholder="填写有效签约码可自动判定企业版"
                  onChange={event => setContractCode(event.target.value)}
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
                <span>{seatFieldLabel}</span>
                <strong>{purchasePreview.seatLabel}</strong>
              </div>
              <div className={styles.previewRow}>
                <span>有效周期</span>
                <strong>{purchasePreview.billingCycleLabel}</strong>
              </div>
              <div className={styles.previewRow}>
                <span>赠送积分</span>
                <strong>{purchasePreview.giftPoints.toLocaleString("zh-CN")} 积分</strong>
              </div>
              <div className={styles.previewRow}>
                <span>到期时间</span>
                <strong>{purchasePreview.expiresAt}</strong>
              </div>
              {purchasePreview.prorationLabel ? (
                <div className={styles.previewRow}>
                  <span>计费周期</span>
                  <strong>{purchasePreview.prorationLabel}</strong>
                </div>
              ) : null}
              <div className={styles.previewRow}>
                <span>计费单价</span>
                <strong>{purchasePreview.priceLabel}</strong>
              </div>
              {purchasePreview.contractCodeStatusLabel ? (
                <div className={styles.previewRow}>
                  <span>签约码</span>
                  <strong>{purchasePreview.contractCodeStatusLabel}</strong>
                </div>
              ) : null}
              {purchasePreview.ownerName ? (
                <div className={styles.previewRow}>
                  <span>签约负责人</span>
                  <strong>{purchasePreview.ownerName}</strong>
                </div>
              ) : null}
              {purchasePreview.ruleMessage ? (
                <div className={styles.previewHint}>{purchasePreview.ruleMessage}</div>
              ) : null}
              <div className={styles.totalRow}>
                <span>支付金额</span>
                <strong>¥{purchasePreview.amount.toLocaleString("zh-CN")}</strong>
              </div>
            </div>
          ) : null}

          <Button type="primary" className={styles.proAction} onClick={handleSubmit}>
            {isRenewMode ? "去续约" : "去支付"}
          </Button>
        </section>
      </div>
    </Modal>
  );
};
