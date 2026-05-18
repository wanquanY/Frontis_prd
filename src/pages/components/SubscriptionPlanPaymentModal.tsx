import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Modal } from "antd";

import {
  buildMockPaymentOrderId,
  buildMockPaymentQr,
  formatMockPaymentCountdown,
  MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
} from "@/feature/commerce/mockPayment";

import type { SubscriptionPlanPurchaseOption } from "./SubscriptionPlanModal";
import styles from "./SubscriptionPlanPaymentModal.module.less";

type SubscriptionPaymentStep = "pay" | "success";

interface SubscriptionPlanPaymentModalProps {
  currentPlanLabel: string;
  open: boolean;
  plan: SubscriptionPlanPurchaseOption | null;
  tenantName?: string;
  onCancel: () => void;
  onConfirmPayment: (plan: SubscriptionPlanPurchaseOption) => boolean;
}

/**
 * 用户侧团队扩充支付弹窗，购买席位后直接进入支付确认。
 */
export const SubscriptionPlanPaymentModal = ({
  currentPlanLabel,
  open,
  plan,
  tenantName,
  onCancel,
  onConfirmPayment,
}: SubscriptionPlanPaymentModalProps): JSX.Element => {
  const [currentStep, setCurrentStep] = useState<SubscriptionPaymentStep>("pay");
  const [countdownSeconds, setCountdownSeconds] = useState<number>(
    MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");

  const qrImage = useMemo<string>(
    () => buildMockPaymentQr(`${plan?.planKey ?? "none"}-${plan?.amount ?? 0}-${orderId}`),
    [orderId, plan?.amount, plan?.planKey],
  );
  const isQrExpired = countdownSeconds <= 0;
  const isRenewMode = plan?.purchaseMode === "renew";

  useEffect(() => {
    if (!open || !plan) {
      return;
    }

    setCurrentStep("pay");
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
    setOrderId(buildMockPaymentOrderId(`SUB-${plan.planKey}`));
  }, [open, plan]);

  useEffect(() => {
    if (!open || currentStep !== "pay") {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdownSeconds(currentSeconds => {
        if (currentSeconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentStep, open]);

  const handleRestartQr = useCallback((): void => {
    if (!plan) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`SUB-${plan.planKey}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
  }, [plan]);

  const handlePayByQr = useCallback((): void => {
    if (!plan || isQrExpired || isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);

    window.setTimeout(() => {
      const purchaseSucceeded = onConfirmPayment(plan);

      if (!purchaseSucceeded) {
        setIsProcessingPayment(false);
        return;
      }

      setCurrentStep("success");
      setIsProcessingPayment(false);
    }, 700);
  }, [isProcessingPayment, isQrExpired, onConfirmPayment, plan]);

  return (
    <Modal
      centered
      destroyOnClose
      footer={null}
      onCancel={onCancel}
      open={open}
      title={plan ? (isRenewMode ? "续约团队席位" : "购买团队席位") : "团队扩充支付"}
      width={620}
    >
      {plan ? (
        <div className={styles.body}>
          {currentStep === "pay" ? (
            <>
              <section className={styles.summaryPanel}>
                {tenantName ? (
                  <div className={styles.summaryRow}>
                    <span>当前租户</span>
                    <strong>{tenantName}</strong>
                  </div>
                ) : null}
                <div className={styles.summaryRow}>
                  <span>当前版本</span>
                  <strong>{currentPlanLabel}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>{isRenewMode ? "续约内容" : "购买内容"}</span>
                  <strong>{plan.planLabel}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>付费方式</span>
                  <strong>{plan.billingCycle === "monthly" ? "按月支付" : "按年支付"}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>席位单价</span>
                  <strong>{plan.priceLabel}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>{isRenewMode ? "续约席位" : "新增席位"}</span>
                  <strong>{plan.seatLabel}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>赠送积分</span>
                  <strong>{plan.giftPoints.toLocaleString("zh-CN")}，永久有效</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>有效周期</span>
                  <strong>{plan.billingCycleLabel}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>统一到期日</span>
                  <strong>{plan.expiresAt}</strong>
                </div>
                {plan.prorationLabel ? (
                  <div className={styles.summaryRow}>
                    <span>计费周期</span>
                    <strong>{plan.prorationLabel}</strong>
                  </div>
                ) : null}
                {plan.contractCode ? (
                  <div className={styles.summaryRow}>
                    <span>签约码</span>
                    <strong>{plan.contractCodeStatusLabel ?? plan.contractCode}</strong>
                  </div>
                ) : null}
                {plan.ownerName ? (
                  <div className={styles.summaryRow}>
                    <span>签约负责人</span>
                    <strong>{plan.ownerName}</strong>
                  </div>
                ) : null}
                {plan.discountAmount > 0 ? (
                  <div className={styles.summaryRow}>
                    <span>企业折扣</span>
                    <strong>-¥{plan.discountAmount.toLocaleString("zh-CN")}</strong>
                  </div>
                ) : null}
                <div className={styles.summaryRow}>
                  <span>支付金额</span>
                  <strong className={styles.amount}>¥{plan.amount.toLocaleString("zh-CN")}</strong>
                </div>
                {plan.ruleMessage ? (
                  <div className={styles.summaryHint}>{plan.ruleMessage}</div>
                ) : null}
              </section>

              <section className={styles.paymentPanel}>
                <div className={styles.paymentHeader}>
                  <div>
                    <h3>扫码支付</h3>
                    <span>订单号 {orderId}</span>
                  </div>
                  <strong>
                    {isQrExpired ? "二维码已过期" : formatMockPaymentCountdown(countdownSeconds)}
                  </strong>
                </div>
                <button
                  type="button"
                  className={styles.qrButton}
                  disabled={isQrExpired || isProcessingPayment}
                  onClick={handlePayByQr}
                >
                  <img
                    className={styles.qrImage}
                    src={qrImage}
                    alt={`${plan.planLabel}支付二维码`}
                  />
                </button>
                <div className={styles.paymentHint}>
                  {isProcessingPayment
                    ? `支付处理中，团队席位将在支付成功后${isRenewMode ? "续约" : "生效"}。`
                    : "点击二维码即可模拟扫码支付。"}
                </div>
                <div className={styles.paymentMethods}>
                  <span>微信</span>
                  <span>支付宝</span>
                  <span>抖音支付</span>
                </div>
              </section>

              <div className={styles.actions}>
                {isQrExpired ? (
                  <Button type="primary" onClick={handleRestartQr}>
                    重新生成二维码
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}

          {currentStep === "success" ? (
            <>
              <section className={styles.successPanel}>
                <h3>支付成功</h3>
                <p>
                  {plan.planLabel} 已生效，席位统一到期日为 {plan.expiresAt}。
                </p>
                <div className={styles.successAmount}>¥{plan.amount.toLocaleString("zh-CN")}</div>
              </section>
              <div className={styles.actions}>
                <Button type="primary" onClick={onCancel}>
                  完成
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};
