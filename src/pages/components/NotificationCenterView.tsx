import { useMemo, useState } from "react";

import { Button, Tag, message } from "antd";

import adminStyles from "./FrontisAdminViews.module.less";
import sharedStyles from "./FrontisWebViews.module.less";
import {
  CATEGORY_META,
  CATEGORY_OPTIONS,
  NOTIFICATION_ITEMS,
} from "./notificationCenterData";
import type { NotificationCategory, NotificationItem } from "./notificationCenterData";
import styles from "./NotificationCenterView.module.less";

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
