import { useEffect, useMemo, useState } from "react";

import { Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import type {
  OperationsTenant,
  OperationsTenantPointsRechargePayload,
  OperationsTenantSeatAllocationPayload,
} from "@/feature/operations/types";
import type { MockPointsPackageOption } from "@/feature/points/types";
import type { MockSubscriptionPlanTemplate } from "@/feature/subscription/types";

import styles from "./OperationsPlatformView.module.less";

interface OperationsTenantPointsRechargeModalProps {
  open: boolean;
  tenant: OperationsTenant | null;
  pointsPackages: MockPointsPackageOption[];
  onCancel: () => void;
  onSubmit: (tenantId: string, payload: OperationsTenantPointsRechargePayload) => boolean;
}

interface OperationsTenantSeatAllocationModalProps {
  open: boolean;
  tenant: OperationsTenant | null;
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  onCancel: () => void;
  onSubmit: (tenantId: string, payload: OperationsTenantSeatAllocationPayload) => boolean;
}

interface PointsRechargeFormState {
  packageId: string;
  remark: string;
}

interface SeatAllocationFormState {
  planKey: string;
  specKey: string;
  seatCount: number;
  expiresAt: string;
  remark: string;
}

const createPointsRechargeForm = (
  packages: MockPointsPackageOption[],
): PointsRechargeFormState => ({
  packageId: packages[0]?.id ?? "",
  remark: "",
});

const createSeatAllocationForm = (
  plans: MockSubscriptionPlanTemplate[],
): SeatAllocationFormState => {
  const firstPlan = plans.find(item => item.status === "active") ?? plans[0];
  const firstSpec = firstPlan?.specs.find(item => item.enabled) ?? firstPlan?.specs[0];

  return {
    planKey: firstPlan?.key ?? "",
    specKey: firstSpec?.key ?? "",
    seatCount: firstPlan?.seatCount ?? 1,
    expiresAt: "长期有效",
    remark: "",
  };
};

/**
 * 租户详情中的运营积分充值弹窗。
 */
export const OperationsTenantPointsRechargeModal = ({
  open,
  tenant,
  pointsPackages,
  onCancel,
  onSubmit,
}: OperationsTenantPointsRechargeModalProps): JSX.Element => {
  const internalPackages = useMemo(
    () => pointsPackages.filter(item => item.status === "active" && item.scope === "internal"),
    [pointsPackages],
  );
  const [form, setForm] = useState<PointsRechargeFormState>(() =>
    createPointsRechargeForm(internalPackages),
  );
  const selectedPackage =
    internalPackages.find(item => item.id === form.packageId) ?? internalPackages[0];

  useEffect(() => {
    if (open) {
      setForm(createPointsRechargeForm(internalPackages));
    }
  }, [internalPackages, open, tenant?.id]);

  const handleSubmit = (): void => {
    if (!tenant) {
      message.warning("请先选择租户。");
      return;
    }

    if (!selectedPackage) {
      message.warning("请先在商品中心创建并启用内部积分包。");
      return;
    }

    const success = onSubmit(tenant.id, {
      packageId: selectedPackage.id,
      packageTitle: selectedPackage.title,
      points: selectedPackage.points,
      giftPoints: selectedPackage.giftPoints ?? 0,
      remark: form.remark,
    });

    if (success) {
      message.success("积分已充值。");
      onCancel();
    }
  };

  return (
    <Modal
      open={open}
      title={tenant ? `运营充值积分 · ${tenant.name}` : "运营充值积分"}
      className={classNames(styles.fixedModal, styles.standardModal)}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnHidden
    >
      <div className={styles.formGrid}>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>内部积分包</span>
          <Select
            className={styles.fullWidthInput}
            value={form.packageId || undefined}
            placeholder="请选择内部积分包"
            options={internalPackages.map(item => ({
              value: item.id,
              label: `${item.title} · ${(item.points + (item.giftPoints ?? 0)).toLocaleString("zh-CN")} 积分`,
            }))}
            onChange={packageId =>
              setForm(current => ({
                ...current,
                packageId,
              }))
            }
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>到账积分</span>
          <Input
            disabled
            value={
              selectedPackage
                ? `${(selectedPackage.points + (selectedPackage.giftPoints ?? 0)).toLocaleString("zh-CN")} 积分`
                : "-"
            }
          />
        </div>
        <div className={classNames(styles.modalField, styles.fullSpanField)}>
          <span className={styles.modalLabel}>备注（可选）</span>
          <Input.TextArea
            rows={3}
            value={form.remark}
            onChange={event =>
              setForm(current => ({
                ...current,
                remark: event.target.value,
              }))
            }
          />
        </div>
      </div>
    </Modal>
  );
};

/**
 * 租户详情中的运营席位包分配弹窗。
 */
export const OperationsTenantSeatAllocationModal = ({
  open,
  tenant,
  subscriptionPlans,
  onCancel,
  onSubmit,
}: OperationsTenantSeatAllocationModalProps): JSX.Element => {
  const activePlans = useMemo(
    () => subscriptionPlans.filter(item => item.status === "active" && item.scope === "internal"),
    [subscriptionPlans],
  );
  const [form, setForm] = useState<SeatAllocationFormState>(() =>
    createSeatAllocationForm(activePlans),
  );
  const selectedPlan = activePlans.find(item => item.key === form.planKey) ?? activePlans[0];
  const activeSpecs = selectedPlan?.specs.filter(item => item.enabled) ?? [];
  const selectedSpec = activeSpecs.find(item => item.key === form.specKey) ?? activeSpecs[0];

  useEffect(() => {
    if (open) {
      setForm(createSeatAllocationForm(activePlans));
    }
  }, [activePlans, open, tenant?.id]);

  const handleChangePlan = (planKey: string): void => {
    const nextPlan = activePlans.find(item => item.key === planKey);
    const nextSpec = nextPlan?.specs.find(item => item.enabled) ?? nextPlan?.specs[0];

    setForm(current => ({
      ...current,
      planKey,
      specKey: nextSpec?.key ?? "",
      seatCount: nextPlan?.seatCount ?? current.seatCount,
    }));
  };

  const handleSubmit = (): void => {
    if (!tenant || !selectedPlan || !selectedSpec) {
      message.warning("请先在商品中心创建并启用内部席位包。");
      return;
    }

    if (form.seatCount < 1) {
      message.warning("分配席位必须大于 0。");
      return;
    }

    if (!form.expiresAt.trim()) {
      message.warning("请填写席位到期时间。");
      return;
    }

    const success = onSubmit(tenant.id, {
      planKey: selectedPlan.key,
      planTitle: selectedPlan.title,
      specKey: selectedSpec.key,
      specTitle: selectedSpec.title,
      seatCount: form.seatCount,
      expiresAt: form.expiresAt.trim(),
      giftPoints: selectedSpec.giftPoints,
      remark: form.remark,
    });

    if (success) {
      message.success("席位已分配。");
      onCancel();
    }
  };

  return (
    <Modal
      open={open}
      title={tenant ? `分配席位 · ${tenant.name}` : "分配席位"}
      className={classNames(styles.fixedModal, styles.standardModal)}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnHidden
    >
      <div className={styles.formGrid}>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>席位包</span>
          <Select
            className={styles.fullWidthInput}
            value={form.planKey}
            options={activePlans.map(item => ({
              value: item.key,
              label: item.title,
            }))}
            onChange={handleChangePlan}
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>规格</span>
          <Select
            className={styles.fullWidthInput}
            value={form.specKey}
            options={activeSpecs.map(item => ({
              value: item.key,
              label: item.title,
            }))}
            onChange={specKey =>
              setForm(current => ({
                ...current,
                specKey,
              }))
            }
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>分配席位</span>
          <InputNumber
            className={styles.fullWidthInput}
            min={1}
            precision={0}
            value={form.seatCount}
            onChange={value =>
              setForm(current => ({
                ...current,
                seatCount: value ?? 0,
              }))
            }
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>到期时间</span>
          <Input
            value={form.expiresAt}
            onChange={event =>
              setForm(current => ({
                ...current,
                expiresAt: event.target.value,
              }))
            }
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>席位包价格</span>
          <Input
            disabled
            value={selectedSpec ? `¥${selectedSpec.priceAmount.toLocaleString("zh-CN")} / 席` : "-"}
          />
        </div>
        <div className={classNames(styles.modalField, styles.fullSpanField)}>
          <span className={styles.modalLabel}>备注（可选）</span>
          <Input.TextArea
            rows={3}
            value={form.remark}
            onChange={event =>
              setForm(current => ({
                ...current,
                remark: event.target.value,
              }))
            }
          />
        </div>
      </div>
    </Modal>
  );
};
