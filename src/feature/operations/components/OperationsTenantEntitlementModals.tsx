import { useEffect, useMemo, useState } from "react";

import { Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import type {
  OperationsTenant,
  OperationsTenantPointsRechargePayload,
  OperationsTenantSeatAllocationPayload,
  OperationsTenantSeatRenewalPayload,
} from "@/feature/operations/types";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { MockPointsPackageOption } from "@/feature/points/types";
import {
  getMockSubscriptionPlanValidityLabel,
  getPrimaryMockSubscriptionPlanSpec,
} from "@/feature/subscription/mockSubscriptionPlans";
import type { MockSubscriptionPlanTemplate } from "@/feature/subscription/types";
import {
  addTenantSeatPackageValidity,
  getLatestTenantActiveSeatExpiresAt,
} from "@/feature/operations/tenantSeatEntitlementRules";

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
  tenantSnapshot: MockTenantManagementSnapshot | null;
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  onCancel: () => void;
  onSubmit: (tenantId: string, payload: OperationsTenantSeatAllocationPayload) => boolean;
}

interface OperationsTenantSeatRenewalModalProps {
  open: boolean;
  tenant: OperationsTenant | null;
  tenantSnapshot: MockTenantManagementSnapshot | null;
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  onCancel: () => void;
  onSubmit: (tenantId: string, payload: OperationsTenantSeatRenewalPayload) => boolean;
}

interface PointsRechargeFormState {
  packageId: string;
  remark: string;
}

interface SeatAllocationFormState {
  planKey: string;
  seatCount: number;
  expiresAt: string;
  remark: string;
}

interface SeatRenewalFormState {
  planKey: string;
  expiresAt: string;
  remark: string;
}

const resolveSeatAllocationExpiresAt = (
  snapshot: MockTenantManagementSnapshot | null,
  plan: MockSubscriptionPlanTemplate | undefined,
): string => {
  const currentExpiresAt = getLatestTenantActiveSeatExpiresAt(snapshot);
  const spec = plan ? getPrimaryMockSubscriptionPlanSpec(plan) : undefined;

  if (currentExpiresAt) {
    return currentExpiresAt;
  }

  if (!spec || spec.validityCount <= 0) {
    return "";
  }

  return addTenantSeatPackageValidity(
    new Date().toISOString().slice(0, 10),
    spec.validityCount,
    spec.validityUnit,
  );
};

const createPointsRechargeForm = (
  packages: MockPointsPackageOption[],
): PointsRechargeFormState => ({
  packageId: packages[0]?.id ?? "",
  remark: "",
});

const createSeatAllocationForm = (
  plans: MockSubscriptionPlanTemplate[],
  snapshot: MockTenantManagementSnapshot | null,
): SeatAllocationFormState => {
  const firstPlan = plans.find(item => item.status === "active") ?? plans[0];

  return {
    planKey: firstPlan?.key ?? "",
    seatCount: firstPlan?.seatCount ?? 1,
    expiresAt: resolveSeatAllocationExpiresAt(snapshot, firstPlan),
    remark: "",
  };
};

const createSeatRenewalForm = (
  plans: MockSubscriptionPlanTemplate[],
  snapshot: MockTenantManagementSnapshot | null,
): SeatRenewalFormState => {
  const firstPlan = plans.find(item => item.status === "active") ?? plans[0];
  const firstSpec = firstPlan ? getPrimaryMockSubscriptionPlanSpec(firstPlan) : undefined;
  const currentExpiresAt = getLatestTenantActiveSeatExpiresAt(snapshot);

  return {
    planKey: firstPlan?.key ?? "",
    expiresAt:
      currentExpiresAt && firstSpec
        ? addTenantSeatPackageValidity(
            currentExpiresAt,
            firstSpec.validityCount,
            firstSpec.validityUnit,
          )
        : "",
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
  tenantSnapshot,
  subscriptionPlans,
  onCancel,
  onSubmit,
}: OperationsTenantSeatAllocationModalProps): JSX.Element => {
  const activePlans = useMemo(
    () => subscriptionPlans.filter(item => item.status === "active" && item.scope === "internal"),
    [subscriptionPlans],
  );
  const [form, setForm] = useState<SeatAllocationFormState>(() =>
    createSeatAllocationForm(activePlans, tenantSnapshot),
  );
  const selectedPlan = activePlans.find(item => item.key === form.planKey) ?? activePlans[0];
  const selectedSpec = selectedPlan ? getPrimaryMockSubscriptionPlanSpec(selectedPlan) : undefined;
  const currentExpiresAt = getLatestTenantActiveSeatExpiresAt(tenantSnapshot);
  const expiresRuleLabel = currentExpiresAt ? "对齐当前席位到期" : "按席位包有效时间生成";

  useEffect(() => {
    if (open) {
      setForm(createSeatAllocationForm(activePlans, tenantSnapshot));
    }
  }, [activePlans, open, tenant?.id, tenantSnapshot]);

  const handleChangePlan = (planKey: string): void => {
    const nextPlan = activePlans.find(item => item.key === planKey);

    setForm(current => ({
      ...current,
      planKey,
      seatCount: nextPlan?.seatCount ?? current.seatCount,
      expiresAt: resolveSeatAllocationExpiresAt(tenantSnapshot, nextPlan),
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
      message.warning("未能计算席位到期时间。");
      return;
    }

    const success = onSubmit(tenant.id, {
      planKey: selectedPlan.key,
      planTitle: selectedPlan.title,
      specKey: selectedSpec.key,
      specTitle: selectedPlan.title,
      validityLabel: getMockSubscriptionPlanValidityLabel(selectedPlan),
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
              label: `${item.title} · ${item.scope === "internal" ? "内部包" : "公开售卖"}`,
            }))}
            onChange={handleChangePlan}
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
          <span className={styles.modalLabel}>席位包价格</span>
          <Input
            disabled
            value={selectedSpec ? `¥${selectedSpec.priceAmount.toLocaleString("zh-CN")} / 席` : "-"}
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>有效时间</span>
          <Input
            disabled
            value={
              selectedSpec
                ? `${selectedSpec.validityCount} ${
                    selectedSpec.validityUnit === "day"
                      ? "天"
                      : selectedSpec.validityUnit === "month"
                        ? "月"
                        : "年"
                  }`
                : "-"
            }
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>购买赠送积分</span>
          <Input
            disabled
            value={selectedSpec ? `${selectedSpec.giftPoints.toLocaleString("zh-CN")} 积分` : "-"}
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>到期规则</span>
          <Input disabled value={expiresRuleLabel} />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>到期时间</span>
          <Input disabled className={styles.fullWidthInput} value={form.expiresAt || "-"} />
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
 * 租户详情中的运营席位续约弹窗。
 */
export const OperationsTenantSeatRenewalModal = ({
  open,
  tenant,
  tenantSnapshot,
  subscriptionPlans,
  onCancel,
  onSubmit,
}: OperationsTenantSeatRenewalModalProps): JSX.Element => {
  const activePlans = useMemo(
    () => subscriptionPlans.filter(item => item.status === "active" && item.scope === "internal"),
    [subscriptionPlans],
  );
  const [form, setForm] = useState<SeatRenewalFormState>(() =>
    createSeatRenewalForm(activePlans, tenantSnapshot),
  );
  const selectedPlan = activePlans.find(item => item.key === form.planKey) ?? activePlans[0];
  const selectedSpec = selectedPlan ? getPrimaryMockSubscriptionPlanSpec(selectedPlan) : undefined;
  const currentExpiresAt = getLatestTenantActiveSeatExpiresAt(tenantSnapshot);
  const renewalSeatCount = Math.max(tenantSnapshot?.totalSeats ?? tenant?.seatCount ?? 0, 0);

  useEffect(() => {
    if (open) {
      setForm(createSeatRenewalForm(activePlans, tenantSnapshot));
    }
  }, [activePlans, open, tenant?.id, tenantSnapshot]);

  const handleChangePlan = (planKey: string): void => {
    const nextPlan = activePlans.find(item => item.key === planKey);
    const nextSpec = nextPlan ? getPrimaryMockSubscriptionPlanSpec(nextPlan) : undefined;

    setForm(current => ({
      ...current,
      planKey,
      expiresAt:
        currentExpiresAt && nextSpec
          ? addTenantSeatPackageValidity(
              currentExpiresAt,
              nextSpec.validityCount,
              nextSpec.validityUnit,
            )
          : "",
    }));
  };

  const handleSubmit = (): void => {
    if (!tenant || !selectedPlan || !selectedSpec) {
      message.warning("请先在商品中心创建并启用内部席位包。");
      return;
    }

    if (!currentExpiresAt || renewalSeatCount < 2) {
      message.warning("当前租户没有可续约的有效团队席位。");
      return;
    }

    if (!form.expiresAt.trim()) {
      message.warning("未能计算续约后到期时间。");
      return;
    }

    const success = onSubmit(tenant.id, {
      planKey: selectedPlan.key,
      planTitle: selectedPlan.title,
      specKey: selectedSpec.key,
      specTitle: selectedPlan.title,
      validityLabel: getMockSubscriptionPlanValidityLabel(selectedPlan),
      seatCount: renewalSeatCount,
      currentExpiresAt,
      expiresAt: form.expiresAt.trim(),
      giftPoints: selectedSpec.giftPoints,
      remark: form.remark,
    });

    if (success) {
      message.success("席位已续约。");
      onCancel();
    }
  };

  return (
    <Modal
      open={open}
      title={tenant ? `席位续约 · ${tenant.name}` : "席位续约"}
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
              label: `${item.title} · 内部包`,
            }))}
            onChange={handleChangePlan}
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>续约席位</span>
          <Input disabled value={`${renewalSeatCount.toLocaleString("zh-CN")} 个席位`} />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>席位包价格</span>
          <Input
            disabled
            value={selectedSpec ? `¥${selectedSpec.priceAmount.toLocaleString("zh-CN")} / 席` : "-"}
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>有效时间</span>
          <Input
            disabled
            value={selectedPlan ? getMockSubscriptionPlanValidityLabel(selectedPlan) : "-"}
          />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>当前到期</span>
          <Input disabled value={currentExpiresAt ?? "-"} />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>续约后到期</span>
          <Input disabled className={styles.fullWidthInput} value={form.expiresAt || "-"} />
        </div>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>购买赠送积分</span>
          <Input
            disabled
            value={selectedSpec ? `${selectedSpec.giftPoints.toLocaleString("zh-CN")} 积分` : "-"}
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
