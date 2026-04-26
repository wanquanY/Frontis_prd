import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Empty, Modal, Popover } from "antd";

import {
  buildMockPaymentOrderId,
  buildMockPaymentQr,
  formatMockPaymentCountdown,
  MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
} from "@/feature/commerce/mockPayment";
import { getActiveMockPointsPackages } from "@/feature/points/mockPointsCommerce";
import type { MockPointsPackageOption } from "@/feature/points/types";

import styles from "./TenantPointsRechargeModal.module.less";

type TenantPointsRechargeStep = "select" | "pay" | "success";

interface TenantPointsRechargeModalProps {
  onCancel: () => void;
  onConfirmPurchase: (selectedPackage: MockPointsPackageOption) => boolean;
  open: boolean;
  pointsBalance: number;
  tenantName?: string;
}

const pointsRulePopoverContent = (
  <div className={styles.rulesPopover}>
    <p className={styles.rulesPopoverTitle}>积分说明</p>
    <p className={styles.rulesPopoverText}>积分用于模型、第三方接口和工具运行消耗。</p>
    <p className={styles.rulesPopoverText}>AI 专家、设备、席位等购买不走积分。</p>
    <p className={styles.rulesPopoverText}>支付成功后，积分将到账到当前租户。</p>
  </div>
);

/**
 * 租户积分购买弹窗，承接积分包选择、扫码支付与到账确认。
 */
export const TenantPointsRechargeModal = ({
  onCancel,
  onConfirmPurchase,
  open,
  pointsBalance,
  tenantName,
}: TenantPointsRechargeModalProps): JSX.Element => {
  const [currentStep, setCurrentStep] = useState<TenantPointsRechargeStep>("select");
  const [countdownSeconds, setCountdownSeconds] = useState<number>(
    MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
  );
  const [entryPointsBalance, setEntryPointsBalance] = useState<number>(pointsBalance);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [packageOptions, setPackageOptions] = useState<MockPointsPackageOption[]>(() =>
    getActiveMockPointsPackages(),
  );

  const selectedPackage = useMemo<MockPointsPackageOption | null>(
    () => packageOptions.find(option => option.id === selectedPackageId) ?? packageOptions[0] ?? null,
    [packageOptions, selectedPackageId],
  );
  const projectedPointsBalance = entryPointsBalance + (selectedPackage?.points ?? 0);
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

    const nextPackageOptions = getActiveMockPointsPackages();

    setPackageOptions(nextPackageOptions);
    setCurrentStep("select");
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setEntryPointsBalance(pointsBalance);
    setIsProcessingPayment(false);
    setOrderId("");
    setSelectedPackageId(
      nextPackageOptions.find(option => option.tagLabel === "推荐")?.id ?? nextPackageOptions[0]?.id ?? "",
    );
  }, [open, pointsBalance]);

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

    setOrderId(buildMockPaymentOrderId(`FI-${selectedPackage.id}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setCurrentStep("pay");
  }, [selectedPackage]);

  const handleReturnToSelection = useCallback((): void => {
    setCurrentStep("select");
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
  }, []);

  const handleRestartQr = useCallback((): void => {
    if (!selectedPackage) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`FI-${selectedPackage.id}`));
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

  const handleCloseModal = useCallback((): void => {
    onCancel();
  }, [onCancel]);

  return (
    <Modal
      centered={true}
      footer={null}
      onCancel={handleCloseModal}
      open={open}
      title="购买积分"
      width={640}
      destroyOnClose={true}
    >
      <div className={styles.body}>
        {currentStep === "select" ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>选择积分包</h2>
              {packageOptions.length ? (
                <div className={styles.packageList}>
                  {packageOptions.map(option => {
                    const isActive = option.id === selectedPackage?.id;
                    const unitPrice = option.price / (option.points / 1000);

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
                          <span className={styles.packageMeta}>
                            {option.points.toLocaleString("zh-CN")} 积分
                          </span>
                          <span className={styles.packageDescription}>{option.description}</span>
                        </span>
                        <span className={styles.packageValue}>
                          <span className={styles.packagePrice}>¥{option.price}</span>
                          <span className={styles.packageUnitPrice}>
                            约 ¥{unitPrice.toFixed(1)} / 1,000 积分
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Empty description="当前暂无可购买积分包，请在平台侧先配置上架。" />
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
                    <span className={styles.summaryLabel}>当前积分余额</span>
                    <span className={styles.summaryValue}>
                      {entryPointsBalance.toLocaleString("zh-CN")}
                    </span>
                  </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>到账积分</span>
                  <span className={styles.summaryValue}>
                    +{(selectedPackage?.points ?? 0).toLocaleString("zh-CN")}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付金额</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueStrong}`}>
                    ¥{selectedPackage?.price ?? 0}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>到账后余额</span>
                  <span className={styles.summaryValue}>
                    {projectedPointsBalance.toLocaleString("zh-CN")}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付方式</span>
                  <span className={styles.summaryValue}>统一扫码支付</span>
                </div>
              </div>
              <div className={styles.rulesHintRow}>
                <span className={styles.rulesHintText}>积分用于模型和第三方接口调用</span>
                <Popover content={pointsRulePopoverContent} placement="topRight" trigger="click">
                  <button
                    type="button"
                    className={styles.rulesHelpButton}
                    aria-label="查看积分说明"
                  >
                    ?
                  </button>
                </Popover>
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
              <button
                type="button"
                className={`${styles.qrCard} ${styles.qrButton}`}
                disabled={isQrExpired || isProcessingPayment}
                onClick={handlePayByQr}
              >
                <img className={styles.qrImage} src={qrImage} alt="积分购买支付二维码" />
              </button>
            </div>

            <div className={styles.summaryPanel}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>积分包</span>
                <span className={styles.summaryValue}>{selectedPackage.title}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>到账积分</span>
                <span className={styles.summaryValue}>
                  +{selectedPackage.points.toLocaleString("zh-CN")}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>订单号</span>
                <span className={styles.summaryValue}>{orderId}</span>
              </div>
              {tenantName ? (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>充值租户</span>
                  <span className={styles.summaryValue}>{tenantName}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.payFooter}>
              <div className={styles.payHint}>
                {isQrExpired
                  ? "二维码超时后需要重新生成，原订单不会自动扣款。"
                  : isProcessingPayment
                  ? "支付处理中，积分将在当前租户中自动到账。"
                  : "点击二维码即可模拟扫码支付，支付成功后积分自动到账。"}
              </div>
              <div className={styles.payMethodList}>
                <span className={`${styles.payMethodItem} ${styles.payMethodWechat}`}>微信</span>
                <span className={`${styles.payMethodItem} ${styles.payMethodAlipay}`}>支付宝</span>
                <span className={`${styles.payMethodItem} ${styles.payMethodDouyin}`}>抖音</span>
              </div>
              <div className={styles.payMethods}>
                统一扫码支付 · 支付成功后积分实时到账
              </div>
            </div>

            <div className={styles.payActions}>
              <Button onClick={handleReturnToSelection}>返回修改</Button>
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
              <div className={styles.payTitle}>支付成功</div>
              <div className={styles.payMethods}>积分已到账，可继续使用当前租户能力。</div>
            </div>

            <section className={styles.section}>
              <div className={styles.summaryPanel}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>购买积分包</span>
                  <span className={styles.summaryValue}>{selectedPackage.title}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>支付金额</span>
                  <span className={styles.summaryValue}>¥{selectedPackage.price}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>到账积分</span>
                  <span className={styles.summaryValue}>
                    +{selectedPackage.points.toLocaleString("zh-CN")}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>最新积分余额</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueStrong}`}>
                    {projectedPointsBalance.toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
            </section>

            <div className={styles.payActions}>
              <Button type="primary" onClick={handleCloseModal}>
                完成
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};
