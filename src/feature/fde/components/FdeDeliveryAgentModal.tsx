import { useEffect, useState, type JSX } from "react";

import classNames from "classnames";
import { Button, Modal, Select, message } from "antd";

import { resolveAgentCatalogVersion } from "@/feature/fde/agentCatalog";
import type { FdeAgentCatalogItem } from "@/feature/fde/types";

import type {
  AgentPlazaScope,
  AgentSelectMode,
  ExpertGroupFormState,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryAgentModalProps {
  open: boolean;
  agentSelectMode: AgentSelectMode;
  agentScope: AgentPlazaScope;
  agentSceneCategory: string;
  agentSceneCategories: string[];
  agentPlazaItems: FdeAgentCatalogItem[];
  visibleAgentPlazaItems: FdeAgentCatalogItem[];
  selectedAgentIds: string[];
  expertGroupForm: ExpertGroupFormState;
  setAgentScope: (scope: AgentPlazaScope) => void;
  setAgentSceneCategory: (category: string) => void;
  onClose: () => void;
  onToggleAgentSelection: (agentId: string) => void;
  onAddAgentToOrder: (agent: FdeAgentCatalogItem) => void;
  onConfirmAgentGroup: (agents: FdeAgentCatalogItem[]) => void;
}

/**
 * FDE 交付 Agent 选择弹窗。
 */
export const FdeDeliveryAgentModal = ({
  open,
  agentSelectMode,
  agentScope,
  agentSceneCategory,
  agentSceneCategories,
  agentPlazaItems,
  visibleAgentPlazaItems,
  selectedAgentIds,
  expertGroupForm,
  setAgentScope,
  setAgentSceneCategory,
  onClose,
  onToggleAgentSelection,
  onAddAgentToOrder,
  onConfirmAgentGroup,
}: FdeDeliveryAgentModalProps): JSX.Element => {
  const [selectedAgentVersions, setSelectedAgentVersions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setSelectedAgentVersions({});
    }
  }, [open]);

  const handleVersionChange = (agentId: string, releaseVersion: string): void => {
    setSelectedAgentVersions(previous => ({
      ...previous,
      [agentId]: releaseVersion,
    }));
  };

  const handleConfirmSelection = (): void => {
    if (!expertGroupForm.name.trim() || !expertGroupForm.description.trim()) {
      message.warning("请先补齐专家团名称和介绍。");
      return;
    }

    if (!selectedAgentIds.length) {
      message.warning("请先选择至少一个 AI 专家加入专家团。");
      return;
    }

    const selectedAgents = agentPlazaItems
      .filter(item => selectedAgentIds.includes(item.id))
      .map(item => {
        const selectedVersion = resolveAgentCatalogVersion(item, selectedAgentVersions[item.id]);

        return {
          ...item,
          releaseVersion: selectedVersion.releaseVersion,
          description: selectedVersion.description,
        };
      });

    onConfirmAgentGroup(selectedAgents);
  };

  return (
    <Modal
      title={agentSelectMode === "group" ? "为专家团选择 AI 专家" : "Agent 广场"}
      open={open}
      centered
      width={980}
      rootClassName={styles.agentPlazaModal}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className={styles.agentPlaza}>
        {agentSelectMode === "group" ? (
          <div className={styles.groupDraftBar}>
            <div className={styles.groupDraftTitle}>{expertGroupForm.name}</div>
            <div className={styles.groupDraftDescription}>{expertGroupForm.description}</div>
          </div>
        ) : null}
        <div className={styles.agentScopeTabs}>
          <button
            type="button"
            className={classNames(
              styles.agentScopeButton,
              agentScope === "public" && styles.agentScopeButtonActive,
            )}
            onClick={() => setAgentScope("public")}
          >
            公共
          </button>
          <button
            type="button"
            className={classNames(
              styles.agentScopeButton,
              agentScope === "mine" && styles.agentScopeButtonActive,
            )}
            onClick={() => setAgentScope("mine")}
          >
            我的
          </button>
        </div>

        <div className={styles.agentSceneTabs}>
          {agentSceneCategories.map(category => (
            <button
              key={category}
              type="button"
              className={classNames(
                styles.agentSceneButton,
                agentSceneCategory === category && styles.agentSceneButtonActive,
              )}
              onClick={() => setAgentSceneCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className={styles.agentPlazaList}>
          {visibleAgentPlazaItems.map(agent => {
            const activeVersion = resolveAgentCatalogVersion(agent, selectedAgentVersions[agent.id]);

            return (
              <div
                key={agent.id}
                className={classNames(
                  styles.agentCard,
                  agentSelectMode === "group" &&
                    selectedAgentIds.includes(agent.id) &&
                    styles.agentCardSelected,
                )}
              >
                <div className={styles.agentCardHeader}>
                  <div className={styles.agentAvatar}>{agent.name.slice(0, 1)}</div>
                  <div className={styles.agentCardMeta}>
                    <div className={styles.agentCardName}>{agent.name}</div>
                    <div className={styles.agentCardVersion}>{activeVersion.releaseVersion}</div>
                  </div>
                </div>
                <div className={styles.agentDescription}>{activeVersion.description}</div>
                <div className={styles.agentCardActions}>
                  <Select
                    className={styles.agentVersionSelect}
                    value={activeVersion.releaseVersion}
                    options={agent.versions.map(version => ({
                      label: version.releaseVersion,
                      value: version.releaseVersion,
                    }))}
                    onChange={value => handleVersionChange(agent.id, value)}
                  />
                  {agentSelectMode === "group" ? (
                    <Button
                      type={selectedAgentIds.includes(agent.id) ? "primary" : "default"}
                      className={styles.agentAddButton}
                      onClick={() => onToggleAgentSelection(agent.id)}
                    >
                      {selectedAgentIds.includes(agent.id) ? "已加入专家团" : "加入专家团"}
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      className={styles.agentAddButton}
                      onClick={() =>
                        onAddAgentToOrder({
                          ...agent,
                          releaseVersion: activeVersion.releaseVersion,
                          description: activeVersion.description,
                        })
                      }
                    >
                      添加到订单
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {agentSelectMode === "group" ? (
          <div className={styles.groupDraftActions}>
            <span className={styles.groupDraftCount}>已选择 {selectedAgentIds.length} 个 AI 专家</span>
            <div className={styles.drawerActions}>
              <Button onClick={onClose}>取消</Button>
              <Button type="primary" onClick={handleConfirmSelection}>
                创建专家团并加入订单
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
