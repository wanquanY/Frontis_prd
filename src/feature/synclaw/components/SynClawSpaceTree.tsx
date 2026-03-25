import { useMemo } from "react";
import { Dropdown, Tooltip } from "antd";
import type { MenuProps } from "antd";
import classNames from "classnames";
import { PlusOutlined } from "@ant-design/icons";

import styles from "./SynClawSpaceTree.module.less";
import type { SynClawSpaceItem } from "@/feature/synclaw/types";
import EllipsisIcon from "@/assets/images/ellipsis-icon.png";
import EllipsisHoverIcon from "@/assets/images/ellipsis-hover-icon.png";
import { buildSynClawSpaceAvatarMeta } from "@/feature/synclaw/utils/spaceAvatar";
import type { CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem } from "@/apis/CoworkerChannelApi";

interface SynClawSpaceTreeProps {
  spaces: SynClawSpaceItem[];
  expandedSpaceIds: Set<string>;
  activeSpaceId?: string;
  activeChannelId?: string;
  channelRuntimeStatusById?: Record<
    string,
    CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem
  >;
  onToggleSpace: (spaceId: string) => void;
  onSelectSpace?: (spaceId: string) => void;
  onCreateSpace?: () => void;
  onSelectChannel: (spaceId: string, channelId: string) => void;
  onAddChannel?: (spaceId: string) => void;
  onRenameSpace?: (spaceId: string, spaceName: string) => void;
  onDeleteSpace?: (spaceId: string, spaceName: string) => void;
  onRenameChannel?: (spaceId: string, channelId: string, channelName: string) => void;
  onDeleteChannel?: (spaceId: string, channelId: string, channelName: string) => void;
}

const ChevronDownIcon = ({ className }: { className?: string }): JSX.Element => (
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
      d="M4.5 6.5L8 10L11.5 6.5"
      stroke="currentColor"
      strokeWidth="1.33"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * SynClawSpaceTree
 *
 * SynClaw 空间/频道导航：左侧空间 rail，右侧展示当前空间的频道。
 */
export const SynClawSpaceTree = ({
  spaces,
  expandedSpaceIds,
  activeSpaceId,
  activeChannelId,
  channelRuntimeStatusById,
  onToggleSpace,
  onSelectSpace,
  onCreateSpace,
  onSelectChannel,
  onAddChannel,
  onRenameSpace,
  onDeleteSpace,
  onRenameChannel,
  onDeleteChannel,
}: SynClawSpaceTreeProps): JSX.Element => {
  const selectedSpace = useMemo(() => {
    if (!spaces.length) return undefined;
    return spaces.find(space => space.id === activeSpaceId) ?? spaces[0];
  }, [activeSpaceId, spaces]);

  const selectedSpaceExpanded = selectedSpace
    ? !activeSpaceId || expandedSpaceIds.has(selectedSpace.id)
    : false;
  const hasSpaceActions = Boolean(onRenameSpace || onDeleteSpace);
  const hasChannelActions = Boolean(onRenameChannel || onDeleteChannel);

  const spaceMenuItems: MenuProps["items"] = [
    { key: "rename", label: "编辑空间" },
    { key: "delete", label: "删除", danger: true },
  ];

  const renderMoreIcon = (): JSX.Element => (
    <span className={styles.channelMoreIconWrap} aria-hidden="true">
      <img
        className={classNames(styles.channelMoreIcon, styles.channelMoreIconDefault)}
        src={EllipsisIcon}
        alt=""
      />
      <img
        className={classNames(styles.channelMoreIcon, styles.channelMoreIconHover)}
        src={EllipsisHoverIcon}
        alt=""
      />
    </span>
  );

  return (
    <div className={styles.layout} aria-label="空间与频道列表">
      <div className={styles.spaceRail} aria-label="空间列表">
        {onCreateSpace ? (
          <Tooltip placement="right" title="创建空间">
            <button
              type="button"
              className={classNames(styles.spaceRailItem, styles.spaceRailCreateButton)}
              aria-label="创建空间"
              onClick={onCreateSpace}
            >
              <span className={styles.spaceRailCreateAvatar}>
                <PlusOutlined className={styles.spaceRailCreateIcon} />
              </span>
            </button>
          </Tooltip>
        ) : null}

        {spaces.map(space => {
          const isActiveSpace = selectedSpace?.id === space.id;
          const avatarMeta = buildSynClawSpaceAvatarMeta(space.id, space.name);
          const avatarStyle = {
            background: avatarMeta.background,
            color: avatarMeta.textColor,
          };
          const isMultiLineAvatar = avatarMeta.lines.length > 1;

          return (
            <Tooltip key={space.id} placement="right" title={space.name}>
              <button
                type="button"
                className={classNames(styles.spaceRailItem, {
                  [styles.spaceRailItemActive]: isActiveSpace,
                })}
                aria-label={`空间：${space.name}`}
                onClick={() => {
                  if (onSelectSpace) {
                    onSelectSpace(space.id);
                    return;
                  }
                  onToggleSpace(space.id);
                }}
              >
                <span
                  className={classNames(styles.spaceRailIndicator, {
                    [styles.spaceRailIndicatorActive]: isActiveSpace,
                  })}
                  aria-hidden="true"
                />
                <span className={styles.spaceRailAvatar} style={avatarStyle}>
                  {space.coverUrl ? (
                    <img className={styles.spaceRailAvatarImg} src={space.coverUrl} alt="" />
                  ) : (
                    <span
                      className={classNames(styles.spaceRailAvatarText, {
                        [styles.spaceRailAvatarTextMultiLine]: isMultiLineAvatar,
                      })}
                    >
                      {avatarMeta.lines.map(line => (
                        <span key={`${space.id}-${line}`} className={styles.spaceRailAvatarLine}>
                          {line}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className={styles.channelPanel}>
        {selectedSpace ? (
          <>
            <div className={styles.channelPanelHeader}>
              <button
                type="button"
                className={styles.channelPanelTitleButton}
                aria-label={`切换 ${selectedSpaceExpanded ? "收起" : "展开"} 频道列表`}
                onClick={() => onToggleSpace(selectedSpace.id)}
              >
                <ChevronDownIcon
                  className={classNames(styles.channelPanelToggleIcon, {
                    [styles.channelPanelToggleIconExpanded]: selectedSpaceExpanded,
                  })}
                />
                <span className={styles.channelPanelTitle} title={selectedSpace.name}>
                  {selectedSpace.name}
                </span>
              </button>

              <div className={styles.channelPanelActions}>
                {onAddChannel ? (
                  <button
                    type="button"
                    className={styles.spaceAddChannel}
                    aria-label="新建频道"
                    onClick={() => onAddChannel(selectedSpace.id)}
                  >
                    <PlusOutlined className={styles.spaceAddChannelIcon} />
                  </button>
                ) : null}

                {hasSpaceActions ? (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: spaceMenuItems,
                      onClick: info => {
                        if (info.key === "rename") {
                          onRenameSpace?.(selectedSpace.id, selectedSpace.name);
                          return;
                        }
                        if (info.key === "delete") {
                          onDeleteSpace?.(selectedSpace.id, selectedSpace.name);
                        }
                      },
                    }}
                  >
                    <button type="button" className={styles.spaceMore} aria-label="更多操作">
                      {renderMoreIcon()}
                    </button>
                  </Dropdown>
                ) : null}
              </div>
            </div>

            <div className={styles.channelPanelDivider} />

            {selectedSpaceExpanded ? (
              <div className={styles.channelList}>
                {selectedSpace.channels.length > 0 ? (
                  selectedSpace.channels.map(channel => {
                    const isActiveChannel = channel.id === activeChannelId;
                    const runtimeStatus = channelRuntimeStatusById?.[channel.id];
                    const channelAgents = runtimeStatus?.agents ?? [];
                    const busy = runtimeStatus?.busy === true;
                    const visibleAgents = channelAgents.slice(0, 3);
                    const extraAgentCount = Math.max(
                      0,
                      channelAgents.length - visibleAgents.length,
                    );
                    const agentTitle = channelAgents.map(item => item.displayName).join(", ");
                    const channelMenuItems: MenuProps["items"] = [
                      { key: "rename", label: "编辑" },
                      { key: "delete", label: "删除", danger: true },
                    ];

                    return (
                      <div
                        key={channel.id}
                        className={classNames(styles.channelItem, {
                          [styles.channelItemActive]: isActiveChannel,
                        })}
                        role="button"
                        tabIndex={0}
                        aria-label={`频道：${channel.name}`}
                        onClick={() => onSelectChannel(selectedSpace.id, channel.id)}
                        onKeyDown={event => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectChannel(selectedSpace.id, channel.id);
                          }
                        }}
                      >
                        <div className={styles.channelTitleRow}>
                          <span className={styles.channelTitle} title={channel.name}>
                            {channel.name}
                          </span>
                          {busy ? (
                            <span className={styles.channelBusyDot} aria-hidden="true" />
                          ) : null}
                        </div>

                        {channelAgents.length ? (
                          <div className={styles.channelAgentStack} title={agentTitle}>
                            {visibleAgents.map((agent, index) => {
                              const avatarMeta = buildSynClawSpaceAvatarMeta(
                                agent.agentId,
                                agent.displayName,
                              );
                              return (
                                <span
                                  key={`${channel.id}-${agent.agentId}`}
                                  className={classNames(styles.channelAgentAvatar, {
                                    [styles.channelAgentAvatarFirst]: index === 0,
                                    [styles.channelAgentAvatarWorking]:
                                      agent.isWorkingHere === true,
                                  })}
                                  style={
                                    agent.avatarUrl
                                      ? undefined
                                      : {
                                          background: avatarMeta.background,
                                          color: avatarMeta.textColor,
                                        }
                                  }
                                >
                                  {agent.avatarUrl ? (
                                    <img
                                      src={agent.avatarUrl}
                                      alt={agent.displayName}
                                      className={styles.channelAgentAvatarImg}
                                    />
                                  ) : (
                                    avatarMeta.compactText
                                  )}
                                </span>
                              );
                            })}
                            {extraAgentCount > 0 ? (
                              <span
                                className={classNames(
                                  styles.channelAgentAvatar,
                                  styles.channelAgentAvatarMore,
                                )}
                              >
                                +{extraAgentCount}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {hasChannelActions ? (
                          <Dropdown
                            trigger={["click"]}
                            menu={{
                              items: channelMenuItems,
                              onClick: info => {
                                if (info.key === "rename") {
                                  onRenameChannel?.(selectedSpace.id, channel.id, channel.name);
                                  return;
                                }
                                if (info.key === "delete") {
                                  onDeleteChannel?.(selectedSpace.id, channel.id, channel.name);
                                }
                              },
                            }}
                          >
                            <button
                              type="button"
                              className={classNames(styles.channelMore, {
                                [styles.channelMoreActive]: isActiveChannel,
                              })}
                              aria-label="更多操作"
                              onClick={event => {
                                event.stopPropagation();
                              }}
                            >
                              {renderMoreIcon()}
                            </button>
                          </Dropdown>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.channelEmpty}>当前空间还没有频道</div>
                )}
              </div>
            ) : (
              <div className={styles.channelCollapsedHint}>已收起频道列表</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
