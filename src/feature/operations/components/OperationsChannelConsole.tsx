import { useMemo, useState } from "react";

import { Button, Input, InputNumber, Modal, Select, TreeSelect, message } from "antd";
import classNames from "classnames";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type { OperationsTenant } from "@/feature/operations/types";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
} from "@/feature/subscription/types";
import { INITIAL_ORGANIZATION_DEPARTMENTS } from "@/mocks/mockData";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";
import type { FrontisWebUserItem, OrganizationDepartmentItem } from "@/pages/types";

import styles from "./OperationsBillingConsole.module.less";

interface ChannelFormState {
  channelName: string;
  ownerName: string;
  ownerPhone: string;
  salesMemberId: string;
  status: MockSalesChannelContractCode["status"];
  tenantId: string;
}

interface AppendCodeFormState {
  appendCodeQuantity: number;
  unitPriceAmount: number | null;
}

interface ChannelEditorState {
  form: ChannelFormState;
  mode: "create" | "edit";
  open: boolean;
  originalCode?: string;
}

interface AppendCodeEditorState {
  channelCode?: string;
  form: AppendCodeFormState;
  open: boolean;
}

interface SalesMemberOption {
  user: FrontisWebUserItem;
}

interface SalesMemberTreeNode {
  children?: SalesMemberTreeNode[];
  selectable?: boolean;
  title: string;
  value: string;
}

interface OperationsChannelConsoleProps {
  salesChannelContractCodes: MockSalesChannelContractCode[];
  tenants: OperationsTenant[];
  onCreateSalesChannelContractCode: (payload: MockSalesChannelContractCodeInput) => void;
  onUpdateSalesChannelContractCode: (
    code: string,
    updates: Partial<MockSalesChannelContractCodeInput>,
  ) => void;
}

const FALLBACK_TENANT_ID = "tenant-enterprise-demo";

const createEmptyChannelForm = (): ChannelFormState => ({
  channelName: "",
  ownerName: "",
  ownerPhone: "",
  salesMemberId: "",
  status: "active",
  tenantId: "",
});

const createChannelEditor = (): ChannelEditorState => ({
  form: createEmptyChannelForm(),
  mode: "create",
  open: false,
});

const createAppendCodeEditor = (): AppendCodeEditorState => ({
  form: {
    appendCodeQuantity: 1,
    unitPriceAmount: null,
  },
  open: false,
});

const normalizeContractCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const buildChannelCode = (channelName: string): string => {
  const normalizedName = normalizeContractCode(channelName);
  const suffix = `${Date.now()}`.slice(-4);
  const prefix = `${normalizedName || "QD"}`.slice(0, 2).padEnd(2, "0");

  return `${prefix}${suffix}`;
};

const createChannelFormFromCode = (
  contractCode: MockSalesChannelContractCode,
): ChannelFormState => ({
  channelName: contractCode.channelName,
  ownerName: contractCode.ownerName,
  ownerPhone: contractCode.ownerPhone ?? "",
  salesMemberId: contractCode.salesMemberId ?? "",
  status: contractCode.status,
  tenantId: contractCode.tenantId ?? "",
});

const buildStatusClassName = (tone?: "success" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const buildSalesMemberTree = (
  departments: OrganizationDepartmentItem[],
  users: FrontisWebUserItem[],
): SalesMemberTreeNode[] => {
  const buildDepartmentNode = (department: OrganizationDepartmentItem): SalesMemberTreeNode => {
    const childDepartments = departments.filter(item => item.parentId === department.id);
    const departmentUsers = users.filter(user => user.departmentId === department.id);

    return {
      title: department.name,
      value: `department:${department.id}`,
      selectable: false,
      children: [
        ...childDepartments.map(buildDepartmentNode),
        ...departmentUsers.map(user => ({
          title: user.name,
          value: user.id,
        })),
      ],
    };
  };

  return departments.filter(item => item.parentId === null).map(buildDepartmentNode);
};

/**
 * 运营后台渠道管理，承载渠道建档、租户绑定、销售绑定和渠道码维护。
 */
export const OperationsChannelConsole = ({
  salesChannelContractCodes,
  tenants,
  onCreateSalesChannelContractCode,
  onUpdateSalesChannelContractCode,
}: OperationsChannelConsoleProps): JSX.Element => {
  const { activeIdentity } = useMockAuth();
  const [channelEditor, setChannelEditor] = useState<ChannelEditorState>(createChannelEditor());
  const [appendCodeEditor, setAppendCodeEditor] =
    useState<AppendCodeEditorState>(createAppendCodeEditor());
  const channelForm = channelEditor.form;
  const appendCodeForm = appendCodeEditor.form;
  const selectedTenant = tenants.find(item => item.id === channelForm.tenantId);
  const appendTargetChannel = salesChannelContractCodes.find(
    item => item.code === appendCodeEditor.channelCode,
  );
  const organizationSnapshot = useMemo(
    () =>
      getMockTenantManagementSnapshot(activeIdentity?.tenantId) ??
      getMockTenantManagementSnapshot(FALLBACK_TENANT_ID),
    [activeIdentity?.tenantId],
  );
  const organizationUsers = organizationSnapshot?.users ?? [];
  const salesMemberOptions = useMemo<SalesMemberOption[]>(
    () => organizationUsers.map(user => ({ user })),
    [organizationUsers],
  );
  const selectedSalesMember = salesMemberOptions.find(
    item => item.user.id === channelForm.salesMemberId,
  );
  const salesTreeData = useMemo(
    () => buildSalesMemberTree(INITIAL_ORGANIZATION_DEPARTMENTS, organizationUsers),
    [organizationUsers],
  );

  const handleUpdateChannelForm = (patch: Partial<ChannelFormState>): void => {
    setChannelEditor(current => ({
      ...current,
      form: {
        ...current.form,
        ...patch,
      },
    }));
  };

  const handleOpenCreateChannel = (): void => {
    setChannelEditor({
      form: createEmptyChannelForm(),
      mode: "create",
      open: true,
    });
  };

  const handleOpenEditChannel = (contractCode: MockSalesChannelContractCode): void => {
    setChannelEditor({
      form: createChannelFormFromCode(contractCode),
      mode: "edit",
      open: true,
      originalCode: contractCode.code,
    });
  };

  const handleOpenAppendCode = (contractCode: MockSalesChannelContractCode): void => {
    setAppendCodeEditor({
      channelCode: contractCode.code,
      form: {
        appendCodeQuantity: 1,
        unitPriceAmount: contractCode.unitPriceAmount > 0 ? contractCode.unitPriceAmount : null,
      },
      open: true,
    });
  };

  const handleSubmitChannel = (): void => {
    if (!channelForm.channelName.trim()) {
      message.warning("请填写渠道名称。");
      return;
    }

    if (!channelForm.ownerName.trim() || !channelForm.ownerPhone.trim()) {
      message.warning("请填写渠道负责人姓名和手机号。");
      return;
    }

    if (!channelForm.tenantId) {
      message.warning("请选择关联租户。");
      return;
    }

    if (!channelForm.salesMemberId || !selectedSalesMember) {
      message.warning("请选择关联销售。");
      return;
    }

    const originalCode = channelEditor.originalCode;
    const currentCode =
      channelEditor.mode === "edit" && originalCode
        ? originalCode
        : buildChannelCode(channelForm.channelName);
    if (channelEditor.mode === "edit" && originalCode) {
      onUpdateSalesChannelContractCode(originalCode, {
        channelName: channelForm.channelName.trim(),
        ownerName: channelForm.ownerName.trim(),
        ownerPhone: channelForm.ownerPhone.trim(),
        salesMemberId: selectedSalesMember.user.id,
        salesMemberName: selectedSalesMember.user.name,
        salesMemberPhone: selectedSalesMember.user.phone,
        serviceLabel: selectedTenant?.name ?? "",
        status: channelForm.status,
        tenantId: selectedTenant?.id,
        tenantName: selectedTenant?.name,
      });
      message.success("渠道已更新。");
    } else {
      const payload: MockSalesChannelContractCodeInput = {
        code: currentCode,
        channelName: channelForm.channelName.trim(),
        discountFactor: 1,
        codeQuota: 0,
        ownerName: channelForm.ownerName.trim(),
        ownerPhone: channelForm.ownerPhone.trim(),
        priceVersions: [],
        salesMemberId: selectedSalesMember.user.id,
        salesMemberName: selectedSalesMember.user.name,
        salesMemberPhone: selectedSalesMember.user.phone,
        serviceLabel: selectedTenant?.name ?? "",
        status: channelForm.status,
        tenantId: selectedTenant?.id,
        tenantName: selectedTenant?.name,
        unitPriceAmount: 0,
      };

      onCreateSalesChannelContractCode(payload);
      message.success("渠道已创建。");
    }

    setChannelEditor(createChannelEditor());
  };

  const handleSubmitAppendCode = (): void => {
    if (!appendTargetChannel) {
      message.warning("请选择要追加码数的渠道。");
      return;
    }

    if (appendCodeForm.appendCodeQuantity <= 0) {
      message.warning("请填写追加码数量。");
      return;
    }

    if (appendCodeForm.unitPriceAmount === null || appendCodeForm.unitPriceAmount < 0) {
      message.warning("请设置有效的每席优惠金额。");
      return;
    }

    onUpdateSalesChannelContractCode(appendTargetChannel.code, {
      codeQuota: appendTargetChannel.codeQuota + appendCodeForm.appendCodeQuantity,
      unitPriceAmount: appendCodeForm.unitPriceAmount,
    });
    setAppendCodeEditor(createAppendCodeEditor());
    message.success("码数已追加。");
  };

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>渠道管理</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <h2 className={adminStyles.consoleSectionTitle}>渠道列表</h2>
          <Button type="primary" onClick={handleOpenCreateChannel}>
            新建渠道
          </Button>
        </div>
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>渠道名称</th>
                <th>渠道负责人</th>
                <th>手机号</th>
                <th>关联租户</th>
                <th>关联销售</th>
                <th>码数量</th>
                <th>每席优惠</th>
                <th>渠道码</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {salesChannelContractCodes.map(item => (
                <tr key={item.code}>
                  <td className={adminStyles.consoleHtmlTableStrong}>{item.channelName}</td>
                  <td>{item.ownerName}</td>
                  <td>{item.ownerPhone || "-"}</td>
                  <td>{item.tenantName || "-"}</td>
                  <td>{item.salesMemberName || "-"}</td>
                  <td>{item.codeQuota}</td>
                  <td>
                    {item.unitPriceAmount > 0
                      ? `¥${item.unitPriceAmount.toLocaleString("zh-CN")}`
                      : "-"}
                  </td>
                  <td>{item.code}</td>
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
                      <Button size="small" onClick={() => handleOpenEditChannel(item)}>
                        编辑
                      </Button>
                      <Button size="small" onClick={() => handleOpenAppendCode(item)}>
                        追加码数
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={channelEditor.open}
        title={channelEditor.mode === "edit" ? "编辑渠道" : "新建渠道"}
        width={680}
        onCancel={() => setChannelEditor(createChannelEditor())}
        onOk={handleSubmitChannel}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>渠道名称</span>
              <Input
                value={channelForm.channelName}
                onChange={event => handleUpdateChannelForm({ channelName: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>渠道负责人姓名</span>
              <Input
                value={channelForm.ownerName}
                onChange={event => handleUpdateChannelForm({ ownerName: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>渠道负责人手机号</span>
              <Input
                value={channelForm.ownerPhone}
                onChange={event => handleUpdateChannelForm({ ownerPhone: event.target.value })}
              />
            </div>
            <div className={styles.modalField}>
              <span>关联租户</span>
              <Select
                showSearch
                value={channelForm.tenantId || undefined}
                optionFilterProp="label"
                options={tenants.map(tenant => ({
                  value: tenant.id,
                  label: tenant.name,
                }))}
                onChange={tenantId =>
                  handleUpdateChannelForm({
                    tenantId,
                  })
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>关联销售</span>
              <TreeSelect
                showSearch
                treeDefaultExpandAll
                value={channelForm.salesMemberId || undefined}
                treeData={salesTreeData}
                onChange={salesMemberId => handleUpdateChannelForm({ salesMemberId })}
              />
            </div>
            <div className={styles.modalField}>
              <span>状态</span>
              <Select<MockSalesChannelContractCode["status"]>
                value={channelForm.status}
                options={[
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                ]}
                onChange={status => handleUpdateChannelForm({ status })}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={appendCodeEditor.open}
        title={`追加码数${appendTargetChannel ? ` · ${appendTargetChannel.channelName}` : ""}`}
        width={560}
        onCancel={() => setAppendCodeEditor(createAppendCodeEditor())}
        onOk={handleSubmitAppendCode}
        destroyOnHidden
      >
        <div className={styles.modalStack}>
          <div className={styles.formGrid}>
            <div className={styles.modalField}>
              <span>当前码数量</span>
              <InputNumber
                className={styles.fullWidthInput}
                disabled
                value={appendTargetChannel?.codeQuota ?? 0}
              />
            </div>
            <div className={styles.modalField}>
              <span>追加码数量</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={1}
                precision={0}
                value={appendCodeForm.appendCodeQuantity}
                onChange={value =>
                  setAppendCodeEditor(current => ({
                    ...current,
                    form: {
                      ...current.form,
                      appendCodeQuantity: value ?? 1,
                    },
                  }))
                }
              />
            </div>
            <div className={styles.modalField}>
              <span>本次每席优惠</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                precision={0}
                addonBefore="¥"
                placeholder={
                  appendTargetChannel?.unitPriceAmount ? undefined : "请填写每席优惠金额"
                }
                value={appendCodeForm.unitPriceAmount}
                onChange={value =>
                  setAppendCodeEditor(current => ({
                    ...current,
                    form: {
                      ...current.form,
                      unitPriceAmount: value ?? null,
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
