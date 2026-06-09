import { useEffect, useMemo, useState } from "react";

import { Button, InputNumber, Modal } from "antd";
import classNames from "classnames";

import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import {
  getActiveMockSubscriptionPlanTemplates,
  getMockSubscriptionPlanTemplate,
  getMockSubscriptionPlanPurchaseOption,
  getMockTenantActiveSubscriptionPlanKey,
  getMockSubscriptionPlanValidityLabel,
  getPrimaryMockSubscriptionPlanSpec,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
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
  "team-monthly-seat-package": "月席位包",
  "team-yearly-seat-package": "年席位包",
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
 * 用户侧团队扩充弹窗，用于按席位购买 Pro 团队版。
 */
export const SubscriptionPlanModal = ({
  currentPlanKey,
  open,
  purchaseMode = "addSeats",
  tenantSnapshot,
  onClose,
  onSelectPlan,
}: SubscriptionPlanModalProps): JSX.Element => {
  const [selectedPlanKey, setSelectedPlanKey] = useState<MockSubscriptionPlanKey>(
    "team-monthly-seat-package",
  );
  const [seatCount, setSeatCount] = useState<number>(1);
  const isRenewMode = purchaseMode === "renew";
  const lockedAddSeatPlanKey = isRenewMode
    ? null
    : getMockTenantActiveSubscriptionPlanKey(tenantSnapshot);
  const purchasePreview = getMockSubscriptionPlanPurchaseOption(
    {
      planKey: selectedPlanKey,
      purchaseMode,
      seatCount,
    },
    tenantSnapshot,
  );
  const isCurrentLite = currentPlanKey === "lite";
  const defaultSeatCount = isRenewMode ? Math.max(tenantSnapshot?.totalSeats ?? 1, 1) : 1;
  const seatFieldLabel = isRenewMode ? "续约席位" : "新增席位";
  const activeSeatPackages = getActiveMockSubscriptionPlanTemplates();
  const fallbackSeatPackage = getMockSubscriptionPlanTemplate("team-monthly-seat-package");
  const lockedSeatPackage = lockedAddSeatPlanKey
    ? (activeSeatPackages.find(item => item.key === lockedAddSeatPlanKey) ??
      getMockSubscriptionPlanTemplate(lockedAddSeatPlanKey))
    : null;
  const visibleSeatPackages = lockedSeatPackage
    ? [lockedSeatPackage]
    : activeSeatPackages.length > 0
      ? activeSeatPackages
      : [fallbackSeatPackage];
  const selectedSeatPackage =
    visibleSeatPackages.find(item => item.key === selectedPlanKey) ??
    visibleSeatPackages[0] ??
    fallbackSeatPackage;
  const defaultPlanKey = visibleSeatPackages[0]?.key ?? fallbackSeatPackage.key;
  const currentSeatCount = tenantSnapshot?.totalSeats ?? 1;
  const usedSeatCount = tenantSnapshot?.usedSeats ?? 1;
  const purchaseModeAudience = isRenewMode
    ? "按当前总席位统一续约，可选择启用的公开售卖席位包"
    : lockedSeatPackage
      ? "新增席位沿用当前生效席位包，按剩余天数折算"
      : isCurrentLite
        ? "购买后开通团队协作"
        : "购买团队席位";
  const purchaseRuleHint = useMemo(() => {
    if (isRenewMode) {
      return "续约按当前总席位统一续费，可选择启用的公开售卖席位包；未到期时从当前统一到期日顺延，已过期时从支付成功日重新计算。";
    }

    if (lockedSeatPackage) {
      return `当前团队已有有效席位，新增席位只能沿用「${lockedSeatPackage.title}」；支付金额按新增席位数和剩余服务天数折算，统一到期日不变。`;
    }

    return "首次购买团队席位可选择启用的公开售卖席位包，支付成功后生成新的统一到期日。";
  }, [isRenewMode, lockedSeatPackage]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedPlanKey(lockedAddSeatPlanKey ?? defaultPlanKey);
    setSeatCount(defaultSeatCount);
  }, [defaultPlanKey, defaultSeatCount, lockedAddSeatPlanKey, open]);

  const handleSelectPlan = (nextPlanKey: MockSubscriptionPlanKey): void => {
    if (lockedAddSeatPlanKey) {
      return;
    }

    const nextPlan = visibleSeatPackages.find(item => item.key === nextPlanKey);

    if (!nextPlan) {
      return;
    }

    setSelectedPlanKey(nextPlanKey);
  };

  const handleSubmit = (): void => {
    if (!purchasePreview) {
      return;
    }

    onSelectPlan({
      planKey: selectedPlanKey,
      purchaseMode,
      seatCount: purchasePreview.seatCount,
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
            <h3 className={styles.planTitle}>{selectedSeatPackage.title}</h3>
            <span className={styles.planAudience}>{purchaseModeAudience}</span>
          </div>
          <div className={styles.priceGrid}>
            {visibleSeatPackages.map(plan => {
              const spec = getPrimaryMockSubscriptionPlanSpec(plan);

              return (
                <div key={plan.key}>
                  <span>{plan.title}</span>
                  <strong>
                    ¥{spec.priceAmount} / 席 / {getMockSubscriptionPlanValidityLabel(plan)}
                  </strong>
                </div>
              );
            })}
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
              <span className={styles.fieldLabel}>席位包</span>
              {lockedSeatPackage ? (
                <div className={styles.lockedCycleBox}>
                  <strong>{lockedSeatPackage.title}</strong>
                  <span>新增席位不可切换其他席位包</span>
                </div>
              ) : (
                <div className={styles.cycleSwitch}>
                  {visibleSeatPackages.map(plan => (
                    <button
                      key={plan.key}
                      type="button"
                      className={classNames(
                        styles.cycleButton,
                        selectedPlanKey === plan.key && styles.cycleButtonActive,
                      )}
                      onClick={() => handleSelectPlan(plan.key)}
                    >
                      {plan.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                <span>有效时间</span>
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
                  <span>折算规则</span>
                  <strong>{purchasePreview.prorationLabel}</strong>
                </div>
              ) : null}
              <div className={styles.previewRow}>
                <span>计费单价</span>
                <strong>{purchasePreview.priceLabel}</strong>
              </div>
              {purchasePreview.discountAmount > 0 ? (
                <div className={styles.previewRow}>
                  <span>优惠金额</span>
                  <strong>-¥{purchasePreview.discountAmount.toLocaleString("zh-CN")}</strong>
                </div>
              ) : null}
              <div className={styles.totalRow}>
                <span>支付金额</span>
                <strong>¥{purchasePreview.amount.toLocaleString("zh-CN")}</strong>
              </div>
              <div className={styles.previewHint}>{purchaseRuleHint}</div>
            </div>
          ) : null}

          <Button
            type="primary"
            className={styles.proAction}
            disabled={!purchasePreview}
            onClick={handleSubmit}
          >
            {isRenewMode ? "去续约" : "去支付"}
          </Button>
        </section>
      </div>
    </Modal>
  );
};
