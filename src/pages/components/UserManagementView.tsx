import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, Select, Tag, message } from "antd";

import type { FrontisUserRole } from "../types";
import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./FrontisWebViews.module.less";
import { getRoleLabel, getUserStatusLabel } from "./FrontisWebViews";
import type { UserManagementViewProps } from "./FrontisWebViews";

/**
 * 用户管理视图。
 */
export const UserManagementView = ({ employees, users }: UserManagementViewProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<FrontisUserRole | "all">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const employeeMap = useMemo(
    () => new Map(employees.map(item => [item.id, item.name])),
    [employees],
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(item => {
        const matchRole = roleFilter === "all" ? true : item.role === roleFilter;
        const normalizedKeyword = keyword.trim().toLowerCase();
        const matchKeyword =
          !normalizedKeyword ||
          [item.name, item.phone].join(" ").toLowerCase().includes(normalizedKeyword);
        return matchRole && matchKeyword;
      }),
    [keyword, roleFilter, users],
  );

  const selectedUser = useMemo(
    () => filteredUsers.find(item => item.id === selectedUserId) ?? filteredUsers[0] ?? null,
    [filteredUsers, selectedUserId],
  );

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId("");
      return;
    }
    if (filteredUsers.some(item => item.id === selectedUserId)) {
      return;
    }
    setSelectedUserId(filteredUsers[0].id);
  }, [filteredUsers, selectedUserId]);

  const adminCount = useMemo(() => users.filter(item => item.role === "admin").length, [users]);
  const disabledCount = useMemo(
    () => users.filter(item => item.status === "disabled").length,
    [users],
  );

  return (
    <div className={styles.view}>
      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>用户管理</span>
          <h2 className={styles.heroTitle}>
            管理员可以创建账号、调整状态，并为员工分配 Agent 权限
          </h2>
          <p className={styles.heroDescription}>
            原型保持你现在的浅色工作台风格，把账号创建、状态管理和 Agent
            权限分配都放进一个统一入口。
          </p>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>员工账号</span>
            <strong className={styles.summaryValue}>{users.length}</strong>
            <span className={styles.summaryHint}>手机号作为唯一登录凭证</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>管理员账号</span>
            <strong className={styles.summaryValue}>{adminCount}</strong>
            <span className={styles.summaryHint}>包含租户超级管理员和运营管理员</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>禁用账号</span>
            <strong className={styles.summaryValue}>{disabledCount}</strong>
            <span className={styles.summaryHint}>禁用后登录和 Agent 权限同步暂停</span>
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>账号列表</div>
            <div className={styles.sectionDescription}>
              支持按角色筛选，并在右侧查看分配到该员工的 Agent。
            </div>
          </div>
          <div className={styles.toolbarRow}>
            <Input
              className={styles.searchInput}
              placeholder="搜索姓名或手机号"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
            <Select
              className={styles.filterSelect}
              options={[
                { label: "全部角色", value: "all" },
                { label: "企业老板", value: "admin" },
                { label: "普通员工", value: "member" },
              ]}
              value={roleFilter}
              onChange={value => setRoleFilter(value as FrontisUserRole | "all")}
            />
            <Button onClick={() => message.info("原型阶段先展示入口，正式版接入新建账号弹窗。")}>
              新增账号
            </Button>
            <Button onClick={() => message.info("正式版支持 CSV 批量导入员工账号。")}>
              批量导入
            </Button>
          </div>
        </div>

        <div className={styles.splitLayout}>
          <div className={styles.listPane}>
            {filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <Empty description="没有匹配的账号" />
              </div>
            ) : (
              <div className={styles.cardList}>
                {filteredUsers.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={classNames(styles.rowCard, {
                      [styles.rowCardActive]: item.id === selectedUser?.id,
                    })}
                    onClick={() => setSelectedUserId(item.id)}
                  >
                    <div className={styles.rowCardHeader}>
                      <span className={styles.rowCardTitle}>{item.name}</span>
                      <Tag bordered={false} className={styles.lightTag}>
                        {getRoleLabel(item.role)}
                      </Tag>
                    </div>
                    <div className={styles.rowCardMeta}>
                      <span>{item.phone}</span>
                      <span>{getUserStatusLabel(item.status)}</span>
                    </div>
                    <div className={styles.rowCardSummary}>
                      已分配 {item.assignedAgentIds.length} 个 Agent
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.detailPane}>
            {selectedUser ? (
              <>
                <div className={styles.detailHero}>
                  <div className={styles.detailTitleWrap}>
                    <div className={styles.detailTitle}>{selectedUser.name}</div>
                    <div className={styles.detailSub}>
                      {selectedUser.phone} · {getRoleLabel(selectedUser.role)}
                    </div>
                  </div>
                  <div className={styles.compactActions}>
                    <Button onClick={() => message.info("原型阶段先展示批量分配入口。")}>
                      批量分配
                    </Button>
                    <Button onClick={() => message.info("正式版支持账号启用/禁用切换。")}>
                      {selectedUser.status === "active" ? "停用账号" : "启用账号"}
                    </Button>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>最近活跃</span>
                    <span className={styles.detailMetricValue}>{selectedUser.lastActiveAt}</span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>累计对话</span>
                    <span className={styles.detailMetricValue}>{selectedUser.dialogueCount}</span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>Token 消耗</span>
                    <span className={styles.detailMetricValue}>
                      {selectedUser.tokenUsage.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className={classNames(styles.detailBlock, adminStyles.detailBlock)}>
                  <div className={adminStyles.detailBlockTitle}>已分配 Agent 权限</div>
                  <div className={styles.pillRow}>
                    {selectedUser.assignedAgentIds.length > 0 ? (
                      selectedUser.assignedAgentIds.map(item => (
                        <span key={item} className={styles.pill}>
                          {employeeMap.get(item) ?? item}
                        </span>
                      ))
                    ) : (
                      <span className={styles.inlineMuted}>
                        当前未分配任何 Agent，登录后将看到无权限提示。
                      </span>
                    )}
                  </div>
                </div>

                <div className={classNames(styles.detailBlock, adminStyles.detailBlock)}>
                  <div className={adminStyles.detailBlockTitle}>账号状态</div>
                  <div className={adminStyles.infoList}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>当前状态</span>
                      <span className={styles.infoValue}>
                        {getUserStatusLabel(selectedUser.status)}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>成果数量</span>
                      <span className={styles.infoValue}>{selectedUser.resultCount}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>角色范围</span>
                      <span className={styles.infoValue}>
                        {selectedUser.role === "admin"
                          ? "可见管理员扩展模块"
                          : "仅可见普通用户能力"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <Empty description="请选择一个账号查看详情" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
