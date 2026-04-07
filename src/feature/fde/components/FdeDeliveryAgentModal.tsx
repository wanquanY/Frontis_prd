import type { JSX } from "react";

import classNames from "classnames";
import { Button, Modal } from "antd";

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
  visibleAgentPlazaItems: FdeAgentCatalogItem[];
  selectedAgentIds: string[];
  expertGroupForm: ExpertGroupFormState;
  setAgentScope: (scope: AgentPlazaScope) => void;
  setAgentSceneCategory: (category: string) => void;
  onClose: () => void;
  onToggleAgentSelection: (agentId: string) => void;
  onAddAgentToOrder: (agent: FdeAgentCatalogItem) => void;
  onConfirmAgentGroup: () => void;
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
  visibleAgentPlazaItems,
  selectedAgentIds,
  expertGroupForm,
  setAgentScope,
  setAgentSceneCategory,
  onClose,
  onToggleAgentSelection,
  onAddAgentToOrder,
  onConfirmAgentGroup,
}: FdeDeliveryAgentModalProps): JSX.Element => (
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
        {visibleAgentPlazaItems.map(agent => (
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
                <div className={styles.agentCardVersion}>{agent.releaseVersion}</div>
              </div>
            </div>
            <div className={styles.agentDescription}>{agent.description}</div>
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
                onClick={() => onAddAgentToOrder(agent)}
              >
                添加到订单
              </Button>
            )}
          </div>
        ))}
      </div>
      {agentSelectMode === "group" ? (
        <div className={styles.groupDraftActions}>
          <span className={styles.groupDraftCount}>
            已选择 {selectedAgentIds.length} 个 AI 专家
          </span>
          <div className={styles.drawerActions}>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={onConfirmAgentGroup}>
              创建专家团并加入订单
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  </Modal>
);
