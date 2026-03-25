import { useCallback, useEffect, useMemo, useState } from "react";

import { Select } from "antd";
import classNames from "classnames";

import type {
  SynClawAiEmployee,
  SynClawChannelAccessRole,
  SynClawTenantMemberOption,
  SynClawTenantMemberSelection,
} from "@/pages/synclaw/page";
import {
  resolveChannelAccessRoleLabel,
  resolveAiEmployeeStatusMeta,
} from "@/pages/synclaw/utils/pageHelpers";
import { buildNameAvatarMeta } from "@/utils/nameAvatar";

interface SynClawChannelMembersEditorProps {
  styles: Record<string, string>;
  aiEmployees: SynClawAiEmployee[];
  selectedAgentIds: string[];
  tenantEmployees: SynClawTenantMemberOption[];
  selectedTenantMembers: SynClawTenantMemberSelection[];
  loading?: boolean;
  submitting?: boolean;
  initialActiveTab?: "agents" | "members";
  onAgentIdsChange: (agentIds: string[]) => void;
  onTenantMembersChange: (tenantMembers: SynClawTenantMemberSelection[]) => void;
}

/**
 * SynClaw 频道成员编辑器。
 * 复用频道 AI 员工管理弹窗中的 AI 员工与频道员工配置交互。
 */
export const SynClawChannelMembersEditor = ({
  styles,
  aiEmployees,
  selectedAgentIds,
  tenantEmployees,
  selectedTenantMembers,
  loading = false,
  submitting = false,
  initialActiveTab = "agents",
  onAgentIdsChange,
  onTenantMembersChange,
}: SynClawChannelMembersEditorProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<"agents" | "members">(initialActiveTab);

  const renderAvatarFallback = useCallback(
    (seed: string, name: string): JSX.Element => {
      const avatarMeta = buildNameAvatarMeta(seed, name);
      return (
        <span
          className={classNames(styles.manageAgentsAvatarText, {
            [styles.manageAgentsAvatarTextMultiLine]: avatarMeta.lines.length > 1,
          })}
          style={{
            background: avatarMeta.background,
            color: avatarMeta.textColor,
          }}
        >
          {avatarMeta.lines.map(line => (
            <span key={`${seed}-${line}`} className={styles.manageAgentsAvatarTextLine}>
              {line}
            </span>
          ))}
        </span>
      );
    },
    [
      styles.manageAgentsAvatarText,
      styles.manageAgentsAvatarTextLine,
      styles.manageAgentsAvatarTextMultiLine,
    ],
  );

  const renderAvatar = useCallback(
    (seed: string, name: string, avatarUrl?: string): JSX.Element =>
      avatarUrl ? (
        <img className={styles.manageAgentsAvatarImg} src={avatarUrl} alt={name} />
      ) : (
        renderAvatarFallback(seed, name)
      ),
    [renderAvatarFallback, styles.manageAgentsAvatarImg],
  );

  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  const selectedAgentIdSet = useMemo(() => new Set(selectedAgentIds), [selectedAgentIds]);
  const selectedTenantMemberMap = useMemo(
    () => new Map(selectedTenantMembers.map(item => [item.identityId, item])),
    [selectedTenantMembers],
  );

  const availableAiEmployees = useMemo(() => {
    return [...aiEmployees].sort((left, right) => {
      const leftSelected = selectedAgentIdSet.has(left.id) ? 1 : 0;
      const rightSelected = selectedAgentIdSet.has(right.id) ? 1 : 0;
      if (leftSelected !== rightSelected) return rightSelected - leftSelected;
      if (left.bindable !== right.bindable) return left.bindable ? -1 : 1;
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [aiEmployees, selectedAgentIdSet]);

  const sortedTenantEmployees = useMemo(() => {
    return [...tenantEmployees].sort((left, right) => {
      const leftSelected = selectedTenantMemberMap.has(left.id) ? 1 : 0;
      const rightSelected = selectedTenantMemberMap.has(right.id) ? 1 : 0;
      if (leftSelected !== rightSelected) return rightSelected - leftSelected;
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [selectedTenantMemberMap, tenantEmployees]);

  const handleToggleAgent = useCallback(
    (agent: SynClawAiEmployee) => {
      const nextAgentIds = selectedAgentIds.includes(agent.id)
        ? selectedAgentIds.filter(item => item !== agent.id)
        : agent.bindable
          ? [...selectedAgentIds, agent.id]
          : selectedAgentIds;
      onAgentIdsChange(nextAgentIds);
    },
    [onAgentIdsChange, selectedAgentIds],
  );

  const handleToggleTenantMember = useCallback(
    (identityId: string) => {
      const matched = selectedTenantMembers.find(item => item.identityId === identityId);
      if (matched && (matched.accessRole === "owner" || matched.accessRole === "manager")) {
        return;
      }
      if (matched) {
        onTenantMembersChange(selectedTenantMembers.filter(item => item.identityId !== identityId));
        return;
      }
      onTenantMembersChange([...selectedTenantMembers, { identityId, accessRole: "viewer" }]);
    },
    [onTenantMembersChange, selectedTenantMembers],
  );

  const handleTenantMemberRoleChange = useCallback(
    (identityId: string, accessRole: SynClawChannelAccessRole) => {
      onTenantMembersChange(
        selectedTenantMembers.map(item =>
          item.identityId === identityId ? { ...item, accessRole } : item,
        ),
      );
    },
    [onTenantMembersChange, selectedTenantMembers],
  );

  return (
    <div className={styles.manageAgentsEditor}>
      <div className={styles.manageAgentsTabs} role="tablist" aria-label="频道成员管理标签">
        <button
          type="button"
          role="tab"
          className={classNames(styles.manageAgentsTab, {
            [styles.manageAgentsTabActive]: activeTab === "agents",
          })}
          aria-selected={activeTab === "agents"}
          onClick={() => setActiveTab("agents")}
        >
          <span>AI员工</span>
          <span className={styles.manageAgentsTabCount}>{selectedAgentIds.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          className={classNames(styles.manageAgentsTab, {
            [styles.manageAgentsTabActive]: activeTab === "members",
          })}
          aria-selected={activeTab === "members"}
          onClick={() => setActiveTab("members")}
        >
          <span>频道员工</span>
          <span className={styles.manageAgentsTabCount}>{selectedTenantMembers.length}</span>
        </button>
      </div>

      {activeTab === "agents" ? (
        <div className={styles.manageAgentsSection}>
          <div className={styles.manageAgentsSectionHeader}>
            <div className={styles.manageAgentsSectionTitle}>AI 员工列表</div>
            <div className={styles.manageAgentsSectionMeta}>点击列表项即可加入或移出当前频道</div>
          </div>
          {loading ? (
            <div className={styles.manageAgentsEmpty}>加载中...</div>
          ) : aiEmployees.length === 0 ? (
            <div className={styles.manageAgentsEmpty}>暂无可用 AI 员工</div>
          ) : (
            <div className={styles.manageAgentsList} aria-label="AI员工列表">
              {availableAiEmployees.map(employee => {
                const isSelected = selectedAgentIdSet.has(employee.id);
                const disabled = submitting || (!employee.bindable && !isSelected);
                const statusMeta = resolveAiEmployeeStatusMeta(employee);
                return (
                  <button
                    key={employee.id}
                    type="button"
                    className={classNames(styles.manageAgentsListItem, {
                      [styles.manageAgentsListItemSelected]: isSelected,
                      [styles.manageAgentsListItemDisabled]: !employee.bindable,
                    })}
                    aria-pressed={isSelected}
                    onClick={() => handleToggleAgent(employee)}
                    disabled={disabled}
                    title={!employee.bindable ? employee.disabledReason : undefined}
                  >
                    <span className={styles.manageAgentsListLeading}>
                      <span className={styles.manageAgentsAvatar} aria-hidden="true">
                        {renderAvatar(employee.id, employee.name, employee.avatarUrl)}
                      </span>
                      <span className={styles.manageAgentsListBody}>
                        <span className={styles.manageAgentsListTitle}>{employee.name}</span>
                        <span className={styles.manageAgentsListSubtitle}>{employee.role}</span>
                        <span className={styles.manageAgentsListDescription}>
                          {statusMeta.description}
                        </span>
                      </span>
                    </span>
                    <span className={styles.manageAgentsListTrailing}>
                      <span
                        className={classNames(styles.manageAgentsStatusTag, {
                          [styles.manageAgentsStatusSuccess]: statusMeta.tone === "success",
                          [styles.manageAgentsStatusWarning]: statusMeta.tone === "warning",
                          [styles.manageAgentsStatusDanger]: statusMeta.tone === "danger",
                        })}
                      >
                        {statusMeta.label}
                      </span>
                      <span className={styles.manageAgentsSelectionLabel}>
                        {isSelected ? "已加入频道" : employee.bindable ? "点击加入" : "暂不可加入"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.manageAgentsSection} aria-label="频道员工">
          <div className={styles.manageAgentsSectionHeader}>
            <div className={styles.manageAgentsSectionTitle}>频道员工列表</div>
            <div className={styles.manageAgentsSectionMeta}>列表中直接选择成员并设置权限</div>
          </div>
          {sortedTenantEmployees.length === 0 ? (
            <div className={styles.manageAgentsEmpty}>暂无可选频道员工</div>
          ) : (
            <div className={styles.manageAgentsList} aria-label="频道员工列表">
              {sortedTenantEmployees.map(employee => {
                const selectedMember = selectedTenantMemberMap.get(employee.id);
                const isSelected = Boolean(selectedMember);
                const isFixedRole =
                  selectedMember?.accessRole === "owner" ||
                  selectedMember?.accessRole === "manager";
                return (
                  <div
                    key={employee.id}
                    className={classNames(styles.manageAgentsListItem, {
                      [styles.manageAgentsListItemSelected]: isSelected,
                    })}
                  >
                    <button
                      type="button"
                      className={styles.manageAgentsMemberToggle}
                      aria-pressed={isSelected}
                      onClick={() => handleToggleTenantMember(employee.id)}
                      disabled={submitting || isFixedRole}
                    >
                      <span className={styles.manageAgentsListLeading}>
                        <span className={styles.manageAgentsAvatar} aria-hidden="true">
                          {renderAvatar(employee.id, employee.name)}
                        </span>
                        <span className={styles.manageAgentsListBody}>
                          <span className={styles.manageAgentsListTitle}>{employee.name}</span>
                          <span className={styles.manageAgentsListSubtitle}>
                            {employee.subtitle || "频道成员"}
                          </span>
                        </span>
                      </span>
                      <span className={styles.manageAgentsSelectionLabel}>
                        {isSelected ? "已加入频道" : "点击加入"}
                      </span>
                    </button>
                    <div className={styles.manageAgentsMemberTrailing}>
                      {isSelected ? (
                        isFixedRole ? (
                          <span className={styles.manageAgentsSelectionLabel}>
                            {resolveChannelAccessRoleLabel(selectedMember.accessRole)}
                          </span>
                        ) : (
                          <Select<"speaker" | "viewer">
                            size="small"
                            value={selectedMember?.accessRole === "speaker" ? "speaker" : "viewer"}
                            options={[
                              { value: "speaker", label: "可发言" },
                              { value: "viewer", label: "仅观看" },
                            ]}
                            onChange={value => handleTenantMemberRoleChange(employee.id, value)}
                            disabled={submitting}
                          />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
