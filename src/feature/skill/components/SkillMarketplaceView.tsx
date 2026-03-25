import { useCallback, useEffect, useMemo, useState } from "react";

import type { CoworkerSkillItem } from "@/apis/SkillApi";
import { SkillEditModal } from "@/feature/skill/components/SkillEditModal";
import { SkillInstallModal } from "@/feature/skill/components/SkillInstallModal";
import { SkillMarketplaceContent } from "@/feature/skill/components/SkillMarketplaceContent";
import { SkillMarketplaceSidebar } from "@/feature/skill/components/SkillMarketplaceSidebar";
import { SkillUploadModal } from "@/feature/skill/components/SkillUploadModal";
import { SkillVersionModal } from "@/feature/skill/components/SkillVersionModal";
import { useSkillMarketplace } from "@/feature/skill/hooks/useSkillMarketplace";
import { resolveSkillInstallLifecycle } from "@/feature/skill/installStatus";

import styles from "./SkillMarketplaceView.module.less";

const MY_SKILLS_CATEGORY_KEY = "my_skills";

/**
 * SynClaw 空间技能广场视图属性。
 */
export interface SkillMarketplaceViewProps {
  onBackToWorkspace?: () => void;
}

/**
 * SynClaw 空间技能广场主视图。
 */
export const SkillMarketplaceView = ({
  onBackToWorkspace,
}: SkillMarketplaceViewProps): JSX.Element => {
  const {
    skills,
    categories,
    activeCategory,
    total,
    loading,
    categoriesLoading,
    errorMessage,
    categoriesErrorMessage,
    keyword,
    publisherType,
    isUploadModalOpen,
    uploadSubmitting,
    currentIdentityId,
    editingSkill,
    updatingSkill,
    installingSkill,
    editSubmitting,
    versionSubmitting,
    installSubmitting,
    installAgents,
    installAgentsLoading,
    installAgentsErrorMessage,
    selectedInstallAgentId,
    agentSkillsLoading,
    agentSkillsErrorMessage,
    agentSkillBindingsByAgentId,
    selectedAgentSkillInstallStatusMap,
    selectedAgentSkills,
    selectedAgentSkillBinding,
    selectedSkillInstallStatus,
    skillSummaryMap,
    setActiveCategory,
    setKeyword,
    setPublisherType,
    handleSearch,
    openUploadModal,
    closeUploadModal,
    openEditModal,
    closeEditModal,
    openVersionModal,
    closeVersionModal,
    closeInstallModal,
    setSelectedInstallAgentId,
    installSkillToAgent,
    forceReinstallSkillToAgent,
    uninstallSkillFromAgent,
    installSkillToSelectedAgent,
    uninstallSkillFromSelectedAgent,
    reloadInstallAgents,
    reloadSelectedAgentSkills,
    submitUpload,
    submitEdit,
    submitVersion,
    removeSkill,
    reloadCategories,
    reload,
  } = useSkillMarketplace();

  const [expandedAgentId, setExpandedAgentId] = useState<string | undefined>(undefined);

  const editableCategories = useMemo(
    () => categories.filter(category => category.key !== MY_SKILLS_CATEGORY_KEY),
    [categories],
  );

  const selectedAgentName = useMemo(
    () => installAgents.find(agent => agent.id === selectedInstallAgentId)?.name,
    [installAgents, selectedInstallAgentId],
  );

  const selectedAgentSkillIdSet = useMemo(
    () => new Set(selectedAgentSkills.filter(item => item.enabled).map(item => item.skill_id)),
    [selectedAgentSkills],
  );

  useEffect(() => {
    setExpandedAgentId(selectedInstallAgentId);
  }, [selectedInstallAgentId]);

  const handleSelectAgent = useCallback(
    (agentId: string): void => {
      setSelectedInstallAgentId(agentId);
      setExpandedAgentId(current => (current === agentId ? undefined : agentId));
    },
    [setSelectedInstallAgentId],
  );

  const handleCardAction = useCallback(
    (skill: CoworkerSkillItem): void => {
      if (!selectedInstallAgentId || installSubmitting) {
        return;
      }

      const installLifecycle = resolveSkillInstallLifecycle(
        selectedAgentSkillInstallStatusMap[skill.skill_id],
      );
      const shouldRetryInstall = Boolean(installLifecycle?.isFailed);

      if (selectedAgentSkillIdSet.has(skill.skill_id) && !shouldRetryInstall) {
        void uninstallSkillFromSelectedAgent(skill);
        return;
      }

      if (!skill.latest_skill_version_id) {
        return;
      }

      void installSkillToSelectedAgent(skill);
    },
    [
      installSkillToSelectedAgent,
      installSubmitting,
      selectedAgentSkillInstallStatusMap,
      selectedAgentSkillIdSet,
      selectedInstallAgentId,
      uninstallSkillFromSelectedAgent,
    ],
  );

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <SkillMarketplaceSidebar
          installAgents={installAgents}
          installAgentsLoading={installAgentsLoading}
          installAgentsErrorMessage={installAgentsErrorMessage}
          selectedInstallAgentId={selectedInstallAgentId}
          expandedAgentId={expandedAgentId}
          agentSkillBindingsByAgentId={agentSkillBindingsByAgentId}
          skillSummaryMap={skillSummaryMap}
          onSelectAgent={handleSelectAgent}
          onRetryInstallAgents={reloadInstallAgents}
          onBackToWorkspace={onBackToWorkspace}
        />

        <SkillMarketplaceContent
          skills={skills}
          categories={categories}
          activeCategory={activeCategory}
          total={total}
          loading={loading}
          categoriesLoading={categoriesLoading}
          errorMessage={errorMessage}
          categoriesErrorMessage={categoriesErrorMessage}
          keyword={keyword}
          publisherType={publisherType}
          currentIdentityId={currentIdentityId}
          selectedInstallAgentId={selectedInstallAgentId}
          selectedAgentName={selectedAgentName}
          selectedAgentSkillIdSet={selectedAgentSkillIdSet}
          agentSkillsLoading={agentSkillsLoading}
          agentSkillsErrorMessage={agentSkillsErrorMessage}
          selectedAgentSkillInstallStatusMap={selectedAgentSkillInstallStatusMap}
          installSubmitting={installSubmitting}
          installingSkill={installingSkill}
          onCategoryChange={setActiveCategory}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          onPublisherTypeChange={setPublisherType}
          onOpenUpload={openUploadModal}
          onRetryCategories={reloadCategories}
          onRetrySelectedAgentSkills={reloadSelectedAgentSkills}
          onRetry={reload}
          onEditSkill={openEditModal}
          onUpdateSkill={openVersionModal}
          onRemoveSkill={removeSkill}
          onCardAction={handleCardAction}
        />
      </div>

      <SkillUploadModal
        open={isUploadModalOpen}
        categories={editableCategories}
        submitting={uploadSubmitting}
        onCancel={closeUploadModal}
        onSubmit={submitUpload}
      />
      <SkillEditModal
        open={editingSkill !== null}
        skill={editingSkill}
        categories={editableCategories}
        submitting={editSubmitting}
        onCancel={closeEditModal}
        onSubmit={submitEdit}
      />
      <SkillVersionModal
        open={updatingSkill !== null}
        skill={updatingSkill}
        submitting={versionSubmitting}
        onCancel={closeVersionModal}
        onSubmit={submitVersion}
      />
      <SkillInstallModal
        open={installingSkill !== null}
        skill={installingSkill}
        agents={installAgents}
        agentsLoading={installAgentsLoading}
        agentsErrorMessage={installAgentsErrorMessage}
        selectedAgentId={selectedInstallAgentId}
        binding={selectedAgentSkillBinding}
        installStatus={selectedSkillInstallStatus}
        agentSkillsLoading={agentSkillsLoading}
        agentSkillsErrorMessage={agentSkillsErrorMessage}
        submitting={installSubmitting}
        onCancel={closeInstallModal}
        onAgentChange={setSelectedInstallAgentId}
        onInstall={installSkillToAgent}
        onForceReinstall={forceReinstallSkillToAgent}
        onUninstall={uninstallSkillFromAgent}
        onRetryAgents={reloadInstallAgents}
        onRetryAgentSkills={reloadSelectedAgentSkills}
      />
    </div>
  );
};
