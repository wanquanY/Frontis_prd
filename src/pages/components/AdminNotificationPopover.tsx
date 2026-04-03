import { useCallback, useMemo, useState } from "react";

import { BellOutlined } from "@ant-design/icons";
import { Button, Popover, Tag } from "antd";

import { CATEGORY_META, NOTIFICATION_ITEMS } from "./notificationCenterData";
import type { NotificationActionTab, NotificationItem } from "./notificationCenterData";
import styles from "./AdminNotificationPopover.module.less";

interface AdminNotificationPopoverProps {
  onNavigateToTab: (tabKey: NotificationActionTab) => void;
}

/**
 * 后台右上角通知浮窗。
 */
export const AdminNotificationPopover = ({
  onNavigateToTab,
}: AdminNotificationPopoverProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const unreadCount = useMemo(
    () => NOTIFICATION_ITEMS.filter(item => !readIds.has(item.id)).length,
    [readIds],
  );

  const visibleItems = useMemo(() => NOTIFICATION_ITEMS.slice(0, 5), []);

  const handleMarkRead = useCallback((id: string): void => {
    setReadIds(prev => new Set(prev).add(id));
  }, []);

  const handleMarkAllRead = useCallback((): void => {
    setReadIds(new Set(NOTIFICATION_ITEMS.map(item => item.id)));
  }, []);

  const handleAction = useCallback(
    (item: NotificationItem): void => {
      handleMarkRead(item.id);
      setIsOpen(false);
      if (item.actionTab) {
        onNavigateToTab(item.actionTab);
      }
    },
    [handleMarkRead, onNavigateToTab],
  );

  const popoverContent = (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelTitle}>通知</p>
          <p className={styles.panelSubtitle}>系统、升级、待办统一在这里查看</p>
        </div>
        <button type="button" className={styles.panelAction} onClick={handleMarkAllRead}>
          全部已读
        </button>
      </div>

      <div className={styles.list}>
        {visibleItems.map(item => {
          const meta = CATEGORY_META[item.category];
          const isRead = readIds.has(item.id);

          return (
            <div key={item.id} className={isRead ? `${styles.item} ${styles.itemRead}` : styles.item}>
              <div className={styles.itemIcon}>{meta.icon}</div>
              <div className={styles.itemBody}>
                <div className={styles.itemTopRow}>
                  <div className={styles.itemTags}>
                    {item.pinned ? (
                      <Tag bordered={false} color="red">
                        置顶
                      </Tag>
                    ) : null}
                    <Tag bordered={false} color={meta.color}>
                      {meta.label}
                    </Tag>
                  </div>
                  <span className={styles.itemTime}>{item.timeLabel}</span>
                </div>

                <p className={styles.itemTitle}>{item.title}</p>
                <p className={styles.itemSummary}>{item.summary}</p>

                <div className={styles.itemFooter}>
                  <button
                    type="button"
                    className={styles.readButton}
                    onClick={() => handleMarkRead(item.id)}
                  >
                    {isRead ? "已读" : "标为已读"}
                  </button>
                  {item.actionLabel ? (
                    <Button size="small" type="link" onClick={() => handleAction(item)}>
                      {item.actionLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      open={isOpen}
      overlayClassName={styles.popoverOverlay}
      placement="bottomRight"
      trigger={["click"]}
      onOpenChange={setIsOpen}
    >
      <button type="button" className={styles.triggerButton} aria-label="查看通知">
        <BellOutlined />
        {unreadCount > 0 ? (
          <span className={styles.triggerBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        ) : null}
      </button>
    </Popover>
  );
};
