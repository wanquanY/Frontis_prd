import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Empty, Modal } from "antd";

import {
  buildMockPaymentOrderId,
  buildMockPaymentQr,
  formatMockPaymentCountdown,
  MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
} from "@/feature/commerce/mockPayment";
import { getActiveMockTenantPlanPackages } from "@/feature/tenantPlan/mockTenantPlanCommerce";
import type { MockTenantPlanPackageOption } from "@/feature/tenantPlan/types";

import styles from "./TenantPointsRechargeModal.module.less";

type TenantTeamPlanPurchaseStep = "select" | "pay" | "success";

interface TenantTeamPlanPurchaseModalProps {
  currentPlanLabel: string;
  onCancel: () => void;
  onConfirmPurchase: (selectedPackage: MockTenantPlanPackageOption) => boolean;
  open: boolean;
  tenantName?: string;
}

/**
 * 团队版购买弹窗。
 */
export const TenantTeamPlanPurchaseModal = ({
  currentPlanLabel,
  onCancel,
  onConfirmPurchase,
  open,
  tenantName,
}: TenantTeamPlanPurchaseModalProps): JSX.Element => {
  const [currentStep, setCurrentStep] = useState<TenantTeamPlanPurchaseStep>("select");
  const [countdownSeconds, setCountdownSeconds] = useState<number>(
    MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [packageOptions, setPackageOptions] = useState<MockTenantPlanPackageOption[]>(() =>
    getActiveMockTenantPlanPackages(),
  );

  const selectedPackage = useMemo<MockTenantPlanPackageOption | null>(
    () => packageOptions.find(option => option.id === selectedPackageId) ?? packageOptions[0] ?? null,
    [packageOptions, selectedPackageId],
  );
  const qrImage = useMemo<string>(
    () =>
      buildMockPaymentQr(
        `${selectedPackage?.id ?? "none"}-${selectedPackage?.price ?? 0}-${orderId}`,
      ),
    [orderId, selectedPackage?.id, selectedPackage?.price],
  );
  const isQrExpired = countdownSeconds <= 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextPackageOptions = getActiveMockTenantPlanPackages();

    setPackageOptions(nextPackageOptions);
    setCurrentStep("select");
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
    setOrderId("");
    setSelectedPackageId(
      nextPackageOptions.find(option => option.tagLabel === "推荐")?.id ?? nextPackageOptions[0]?.id ?? "",
    );
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
    if (!selectedPackage) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`TM-${selectedPackage.id}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setCurrentStep("pay");
  }, [selectedPackage]);

  const handleRestartQr = useCallback((): void => {
    if (!selectedPackage) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`TM-${selectedPackage.id}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
  }, [selectedPackage]);

  const handlePayByQr = useCallback((): void => {
    if (isQrExpired || isProcessingPayment || !selectedPackage) {
      return;
    }

    setIsProcessingPayment(true);

    window.setTimeout(() => {
      const purchaseSucceeded = onConfirmPurchase(selectedPackage);

      if (!purchaseSucceeded) {
        setIsProcessingPayment(false);
        return;
      }

      setCurrentStep("success");
      setIsProcessingPayment(false);
    }, 700);
  }, [isProcessingPayment, isQrExpired, onConfirmPurchase, selectedPackage]);

  return (
    <Modal
      centered={true}
      destroyOnClose={true}
      footer={null}
      onCancel={onCancel}
      open={open}
      title="开通团队版"
      width={640}
    >
      <div className={styles.body}>
        {currentStep === "select" ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>选择团队套餐</h2>
              {packageOptions.length ? (
                <div className={styles.packageList}>
                  {packageOptions.map(option => {
                    const isActive = option.id === selectedPackage?.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`${styles.packageOption} ${
                          isActive ? styles.packageOptionActive : ""
                        }`}
                        onClick={() => setSelectedPackageId(option.id)}
                      >
                        <span className={styles.packageMain}>
                          <span className={styles.packageTitleRow}>
                            <span className={styles.packageTitle}>{option.title}</span>
                            {option.tagLabel ? (
                              <span className={styles.packageTag}>{option.tagLabel}</span>
                            ) : null}
                          </span>
                          <span className={styles.packageMeta}>{option.includedSeats} 个席位</span>
                          <span className={styles.packageDescription}>{option.description}</span>
                        </span>
                        <span className={styles.packageValue}>
                          <span className={styles.packagePrice}>¥{option.price}</span>
                          <span className={styles.packageUnitPrice}>{option.billingCycleLabel}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Empty description="当前暂无可购买团队套餐，请先在平台侧配置。" />
                </div>
              )}
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
                  <span className={styles.summaryLabel}>当前版本</span>
                  <span className={styles.summaryValue}>{currentPlanLabel}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>开通套餐</span>
                  <span className={styles.summaryValue}>{selectedPackage?.title ?? "未选择"}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>包含席位</span>
                  <span className={styles.summaryValue}>
                    {selectedPackage?.includedSeats ?? 0} 个
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>订阅周期</span>
                  <span className={styles.summaryValue}>
                    {selectedPackage?.billingCycleLabel ?? "按年订阅"}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付金额</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueStrong}`}>
                    ¥{selectedPackage?.price ?? 0}
                  </span>
                </div>
              </div>
            </section>

            <div className={styles.stepActions}>
              <Button type="primary" onClick={handleStartPayment} disabled={!selectedPackage}>
                去支付
              </Button>
            </div>
          </>
        ) : null}

        {currentStep === "pay" && selectedPackage ? (
          <>
            <div className={styles.payHeader}>
              <div className={styles.payTitle}>扫码支付 ¥{selectedPackage.price}</div>
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
                  <img className={styles.qrImage} src={qrImage} alt="团队版支付二维码" />
                </button>
              </div>
            </div>

            <div className={styles.payFooter}>
              <div className={styles.payHint}>
                {isProcessingPayment
                  ? "支付处理中，团队版将在当前租户中自动开通"
                  : "点击二维码即可模拟扫码支付，支付成功后团队版自动开通"}
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

        {currentStep === "success" && selectedPackage ? (
          <>
            <div className={styles.payHeader}>
              <div className={styles.payTitle}>开通成功</div>
              <div className={styles.payMethods}>团队版已生效，当前租户已解锁组织管理。</div>
            </div>

            <section className={styles.section}>
              <div className={styles.summaryPanel}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>团队套餐</span>
                  <span className={styles.summaryValue}>{selectedPackage.title}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付金额</span>
                  <span className={styles.summaryValue}>¥{selectedPackage.price}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>可用席位</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueStrong}`}>
                    {selectedPackage.includedSeats} 个
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
