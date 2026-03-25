import { useMemo } from "react";

import classNames from "classnames";

import type { SynClawMemberItem } from "@/pages/synclaw/components/SynClawChatHeader";

import styles from "./GroupChatHeader.module.less";

interface GroupChatHeaderProps {
  /** 当前频道名称 */
  title: string;
  /** 频道成员 */
  members?: SynClawMemberItem[];
  /** 成员列表加载中 */
  membersLoading?: boolean;
  /** 点击管理成员 */
  onManageMembers?: () => void;
  /** 点击设备按钮 */
  onOpenDevice?: () => void;
  /** 设备按钮激活态 */
  isDeviceActive?: boolean;
  /** 点击成果按钮 */
  onOpenFolder?: () => void;
}

const resolveMemberAvatarText = (name: string): string => {
  const normalizedName = name.trim();
  if (!normalizedName) return "?";
  return Array.from(normalizedName)[0] ?? normalizedName;
};

const AgentBadgeIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <rect x="1" y="1" width="14" height="14" rx="3" fill="#00C1D4" />
    <path
      d="M5.3 7.8L7.1 9.7L10.7 6.1"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EllipsisIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <circle cx="2.2" cy="6" r="1" />
    <circle cx="6" cy="6" r="1" />
    <circle cx="9.8" cy="6" r="1" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M3.3 6.4C3.3 5.6 3.95 5 4.75 5H8.1L9.5 6.5H15.25C16.05 6.5 16.7 7.15 16.7 7.95V14.6C16.7 15.4 16.05 16 15.25 16H4.75C3.95 16 3.3 15.35 3.3 14.55V6.4Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const DeviceIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M3.5 4.5H16.5V12.5H3.5V4.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M7 15.5H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M10 12.5V15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * 群聊频道顶部栏。
 *
 * 仅在 PRD 原型内使用，保留成员与成果入口，并补充可控的设备按钮。
 */
export const GroupChatHeader = ({
  title,
  members,
  membersLoading = false,
  onManageMembers,
  onOpenDevice,
  isDeviceActive = false,
  onOpenFolder,
}: GroupChatHeaderProps): JSX.Element => {
  const visibleMembers = useMemo(() => (members ?? []).slice(0, 4), [members]);

  return (
    <div className={styles.header} aria-label="PRD 群聊顶部栏">
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.title} title={title}>
            {title}
          </span>
        </div>

        <div className={styles.right} aria-label="协作成员与操作">
          <div className={styles.pill} aria-label="协作成员">
            <div className={styles.pillRow}>
              {membersLoading ? (
                <span
                  className={classNames(styles.pillItem, styles.pillLoading)}
                  aria-hidden="true"
                >
                  ...
                </span>
              ) : visibleMembers.length ? (
                visibleMembers.map(member => {
                  if (member.kind === "ai") {
                    return (
                      <span
                        key={`pill-member-ai-${member.id}`}
                        className={classNames(styles.pillItem, styles.pillBadge)}
                        aria-hidden="true"
                      >
                        <AgentBadgeIcon className={styles.pillBadgeIcon} />
                      </span>
                    );
                  }

                  if (member.avatarUrl) {
                    return (
                      <span
                        key={`pill-member-avatar-${member.id}`}
                        className={classNames(styles.pillItem, styles.pillAvatar)}
                        aria-hidden="true"
                      >
                        <img className={styles.pillAvatarImg} src={member.avatarUrl} alt="" />
                      </span>
                    );
                  }

                  return (
                    <span
                      key={`pill-member-name-${member.id}`}
                      className={classNames(styles.pillItem, styles.pillName)}
                      aria-hidden="true"
                    >
                      {member.avatarText ?? resolveMemberAvatarText(member.name)}
                    </span>
                  );
                })
              ) : (
                <span className={classNames(styles.pillItem, styles.pillName)} aria-hidden="true">
                  ?
                </span>
              )}

              {onManageMembers ? (
                <button
                  type="button"
                  className={classNames(
                    styles.pillItem,
                    styles.pillEllipsis,
                    styles.pillEllipsisButton,
                  )}
                  aria-label="管理成员"
                  onClick={onManageMembers}
                >
                  <EllipsisIcon className={styles.pillEllipsisIcon} />
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.headerActions}>
            {onOpenDevice ? (
              <button
                type="button"
                className={classNames(styles.actionButton, {
                  [styles.actionButtonActive]: isDeviceActive,
                })}
                aria-label="打开设备桌面"
                onClick={onOpenDevice}
              >
                <DeviceIcon className={styles.actionIcon} />
              </button>
            ) : null}

            {onOpenFolder ? (
              <button
                type="button"
                className={styles.actionButton}
                aria-label="打开成果文件"
                onClick={onOpenFolder}
              >
                <FolderIcon className={styles.actionIcon} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
