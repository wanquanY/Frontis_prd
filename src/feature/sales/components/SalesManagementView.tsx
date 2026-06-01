import { useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select, TreeSelect, message } from "antd";

import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { FrontisWebUserItem, OrganizationDepartmentItem } from "@/pages/types";

import {
  getOccupiedSalesLeadCodeCount,
  getRedeemedSalesLeadCodeCount,
  getSalesChannelRechargeRecords,
  getSalesLeadCodesByChannel,
  getSalesMemberCodesByTenant,
  resolveTenantMainContractCode,
  upsertSalesMemberCode,
} from "../salesService";
import type { SalesLeadCode, SalesMemberCode, SalesMemberCodeInput } from "../types";
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

type SalesManagementTabKey = "memberCodes" | "rechargeRecords" | "usageRecords";

const SALES_MANAGEMENT_TABS: Array<{ key: SalesManagementTabKey; label: string }> = [
  { key: "memberCodes", label: "销售个人码" },
  { key: "rechargeRecords", label: "分配记录" },
  { key: "usageRecords", label: "消耗记录" },
];

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

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");

const formatAmount = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;

const getLeadCodeStatusLabel = (status: SalesLeadCode["status"]): string => {
  if (status === "used") {
    return "已使用";
  }

  if (status === "invalid") {
    return "已失效";
  }

  return "未使用";
};

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
  const [activeTab, setActiveTab] = useState<SalesManagementTabKey>("memberCodes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<SalesMemberCode | null>(null);
  const [form, setForm] = useState<SalesMemberCodeForm>(() => createInitialForm());

  const userTreeData = useMemo(() => buildUserTree(departments, users), [departments, users]);
  const activeCodeCount = memberCodes.filter(item => item.status === "active").length;
  const salesLeadCodes = tenantMainCode ? getSalesLeadCodesByChannel(tenantMainCode.code) : [];
  const rechargeRecords = getSalesChannelRechargeRecords(tenantMainCode);
  const totalCodeQuota = tenantMainCode?.codeQuota ?? 0;
  const occupiedCodeCount = tenantMainCode ? getOccupiedSalesLeadCodeCount(tenantMainCode.code) : 0;
  const redeemedCodeCount = tenantMainCode ? getRedeemedSalesLeadCodeCount(tenantMainCode.code) : 0;
  const remainingCodeCount = Math.max(totalCodeQuota - occupiedCodeCount, 0);

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
          <div className={styles.summaryLabel}>分配席位总数</div>
          <div className={styles.summaryValue}>{formatNumber(totalCodeQuota)}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>剩余席位</div>
          <div className={styles.summaryValue}>{formatNumber(remainingCodeCount)}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>已核销席位</div>
          <div className={styles.summaryValue}>{formatNumber(redeemedCodeCount)}</div>
        </div>
      </section>

      <div className={styles.tabs}>
        {SALES_MANAGEMENT_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "memberCodes" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>销售个人码</h2>
            <span className={styles.sectionMeta}>
              渠道总码：{tenantMainCode?.code ?? "未配置"} · 启用中销售：{activeCodeCount}
            </span>
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
      ) : null}

      {activeTab === "rechargeRecords" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>席位分配记录</h2>
          </div>

          {rechargeRecords.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>操作类型</th>
                    <th>本次席位</th>
                    <th>分配后总席位</th>
                    <th>每席优惠</th>
                    <th>操作时间</th>
                  </tr>
                </thead>
                <tbody>
                  {rechargeRecords.map(record => (
                    <tr key={record.id}>
                      <td>{record.title}</td>
                      <td>{record.quantity ? `+${formatNumber(record.quantity)}` : "-"}</td>
                      <td>{formatNumber(record.codeQuota)}</td>
                      <td>{formatAmount(record.unitPriceAmount)}</td>
                      <td>{record.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyPanel}>暂无席位分配记录</div>
          )}
        </section>
      ) : null}

      {activeTab === "usageRecords" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>渠道码消耗记录</h2>
          </div>

          {salesLeadCodes.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>渠道码</th>
                    <th>销售人员</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>使用时间</th>
                    <th>客户租户</th>
                    <th>席位</th>
                    <th>订单金额</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLeadCodes.map(record => {
                    const isUsed = record.status === "used";

                    return (
                      <tr key={record.id}>
                        <td className={styles.codeCell}>{record.fullCode}</td>
                        <td>{record.memberName}</td>
                        <td
                          className={
                            record.status === "used"
                              ? styles.statusActive
                              : record.status === "invalid"
                                ? styles.statusDanger
                                : styles.statusWarning
                          }
                        >
                          {getLeadCodeStatusLabel(record.status)}
                        </td>
                        <td>{record.createdAt}</td>
                        <td>{isUsed ? (record.usedAt ?? "-") : "-"}</td>
                        <td>{isUsed ? (record.customerTenantName ?? "-") : "-"}</td>
                        <td>{record.seatCount ? `${record.seatCount} 席` : "-"}</td>
                        <td>{isUsed && record.amount ? formatAmount(record.amount) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyPanel}>暂无渠道码消耗记录</div>
          )}
        </section>
      ) : null}

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
