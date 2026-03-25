import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login, logout as logoutRequest, refreshToken, sendSmsCode } from "@/apis/LoginApi";
import type { LoginParams } from "@/apis/LoginApi";
import { logger } from "@/utils/logger";

// 在 access_token 剩余 1 小时内视为“即将过期”，提前刷新
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * TokenInfo
 *
 * 表示令牌信息结构
 */
export interface TokenInfo {
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
}

/**
 * UserInfo
 *
 * 表示用户基本信息结构
 */
export interface UserInfo {
  id: number;
  phone: string;
  username: string;
  avatar?: string;
  is_owner?: boolean;
  is_tenant_admin?: boolean;
}

/**
 * TenantInfo
 *
 * 表示租户信息结构
 */
export interface TenantInfo {
  id: number;
  name: string;
  logo: string;
}

/**
 * AuthState
 *
 * 认证相关的 Zustand 状态：
 * - `token`、`user` 和 `tenant` 保存登录态
 * - `isLoading` 表示登录状态
 * - `error` 保存登录错误信息
 * - 提供完整的认证方法
 */
export interface AuthState {
  // 状态
  token?: TokenInfo;
  user?: UserInfo;
  tenant?: TenantInfo;
  /**
   * 是否记住登录状态
   */
  rememberLogin: boolean;
  isLoading: boolean;
  isSendingSmsCode: boolean;
  isRefreshing: boolean;
  error?: string;

  // 方法
  setToken: (token?: TokenInfo) => void;
  setUser: (user?: UserInfo) => void;
  setTenant: (tenant?: TenantInfo) => void;
  /**
   * 设置是否记住登录状态
   * @param rememberLogin 是否记住登录状态
   */
  setRememberLogin: (rememberLogin: boolean) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error?: string) => void;
  sendLoginSmsCode: (phone: string) => Promise<boolean>;
  login: (params: LoginParams) => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  logout: (options?: { callApi?: boolean }) => Promise<void>;
  isTokenExpired: () => boolean;
}

/**
 * 刷新令牌请求参数
 */
export interface RefreshTokenParams {
  refresh_token: string;
}

// 用于并发控制的刷新 Promise
let refreshPromise: Promise<boolean> | null = null;

// Create the store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      token: undefined,
      user: undefined,
      tenant: undefined,
      rememberLogin: false,
      isLoading: false,
      isSendingSmsCode: false,
      isRefreshing: false,
      error: undefined,

      // 设置 token
      setToken: token => set({ token }),

      // 设置用户信息
      setUser: user => set({ user }),

      // 设置租户信息
      setTenant: tenant => set({ tenant }),

      // 设置记住登录状态
      setRememberLogin: rememberLogin => set({ rememberLogin }),

      // 设置加载状态
      setLoading: isLoading => set({ isLoading }),

      // 设置刷新状态
      setRefreshing: isRefreshing => set({ isRefreshing }),

      // 设置错误信息
      setError: error => set({ error }),

      /**
       * 发送登录短信验证码
       * @param phone 手机号
       * @returns Promise<boolean> 是否发送成功
       */
      sendLoginSmsCode: async (phone: string): Promise<boolean> => {
        try {
          set({ isSendingSmsCode: true, error: undefined });
          await sendSmsCode({ phone, scene: "login", app_code: "syngents" });
          set({ isSendingSmsCode: false });
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "验证码发送失败，请重试";
          set({ isSendingSmsCode: false, error: errorMessage });
          return false;
        }
      },

      /**
       * 用户登录异步方法
       * @param params 登录参数
       * @returns Promise<boolean> 登录是否成功
       */
      login: async (params: LoginParams): Promise<boolean> => {
        try {
          // 设置加载状态
          set({ isLoading: true, error: undefined });

          // 调用登录接口
          const response = await login(params);
          if (response.type !== "success") {
            set({
              isLoading: false,
              error: "检测到多个企业身份，请在登录页选择后继续",
            });
            return false;
          }

          // 更新认证状态
          set({
            token: response.token,
            user: response.identity,
            tenant: response.tenant,
            isLoading: false,
          });

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "登录失败，请重试";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return false;
        }
      },

      /**
       * 刷新令牌（并发安全，多次调用会复用同一个 Promise）
       * @returns Promise<boolean> 是否刷新成功
       */
      refreshToken: async (): Promise<boolean> => {
        // 如果已经在刷新，复用现有的 Promise
        if (refreshPromise) {
          logger.debug("auth.refreshToken: reuse in-flight promise");
          return refreshPromise;
        }

        const currentState = get();
        if (!currentState.token?.refresh_token) {
          logger.warn("auth.refreshToken: missing refresh_token");
          return false;
        }

        logger.info("auth.refreshToken: start");

        // 创建新的刷新 Promise
        refreshPromise = (async () => {
          try {
            set({ isRefreshing: true, error: undefined });
            const response = await refreshToken({
              refresh_token: currentState.token!.refresh_token,
            });

            // 更新认证状态
            set({
              token: response.token,
              user: response.identity,
              tenant: response.tenant,
              isRefreshing: false,
            });

            logger.info("auth.refreshToken: success");
            return true;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "令牌刷新失败，请重新登录";
            set({
              isRefreshing: false,
              error: errorMessage,
            });

            logger.error("auth.refreshToken: failed", error);
            // 刷新失败：不要在这里强制清除登录状态（避免瞬时网络/并发导致“被登出”）
            return false;
          } finally {
            // 刷新完成后清除 Promise
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },

      /**
       * 检查令牌是否过期（距离过期 < 1 小时视为需要刷新）
       * @returns boolean 是否过期或即将过期
       */
      isTokenExpired: (): boolean => {
        const currentState = get();
        const tokenInfo = currentState.token;
        if (!tokenInfo?.access_expires_at) {
          return true;
        }

        const currentTime = Date.now();
        const expiresAt = new Date(tokenInfo.access_expires_at).getTime();
        return currentTime >= expiresAt - ACCESS_TOKEN_REFRESH_THRESHOLD_MS;
      },

      // 用户登出
      logout: async options => {
        const callApi = options?.callApi ?? true;
        try {
          const { token } = get();
          if (callApi && token?.access_token) {
            await logoutRequest();
          }
        } catch {
          // ignore
        } finally {
          set({
            token: undefined,
            user: undefined,
            tenant: undefined,
            isLoading: false,
            isSendingSmsCode: false,
            isRefreshing: false,
            error: undefined,
          });
        }
      },
    }),
    {
      name: "auth-store",
      // 持久化配置
      partialize: state => ({
        token: state.token,
        // user: state.user,
        tenant: state.tenant,
      }),
    },
  ),
);

/**
 * getAuthToken
 *
 * 从 store 同步读取 access_token（供 `http` 服务在请求前注入 header 使用）
 */
export const getAuthToken = () => {
  const tokenInfo = useAuthStore.getState().token;
  return tokenInfo?.access_token;
};
