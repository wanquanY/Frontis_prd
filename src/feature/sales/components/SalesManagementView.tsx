import { useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select, TreeSelect, message } from "antd";

import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { FrontisWebUserItem, OrganizationDepartmentItem } from "@/pages/types";

import {
  getSalesMemberCodesByTenant,
  resolveTenantMainContractCode,
  upsertSalesMemberCode,
} from "../salesService";
import type { SalesMemberCode, SalesMemberCodeInput } from "../types";
import styles from "./SalesViews.module.less";

interface SalesManagementViewProps {
  departments: OrganizationDepartmentItem[];
  tenantSnapshot: MockTenantManagementSnapshot;
  users: FrontisWebUserItem[];
}

interface SalesMemberCodeForm {
  memberId: string;
  memberCode: string;
  status: SalesMemberCode["status"];
}

interface UserTreeNode {
  children?: UserTreeNode[];
  disabled?: boolean;
  title: string;
  value: string;
}

const createInitialForm = (code?: SalesMemberCode | null): SalesMemberCodeForm => ({
  memberId: code?.memberId ?? "",
  memberCode: code?.memberCode ?? "",
  status: code?.status ?? "active",
});

const buildUserTree = (
  departments: OrganizationDepartmentItem[],
  users: FrontisWebUserItem[],
  parentId: string | null = null,
): UserTreeNode[] =>
  departments
    .filter(department => department.parentId === parentId)
    .map(department => {
      const childDepartments = buildUserTree(departments, users, department.id);
      const childUsers = users
        .filter(user => user.departmentId === department.id && user.status === "active")
        .map(user => ({
          title: user.name,
          value: user.id,
        }));

      return {
        title: department.name,
        value: `department-${department.id}`,
        disabled: true,
        children: [...childDepartments, ...childUsers],
      };
    });

/**
 * 企业管理后台销售管理，用于把租户内成员绑定为销售并生成销售个人码。
 */
export const SalesManagementView = ({
  departments,
  tenantSnapshot,
  users,
}: SalesManagementViewProps): JSX.Element => {
  const tenantMainCode = useMemo(
    () => resolveTenantMainContractCode(tenantSnapshot.tenantId),
    [tenantSnapshot.tenantId],
  );
  const [memberCodes, setMemberCodes] = useState<SalesMemberCode[]>(() =>
    getSalesMemberCodesByTenant(tenantSnapshot.tenantId),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<SalesMemberCode | null>(null);
  const [form, setForm] = useState<SalesMemberCodeForm>(() => createInitialForm());

  const userTreeData = useMemo(() => buildUserTree(departments, users), [departments, users]);
  const activeCodeCount = memberCodes.filter(item => item.status === "active").length;

  const handleOpenCreate = (): void => {
    setEditingCode(null);
    setForm(createInitialForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (code: SalesMemberCode): void => {
    setEditingCode(code);
    setForm(createInitialForm(code));
    setIsModalOpen(true);
  };

  const handleSubmit = (): void => {
    if (!tenantMainCode) {
      message.warning("当前租户还没有运营后台渠道总码，暂不能生成销售个人码。");
      return;
    }

    const selectedUser = users.find(user => user.id === form.memberId);

    if (!selectedUser) {
      message.warning("请选择要绑定的销售成员。");
      return;
    }

    const payload: SalesMemberCodeInput = {
      memberId: selectedUser.id,
      memberName: selectedUser.name,
      memberCode: form.memberCode,
      status: form.status,
    };
    const nextCodes = upsertSalesMemberCode(
      {
        tenantId: tenantSnapshot.tenantId,
        tenantName: tenantSnapshot.tenantName,
        tenantMainCode: tenantMainCode.code,
      },
      payload,
    );

    setMemberCodes(nextCodes.filter(item => item.tenantId === tenantSnapshot.tenantId));
    setIsModalOpen(false);
    message.success(editingCode ? "销售码已更新。" : "销售码已生成。");
  };

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <div className={styles.headerBody}>
          <p className={styles.eyebrow}>Sales management</p>
          <h1 className={styles.title}>销售管理</h1>
          <p className={styles.description}>
            绑定租户内成员并生成销售个人码，员工可在大观销售中生成客户渠道码。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          新建销售码
        </Button>
      </header>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>渠道总码</div>
          <div className={styles.summaryValue}>{tenantMainCode?.code ?? "未配置"}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>已绑定销售</div>
          <div className={styles.summaryValue}>{memberCodes.length}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>启用中销售码</div>
          <div className={styles.summaryValue}>{activeCodeCount}</div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>销售个人码</h2>
        </div>

        {memberCodes.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>销售成员</th>
                  <th>销售个人码</th>
                  <th>最终渠道码格式</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {memberCodes.map(code => (
                  <tr key={code.id}>
                    <td>{code.memberName}</td>
                    <td className={styles.codeCell}>{code.memberCode}</td>
                    <td className={styles.codeCell}>
                      {code.tenantMainCode}-{code.memberCode}-动态随机码
                    </td>
                    <td
                      className={
                        code.status === "active" ? styles.statusActive : styles.statusMuted
                      }
                    >
                      {code.status === "active" ? "启用" : "停用"}
                    </td>
                    <td>{code.updatedAt}</td>
                    <td>
                      <Button type="link" onClick={() => handleOpenEdit(code)}>
                        编辑
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyPanel}>暂无销售个人码</div>
        )}
      </section>

      <Modal
        destroyOnClose
        open={isModalOpen}
        title={editingCode ? "编辑销售码" : "新建销售码"}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
      >
        <div className={styles.formGrid}>
          <label className={`${styles.formItem} ${styles.fullWidth}`}>
            <span className={styles.formLabel}>关联成员</span>
            <TreeSelect
              disabled={Boolean(editingCode)}
              placeholder="请选择组织成员"
              treeData={userTreeData}
              value={form.memberId || undefined}
              onChange={memberId => setForm(current => ({ ...current, memberId }))}
            />
          </label>
          <label className={styles.formItem}>
            <span className={styles.formLabel}>销售个人码</span>
            <Input
              placeholder="不填则自动生成"
              value={form.memberCode}
              onChange={event =>
                setForm(current => ({ ...current, memberCode: event.target.value }))
              }
            />
          </label>
          <label className={styles.formItem}>
            <span className={styles.formLabel}>状态</span>
            <Select<SalesMemberCode["status"]>
              value={form.status}
              options={[
                { label: "启用", value: "active" },
                { label: "停用", value: "inactive" },
              ]}
              onChange={status => setForm(current => ({ ...current, status }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};
