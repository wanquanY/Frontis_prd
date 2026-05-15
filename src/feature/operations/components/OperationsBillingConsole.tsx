import { useMemo, useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { OperationsTenant } from "@/feature/operations/types";
import {
  buildMockSubscriptionPlanBenefitTexts,
  formatMockSubscriptionValidity,
  getMockSubscriptionPlanPurchaseOption,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
  MockSubscriptionBillingCycle,
  MockSubscriptionPlanKey,
  MockSubscriptionPlanPurchaseOption,
  MockSubscriptionPlanStatus,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
} from "@/feature/subscription/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsBillingConsole.module.less";

type BillingTabKey = "subscriptionPolicy" | "contractCodes" | "tenantSubscriptions";

interface TenantPlanEditorState {
  billingCycle: MockSubscriptionBillingCycle;
  contractCode: string;
  open: boolean;
  seatCount: number;
  tenantId?: string;
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
  mode: "create" | "edit";
  open: boolean;
  planKey?: MockSubscriptionPlanKey;
}

interface ContractCodeFormState {
  channelName: string;
  code: string;
  ownerName: string;
  serviceLabel: string;
  status: MockSalesChannelContractCode["status"];
}

interface ContractCodeEditorState {
  form: ContractCodeFormState;
  mode: "create" | "edit";
  open: boolean;
  originalCode?: string;
}

interface OperationsBillingConsoleProps {
  embedded?: boolean;
  salesChannelContractCodes: MockSalesChannelContractCode[];
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  tenants: OperationsTenant[];
  onApplyTenantSubscriptionPlan: (
    tenantId: string,
    purchaseOption: MockSubscriptionPlanPurchaseOption,
  ) => boolean;
  onCreateSalesChannelContractCode: (payload: MockSalesChannelContractCodeInput) => void;
  onCreateSubscriptionPlan: (payload: MockSubscriptionPlanTemplateInput) => void;
  onUpdateSalesChannelContractCode: (
    code: string,
    updates: Partial<MockSalesChannelContractCodeInput>,
  ) => void;
  onUpdateSubscriptionPlan: (
    planKey: MockSubscriptionPlanKey,
    updates: Partial<MockSubscriptionPlanTemplateInput>,
  ) => void;
}

interface TenantBillingRecord {
  snapshot: MockTenantManagementSnapshot | null;
  tenant: OperationsTenant;
}

const BILLING_TABS: Array<{ key: BillingTabKey; label: string }> = [
  { key: "subscriptionPolicy", label: "订阅策略" },
  { key: "contractCodes", label: "签约码" },
  { key: "tenantSubscriptions", label: "租户订阅" },
];

const formatAmount = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;

const buildStatusClassName = (tone?: "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const createTenantPlanEditor = (tenantId?: string): TenantPlanEditorState => ({
  billingCycle: "monthly",
  contractCode: "",
  open: Boolean(tenantId),
  seatCount: 1,
  tenantId,
});

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
  mode: "create",
  open: false,
});

const createEmptyContractCodeForm = (): ContractCodeFormState => ({
  channelName: "",
  code: "",
  ownerName: "",
  serviceLabel: "",
  status: "active",
});

const createContractCodeEditor = (): ContractCodeEditorState => ({
  form: createEmptyContractCodeForm(),
  mode: "create",
  open: false,
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

const createContractCodeFormFromCode = (
  contractCode: MockSalesChannelContractCode,
): ContractCodeFormState => ({
  channelName: contractCode.channelName,
  code: contractCode.code,
  ownerName: contractCode.ownerName,
  serviceLabel: contractCode.serviceLabel,
  status: contractCode.status,
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

const normalizeContractCodeForm = (
  form: ContractCodeFormState,
): MockSalesChannelContractCodeInput => ({
  channelName: form.channelName.trim(),
  code: form.code.trim().toUpperCase(),
  ownerName: form.ownerName.trim(),
  serviceLabel: form.serviceLabel.trim(),
  status: form.status,
});

/**
 * 运营后台订阅运营控制台，承载团队席位包、签约码策略和租户订阅开通。
 */
export const OperationsBillingConsole = ({
  embedded = false,
  salesChannelContractCodes,
  subscriptionPlans,
  tenants,
  onApplyTenantSubscriptionPlan,
  onCreateSalesChannelContractCode,
  onCreateSubscriptionPlan,
  onUpdateSalesChannelContractCode,
  onUpdateSubscriptionPlan,
}: OperationsBillingConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<BillingTabKey>("subscriptionPolicy");
  const [tenantPlanEditor, setTenantPlanEditor] =
    useState<TenantPlanEditorState>(createTenantPlanEditor());
  const [subscriptionPlanEditor, setSubscriptionPlanEditor] = useState<SubscriptionPlanEditorState>(
    createSubscriptionPlanEditor(),
  );
  const [contractCodeEditor, setContractCodeEditor] = useState<ContractCodeEditorState>(
    createContractCodeEditor(),
  );
  const tenantBillingRecords = useMemo<TenantBillingRecord[]>(
    () =>
      tenants.map(tenant => ({
        tenant,
        snapshot: getMockTenantManagementSnapshot(tenant.id),
      })),
    [tenants],
  );
  const selectedTenantRecord = tenantBillingRecords.find(
    item => item.tenant.id === tenantPlanEditor.tenantId,
  );
  const purchasePreview = tenantPlanEditor.tenantId
    ? getMockSubscriptionPlanPurchaseOption(
        {
          billingCycle: tenantPlanEditor.billingCycle,
          contractCode: tenantPlanEditor.contractCode,
          seatCount: tenantPlanEditor.seatCount,
        },
        selectedTenantRecord?.snapshot,
      )
    : null;
  const subscriptionPlanForm = subscriptionPlanEditor.form;
  const contractCodeForm = contractCodeEditor.form;

  const handleSubmitTenantPlan = (): void => {
    if (!tenantPlanEditor.tenantId || !purchasePreview) {
      message.warning("请选择租户并填写席位数量。");
      return;
    }

    const succeeded = onApplyTenantSubscriptionPlan(tenantPlanEditor.tenantId, purchasePreview);

    if (!succeeded) {
      message.error("订阅开通失败，请检查租户状态。");
      return;
    }

    message.success("订阅已开通。");
    setTenantPlanEditor(createTenantPlanEditor());
  };

  const handleOpenEditSubscriptionPlan = (plan: MockSubscriptionPlanTemplate): void => {
    setSubscriptionPlanEditor({
      form: createSubscriptionPlanFormFromTemplate(plan),
      mode: "edit",
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

    if (subscriptionPlanEditor.mode === "edit" && subscriptionPlanEditor.planKey) {
      onUpdateSubscriptionPlan(subscriptionPlanEditor.planKey, payload);
      message.success("席位包已更新。");
    } else {
      onCreateSubscriptionPlan(payload);
      message.success("席位包已创建。");
    }

    setSubscriptionPlanEditor(createSubscriptionPlanEditor());
  };

  const handleOpenCreateContractCode = (): void => {
    setContractCodeEditor({
      form: createEmptyContractCodeForm(),
      mode: "create",
      open: true,
    });
  };

  const handleOpenEditContractCode = (contractCode: MockSalesChannelContractCode): void => {
    setContractCodeEditor({
      form: createContractCodeFormFromCode(contractCode),
      mode: "edit",
      open: true,
      originalCode: contractCode.code,
    });
  };

  const handleUpdateContractCodeForm = (patch: Partial<ContractCodeFormState>): void => {
    setContractCodeEditor(current => ({
      ...current,
      form: {
        ...current.form,
        ...patch,
      },
    }));
  };

  const handleSubmitContractCode = (): void => {
    const payload = normalizeContractCodeForm(contractCodeEditor.form);

    if (!payload.code || !payload.channelName || !payload.ownerName) {
      message.warning("请填写签约码、销售/渠道和负责人。");
      return;
    }

    const isDuplicateCode = salesChannelContractCodes.some(
      item =>
        item.code === payload.code &&
        (contractCodeEditor.mode === "create" || item.code !== contractCodeEditor.originalCode),
    );

    if (isDuplicateCode) {
      message.warning("签约码已存在。");
      return;
    }

    if (contractCodeEditor.mode === "edit" && contractCodeEditor.originalCode) {
      onUpdateSalesChannelContractCode(contractCodeEditor.originalCode, payload);
      message.success("签约码已更新。");
    } else {
      onCreateSalesChannelContractCode(payload);
      message.success("签约码已创建。");
    }

    setContractCodeEditor(createContractCodeEditor());
  };

  const renderSubscriptionPolicy = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <h2 className={adminStyles.consoleSectionTitle}>团队席位包</h2>
      </div>
      {subscriptionPlans.length ? (
        <div className={styles.policyGrid}>
          {subscriptionPlans.map(plan => (
            <section className={styles.planCard} key={plan.key}>
              <div className={styles.planCardHeader}>
                <span className={adminStyles.consolePill}>{plan.sequence}</span>
                <span
                  className={buildStatusClassName(plan.status === "active" ? "success" : "danger")}
                >
                  {plan.status === "active" ? "启用" : "停用"}
                </span>
              </div>
              <h3 className={styles.planTitle}>{plan.title}</h3>
              <div className={styles.planPrice}>
                月付 {formatAmount(plan.monthlyPriceAmount)} / 席 / 月
              </div>
              <div className={styles.planPrice}>
                年付 {formatAmount(plan.yearlyPriceAmount)} / 席 / 年
              </div>
              <div className={styles.planPrice}>
                签约年付 {formatAmount(plan.contractYearlyPriceAmount)} / 席 / 年
              </div>
              <div className={styles.subscriptionEffectList}>
                {buildMockSubscriptionPlanBenefitTexts(plan).map(item => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className={styles.planCardFooter}>
                <span>更新：{plan.updatedAt}</span>
                <Button size="small" onClick={() => handleOpenEditSubscriptionPlan(plan)}>
                  编辑
                </Button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Empty description="暂无团队席位包配置。" />
      )}
    </section>
  );

  const renderContractCodes = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <h2 className={adminStyles.consoleSectionTitle}>销售 / 渠道签约码</h2>
        <Button type="primary" onClick={handleOpenCreateContractCode}>
          新建签约码
        </Button>
      </div>
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>签约码</th>
              <th>销售/渠道</th>
              <th>负责人</th>
              <th>企业服务</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {salesChannelContractCodes.map(item => (
              <tr key={item.code}>
                <td className={adminStyles.consoleHtmlTableStrong}>{item.code}</td>
                <td>{item.channelName}</td>
                <td>{item.ownerName}</td>
                <td>{item.serviceLabel}</td>
                <td>
                  <span
                    className={buildStatusClassName(
                      item.status === "active" ? "success" : "danger",
                    )}
                  >
                    {item.status === "active" ? "启用" : "停用"}
                  </span>
                </td>
                <td>
                  <Button size="small" type="link" onClick={() => handleOpenEditContractCode(item)}>
                    编辑
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderTenantSubscriptions = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <h2 className={adminStyles.consoleSectionTitle}>租户订阅</h2>
      </div>
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>租户</th>
              <th>当前版本</th>
              <th>席位</th>
              <th>积分余额</th>
              <th>到期时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tenantBillingRecords.map(item => (
              <tr key={item.tenant.id}>
                <td>
                  <strong>{item.tenant.name}</strong>
                  <div className={adminStyles.consoleSectionMeta}>{item.tenant.adminName}</div>
                </td>
                <td>{item.snapshot?.planLabel ?? "Lite 个人版"}</td>
                <td>
                  {item.snapshot?.usedSeats ?? item.tenant.members.length}/
                  {item.snapshot?.totalSeats ?? item.tenant.seatCount}
                </td>
                <td>{(item.snapshot?.pointsBalance ?? 0).toLocaleString("zh-CN")}</td>
                <td>{item.snapshot?.planExpiresAt ?? "-"}</td>
                <td>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setTenantPlanEditor(createTenantPlanEditor(item.tenant.id))}
                  >
                    购买/追加席位
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActiveContent = (): JSX.Element => {
    if (activeTab === "subscriptionPolicy") return renderSubscriptionPolicy();
    if (activeTab === "contractCodes") return renderContractCodes();

    return renderTenantSubscriptions();
  };

  return (
    <div className={embedded ? styles.embeddedRoot : adminStyles.consolePage}>
      {embedded ? null : (
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h1 className={adminStyles.consoleTitle}>订阅运营</h1>
          </div>
        </header>
      )}

      <div className={adminStyles.consoleTabs}>
        {BILLING_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={classNames(adminStyles.consoleTabButton, {
              [adminStyles.consoleTabButtonActive]: activeTab === tab.key,
            })}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderActiveContent()}

      <Modal
        open={subscriptionPlanEditor.open}
        title={subscriptionPlanEditor.mode === "edit" ? "编辑团队席位包" : "新建团队席位包"}
        width={680}
        onCancel={() => setSubscriptionPlanEditor(createSubscriptionPlanEditor())}
        onOk={handleSubmitSubscriptionPlan}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>席位包名称</span>
              <Input
                value={subscriptionPlanForm.title}
                onChange={event => handleUpdateSubscriptionPlanForm({ title: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>席位单位</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.seatCount}
                onChange={value => handleUpdateSubscriptionPlanForm({ seatCount: value ?? 1 })}
              />
            </div>
            <div className={styles.modalField}>
              <span>月付价格</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.monthlyPriceAmount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ monthlyPriceAmount: value ?? 0 })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>年付价格</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.yearlyPriceAmount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ yearlyPriceAmount: value ?? 0 })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>签约年付价格</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.contractYearlyPriceAmount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ contractYearlyPriceAmount: value ?? 0 })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>月付有效期（月）</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.monthlyValidityCount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ monthlyValidityCount: value ?? 1 })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>年付有效期（年）</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={1}
                precision={0}
                value={subscriptionPlanForm.yearlyValidityCount}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ yearlyValidityCount: value ?? 1 })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>月付赠送积分</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.monthlyGiftPoints}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ monthlyGiftPoints: value ?? 0 })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>年付赠送积分</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={0}
                value={subscriptionPlanForm.yearlyGiftPoints}
                onChange={value =>
                  handleUpdateSubscriptionPlanForm({ yearlyGiftPoints: value ?? 0 })
                }
              />
            </div>
            <div className={styles.modalField}>
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
          <div className={styles.previewPanel}>
            <div className={styles.previewRow}>
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
            <div className={styles.previewRow}>
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
            <div className={styles.previewRow}>
              <span>签约年付</span>
              <strong>
                {formatAmount(Math.max(subscriptionPlanForm.contractYearlyPriceAmount, 0))} / 席 /
                年
              </strong>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={contractCodeEditor.open}
        title={contractCodeEditor.mode === "edit" ? "编辑签约码" : "新建签约码"}
        width={640}
        onCancel={() => setContractCodeEditor(createContractCodeEditor())}
        onOk={handleSubmitContractCode}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>签约码</span>
              <Input
                value={contractCodeForm.code}
                onChange={event => handleUpdateContractCodeForm({ code: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>销售/渠道</span>
              <Input
                value={contractCodeForm.channelName}
                onChange={event =>
                  handleUpdateContractCodeForm({ channelName: event.target.value })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>负责人</span>
              <Input
                value={contractCodeForm.ownerName}
                onChange={event => handleUpdateContractCodeForm({ ownerName: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>状态</span>
              <Select<MockSalesChannelContractCode["status"]>
                value={contractCodeForm.status}
                options={[
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                ]}
                onChange={status => handleUpdateContractCodeForm({ status })}
              />
            </div>
          </div>
          <div className={styles.modalField}>
            <span>企业服务</span>
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              value={contractCodeForm.serviceLabel}
              onChange={event => handleUpdateContractCodeForm({ serviceLabel: event.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={tenantPlanEditor.open}
        title="购买/追加席位"
        width={620}
        onCancel={() => setTenantPlanEditor(createTenantPlanEditor())}
        onOk={handleSubmitTenantPlan}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.modalField}>
            <span>租户</span>
            <Select
              value={tenantPlanEditor.tenantId}
              options={tenantBillingRecords.map(item => ({
                value: item.tenant.id,
                label: item.tenant.name,
              }))}
              onChange={tenantId =>
                setTenantPlanEditor(current => ({
                  ...current,
                  tenantId,
                }))
              }
            />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>购买席位</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={1}
                precision={0}
                value={tenantPlanEditor.seatCount}
                onChange={value =>
                  setTenantPlanEditor(current => ({
                    ...current,
                    seatCount: value ?? 1,
                  }))
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>付费方式</span>
              <Select<MockSubscriptionBillingCycle>
                value={tenantPlanEditor.billingCycle}
                options={[
                  { value: "monthly", label: "按月支付" },
                  { value: "yearly", label: "按年支付" },
                ]}
                onChange={billingCycle =>
                  setTenantPlanEditor(current => ({
                    ...current,
                    billingCycle,
                    contractCode: billingCycle === "monthly" ? "" : current.contractCode,
                  }))
                }
              />
            </div>
            {tenantPlanEditor.billingCycle === "yearly" ? (
              <div className={styles.modalField}>
                <span>销售/渠道签约码</span>
                <Input
                  value={tenantPlanEditor.contractCode}
                  onChange={event =>
                    setTenantPlanEditor(current => ({
                      ...current,
                      contractCode: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
          {purchasePreview ? (
            <div className={styles.previewPanel}>
              <div className={styles.previewRow}>
                <span>购买内容</span>
                <strong>{purchasePreview.planLabel}</strong>
              </div>
              <div className={styles.previewRow}>
                <span>单价</span>
                <strong>{purchasePreview.priceLabel}</strong>
              </div>
              <div className={styles.previewRow}>
                <span>统一到期日</span>
                <strong>{purchasePreview.expiresAt}</strong>
              </div>
              {purchasePreview.channelName ? (
                <div className={styles.previewRow}>
                  <span>销售归属</span>
                  <strong>
                    {purchasePreview.channelName} · {purchasePreview.ownerName}
                  </strong>
                </div>
              ) : null}
              <div className={styles.previewRow}>
                <span>支付金额</span>
                <strong>{formatAmount(purchasePreview.amount)}</strong>
              </div>
              {purchasePreview.ruleMessage ? (
                <div className={styles.previewHint}>{purchasePreview.ruleMessage}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
