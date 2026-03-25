import classNames from "classnames";
import styles from "./PlanBanner.module.less";
import type { PlanItem, PlanStatus } from "@/types/block";
import { useMemo } from "react";
import planProcessingIcon from "@/assets/images/planIcon/plan-processing-icon.png";
import planCompleteIcon from "@/assets/images/planIcon/plan-complete.png";
import planFailedIcon from "@/assets/images/planIcon/plan-failed.png";
// import planPendingIcon from "@/assets/images/planIcon/plan-pending.png";
import arrowUpIcon from "@/assets/images/arrow-up.png";
import planPendingIcon from "@/assets/images/planIcon/plan-pending.svg";

export interface PlanBannerProps {
  title: string;
  status: PlanStatus;
  spec?: string | null;
  items?: PlanItem[];
  collapsed?: boolean;
  onToggleCollapse?: (nextCollapsed: boolean) => void;
}

const statusTextMap: Record<string, { text: string; icon: string }> = {
  in_progress: {
    text: "执行中...",
    icon: planProcessingIcon,
  },
  running: {
    text: "执行中...",
    icon: planProcessingIcon,
  },
  completed: {
    text: "已完成",
    icon: planCompleteIcon,
  },
  failed: {
    text: "执行失败",
    icon: planFailedIcon,
  },
  pending: {
    text: "待执行",
    icon: planPendingIcon,
  },
};

export const PlanBanner = ({
  title,
  status,
  spec,
  items: rawItems,
  collapsed = false,
  onToggleCollapse,
}: PlanBannerProps): JSX.Element => {
  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);
  const completedCount = useMemo(
    () => items.filter(item => item.status === "completed").length,
    [items],
  );

  const statusInfo = statusTextMap[status] || {};
  const statusText = statusInfo.text || "执行中…";
  const progressText = items.length > 0 ? `${completedCount}/${items.length}` : undefined;
  const collapsedMaxWidth = useMemo(() => {
    if (!collapsed) return undefined;
    const titleLen = (title ?? "").length;
    const statusLen = (statusText ?? "").length + (progressText?.length ?? 0);
    const estimated = 220 + (titleLen + statusLen) * 8; // 估算字符宽度
    return Math.min(712, Math.max(260, estimated));
  }, [collapsed, progressText?.length, statusText, title]);
  return (
    <button
      type="button"
      className={classNames(styles.banner, { [styles.collapsed]: collapsed })}
      onClick={() => onToggleCollapse?.(!collapsed)}
      aria-label="计划提醒"
      style={collapsed ? { maxWidth: collapsedMaxWidth } : undefined}
    >
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.titleRow}>
            {collapsed ? <img src={statusInfo.icon} className={styles.titleIcon} alt="" /> : null}
            <span className={styles.title}>{title}</span>
          </div>
          <div className={styles.statusRow}>
            {progressText ? <span className={styles.progress}>{progressText}</span> : null}
            {collapsed ? null : (
              <div className={styles.statusWrap}>
                <img src={statusInfo.icon} className={styles.titleIcon} alt="" />
                <span className={styles.status}>{statusText}</span>
              </div>
            )}
            <img src={arrowUpIcon} className={styles.arrowUp} alt="" />
          </div>
        </div>
        {spec && !collapsed ? <div className={styles.spec}>{spec}</div> : null}
      </div>
      <div
        className={classNames(styles.bodyWrapper, { [styles.bodyCollapsed]: collapsed })}
        aria-hidden={collapsed}
      >
        <div className={styles.body}>
          <ul className={styles.items} aria-label="计划步骤">
            {items.map(item => {
              // console.log(item, 'item')
              const itemStatus = item.status || "pending";
              const itemStatusInfo = statusTextMap[itemStatus] || {};
              return (
                <li key={item.index} className={styles.item}>
                  <img src={itemStatusInfo.icon} className={styles.itemIcon} alt="" />
                  <div className={styles.itemText}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    {item.spec ? <div className={styles.itemSpec}>{item.spec}</div> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </button>
  );
};

export default PlanBanner;
