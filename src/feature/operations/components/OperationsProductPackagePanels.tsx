import { useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import type {
  MockSubscriptionPlanKey,
  MockSubscriptionPlanSpec,
  MockSubscriptionPlanStatus,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
  MockSubscriptionValidityUnit,
} from "@/feature/subscription/types";
import { formatOperationsCurrency } from "@/feature/operations/serviceMeteringUtils";
import { buildMockPointsPackagePurchaseSnapshot } from "@/feature/points/mockPointsCommerce";
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
  onCreateSubscriptionPlan: (payload: MockSubscriptionPlanTemplateInput) => void;
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
  title: string;
  description: string;
  giftPoints: number;
  points: number;
  price: number;
  scope: MockPointsPackageOption["scope"];
  tagLabel: string;
  sortOrder: number;
  status: MockPointsPackageOption["status"];
}

interface SubscriptionPlanFormState {
  giftPoints: number;
  priceAmount: number;
  seatCount: number;
  scope: MockSubscriptionPlanTemplate["scope"];
  status: MockSubscriptionPlanStatus;
  title: string;
  validityCount: number;
  validityUnit: MockSubscriptionValidityUnit;
}

interface SubscriptionPlanEditorState {
  form: SubscriptionPlanFormState;
  open: boolean;
  planKey?: MockSubscriptionPlanKey;
}

const emptyPointsPackageForm: PointsPackageForm = {
  title: "",
  description: "",
  giftPoints: 0,
  points: 0,
  price: 0,
  scope: "public",
  tagLabel: "",
  sortOrder: 10,
  status: "active",
};

const createEmptySubscriptionPlanForm = (): SubscriptionPlanFormState => ({
  giftPoints: 0,
  priceAmount: 0,
  seatCount: 1,
  scope: "internal",
  status: "active",
  title: "内部席位包",
  validityCount: 6,
  validityUnit: "month",
});

const createSubscriptionPlanEditor = (): SubscriptionPlanEditorState => ({
  form: createEmptySubscriptionPlanForm(),
  open: false,
});

const cloneSeatPackageSpecs = (specs: MockSubscriptionPlanSpec[]): MockSubscriptionPlanSpec[] =>
  specs.map(item => ({ ...item, contractPriceAmount: 0, contractPriceEnabled: false }));

const getSeatPackageSpecUnitLabel = (validityUnit: MockSubscriptionValidityUnit): string =>
  validityUnit === "day" ? "天" : validityUnit === "month" ? "月" : "年";

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
  title: pointsPackage.title,
  description: pointsPackage.description,
  giftPoints: pointsPackage.giftPoints ?? 0,
  points: pointsPackage.points,
  price: pointsPackage.price,
  scope: pointsPackage.scope,
  tagLabel: pointsPackage.tagLabel ?? "",
  sortOrder: pointsPackage.sortOrder,
  status: pointsPackage.status,
});

const buildPointsPackagePayload = (form: PointsPackageForm): MockPointsPackageInput => ({
  title: form.title.trim(),
  description: form.description.trim(),
  points: Math.max(Math.floor(form.points), 0),
  price: Math.max(form.price, 0),
  scope: form.scope,
  tagLabel: form.tagLabel.trim() || undefined,
  giftPoints: Math.max(Math.floor(form.giftPoints), 0),
});

const createSubscriptionPlanFormFromTemplate = (
  plan: MockSubscriptionPlanTemplate,
): SubscriptionPlanFormState => {
  const primarySpec = cloneSeatPackageSpecs(plan.specs).find(item => item.enabled) ?? plan.specs[0];

  return {
    giftPoints: primarySpec?.giftPoints ?? 0,
    priceAmount: primarySpec?.priceAmount ?? 0,
    seatCount: plan.seatCount,
    scope: plan.scope,
    status: plan.status,
    title: plan.title,
    validityCount: primarySpec?.validityCount ?? 6,
    validityUnit: primarySpec?.validityUnit ?? "month",
  };
};

const buildSubscriptionPlanMainSpec = (
  form: SubscriptionPlanFormState,
): MockSubscriptionPlanSpec => {
  const validityCount = Math.max(Math.floor(form.validityCount), 1);
  const validityUnit = form.validityUnit;
  const validityLabel = `${validityCount} ${getSeatPackageSpecUnitLabel(validityUnit)}`;

  return {
    key: "seat-package-main",
    title: form.title.trim(),
    billingCycle: "seat-package-main",
    billingCycleLabel: validityLabel,
    enabled: true,
    priceAmount: Math.max(form.priceAmount, 0),
    giftPoints: Math.max(Math.floor(form.giftPoints), 0),
    validityCount,
    validityUnit,
    contractPriceAmount: 0,
    contractPriceEnabled: false,
  };
};

const normalizeSubscriptionPlanForm = (
  form: SubscriptionPlanFormState,
): MockSubscriptionPlanTemplateInput => {
  const mainSpec = buildSubscriptionPlanMainSpec(form);
  const isMonthPackage = mainSpec.validityUnit === "month";
  const isYearPackage = mainSpec.validityUnit === "year";

  return {
    contractYearlyEnabled: false,
    contractYearlyPriceAmount: 0,
    monthlyEnabled: isMonthPackage,
    monthlyGiftPoints: isMonthPackage ? mainSpec.giftPoints : 0,
    monthlyPriceAmount: isMonthPackage ? mainSpec.priceAmount : 0,
    monthlyValidityCount: isMonthPackage ? mainSpec.validityCount : 1,
    seatCount: Math.max(Math.floor(form.seatCount), 1),
    scope: form.scope,
    specs: [mainSpec],
    status: form.status,
    title: form.title.trim(),
    yearlyEnabled: isYearPackage,
    yearlyGiftPoints: isYearPackage ? mainSpec.giftPoints : 0,
    yearlyPriceAmount: isYearPackage ? mainSpec.priceAmount : 0,
    yearlyValidityCount: isYearPackage ? mainSpec.validityCount : 1,
  };
};

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
      pointsPackageEditor.form.price < 0
    ) {
      message.warning("请先补齐积分包名称、说明和积分数量。");
      return;
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
                <th>购买赠送</th>
                <th>售价</th>
                <th>类型</th>
                <th>排序</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pointsPackages.map(item => {
                const purchaseSnapshot = buildMockPointsPackagePurchaseSnapshot(item);
                const giftPoints = item.giftPoints ?? 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <div className={adminStyles.consoleSectionMeta}>{item.description}</div>
                    </td>
                    <td>{item.points.toLocaleString("zh-CN")}</td>
                    <td>
                      {giftPoints > 0 ? `赠送 ${giftPoints.toLocaleString("zh-CN")} 积分` : "-"}
                    </td>
                    <td>
                      <strong>{formatOperationsCurrency(purchaseSnapshot.payableAmount)}</strong>
                    </td>
                    <td>{item.scope === "internal" ? "内部包" : "公开售卖"}</td>
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
              <span>价格</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
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
              <span>赠送积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
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
              <span>类型</span>
              <Select<MockPointsPackageOption["scope"]>
                value={pointsPackageEditor.form.scope}
                options={[
                  { value: "public", label: "公开售卖" },
                  { value: "internal", label: "内部包" },
                ]}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, scope: value } }
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
  onCreateSubscriptionPlan,
  onUpdateSubscriptionPlan,
}: OperationsSeatPackagePanelProps): JSX.Element => {
  const [subscriptionPlanEditor, setSubscriptionPlanEditor] = useState<SubscriptionPlanEditorState>(
    createSubscriptionPlanEditor(),
  );
  const subscriptionPlanForm = subscriptionPlanEditor.form;

  const handleOpenCreateSubscriptionPlan = (): void => {
    setSubscriptionPlanEditor({
      form: createEmptySubscriptionPlanForm(),
      open: true,
    });
  };

  const handleOpenEditSubscriptionPlan = (plan: MockSubscriptionPlanTemplate): void => {
    setSubscriptionPlanEditor({
      form: createSubscriptionPlanFormFromTemplate(plan),
      open: true,
      planKey: plan.key,
    });
  };

  const handleSubmitSubscriptionPlan = (): void => {
    const payload = normalizeSubscriptionPlanForm(subscriptionPlanEditor.form);
    const primarySpec = payload.specs[0];

    if (!payload.title) {
      message.warning("请填写席位包名称。");
      return;
    }

    if (!primarySpec || primarySpec.validityCount < 1) {
      message.warning("请填写有效时间。");
      return;
    }

    if (!subscriptionPlanEditor.planKey) {
      onCreateSubscriptionPlan(payload);
      message.success("席位包已创建。");
      setSubscriptionPlanEditor(createSubscriptionPlanEditor());
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
          <Button type="primary" onClick={handleOpenCreateSubscriptionPlan}>
            新建席位包
          </Button>
        </div>
        {subscriptionPlans.length > 0 ? (
          <div className={billingStyles.policyGrid}>
            {subscriptionPlans.map(plan => {
              const card = plan.specs.find(item => item.enabled) ?? plan.specs[0];
              const validityLabel = card
                ? `${card.validityCount} ${getSeatPackageSpecUnitLabel(card.validityUnit)}`
                : "-";

              return (
                <section className={billingStyles.planCard} key={plan.key}>
                  <div className={billingStyles.planCardHeader}>
                    <span className={adminStyles.consolePill}>
                      {plan.scope === "internal" ? "内部包" : "公开售卖"}
                    </span>
                    <span
                      className={buildStatusClassName(
                        plan.status === "active" ? "success" : "danger",
                      )}
                    >
                      {plan.status === "active" ? "启用" : "停用"}
                    </span>
                  </div>
                  <h3 className={billingStyles.planTitle}>{plan.title}</h3>
                  <div className={billingStyles.planAudience}>有效时间 {validityLabel}</div>
                  <div className={billingStyles.planPrice}>
                    {formatAmount(card?.priceAmount ?? 0)} / 席 / {validityLabel}
                  </div>
                  <div className={billingStyles.subscriptionEffectList}>
                    <span>默认席位单位 {plan.seatCount}</span>
                    <span>赠送 {(card?.giftPoints ?? 0).toLocaleString("zh-CN")} 积分</span>
                  </div>
                  <div className={billingStyles.planCardFooter}>
                    <span>更新：{plan.updatedAt}</span>
                    <Button size="small" onClick={() => handleOpenEditSubscriptionPlan(plan)}>
                      编辑
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无团队席位包配置。" />
        )}
      </section>

      <Modal
        open={subscriptionPlanEditor.open}
        title={subscriptionPlanEditor.planKey ? "编辑席位包" : "新建席位包"}
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
                onChange={event =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, title: event.target.value },
                  }))
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>类型</span>
              <Select<MockSubscriptionPlanTemplate["scope"]>
                value={subscriptionPlanForm.scope}
                options={[
                  { value: "public", label: "公开售卖" },
                  { value: "internal", label: "内部包" },
                ]}
                onChange={value =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, scope: value },
                  }))
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>启用状态</span>
              <Select<"active" | "inactive">
                value={subscriptionPlanForm.status}
                options={[
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                ]}
                onChange={value =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, status: value },
                  }))
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>每席价格</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.priceAmount}
                onChange={value =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, priceAmount: value ?? 0 },
                  }))
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>赠送积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.giftPoints}
                onChange={value =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, giftPoints: value ?? 0 },
                  }))
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>有效时间</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.validityCount}
                onChange={value =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, validityCount: value ?? 1 },
                  }))
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>有效时间单位</span>
              <Select<MockSubscriptionValidityUnit>
                value={subscriptionPlanForm.validityUnit}
                options={[
                  { value: "day", label: "天" },
                  { value: "month", label: "月" },
                  { value: "year", label: "年" },
                ]}
                onChange={value =>
                  setSubscriptionPlanEditor(current => ({
                    ...current,
                    form: { ...current.form, validityUnit: value },
                  }))
                }
              />
            </div>
          </div>
          <div className={billingStyles.previewPanel}>
            <div className={billingStyles.previewRow}>
              <span>{subscriptionPlanForm.title || "席位包"}</span>
              <strong>
                {formatAmount(Math.max(subscriptionPlanForm.priceAmount, 0))} / 席 /{" "}
                {Math.max(Math.floor(subscriptionPlanForm.validityCount), 1)}{" "}
                {getSeatPackageSpecUnitLabel(subscriptionPlanForm.validityUnit)}
              </strong>
            </div>
            <div className={billingStyles.previewRow}>
              <span>购买赠送积分</span>
              <strong>
                {Math.max(Math.floor(subscriptionPlanForm.giftPoints), 0).toLocaleString("zh-CN")}{" "}
                积分
              </strong>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
