import { Fragment, useEffect, useMemo, useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockTenantManagementSnapshot,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";
import type { OperationsTenant } from "@/feature/operations/types";
import {
  getMockSubscriptionPlanPurchaseOption,
  getMockTenantActiveSubscriptionBillingCycle,
  getMockTenantActiveSubscriptionContractCode,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
  MockSalesChannelContractSubCode,
  MockSubscriptionBillingCycle,
  MockSubscriptionPlanPurchaseOption,
} from "@/feature/subscription/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsBillingConsole.module.less";

type BillingTabKey = "contractCodes" | "tenantSubscriptions";

interface TenantPlanEditorState {
  billingCycle: MockSubscriptionBillingCycle;
  contractCode: string;
  open: boolean;
  seatCount: number;
  tenantId?: string;
}

interface ContractCodeFormState {
  channelName: string;
  code: string;
  ownerName: string;
  serviceLabel: string;
  status: MockSalesChannelContractCode["status"];
  subCodes: MockSalesChannelContractSubCode[];
}

interface ContractCodeEditorState {
  form: ContractCodeFormState;
  mode: "create" | "edit";
  open: boolean;
  originalCode?: string;
}

interface ContractSubCodeEditorState {
  form: MockSalesChannelContractSubCode;
  mode: "create" | "edit";
  open: boolean;
  originalCode?: string;
  parentCode?: string;
}

interface OperationsBillingConsoleProps {
  embedded?: boolean;
  salesChannelContractCodes: MockSalesChannelContractCode[];
  tenants: OperationsTenant[];
  onApplyTenantSubscriptionPlan: (
    tenantId: string,
    purchaseOption: MockSubscriptionPlanPurchaseOption,
  ) => boolean;
  onCreateSalesChannelContractCode: (payload: MockSalesChannelContractCodeInput) => void;
  onUpdateSalesChannelContractCode: (
    code: string,
    updates: Partial<MockSalesChannelContractCodeInput>,
  ) => void;
}

interface TenantBillingRecord {
  snapshot: MockTenantManagementSnapshot | null;
  tenant: OperationsTenant;
}

const BILLING_TABS: Array<{ key: BillingTabKey; label: string }> = [
  { key: "contractCodes", label: "签约码" },
  { key: "tenantSubscriptions", label: "租户订阅" },
];

const formatAmount = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;
const SUBSCRIPTION_TODAY = "2026-05-25";

const buildStatusClassName = (tone?: "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const getLatestSubscriptionOrder = (
  snapshot: MockTenantManagementSnapshot | null,
): MockTenantSubscriptionOrderItem | null =>
  snapshot?.subscriptionOrders.find(order => order.status === "paid") ?? null;

const getTenantSubscriptionStatus = (
  snapshot: MockTenantManagementSnapshot | null,
): { label: string; tone?: "success" | "warning" | "danger" } => {
  if (!snapshot || snapshot.edition === "personal" || !snapshot.subscriptionOrders.length) {
    return { label: "未开通", tone: "warning" };
  }

  if (snapshot.planExpiresAt && snapshot.planExpiresAt < SUBSCRIPTION_TODAY) {
    return { label: "已到期", tone: "danger" };
  }

  return { label: "有效", tone: "success" };
};

const createTenantPlanEditor = (tenantId?: string): TenantPlanEditorState => ({
  billingCycle: "monthly",
  contractCode: "",
  open: Boolean(tenantId),
  seatCount: 1,
  tenantId,
});

const createEmptyContractCodeForm = (): ContractCodeFormState => ({
  channelName: "",
  code: "",
  ownerName: "",
  serviceLabel: "",
  status: "active",
  subCodes: [],
});

const createContractCodeEditor = (): ContractCodeEditorState => ({
  form: createEmptyContractCodeForm(),
  mode: "create",
  open: false,
});

const createContractCodeFormFromCode = (
  contractCode: MockSalesChannelContractCode,
): ContractCodeFormState => ({
  channelName: contractCode.channelName,
  code: contractCode.code,
  ownerName: contractCode.ownerName,
  serviceLabel: contractCode.serviceLabel,
  status: contractCode.status,
  subCodes: contractCode.subCodes.map(item => ({ ...item })),
});

const createEmptyContractSubCode = (): MockSalesChannelContractSubCode => ({
  code: "",
  ownerName: "",
  serviceLabel: "",
  status: "active",
});

const createContractSubCodeEditor = (): ContractSubCodeEditorState => ({
  form: createEmptyContractSubCode(),
  mode: "create",
  open: false,
});

const normalizeContractCodeForm = (
  form: ContractCodeFormState,
): MockSalesChannelContractCodeInput => ({
  channelName: form.channelName.trim(),
  code: form.code.trim().toUpperCase(),
  ownerName: form.ownerName.trim(),
  serviceLabel: form.serviceLabel.trim(),
  status: form.status,
  subCodes: form.subCodes
    .map(item => ({
      code: item.code.trim().toUpperCase(),
      ownerName: item.ownerName?.trim() || undefined,
      serviceLabel: item.serviceLabel?.trim() || undefined,
      status: item.status,
    }))
    .filter(item => Boolean(item.code)),
});

const normalizeContractSubCodeForm = (
  form: MockSalesChannelContractSubCode,
): MockSalesChannelContractSubCode => ({
  code: form.code.trim().toUpperCase(),
  ownerName: form.ownerName?.trim() || undefined,
  serviceLabel: form.serviceLabel?.trim() || undefined,
  status: form.status,
});

/**
 * 运营后台订阅运营控制台，承载团队席位包、签约码策略和租户订阅开通。
 */
export const OperationsBillingConsole = ({
  embedded = false,
  salesChannelContractCodes,
  tenants,
  onApplyTenantSubscriptionPlan,
  onCreateSalesChannelContractCode,
  onUpdateSalesChannelContractCode,
}: OperationsBillingConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<BillingTabKey>("contractCodes");
  const [tenantPlanEditor, setTenantPlanEditor] =
    useState<TenantPlanEditorState>(createTenantPlanEditor());
  const [contractCodeEditor, setContractCodeEditor] = useState<ContractCodeEditorState>(
    createContractCodeEditor(),
  );
  const [contractSubCodeEditor, setContractSubCodeEditor] = useState<ContractSubCodeEditorState>(
    createContractSubCodeEditor(),
  );
  const [expandedContractCode, setExpandedContractCode] = useState<string>("");
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
  const lockedTenantBillingCycle = getMockTenantActiveSubscriptionBillingCycle(
    selectedTenantRecord?.snapshot,
  );
  const lockedTenantContractCode = getMockTenantActiveSubscriptionContractCode(
    selectedTenantRecord?.snapshot,
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
  const contractCodeForm = contractCodeEditor.form;
  const contractSubCodeForm = contractSubCodeEditor.form;

  useEffect(() => {
    if (!tenantPlanEditor.open || !lockedTenantBillingCycle) {
      return;
    }

    setTenantPlanEditor(current => ({
      ...current,
      billingCycle: lockedTenantBillingCycle,
      contractCode: lockedTenantContractCode,
    }));
  }, [
    lockedTenantBillingCycle,
    lockedTenantContractCode,
    tenantPlanEditor.open,
    tenantPlanEditor.tenantId,
  ]);

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

  const handleOpenAddContractSubCode = (contractCode: MockSalesChannelContractCode): void => {
    setExpandedContractCode(contractCode.code);
    setContractSubCodeEditor({
      form: createEmptyContractSubCode(),
      mode: "create",
      open: true,
      parentCode: contractCode.code,
    });
  };

  const handleOpenEditContractSubCode = (
    contractCode: MockSalesChannelContractCode,
    subCode: MockSalesChannelContractSubCode,
  ): void => {
    setExpandedContractCode(contractCode.code);
    setContractSubCodeEditor({
      form: { ...subCode },
      mode: "edit",
      open: true,
      originalCode: subCode.code,
      parentCode: contractCode.code,
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

  const handleUpdateContractSubCodeForm = (
    patch: Partial<MockSalesChannelContractSubCode>,
  ): void => {
    setContractSubCodeEditor(current => ({
      ...current,
      form: {
        ...current.form,
        ...patch,
      },
    }));
  };

  const handleSubmitContractSubCode = (): void => {
    const parentCode = contractSubCodeEditor.parentCode;
    const parent = salesChannelContractCodes.find(item => item.code === parentCode);
    const payload = normalizeContractSubCodeForm(contractSubCodeEditor.form);

    if (!parentCode || !parent) {
      message.error("主签约码不存在。");
      return;
    }

    if (!payload.code) {
      message.warning("请填写子码。");
      return;
    }

    const existingCodes = new Set(
      salesChannelContractCodes.flatMap(item => [
        item.code,
        ...item.subCodes
          .filter(
            subCode =>
              !(
                contractSubCodeEditor.mode === "edit" &&
                item.code === parentCode &&
                subCode.code === contractSubCodeEditor.originalCode
              ),
          )
          .map(subCode => subCode.code),
      ]),
    );

    if (existingCodes.has(payload.code)) {
      message.warning("签约码已存在。");
      return;
    }

    const nextSubCodes =
      contractSubCodeEditor.mode === "edit"
        ? parent.subCodes.map(subCode =>
            subCode.code === contractSubCodeEditor.originalCode ? payload : subCode,
          )
        : [...parent.subCodes, payload];

    onUpdateSalesChannelContractCode(parent.code, {
      ...parent,
      subCodes: nextSubCodes,
    });
    setExpandedContractCode(parent.code);
    setContractSubCodeEditor(createContractSubCodeEditor());
    message.success(contractSubCodeEditor.mode === "edit" ? "子码已更新。" : "子码已创建。");
  };

  const handleRemoveContractSubCode = (
    contractCode: MockSalesChannelContractCode,
    subCode: MockSalesChannelContractSubCode,
  ): void => {
    Modal.confirm({
      title: "删除子码",
      content: subCode.code,
      okButtonProps: { danger: true },
      okText: "删除",
      onOk: () => {
        onUpdateSalesChannelContractCode(contractCode.code, {
          ...contractCode,
          subCodes: contractCode.subCodes.filter(item => item.code !== subCode.code),
        });
        message.success("子码已删除。");
      },
    });
  };

  const handleSubmitContractCode = (): void => {
    const payload = normalizeContractCodeForm(contractCodeEditor.form);

    if (!payload.code || !payload.ownerName) {
      message.warning("请填写签约码和负责人。");
      return;
    }

    const currentCodeValues = [payload.code, ...payload.subCodes.map(item => item.code)];
    const hasDuplicateInsidePayload = currentCodeValues.some(
      (code, index) => currentCodeValues.indexOf(code) !== index,
    );

    if (hasDuplicateInsidePayload) {
      message.warning("主码和子码不能重复。");
      return;
    }

    const existingCodes = new Set(
      salesChannelContractCodes
        .filter(
          item =>
            contractCodeEditor.mode === "create" || item.code !== contractCodeEditor.originalCode,
        )
        .flatMap(item => [item.code, ...item.subCodes.map(subCode => subCode.code)]),
    );
    const isDuplicateCode = currentCodeValues.some(code => existingCodes.has(code));

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

  const renderContractSubCodePanel = (contractCode: MockSalesChannelContractCode): JSX.Element => (
    <tr className={styles.subCodePanelRow}>
      <td colSpan={6}>
        <div className={styles.subCodePanel}>
          <div className={styles.subCodePanelHeader}>
            <h3 className={styles.subCodePanelTitle}>{contractCode.code} 子码</h3>
            <Button size="small" onClick={() => handleOpenAddContractSubCode(contractCode)}>
              新建子码
            </Button>
          </div>
          {contractCode.subCodes.length ? (
            <div className={styles.subCodeTableWrap}>
              <table className={styles.subCodeTable}>
                <thead>
                  <tr>
                    <th>子码</th>
                    <th>负责人</th>
                    <th>使用介绍</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {contractCode.subCodes.map(subCode => (
                    <tr key={subCode.code}>
                      <td className={adminStyles.consoleHtmlTableStrong}>{subCode.code}</td>
                      <td>{subCode.ownerName || contractCode.ownerName}</td>
                      <td>{subCode.serviceLabel || contractCode.serviceLabel}</td>
                      <td>
                        <span
                          className={buildStatusClassName(
                            subCode.status === "active" ? "success" : "danger",
                          )}
                        >
                          {subCode.status === "active" ? "启用" : "停用"}
                        </span>
                      </td>
                      <td>
                        <div className={adminStyles.consoleActions}>
                          <Button
                            size="small"
                            onClick={() => handleOpenEditContractSubCode(contractCode, subCode)}
                          >
                            编辑
                          </Button>
                          <Button
                            danger
                            size="small"
                            onClick={() => handleRemoveContractSubCode(contractCode, subCode)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.subCodeEmpty}>
              <Empty description="暂无子码" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  const renderContractCodes = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <h2 className={adminStyles.consoleSectionTitle}>签约码列表</h2>
        <Button type="primary" onClick={handleOpenCreateContractCode}>
          新建签约码
        </Button>
      </div>
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>主签约码</th>
              <th>子码</th>
              <th>负责人</th>
              <th>使用介绍</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {salesChannelContractCodes.map(item => (
              <Fragment key={item.code}>
                <tr>
                  <td className={adminStyles.consoleHtmlTableStrong}>{item.code}</td>
                  <td>
                    {item.subCodes.length ? (
                      <div className={styles.subCodePillList}>
                        {item.subCodes.map(subCode => (
                          <button
                            key={subCode.code}
                            type="button"
                            className={classNames(
                              adminStyles.consolePill,
                              styles.subCodePillButton,
                              subCode.status === "inactive" && styles.inactiveSubCodePill,
                            )}
                            onClick={() =>
                              setExpandedContractCode(current =>
                                current === item.code ? "" : item.code,
                              )
                            }
                          >
                            {subCode.code}
                          </button>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
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
                    <div className={adminStyles.consoleActions}>
                      <Button
                        size="small"
                        onClick={() =>
                          setExpandedContractCode(current =>
                            current === item.code ? "" : item.code,
                          )
                        }
                      >
                        {expandedContractCode === item.code ? "收起子码" : "子码列表"}
                      </Button>
                      <Button size="small" onClick={() => handleOpenAddContractSubCode(item)}>
                        添加子码
                      </Button>
                      <Button size="small" onClick={() => handleOpenEditContractCode(item)}>
                        编辑
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedContractCode === item.code ? renderContractSubCodePanel(item) : null}
              </Fragment>
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
              <th>当前计划</th>
              <th>席位</th>
              <th>付费周期</th>
              <th>最近订单</th>
              <th>签约码</th>
              <th>负责人</th>
              <th>到期时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tenantBillingRecords.map(item => {
              const latestOrder = getLatestSubscriptionOrder(item.snapshot);
              const subscriptionStatus = getTenantSubscriptionStatus(item.snapshot);
              const isPointsBilling = item.snapshot?.billingMode !== "cost";

              return (
                <tr key={item.tenant.id}>
                  <td>
                    <strong>{item.tenant.name}</strong>
                    <div className={adminStyles.consoleSectionMeta}>{item.tenant.adminName}</div>
                  </td>
                  <td>{item.snapshot?.planLabel ?? "个人版"}</td>
                  <td>
                    {item.snapshot?.usedSeats ?? item.tenant.members.length}/
                    {item.snapshot?.totalSeats ?? item.tenant.seatCount}
                  </td>
                  <td>{latestOrder?.billingCycleLabel ?? "-"}</td>
                  <td>
                    {latestOrder ? (
                      <span className={adminStyles.consoleHtmlTableStrong}>
                        {latestOrder.orderNo}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{latestOrder?.contractCode ?? "-"}</td>
                  <td>{latestOrder?.ownerName ?? "-"}</td>
                  <td>{item.snapshot?.planExpiresAt ?? "-"}</td>
                  <td>
                    <span className={buildStatusClassName(subscriptionStatus.tone)}>
                      {subscriptionStatus.label}
                    </span>
                  </td>
                  <td>
                    {isPointsBilling ? (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => setTenantPlanEditor(createTenantPlanEditor(item.tenant.id))}
                      >
                        购买/追加席位
                      </Button>
                    ) : (
                      <span className={adminStyles.consoleSidebarItemMeta}>不支持</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActiveContent = (): JSX.Element => {
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
            <span>使用介绍</span>
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              value={contractCodeForm.serviceLabel}
              onChange={event => handleUpdateContractCodeForm({ serviceLabel: event.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={contractSubCodeEditor.open}
        title={contractSubCodeEditor.mode === "edit" ? "编辑子码" : "新建子码"}
        width={560}
        onCancel={() => setContractSubCodeEditor(createContractSubCodeEditor())}
        onOk={handleSubmitContractSubCode}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>主签约码</span>
              <Input disabled value={contractSubCodeEditor.parentCode ?? ""} />
            </div>
            <div className={styles.modalField}>
              <span>子码</span>
              <Input
                value={contractSubCodeForm.code}
                onChange={event => handleUpdateContractSubCodeForm({ code: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>负责人</span>
              <Input
                value={contractSubCodeForm.ownerName}
                onChange={event =>
                  handleUpdateContractSubCodeForm({ ownerName: event.target.value })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>状态</span>
              <Select<MockSalesChannelContractSubCode["status"]>
                value={contractSubCodeForm.status}
                options={[
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                ]}
                onChange={status => handleUpdateContractSubCodeForm({ status })}
              />
            </div>
          </div>
          <div className={styles.modalField}>
            <span>使用介绍</span>
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              value={contractSubCodeForm.serviceLabel}
              onChange={event =>
                handleUpdateContractSubCodeForm({ serviceLabel: event.target.value })
              }
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
              onChange={tenantId => {
                const nextRecord = tenantBillingRecords.find(item => item.tenant.id === tenantId);
                const nextBillingCycle = getMockTenantActiveSubscriptionBillingCycle(
                  nextRecord?.snapshot,
                );
                const nextContractCode = getMockTenantActiveSubscriptionContractCode(
                  nextRecord?.snapshot,
                );

                setTenantPlanEditor(current => ({
                  ...current,
                  tenantId,
                  billingCycle: nextBillingCycle ?? current.billingCycle,
                  contractCode: nextContractCode,
                }));
              }}
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
                disabled={Boolean(lockedTenantBillingCycle)}
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
                <span>签约码</span>
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
              {purchasePreview.prorationLabel ? (
                <div className={styles.previewRow}>
                  <span>计费周期</span>
                  <strong>{purchasePreview.prorationLabel}</strong>
                </div>
              ) : null}
              {purchasePreview.ownerName ? (
                <div className={styles.previewRow}>
                  <span>签约负责人</span>
                  <strong>{purchasePreview.ownerName}</strong>
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
