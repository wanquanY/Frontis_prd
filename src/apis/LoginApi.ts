import { httpClient } from "@/utils/http";

/**
 * 登录请求参数
 */
export interface LoginParams {
  phone: string;
  sms_code: string;
  app_code: string;
}

/**
 * 登录成功响应数据
 */
export interface LoginSuccessResponse {
  type: "success";
  token: {
    access_token: string;
    refresh_token: string;
    access_expires_at: string;
    refresh_expires_at: string;
  };
  identity: {
    id: number;
    username: string;
    phone: string;
    avatar: string;
    is_owner: boolean;
    is_tenant_admin: boolean;
  };
  tenant: {
    id: number;
    name: string;
    logo: string;
  };
  app: {
    id: number;
    code: string;
    name: string;
  };
}

/**
 * 多身份选择项
 */
export interface LoginIdentityOption {
  identity_id: number;
  username: string | null;
  tenant_id: number;
  tenant_name: string;
  tenant_logo: string | null;
}

/**
 * 需要选择身份的登录响应数据
 */
export interface LoginSelectRequiredResponse {
  type: "select_required";
  selection_token: string;
  selection_token_expires_at: string;
  identities: LoginIdentityOption[];
}

/**
 * 登录响应数据
 */
export type LoginResponse = LoginSuccessResponse | LoginSelectRequiredResponse;

/**
 * 发送短信验证码请求参数
 */
export interface SendSmsCodeParams {
  phone: string;
  scene: "login";
  app_code: string;
}

/**
 * 刷新令牌请求参数
 */
export interface RefreshTokenParams {
  refresh_token: string;
}

/**
 * 选择身份登录请求参数
 */
export interface SelectLoginParams {
  selection_token: string;
  identity_id: number;
}

/**
 * 发送短信验证码
 * - POST /sms/send
 */
export function sendSmsCode(params: SendSmsCodeParams) {
  return httpClient.post<unknown>("/api/v1/sms/send", params);
}

/**
 * 登录
 * - POST /auth/login/sms
 */
export function login(params: LoginParams) {
  return httpClient.post<LoginResponse>("/api/v1/auth/login/sms", params);
}

/**
 * 选择身份登录
 * - POST /auth/login/select
 */
export function loginBySelection(params: SelectLoginParams) {
  return httpClient.post<LoginSuccessResponse>("/api/v1/auth/login/select", params);
}

/**
 * 刷新令牌
 * - POST /auth/refresh
 */
export function refreshToken(params: RefreshTokenParams) {
  return httpClient.post<LoginSuccessResponse>("/api/v1/auth/refresh", params);
}

/**
 * 登出
 * - POST /auth/logout
 */
export function logout() {
  return httpClient.post<unknown>("/api/v1/auth/logout", undefined);
}
