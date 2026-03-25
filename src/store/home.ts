import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCurrentUser,
  UserMeResponse,
  getAgents,
  AgentsRequest,
  Agent,
  AgentsResponse,
  getSpaceAgents,
  getBizConfig,
  BizConfigResponse,
} from "@/apis/HomeApi";

const createRequestKey = (value: Record<string, unknown>): string =>
  JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const fieldValue = value[key];
        if (fieldValue !== undefined) {
          result[key] = fieldValue;
        }
        return result;
      }, {}),
  );

let fetchUserInFlight: Promise<boolean> | null = null;
const fetchAgentsInFlight = new Map<string, Promise<boolean>>();
const fetchBizConfigInFlight = new Map<string, Promise<boolean>>();

export interface HomeState {
  user?: UserMeResponse;
  isLoadingUser: boolean;
  agents: Agent[];
  isLoadingAgents: boolean;
  agentsTotal: number;
  agentsSkip: number;
  agentsLimit: number;
  spaceAgents: Agent[];
  isLoadingSpaceAgents: boolean;
  bizConfig?: BizConfigResponse;
  error?: string;
  fetchUser: () => Promise<boolean>;
  clearUser: () => void;
  fetchAgents: (params?: AgentsRequest) => Promise<boolean>;
  fetchSpaceAgents: (spaceId: number) => Promise<boolean>;
  clearAgents: () => void;
  clearSpaceAgents: () => void;
  fetchBizConfig: (path?: string) => Promise<boolean>;
}

/**
 * useHomeStore
 *
 * 首页/全局信息的 store：
 * - `identity`：当前登录用户信息（/identities/me）
 * - 仅在有 token 时由 UI 触发拉取（避免未登录时 401）
 */
export const useHomeStore = create<HomeState>()(
  persist(
    set => ({
      user: undefined,
      isLoadingUser: false,
      agents: [],
      isLoadingAgents: false,
      agentsTotal: 0,
      agentsSkip: 0,
      agentsLimit: 10,
      spaceAgents: [],
      isLoadingSpaceAgents: false,
      bizConfig: undefined,
      error: undefined,
      fetchUser: async () => {
        if (fetchUserInFlight) {
          return fetchUserInFlight;
        }

        const requestPromise = (async (): Promise<boolean> => {
          try {
            set({ isLoadingUser: true, error: undefined });
            const response = await getCurrentUser();
            const user = response as UserMeResponse;
            set({ user, isLoadingUser: false });
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "获取用户信息失败，请重试";
            set({ isLoadingUser: false, error: errorMessage });
            return false;
          } finally {
            fetchUserInFlight = null;
          }
        })();

        fetchUserInFlight = requestPromise;
        return requestPromise;
      },
      clearUser: () => set({ user: undefined, isLoadingUser: false, error: undefined }),

      // 获取Agent智能体列表
      fetchAgents: async (params: AgentsRequest = { skip: 0, limit: 10 }) => {
        const requestKey = createRequestKey({
          category_id: params.category_id,
          execution_mode: params.execution_mode,
          is_space_enabled: params.is_space_enabled,
          limit: params.limit,
          skip: params.skip,
          type: params.type,
          with_super_assistant: params.with_super_assistant,
        });
        const currentRequest = fetchAgentsInFlight.get(requestKey);
        if (currentRequest) {
          return currentRequest;
        }

        const requestPromise = (async (): Promise<boolean> => {
          try {
            set({ isLoadingAgents: true, error: undefined });
            const response = await getAgents(params);
            const agentsResponse = response as AgentsResponse;
            const items = Array.isArray(agentsResponse.items) ? agentsResponse.items : [];

            set({
              agents: items,
              agentsTotal: agentsResponse.total ?? items.length,
              agentsSkip: agentsResponse.skip ?? params.skip ?? 0,
              agentsLimit: agentsResponse.limit ?? params.limit ?? items.length ?? 10,
              isLoadingAgents: false,
            });
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "获取应用列表失败，请重试";
            set({ isLoadingAgents: false, error: errorMessage });
            return false;
          } finally {
            fetchAgentsInFlight.delete(requestKey);
          }
        })();

        fetchAgentsInFlight.set(requestKey, requestPromise);
        return requestPromise;
      },

      fetchSpaceAgents: async (spaceId: number) => {
        try {
          set({ isLoadingSpaceAgents: true, error: undefined });
          const response = await getSpaceAgents(spaceId);
          const items = Array.isArray(response) ? response : [];
          set({
            spaceAgents: items,
            isLoadingSpaceAgents: false,
          });
          return true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "获取空间智能体失败，请重试";
          set({ isLoadingSpaceAgents: false, error: errorMessage, spaceAgents: [] });
          return false;
        }
      },

      clearAgents: () =>
        set({
          agents: [],
          agentsTotal: 0,
          agentsSkip: 0,
          agentsLimit: 10,
          isLoadingAgents: false,
        }),

      clearSpaceAgents: () =>
        set({
          spaceAgents: [],
          isLoadingSpaceAgents: false,
        }),

      fetchBizConfig: async (path = "storage") => {
        const requestKey = createRequestKey({ path });
        const currentRequest = fetchBizConfigInFlight.get(requestKey);
        if (currentRequest) {
          return currentRequest;
        }

        const requestPromise = (async (): Promise<boolean> => {
          try {
            set({ error: undefined });
            const response = await getBizConfig(path);
            const bizConfig = response as BizConfigResponse;
            set({ bizConfig });
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "获取业务配置失败，请重试";
            set({ error: errorMessage });
            return false;
          } finally {
            fetchBizConfigInFlight.delete(requestKey);
          }
        })();

        fetchBizConfigInFlight.set(requestKey, requestPromise);
        return requestPromise;
      },
    }),
    {
      name: "home-store",
      version: 1,
      // 仅白名单持久化需要恢复的用户态
      partialize: (state): Partial<HomeState> => ({
        user: state.user,
        bizConfig: state.bizConfig,
      }),
    },
  ),
);
