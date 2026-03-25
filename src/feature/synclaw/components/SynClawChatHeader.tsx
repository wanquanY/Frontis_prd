import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type SVGProps,
} from "react";
import { Input, Modal, message } from "antd";
import classNames from "classnames";

import chatDefaultAvatar from "@/assets/images/chat-default.svg";

import styles from "./SynClawChatHeader.module.less";

interface SynClawChatHeaderProps {
  /** 当前频道名称 */
  title: string;
  /** 频道内 AI agent 的忙碌状态（runtime/plugin 快照） */
  agentStatuses?: SynClawChatHeaderAgentStatusItem[];
  /** 空间成员列表（空间级别） */
  members?: SynClawMemberItem[];
  /** 成员列表加载中 */
  membersLoading?: boolean;
  /** 点击管理成员 */
  onManageMembers?: () => void;
  /** 点击右侧文件夹按钮 */
  onOpenFolder?: () => void;
}

export type SynClawMemberStatus = "online" | "offline";
export type SynClawMemberKind = "human" | "ai";

export interface SynClawMemberItem {
  id: string;
  name: string;
  kind: SynClawMemberKind;
  status: SynClawMemberStatus;
  avatarText?: string;
  avatarUrl?: string;
  accessRole?: "owner" | "manager" | "speaker" | "viewer";
  roleLabel?: string;
  fixed?: boolean;
}

export type SynClawAgentWorkStatus =
  | "idle"
  | "working_here"
  | "busy_elsewhere"
  | "offline"
  | "unknown"
  | "error";

export interface SynClawChatHeaderAgentStatusItem {
  agentId: string;
  displayName: string;
  status: SynClawAgentWorkStatus;
  /** status=busy_elsewhere 时用于展示并发数量 */
  busyCount?: number;
  /** 原始状态文案（用于 tooltip / debug） */
  rawStatus?: string;
}

interface SynClawMemberManageModalSubmitPayload {
  currentMembers: SynClawMemberItem[];
  availableMembers: SynClawMemberItem[];
}

interface SynClawMemberManageModalProps {
  open: boolean;
  currentMembers: SynClawMemberItem[];
  availableMembers: SynClawMemberItem[];
  onCancel: () => void;
  onConfirm: (payload: SynClawMemberManageModalSubmitPayload) => void;
}

const DEFAULT_CURRENT_MEMBERS: SynClawMemberItem[] = [
  {
    id: "member-owner-1",
    name: "杨万权",
    kind: "human",
    status: "online",
    avatarText: "杨",
    roleLabel: "所有者",
    fixed: true,
  },
];

const DEFAULT_AVAILABLE_MEMBERS: SynClawMemberItem[] = [
  { id: "member-ai-1", name: "小龙虾", kind: "ai", status: "online", avatarUrl: chatDefaultAvatar },
  { id: "member-ai-2", name: "张三", kind: "ai", status: "online", avatarUrl: chatDefaultAvatar },
  { id: "member-human-1", name: "李四", kind: "human", status: "online", avatarText: "李" },
  { id: "member-human-2", name: "小张", kind: "human", status: "offline", avatarText: "张" },
  { id: "member-human-3", name: "章三", kind: "human", status: "offline", avatarText: "章" },
  { id: "member-human-4", name: "王伟", kind: "human", status: "online", avatarText: "王" },
  { id: "member-human-5", name: "陈晨", kind: "human", status: "online", avatarText: "陈" },
  { id: "member-human-6", name: "刘畅", kind: "human", status: "online", avatarText: "刘" },
  { id: "member-human-7", name: "赵敏", kind: "human", status: "offline", avatarText: "赵" },
  { id: "member-human-8", name: "周青", kind: "human", status: "online", avatarText: "周" },
];

const resolveMemberAvatarText = (name: string): string => {
  const normalizedName = name.trim();
  if (!normalizedName) return "?";
  return Array.from(normalizedName)[0] ?? normalizedName;
};

const resolveInitialCurrentMembers = (members?: SynClawMemberItem[]): SynClawMemberItem[] => {
  if (members?.length) return members;
  return DEFAULT_CURRENT_MEMBERS;
};

const buildInitialAvailableMembers = (currentMembers: SynClawMemberItem[]): SynClawMemberItem[] => {
  const currentMemberIds = new Set(currentMembers.map(member => member.id));
  return DEFAULT_AVAILABLE_MEMBERS.filter(member => !currentMemberIds.has(member.id));
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

const CloseIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path
      d="M1 1l10 10M11 1L1 11"
      stroke="currentColor"
      strokeWidth="2"
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

const SearchIcon = ({ className }: { className?: string }): JSX.Element => (
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
    <path
      d="M7.2 12.1a4.9 4.9 0 1 1 0-9.8 4.9 4.9 0 0 1 0 9.8Z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M2 6.2L4.6 8.8L10 3.4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }): JSX.Element => (
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
    <path
      d="M9.8 12.4L5.4 8l4.4-4.4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowRightIcon = ({ className }: { className?: string }): JSX.Element => (
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
    <path
      d="M6.2 3.6L10.6 8l-4.4 4.4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

const resolveStatusLabel = (status: SynClawMemberStatus): string =>
  status === "online" ? "在线" : "离线";

const SynClawMemberManageModal = ({
  open,
  currentMembers,
  availableMembers,
  onCancel,
  onConfirm,
}: SynClawMemberManageModalProps): JSX.Element => {
  const [draftCurrentMembers, setDraftCurrentMembers] =
    useState<SynClawMemberItem[]>(currentMembers);
  const [draftAvailableMembers, setDraftAvailableMembers] =
    useState<SynClawMemberItem[]>(availableMembers);
  const [currentQuery, setCurrentQuery] = useState("");
  const [availableQuery, setAvailableQuery] = useState("");
  const [selectedCurrentIds, setSelectedCurrentIds] = useState<Set<string>>(() => new Set());
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    setDraftCurrentMembers(currentMembers);
    setDraftAvailableMembers(availableMembers);
    setCurrentQuery("");
    setAvailableQuery("");
    setSelectedCurrentIds(new Set());
    setSelectedAvailableIds(new Set());
  }, [availableMembers, currentMembers, open]);

  const filteredCurrentMembers = useMemo(() => {
    const query = currentQuery.trim();
    if (!query) return draftCurrentMembers;
    return draftCurrentMembers.filter(member => member.name.includes(query));
  }, [currentQuery, draftCurrentMembers]);

  const filteredAvailableMembers = useMemo(() => {
    const query = availableQuery.trim();
    if (!query) return draftAvailableMembers;
    return draftAvailableMembers.filter(member => member.name.includes(query));
  }, [availableQuery, draftAvailableMembers]);

  const removableCurrentSelectedIds = useMemo(() => {
    if (!selectedCurrentIds.size) return [];
    const memberMap = new Map(draftCurrentMembers.map(member => [member.id, member]));
    return Array.from(selectedCurrentIds).filter(id => !memberMap.get(id)?.fixed);
  }, [draftCurrentMembers, selectedCurrentIds]);

  const canMoveToCurrent = selectedAvailableIds.size > 0;
  const canMoveToAvailable = removableCurrentSelectedIds.length > 0;

  const toggleSelected = useCallback(
    (id: string, setter: (updater: (prev: Set<string>) => Set<string>) => void) => {
      setter(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleCurrent = useCallback(
    (member: SynClawMemberItem) => {
      if (member.fixed) return;
      toggleSelected(member.id, setSelectedCurrentIds);
    },
    [toggleSelected],
  );

  const handleToggleAvailable = useCallback(
    (member: SynClawMemberItem) => {
      toggleSelected(member.id, setSelectedAvailableIds);
    },
    [toggleSelected],
  );

  const handleMoveToCurrent = useCallback(() => {
    if (!selectedAvailableIds.size) return;
    const selectedSet = selectedAvailableIds;
    const picked = draftAvailableMembers.filter(member => selectedSet.has(member.id));
    if (!picked.length) return;

    setDraftAvailableMembers(prev => prev.filter(member => !selectedSet.has(member.id)));
    setDraftCurrentMembers(prev => {
      const existing = new Set(prev.map(member => member.id));
      const next = [...prev];
      picked.forEach(member => {
        if (existing.has(member.id)) return;
        existing.add(member.id);
        next.push(member);
      });
      return next;
    });
    setSelectedAvailableIds(new Set());
  }, [draftAvailableMembers, selectedAvailableIds]);

  const handleMoveToAvailable = useCallback(() => {
    if (!removableCurrentSelectedIds.length) return;
    const removableSet = new Set(removableCurrentSelectedIds);
    const picked = draftCurrentMembers.filter(member => removableSet.has(member.id));
    if (!picked.length) return;

    setDraftCurrentMembers(prev => prev.filter(member => !removableSet.has(member.id)));
    setDraftAvailableMembers(prev => {
      const existing = new Set(prev.map(member => member.id));
      const next = [...prev];
      picked.forEach(member => {
        if (existing.has(member.id)) return;
        existing.add(member.id);
        next.push(member);
      });
      return next;
    });
    setSelectedCurrentIds(new Set());
  }, [draftCurrentMembers, removableCurrentSelectedIds]);

  const handleConfirm = useCallback(() => {
    onConfirm({ currentMembers: draftCurrentMembers, availableMembers: draftAvailableMembers });
  }, [draftAvailableMembers, draftCurrentMembers, onConfirm]);

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, onToggle: () => void) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onToggle();
    },
    [],
  );

  const renderMemberRow = useCallback(
    (member: SynClawMemberItem, checked: boolean, disabled: boolean, onToggle: () => void) => (
      <div
        key={member.id}
        className={classNames(styles.memberRow, {
          [styles.memberRowSelected]: checked,
          [styles.memberRowDisabled]: disabled,
        })}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`成员：${member.name}`}
        onClick={() => {
          if (disabled) return;
          onToggle();
        }}
        onKeyDown={event => handleRowKeyDown(event, onToggle)}
      >
        <button
          type="button"
          className={classNames(styles.memberCheckbox, {
            [styles.memberCheckboxChecked]: checked,
            [styles.memberCheckboxDisabled]: disabled,
          })}
          aria-label={checked ? "取消选择" : "选择"}
          aria-pressed={checked}
          disabled={disabled}
          onClick={event => {
            event.stopPropagation();
            if (disabled) return;
            onToggle();
          }}
        >
          <CheckIcon className={styles.memberCheckboxIcon} />
        </button>

        <span className={styles.memberAvatar} aria-hidden="true">
          {member.avatarUrl ? (
            <img className={styles.memberAvatarImg} src={member.avatarUrl} alt="" />
          ) : (
            <span className={styles.memberAvatarText}>{member.avatarText ?? "?"}</span>
          )}
          <span
            className={classNames(styles.memberAvatarDot, {
              [styles.memberAvatarDotOffline]: member.status === "offline",
            })}
          />
        </span>

        <div className={styles.memberInfo}>
          <div className={styles.memberNameRow}>
            <span className={styles.memberName}>{member.name}</span>
            {member.kind === "ai" ? <span className={styles.memberAiTag}>AI</span> : null}
          </div>
          {member.roleLabel ? (
            <div className={styles.memberSubLabel}>{member.roleLabel}</div>
          ) : null}
        </div>

        <div
          className={classNames(styles.memberStatus, {
            [styles.memberStatusOnline]: member.status === "online",
            [styles.memberStatusOffline]: member.status === "offline",
          })}
        >
          {resolveStatusLabel(member.status)}
        </div>
      </div>
    ),
    [handleRowKeyDown],
  );

  return (
    <Modal
      open={open}
      centered
      destroyOnClose={true}
      footer={null}
      closable={false}
      width={980}
      rootClassName={styles.memberModal}
      onCancel={onCancel}
    >
      <div className={styles.memberModalCard} aria-label="管理成员弹窗">
        <div className={styles.memberModalHeader}>
          <div className={styles.memberModalTitle}>管理成员</div>
          <button
            type="button"
            className={styles.memberModalCloseButton}
            onClick={onCancel}
            aria-label="关闭"
          >
            <CloseIcon className={styles.memberModalCloseIcon} />
          </button>
        </div>

        <div className={styles.memberModalContent} aria-label="成员选择区域">
          <div className={styles.memberPanel} aria-label="现有成员">
            <div className={styles.memberPanelHeader}>
              <div className={styles.memberPanelTitle}>现有成员</div>
              <div className={styles.memberPanelCount}>{draftCurrentMembers.length}人</div>
            </div>
            <div className={styles.memberPanelSearch}>
              <Input
                value={currentQuery}
                allowClear
                className={styles.memberSearchInput}
                size="large"
                placeholder="搜索成员"
                suffix={<SearchIcon className={styles.memberSearchIcon} />}
                onChange={event => setCurrentQuery(event.target.value)}
              />
            </div>
            <div className={styles.memberList} aria-label="现有成员列表">
              {filteredCurrentMembers.length ? (
                filteredCurrentMembers.map(member =>
                  renderMemberRow(
                    member,
                    selectedCurrentIds.has(member.id),
                    Boolean(member.fixed),
                    () => handleToggleCurrent(member),
                  ),
                )
              ) : (
                <div className={styles.memberEmpty}>暂无成员</div>
              )}
            </div>
          </div>

          <div className={styles.memberTransfer} aria-label="成员转移操作">
            <button
              type="button"
              className={classNames(styles.memberTransferButton, {
                [styles.memberTransferButtonDisabled]: !canMoveToCurrent,
              })}
              disabled={!canMoveToCurrent}
              onClick={handleMoveToCurrent}
              aria-label="添加到现有成员"
            >
              <ArrowLeftIcon className={styles.memberTransferIcon} />
            </button>
            <button
              type="button"
              className={classNames(styles.memberTransferButton, {
                [styles.memberTransferButtonDisabled]: !canMoveToAvailable,
              })}
              disabled={!canMoveToAvailable}
              onClick={handleMoveToAvailable}
              aria-label="移出到可添加成员"
            >
              <ArrowRightIcon className={styles.memberTransferIcon} />
            </button>
          </div>

          <div className={styles.memberPanel} aria-label="可添加成员">
            <div className={styles.memberPanelHeader}>
              <div className={styles.memberPanelTitle}>可添加成员</div>
              <div className={styles.memberPanelCount}>{draftAvailableMembers.length}人</div>
            </div>
            <div className={styles.memberPanelSearch}>
              <Input
                value={availableQuery}
                allowClear
                className={styles.memberSearchInput}
                size="large"
                placeholder="搜索成员"
                suffix={<SearchIcon className={styles.memberSearchIcon} />}
                onChange={event => setAvailableQuery(event.target.value)}
              />
            </div>
            <div className={styles.memberList} aria-label="可添加成员列表">
              {filteredAvailableMembers.length ? (
                filteredAvailableMembers.map(member =>
                  renderMemberRow(member, selectedAvailableIds.has(member.id), false, () =>
                    handleToggleAvailable(member),
                  ),
                )
              ) : (
                <div className={styles.memberEmpty}>暂无可添加成员</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.memberModalFooter}>
          <button type="button" className={styles.memberModalCancelButton} onClick={onCancel}>
            取消
          </button>
          <button type="button" className={styles.memberModalConfirmButton} onClick={handleConfirm}>
            确认
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * SynClawChatHeader
 *
 * SynClaw 频道对话态右侧顶部栏（Figma：node-id=5941:5504）。
 */
export const SynClawChatHeader = ({
  title,
  agentStatuses,
  members,
  membersLoading = false,
  onManageMembers,
  onOpenFolder,
}: SynClawChatHeaderProps): JSX.Element => {
  const initialCurrentMembers = useMemo(() => resolveInitialCurrentMembers(members), [members]);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [channelMembers, setChannelMembers] = useState<SynClawMemberItem[]>(initialCurrentMembers);
  const [availableMembers, setAvailableMembers] = useState<SynClawMemberItem[]>(() =>
    buildInitialAvailableMembers(initialCurrentMembers),
  );

  useEffect(() => {
    const nextCurrentMembers = resolveInitialCurrentMembers(members);
    setChannelMembers(nextCurrentMembers);
    setAvailableMembers(buildInitialAvailableMembers(nextCurrentMembers));
  }, [members]);

  const visibleMembers = useMemo(() => channelMembers.slice(0, 4), [channelMembers]);
  const visibleAgentStatuses = useMemo(() => agentStatuses || [], [agentStatuses]);

  const resolveAgentStatusLabel = useCallback((status: SynClawAgentWorkStatus): string => {
    switch (status) {
      case "working_here":
        return "本频道工作中";
      case "busy_elsewhere":
        return "其他频道忙";
      case "idle":
        return "空闲";
      case "offline":
        return "离线";
      case "error":
        return "异常";
      default:
        return "未知";
    }
  }, []);

  const handleOpenMemberModal = useCallback(() => {
    if (onManageMembers) {
      onManageMembers();
      return;
    }
    setIsMemberModalOpen(true);
  }, [onManageMembers]);

  const handleCloseMemberModal = useCallback(() => {
    setIsMemberModalOpen(false);
  }, []);

  const handleConfirmMemberModal = useCallback((payload: SynClawMemberManageModalSubmitPayload) => {
    setChannelMembers(payload.currentMembers);
    setAvailableMembers(payload.availableMembers);
    setIsMemberModalOpen(false);
    message.success("成员已更新");
  }, []);

  return (
    <div className={styles.header} aria-label="频道对话顶部栏">
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.titleGroup}>
            <span className={styles.title} title={title}>
              {title}
            </span>
          </div>
          {visibleAgentStatuses.length ? (
            <div className={styles.agentStatusRow} aria-label="频道 Agent 状态">
              {visibleAgentStatuses.map(item => (
                <span
                  key={`agent-status-${item.agentId}`}
                  className={classNames(styles.agentStatusBubble, {
                    [styles.agentStatusBubbleWorking]:
                      item.status === "working_here" || item.status === "busy_elsewhere",
                    [styles.agentStatusBubbleIdle]: item.status === "idle",
                    [styles.agentStatusBubbleOffline]: item.status === "offline",
                    [styles.agentStatusBubbleError]: item.status === "error",
                    [styles.agentStatusBubbleUnknown]: item.status === "unknown",
                  })}
                  title={
                    item.rawStatus ? `${item.displayName}：${item.rawStatus}` : item.displayName
                  }
                >
                  <span className={styles.agentStatusName}>{item.displayName}</span>
                  <span className={styles.agentStatusDivider} aria-hidden="true">
                    ·
                  </span>
                  <span className={styles.agentStatusLabel}>
                    {resolveAgentStatusLabel(item.status)}
                    {item.status === "busy_elsewhere" && item.busyCount && item.busyCount > 0
                      ? `(${item.busyCount})`
                      : ""}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
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
                        className={`${styles.pillItem} ${styles.pillBadge}`}
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
                        className={`${styles.pillItem} ${styles.pillAvatar}`}
                        aria-hidden="true"
                      >
                        <img className={styles.pillAvatarImg} src={member.avatarUrl} alt="" />
                      </span>
                    );
                  }

                  return (
                    <span
                      key={`pill-member-name-${member.id}`}
                      className={`${styles.pillItem} ${styles.pillName}`}
                      aria-hidden="true"
                    >
                      {member.avatarText ?? resolveMemberAvatarText(member.name)}
                    </span>
                  );
                })
              ) : (
                <span className={`${styles.pillItem} ${styles.pillName}`} aria-hidden="true">
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
                  onClick={handleOpenMemberModal}
                >
                  <EllipsisIcon className={styles.pillEllipsisIcon} />
                </button>
              ) : null}
            </div>
          </div>

          {onOpenFolder ? (
            <button
              type="button"
              className={styles.folderButton}
              aria-label="打开文件夹"
              onClick={onOpenFolder}
            >
              <FolderIcon className={styles.folderIcon} />
            </button>
          ) : null}
        </div>
      </div>

      {onManageMembers ? null : (
        <SynClawMemberManageModal
          open={isMemberModalOpen}
          currentMembers={channelMembers}
          availableMembers={availableMembers}
          onCancel={handleCloseMemberModal}
          onConfirm={handleConfirmMemberModal}
        />
      )}
    </div>
  );
};
