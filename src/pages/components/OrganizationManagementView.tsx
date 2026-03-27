import { useMemo } from "react";

import { ApartmentOutlined, LinkOutlined, SyncOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Tag, message } from "antd";

import type { EmployeeItem, FrontisWebUserItem } from "../types";

import sharedStyles from "./FrontisWebViews.module.less";
import styles from "./OrganizationManagementView.module.less";

interface OrganizationManagementViewProps {
  currentUserName?: string;
  employees: EmployeeItem[];
  users: FrontisWebUserItem[];
}

interface OrganizationIntegrationItem {
  key: string;
  name: string;
  description: string;
  status: string;
  lastSyncAt: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  owner: string;
  memberCount: number;
  syncSource: string;
  expertNames: string[];
}

const ORGANIZATION_INTEGRATIONS: OrganizationIntegrationItem[] = [
  {
    description: "支持组织架构、汇报关系和账号启停双向同步。",
    key: "feishu",
    lastSyncAt: "今天 18:16",
    name: "飞书组织",
    status: "已打通",
  },
  {
    description: "适合销售、交付和一线团队账号统一管理。",
    key: "wechat-work",
    lastSyncAt: "今天 17:42",
    name: "企业微信",
    status: "待授权",
  },
  {
    description: "可同步部门结构与成员，但当前租户尚未启用。",
    key: "dingtalk",
    lastSyncAt: "未接入",
    name: "钉钉组织",
    status: "未接入",
  },
];

/**
 * 企业老板组织管理视图。
 */
export const OrganizationManagementView = ({
  currentUserName,
  employees,
  users,
}: OrganizationManagementViewProps): JSX.Element => {
  const activeUserCount = useMemo(
    () => users.filter(item => item.status === "active").length,
    [users],
  );
  const departmentItems = useMemo<DepartmentItem[]>(
    () => [
      {
        expertNames: employees
          .filter(item =>
            ["employee-pm", "employee-designer", "employee-research"].includes(item.id),
          )
          .map(item => item.name),
        id: "dept-product",
        memberCount: 16,
        name: "产品与增长中心",
        owner: currentUserName ?? "杨万泉",
        syncSource: "飞书",
      },
      {
        expertNames: employees
          .filter(item => ["employee-writer", "employee-sales"].includes(item.id))
          .map(item => item.name),
        id: "dept-content",
        memberCount: 11,
        name: "内容与销售中心",
        owner: "陈雪梅",
        syncSource: "企业微信",
      },
      {
        expertNames: employees.filter(item => item.id === "employee-ops").map(item => item.name),
        id: "dept-delivery",
        memberCount: 8,
        name: "交付运营中心",
        owner: "刘晨",
        syncSource: "手动维护",
      },
    ],
    [currentUserName, employees],
  );
  const boundExpertCount = useMemo(
    () => new Set(employees.flatMap(item => item.boundMembers)).size,
    [employees],
  );

  return (
    <div className={sharedStyles.view}>
      <section className={sharedStyles.heroCard}>
        <div className={sharedStyles.heroContent}>
          <span className={sharedStyles.heroEyebrow}>组织管理</span>
          <h2 className={sharedStyles.heroTitle}>统一管理组织结构、账号归属和外部平台同步</h2>
          <p className={sharedStyles.heroDescription}>
            老板端这里不只是在看成员列表，而是在管理组织边界、跨平台同步状态，以及每个部门能调用哪些
            AI 专家。
          </p>
        </div>
        <div className={sharedStyles.summaryGrid}>
          <article className={sharedStyles.summaryCard}>
            <span className={sharedStyles.summaryLabel}>组织成员</span>
            <strong className={sharedStyles.summaryValue}>{users.length}</strong>
            <span className={sharedStyles.summaryHint}>
              当前已开通 {activeUserCount} 个可登录账号
            </span>
          </article>
          <article className={sharedStyles.summaryCard}>
            <span className={sharedStyles.summaryLabel}>部门数量</span>
            <strong className={sharedStyles.summaryValue}>{departmentItems.length}</strong>
            <span className={sharedStyles.summaryHint}>老板端统一维护组织负责人和汇报链路</span>
          </article>
          <article className={sharedStyles.summaryCard}>
            <span className={sharedStyles.summaryLabel}>专家权限映射</span>
            <strong className={sharedStyles.summaryValue}>{boundExpertCount}</strong>
            <span className={sharedStyles.summaryHint}>组织成员与 AI 专家权限已开始按部门绑定</span>
          </article>
        </div>
      </section>

      <section className={sharedStyles.sectionCard}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <div className={sharedStyles.sectionTitle}>第三方组织打通</div>
            <div className={sharedStyles.sectionDescription}>
              支持和飞书、企微等平台保持组织同步，避免账号与权限配置双份维护。
            </div>
          </div>
        </div>

        <div className={styles.integrationGrid}>
          {ORGANIZATION_INTEGRATIONS.map(item => (
            <article key={item.key} className={styles.integrationCard}>
              <div className={styles.integrationHeader}>
                <div className={styles.integrationIdentity}>
                  <span className={styles.integrationIcon}>
                    <LinkOutlined />
                  </span>
                  <div>
                    <div className={styles.integrationTitle}>{item.name}</div>
                    <div className={styles.integrationDescription}>{item.description}</div>
                  </div>
                </div>
                <Tag bordered={false} className={sharedStyles.lightTag}>
                  {item.status}
                </Tag>
              </div>

              <div className={styles.integrationMeta}>
                <span>最近同步</span>
                <strong>{item.lastSyncAt}</strong>
              </div>

              <div className={styles.integrationActions}>
                <Button
                  onClick={() =>
                    message.info(`${item.name} 在原型阶段先展示入口，正式版接真实 OAuth 授权流程。`)
                  }
                >
                  {item.status === "已打通" ? "重新授权" : "开始接入"}
                </Button>
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => message.success(`${item.name} 已触发一次模拟同步。`)}
                >
                  立即同步
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={sharedStyles.sectionCard}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <div className={sharedStyles.sectionTitle}>部门与专家权限</div>
            <div className={sharedStyles.sectionDescription}>
              每个组织单元都可以绑定自己的 AI 专家团，老板在这里统一看权限分布是否合理。
            </div>
          </div>
        </div>

        <div className={styles.departmentGrid}>
          {departmentItems.map(item => (
            <article key={item.id} className={styles.departmentCard}>
              <div className={styles.departmentHeader}>
                <div className={styles.departmentTitleWrap}>
                  <span className={styles.departmentIcon}>
                    <ApartmentOutlined />
                  </span>
                  <div>
                    <div className={styles.departmentTitle}>{item.name}</div>
                    <div className={styles.departmentMeta}>
                      负责人 {item.owner} · {item.syncSource} 同步
                    </div>
                  </div>
                </div>
                <Tag bordered={false} className={sharedStyles.primaryTag}>
                  {item.memberCount} 人
                </Tag>
              </div>

              <div className={styles.departmentExpertLabel}>已绑定 AI 专家</div>
              <div className={sharedStyles.pillRow}>
                {item.expertNames.map(expertName => (
                  <span key={expertName} className={sharedStyles.pill}>
                    {expertName}
                  </span>
                ))}
              </div>

              <div className={styles.departmentFooter}>
                <Button onClick={() => message.info(`${item.name} 的组织结构编辑入口已预留。`)}>
                  编辑部门
                </Button>
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => message.info(`${item.name} 的成员与权限配置入口已预留。`)}
                >
                  权限配置
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={sharedStyles.sectionCard}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <div className={sharedStyles.sectionTitle}>组织账号概览</div>
            <div className={sharedStyles.sectionDescription}>
              快速检查哪些成员已经开通，哪些成员仍未开始使用 AI 专家团。
            </div>
          </div>
        </div>

        <div className={styles.memberList}>
          {users.map(item => (
            <article key={item.id} className={styles.memberRow}>
              <div>
                <div className={styles.memberName}>{item.name}</div>
                <div className={styles.memberMeta}>
                  {item.phone} · 已分配 {item.assignedAgentIds.length} 个专家
                </div>
              </div>
              <div className={styles.memberStats}>
                <span>{item.lastActiveAt}</span>
                <Tag bordered={false} className={sharedStyles.lightTag}>
                  {item.status === "active" ? "已启用" : "未启用"}
                </Tag>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
