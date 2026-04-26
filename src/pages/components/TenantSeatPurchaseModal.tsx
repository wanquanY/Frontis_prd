import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, InputNumber, Modal } from "antd";

import {
  buildMockPaymentOrderId,
  buildMockPaymentQr,
  formatMockPaymentCountdown,
  MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
} from "@/feature/commerce/mockPayment";
import type { MockTenantSeatPricing } from "@/feature/tenantPlan/types";

import styles from "./TenantPointsRechargeModal.module.less";

type TenantSeatPurchaseStep = "select" | "pay" | "success";

interface TenantSeatPurchaseModalProps {
  currentSeats: number;
  onCancel: () => void;
  onConfirmPurchase: (seatCount: number) => boolean;
  open: boolean;
  seatPricing: MockTenantSeatPricing;
  tenantName?: string;
  usedSeats: number;
}

/**
 * 团队版席位扩容弹窗。
 */
export const TenantSeatPurchaseModal = ({
  currentSeats,
  onCancel,
  onConfirmPurchase,
  open,
  seatPricing,
  tenantName,
  usedSeats,
}: TenantSeatPurchaseModalProps): JSX.Element => {
  const [currentStep, setCurrentStep] = useState<TenantSeatPurchaseStep>("select");
  const [countdownSeconds, setCountdownSeconds] = useState<number>(
    MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");
  const [seatCount, setSeatCount] = useState<number>(1);

  const nextTotalSeats = currentSeats + seatCount;
  const paymentAmount = seatCount * seatPricing.pricePerSeat;
  const qrImage = useMemo<string>(
    () => buildMockPaymentQr(`${seatCount}-${paymentAmount}-${orderId}`),
    [orderId, paymentAmount, seatCount],
  );
  const isQrExpired = countdownSeconds <= 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentStep("select");
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
    setOrderId("");
    setSeatCount(1);
  }, [open]);

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

  const handleStartPayment = useCallback((): void => {
    if (seatCount <= 0) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`SEAT-${seatCount}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setCurrentStep("pay");
  }, [seatCount]);

  const handleRestartQr = useCallback((): void => {
    setOrderId(buildMockPaymentOrderId(`SEAT-${seatCount}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
  }, [seatCount]);

  const handlePayByQr = useCallback((): void => {
    if (seatCount <= 0 || isQrExpired || isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);

    window.setTimeout(() => {
      const purchaseSucceeded = onConfirmPurchase(seatCount);

      if (!purchaseSucceeded) {
        setIsProcessingPayment(false);
        return;
      }

      setCurrentStep("success");
      setIsProcessingPayment(false);
    }, 700);
  }, [isProcessingPayment, isQrExpired, onConfirmPurchase, seatCount]);

  return (
    <Modal
      centered={true}
      destroyOnClose={true}
      footer={null}
      onCancel={onCancel}
      open={open}
      title="扩容席位"
      width={640}
    >
      <div className={styles.body}>
        {currentStep === "select" ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>选择扩容席位数</h2>
              <div className={styles.summaryPanel}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>新增席位数</span>
                  <InputNumber
                    min={1}
                    max={50}
                    value={seatCount}
                    onChange={value => setSeatCount(Math.max(1, Number(value ?? 1)))}
                  />
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>订单信息</h2>
              <div className={styles.summaryPanel}>
                {tenantName ? (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>当前租户</span>
                    <span className={styles.summaryValue}>{tenantName}</span>
                  </div>
                ) : null}
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>当前总席位</span>
                  <span className={styles.summaryValue}>{currentSeats} 个</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>当前已用</span>
                  <span className={styles.summaryValue}>{usedSeats} 个</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>新增席位</span>
                  <span className={styles.summaryValue}>+{seatCount} 个</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>扩容后总席位</span>
                  <span className={styles.summaryValue}>{nextTotalSeats} 个</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>单席位价格</span>
                  <span className={styles.summaryValue}>¥{seatPricing.pricePerSeat}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>计费周期</span>
                  <span className={styles.summaryValue}>{seatPricing.billingCycleLabel}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付金额</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueStrong}`}>
                    ¥{paymentAmount}
                  </span>
                </div>
              </div>
            </section>

            <div className={styles.stepActions}>
              <Button type="primary" onClick={handleStartPayment}>
                去支付
              </Button>
            </div>
          </>
        ) : null}

        {currentStep === "pay" ? (
          <>
            <div className={styles.payHeader}>
              <div className={styles.payTitle}>扫码支付 ¥{paymentAmount}</div>
              <div className={styles.payCountdown}>
                {isQrExpired ? "二维码已过期" : formatMockPaymentCountdown(countdownSeconds)}
              </div>
            </div>

            <div className={styles.qrWrap}>
              <div className={styles.qrCard}>
                <button
                  type="button"
                  className={styles.qrButton}
                  onClick={handlePayByQr}
                  disabled={isQrExpired || isProcessingPayment}
                >
                  <img className={styles.qrImage} src={qrImage} alt="席位扩容支付二维码" />
                </button>
              </div>
            </div>

            <div className={styles.payFooter}>
              <div className={styles.payHint}>
                {isProcessingPayment
                  ? "支付处理中，席位将在当前租户中自动扩容"
                  : "点击二维码即可模拟扫码支付，支付成功后席位自动扩容"}
              </div>
              <div className={styles.payMethodList}>
                <span className={`${styles.payMethodItem} ${styles.payMethodWechat}`}>微信</span>
                <span className={`${styles.payMethodItem} ${styles.payMethodAlipay}`}>支付宝</span>
                <span className={`${styles.payMethodItem} ${styles.payMethodDouyin}`}>抖音支付</span>
              </div>
              <div className={styles.payMethods}>
                订单号 {orderId} · 当前租户 {tenantName ?? "--"}
              </div>
            </div>

            <div className={styles.payActions}>
              <Button onClick={() => setCurrentStep("select")}>返回修改</Button>
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
            <div className={styles.payHeader}>
              <div className={styles.payTitle}>扩容成功</div>
              <div className={styles.payMethods}>席位已生效，可继续邀请成员加入当前租户。</div>
            </div>

            <section className={styles.section}>
              <div className={styles.summaryPanel}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>新增席位</span>
                  <span className={styles.summaryValue}>+{seatCount} 个</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付金额</span>
                  <span className={styles.summaryValue}>¥{paymentAmount}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>最新总席位</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueStrong}`}>
                    {nextTotalSeats} 个
                  </span>
                </div>
              </div>
            </section>

            <div className={styles.payActions}>
              <Button type="primary" onClick={onCancel}>
                完成
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};
