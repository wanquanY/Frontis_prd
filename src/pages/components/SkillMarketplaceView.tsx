import { useCallback, useMemo, useState } from "react";

import { Modal, message } from "antd";

import type {
  CoworkerAgentSkillInstallStatusResponse,
  CoworkerAgentSkillItem,
  CoworkerSkillItem,
  SkillPublisherType,
} from "@/types/prdPrototype";
import { SkillEditModal } from "@/feature/skill/components/SkillEditModal";
import { SkillInstallModal } from "@/feature/skill/components/SkillInstallModal";
import { SkillMarketplaceContent } from "@/feature/skill/components/SkillMarketplaceContent";
import { SkillMarketplaceSidebar } from "@/feature/skill/components/SkillMarketplaceSidebar";
import { SkillUploadModal } from "@/feature/skill/components/SkillUploadModal";
import { SkillVersionModal } from "@/feature/skill/components/SkillVersionModal";
import { resolveSkillInstallLifecycle } from "@/feature/skill/installStatus";
import type {
  SkillCategoryFilter,
  SkillEditSubmitPayload,
  SkillUploadSubmitPayload,
  SkillVersionSubmitPayload,
} from "@/feature/skill/types";
import {
  INITIAL_SKILL_AGENT_BINDINGS_BY_AGENT_ID,
  INITIAL_SKILL_CATEGORIES,
  INITIAL_SKILL_INSTALL_AGENTS,
  INITIAL_SKILL_INSTALL_STATUS_BY_AGENT_ID,
  INITIAL_SKILL_MARKETPLACE_ITEMS,
  PRD_CURRENT_IDENTITY_ID,
} from "@/mocks/mockData";

import styles from "@/feature/skill/components/SkillMarketplaceView.module.less";

const MY_SKILLS_CATEGORY_KEY = "my_skills";

const cloneAgentBindings = (): Record<string, CoworkerAgentSkillItem[]> => {
  return Object.fromEntries(
    Object.entries(INITIAL_SKILL_AGENT_BINDINGS_BY_AGENT_ID).map(([agentId, bindings]) => [
      agentId,
      bindings.map(item => ({ ...item })),
    ]),
  );
};

const cloneInstallStatuses = (): Record<string, Record<number, CoworkerAgentSkillInstallStatusResponse>> => {
  return Object.fromEntries(
    Object.entries(INITIAL_SKILL_INSTALL_STATUS_BY_AGENT_ID).map(([agentId, statuses]) => [
      agentId,
      Object.fromEntries(
        Object.entries(statuses).map(([skillId, value]) => [Number(skillId), JSON.parse(JSON.stringify(value))]),
      ),
    ]),
  );
};

const buildRunningStatus = (
  agentId: number,
  skill: CoworkerSkillItem,
  currentRevision: number,
): CoworkerAgentSkillInstallStatusResponse => ({
  runtime_id: "mock-runtime",
  agent_id: agentId,
  skill_id: skill.skill_id,
  binding: {
    target_skill_version_id: skill.latest_skill_version_id,
    enabled: true,
    item_revision: currentRevision,
  },
  job: {
    job_id: Date.now(),
    status: "running",
    plan_generation: 1,
    plan_hash: `job-${agentId}-${skill.skill_id}`,
  },
  target: {
    target_id: skill.skill_id,
    status: "running",
    current_stage: "installing",
    progress_percent: 80,
    progress_message: "running_skill_installer",
  },
  inventory: {
    local_modified: false,
    install_status: "running",
    install_stage: "installing",
    progress_percent: 80,
    progress_message: "running_skill_installer",
  },
});

const buildInstalledStatus = (
  agentId: number,
  skill: CoworkerSkillItem,
  revision: number,
): CoworkerAgentSkillInstallStatusResponse => ({
  runtime_id: "mock-runtime",
  agent_id: agentId,
  skill_id: skill.skill_id,
  binding: {
    target_skill_version_id: skill.latest_skill_version_id,
    enabled: true,
    item_revision: revision,
  },
  job: null,
  target: {
    target_id: skill.skill_id,
    status: "installed",
    current_stage: "installed",
    progress_percent: 100,
  },
  inventory: {
    local_modified: false,
    install_status: "installed",
    install_stage: "installed",
    progress_percent: 100,
  },
});

const buildDisabledStatus = (
  agentId: number,
  skill: CoworkerSkillItem,
  revision: number,
): CoworkerAgentSkillInstallStatusResponse => ({
  runtime_id: "mock-runtime",
  agent_id: agentId,
  skill_id: skill.skill_id,
  binding: {
    target_skill_version_id: skill.latest_skill_version_id,
    enabled: false,
    item_revision: revision,
  },
  job: null,
  target: {
    target_id: skill.skill_id,
    status: "disabled",
    current_stage: "disabled",
    progress_percent: 100,
    progress_message: "skill_disabled_by_plan",
  },
  inventory: {
    local_modified: false,
    install_status: "disabled",
    install_stage: "disabled",
    progress_percent: 100,
    progress_message: "skill_disabled_by_plan",
  },
});

export const SkillMarketplaceView = (): JSX.Element => {
  const [skills, setSkills] = useState<CoworkerSkillItem[]>(INITIAL_SKILL_MARKETPLACE_ITEMS);
  const [activeCategory, setActiveCategory] = useState<SkillCategoryFilter>("all");
  const [keyword, setKeyword] = useState<string>("");
  const [publisherType, setPublisherType] = useState<SkillPublisherType>("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [editingSkill, setEditingSkill] = useState<CoworkerSkillItem | null>(null);
  const [updatingSkill, setUpdatingSkill] = useState<CoworkerSkillItem | null>(null);
  const [installingSkill, setInstallingSkill] = useState<CoworkerSkillItem | null>(null);
  const [installSubmitting, setInstallSubmitting] = useState<boolean>(false);
  const [uploadSubmitting, setUploadSubmitting] = useState<boolean>(false);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [versionSubmitting, setVersionSubmitting] = useState<boolean>(false);
  const [selectedInstallAgentId, setSelectedInstallAgentId] = useState<string | undefined>(
    INITIAL_SKILL_INSTALL_AGENTS[0]?.id,
  );
  const [expandedAgentId, setExpandedAgentId] = useState<string | undefined>(
    INITIAL_SKILL_INSTALL_AGENTS[0]?.id,
  );
  const [agentSkillBindingsByAgentId, setAgentSkillBindingsByAgentId] = useState<
    Record<string, CoworkerAgentSkillItem[]>
  >(cloneAgentBindings);
  const [agentSkillInstallStatusByAgentId, setAgentSkillInstallStatusByAgentId] = useState<
    Record<string, Record<number, CoworkerAgentSkillInstallStatusResponse>>
  >(cloneInstallStatuses);

  const categories = useMemo(() => {
    const mineCategory = {
      category_id: -1,
      key: MY_SKILLS_CATEGORY_KEY,
      name: "我的技能",
      sort_order: 0,
      status: "active",
    };
    return [mineCategory, ...INITIAL_SKILL_CATEGORIES];
  }, []);

  const skillSummaryMap = useMemo(
    () =>
      skills.reduce<Record<number, { name: string }>>((result, item) => {
        result[item.skill_id] = { name: item.name };
        return result;
      }, {}),
    [skills],
  );

  const selectedAgentSkills = useMemo(
    () => agentSkillBindingsByAgentId[selectedInstallAgentId ?? ""] ?? [],
    [agentSkillBindingsByAgentId, selectedInstallAgentId],
  );

  const selectedAgentSkillInstallStatusMap = useMemo(
    () => agentSkillInstallStatusByAgentId[selectedInstallAgentId ?? ""] ?? {},
    [agentSkillInstallStatusByAgentId, selectedInstallAgentId],
  );

  const selectedAgentSkillIdSet = useMemo(
    () => new Set(selectedAgentSkills.filter(item => item.enabled).map(item => item.skill_id)),
    [selectedAgentSkills],
  );

  const filteredSkills = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return skills.filter(skill => {
      const matchCategory =
        activeCategory === "all"
          ? true
          : activeCategory === MY_SKILLS_CATEGORY_KEY
            ? typeof skill.publisher === "object" && skill.publisher?.owner_identity_id === PRD_CURRENT_IDENTITY_ID
            : skill.category.category_id === activeCategory;
      const matchPublisher =
        publisherType === "all"
          ? true
          : publisherType === "official"
            ? skill.scope === "official"
            : skill.scope === "tenant";
      const matchKeyword =
        !normalizedKeyword ||
        [skill.name, skill.description ?? "", skill.skill_key]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword);
      return matchCategory && matchPublisher && matchKeyword;
    });
  }, [activeCategory, keyword, publisherType, skills]);

  const selectedAgentSkillBinding = useMemo(
    () =>
      installingSkill
        ? (agentSkillBindingsByAgentId[selectedInstallAgentId ?? ""] ?? []).find(
            item => item.skill_id === installingSkill.skill_id,
          ) ?? null
        : null,
    [agentSkillBindingsByAgentId, installingSkill, selectedInstallAgentId],
  );

  const selectedSkillInstallStatus = useMemo(
    () => (installingSkill ? selectedAgentSkillInstallStatusMap[installingSkill.skill_id] ?? null : null),
    [installingSkill, selectedAgentSkillInstallStatusMap],
  );

  const applyInstallToAgent = useCallback(
    async (skill: CoworkerSkillItem, agentId: string, force = false): Promise<void> => {
      if (!agentId) return;
      const resolvedAgentId = Number(agentId);
      const existingBindings = agentSkillBindingsByAgentId[agentId] ?? [];
      const existingBinding = existingBindings.find(item => item.skill_id === skill.skill_id);
      const nextRevision = (existingBinding?.item_revision ?? 0) + 1;

      setInstallSubmitting(true);
      setInstallingSkill(skill);
      setAgentSkillInstallStatusByAgentId(prev => ({
        ...prev,
        [agentId]: {
          ...(prev[agentId] ?? {}),
          [skill.skill_id]: buildRunningStatus(resolvedAgentId, skill, nextRevision),
        },
      }));

      await new Promise(resolve => window.setTimeout(resolve, force ? 240 : 360));

      setAgentSkillBindingsByAgentId(prev => {
        const nextItems = prev[agentId] ? [...prev[agentId]] : [];
        const targetIndex = nextItems.findIndex(item => item.skill_id === skill.skill_id);
        const nextBinding: CoworkerAgentSkillItem = {
          agent_id: resolvedAgentId,
          skill_id: skill.skill_id,
          target_skill_version_id: skill.latest_skill_version_id,
          enabled: true,
          item_revision: nextRevision,
          updated_at: new Date().toISOString(),
        };
        if (targetIndex >= 0) {
          nextItems[targetIndex] = nextBinding;
        } else {
          nextItems.push(nextBinding);
        }
        return {
          ...prev,
          [agentId]: nextItems,
        };
      });
      setAgentSkillInstallStatusByAgentId(prev => ({
        ...prev,
        [agentId]: {
          ...(prev[agentId] ?? {}),
          [skill.skill_id]: buildInstalledStatus(resolvedAgentId, skill, nextRevision),
        },
      }));
      setInstallSubmitting(false);
      message.success(force ? `已重新安装「${skill.name}」` : `已安装「${skill.name}」`);
    },
    [agentSkillBindingsByAgentId],
  );

  const removeSkillFromAgent = useCallback(
    async (skill: CoworkerSkillItem, agentId: string): Promise<void> => {
      if (!agentId) return;
      const resolvedAgentId = Number(agentId);
      const existingBinding = (agentSkillBindingsByAgentId[agentId] ?? []).find(
        item => item.skill_id === skill.skill_id,
      );
      const nextRevision = (existingBinding?.item_revision ?? 0) + 1;
      setInstallSubmitting(true);
      await new Promise(resolve => window.setTimeout(resolve, 240));
      setAgentSkillBindingsByAgentId(prev => ({
        ...prev,
        [agentId]: (prev[agentId] ?? []).filter(item => item.skill_id !== skill.skill_id),
      }));
      setAgentSkillInstallStatusByAgentId(prev => ({
        ...prev,
        [agentId]: {
          ...(prev[agentId] ?? {}),
          [skill.skill_id]: buildDisabledStatus(resolvedAgentId, skill, nextRevision),
        },
      }));
      setInstallSubmitting(false);
      setInstallingSkill(null);
      message.success(`已从 AI 员工卸载「${skill.name}」`);
    },
    [agentSkillBindingsByAgentId],
  );

  const handleCardAction = useCallback(
    (skill: CoworkerSkillItem): void => {
      if (!selectedInstallAgentId || installSubmitting) return;
      const installLifecycle = resolveSkillInstallLifecycle(
        selectedAgentSkillInstallStatusMap[skill.skill_id],
      );
      const shouldRetryInstall = Boolean(installLifecycle?.isFailed);
      if (selectedAgentSkillIdSet.has(skill.skill_id) && !shouldRetryInstall) {
        void removeSkillFromAgent(skill, selectedInstallAgentId);
        return;
      }
      void applyInstallToAgent(skill, selectedInstallAgentId, shouldRetryInstall);
    },
    [applyInstallToAgent, installSubmitting, removeSkillFromAgent, selectedAgentSkillIdSet, selectedAgentSkillInstallStatusMap, selectedInstallAgentId],
  );

  const handleSelectAgent = useCallback((agentId: string): void => {
    setSelectedInstallAgentId(agentId);
    setExpandedAgentId(current => (current === agentId ? undefined : agentId));
  }, []);

  const handleSubmitUpload = useCallback(async (payload: SkillUploadSubmitPayload): Promise<void> => {
    setUploadSubmitting(true);
    await new Promise(resolve => window.setTimeout(resolve, 300));
    const category = INITIAL_SKILL_CATEGORIES.find(item => item.category_id === payload.categoryId) ?? INITIAL_SKILL_CATEGORIES[0];
    setSkills(prev => [
      {
        skill_id: Date.now(),
        skill_key: payload.name.trim().toLowerCase().replace(/\s+/g, "-"),
        name: payload.name.trim(),
        description: payload.description.trim(),
        latest_version: payload.version.trim(),
        latest_skill_version_id: Date.now(),
        scope: "tenant",
        visibility: payload.visibility,
        category,
        cover: null,
        publisher: {
          name: "Frontis 产品组",
          publisher_type: "tenant",
          owner_tenant_id: 1,
          owner_identity_id: PRD_CURRENT_IDENTITY_ID,
        },
        updated_at: new Date().toISOString(),
        owner_tenant_id: 1,
      },
      ...prev,
    ]);
    setUploadSubmitting(false);
    setIsUploadModalOpen(false);
    message.success(`已导入「${payload.name.trim()}」`);
  }, []);

  const handleSubmitEdit = useCallback(async (payload: SkillEditSubmitPayload): Promise<void> => {
    setEditSubmitting(true);
    await new Promise(resolve => window.setTimeout(resolve, 240));
    setSkills(prev =>
      prev.map(item =>
        item.skill_id === payload.skillId
          ? {
              ...item,
              name: payload.name.trim(),
              description: payload.description.trim(),
              visibility: payload.visibility,
              category:
                INITIAL_SKILL_CATEGORIES.find(category => category.category_id === payload.categoryId) ?? item.category,
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setEditSubmitting(false);
    setEditingSkill(null);
    message.success("技能信息已更新");
  }, []);

  const handleSubmitVersion = useCallback(async (payload: SkillVersionSubmitPayload): Promise<void> => {
    setVersionSubmitting(true);
    await new Promise(resolve => window.setTimeout(resolve, 240));
    setSkills(prev =>
      prev.map(item =>
        item.skill_id === payload.skillId
          ? {
              ...item,
              latest_version: payload.version.trim(),
              latest_skill_version_id: Date.now(),
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setVersionSubmitting(false);
    setUpdatingSkill(null);
    message.success("已导入新版本");
  }, []);

  const handleRemoveSkill = useCallback((skill: CoworkerSkillItem): void => {
    Modal.confirm({
      title: "移除技能",
      content: `确认移除「${skill.name}」吗？`,
      centered: true,
      okButtonProps: { danger: true },
      onOk: () => {
        setSkills(prev => prev.filter(item => item.skill_id !== skill.skill_id));
        setAgentSkillBindingsByAgentId(prev =>
          Object.fromEntries(
            Object.entries(prev).map(([agentId, bindings]) => [
              agentId,
              bindings.filter(item => item.skill_id !== skill.skill_id),
            ]),
          ),
        );
        message.success(`已移除「${skill.name}」`);
      },
    });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <SkillMarketplaceSidebar
          installAgents={INITIAL_SKILL_INSTALL_AGENTS}
          installAgentsLoading={false}
          installAgentsErrorMessage=""
          selectedInstallAgentId={selectedInstallAgentId}
          expandedAgentId={expandedAgentId}
          agentSkillBindingsByAgentId={agentSkillBindingsByAgentId}
          skillSummaryMap={skillSummaryMap}
          onSelectAgent={handleSelectAgent}
          onRetryInstallAgents={() => undefined}
        />

        <SkillMarketplaceContent
          skills={filteredSkills}
          categories={categories}
          activeCategory={activeCategory}
          total={filteredSkills.length}
          loading={false}
          categoriesLoading={false}
          errorMessage=""
          categoriesErrorMessage=""
          keyword={keyword}
          publisherType={publisherType}
          currentIdentityId={PRD_CURRENT_IDENTITY_ID}
          selectedInstallAgentId={selectedInstallAgentId}
          selectedAgentName={INITIAL_SKILL_INSTALL_AGENTS.find(item => item.id === selectedInstallAgentId)?.name}
          selectedAgentSkillIdSet={selectedAgentSkillIdSet}
          agentSkillsLoading={false}
          agentSkillsErrorMessage=""
          selectedAgentSkillInstallStatusMap={selectedAgentSkillInstallStatusMap}
          installSubmitting={installSubmitting}
          installingSkill={installingSkill}
          onCategoryChange={setActiveCategory}
          onKeywordChange={setKeyword}
          onSearch={value => setKeyword(value ?? keyword)}
          onPublisherTypeChange={setPublisherType}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onRetryCategories={() => undefined}
          onRetrySelectedAgentSkills={() => undefined}
          onRetry={() => undefined}
          onEditSkill={setEditingSkill}
          onUpdateSkill={setUpdatingSkill}
          onRemoveSkill={handleRemoveSkill}
          onCardAction={handleCardAction}
        />
      </div>

      <SkillUploadModal
        open={isUploadModalOpen}
        categories={INITIAL_SKILL_CATEGORIES}
        submitting={uploadSubmitting}
        onCancel={() => setIsUploadModalOpen(false)}
        onSubmit={handleSubmitUpload}
      />
      <SkillEditModal
        open={editingSkill !== null}
        skill={editingSkill}
        categories={INITIAL_SKILL_CATEGORIES}
        submitting={editSubmitting}
        onCancel={() => setEditingSkill(null)}
        onSubmit={handleSubmitEdit}
      />
      <SkillVersionModal
        open={updatingSkill !== null}
        skill={updatingSkill}
        submitting={versionSubmitting}
        onCancel={() => setUpdatingSkill(null)}
        onSubmit={handleSubmitVersion}
      />
      <SkillInstallModal
        open={installingSkill !== null}
        skill={installingSkill}
        agents={INITIAL_SKILL_INSTALL_AGENTS}
        agentsLoading={false}
        agentsErrorMessage=""
        selectedAgentId={selectedInstallAgentId}
        binding={selectedAgentSkillBinding}
        installStatus={selectedSkillInstallStatus}
        agentSkillsLoading={false}
        agentSkillsErrorMessage=""
        submitting={installSubmitting}
        onCancel={() => setInstallingSkill(null)}
        onAgentChange={setSelectedInstallAgentId}
        onInstall={async () => {
          if (!installingSkill || !selectedInstallAgentId) return;
          await applyInstallToAgent(installingSkill, selectedInstallAgentId);
        }}
        onForceReinstall={async () => {
          if (!installingSkill || !selectedInstallAgentId) return;
          await applyInstallToAgent(installingSkill, selectedInstallAgentId, true);
        }}
        onUninstall={async () => {
          if (!installingSkill || !selectedInstallAgentId) return;
          await removeSkillFromAgent(installingSkill, selectedInstallAgentId);
        }}
        onRetryAgents={() => undefined}
        onRetryAgentSkills={() => undefined}
      />
    </div>
  );
};
