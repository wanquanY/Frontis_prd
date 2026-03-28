import { useCallback, useState } from "react";

import {
  ApartmentOutlined,
  DownOutlined,
  FolderOutlined,
  PlusOutlined,
  RightOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Switch, Tag, message } from "antd";

import type { EmployeeItem, FrontisWebUserItem } from "../types";

import sharedStyles from "./FrontisWebViews.module.less";
import styles from "./OrganizationManagementView.module.less";

interface OrganizationManagementViewProps {
  currentUserName?: string;
  employees: EmployeeItem[];
  users: FrontisWebUserItem[];
}

interface DepartmentNode {
  id: string;
  name: string;
  memberCount: number;
}

const DEPARTMENTS: DepartmentNode[] = [
  { id: "dept-mgmt", name: "管理层", memberCount: 1 },
  { id: "dept-market", name: "市场部", memberCount: 1 },
  { id: "dept-sales", name: "销售部", memberCount: 1 },
  { id: "dept-finance", name: "财务部", memberCount: 1 },
  { id: "dept-hr", name: "人力资源部", memberCount: 1 },
];

export const OrganizationManagementView = ({
  currentUserName,
  employees,
  users,
}: OrganizationManagementViewProps): JSX.Element => {
  const [treeExpanded, setTreeExpanded] = useState(true);
  const [adminIds, setAdminIds] = useState<Set<string>>(
    () => new Set(users.filter(u => u.role === "admin").map(u => u.id)),
  );

  const handleSync = useCallback((platform: string) => {
    message.success(`${platform}组织架构同步成功`);
  }, []);

  const handleToggleAdmin = useCallback(
    (user: FrontisWebUserItem, checked: boolean) => {
      setAdminIds(prev => {
        const next = new Set(prev);
        if (checked) {
          next.add(user.id);
        } else {
          next.delete(user.id);
        }
        return next;
      });
      if (checked) {
        message.success(`已设置 ${user.name} 为超级管理员`);
      } else {
        message.success(`已取消 ${user.name} 的超级管理员权限`);
      }
    },
    [],
  );

  return (
    <div className={sharedStyles.view}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>组织管理</h1>
          <p className={styles.subtitle}>管理企业组织架构</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
          添加部门
        </Button>
      </div>

      {/* Sync buttons */}
      <div className={styles.syncRow}>
        <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync("飞书")}>
          同步飞书组织架构
        </Button>
        <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync("企微")}>
          同步企微组织架构
        </Button>
        <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync("钉钉")}>
          同步钉钉组织架构
        </Button>
      </div>

      {/* Two-column layout */}
      <div className={styles.layout}>
        {/* Left: Org tree */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>组织架构</h2>

          <div className={styles.treeRoot}>
            <button
              type="button"
              className={styles.treeRootRow}
              onClick={() => setTreeExpanded(v => !v)}
            >
              {treeExpanded ? (
                <DownOutlined className={styles.treeArrow} />
              ) : (
                <RightOutlined className={styles.treeArrow} />
              )}
              <ApartmentOutlined className={styles.treeRootIcon} />
              <span className={styles.treeRootName}>北京科技有限公司</span>
              <Tag color="blue" bordered={false}>
                旗舰版
              </Tag>
            </button>

            {treeExpanded && (
              <div className={styles.treeChildren}>
                {DEPARTMENTS.map(dept => (
                  <div key={dept.id} className={styles.treeDeptRow}>
                    <FolderOutlined className={styles.treeDeptIcon} />
                    <span className={styles.treeDeptName}>{dept.name}</span>
                    <span className={styles.treeDeptCount}>{dept.memberCount}人</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Company info */}
        <div className={styles.card}>
          <div className={styles.infoHeader}>
            <div className={styles.infoLogo}>
              <ApartmentOutlined />
            </div>
            <div>
              <div className={styles.infoCompanyName}>北京科技有限公司</div>
              <Tag color="blue" bordered={false}>
                旗舰版
              </Tag>
            </div>
          </div>

          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>版本有效期</span>
              <span className={styles.infoValue}>2027-03-27</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>管理员</span>
              <span className={styles.infoValue}>{currentUserName ?? "张总"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>成员数量</span>
              <span className={styles.infoValue}>{users.length}人</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Agent数量</span>
              <span className={styles.infoValue}>{employees.length}个</span>
            </div>
          </div>
        </div>
      </div>

      {/* Member management */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>成员管理</h2>

        <div className={styles.memberTable}>
          <div className={styles.memberHead}>
            <span className={styles.colName}>姓名</span>
            <span className={styles.colPhone}>手机号</span>
            <span className={styles.colStatus}>状态</span>
            <span className={styles.colAdmin}>超级管理员</span>
          </div>
          {users.map(user => (
            <div key={user.id} className={styles.memberRow}>
              <span className={styles.colName}>{user.name}</span>
              <span className={styles.colPhone}>{user.phone}</span>
              <span className={styles.colStatus}>
                <Tag
                  bordered={false}
                  color={user.status === "active" ? "success" : "default"}
                >
                  {user.status === "active" ? "已启用" : "未启用"}
                </Tag>
              </span>
              <span className={styles.colAdmin}>
                <Switch
                  size="small"
                  checked={adminIds.has(user.id)}
                  onChange={checked => handleToggleAdmin(user, checked)}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
