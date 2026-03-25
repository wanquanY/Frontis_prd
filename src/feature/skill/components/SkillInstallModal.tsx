import { App as AntdApp, Alert, Button, Descriptions, Empty, Modal, Select, Spin, Tag } from "antd";
import classNames from "classnames";
import { useMemo } from "react";

import type { AdminAiEmployeeListItem } from "@/types/prdPrototype";
import { resolveSkillInstallLifecycle } from "@/feature/skill/installStatus";
import type { SkillInstallModalProps } from "@/feature/skill/types";

import styles from "./SkillInstallModal.module.less";

const resolveInstallableAgent = (agent: AdminAiEmployeeListItem): boolean =>
  Boolean(
    agent.managed_by_coworker &&
    typeof agent.coworker_agent_id === "number" &&
    agent.runtime_id &&
    agent.runtime_id.trim() &&
    String(agent.runtime_provisioning_status || "")
      .trim()
      .toLowerCase() === "applied",
  );

const resolveAgentUnavailableReason = (agent: AdminAiEmployeeListItem): string | null => {
  if (!agent.managed_by_coworker || typeof agent.coworker_agent_id !== "number") {
    return "当前不是 coworker 受管 AI员工";
  }
  if (!agent.runtime_id || !agent.runtime_id.trim()) {
    return "未绑定 Runtime";
  }
  const provisioningStatus = String(agent.runtime_provisioning_status || "")
    .trim()
    .toLowerCase();
  if (provisioningStatus && provisioningStatus !== "applied") {
    return `尚未在 Runtime 生效（${provisioningStatus}）`;
  }
  if (!provisioningStatus) {
    return "尚未收到 Runtime 生效状态";
  }
  return null;
};

const resolveAgentWorkspaceLabel = (agent: AdminAiEmployeeListItem): string =>
  String(agent.runtime_id || "").trim() || "未绑定工作站";

const resolveRemoteStatusLabel = (status: AdminAiEmployeeListItem["remote_status"]): string => {
  switch (status) {
    case "online":
      return "在线";
    case "executing":
      return "执行中";
    case "connection_failed":
      return "连接失败";
    case "revoked":
      return "已撤销";
    case "offline":
    default:
      return "离线";
  }
};

/**
 * SkillInstallModal
 *
 * 安装到 cowork-agent 的确认弹窗：
 * - 选择目标 AI员工
 * - 展示选中 AI员工 的安装状态
 * - 支持安装 / 移除
 */
export const SkillInstallModal = ({
  open,
  skill,
  agents,
  agentsLoading,
  agentsErrorMessage,
  selectedAgentId,
  binding,
  installStatus,
  agentSkillsLoading,
  agentSkillsErrorMessage,
  submitting,
  onCancel,
  onAgentChange,
  onInstall,
  onForceReinstall,
  onUninstall,
  onRetryAgents,
  onRetryAgentSkills,
}: SkillInstallModalProps): JSX.Element => {
  const { modal } = AntdApp.useApp();

  const selectedAgent = useMemo(
    () => agents.find(agent => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );
  const selectOptions = useMemo(
    () =>
      Array.from(
        agents
          .reduce<
            Map<
              string,
              { label: string; options: Array<{ value: string; label: string; disabled: boolean }> }
            >
          >((result, agent) => {
            const groupLabel = resolveAgentWorkspaceLabel(agent);
            const currentGroup = result.get(groupLabel) ?? {
              label: groupLabel,
              options: [],
            };
            const unavailableReason = resolveAgentUnavailableReason(agent);
            currentGroup.options.push({
              value: agent.id,
              label:
                unavailableReason === null ? agent.name : `${agent.name}（${unavailableReason}）`,
              disabled: !resolveInstallableAgent(agent),
            });
            result.set(groupLabel, currentGroup);
            return result;
          }, new Map())
          .values(),
      ),
    [agents],
  );
  const isInstalled = Boolean(binding?.enabled);
  const installLifecycle = useMemo(
    () => resolveSkillInstallLifecycle(installStatus),
    [installStatus],
  );
  const isInstalling = Boolean(installLifecycle?.isRunning);
  const isInstallFailed = Boolean(installLifecycle?.isFailed);
  const uninstallRequested = binding?.enabled === false;
  const shouldShowUninstall =
    !isInstalling && (Boolean(installLifecycle?.isInstalled) || (isInstalled && !isInstallFailed));
  const shouldShowForceReinstall = Boolean(
    selectedAgent && (isInstallFailed || isInstalling || shouldShowUninstall),
  );
  const installButtonLabel = isInstallFailed ? "重试安装" : "安装到 AI员工";

  const handleUninstall = (): void => {
    if (!skill || !selectedAgent) {
      return;
    }

    modal.confirm({
      title: `从「${selectedAgent.name}」移除 Skill`,
      content: `确认移除「${skill.name}」？Runtime 下次同步时会从该 AI员工 的 workspace 删除。`,
      okText: "确认移除",
      cancelText: "取消",
      okButtonProps: {
        danger: true,
        loading: submitting,
      },
      onOk: () => onUninstall(),
    });
  };

  return (
    <Modal
      open={open}
      title={skill ? `安装「${skill.name}」到 AI员工` : "安装到 AI员工"}
      width={640}
      destroyOnClose
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          关闭
        </Button>,
        shouldShowUninstall ? (
          <Button key="uninstall" danger loading={submitting} onClick={handleUninstall}>
            卸载
          </Button>
        ) : null,
        shouldShowForceReinstall ? (
          <Button
            key="force-reinstall"
            loading={submitting}
            onClick={() => void onForceReinstall()}
          >
            强制重新安装
          </Button>
        ) : null,
        !shouldShowUninstall ? (
          <Button
            key="install"
            type="primary"
            loading={submitting && !isInstalling}
            className={classNames(styles.actionButton, {
              [styles.actionButtonProgressState]: isInstalling,
              [styles.actionButtonFailed]: isInstallFailed,
            })}
            disabled={
              isInstalling ||
              !skill ||
              !selectedAgent ||
              !resolveInstallableAgent(selectedAgent) ||
              (!skill.latest_skill_version_id && !isInstalled)
            }
            onClick={() => void onInstall()}
          >
            {isInstalling && installLifecycle ? (
              <span className={styles.actionButtonProgress}>
                <span
                  className={styles.actionButtonProgressFill}
                  style={{ width: `${installLifecycle.progressPercent}%` }}
                />
                <span className={styles.actionButtonProgressContent}>
                  <span>{installLifecycle.messageLabel}</span>
                  <span>{installLifecycle.progressPercent}%</span>
                </span>
              </span>
            ) : (
              installButtonLabel
            )}
          </Button>
        ) : null,
      ]}
    >
      <Alert
        showIcon
        type="info"
        message="Skill 会按 AI员工 独立安装"
        description="安装后会同步到该 cowork-agent 自己的 workspace，不会影响其他 AI员工。"
        style={{ marginBottom: 16 }}
      />

      {agentsErrorMessage ? (
        <Alert
          showIcon
          type="error"
          message="AI员工 列表加载失败"
          description={agentsErrorMessage}
          action={
            <Button size="small" onClick={onRetryAgents}>
              重试
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {agentsLoading ? (
        <div className={styles.loadingState}>
          <Spin />
        </div>
      ) : null}

      {!agentsLoading && agents.length === 0 ? (
        <Empty
          description="当前没有可管理的 coworker AI员工"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : null}

      {!agentsLoading && agents.length > 0 ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <div className={styles.sectionLabel}>目标 AI员工</div>
            <Select
              showSearch
              style={{ width: "100%" }}
              placeholder="请选择要安装 Skill 的 AI员工"
              value={selectedAgentId}
              options={selectOptions}
              optionFilterProp="label"
              onChange={value => onAgentChange(value)}
            />
          </div>

          {selectedAgent ? (
            <Descriptions
              size="small"
              bordered
              column={1}
              style={{ marginBottom: 16 }}
              items={[
                {
                  key: "name",
                  label: "AI员工",
                  children: selectedAgent.name,
                },
                {
                  key: "runtime",
                  label: "Runtime",
                  children: resolveAgentWorkspaceLabel(selectedAgent),
                },
                {
                  key: "provisioning_status",
                  label: "生效状态",
                  children: selectedAgent.runtime_provisioning_status || "未回传",
                },
                {
                  key: "model",
                  label: "模型",
                  children: selectedAgent.primary_model || selectedAgent.model || "未设置",
                },
                {
                  key: "status",
                  label: "远程状态",
                  children: (
                    <Tag color={selectedAgent.remote_status === "online" ? "green" : "default"}>
                      {resolveRemoteStatusLabel(selectedAgent.remote_status)}
                    </Tag>
                  ),
                },
              ]}
            />
          ) : null}

          {selectedAgent && !resolveInstallableAgent(selectedAgent) ? (
            <Alert
              showIcon
              type="warning"
              style={{ marginBottom: 16 }}
              message="当前 AI员工 暂不可安装 Skill"
              description={
                resolveAgentUnavailableReason(selectedAgent) || "请等待 Runtime 生效后再试"
              }
            />
          ) : null}

          {agentSkillsErrorMessage ? (
            <Alert
              showIcon
              type="warning"
              message="AI员工 安装状态读取失败"
              description={agentSkillsErrorMessage}
              action={
                <Button size="small" onClick={onRetryAgentSkills}>
                  重试
                </Button>
              }
              style={{ marginBottom: 16 }}
            />
          ) : null}

          {agentSkillsLoading ? (
            <div className={styles.loadingState}>
              <Spin />
            </div>
          ) : null}

          {!agentSkillsLoading && !agentSkillsErrorMessage && selectedAgent ? (
            <Alert
              showIcon
              type={shouldShowUninstall ? "success" : uninstallRequested ? "warning" : "info"}
              message={
                shouldShowUninstall
                  ? "该 AI员工 已安装此 Skill"
                  : uninstallRequested
                    ? "该 AI员工 正在卸载此 Skill"
                    : "该 AI员工 尚未安装此 Skill"
              }
              description={
                shouldShowUninstall
                  ? `当前目标版本 ID：${binding?.target_skill_version_id ?? "-"}，修订号：${binding?.item_revision ?? 0}`
                  : uninstallRequested
                    ? "已提交卸载计划，等待 Runtime 删除本地文件并回传最终状态。"
                    : "点击“安装到 AI员工”后，服务端会更新该 AI员工 的 skill plan，并通过 runtime 同步到本地。"
              }
            />
          ) : null}

          {selectedAgent && installLifecycle?.errorMessage && isInstallFailed ? (
            <div className={styles.installProgressError}>{installLifecycle.errorMessage}</div>
          ) : null}

          {selectedAgent && installLifecycle?.isRunning ? (
            <Alert
              showIcon
              type="warning"
              style={{ marginTop: 16 }}
              message="如果长时间停在当前进度，可强制重新安装"
              description="强制重新安装会重新生成一条新的安装任务，避免卡死在旧进度。"
            />
          ) : null}
        </>
      ) : null}
    </Modal>
  );
};
