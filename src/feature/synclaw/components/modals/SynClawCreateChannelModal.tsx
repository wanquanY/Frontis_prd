import { type KeyboardEvent, type SVGProps, useCallback, useEffect, useState } from "react";

import { Input, Modal } from "antd";

import { CommonButton } from "@/components/CommonButton/CommonButton";
import { SynClawChannelMembersEditor } from "@/feature/synclaw/components/modals/SynClawChannelMembersEditor";
import type {
  SynClawAiEmployee,
  SynClawChannelModalMode,
  SynClawCreateChannelSubmitPayload,
  SynClawTenantMemberOption,
  SynClawTenantMemberSelection,
} from "@/feature/synclaw/types/page";
import type { SynClawSpaceItem } from "@/feature/synclaw/types";

interface SynClawCreateChannelModalProps {
  styles: Record<string, string>;
  mode: SynClawChannelModalMode;
  open: boolean;
  spaces: SynClawSpaceItem[];
  aiEmployees: SynClawAiEmployee[];
  tenantEmployees: SynClawTenantMemberOption[];
  aiEmployeesLoading?: boolean;
  tenantEmployeesLoading?: boolean;
  defaultSpaceId?: string;
  initialChannelName?: string;
  initialAiEmployeeIds?: string[];
  initialTenantMembers?: SynClawTenantMemberSelection[];
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: SynClawCreateChannelSubmitPayload) => void;
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
 * SynClaw 新建/编辑频道弹窗。
 */
export const SynClawCreateChannelModal = ({
  styles,
  mode,
  open,
  spaces,
  aiEmployees,
  tenantEmployees,
  aiEmployeesLoading = false,
  tenantEmployeesLoading = false,
  defaultSpaceId,
  initialChannelName,
  initialAiEmployeeIds = [],
  initialTenantMembers = [],
  submitting = false,
  onCancel,
  onSubmit,
}: SynClawCreateChannelModalProps): JSX.Element => {
  const isRenameMode = mode === "rename";
  const [spaceId, setSpaceId] = useState<string>(defaultSpaceId ?? "");
  const [channelName, setChannelName] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedTenantMembers, setSelectedTenantMembers] = useState<
    SynClawTenantMemberSelection[]
  >([]);

  useEffect(() => {
    if (!open) return;
    setChannelName(initialChannelName ?? "");
    setSpaceId(defaultSpaceId ?? spaces[0]?.id ?? "");
  }, [defaultSpaceId, initialChannelName, open, spaces]);

  useEffect(() => {
    if (!open) return;
    setSelectedEmployeeIds(initialAiEmployeeIds.filter(Boolean));
  }, [initialAiEmployeeIds, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedTenantMembers(initialTenantMembers.filter(item => item.identityId));
  }, [initialTenantMembers, open]);

  const handleSubmit = useCallback(() => {
    if (submitting) return;
    onSubmit({
      spaceId,
      channelName: channelName.trim(),
      aiEmployeeIds: selectedEmployeeIds.filter(Boolean),
      tenantMembers: selectedTenantMembers,
    });
  }, [channelName, onSubmit, selectedEmployeeIds, selectedTenantMembers, spaceId, submitting]);

  const handleChannelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const handleAgentIdsChange = useCallback((nextAgentIds: string[]) => {
    setSelectedEmployeeIds(nextAgentIds);
  }, []);

  const handleTenantMembersChange = useCallback(
    (nextTenantMembers: SynClawTenantMemberSelection[]) => {
      setSelectedTenantMembers(nextTenantMembers);
    },
    [],
  );

  return (
    <Modal
      open={open}
      centered
      destroyOnHidden={true}
      footer={null}
      closable={false}
      width={860}
      rootClassName={styles.createChannelModal}
      onCancel={onCancel}
    >
      <div
        className={styles.createChannelCard}
        aria-label={isRenameMode ? "编辑频道弹窗" : "创建频道弹窗"}
      >
        <div className={styles.createChannelHeader}>
          <div className={styles.createChannelHeaderText}>
            <div className={styles.createChannelTitle}>
              {isRenameMode ? "编辑频道" : "创建频道"}
            </div>
            <div className={styles.createChannelSubtitle}>
              {isRenameMode
                ? "更新频道名称与协作成员配置。"
                : "设置频道名称和协作成员，快速创建一个新的频道。"}
            </div>
          </div>
          <button
            type="button"
            className={styles.createChannelCloseButton}
            onClick={onCancel}
            disabled={submitting}
            aria-label="关闭"
          >
            <CloseIcon className={styles.createChannelCloseIcon} />
          </button>
        </div>

        <div className={styles.createChannelBody}>
          <div className={styles.createChannelFieldGroup} aria-label="频道名称">
            <div className={styles.createChannelSectionHeader}>
              <label className={styles.createChannelLabel} htmlFor="synclaw-new-channel-name">
                频道名称
              </label>
            </div>
            <Input
              id="synclaw-new-channel-name"
              value={channelName}
              size="large"
              className={styles.createChannelInput}
              placeholder="请输入频道名称"
              onChange={event => setChannelName(event.target.value)}
              onKeyDown={handleChannelKeyDown}
              disabled={submitting}
            />
          </div>

          <div className={styles.createChannelFieldGroup} aria-label="频道成员配置">
            <div className={styles.createChannelSectionHeader}>
              <div className={styles.createChannelLabel}>频道成员配置</div>
              <div className={styles.createChannelSectionMeta}>
                AI员工 {selectedEmployeeIds.length} 个，频道员工 {selectedTenantMembers.length} 名
              </div>
            </div>
            <SynClawChannelMembersEditor
              styles={styles}
              aiEmployees={aiEmployees}
              selectedAgentIds={selectedEmployeeIds}
              tenantEmployees={tenantEmployees}
              selectedTenantMembers={selectedTenantMembers}
              loading={aiEmployeesLoading || tenantEmployeesLoading}
              submitting={submitting}
              initialActiveTab="agents"
              onAgentIdsChange={handleAgentIdsChange}
              onTenantMembersChange={handleTenantMembersChange}
            />
          </div>
        </div>

        <div className={styles.createChannelFooter}>
          <button
            type="button"
            className={styles.createChannelCancelButton}
            onClick={onCancel}
            disabled={submitting}
          >
            取消
          </button>
          <CommonButton
            variant="confirm"
            className={styles.createChannelConfirmButton}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? mode === "rename"
                ? "保存中..."
                : "创建中..."
              : mode === "rename"
                ? "保存"
                : "创建频道"}
          </CommonButton>
        </div>
      </div>
    </Modal>
  );
};
