import { useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, Switch, message } from "antd";
import classNames from "classnames";

import {
  buildMockSubscriptionPlanBenefitTexts,
  formatMockSubscriptionValidity,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSubscriptionPlanKey,
  MockSubscriptionPlanStatus,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
} from "@/feature/subscription/types";
import { formatOperationsCurrency } from "@/feature/operations/serviceMeteringUtils";
import {
  buildMockPointsPackagePurchaseSnapshot,
  formatMockPointsPackageDiscount,
} from "@/feature/points/mockPointsCommerce";
import type {
  MockPointsPackageInput,
  MockPointsPackageOption,
  MockPointsPackageUpdate,
} from "@/feature/points/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import billingStyles from "./OperationsBillingConsole.module.less";

interface OperationsPointsPackagePanelProps {
  pointsPackages: MockPointsPackageOption[];
  onCreatePointsPackage: (payload: MockPointsPackageInput) => void;
  onUpdatePointsPackage: (packageId: string, updates: MockPointsPackageUpdate) => void;
}

interface OperationsSeatPackagePanelProps {
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  onUpdateSubscriptionPlan: (
    planKey: MockSubscriptionPlanKey,
    updates: Partial<MockSubscriptionPlanTemplateInput>,
  ) => void;
}

type PointsPackageEditorState =
  | {
      mode: "create";
      open: true;
      form: PointsPackageForm;
    }
  | {
      mode: "edit";
      open: true;
      packageId: string;
      form: PointsPackageForm;
    }
  | {
      open: false;
    };

interface PointsPackageForm {
  discountFactor: number;
  title: string;
  description: string;
  giftPoints: number;
  points: number;
  price: number;
  promotionEnabled: boolean;
  promotionEndsAt: string;
  promotionStartsAt: string;
  tagLabel: string;
  sortOrder: number;
  status: MockPointsPackageOption["status"];
}

interface SubscriptionPlanFormState {
  contractYearlyPriceAmount: number;
  monthlyGiftPoints: number;
  monthlyPriceAmount: number;
  monthlyValidityCount: number;
  seatCount: number;
  status: MockSubscriptionPlanStatus;
  title: string;
  yearlyGiftPoints: number;
  yearlyPriceAmount: number;
  yearlyValidityCount: number;
}

interface SubscriptionPlanEditorState {
  form: SubscriptionPlanFormState;
  open: boolean;
  planKey?: MockSubscriptionPlanKey;
}

const emptyPointsPackageForm: PointsPackageForm = {
  discountFactor: 1,
  title: "",
  description: "",
  giftPoints: 0,
  points: 0,
  price: 0,
  promotionEnabled: false,
  promotionEndsAt: "",
  promotionStartsAt: "",
  tagLabel: "",
  sortOrder: 10,
  status: "active",
};

const createEmptySubscriptionPlanForm = (): SubscriptionPlanFormState => ({
  contractYearlyPriceAmount: 299,
  monthlyGiftPoints: 1000,
  monthlyPriceAmount: 39,
  monthlyValidityCount: 1,
  seatCount: 1,
  status: "active",
  title: "团队席位包",
  yearlyGiftPoints: 12000,
  yearlyPriceAmount: 399,
  yearlyValidityCount: 1,
});

const createSubscriptionPlanEditor = (): SubscriptionPlanEditorState => ({
  form: createEmptySubscriptionPlanForm(),
  open: false,
});

const buildStatusClassName = (tone?: "success" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const getPointsPackageStatusLabel = (status: MockPointsPackageOption["status"]): string =>
  status === "active" ? "上架" : "下架";

const formatAmount = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;

const createPointsPackageForm = (pointsPackage: MockPointsPackageOption): PointsPackageForm => ({
  discountFactor: pointsPackage.discountFactor ?? 1,
  title: pointsPackage.title,
  description: pointsPackage.description,
  giftPoints: pointsPackage.giftPoints ?? 0,
  points: pointsPackage.points,
  price: pointsPackage.price,
  promotionEnabled: Boolean(pointsPackage.promotionEnabled),
  promotionEndsAt: pointsPackage.promotionEndsAt ?? "",
  promotionStartsAt: pointsPackage.promotionStartsAt ?? "",
  tagLabel: pointsPackage.tagLabel ?? "",
  sortOrder: pointsPackage.sortOrder,
  status: pointsPackage.status,
});

const parsePromotionDateTime = (value: string): number | null => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const timestamp = new Date(trimmedValue.replace(" ", "T")).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

const buildPointsPackagePayload = (form: PointsPackageForm): MockPointsPackageInput => ({
  title: form.title.trim(),
  description: form.description.trim(),
  points: Math.max(Math.floor(form.points), 0),
  price: Math.max(form.price, 0),
  tagLabel: form.tagLabel.trim() || undefined,
  promotionEnabled: form.promotionEnabled,
  discountFactor: form.promotionEnabled ? form.discountFactor : 1,
  promotionStartsAt: form.promotionEnabled ? form.promotionStartsAt.trim() : undefined,
  promotionEndsAt: form.promotionEnabled ? form.promotionEndsAt.trim() : undefined,
  giftPoints: form.promotionEnabled ? Math.max(Math.floor(form.giftPoints), 0) : 0,
});

const createSubscriptionPlanFormFromTemplate = (
  plan: MockSubscriptionPlanTemplate,
): SubscriptionPlanFormState => ({
  contractYearlyPriceAmount: plan.contractYearlyPriceAmount,
  monthlyGiftPoints: plan.monthlyGiftPoints,
  monthlyPriceAmount: plan.monthlyPriceAmount,
  monthlyValidityCount: plan.monthlyValidityCount,
  seatCount: plan.seatCount,
  status: plan.status,
  title: plan.title,
  yearlyGiftPoints: plan.yearlyGiftPoints,
  yearlyPriceAmount: plan.yearlyPriceAmount,
  yearlyValidityCount: plan.yearlyValidityCount,
});

const normalizeSubscriptionPlanForm = (
  form: SubscriptionPlanFormState,
): MockSubscriptionPlanTemplateInput => ({
  contractYearlyPriceAmount: Math.max(form.contractYearlyPriceAmount, 0),
  monthlyGiftPoints: Math.max(Math.floor(form.monthlyGiftPoints), 0),
  monthlyPriceAmount: Math.max(form.monthlyPriceAmount, 0),
  monthlyValidityCount: Math.max(Math.floor(form.monthlyValidityCount), 1),
  seatCount: Math.max(Math.floor(form.seatCount), 1),
  status: form.status,
  title: form.title.trim(),
  yearlyGiftPoints: Math.max(Math.floor(form.yearlyGiftPoints), 0),
  yearlyPriceAmount: Math.max(form.yearlyPriceAmount, 0),
  yearlyValidityCount: Math.max(Math.floor(form.yearlyValidityCount), 1),
});

export const OperationsPointsPackagePanel = ({
  pointsPackages,
  onCreatePointsPackage,
  onUpdatePointsPackage,
}: OperationsPointsPackagePanelProps): JSX.Element => {
  const [pointsPackageEditor, setPointsPackageEditor] = useState<PointsPackageEditorState>({
    open: false,
  });

  const handleSubmitPointsPackage = (): void => {
    if (!pointsPackageEditor.open) return;

    if (
      !pointsPackageEditor.form.title.trim() ||
      !pointsPackageEditor.form.description.trim() ||
      pointsPackageEditor.form.points <= 0 ||
      pointsPackageEditor.form.price <= 0
    ) {
      message.warning("请先补齐积分包名称、说明、积分数量和售价。");
      return;
    }

    if (pointsPackageEditor.form.promotionEnabled) {
      const startsAt = parsePromotionDateTime(pointsPackageEditor.form.promotionStartsAt);
      const endsAt = parsePromotionDateTime(pointsPackageEditor.form.promotionEndsAt);

      if (
        pointsPackageEditor.form.discountFactor <= 0 ||
        pointsPackageEditor.form.discountFactor > 1
      ) {
        message.warning("折扣系数必须大于 0 且小于等于 1。");
        return;
      }

      if (startsAt === null || endsAt === null || endsAt <= startsAt) {
        message.warning("请填写有效的活动开始时间和结束时间。");
        return;
      }
    }

    const payload = buildPointsPackagePayload(pointsPackageEditor.form);

    if (pointsPackageEditor.mode === "create") {
      onCreatePointsPackage(payload);
      message.success("积分包已创建。");
    } else {
      onUpdatePointsPackage(pointsPackageEditor.packageId, {
        ...payload,
        sortOrder: pointsPackageEditor.form.sortOrder,
        status: pointsPackageEditor.form.status,
      });
      message.success("积分包已更新。");
    }

    setPointsPackageEditor({ open: false });
  };

  return (
    <>
      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <h2 className={adminStyles.consoleSectionTitle}>积分包</h2>
          <Button
            type="primary"
            onClick={() =>
              setPointsPackageEditor({
                open: true,
                mode: "create",
                form: emptyPointsPackageForm,
              })
            }
          >
            新建积分包
          </Button>
        </div>
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>积分包</th>
                <th>售卖积分</th>
                <th>活动权益</th>
                <th>当前售价</th>
                <th>排序</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pointsPackages.map(item => {
                const purchaseSnapshot = buildMockPointsPackagePurchaseSnapshot(item);
                const promotionLabel =
                  item.promotionEnabled && item.discountFactor && item.promotionStartsAt
                    ? `${formatMockPointsPackageDiscount(item.discountFactor)} · ${
                        item.promotionStartsAt
                      } 至 ${item.promotionEndsAt ?? "-"}`
                    : "-";

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <div className={adminStyles.consoleSectionMeta}>{item.description}</div>
                    </td>
                    <td>{item.points.toLocaleString("zh-CN")}</td>
                    <td>
                      <strong>{promotionLabel}</strong>
                      {item.promotionEnabled && (item.giftPoints ?? 0) > 0 ? (
                        <div className={adminStyles.consoleSectionMeta}>
                          赠送 {(item.giftPoints ?? 0).toLocaleString("zh-CN")} 积分
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <strong>{formatOperationsCurrency(purchaseSnapshot.payableAmount)}</strong>
                      {purchaseSnapshot.promotionActive ? (
                        <div className={adminStyles.consoleSectionMeta}>
                          原价 {formatOperationsCurrency(purchaseSnapshot.originalPrice)}
                        </div>
                      ) : null}
                    </td>
                    <td>{item.sortOrder}</td>
                    <td>
                      <span
                        className={buildStatusClassName(
                          item.status === "active" ? "success" : undefined,
                        )}
                      >
                        {getPointsPackageStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>{item.updatedAt}</td>
                    <td>
                      <Button
                        size="small"
                        type="link"
                        onClick={() =>
                          setPointsPackageEditor({
                            open: true,
                            mode: "edit",
                            packageId: item.id,
                            form: createPointsPackageForm(item),
                          })
                        }
                      >
                        编辑
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={pointsPackageEditor.open}
        title={
          pointsPackageEditor.open && pointsPackageEditor.mode === "create"
            ? "新建积分包"
            : "编辑积分包"
        }
        width={640}
        onCancel={() => setPointsPackageEditor({ open: false })}
        onOk={handleSubmitPointsPackage}
        destroyOnHidden
      >
        {pointsPackageEditor.open ? (
          <div className={billingStyles.formGrid}>
            <div className={billingStyles.modalField}>
              <span>积分包名称</span>
              <Input
                value={pointsPackageEditor.form.title}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, title: event.target.value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>售卖积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={pointsPackageEditor.form.points}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, points: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>原价</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={pointsPackageEditor.form.price}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, price: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>限时活动</span>
              <Switch
                checked={pointsPackageEditor.form.promotionEnabled}
                checkedChildren="启用"
                unCheckedChildren="停用"
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, promotionEnabled: value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>折扣系数</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0.01}
                max={1}
                precision={2}
                step={0.01}
                disabled={!pointsPackageEditor.form.promotionEnabled}
                value={pointsPackageEditor.form.discountFactor}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, discountFactor: value ?? 1 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>活动开始时间</span>
              <Input
                disabled={!pointsPackageEditor.form.promotionEnabled}
                placeholder="2026-05-01 00:00"
                value={pointsPackageEditor.form.promotionStartsAt}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? {
                          ...current,
                          form: { ...current.form, promotionStartsAt: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>活动结束时间</span>
              <Input
                disabled={!pointsPackageEditor.form.promotionEnabled}
                placeholder="2026-05-31 23:59"
                value={pointsPackageEditor.form.promotionEndsAt}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? {
                          ...current,
                          form: { ...current.form, promotionEndsAt: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>赠送积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                disabled={!pointsPackageEditor.form.promotionEnabled}
                value={pointsPackageEditor.form.giftPoints}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, giftPoints: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>标签</span>
              <Input
                value={pointsPackageEditor.form.tagLabel}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, tagLabel: event.target.value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>排序</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={pointsPackageEditor.form.sortOrder}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, sortOrder: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>状态</span>
              <Select<MockPointsPackageOption["status"]>
                value={pointsPackageEditor.form.status}
                options={[
                  { value: "active", label: "上架" },
                  { value: "inactive", label: "下架" },
                ]}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, status: value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={classNames(billingStyles.modalField, billingStyles.fullSpanField)}>
              <span>说明</span>
              <Input.TextArea
                rows={3}
                value={pointsPackageEditor.form.description}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? {
                          ...current,
                          form: { ...current.form, description: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export const OperationsSeatPackagePanel = ({
  subscriptionPlans,
  onUpdateSubscriptionPlan,
}: OperationsSeatPackagePanelProps): JSX.Element => {
  const [subscriptionPlanEditor, setSubscriptionPlanEditor] = useState<SubscriptionPlanEditorState>(
    createSubscriptionPlanEditor(),
  );
  const subscriptionPlan = subscriptionPlans[0] ?? null;
  const subscriptionPlanForm = subscriptionPlanEditor.form;

  const handleOpenEditSubscriptionPlan = (plan: MockSubscriptionPlanTemplate): void => {
    setSubscriptionPlanEditor({
      form: createSubscriptionPlanFormFromTemplate(plan),
      open: true,
      planKey: plan.key,
    });
  };

  const handleUpdateSubscriptionPlanForm = (patch: Partial<SubscriptionPlanFormState>): void => {
    setSubscriptionPlanEditor(current => ({
      ...current,
      form: {
        ...current.form,
        ...patch,
      },
    }));
  };

  const handleSubmitSubscriptionPlan = (): void => {
    const payload = normalizeSubscriptionPlanForm(subscriptionPlanEditor.form);

    if (!payload.title) {
      message.warning("请填写席位包名称。");
      return;
    }

    if (!subscriptionPlanEditor.planKey) {
      message.warning("请选择要编辑的席位包。");
      return;
    }

    onUpdateSubscriptionPlan(subscriptionPlanEditor.planKey, payload);
    message.success("席位包已更新。");

    setSubscriptionPlanEditor(createSubscriptionPlanEditor());
  };

  return (
    <>
      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <h2 className={adminStyles.consoleSectionTitle}>团队席位包</h2>
        </div>
        {subscriptionPlan ? (
          <div className={billingStyles.policyGrid}>
            <section className={billingStyles.planCard} key={subscriptionPlan.key}>
              <div className={billingStyles.planCardHeader}>
                <span className={adminStyles.consolePill}>{subscriptionPlan.sequence}</span>
                <span
                  className={buildStatusClassName(
                    subscriptionPlan.status === "active" ? "success" : "danger",
                  )}
                >
                  {subscriptionPlan.status === "active" ? "启用" : "停用"}
                </span>
              </div>
              <h3 className={billingStyles.planTitle}>{subscriptionPlan.title}</h3>
              <div className={billingStyles.planPrice}>
                月付 {formatAmount(subscriptionPlan.monthlyPriceAmount)} / 席 / 月
              </div>
              <div className={billingStyles.planPrice}>
                年付 {formatAmount(subscriptionPlan.yearlyPriceAmount)} / 席 / 年
              </div>
              <div className={billingStyles.planPrice}>
                签约年付 {formatAmount(subscriptionPlan.contractYearlyPriceAmount)} / 席 / 年
              </div>
              <div className={billingStyles.subscriptionEffectList}>
                {buildMockSubscriptionPlanBenefitTexts(subscriptionPlan).map(item => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className={billingStyles.planCardFooter}>
                <span>更新：{subscriptionPlan.updatedAt}</span>
                <Button
                  size="small"
                  onClick={() => handleOpenEditSubscriptionPlan(subscriptionPlan)}
                >
                  编辑
                </Button>
              </div>
            </section>
          </div>
        ) : (
          <Empty description="暂无团队席位包配置。" />
        )}
      </section>

      <Modal
        open={subscriptionPlanEditor.open}
        title="编辑团队席位包"
        width={680}
        onCancel={() => setSubscriptionPlanEditor(createSubscriptionPlanEditor())}
        onOk={handleSubmitSubscriptionPlan}
        destroyOnHidden
      >
        <div className={billingStyles.modalStack}>
          <div className={billingStyles.formGrid}>
            <div className={billingStyles.modalField}>
              <span>席位包名称</span>
              <Input
                value={subscriptionPlanForm.title}
                onChange={event => handleUpdateSubscriptionPlanForm({ title: event.target.value })}
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>席位单位</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.seatCount}
                onChange={value => handleUpdateSubscriptionPlanForm({ seatCount: value ?? 1 })}
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>月付价格</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.monthlyPriceAmount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ monthlyPriceAmount: value ?? 0 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>年付价格</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.yearlyPriceAmount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ yearlyPriceAmount: value ?? 0 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>签约年付价格</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.contractYearlyPriceAmount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ contractYearlyPriceAmount: value ?? 0 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>月付有效期（月）</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.monthlyValidityCount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ monthlyValidityCount: value ?? 1 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>年付有效期（年）</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.yearlyValidityCount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ yearlyValidityCount: value ?? 1 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>月付赠送积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.monthlyGiftPoints}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ monthlyGiftPoints: value ?? 0 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>年付赠送积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.yearlyGiftPoints}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ yearlyGiftPoints: value ?? 0 })
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>状态</span>
              <Select<MockSubscriptionPlanStatus>
                value={subscriptionPlanForm.status}
                options={[
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                ]}
                onChange={status => handleUpdateSubscriptionPlanForm({ status })}
              />
            </div>
          </div>
          <div className={billingStyles.previewPanel}>
            <div className={billingStyles.previewRow}>
              <span>月付</span>
              <strong>
                {formatAmount(Math.max(subscriptionPlanForm.monthlyPriceAmount, 0))} / 席 / 月，
                有效期{" "}
                {formatMockSubscriptionValidity(
                  Math.max(Math.floor(subscriptionPlanForm.monthlyValidityCount), 1),
                  "month",
                )}
              </strong>
            </div>
            <div className={billingStyles.previewRow}>
              <span>年付</span>
              <strong>
                {formatAmount(Math.max(subscriptionPlanForm.yearlyPriceAmount, 0))} / 席 / 年，
                有效期{" "}
                {formatMockSubscriptionValidity(
                  Math.max(Math.floor(subscriptionPlanForm.yearlyValidityCount), 1),
                  "year",
                )}
              </strong>
            </div>
            <div className={billingStyles.previewRow}>
              <span>签约年付</span>
              <strong>
                {formatAmount(Math.max(subscriptionPlanForm.contractYearlyPriceAmount, 0))} / 席 /
                年
              </strong>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
