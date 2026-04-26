import { INITIAL_FRONTIS_WEB_USERS } from "@/mocks/mockData";
import type { FrontisUserRole, FrontisWebRole, FrontisWebUserItem } from "@/pages/types";
import dayjs from "dayjs";

import { MANAGEMENT_CONSOLE_LABEL, PRODUCT_NAME } from "@/constants/brand";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import type { MockTenantPlanPackageOption } from "@/feature/tenantPlan/types";
import type {
  MockAuthAccount,
  MockAuthIdentity,
  MockAuthRole,
  MockAuthSession,
  MockAuthSystemEntry,
  MockAuthTenantEntry,
  MockIdentityPlatform,
  MockTenantInviteMemberParams,
  MockTenantManagementSnapshot,
  MockTenantRegistrationParams,
} from "@/feature/auth/types";

const LOGIN_PATH = "/login";
const TENANT_SELECTION_PATH = "/select-tenant";
const DEFAULT_MOCK_VERIFICATION_CODE = "123456";
const ENTERPRISE_WORKSPACE_LABEL = `${PRODUCT_NAME}工作台`;
const STORED_MOCK_ACCOUNTS_STORAGE_KEY = "frontis.mock.auth.accounts";
const DEFAULT_ADMIN_ASSIGNED_AGENT_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-admin-001")?.assignedAgentIds ?? [];
const DEFAULT_MEMBER_ASSIGNED_AGENT_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-member-001")?.assignedAgentIds ?? [];
const DEFAULT_ADMIN_ASSIGNED_WORKSPACE_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-admin-001")?.assignedWorkspaceIds ?? [];
const DEFAULT_MEMBER_ASSIGNED_WORKSPACE_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-member-001")?.assignedWorkspaceIds ?? [];
const PLATFORM_ORDER: Record<MockIdentityPlatform, number> = {
  enterpriseWorkspace: 0,
  enterpriseAdmin: 1,
};
const ROLE_ORDER: Record<MockAuthRole, number> = {
  employee: 0,
  admin: 1,
};

interface MockTenantInfo {
  id: string;
  name: string;
  code: string;
}

interface BuildMockAccountOptions {
  accountId: string;
  description: string;
  quickLoginIdentityId?: string;
  tenant?: MockTenantInfo;
}

interface StoredMockAccountPayload {
  account: MockAuthAccount;
  snapshot: MockTenantManagementSnapshot;
}

const ENTERPRISE_TENANT: MockTenantInfo = {
  id: "tenant-enterprise-demo",
  name: "星澜服饰租户",
  code: "ENT-2026-001",
};

const MULTI_TENANT_ENTERPRISE_WORKSPACE_TENANT: MockTenantInfo = {
  id: "tenant-enterprise-east-ops",
  name: "凌光零售华东租户",
  code: "ENT-EAST-2026-017",
};

const MULTI_TENANT_ENTERPRISE_ADMIN_TENANT: MockTenantInfo = {
  id: "tenant-enterprise-hq",
  name: "星澜服饰集团租户",
  code: "ENT-HQ-2026-001",
};

const PERSONAL_REGISTERED_TENANT: MockTenantInfo = {
  id: "tenant-personal-studio-demo",
  name: "李想的工作室",
  code: "SELF-2026-430",
};

const normalizePhone = (phone: string): string => phone.replace(/\s+/g, "").trim();

const normalizeRedirectPath = (redirectPath?: string): string | undefined => {
  const normalizedRedirectPath = redirectPath?.trim();

  if (!normalizedRedirectPath?.startsWith("/")) {
    return undefined;
  }

  return normalizedRedirectPath;
};

const buildIdentity = (identity: MockAuthIdentity): MockAuthIdentity => identity;

const buildRuntimeUser = (
  userId: string,
  name: string,
  phone: string,
  role: FrontisUserRole,
  departmentId = "dept-default",
): FrontisWebUserItem => ({
  id: userId,
  departmentId,
  name,
  phone,
  role,
  status: "active",
  assignedAgentIds:
    role === "enterpriseAdmin"
      ? [...DEFAULT_ADMIN_ASSIGNED_AGENT_IDS]
      : [...DEFAULT_MEMBER_ASSIGNED_AGENT_IDS],
  assignedWorkspaceIds:
    role === "enterpriseAdmin"
      ? [...DEFAULT_ADMIN_ASSIGNED_WORKSPACE_IDS]
      : [...DEFAULT_MEMBER_ASSIGNED_WORKSPACE_IDS],
  lastActiveAt: "刚刚",
  dialogueCount: 0,
  tokenUsage: 0,
  resultCount: 0,
});

const getRoleLabel = (role: FrontisUserRole): string => {
  if (role === "enterpriseAdmin") {
    return "租户管理员";
  }

  if (role === "departmentLead") {
    return "协作负责人";
  }

  return "租户成员";
};

const getWorkspaceRole = (role: FrontisUserRole): FrontisWebRole =>
  role === "enterpriseAdmin" ? "admin" : "employee";

const buildWorkspaceIdentity = (
  tenant: MockTenantInfo,
  subjectId: string,
  subjectName: string,
  role: FrontisUserRole,
): MockAuthIdentity => {
  const workspaceRole = getWorkspaceRole(role);

  return buildIdentity({
    id: `${subjectId}-${tenant.id}-workspace`,
    subjectId,
    subjectName,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantCode: tenant.code,
    platform: "enterpriseWorkspace",
    platformLabel: ENTERPRISE_WORKSPACE_LABEL,
    role: workspaceRole,
    roleLabel: getRoleLabel(role),
    description:
      workspaceRole === "admin"
        ? `作为租户管理员进入 ${tenant.name} 的${PRODUCT_NAME}工作台，并继续进入${MANAGEMENT_CONSOLE_LABEL}。`
        : `作为租户成员进入 ${tenant.name} 的${PRODUCT_NAME}工作台，查看可用 AI 专家、对话与成果。`,
    entryPath: workspaceRole === "admin" ? "/web/admin/workspace" : "/web/employee",
  });
};

const compareIdentityPriority = (
  leftIdentity: MockAuthIdentity,
  rightIdentity: MockAuthIdentity,
): number => {
  const platformDiff =
    PLATFORM_ORDER[leftIdentity.platform] - PLATFORM_ORDER[rightIdentity.platform];

  if (platformDiff !== 0) {
    return platformDiff;
  }

  return ROLE_ORDER[rightIdentity.role] - ROLE_ORDER[leftIdentity.role];
};

const buildTenantAccount = (
  userId: string,
  name: string,
  phone: string,
  role: FrontisUserRole,
  verificationCode: string,
  options: BuildMockAccountOptions,
): MockAuthAccount => {
  const tenant = options.tenant ?? ENTERPRISE_TENANT;
  const identities = [buildWorkspaceIdentity(tenant, userId, name, role)];

  return {
    accountId: options.accountId,
    userId,
    name,
    phone,
    role: getWorkspaceRole(role),
    roleLabel: getRoleLabel(role),
    description: options.description,
    verificationCode,
    identities,
    quickLoginIdentityId: options.quickLoginIdentityId ?? identities[0]?.id,
  };
};

const buildMultiTenantIdentity = (
  identityId: string,
  tenant: MockTenantInfo,
  identity: Omit<MockAuthIdentity, "id" | "tenantId" | "tenantName" | "tenantCode">,
): MockAuthIdentity =>
  buildIdentity({
    id: identityId,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantCode: tenant.code,
    ...identity,
  });

const readStoredMockAccounts = (): MockAuthAccount[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORED_MOCK_ACCOUNTS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is MockAuthAccount =>
        typeof item === "object" &&
        item !== null &&
        "accountId" in item &&
        "phone" in item &&
        "identities" in item &&
        Array.isArray((item as MockAuthAccount).identities),
    );
  } catch {
    return [];
  }
};

const writeStoredMockAccounts = (accounts: MockAuthAccount[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORED_MOCK_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

const saveStoredMockAccount = (account: MockAuthAccount): MockAuthAccount => {
  const nextAccounts = [
    ...getStoredMockAccounts().filter(item => item.accountId !== account.accountId),
    account,
  ];

  writeStoredMockAccounts(nextAccounts);

  return account;
};

const getStoredMockAccounts = (): MockAuthAccount[] => readStoredMockAccounts();

export const ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT: MockAuthAccount = buildTenantAccount(
  "user-member-001",
  "王晨",
  "13800000011",
  "employee",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-employee",
    description: "租户成员账号，仅可进入工作台处理个人协作与成果沉淀。",
  },
);

export const ENTERPRISE_ADMIN_MOCK_ACCOUNT: MockAuthAccount = buildTenantAccount(
  "user-admin-001",
  "杨万泉",
  "13800000001",
  "enterpriseAdmin",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-enterprise-admin",
    description: `租户管理员账号，登录后进入${PRODUCT_NAME}工作台，并可继续进入${MANAGEMENT_CONSOLE_LABEL}。`,
  },
);

export const PERSONAL_REGISTERED_MOCK_ACCOUNT: MockAuthAccount = buildTenantAccount(
  "user-self-admin-001",
  "李想",
  "13800005555",
  "enterpriseAdmin",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-personal-admin",
    description: "自注册租户管理员账号，默认是 1 席个人版，可在管理后台开通团队版。",
    tenant: PERSONAL_REGISTERED_TENANT,
  },
);

export const MULTI_TENANT_MOCK_ACCOUNT: MockAuthAccount = {
  accountId: "mock-account-multi-tenant",
  userId: "user-admin-001",
  name: "林若岚",
  phone: "13800009999",
  role: "admin",
  roleLabel: "多租户综合账号",
  description: `一个账号同时挂载多个租户身份，登录后默认进入${PRODUCT_NAME}工作台，并可在不同租户间切换。`,
  verificationCode: DEFAULT_MOCK_VERIFICATION_CODE,
  quickLoginIdentityId: "multi-tenant-enterprise-employee",
  identities: [
    buildMultiTenantIdentity(
      "multi-tenant-enterprise-employee",
      MULTI_TENANT_ENTERPRISE_WORKSPACE_TENANT,
      {
        subjectId: "user-member-001",
        subjectName: "王晨",
        platform: "enterpriseWorkspace",
        platformLabel: ENTERPRISE_WORKSPACE_LABEL,
        role: "employee",
        roleLabel: "租户成员",
        description: `以租户成员身份进入华东运营租户的${PRODUCT_NAME}工作台，查看个人专家与工作成果。`,
        entryPath: "/web/employee",
      },
    ),
    buildMultiTenantIdentity(
      "multi-tenant-enterprise-admin",
      MULTI_TENANT_ENTERPRISE_ADMIN_TENANT,
      {
        subjectId: "user-admin-001",
        subjectName: "杨万泉",
        platform: "enterpriseWorkspace",
        platformLabel: ENTERPRISE_WORKSPACE_LABEL,
        role: "admin",
        roleLabel: "租户管理员",
        description: `以租户管理员身份进入集团租户的${PRODUCT_NAME}工作台，并继续进入${MANAGEMENT_CONSOLE_LABEL}。`,
        entryPath: "/web/admin/workspace",
      },
    ),
  ],
};

const PRESET_MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [
  ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT,
  ENTERPRISE_ADMIN_MOCK_ACCOUNT,
  PERSONAL_REGISTERED_MOCK_ACCOUNT,
  MULTI_TENANT_MOCK_ACCOUNT,
];

/**
 * 获取当前全部可用的模拟登录账号。
 */
export const getMockAuthAccounts = (): MockAuthAccount[] => {
  const accountMap = new Map<string, MockAuthAccount>();

  PRESET_MOCK_AUTH_ACCOUNTS.forEach(account => {
    accountMap.set(account.accountId, account);
  });

  getStoredMockAccounts().forEach(account => {
    accountMap.set(account.accountId, account);
  });

  return Array.from(accountMap.values());
};

/**
 * 根据角色获取默认工作台路径。
 */
export const getWorkspacePathByRole = (role: FrontisWebRole): string => {
  if (role === "admin") {
    return "/web/admin/workspace";
  }

  return "/web/employee";
};

/**
 * 根据角色获取默认工作台路径。
 */
export const getDefaultPathByRole = (role: FrontisWebRole): string => getWorkspacePathByRole(role);

/**
 * 获取任意模拟角色的默认落地路径。
 */
export const getDefaultPathByMockRole = (role: MockAuthRole): string => getDefaultPathByRole(role);

/**
 * 获取登录页路径。
 */
export const getLoginPath = (redirectPath?: string): string => {
  const normalizedRedirectPath = normalizeRedirectPath(redirectPath);

  if (!normalizedRedirectPath) {
    return LOGIN_PATH;
  }

  return `${LOGIN_PATH}?redirect=${encodeURIComponent(normalizedRedirectPath)}`;
};

/**
 * 获取管理后台路径。
 */
export const getAdminManagementPath = (): string => "/web/admin";

/**
 * 获取租户选择页路径。
 */
export const getTenantSelectionPath = (redirectPath?: string): string => {
  const normalizedRedirectPath = normalizeRedirectPath(redirectPath);

  if (!normalizedRedirectPath) {
    return TENANT_SELECTION_PATH;
  }

  return `${TENANT_SELECTION_PATH}?redirect=${encodeURIComponent(normalizedRedirectPath)}`;
};

/**
 * 根据手机号匹配模拟登录账号。
 */
export const getMockAccountByPhone = (phone: string): MockAuthAccount | null => {
  const normalizedPhone = normalizePhone(phone);

  return getMockAuthAccounts().find(item => item.phone === normalizedPhone) ?? null;
};

/**
 * 根据账号 id 匹配模拟登录账号。
 */
export const getMockAccountByAccountId = (accountId: string): MockAuthAccount | null =>
  getMockAuthAccounts().find(item => item.accountId === accountId) ?? null;

/**
 * 创建自注册租户管理员 mock 账号与租户快照。
 */
export const registerMockTenantAdminAccount = (
  params: MockTenantRegistrationParams,
): StoredMockAccountPayload | null => {
  const normalizedPhone = normalizePhone(params.phone);

  if (getMockAccountByPhone(normalizedPhone)) {
    return null;
  }

  const timestamp = Date.now();
  const userId = `user-self-${timestamp}`;
  const tenantId = `tenant-self-${timestamp}`;
  const tenantCode = `SELF-${String(timestamp).slice(-6)}`;
  const accountId = `mock-account-self-${timestamp}`;
  const tenant: MockTenantInfo = {
    id: tenantId,
    name: params.tenantName.trim(),
    code: tenantCode,
  };
  const account = buildTenantAccount(
    userId,
    params.name.trim(),
    normalizedPhone,
    "enterpriseAdmin",
    DEFAULT_MOCK_VERIFICATION_CODE,
    {
      accountId,
      description: `自注册租户管理员账号，登录后即可进入${PRODUCT_NAME}并使用${MANAGEMENT_CONSOLE_LABEL}。`,
      tenant,
    },
  );
  const registrationStrategy = loadOperationsRegistrationStrategy();
  const snapshot = saveMockTenantManagementSnapshot({
    tenantId,
    tenantName: tenant.name,
    tenantCode,
    ownerAccountId: accountId,
    adminUserId: userId,
    edition: "personal",
    planLabel: "个人版",
    includedSeats: 1,
    extraSeatCount: 0,
    teamPlanPackageId: undefined,
    planExpiresAt: undefined,
    hasAgentListingAccess: false,
    invitePolicyLabel: "个人版仅支持单人使用。",
    lowBalanceThreshold: 500,
    monthlyUsedPoints: 0,
    pointsBalance: registrationStrategy.defaultGiftPoints,
    totalSeats: 1,
    usedSeats: 1,
    users: [buildRuntimeUser(userId, params.name.trim(), normalizedPhone, "enterpriseAdmin")],
    pointsLedger: [
      {
        id: `${tenantId}-register-bonus`,
        title: "注册赠送",
        description: "新租户创建完成后自动发放的初始积分。",
        points: registrationStrategy.defaultGiftPoints,
        direction: "income",
        createdAt: "刚刚",
        actorName: "平台系统",
      },
    ],
    pointsUsageRecords: [],
    pointsOrders: [],
    referralRecords: [],
  });

  saveStoredMockAccount(account);

  return {
    account,
    snapshot,
  };
};

/**
 * 为指定租户邀请新成员并生成可登录的 mock 账号。
 */
export const inviteMockTenantMemberAccount = (
  tenantId: string,
  params: MockTenantInviteMemberParams,
): StoredMockAccountPayload | null => {
  const normalizedPhone = normalizePhone(params.phone);

  if (getMockAccountByPhone(normalizedPhone)) {
    return null;
  }

  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  if (
    !matchedSnapshot ||
    matchedSnapshot.edition !== "team" ||
    matchedSnapshot.usedSeats >= matchedSnapshot.totalSeats
  ) {
    return null;
  }

  const timestamp = Date.now();
  const userId = `user-tenant-${timestamp}`;
  const accountId = `mock-account-tenant-${timestamp}`;
  const tenant: MockTenantInfo = {
    id: matchedSnapshot.tenantId,
    name: matchedSnapshot.tenantName,
    code: matchedSnapshot.tenantCode,
  };
  const account = buildTenantAccount(
    userId,
    params.name.trim(),
    normalizedPhone,
    params.role,
    DEFAULT_MOCK_VERIFICATION_CODE,
    {
      accountId,
      description: `${matchedSnapshot.tenantName} 邀请成员账号，进入后共用租户积分。`,
      tenant,
    },
  );
  const nextUsers = [
    ...matchedSnapshot.users,
    buildRuntimeUser(userId, params.name.trim(), normalizedPhone, params.role, params.departmentId),
  ];
  const nextSnapshot = saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    usedSeats: nextUsers.length,
    users: nextUsers,
  });

  saveStoredMockAccount(account);

  return {
    account,
    snapshot: nextSnapshot,
  };
};

/**
 * 为指定租户补充席位。
 */
export const addMockTenantSeats = (
  tenantId: string,
  seatCount: number,
): MockTenantManagementSnapshot | null => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  if (!matchedSnapshot || matchedSnapshot.edition !== "team" || seatCount <= 0) {
    return null;
  }

  return saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    extraSeatCount: matchedSnapshot.extraSeatCount + seatCount,
    totalSeats: matchedSnapshot.totalSeats + seatCount,
  });
};

/**
 * 开通或切换到团队版套餐。
 */
export const activateMockTenantTeamPlan = (
  tenantId: string,
  targetPackage: MockTenantPlanPackageOption,
): MockTenantManagementSnapshot | null => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  if (!matchedSnapshot || targetPackage.status !== "active") {
    return null;
  }

  const nextIncludedSeats = targetPackage.includedSeats;
  const nextTotalSeats = Math.max(
    matchedSnapshot.usedSeats,
    nextIncludedSeats + matchedSnapshot.extraSeatCount,
  );

  return saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    edition: "team",
    planLabel: targetPackage.title,
    includedSeats: nextIncludedSeats,
    totalSeats: nextTotalSeats,
    teamPlanPackageId: targetPackage.id,
    planExpiresAt: dayjs().add(1, "year").format("YYYY-MM-DD"),
    invitePolicyLabel: "团队版租户支持组织管理与成员邀请。",
  });
};

/**
 * 为指定租户补充积分。
 */
export const rechargeMockTenantPoints = (
  tenantId: string,
  points: number,
  actorName: string,
  options?: {
    title?: string;
    description?: string;
    packageId?: string;
    packageTitle?: string;
    price?: number;
    paymentChannelLabel?: string;
  },
): MockTenantManagementSnapshot | null => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  if (!matchedSnapshot || points <= 0) {
    return null;
  }

  return saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    pointsBalance: matchedSnapshot.pointsBalance + points,
    pointsLedger: [
      {
        id: `${tenantId}-recharge-${Date.now()}`,
        title: options?.title ?? "管理员充值",
        description: options?.description ?? "补充租户积分，用于继续运行模型与第三方接口。",
        points,
        direction: "income",
        createdAt: "刚刚",
        actorName,
      },
      ...matchedSnapshot.pointsLedger,
    ],
    pointsOrders:
      options?.packageId && options.packageTitle && typeof options.price === "number"
        ? [
            {
              id: `${tenantId}-points-order-${Date.now()}`,
              orderNo: `PT-${Date.now().toString().slice(-10)}`,
              packageId: options.packageId,
              packageTitle: options.packageTitle,
              packagePoints: points,
              amount: options.price,
              status: "paid",
              paymentChannelLabel: options.paymentChannelLabel ?? "统一扫码支付",
              purchaserName: actorName,
              createdAt: "刚刚",
              paidAt: "刚刚",
            },
            ...matchedSnapshot.pointsOrders,
          ]
        : matchedSnapshot.pointsOrders,
  });
};

/**
 * 将租户成员列表同步回管理快照。
 */
export const updateMockTenantUsers = (
  tenantId: string,
  users: FrontisWebUserItem[],
): MockTenantManagementSnapshot | null => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  if (!matchedSnapshot) {
    return null;
  }

  return saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    usedSeats: users.length,
    users,
  });
};

const getSafeIdentities = (identities?: MockAuthIdentity[] | null): MockAuthIdentity[] =>
  Array.isArray(identities) ? identities : [];

/**
 * 兼容旧版持久化会话，补齐缺失的 identities 字段。
 */
export const normalizeMockSession = (session: MockAuthSession | null): MockAuthSession | null => {
  if (!session) {
    return null;
  }

  const matchedAccount = getMockAccountByAccountId(session.accountId);

  if (!matchedAccount) {
    return null;
  }

  const nextIdentities = matchedAccount.identities;
  const nextActiveIdentity =
    nextIdentities.find(identity => identity.id === session.activeIdentityId) ??
    nextIdentities.find(
      identity => identity.subjectId === session.userId && identity.role === session.role,
    ) ??
    nextIdentities.find(identity => identity.subjectId === session.userId) ??
    [...nextIdentities].sort(compareIdentityPriority)[0];
  const isSessionAlreadyNormalized =
    Array.isArray(session.identities) &&
    session.identities === nextIdentities &&
    session.userId === (nextActiveIdentity?.subjectId ?? session.userId) &&
    session.role === (nextActiveIdentity?.role ?? session.role) &&
    session.roleLabel === (nextActiveIdentity?.roleLabel ?? session.roleLabel) &&
    session.activeIdentityId === nextActiveIdentity?.id;

  if (isSessionAlreadyNormalized) {
    return session;
  }

  return {
    ...session,
    userId: nextActiveIdentity?.subjectId ?? session.userId,
    role: nextActiveIdentity?.role ?? session.role,
    roleLabel: nextActiveIdentity?.roleLabel ?? session.roleLabel,
    identities: nextIdentities,
    activeIdentityId: nextActiveIdentity?.id,
  };
};

const getTargetPlatformByPath = (redirectPath?: string): MockIdentityPlatform | null => {
  const normalizedRedirectPath = normalizeRedirectPath(redirectPath);

  if (!normalizedRedirectPath) {
    return null;
  }

  if (
    normalizedRedirectPath.startsWith("/web/admin/workspace") ||
    normalizedRedirectPath.startsWith("/web/employee")
  ) {
    return "enterpriseWorkspace";
  }

  if (normalizedRedirectPath.startsWith("/web/admin")) {
    return "enterpriseAdmin";
  }

  if (normalizedRedirectPath.startsWith("/fde")) {
    return "enterpriseWorkspace";
  }

  return null;
};

/**
 * 解析会话中的当前身份。
 */
export const getActiveSessionIdentity = (
  session: MockAuthSession | null,
): MockAuthIdentity | null => {
  if (!session?.activeIdentityId) {
    return null;
  }

  return (
    getSafeIdentities(session.identities).find(item => item.id === session.activeIdentityId) ?? null
  );
};

/**
 * 根据身份 id 获取身份定义。
 */
export const getIdentityById = (
  identities: MockAuthIdentity[] | undefined,
  identityId: string,
): MockAuthIdentity | null =>
  getSafeIdentities(identities).find(item => item.id === identityId) ?? null;

/**
 * 获取指定租户下的所有身份。
 */
export const getTenantIdentities = (
  identities: MockAuthIdentity[] | undefined,
  tenantId: string,
): MockAuthIdentity[] =>
  getSafeIdentities(identities).filter(identity => identity.tenantId === tenantId);

/**
 * 获取账号所属租户数量。
 */
export const getTenantCount = (identities: MockAuthIdentity[] | undefined): number =>
  new Set(getSafeIdentities(identities).map(identity => identity.tenantId)).size;

const isRedirectAllowedForIdentity = (
  identity: MockAuthIdentity,
  redirectPath?: string,
): boolean => {
  const normalizedRedirectPath = normalizeRedirectPath(redirectPath);

  if (!normalizedRedirectPath) {
    return false;
  }

  if (identity.role === "admin") {
    return (
      normalizedRedirectPath.startsWith("/web/admin") ||
      normalizedRedirectPath.startsWith("/web/employee") ||
      normalizedRedirectPath.startsWith("/fde")
    );
  }

  return (
    normalizedRedirectPath.startsWith("/web/employee") || normalizedRedirectPath.startsWith("/fde")
  );
};

/**
 * 获取账号默认进入身份。
 */
export const getDefaultIdentity = (
  identities: MockAuthIdentity[] | undefined,
  preferredIdentityId?: string,
): MockAuthIdentity | null => {
  const safeIdentities = getSafeIdentities(identities);
  const preferredIdentity = preferredIdentityId
    ? getIdentityById(safeIdentities, preferredIdentityId)
    : null;

  if (preferredIdentity) {
    return preferredIdentity;
  }

  if (!safeIdentities.length) {
    return null;
  }

  return [...safeIdentities].sort(compareIdentityPriority)[0] ?? null;
};

/**
 * 根据目标路径解析最合适的身份。
 */
export const findIdentityForPath = (
  identities: MockAuthIdentity[] | undefined,
  redirectPath?: string,
  allowedRoles?: MockAuthRole[],
): MockAuthIdentity | null => {
  const safeIdentities = getSafeIdentities(identities);
  const targetPlatform = getTargetPlatformByPath(redirectPath);
  const matchedIdentities = safeIdentities.filter(identity => {
    if (allowedRoles && !allowedRoles.includes(identity.role)) {
      return false;
    }

    return isRedirectAllowedForIdentity(identity, redirectPath);
  });

  if (!matchedIdentities.length) {
    return null;
  }

  const platformMatchedIdentities = targetPlatform
    ? matchedIdentities.filter(identity => identity.platform === targetPlatform)
    : [];

  return getDefaultIdentity(
    platformMatchedIdentities.length ? platformMatchedIdentities : matchedIdentities,
  );
};

/**
 * 获取当前账号可见的系统入口。
 */
export const getSystemEntries = (
  identities: MockAuthIdentity[] | undefined,
  tenantId: string | undefined,
  activeIdentityId?: string,
): MockAuthSystemEntry[] => {
  if (!tenantId) {
    return [];
  }

  const identityMap = new Map<MockIdentityPlatform, MockAuthIdentity>();

  getSafeIdentities(identities)
    .filter(identity => identity.tenantId === tenantId)
    .forEach(identity => {
      const currentIdentity = identityMap.get(identity.platform);

      if (!currentIdentity || compareIdentityPriority(identity, currentIdentity) < 0) {
        identityMap.set(identity.platform, identity);
      }
    });

  return Array.from(identityMap.values())
    .filter(identity => identity.id !== activeIdentityId)
    .sort(compareIdentityPriority)
    .map(identity => ({
      identityId: identity.id,
      label: identity.platformLabel,
      entryPath: identity.entryPath,
      platform: identity.platform,
    }));
};

/**
 * 获取当前账号可切换的租户入口。
 */
export const getTenantEntries = (
  identities: MockAuthIdentity[] | undefined,
  activeTenantId?: string,
): MockAuthTenantEntry[] => {
  const tenantMap = new Map<string, MockAuthTenantEntry>();

  getSafeIdentities(identities).forEach(identity => {
    if (identity.tenantId === activeTenantId || tenantMap.has(identity.tenantId)) {
      return;
    }

    tenantMap.set(identity.tenantId, {
      tenantId: identity.tenantId,
      tenantName: identity.tenantName,
      tenantCode: identity.tenantCode,
    });
  });

  return Array.from(tenantMap.values()).sort((leftTenant, rightTenant) =>
    leftTenant.tenantName.localeCompare(rightTenant.tenantName, "zh-Hans-CN"),
  );
};

/**
 * 根据当前身份解析实际进入路径。
 */
export const resolveIdentityEntryPath = (
  identity: MockAuthIdentity,
  redirectPath?: string,
): string => {
  if (isRedirectAllowedForIdentity(identity, redirectPath)) {
    return normalizeRedirectPath(redirectPath) ?? identity.entryPath;
  }

  return identity.entryPath;
};

/**
 * 创建登录后的会话快照。
 */
export const createMockSession = (
  account: MockAuthAccount,
  activeIdentity?: MockAuthIdentity,
): MockAuthSession => ({
  accountId: account.accountId,
  userId: activeIdentity?.subjectId ?? account.userId,
  name: account.name,
  phone: account.phone,
  role: activeIdentity?.role ?? null,
  roleLabel: activeIdentity?.roleLabel,
  loginAt: new Date().toISOString(),
  identities: account.identities,
  activeIdentityId: activeIdentity?.id,
});

/**
 * 将指定身份写回现有会话。
 */
export const applyIdentityToSession = (
  session: MockAuthSession,
  identity: MockAuthIdentity,
): MockAuthSession => ({
  ...session,
  userId: identity.subjectId,
  role: identity.role,
  roleLabel: identity.roleLabel,
  activeIdentityId: identity.id,
});

/**
 * 根据当前会话获取登录后的默认去向。
 */
export const resolveSessionEntryPath = (
  session: MockAuthSession,
  redirectPath?: string,
): string => {
  const normalizedSession = normalizeMockSession(session);
  const activeIdentity = getActiveSessionIdentity(normalizedSession);
  const identities = getSafeIdentities(normalizedSession?.identities);

  if (!activeIdentity && getTenantCount(identities) > 1) {
    return getTenantSelectionPath(redirectPath);
  }

  const fallbackIdentity = activeIdentity ?? getDefaultIdentity(identities);

  if (!fallbackIdentity) {
    return "/portal";
  }

  return resolveIdentityEntryPath(fallbackIdentity, redirectPath);
};
