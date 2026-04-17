import {
  FDE_PRIMARY_LEADER_MEMBER_ID,
  FDE_PRIMARY_MEMBER_ID,
  FDE_TEAM_MEMBERS,
} from "@/feature/fde/mockData";
import type { FdeTeamMemberItem } from "@/feature/fde/types";
import { INITIAL_FRONTIS_WEB_USERS } from "@/mocks/mockData";
import type { FrontisUserRole, FrontisWebRole } from "@/pages/types";

import type {
  MockAuthAccount,
  MockAuthIdentity,
  MockAuthRole,
  MockAuthSession,
  MockAuthSystemEntry,
  MockAuthTenantEntry,
  MockIdentityPlatform,
} from "@/feature/auth/types";

const ENTERPRISE_TENANT = {
  id: "tenant-enterprise-demo",
  name: "星澜服饰租户",
  code: "ENT-2026-001",
};

const FDE_TENANT = {
  id: "tenant-fde-demo",
  name: "Frontis FDE 服务组织",
  code: "FDE-2026-001",
};

const LOGIN_PATH = "/login";
const TENANT_SELECTION_PATH = "/select-tenant";
const DEFAULT_MOCK_VERIFICATION_CODE = "123456";
const ENTERPRISE_WORKSPACE_LABEL = "FrontisAI工作台";
const PLATFORM_ORDER: Record<MockIdentityPlatform, number> = {
  enterpriseWorkspace: 0,
  enterpriseAdmin: 1,
  fdeBusiness: 2,
  fdeDev: 3,
};
const ROLE_ORDER: Record<MockAuthRole, number> = {
  employee: 0,
  fdeMember: 0,
  admin: 1,
  fdeAdmin: 1,
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
}

const normalizePhone = (phone: string): string => phone.replace(/\s+/g, "").trim();

const normalizeRedirectPath = (redirectPath?: string): string | undefined => {
  const normalizedRedirectPath = redirectPath?.trim();

  if (!normalizedRedirectPath?.startsWith("/")) {
    return undefined;
  }

  return normalizedRedirectPath;
};

const getEnterpriseRoleLabel = (role: FrontisUserRole): string => {
  if (role === "enterpriseAdmin") {
    return "企业管理员";
  }

  if (role === "departmentLead") {
    return "部门负责人";
  }

  return "普通员工";
};

const getEnterpriseWorkspaceRole = (role: FrontisUserRole): FrontisWebRole =>
  role === "enterpriseAdmin" ? "admin" : "employee";

const buildIdentity = (identity: MockAuthIdentity): MockAuthIdentity => identity;

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

const buildEnterpriseIdentities = (
  subjectId: string,
  subjectName: string,
  role: FrontisUserRole,
): MockAuthIdentity[] => {
  const roleLabel = getEnterpriseRoleLabel(role);
  const workspaceRole = getEnterpriseWorkspaceRole(role);
  const identities: MockAuthIdentity[] = [
    buildIdentity({
      id: `${subjectId}-workspace`,
      subjectId,
      subjectName,
      tenantId: ENTERPRISE_TENANT.id,
      tenantName: ENTERPRISE_TENANT.name,
      tenantCode: ENTERPRISE_TENANT.code,
      platform: "enterpriseWorkspace",
      platformLabel: ENTERPRISE_WORKSPACE_LABEL,
      role: workspaceRole,
      roleLabel,
      description:
        workspaceRole === "admin"
          ? "进入 FrontisAI工作台，企业管理员可在工作台内继续进入企业管理后台。"
          : "进入 FrontisAI工作台，查看当前账号已分配的 AI 专家、对话与成果。",
      entryPath: workspaceRole === "admin" ? "/web/admin/workspace" : "/web/employee",
    }),
  ];

  return identities;
};

const getFdeRole = (member: FdeTeamMemberItem): Extract<MockAuthRole, "fdeAdmin" | "fdeMember"> =>
  member.role === "leader" || member.role === "admin" ? "fdeAdmin" : "fdeMember";

const buildFdeIdentities = (member: FdeTeamMemberItem): MockAuthIdentity[] => {
  const role = getFdeRole(member);
  const identities: MockAuthIdentity[] = [
    buildIdentity({
      id: `${member.id}-business`,
      subjectId: member.id,
      subjectName: member.name,
      tenantId: FDE_TENANT.id,
      tenantName: FDE_TENANT.name,
      tenantCode: FDE_TENANT.code,
      platform: "fdeBusiness",
      platformLabel: "FDE业务管理",
      role,
      roleLabel: member.title,
      description: "进入 FDE 业务工作台，处理商机、交付、组织协同与成员管理。",
      entryPath: role === "fdeAdmin" ? "/fde/dashboard" : "/fde/delivery",
    }),
  ];

  if (member.permissionKeys.includes("agentDev")) {
    identities.push(
      buildIdentity({
        id: `${member.id}-dev`,
        subjectId: member.id,
        subjectName: member.name,
        tenantId: FDE_TENANT.id,
        tenantName: FDE_TENANT.name,
        tenantCode: FDE_TENANT.code,
        platform: "fdeDev",
        platformLabel: "FDE开发管理",
        role,
        roleLabel: member.title,
        description: "进入 FDE 开发工作台，处理 Agent 开发、版本管理与上架准备。",
        entryPath: "/fde/agent-dev",
      }),
    );
  }

  return identities;
};

const buildEnterpriseAccount = (
  userId: string,
  verificationCode: string,
  options: BuildMockAccountOptions,
): MockAuthAccount => {
  const targetUser = INITIAL_FRONTIS_WEB_USERS.find(item => item.id === userId);

  if (!targetUser) {
    throw new Error(`未找到模拟登录账号: ${userId}`);
  }

  const role = getEnterpriseWorkspaceRole(targetUser.role);
  const roleLabel = getEnterpriseRoleLabel(targetUser.role);
  const identities = buildEnterpriseIdentities(targetUser.id, targetUser.name, targetUser.role);
  const defaultQuickLoginIdentityId = identities[0]?.id;

  return {
    accountId: options.accountId,
    userId: targetUser.id,
    name: targetUser.name,
    phone: targetUser.phone,
    role,
    roleLabel,
    description: options.description,
    verificationCode,
    identities,
    quickLoginIdentityId: options.quickLoginIdentityId ?? defaultQuickLoginIdentityId,
  };
};

const buildFdeAccount = (
  userId: string,
  verificationCode: string,
  options: BuildMockAccountOptions,
): MockAuthAccount => {
  const targetMember = FDE_TEAM_MEMBERS.find(item => item.id === userId);

  if (!targetMember) {
    throw new Error(`未找到 FDE 模拟登录账号: ${userId}`);
  }

  const identities = buildFdeIdentities(targetMember);

  return {
    accountId: options.accountId,
    userId: targetMember.id,
    name: targetMember.name,
    phone: targetMember.phone,
    role: getFdeRole(targetMember),
    roleLabel: targetMember.title,
    description: options.description,
    verificationCode,
    identities,
    quickLoginIdentityId: options.quickLoginIdentityId ?? `${targetMember.id}-business`,
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

const MULTI_TENANT_FDE_LEADER_TENANT: MockTenantInfo = {
  id: "tenant-fde-hq",
  name: "Frontis FDE 总部租户",
  code: "FDE-HQ-2026-001",
};

const MULTI_TENANT_FDE_ENGINEER_TENANT: MockTenantInfo = {
  id: "tenant-fde-east-delivery",
  name: "Frontis FDE 华东交付租户",
  code: "FDE-EAST-2026-011",
};

export const ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT: MockAuthAccount = buildEnterpriseAccount(
  "user-member-001",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-employee",
    description: "普通员工账号，仅可进入企业对话工作台处理个人协作与成果沉淀。",
  },
);

export const FDE_LEADER_MOCK_ACCOUNT: MockAuthAccount = buildFdeAccount(
  FDE_PRIMARY_LEADER_MEMBER_ID,
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-fde-leader",
    description: "FDE 负责人账号，默认进入业务管理，可切换到开发管理视角。",
  },
);

export const ENTERPRISE_ADMIN_MOCK_ACCOUNT: MockAuthAccount = buildEnterpriseAccount(
  "user-admin-001",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-enterprise-admin",
    description: "企业管理员账号，登录后进入 FrontisAI工作台，并可从工作台进入企业管理后台。",
  },
);

export const FDE_ENGINEER_MOCK_ACCOUNT: MockAuthAccount = buildFdeAccount(
  FDE_PRIMARY_MEMBER_ID,
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-fde-engineer",
    description: "普通 FDE 工程师账号，聚焦租户交付、版本协同和客户运行支持。",
  },
);

export const MULTI_TENANT_MOCK_ACCOUNT: MockAuthAccount = {
  accountId: "mock-account-multi-tenant",
  userId: "user-admin-001",
  name: "林若岚",
  phone: "13800009999",
  role: "admin",
  roleLabel: "多租户综合账号",
  description:
    "一个账号同时挂载企业员工、企业管理员、FDE 负责人和 FDE 工程师四种身份，登录后默认进入 FrontisAI工作台，并可按权限进入其他系统。",
  verificationCode: DEFAULT_MOCK_VERIFICATION_CODE,
  quickLoginIdentityId: "multi-tenant-enterprise-employee",
  identities: [
    buildMultiTenantIdentity("multi-tenant-enterprise-employee", MULTI_TENANT_ENTERPRISE_WORKSPACE_TENANT, {
      subjectId: "user-member-001",
      subjectName: "王晨",
      platform: "enterpriseWorkspace",
      platformLabel: ENTERPRISE_WORKSPACE_LABEL,
      role: "employee",
      roleLabel: "普通员工",
      description: "以普通员工身份进入华东运营租户的 FrontisAI工作台，查看个人专家与工作成果。",
      entryPath: "/web/employee",
    }),
    buildMultiTenantIdentity("multi-tenant-enterprise-admin", MULTI_TENANT_ENTERPRISE_ADMIN_TENANT, {
      subjectId: "user-admin-001",
      subjectName: "杨万泉",
      platform: "enterpriseWorkspace",
      platformLabel: ENTERPRISE_WORKSPACE_LABEL,
      role: "admin",
      roleLabel: "企业管理员",
      description: "以企业管理员身份进入集团租户的 FrontisAI工作台，并可从工作台进入企业管理后台。",
      entryPath: "/web/admin/workspace",
    }),
    buildMultiTenantIdentity("multi-tenant-fde-leader", MULTI_TENANT_FDE_LEADER_TENANT, {
      subjectId: FDE_PRIMARY_LEADER_MEMBER_ID,
      subjectName: "王琳",
      platform: "fdeBusiness",
      platformLabel: "FDE业务管理",
      role: "fdeAdmin",
      roleLabel: "FDE 团队负责人",
      description: "以 FDE 负责人身份进入总部租户，统筹商机、交付、版本与团队协同。",
      entryPath: "/fde/dashboard",
    }),
    buildMultiTenantIdentity("multi-tenant-fde-engineer", MULTI_TENANT_FDE_ENGINEER_TENANT, {
      subjectId: FDE_PRIMARY_MEMBER_ID,
      subjectName: "高捷",
      platform: "fdeBusiness",
      platformLabel: "FDE业务管理",
      role: "fdeMember",
      roleLabel: "FDE 配置工程师",
      description: "以普通 FDE 工程师身份进入区域交付租户，处理订单配置、交付执行与版本协同。",
      entryPath: "/fde/delivery",
    }),
  ],
};

export const MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [
  ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT,
  ENTERPRISE_ADMIN_MOCK_ACCOUNT,
  FDE_LEADER_MOCK_ACCOUNT,
  FDE_ENGINEER_MOCK_ACCOUNT,
  MULTI_TENANT_MOCK_ACCOUNT,
];

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
export const getDefaultPathByRole = (role: FrontisWebRole): string =>
  getWorkspacePathByRole(role);

/**
 * 获取任意模拟角色的默认落地路径。
 */
export const getDefaultPathByMockRole = (role: MockAuthRole): string => {
  if (role === "fdeAdmin" || role === "fdeMember") {
    return "/fde/dashboard";
  }

  return getDefaultPathByRole(role);
};

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
 * 获取企业管理员后台路径。
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

  return MOCK_AUTH_ACCOUNTS.find(item => item.phone === normalizedPhone) ?? null;
};

/**
 * 根据账号 id 匹配模拟登录账号。
 */
export const getMockAccountByAccountId = (accountId: string): MockAuthAccount | null =>
  MOCK_AUTH_ACCOUNTS.find(item => item.accountId === accountId) ?? null;

const getSafeIdentities = (
  identities?: MockAuthIdentity[] | null,
): MockAuthIdentity[] => (Array.isArray(identities) ? identities : []);

/**
 * 兼容旧版持久化会话，补齐缺失的 identities 字段。
 */
export const normalizeMockSession = (
  session: MockAuthSession | null,
): MockAuthSession | null => {
  if (!session) {
    return null;
  }

  const matchedAccount = getMockAccountByAccountId(session.accountId);
  const nextIdentities = Array.isArray(session.identities)
    ? session.identities
    : matchedAccount?.identities ?? [];
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

const getTargetPlatformByPath = (
  redirectPath?: string,
): MockIdentityPlatform | null => {
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

  if (normalizedRedirectPath.startsWith("/fde/agent-dev")) {
    return "fdeDev";
  }

  if (normalizedRedirectPath.startsWith("/fde")) {
    return "fdeBusiness";
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

  return getSafeIdentities(session.identities).find(item => item.id === session.activeIdentityId) ?? null;
};

/**
 * 根据身份 id 获取身份定义。
 */
export const getIdentityById = (
  identities: MockAuthIdentity[] | undefined,
  identityId: string,
): MockAuthIdentity | null => getSafeIdentities(identities).find(item => item.id === identityId) ?? null;

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

  if (identity.role === "fdeAdmin" || identity.role === "fdeMember") {
    return normalizedRedirectPath.startsWith("/fde");
  }

  if (identity.role === "admin") {
    return (
      normalizedRedirectPath.startsWith("/web/admin") ||
      normalizedRedirectPath.startsWith("/web/employee")
    );
  }

  return normalizedRedirectPath.startsWith("/web/employee");
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
    return getLoginPath(redirectPath);
  }

  const fallbackIdentity = activeIdentity ?? getDefaultIdentity(identities);

  if (!fallbackIdentity) {
    return "/portal";
  }

  return resolveIdentityEntryPath(fallbackIdentity, redirectPath);
};
