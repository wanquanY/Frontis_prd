import { type SVGProps, useCallback, useEffect, useRef, useState } from "react";

import { Modal } from "antd";

import { CommonButton } from "@/components/CommonButton/CommonButton";
import { SynClawChannelMembersEditor } from "@/feature/synclaw/components/modals/SynClawChannelMembersEditor";
import type {
  SynClawAiEmployee,
  SynClawTenantMemberOption,
  SynClawTenantMemberSelection,
} from "@/feature/synclaw/types/page";
import {
  buildAgentSelectionSnapshot,
  buildChannelMemberSelectionSnapshot,
} from "@/feature/synclaw/utils/pageHelpers";

interface SynClawManageAgentsModalProps {
  styles: Record<string, string>;
  open: boolean;
  aiEmployees: SynClawAiEmployee[];
  selectedAgentIds: string[];
  tenantEmployees: SynClawTenantMemberOption[];
  selectedTenantMembers: SynClawTenantMemberSelection[];
  loading?: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    agentIds: string[];
    tenantMembers: SynClawTenantMemberSelection[];
  }) => void;
}

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

/**
 * SynClaw 管理频道成员弹窗。
 */
export const SynClawManageAgentsModal = ({
  styles,
  open,
  aiEmployees,
  selectedAgentIds,
  tenantEmployees,
  selectedTenantMembers,
  loading = false,
  submitting = false,
  onCancel,
  onSubmit,
}: SynClawManageAgentsModalProps): JSX.Element => {
  const [currentAgentIds, setCurrentAgentIds] = useState<string[]>(selectedAgentIds);
  const [currentTenantMembers, setCurrentTenantMembers] =
    useState<SynClawTenantMemberSelection[]>(selectedTenantMembers);
  const selectedAgentIdsSnapshot = buildAgentSelectionSnapshot(selectedAgentIds);
  const selectedTenantMembersSnapshot = buildChannelMemberSelectionSnapshot(selectedTenantMembers);
  const lastSelectedAgentIdsSnapshotRef = useRef<string>("");
  const lastSelectedTenantMembersSnapshotRef = useRef<string>("");

  useEffect(() => {
    if (open) return;
    lastSelectedAgentIdsSnapshotRef.current = "";
    lastSelectedTenantMembersSnapshotRef.current = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (lastSelectedAgentIdsSnapshotRef.current === selectedAgentIdsSnapshot) return;
    lastSelectedAgentIdsSnapshotRef.current = selectedAgentIdsSnapshot;
    setCurrentAgentIds(selectedAgentIds);
  }, [open, selectedAgentIds, selectedAgentIdsSnapshot]);

  useEffect(() => {
    if (!open) return;
    if (lastSelectedTenantMembersSnapshotRef.current === selectedTenantMembersSnapshot) return;
    lastSelectedTenantMembersSnapshotRef.current = selectedTenantMembersSnapshot;
    setCurrentTenantMembers(selectedTenantMembers);
  }, [open, selectedTenantMembers, selectedTenantMembersSnapshot]);

  const handleSubmit = useCallback(() => {
    onSubmit({
      agentIds: currentAgentIds,
      tenantMembers: currentTenantMembers,
    });
  }, [currentAgentIds, currentTenantMembers, onSubmit]);

  return (
    <Modal
      open={open}
      centered
      destroyOnHidden={true}
      footer={null}
      closable={false}
      width={860}
      rootClassName={styles.manageAgentsModal}
      onCancel={onCancel}
    >
      <div className={styles.manageAgentsCard} aria-label="管理频道 AI员工 弹窗">
        <div className={styles.manageAgentsHeader}>
          <div className={styles.manageAgentsHeaderText}>
            <div className={styles.manageAgentsTitle}>管理 AI 员工</div>
            <div className={styles.manageAgentsSubtitle}>
              为当前频道挑选可协作的 AI 员工，并配置频道员工权限。
            </div>
          </div>
          <button
            type="button"
            className={styles.manageAgentsCloseButton}
            onClick={onCancel}
            disabled={submitting}
            aria-label="关闭"
          >
            <CloseIcon className={styles.manageAgentsCloseIcon} />
          </button>
        </div>

        <SynClawChannelMembersEditor
          styles={styles}
          aiEmployees={aiEmployees}
          selectedAgentIds={currentAgentIds}
          tenantEmployees={tenantEmployees}
          selectedTenantMembers={currentTenantMembers}
          loading={loading}
          submitting={submitting}
          initialActiveTab="agents"
          onAgentIdsChange={setCurrentAgentIds}
          onTenantMembersChange={setCurrentTenantMembers}
        />

        <div className={styles.manageAgentsFooter}>
          <button
            type="button"
            className={styles.manageAgentsCancelButton}
            onClick={onCancel}
            disabled={submitting}
          >
            取消
          </button>
          <CommonButton
            variant="confirm"
            className={styles.manageAgentsConfirmButton}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "保存中..." : "保存"}
          </CommonButton>
        </div>
      </div>
    </Modal>
  );
};
