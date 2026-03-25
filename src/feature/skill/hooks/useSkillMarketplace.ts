import { App as AntdApp } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAdminAiEmployeeList, type AdminAiEmployeeListItem } from "@/apis/AdminAiEmployeeApi";
import {
  deleteCoworkerAgentSkill,
  deleteCoworkerSkill,
  forceReinstallCoworkerAgentSkill,
  getCoworkerAgentSkills,
  getCoworkerAgentSkillInstallStatus,
  getCoworkerSkillCategories,
  getCoworkerSkills,
  importCoworkerSkill,
  importCoworkerSkillVersion,
  installCoworkerAgentSkill,
  updateCoworkerSkill,
  type CoworkerAgentSkillInstallStatusResponse,
  type CoworkerAgentSkillItem,
  type CoworkerSkillItem,
  type CoworkerSkillListResponse,
  type CoworkerSkillUpdateRequest as CoworkerSkillUpdateApiRequest,
  type SkillCategoryInfo,
} from "@/apis/SkillApi";
import type {
  SkillCategoryFilter,
  SkillEditSubmitPayload,
  SkillSummaryMap,
  SkillVersionSubmitPayload,
  UseSkillMarketplaceResult,
} from "@/feature/skill/types";
import { uploadSkillAsset } from "@/feature/skill/uploadSkillAsset";
import { shouldPollSkillInstallStatus } from "@/feature/skill/installStatus";
import { useAuthStore } from "@/store/auth";
import { subscribeSystemEvent } from "@/services/systemEvents";

const DEFAULT_SKILL_LIMIT = 60;
const MY_SKILLS_CATEGORY_KEY = "my_skills";
const POST_MUTATION_REFRESH_DELAYS = [1500, 4000, 8000] as const;
const INSTALL_STATUS_POLL_INTERVAL_MS = 2000;

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
};

const createIdempotencyKey = (): string => {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return `skill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isAgentInstallable = (agent: AdminAiEmployeeListItem): boolean =>
  Boolean(
    agent.managed_by_coworker &&
    typeof agent.coworker_agent_id === "number" &&
    agent.runtime_id &&
    agent.runtime_id.trim(),
  );

const resolveCoworkerAgentId = (
  agent: AdminAiEmployeeListItem | null | undefined,
): number | null =>
  typeof agent?.coworker_agent_id === "number" && agent.managed_by_coworker
    ? agent.coworker_agent_id
    : null;

const normalizeAgentSkillList = (
  items: CoworkerAgentSkillItem[] | null | undefined,
): CoworkerAgentSkillItem[] => (Array.isArray(items) ? items : []);

const pruneAgentSkillInstallStatuses = (
  current: Record<string, Record<number, CoworkerAgentSkillInstallStatusResponse>>,
  agentId: string,
  skillIds: number[],
): Record<string, Record<number, CoworkerAgentSkillInstallStatusResponse>> => {
  const currentStatuses = current[agentId];
  if (!currentStatuses) {
    return current;
  }

  const allowedSkillIds = new Set(skillIds);
  return {
    ...current,
    [agentId]: Object.fromEntries(
      Object.entries(currentStatuses).filter(([skillId]) => allowedSkillIds.has(Number(skillId))),
    ),
  };
};

const normalizeSkillList = (
  response: CoworkerSkillListResponse | null | undefined,
): Pick<UseSkillMarketplaceResult, "skills" | "total"> => {
  const items = Array.isArray(response?.items) ? response.items : [];
  const total = typeof response?.total === "number" ? response.total : items.length;
  return { skills: items, total };
};

const normalizeCategoryList = (
  response: { items?: SkillCategoryInfo[] } | null | undefined,
): SkillCategoryInfo[] => {
  const items = Array.isArray(response?.items) ? response.items : [];
  return [...items].sort((left, right) => left.sort_order - right.sort_order);
};

const isSystemMySkillsCategory = (category: SkillCategoryInfo): boolean =>
  category.key === MY_SKILLS_CATEGORY_KEY;

const isCategoryAvailable = (
  categories: SkillCategoryInfo[],
  category: SkillCategoryFilter,
): boolean => {
  if (category === "all") {
    return true;
  }
  if (category === MY_SKILLS_CATEGORY_KEY) {
    return categories.some(isSystemMySkillsCategory);
  }
  return categories.some(item => item.category_id === category);
};

/**
 * useSkillMarketplace
 *
 * 技能广场列表业务 Hook：
 * - 管理筛选条件、弹窗开关与表单提交状态
 * - 拉取技能列表与分类数据，并区分不同失败路径
 * - 统一处理上传、编辑、版本更新与删除后的刷新策略
 */
export const useSkillMarketplace = (): UseSkillMarketplaceResult => {
  const { message, modal } = AntdApp.useApp();
  const currentIdentityId = useAuthStore(state => state.user?.id);
  const [skills, setSkills] = useState<UseSkillMarketplaceResult["skills"]>([]);
  const [skillSummaryMap, setSkillSummaryMap] = useState<SkillSummaryMap>({});
  const [categories, setCategories] = useState<SkillCategoryInfo[]>([]);
  const [activeCategory, setActiveCategory] = useState<SkillCategoryFilter>("all");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [categoriesErrorMessage, setCategoriesErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [publisherType, setPublisherType] =
    useState<UseSkillMarketplaceResult["publisherType"]>("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CoworkerSkillItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<CoworkerSkillItem | null>(null);
  const [versionSubmitting, setVersionSubmitting] = useState(false);
  const [installingSkill, setInstallingSkill] = useState<CoworkerSkillItem | null>(null);
  const [installSubmitting, setInstallSubmitting] = useState(false);
  const [installAgents, setInstallAgents] = useState<AdminAiEmployeeListItem[]>([]);
  const [installAgentsLoading, setInstallAgentsLoading] = useState(false);
  const [installAgentsErrorMessage, setInstallAgentsErrorMessage] = useState("");
  const [selectedInstallAgentId, setSelectedInstallAgentIdState] = useState<string | undefined>(
    undefined,
  );
  const [agentSkillsLoading, setAgentSkillsLoading] = useState(false);
  const [agentSkillsErrorMessage, setAgentSkillsErrorMessage] = useState("");
  const [agentSkillBindingsByAgentId, setAgentSkillBindingsByAgentId] = useState<
    Record<string, CoworkerAgentSkillItem[]>
  >({});
  const [agentSkillInstallStatusByAgentId, setAgentSkillInstallStatusByAgentId] = useState<
    Record<string, Record<number, CoworkerAgentSkillInstallStatusResponse>>
  >({});
  const [skillsReloadToken, setSkillsReloadToken] = useState(0);
  const [categoriesReloadToken, setCategoriesReloadToken] = useState(0);
  const postMutationTimerRefs = useRef<number[]>([]);

  const reloadSkills = useCallback((): void => {
    setSkillsReloadToken(count => count + 1);
  }, []);

  const reloadCategories = useCallback((): void => {
    setCategoriesReloadToken(count => count + 1);
  }, []);

  const reload = useCallback((): void => {
    reloadCategories();
    reloadSkills();
  }, [reloadCategories, reloadSkills]);

  const clearPostMutationTimers = useCallback((): void => {
    postMutationTimerRefs.current.forEach(timer => {
      window.clearTimeout(timer);
    });
    postMutationTimerRefs.current = [];
  }, []);

  const schedulePostMutationRefresh = useCallback((): void => {
    reloadSkills();
    clearPostMutationTimers();
    postMutationTimerRefs.current = POST_MUTATION_REFRESH_DELAYS.map(delay =>
      window.setTimeout(() => {
        reloadSkills();
      }, delay),
    );
  }, [clearPostMutationTimers, reloadSkills]);

  const loadCategories = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setCategoriesLoading(true);
    setCategoriesErrorMessage("");

    try {
      const response = await getCoworkerSkillCategories(signal);
      if (signal?.aborted) {
        return;
      }

      const nextCategories = normalizeCategoryList(response);
      setCategories(nextCategories);
      setActiveCategory(currentCategory =>
        isCategoryAvailable(nextCategories, currentCategory) ? currentCategory : "all",
      );
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setCategoriesErrorMessage(resolveErrorMessage(error, "技能分类加载失败"));
    } finally {
      if (!signal?.aborted) {
        setCategoriesLoading(false);
      }
    }
  }, []);

  const loadSkills = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await getCoworkerSkills(
          {
            limit: DEFAULT_SKILL_LIMIT,
            ...(activeCategory === MY_SKILLS_CATEGORY_KEY ? { mine_only: true } : null),
            ...(typeof activeCategory === "number" ? { category_id: activeCategory } : null),
            ...(submittedKeyword ? { keyword: submittedKeyword } : null),
            ...(activeCategory === MY_SKILLS_CATEGORY_KEY || publisherType === "all"
              ? null
              : { publisher_type: publisherType }),
          },
          signal,
        );

        if (signal?.aborted) {
          return;
        }

        const normalized = normalizeSkillList(response);
        setSkills(normalized.skills);
        setSkillSummaryMap(current => {
          const nextMap = { ...current };
          normalized.skills.forEach(item => {
            nextMap[item.skill_id] = {
              name: item.name,
            };
          });
          return nextMap;
        });
        setTotal(normalized.total);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setSkills([]);
        setTotal(0);
        setErrorMessage(resolveErrorMessage(error, "技能列表加载失败"));
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [activeCategory, publisherType, submittedKeyword],
  );

  const loadInstallAgents = useCallback(async (): Promise<void> => {
    setInstallAgentsLoading(true);
    setInstallAgentsErrorMessage("");

    try {
      const response = await getAdminAiEmployeeList({
        source: "coworker",
        visible_only: true,
      });
      const items = Array.isArray(response.items) ? response.items : [];
      const coworkerAgents = items.filter(
        item => item.source === "coworker" && item.managed_by_coworker,
      );
      setInstallAgents(coworkerAgents);
      const agentSkillEntries = await Promise.all(
        coworkerAgents.map(async agent => {
          const coworkerAgentId = resolveCoworkerAgentId(agent);
          if (typeof coworkerAgentId !== "number") {
            return [agent.id, []] as const;
          }
          try {
            const result = await getCoworkerAgentSkills(coworkerAgentId);
            return [agent.id, normalizeAgentSkillList(result.items)] as const;
          } catch {
            return [agent.id, []] as const;
          }
        }),
      );
      setAgentSkillBindingsByAgentId(current => ({
        ...current,
        ...Object.fromEntries(agentSkillEntries),
      }));
    } catch (error) {
      setInstallAgents([]);
      setInstallAgentsErrorMessage(resolveErrorMessage(error, "AI员工 列表加载失败"));
    } finally {
      setInstallAgentsLoading(false);
    }
  }, []);

  const loadAgentSkillInstallStatuses = useCallback(
    async (
      agentId: string,
      skillIds: number[],
      signal?: AbortSignal,
    ): Promise<Record<number, CoworkerAgentSkillInstallStatusResponse>> => {
      const agent = installAgents.find(item => item.id === agentId);
      const coworkerAgentId = resolveCoworkerAgentId(agent);
      if (typeof coworkerAgentId !== "number") {
        return {};
      }
      const normalizedSkillIds = Array.from(
        new Set(skillIds.filter(skillId => Number.isFinite(skillId) && skillId > 0)),
      );

      if (normalizedSkillIds.length === 0) {
        return {};
      }

      const statusEntries = await Promise.all(
        normalizedSkillIds.map(async skillId => {
          try {
            const result = await getCoworkerAgentSkillInstallStatus(
              coworkerAgentId,
              skillId,
              signal,
            );
            return [skillId, result] as const;
          } catch {
            return null;
          }
        }),
      );

      if (signal?.aborted) {
        return {};
      }

      const nextEntries = statusEntries.filter(
        (entry): entry is readonly [number, CoworkerAgentSkillInstallStatusResponse] =>
          entry !== null,
      );

      if (nextEntries.length === 0) {
        return {};
      }

      const nextStatuses = Object.fromEntries(nextEntries);
      setAgentSkillInstallStatusByAgentId(current => ({
        ...current,
        [agentId]: {
          ...(current[agentId] ?? {}),
          ...nextStatuses,
        },
      }));
      return nextStatuses;
    },
    [installAgents],
  );

  const loadAgentSkillBindings = useCallback(
    async (agentId: string): Promise<void> => {
      const agent = installAgents.find(item => item.id === agentId);
      const coworkerAgentId = resolveCoworkerAgentId(agent);
      if (typeof coworkerAgentId !== "number") {
        setAgentSkillsErrorMessage("");
        return;
      }

      setAgentSkillsLoading(true);
      setAgentSkillsErrorMessage("");

      try {
        const response = await getCoworkerAgentSkills(coworkerAgentId);
        const items = Array.isArray(response.items) ? response.items : [];
        setAgentSkillBindingsByAgentId(current => ({
          ...current,
          [agentId]: items,
        }));
        setAgentSkillInstallStatusByAgentId(current =>
          pruneAgentSkillInstallStatuses(
            current,
            agentId,
            items.map(item => item.skill_id),
          ),
        );
      } catch (error) {
        setAgentSkillsErrorMessage(resolveErrorMessage(error, "AI员工 Skill 状态加载失败"));
      } finally {
        setAgentSkillsLoading(false);
      }
    },
    [installAgents],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCategories(controller.signal);
    return () => {
      controller.abort();
    };
  }, [categoriesReloadToken, loadCategories]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSkills(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadSkills, skillsReloadToken]);

  useEffect(() => clearPostMutationTimers, [clearPostMutationTimers]);

  useEffect(() => {
    void loadInstallAgents();
  }, [loadInstallAgents]);

  useEffect(() => {
    if (installAgents.length === 0) {
      if (selectedInstallAgentId) {
        setSelectedInstallAgentIdState(undefined);
      }
      return;
    }

    if (
      selectedInstallAgentId &&
      installAgents.some(agent => agent.id === selectedInstallAgentId)
    ) {
      return;
    }

    const fallbackAgent = installAgents.find(isAgentInstallable) ?? installAgents[0];
    setSelectedInstallAgentIdState(fallbackAgent?.id);
  }, [installAgents, selectedInstallAgentId]);

  useEffect(() => {
    if (!selectedInstallAgentId) {
      return;
    }
    void loadAgentSkillBindings(selectedInstallAgentId);
  }, [loadAgentSkillBindings, selectedInstallAgentId]);

  const selectedAgentSkills = useMemo<CoworkerAgentSkillItem[]>(
    () =>
      selectedInstallAgentId
        ? normalizeAgentSkillList(agentSkillBindingsByAgentId[selectedInstallAgentId])
        : [],
    [agentSkillBindingsByAgentId, selectedInstallAgentId],
  );

  const selectedAgentSkillInstallStatusMap = useMemo<
    Record<number, CoworkerAgentSkillInstallStatusResponse>
  >(
    () =>
      selectedInstallAgentId
        ? (agentSkillInstallStatusByAgentId[selectedInstallAgentId] ?? {})
        : {},
    [agentSkillInstallStatusByAgentId, selectedInstallAgentId],
  );

  const selectedSkillInstallStatus = useMemo<CoworkerAgentSkillInstallStatusResponse | null>(() => {
    if (!installingSkill || !selectedInstallAgentId) {
      return null;
    }
    return selectedAgentSkillInstallStatusMap[installingSkill.skill_id] ?? null;
  }, [installingSkill, selectedAgentSkillInstallStatusMap, selectedInstallAgentId]);

  const trackedSelectedAgentSkillIds = useMemo(() => {
    const nextSkillIds = new Set<number>(selectedAgentSkills.map(item => item.skill_id));
    if (installingSkill && selectedInstallAgentId) {
      nextSkillIds.add(installingSkill.skill_id);
    }
    return Array.from(nextSkillIds);
  }, [installingSkill, selectedAgentSkills, selectedInstallAgentId]);

  const pollingSkillIds = useMemo(() => {
    if (!selectedInstallAgentId || trackedSelectedAgentSkillIds.length === 0) {
      return [] as number[];
    }

    return trackedSelectedAgentSkillIds.filter(skillId => {
      const status = selectedAgentSkillInstallStatusMap[skillId];
      if (!status) {
        return installingSkill?.skill_id === skillId;
      }
      return shouldPollSkillInstallStatus(status);
    });
  }, [
    installingSkill?.skill_id,
    selectedAgentSkillInstallStatusMap,
    selectedInstallAgentId,
    trackedSelectedAgentSkillIds,
  ]);

  useEffect(() => {
    if (!selectedInstallAgentId || trackedSelectedAgentSkillIds.length === 0) {
      return;
    }

    const controller = new AbortController();
    void loadAgentSkillInstallStatuses(
      selectedInstallAgentId,
      trackedSelectedAgentSkillIds,
      controller.signal,
    );
    return () => {
      controller.abort();
    };
  }, [loadAgentSkillInstallStatuses, selectedInstallAgentId, trackedSelectedAgentSkillIds]);

  useEffect(() => {
    if (!selectedInstallAgentId || pollingSkillIds.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      void loadAgentSkillInstallStatuses(selectedInstallAgentId, pollingSkillIds);
    }, INSTALL_STATUS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadAgentSkillInstallStatuses, pollingSkillIds, selectedInstallAgentId]);

  useEffect(() => {
    if (!selectedInstallAgentId) {
      return;
    }
    const agent = installAgents.find(item => item.id === selectedInstallAgentId);
    const coworkerAgentId = resolveCoworkerAgentId(agent);
    const runtimeId = String(agent?.runtime_id || "").trim();
    if (!runtimeId || typeof coworkerAgentId !== "number") {
      return;
    }

    const unsubscribeSkillInstall = subscribeSystemEvent<{
      runtime_id?: string;
      agent_id?: number;
      skill_id?: number;
    }>("skill_install_updated", payload => {
      if (String(payload?.runtime_id || "").trim() !== runtimeId) {
        return;
      }
      if (typeof payload?.agent_id === "number" && payload.agent_id !== coworkerAgentId) {
        return;
      }
      void loadAgentSkillBindings(selectedInstallAgentId);
      if (typeof payload?.skill_id === "number" && payload.skill_id > 0) {
        void loadAgentSkillInstallStatuses(selectedInstallAgentId, [payload.skill_id]);
        return;
      }
      if (trackedSelectedAgentSkillIds.length > 0) {
        void loadAgentSkillInstallStatuses(selectedInstallAgentId, trackedSelectedAgentSkillIds);
      }
    });

    const unsubscribeRuntime = subscribeSystemEvent<{ runtime_id?: string }>(
      "runtime_updated",
      payload => {
        if (String(payload?.runtime_id || "").trim() !== runtimeId) {
          return;
        }
        void loadInstallAgents();
        void loadAgentSkillBindings(selectedInstallAgentId);
        if (trackedSelectedAgentSkillIds.length > 0) {
          void loadAgentSkillInstallStatuses(selectedInstallAgentId, trackedSelectedAgentSkillIds);
        }
      },
    );

    return () => {
      unsubscribeSkillInstall();
      unsubscribeRuntime();
    };
  }, [
    installAgents,
    loadAgentSkillBindings,
    loadAgentSkillInstallStatuses,
    loadInstallAgents,
    selectedInstallAgentId,
    trackedSelectedAgentSkillIds,
  ]);

  const handleSearch = useCallback(
    (value?: string): void => {
      const resolvedKeyword = typeof value === "string" ? value : keyword;
      const nextKeyword = resolvedKeyword.trim();

      if (resolvedKeyword !== keyword) {
        setKeyword(resolvedKeyword);
      }

      setSubmittedKeyword(currentKeyword => {
        if (currentKeyword === nextKeyword) {
          reloadSkills();
          return currentKeyword;
        }
        return nextKeyword;
      });
    },
    [keyword, reloadSkills],
  );

  const submitUpload = useCallback<UseSkillMarketplaceResult["submitUpload"]>(
    async payload => {
      setUploadSubmitting(true);

      try {
        const packageFileId = await uploadSkillAsset(
          payload.packageFile,
          "skill_package",
          "archive",
        );
        const coverFileId = payload.coverFile
          ? await uploadSkillAsset(payload.coverFile, "skill_cover", "image")
          : undefined;

        await importCoworkerSkill(
          {
            file_id: packageFileId,
            category_id: payload.categoryId,
            ...(coverFileId ? { cover_file_id: coverFileId } : null),
            name: payload.name,
            description: payload.description || undefined,
            version: payload.version,
            visibility: payload.visibility,
          },
          createIdempotencyKey(),
        );

        message.success("Skill 已提交并进入市场");
        setIsUploadModalOpen(false);
        schedulePostMutationRefresh();
      } catch (error) {
        const nextMessage = resolveErrorMessage(error, "Skill 上传失败");
        message.error(nextMessage);
        throw error;
      } finally {
        setUploadSubmitting(false);
      }
    },
    [message, schedulePostMutationRefresh],
  );

  const submitEdit = useCallback(
    async (payload: SkillEditSubmitPayload): Promise<void> => {
      setEditSubmitting(true);

      try {
        const updatePayload: CoworkerSkillUpdateApiRequest = {
          name: payload.name,
          description: payload.description || undefined,
          category_id: payload.categoryId,
          visibility: payload.visibility,
        };

        if (payload.coverFile) {
          updatePayload.cover_file_id = await uploadSkillAsset(
            payload.coverFile,
            "skill_cover",
            "image",
          );
        } else if (payload.clearCover) {
          updatePayload.cover_file_id = null;
        }

        await updateCoworkerSkill(payload.skillId, updatePayload);
        message.success("Skill 信息已更新");
        setEditingSkill(null);
        schedulePostMutationRefresh();
      } catch (error) {
        const nextMessage = resolveErrorMessage(error, "Skill 更新失败");
        message.error(nextMessage);
        throw error;
      } finally {
        setEditSubmitting(false);
      }
    },
    [message, schedulePostMutationRefresh],
  );

  const submitVersion = useCallback(
    async (payload: SkillVersionSubmitPayload): Promise<void> => {
      setVersionSubmitting(true);

      try {
        const packageFileId = await uploadSkillAsset(
          payload.packageFile,
          "skill_package",
          "archive",
        );

        await importCoworkerSkillVersion(
          payload.skillId,
          {
            file_id: packageFileId,
            version: payload.version,
          },
          createIdempotencyKey(),
        );

        message.success("Skill 新版本已提交");
        setUpdatingSkill(null);
        schedulePostMutationRefresh();
      } catch (error) {
        const nextMessage = resolveErrorMessage(error, "Skill 新版本上传失败");
        message.error(nextMessage);
        throw error;
      } finally {
        setVersionSubmitting(false);
      }
    },
    [message, schedulePostMutationRefresh],
  );

  const removeSkill = useCallback(
    (skill: CoworkerSkillItem): void => {
      modal.confirm({
        title: `移除「${skill.name}」`,
        content: "移除后当前 Skill 将从市场中删除，历史版本也会一并失效。",
        okText: "确认移除",
        cancelText: "取消",
        okButtonProps: {
          danger: true,
        },
        async onOk() {
          try {
            await deleteCoworkerSkill(skill.skill_id);
            message.success("Skill 已移除");
            if (editingSkill?.skill_id === skill.skill_id) {
              setEditingSkill(null);
            }
            if (updatingSkill?.skill_id === skill.skill_id) {
              setUpdatingSkill(null);
            }
            schedulePostMutationRefresh();
          } catch (error) {
            const nextMessage = resolveErrorMessage(error, "Skill 移除失败");
            message.error(nextMessage);
            throw error;
          }
        },
      });
    },
    [editingSkill, message, modal, schedulePostMutationRefresh, updatingSkill],
  );

  const installSkillForAgent = useCallback(
    async (agentId: string, skill: CoworkerSkillItem): Promise<void> => {
      const agent = installAgents.find(item => item.id === agentId);
      const coworkerAgentId = resolveCoworkerAgentId(agent);
      if (typeof coworkerAgentId !== "number") {
        throw new Error("当前 agent 不是受管 coworker agent，无法安装 Skill");
      }
      setInstallSubmitting(true);
      try {
        await installCoworkerAgentSkill(coworkerAgentId, skill.skill_id, {
          enabled: true,
          ...(skill.latest_skill_version_id
            ? { target_skill_version_id: skill.latest_skill_version_id }
            : null),
          reason: "installed from skill marketplace",
        });
        await Promise.all([
          loadAgentSkillBindings(agentId),
          loadAgentSkillInstallStatuses(agentId, [skill.skill_id]),
        ]);
        message.success(`已提交「${skill.name}」安装任务，正在同步到目标 AI员工`);
      } catch (error) {
        const nextMessage = resolveErrorMessage(error, "安装 Skill 失败");
        message.error(nextMessage);
        throw error;
      } finally {
        setInstallSubmitting(false);
      }
    },
    [installAgents, loadAgentSkillBindings, loadAgentSkillInstallStatuses, message],
  );

  const forceReinstallSkillForAgent = useCallback(
    async (agentId: string, skill: CoworkerSkillItem): Promise<void> => {
      const agent = installAgents.find(item => item.id === agentId);
      const coworkerAgentId = resolveCoworkerAgentId(agent);
      if (typeof coworkerAgentId !== "number") {
        throw new Error("当前 agent 不是受管 coworker agent，无法强制重装 Skill");
      }
      setInstallSubmitting(true);
      try {
        await forceReinstallCoworkerAgentSkill(coworkerAgentId, skill.skill_id, {
          reason: "force reinstall from skill marketplace",
        });
        await Promise.all([
          loadAgentSkillBindings(agentId),
          loadAgentSkillInstallStatuses(agentId, [skill.skill_id]),
        ]);
        message.success(`已重新提交「${skill.name}」安装任务`);
      } catch (error) {
        const nextMessage = resolveErrorMessage(error, "强制重新安装 Skill 失败");
        message.error(nextMessage);
        throw error;
      } finally {
        setInstallSubmitting(false);
      }
    },
    [installAgents, loadAgentSkillBindings, loadAgentSkillInstallStatuses, message],
  );

  const uninstallSkillForAgent = useCallback(
    async (agentId: string, skill: CoworkerSkillItem): Promise<void> => {
      const agent = installAgents.find(item => item.id === agentId);
      const coworkerAgentId = resolveCoworkerAgentId(agent);
      if (typeof coworkerAgentId !== "number") {
        throw new Error("当前 agent 不是受管 coworker agent，无法卸载 Skill");
      }
      setInstallSubmitting(true);
      try {
        await deleteCoworkerAgentSkill(
          coworkerAgentId,
          skill.skill_id,
          "removed from skill marketplace",
        );
        await Promise.all([
          loadAgentSkillBindings(agentId),
          loadAgentSkillInstallStatuses(agentId, [skill.skill_id]),
        ]);
        message.success(`已提交「${skill.name}」卸载任务，等待工作站同步删除`);
      } catch (error) {
        const nextMessage = resolveErrorMessage(error, "移除 Skill 失败");
        message.error(nextMessage);
        throw error;
      } finally {
        setInstallSubmitting(false);
      }
    },
    [installAgents, loadAgentSkillBindings, loadAgentSkillInstallStatuses, message],
  );

  const openUploadModal = useCallback((): void => {
    setIsUploadModalOpen(true);
  }, []);

  const closeUploadModal = useCallback((): void => {
    if (uploadSubmitting) {
      return;
    }
    setIsUploadModalOpen(false);
  }, [uploadSubmitting]);

  const openEditModal = useCallback((skill: CoworkerSkillItem): void => {
    setEditingSkill(skill);
  }, []);

  const closeEditModal = useCallback((): void => {
    if (editSubmitting) {
      return;
    }
    setEditingSkill(null);
  }, [editSubmitting]);

  const openVersionModal = useCallback((skill: CoworkerSkillItem): void => {
    setUpdatingSkill(skill);
  }, []);

  const closeVersionModal = useCallback((): void => {
    if (versionSubmitting) {
      return;
    }
    setUpdatingSkill(null);
  }, [versionSubmitting]);

  const openInstallModal = useCallback((skill: CoworkerSkillItem): void => {
    setInstallingSkill(skill);
    setSelectedInstallAgentIdState(undefined);
    setAgentSkillsErrorMessage("");
  }, []);

  const closeInstallModal = useCallback((): void => {
    if (installSubmitting) {
      return;
    }
    setInstallingSkill(null);
    setSelectedInstallAgentIdState(undefined);
    setAgentSkillsErrorMessage("");
  }, [installSubmitting]);

  const setSelectedInstallAgentId = useCallback((value?: string): void => {
    setSelectedInstallAgentIdState(value);
    setAgentSkillsErrorMessage("");
  }, []);

  const installSkillToAgent = useCallback(async (): Promise<void> => {
    if (!installingSkill || !selectedInstallAgentId) {
      return;
    }
    await installSkillForAgent(selectedInstallAgentId, installingSkill);
  }, [installSkillForAgent, installingSkill, selectedInstallAgentId]);

  const forceReinstallSkillToAgent = useCallback(async (): Promise<void> => {
    if (!installingSkill || !selectedInstallAgentId) {
      return;
    }
    await forceReinstallSkillForAgent(selectedInstallAgentId, installingSkill);
  }, [forceReinstallSkillForAgent, installingSkill, selectedInstallAgentId]);

  const uninstallSkillFromAgent = useCallback(async (): Promise<void> => {
    if (!installingSkill || !selectedInstallAgentId) {
      return;
    }
    await uninstallSkillForAgent(selectedInstallAgentId, installingSkill);
  }, [installingSkill, selectedInstallAgentId, uninstallSkillForAgent]);

  const reloadSelectedAgentSkills = useCallback((): void => {
    if (!selectedInstallAgentId) {
      return;
    }
    void loadAgentSkillBindings(selectedInstallAgentId);
  }, [loadAgentSkillBindings, selectedInstallAgentId]);

  const selectedAgentSkillBinding = useMemo<CoworkerAgentSkillItem | null>(() => {
    if (!installingSkill || !selectedInstallAgentId) {
      return null;
    }
    const items = agentSkillBindingsByAgentId[selectedInstallAgentId] ?? [];
    return items.find(item => item.skill_id === installingSkill.skill_id) ?? null;
  }, [agentSkillBindingsByAgentId, installingSkill, selectedInstallAgentId]);

  return useMemo(
    () => ({
      skills,
      skillSummaryMap,
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
      agentSkillInstallStatusByAgentId,
      selectedAgentSkills,
      selectedAgentSkillBinding,
      selectedAgentSkillInstallStatusMap,
      selectedSkillInstallStatus,
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
      openInstallModal,
      closeInstallModal,
      setSelectedInstallAgentId,
      installSkillToAgent,
      forceReinstallSkillToAgent,
      uninstallSkillFromAgent,
      installSkillToSelectedAgent: async (skill: CoworkerSkillItem): Promise<void> => {
        if (!selectedInstallAgentId) {
          return;
        }
        await installSkillForAgent(selectedInstallAgentId, skill);
      },
      uninstallSkillFromSelectedAgent: async (skill: CoworkerSkillItem): Promise<void> => {
        if (!selectedInstallAgentId) {
          return;
        }
        await uninstallSkillForAgent(selectedInstallAgentId, skill);
      },
      reloadInstallAgents: loadInstallAgents,
      reloadSelectedAgentSkills,
      submitUpload,
      submitEdit,
      submitVersion,
      removeSkill,
      reloadCategories,
      reloadSkills,
      reload,
    }),
    [
      activeCategory,
      categories,
      categoriesErrorMessage,
      categoriesLoading,
      closeUploadModal,
      closeEditModal,
      closeInstallModal,
      closeVersionModal,
      currentIdentityId,
      agentSkillsErrorMessage,
      agentSkillsLoading,
      agentSkillBindingsByAgentId,
      agentSkillInstallStatusByAgentId,
      editSubmitting,
      editingSkill,
      errorMessage,
      handleSearch,
      installAgents,
      installAgentsErrorMessage,
      installAgentsLoading,
      installSkillToAgent,
      forceReinstallSkillToAgent,
      installSkillForAgent,
      installSubmitting,
      installingSkill,
      isUploadModalOpen,
      keyword,
      loadInstallAgents,
      loading,
      openInstallModal,
      openUploadModal,
      openEditModal,
      openVersionModal,
      publisherType,
      reload,
      reloadCategories,
      reloadSelectedAgentSkills,
      reloadSkills,
      removeSkill,
      selectedAgentSkillInstallStatusMap,
      selectedAgentSkills,
      selectedAgentSkillBinding,
      selectedSkillInstallStatus,
      selectedInstallAgentId,
      skillSummaryMap,
      setSelectedInstallAgentId,
      skills,
      submitEdit,
      submitUpload,
      submitVersion,
      total,
      uninstallSkillForAgent,
      uninstallSkillFromAgent,
      uploadSubmitting,
      updatingSkill,
      versionSubmitting,
    ],
  );
};
