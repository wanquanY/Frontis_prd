import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckCircleOutlined } from "@ant-design/icons";
import { Button, Empty, Modal } from "antd";

import {
  buildMockPaymentOrderId,
  buildMockPaymentQr,
  formatMockPaymentCountdown,
  MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
} from "@/feature/commerce/mockPayment";
import {
  buildMockPointsPackagePurchaseSnapshot,
  getActiveMockPointsPackages,
} from "@/feature/points/mockPointsCommerce";
import type {
  MockPointsPackageOption,
  MockPointsPackagePurchaseSnapshot,
} from "@/feature/points/types";

import styles from "./TenantPointsRechargeModal.module.less";

type TenantPointsRechargeStep = "select" | "pay" | "success";
type PaymentMethod = "alipay" | "wechat";

const PAYMENT_METHOD_OPTIONS: Array<{ key: PaymentMethod; label: string }> = [
  { key: "alipay", label: "支付宝" },
  { key: "wechat", label: "微信支付" },
];

interface TenantPointsRechargeModalProps {
  onCancel: () => void;
  onConfirmPurchase: (purchaseSnapshot: MockPointsPackagePurchaseSnapshot) => boolean;
  open: boolean;
}

/**
 * 租户积分购买弹窗，承接积分包选择、扫码支付与到账确认。
 */
export const TenantPointsRechargeModal = ({
  onCancel,
  onConfirmPurchase,
  open,
}: TenantPointsRechargeModalProps): JSX.Element => {
  const [currentStep, setCurrentStep] = useState<TenantPointsRechargeStep>("select");
  const [countdownSeconds, setCountdownSeconds] = useState<number>(
    MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("alipay");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [packageOptions, setPackageOptions] = useState<MockPointsPackageOption[]>(() =>
    getActiveMockPointsPackages(),
  );

  const selectedPackage = useMemo<MockPointsPackageOption | null>(
    () =>
      packageOptions.find(option => option.id === selectedPackageId) ?? packageOptions[0] ?? null,
    [packageOptions, selectedPackageId],
  );
  const selectedPurchaseSnapshot = useMemo<MockPointsPackagePurchaseSnapshot | null>(
    () => (selectedPackage ? buildMockPointsPackagePurchaseSnapshot(selectedPackage) : null),
    [selectedPackage],
  );
  const qrImage = useMemo<string>(
    () =>
      buildMockPaymentQr(
        `${selectedPurchaseSnapshot?.packageId ?? "none"}-${
          selectedPurchaseSnapshot?.payableAmount ?? 0
        }-${paymentMethod}-${orderId}`,
      ),
    [
      orderId,
      paymentMethod,
      selectedPurchaseSnapshot?.packageId,
      selectedPurchaseSnapshot?.payableAmount,
    ],
  );
  const paymentMethodLabel =
    PAYMENT_METHOD_OPTIONS.find(item => item.key === paymentMethod)?.label ?? "支付宝";
  const isQrExpired = countdownSeconds <= 0;
  const qrCountdownLabel = isQrExpired
    ? "二维码已失效"
    : `${formatMockPaymentCountdown(countdownSeconds)} 后二维码失效`;

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextPackageOptions = getActiveMockPointsPackages();

    setPackageOptions(nextPackageOptions);
    setCurrentStep("select");
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
    setOrderId("");
    setPaymentMethod("alipay");
    setSelectedPackageId(
      nextPackageOptions.find(option => option.tagLabel === "推荐")?.id ??
        nextPackageOptions[0]?.id ??
        "",
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

  useEffect(() => {
    if (!open || currentStep !== "success") {
      return;
    }

    const closeTimer = window.setTimeout(() => {
      onCancel();
    }, 900);

    return () => window.clearTimeout(closeTimer);
  }, [currentStep, onCancel, open]);

  const handleStartPayment = useCallback((): void => {
    if (!selectedPackage) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`FI-${selectedPackage.id}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
    setCurrentStep("pay");
  }, [selectedPackage]);

  const handleRestartQr = useCallback((): void => {
    if (!selectedPackage) {
      return;
    }

    setOrderId(buildMockPaymentOrderId(`FI-${selectedPackage.id}`));
    setCountdownSeconds(MOCK_PAYMENT_QR_COUNTDOWN_SECONDS);
    setIsProcessingPayment(false);
  }, [selectedPackage]);

  const handlePayByQr = useCallback((): void => {
    if (isProcessingPayment || !selectedPurchaseSnapshot || isQrExpired) {
      return;
    }

    setIsProcessingPayment(true);

    window.setTimeout(() => {
      const purchaseSucceeded = onConfirmPurchase({
        ...selectedPurchaseSnapshot,
        paymentChannelLabel: `${paymentMethodLabel}支付`,
      });

      if (!purchaseSucceeded) {
        setIsProcessingPayment(false);
        return;
      }

      setCurrentStep("success");
      setIsProcessingPayment(false);
    }, 700);
  }, [
    isProcessingPayment,
    isQrExpired,
    onConfirmPurchase,
    paymentMethodLabel,
    selectedPurchaseSnapshot,
  ]);

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
      open={open}
      title="购买积分"
      width={760}
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
                    const purchaseSnapshot = buildMockPointsPackagePurchaseSnapshot(option);

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
                            {purchaseSnapshot.basePoints.toLocaleString("zh-CN")} 积分
                            {purchaseSnapshot.giftPoints > 0
                              ? ` + 赠送 ${purchaseSnapshot.giftPoints.toLocaleString("zh-CN")}`
                              : ""}
                          </span>
                          <span className={styles.packageDescription}>{option.description}</span>
                        </span>
                        <span className={styles.packageValue}>
                          <span className={styles.packagePrice}>
                            ¥{purchaseSnapshot.payableAmount}
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

            <div className={styles.stepActions}>
              <Button type="primary" onClick={handleStartPayment} disabled={!selectedPackage}>
                去支付
              </Button>
            </div>
          </>
        ) : null}

        {currentStep === "pay" && selectedPurchaseSnapshot ? (
          <>
            <div className={styles.paymentContent}>
              <div className={styles.qrColumn}>
                <button
                  type="button"
                  className={`${styles.qrCard} ${styles.qrButton}`}
                  disabled={isProcessingPayment || isQrExpired}
                  onClick={handlePayByQr}
                >
                  <img className={styles.qrImage} src={qrImage} alt="积分购买支付二维码" />
                </button>
                <div className={styles.qrCountdown}>{qrCountdownLabel}</div>
              </div>

              <div className={styles.paymentInstruction}>
                <h2 className={styles.paymentTitle}>
                  {paymentMethodLabel} ¥{selectedPurchaseSnapshot.payableAmount}
                </h2>
                <div className={styles.paymentMethodGroup}>
                  {PAYMENT_METHOD_OPTIONS.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      className={`${styles.paymentMethodButton} ${
                        item.key === paymentMethod ? styles.paymentMethodButtonActive : ""
                      }`}
                      onClick={() => {
                        setPaymentMethod(item.key);
                        handleRestartQr();
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <ul className={styles.paymentNoticeList}>
                  <li>
                    购买{selectedPurchaseSnapshot.packageTitle}后，
                    {selectedPurchaseSnapshot.totalPoints.toLocaleString("zh-CN")}{" "}
                    积分将在支付成功后到账。
                  </li>
                  <li>
                    售卖积分 {selectedPurchaseSnapshot.basePoints.toLocaleString("zh-CN")}
                    {selectedPurchaseSnapshot.giftPoints > 0
                      ? `，赠送 ${selectedPurchaseSnapshot.giftPoints.toLocaleString("zh-CN")}`
                      : ""}
                    。
                  </li>
                  <li>积分用于平台内大模型调用消耗。</li>
                  <li>积分属于虚拟商品，一经支付无法退款，请确认后购买。</li>
                  <li>未成年用户请在监护人陪同下理性充值。</li>
                </ul>
                <div className={styles.payHint}>
                  {isProcessingPayment
                    ? "支付处理中..."
                    : isQrExpired
                      ? "二维码已失效，请重新生成后支付。"
                      : `请使用${paymentMethodLabel}扫码完成支付。`}
                </div>
                {isQrExpired ? (
                  <Button type="primary" onClick={handleRestartQr}>
                    重新生成二维码
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {currentStep === "success" && selectedPurchaseSnapshot ? (
          <div className={styles.successState}>
            <CheckCircleOutlined className={styles.successIcon} />
            <div className={styles.successTitle}>支付成功</div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
