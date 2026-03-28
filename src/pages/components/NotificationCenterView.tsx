import { useMemo, useState } from "react";

import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  LockOutlined,
  UpCircleOutlined,
} from "@ant-design/icons";
import { Button, Tag, message } from "antd";

import adminStyles from "./FrontisAdminViews.module.less";
import sharedStyles from "./FrontisWebViews.module.less";
import styles from "./NotificationCenterView.module.less";

type NotificationCategory = "all" | "system" | "alert" | "todo" | "security" | "upgrade";

interface NotificationItem {
  id: string;
  category: Exclude<NotificationCategory, "all">;
  title: string;
  summary: string;
  timeLabel: string;
  pinned?: boolean;
  actionLabel?: string;
}

const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    id: "notice-agent-v21",
    category: "upgrade",
    title: "Agent v2.1 新版本发布",
    summary: "新版本包含多项性能优化和功能增强，建议尽快升级以获得更好的体验。",
    timeLabel: "3小时前",
    pinned: true,
    actionLabel: "立即升级",
  },
  {
    id: "notice-device-offline",
    category: "alert",
    title: "设备离线告警",
    summary: "检测到 BOX-2026-0402 设备已离线超过 2 小时，请及时检查网络连接和设备状态。",
    timeLabel: "5小时前",
    actionLabel: "查看详情",
  },
  {
    id: "notice-todo",
    category: "todo",
    title: "待办事项",
    summary: "您有 3 个待处理的审批请求和 2 个待确认的权限申请，请尽快处理。",
    timeLabel: "昨天",
    actionLabel: "去处理",
  },
  {
    id: "notice-security",
    category: "security",
    title: "安全通知",
    summary: "检测到您的账号在新设备登录，如非本人操作请立即修改密码。",
    timeLabel: "2天前",
    actionLabel: "查看记录",
  },
  {
    id: "notice-system-update",
    category: "system",
    title: "系统更新公告",
    summary: "平台将于本周六 02:00-06:00 进行系统维护升级，届时部分功能可能暂时不可用。",
    timeLabel: "3天前",
  },
  {
    id: "notice-agent-v20",
    category: "upgrade",
    title: "AI商机洞察专家团 v2.0 发布",
    summary: "全新升级的商机洞察能力，支持多维度线索评分和智能推荐。",
    timeLabel: "1周前",
    actionLabel: "立即升级",
  },
];

const CATEGORY_OPTIONS: Array<{ key: NotificationCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "system", label: "系统" },
  { key: "alert", label: "告警" },
  { key: "todo", label: "待办" },
  { key: "security", label: "安全" },
  { key: "upgrade", label: "升级" },
];

const CATEGORY_META: Record<
  NotificationItem["category"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  system: { label: "系统通知", color: "blue", icon: <BellOutlined /> },
  alert: { label: "告警通知", color: "orange", icon: <AlertOutlined /> },
  todo: { label: "待办通知", color: "purple", icon: <CheckCircleOutlined /> },
  security: { label: "安全通知", color: "red", icon: <LockOutlined /> },
  upgrade: { label: "升级提醒", color: "green", icon: <UpCircleOutlined /> },
};

export const NotificationCenterView = (): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const filteredNotifications = useMemo(
    () =>
      activeCategory === "all"
        ? NOTIFICATION_ITEMS
        : NOTIFICATION_ITEMS.filter(item => item.category === activeCategory),
    [activeCategory],
  );

  const handleMarkAllRead = () => {
    setReadIds(new Set(NOTIFICATION_ITEMS.map(n => n.id)));
    message.success("已全部标为已读");
  };

  const handleMarkRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const handleAction = (item: NotificationItem) => {
    message.info(`${item.actionLabel}功能已在原型中预留`);
  };

  return (
    <div className={sharedStyles.view}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={adminStyles.devicePageTitle}>通知中心</h1>
          <p className={adminStyles.devicePageSubtitle}>查看平台重要通知和待办事项</p>
        </div>
        <Button onClick={handleMarkAllRead}>全部已读</Button>
      </div>

      {/* Filter tabs */}
      <div className={styles.categoryRow}>
        {CATEGORY_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={styles.categoryButton}
            data-active={item.key === activeCategory}
            onClick={() => setActiveCategory(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className={styles.notificationList}>
        {filteredNotifications.map(item => {
          const meta = CATEGORY_META[item.category];
          const isRead = readIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`${styles.notificationRow} ${isRead ? styles.notificationRowRead : ""}`}
            >
              <div className={styles.notificationIcon}>{meta.icon}</div>

              <div className={styles.notificationBody}>
                <div className={styles.notificationTopRow}>
                  <div className={styles.notificationTags}>
                    {item.pinned && (
                      <Tag bordered={false} color="red">
                        置顶
                      </Tag>
                    )}
                    <Tag bordered={false} color={meta.color}>
                      {meta.label}
                    </Tag>
                  </div>
                  <div className={styles.notificationMeta}>
                    <span className={styles.notificationTime}>{item.timeLabel}</span>
                    {!isRead && (
                      <button
                        type="button"
                        className={styles.markReadBtn}
                        onClick={() => handleMarkRead(item.id)}
                      >
                        标为已读
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.notificationTitle}>{item.title}</div>
                <div className={styles.notificationSummary}>{item.summary}</div>

                {item.actionLabel && (
                  <div className={styles.notificationAction}>
                    <Button size="small" type="primary" onClick={() => handleAction(item)}>
                      {item.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
