import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckCircleOutlined } from "@ant-design/icons";
import { Button, Empty, Modal } from "antd";

import { buildMockPaymentOrderId, buildMockPaymentQr } from "@/feature/commerce/mockPayment";
import { getActiveMockPointsPackages } from "@/feature/points/mockPointsCommerce";
import type { MockPointsPackageOption } from "@/feature/points/types";

import styles from "./TenantPointsRechargeModal.module.less";

type TenantPointsRechargeStep = "select" | "pay" | "success";

interface TenantPointsRechargeModalProps {
  onCancel: () => void;
  onConfirmPurchase: (selectedPackage: MockPointsPackageOption) => boolean;
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
  const qrImage = useMemo<string>(
    () =>
      buildMockPaymentQr(
        `${selectedPackage?.id ?? "none"}-${selectedPackage?.price ?? 0}-${orderId}`,
    ),
    [orderId, selectedPackage?.id, selectedPackage?.price],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextPackageOptions = getActiveMockPointsPackages();

    setPackageOptions(nextPackageOptions);
    setCurrentStep("select");
    setIsProcessingPayment(false);
    setOrderId("");
    setSelectedPackageId(
      nextPackageOptions.find(option => option.tagLabel === "推荐")?.id ??
        nextPackageOptions[0]?.id ??
        "",
    );
  }, [open]);

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
    setCurrentStep("pay");
  }, [selectedPackage]);

  const handlePayByQr = useCallback((): void => {
    if (isProcessingPayment || !selectedPackage) {
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
  }, [isProcessingPayment, onConfirmPurchase, selectedPackage]);

  return (
    <Modal
      centered
      destroyOnClose
      footer={null}
      onCancel={onCancel}
      open={open}
      title="购买积分"
      width={640}
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

        {currentStep === "pay" && selectedPackage ? (
          <>
            <div className={styles.payHeader}>
              <div className={styles.payTitle}>扫码支付 ¥{selectedPackage.price}</div>
            </div>

            <div className={styles.qrWrap}>
              <button
                type="button"
                className={`${styles.qrCard} ${styles.qrButton}`}
                disabled={isProcessingPayment}
                onClick={handlePayByQr}
              >
                <img className={styles.qrImage} src={qrImage} alt="积分购买支付二维码" />
              </button>
            </div>

            <div className={styles.payFooter}>
              <div className={styles.payHint}>
                {isProcessingPayment ? "支付处理中..." : "点击二维码模拟扫码支付"}
              </div>
              <div className={styles.payMethodList}>
                <span className={styles.payMethodItem}>微信</span>
                <span className={styles.payMethodItem}>支付宝</span>
                <span className={styles.payMethodItem}>抖音</span>
              </div>
            </div>
          </>
        ) : null}

        {currentStep === "success" && selectedPackage ? (
          <div className={styles.successState}>
            <CheckCircleOutlined className={styles.successIcon} />
            <div className={styles.successTitle}>支付成功</div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
