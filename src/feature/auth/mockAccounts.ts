import { INITIAL_FRONTIS_WEB_USERS } from "@/mocks/mockData";
import type { FrontisUserRole, FrontisWebRole, FrontisWebUserItem } from "@/pages/types";

import { MANAGEMENT_CONSOLE_LABEL, PRODUCT_NAME } from "@/constants/brand";
import {
  DEFAULT_TENANT_ROLE_IDS,
  DEPARTMENT_LEAD_PERMISSION_IDS,
  MANAGEMENT_PERMISSION_IDS,
  OPERATIONS_AGENT_REVIEWER_PERMISSION_IDS,
  OPERATIONS_OPERATOR_PERMISSION_IDS,
  OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
  TENANT_ADMIN_PERMISSION_IDS,
  TENANT_MEMBER_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";
import { applyMockSubscriptionPlanToTenant } from "@/feature/subscription/mockSubscriptionPlans";
import type { MockSubscriptionPlanPurchaseOption } from "@/feature/subscription/types";
import {
  NEW_USER_INITIAL_PERMISSION_IDS,
  OPERATIONS_ACCOUNT_OPTIONS,
} from "@/feature/operations/mockData";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import { hasIdentitySystemAccess } from "@/utils/tenantRoleAccess";
import type {
  MockAuthAccount,
  MockAuthIdentity,
  MockAuthRole,
  MockAuthSession,
  MockAuthSystemEntry,
  MockAuthTenantEntry,
  MockIdentityPlatform,
  MockTenantInviteMemberParams,
  MockTenantDeploymentMode,
  MockTenantManagementSnapshot,
  MockTenantPointsOrderItem,
  MockTenantRegistrationParams,
} from "@/feature/auth/types";

const LOGIN_PATH = "/login";
const TENANT_SELECTION_PATH = "/select-tenant";
const DEFAULT_MOCK_VERIFICATION_CODE = "123456";
const DEFAULT_MOCK_PASSWORD = "Frontis@2026";
const NEW_USER_ACCOUNT_ROLE_LABEL = "新用户";
const ENTERPRISE_WORKSPACE_LABEL = `${PRODUCT_NAME}工作台`;
const OPERATIONS_CONSOLE_LABEL = "运营管理平台";
const OPERATIONS_TENANT: MockTenantInfo = {
  id: "platform-operations",
  name: OPERATIONS_CONSOLE_LABEL,
  code: "OPS-PLATFORM",
};
const STORED_MOCK_ACCOUNTS_STORAGE_KEY = "frontis.mock.auth.accounts";
const STORED_MOCK_ACCOUNT_PASSWORDS_STORAGE_KEY = "frontis.mock.auth.account-passwords";
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
  operationsAdmin: 2,
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

interface StoredMockAccountPassword {
  accountId: string;
  password: string;
  updatedAt: string;
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

const NEW_USER_ONBOARDING_TENANT: MockTenantInfo = {
  id: "tenant-new-user-onboarding-demo",
  name: "沈一新的工作室",
  code: "SELF-2026-NEW",
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
  roleIds: string[] = [DEFAULT_TENANT_ROLE_IDS[role]],
  assignedAgentIds?: string[],
): FrontisWebUserItem => ({
  id: userId,
  departmentId,
  name,
  phone,
  role,
  roleIds,
  status: "active",
  assignedAgentIds:
    assignedAgentIds ??
    (role === "enterpriseAdmin"
      ? [...DEFAULT_ADMIN_ASSIGNED_AGENT_IDS]
      : [...DEFAULT_MEMBER_ASSIGNED_AGENT_IDS]),
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

const getPermissionIdsByUserRole = (role: FrontisUserRole): string[] => {
  if (role === "enterpriseAdmin") {
    return TENANT_ADMIN_PERMISSION_IDS;
  }

  if (role === "departmentLead") {
    return DEPARTMENT_LEAD_PERMISSION_IDS;
  }

  return TENANT_MEMBER_PERMISSION_IDS;
};

const hasAdminConsolePermission = (permissionIds: string[]): boolean => {
  const normalizedPermissionIds = normalizeTenantRolePermissionIds(permissionIds);

  return Object.values(MANAGEMENT_PERMISSION_IDS).some(permissionId =>
    normalizedPermissionIds.includes(permissionId),
  );
};

const getOperationsPermissionIds = (operationsAccountId: string): string[] => {
  const matchedAccount = OPERATIONS_ACCOUNT_OPTIONS.find(
    account => account.accountId === operationsAccountId,
  );

  if (matchedAccount?.role === "superAdmin") {
    return OPERATIONS_SUPER_ADMIN_PERMISSION_IDS;
  }

  if (matchedAccount?.role === "operator") {
    return OPERATIONS_OPERATOR_PERMISSION_IDS;
  }

  return OPERATIONS_AGENT_REVIEWER_PERMISSION_IDS;
};

const getTenantAdminDeploymentMode = (tenantId: string): MockTenantDeploymentMode =>
  getMockTenantManagementSnapshot(tenantId)?.deploymentMode ?? "publicCloud";

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
    permissionIds: getPermissionIdsByUserRole(role),
    role: workspaceRole,
    roleLabel: getRoleLabel(role),
    description:
      workspaceRole === "admin"
        ? `作为租户管理员进入 ${tenant.name} 的${PRODUCT_NAME}工作台，并继续进入${MANAGEMENT_CONSOLE_LABEL}。`
        : `作为租户成员进入 ${tenant.name} 的${PRODUCT_NAME}工作台，查看可用 AI 专家、对话与成果。`,
    entryPath: workspaceRole === "admin" ? "/web/admin/workspace" : "/web/employee",
  });
};

const buildOperationsIdentity = (
  identityId: string,
  operationsAccountId: string,
  subjectName: string,
  tenant: MockTenantInfo = OPERATIONS_TENANT,
): MockAuthIdentity =>
  buildIdentity({
    id: identityId,
    subjectId: operationsAccountId,
    subjectName,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantCode: tenant.code,
    platform: "operationsAdmin",
    platformLabel: OPERATIONS_CONSOLE_LABEL,
    permissionIds: getOperationsPermissionIds(operationsAccountId),
    role: "admin",
    roleLabel: tenant.id === OPERATIONS_TENANT.id ? "运营管理员" : "租户运营管理员",
    description:
      tenant.id === OPERATIONS_TENANT.id
        ? "运营管理后台用于处理租户、AI 专家上架审批和统一组织权限管理。"
        : `进入 ${tenant.name} 的租户运营管理后台。`,
    entryPath: "/ops/tenants",
    operationsAccountId,
  });

const withOperationsIdentity = (
  account: MockAuthAccount,
  identityId: string,
  operationsAccountId: string,
  subjectName: string,
  tenant?: MockTenantInfo,
): MockAuthAccount => ({
  ...account,
  identities: [
    ...account.identities,
    buildOperationsIdentity(identityId, operationsAccountId, subjectName, tenant),
  ],
});

const buildOperationsAccount = (
  account: (typeof OPERATIONS_ACCOUNT_OPTIONS)[number],
): MockAuthAccount => {
  const identity = buildOperationsIdentity(
    `operations-platform-${account.accountId}`,
    account.accountId,
    account.name,
  );

  return {
    accountId: `mock-${account.accountId}`,
    userId: account.userId,
    name: account.name,
    phone: account.phone,
    role: "admin",
    roleLabel: account.roleLabel,
    description: account.description,
    password: DEFAULT_MOCK_PASSWORD,
    verificationCode: account.verificationCode,
    identities: [identity],
    quickLoginIdentityId: identity.id,
  };
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
    password: DEFAULT_MOCK_PASSWORD,
    verificationCode,
    identities,
    quickLoginIdentityId: options.quickLoginIdentityId ?? identities[0]?.id,
  };
};

const applyInitialPermissionTemplateToTenantAccount = (
  account: MockAuthAccount,
  initialPermissionIds: string[],
  roleLabel?: string,
): MockAuthAccount => {
  const normalizedPermissionIds = normalizeTenantRolePermissionIds(initialPermissionIds);
  const hasAdminAccess = hasAdminConsolePermission(normalizedPermissionIds);

  return {
    ...account,
    identities: account.identities.map(identity => {
      if (identity.platform !== "enterpriseWorkspace") {
        return identity;
      }

      return {
        ...identity,
        permissionIds: [...normalizedPermissionIds],
        roleLabel: roleLabel ?? identity.roleLabel,
        entryPath: hasAdminAccess ? "/web/admin/workspace" : "/web/employee",
      };
    }),
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

const readStoredMockAccountPasswords = (): StoredMockAccountPassword[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORED_MOCK_ACCOUNT_PASSWORDS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is StoredMockAccountPassword =>
        typeof item === "object" &&
        item !== null &&
        "accountId" in item &&
        "password" in item &&
        typeof (item as StoredMockAccountPassword).accountId === "string" &&
        typeof (item as StoredMockAccountPassword).password === "string",
    );
  } catch {
    return [];
  }
};

const writeStoredMockAccountPasswords = (passwords: StoredMockAccountPassword[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORED_MOCK_ACCOUNT_PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
};

/**
 * 获取 mock 账号当前可用密码；原型仅用于交互演示，不代表真实存储方案。
 */
export const getMockAccountPassword = (account: MockAuthAccount): string | undefined => {
  const storedPassword = readStoredMockAccountPasswords().find(
    item => item.accountId === account.accountId,
  )?.password;

  return storedPassword ?? account.password;
};

/**
 * 判断 mock 账号是否需要先设置密码。
 */
export const isMockAccountPasswordSetupRequired = (account: MockAuthAccount): boolean =>
  Boolean(account.passwordSetupRequired && !getMockAccountPassword(account));

/**
 * 保存 mock 账号密码，用于演示验证码注册后绑定密码的交互。
 */
export const saveMockAccountPassword = (
  accountId: string,
  password: string,
): MockAuthAccount | null => {
  const matchedAccount = getMockAccountByAccountId(accountId);

  if (!matchedAccount) {
    return null;
  }

  const nextPasswords = [
    ...readStoredMockAccountPasswords().filter(item => item.accountId !== accountId),
    {
      accountId,
      password,
      updatedAt: new Date().toISOString(),
    },
  ];

  writeStoredMockAccountPasswords(nextPasswords);

  return matchedAccount;
};

const isRuntimeGeneratedMockAccount = (account: MockAuthAccount): boolean =>
  account.accountId.startsWith("mock-account-self-") ||
  account.accountId.startsWith("mock-account-tenant-");

export const PUBLIC_ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT: MockAuthAccount = buildTenantAccount(
  "user-member-001",
  "王晨",
  "13800000011",
  "employee",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-public-employee",
    description: "公有云租户成员账号，可进入工作台处理个人协作与成果沉淀。",
    tenant: MULTI_TENANT_ENTERPRISE_ADMIN_TENANT,
  },
);

export const ENTERPRISE_ADMIN_MOCK_ACCOUNT: MockAuthAccount = withOperationsIdentity(
  buildTenantAccount(
    "user-admin-001",
    "杨万泉",
    "13800000001",
    "enterpriseAdmin",
    DEFAULT_MOCK_VERIFICATION_CODE,
    {
      accountId: "mock-account-enterprise-admin",
      description: `公有云租户管理员账号，登录后进入${PRODUCT_NAME}工作台，并可继续进入${MANAGEMENT_CONSOLE_LABEL}。`,
      tenant: MULTI_TENANT_ENTERPRISE_ADMIN_TENANT,
    },
  ),
  "enterprise-admin-operations-platform",
  "ops-account-yang-wanquan",
  "杨万泉",
  MULTI_TENANT_ENTERPRISE_ADMIN_TENANT,
);

export const PRIVATE_ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT: MockAuthAccount = buildTenantAccount(
  "user-member-001",
  "王晨",
  "13800006602",
  "employee",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-private-employee",
    description: "私有化部署租户成员账号，仅可进入企业工作台处理个人协作与成果沉淀。",
  },
);

export const PRIVATE_ENTERPRISE_ADMIN_MOCK_ACCOUNT: MockAuthAccount = buildTenantAccount(
  "user-admin-001",
  "杨万泉",
  "13800006601",
  "enterpriseAdmin",
  DEFAULT_MOCK_VERIFICATION_CODE,
  {
    accountId: "mock-account-private-admin",
    description: `私有化部署租户管理员账号，仅进入企业工作台和${MANAGEMENT_CONSOLE_LABEL}，不包含运营管理平台。`,
  },
);

export const PERSONAL_REGISTERED_MOCK_ACCOUNT: MockAuthAccount =
  applyInitialPermissionTemplateToTenantAccount(
    buildTenantAccount(
      "user-self-admin-001",
      "李想",
      "13800005555",
      "enterpriseAdmin",
      DEFAULT_MOCK_VERIFICATION_CODE,
      {
        accountId: "mock-account-personal-admin",
        description: "自注册租户管理员账号，默认是 1 席个人版，可在团队扩充中购买席位。",
        tenant: PERSONAL_REGISTERED_TENANT,
      },
    ),
    NEW_USER_INITIAL_PERMISSION_IDS,
  );

const buildNewUserOnboardingMockAccount = (): MockAuthAccount => {
  const account = buildTenantAccount(
    "user-new-admin-001",
    "沈一新",
    "13800007777",
    "enterpriseAdmin",
    DEFAULT_MOCK_VERIFICATION_CODE,
    {
      accountId: "mock-account-new-user-onboarding",
      description: "新用户首次进入示例账号，登录后直接进入 ME 并展示初始化引导。",
      tenant: NEW_USER_ONBOARDING_TENANT,
    },
  );

  const initialPermissionIds = normalizeTenantRolePermissionIds(NEW_USER_INITIAL_PERMISSION_IDS);
  const hasAdminAccess = hasAdminConsolePermission(initialPermissionIds);

  return {
    ...account,
    password: undefined,
    passwordSetupRequired: true,
    roleLabel: NEW_USER_ACCOUNT_ROLE_LABEL,
    identities: account.identities.map(identity => ({
      ...identity,
      permissionIds: [...initialPermissionIds],
      roleLabel: NEW_USER_ACCOUNT_ROLE_LABEL,
      entryPath: hasAdminAccess ? "/web/admin/workspace" : "/web/employee",
    })),
  };
};

export const NEW_USER_ONBOARDING_MOCK_ACCOUNT: MockAuthAccount =
  buildNewUserOnboardingMockAccount();

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
        permissionIds: getPermissionIdsByUserRole("employee"),
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
        permissionIds: getPermissionIdsByUserRole("enterpriseAdmin"),
        role: "admin",
        roleLabel: "租户管理员",
        description: `以租户管理员身份进入集团租户的${PRODUCT_NAME}工作台，并继续进入${MANAGEMENT_CONSOLE_LABEL}。`,
        entryPath: "/web/admin/workspace",
      },
    ),
    buildOperationsIdentity(
      "multi-tenant-operations-platform",
      "ops-account-yang-wanquan",
      "杨万泉",
      MULTI_TENANT_ENTERPRISE_ADMIN_TENANT,
    ),
  ],
};

const PRESET_MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [
  PUBLIC_ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT,
  ENTERPRISE_ADMIN_MOCK_ACCOUNT,
  NEW_USER_ONBOARDING_MOCK_ACCOUNT,
  PERSONAL_REGISTERED_MOCK_ACCOUNT,
  MULTI_TENANT_MOCK_ACCOUNT,
  PRIVATE_ENTERPRISE_ADMIN_MOCK_ACCOUNT,
  PRIVATE_ENTERPRISE_EMPLOYEE_MOCK_ACCOUNT,
  ...OPERATIONS_ACCOUNT_OPTIONS.filter(
    account => account.accountId !== "ops-account-yang-wanquan",
  ).map(buildOperationsAccount),
];

/**
 * 获取当前全部可用的模拟登录账号。
 */
export const getMockAuthAccounts = (): MockAuthAccount[] => {
  const accountMap = new Map<string, MockAuthAccount>();
  const presetAccountIds = new Set(PRESET_MOCK_AUTH_ACCOUNTS.map(account => account.accountId));
  const presetPhones = new Set(PRESET_MOCK_AUTH_ACCOUNTS.map(account => account.phone));
  const presetDisplayKeys = new Set(
    PRESET_MOCK_AUTH_ACCOUNTS.map(account => `${account.roleLabel}:${account.name}`),
  );

  getStoredMockAccounts()
    .filter(
      account =>
        isRuntimeGeneratedMockAccount(account) &&
        !presetAccountIds.has(account.accountId) &&
        !presetPhones.has(account.phone) &&
        !presetDisplayKeys.has(`${account.roleLabel}:${account.name}`),
    )
    .forEach(account => {
      accountMap.set(account.accountId, account);
    });

  PRESET_MOCK_AUTH_ACCOUNTS.forEach(account => {
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
export const getAdminManagementPath = (
  deploymentMode: MockTenantDeploymentMode = "publicCloud",
): string =>
  deploymentMode === "privateCloud" ? "/web/admin/private-cloud" : "/web/admin/public-cloud";

/**
 * 获取指定租户的管理后台路径。
 */
export const getTenantAdminManagementPath = (tenantId: string | undefined): string =>
  getAdminManagementPath(tenantId ? getTenantAdminDeploymentMode(tenantId) : "publicCloud");

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
 * 创建自注册租户所有者 mock 账号与租户快照。
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
  const registrationStrategy = loadOperationsRegistrationStrategy();
  const initialPermissionIds = normalizeTenantRolePermissionIds(
    registrationStrategy.initialPermissionIds.length
      ? registrationStrategy.initialPermissionIds
      : NEW_USER_INITIAL_PERMISSION_IDS,
  );
  const hasAdminAccess = hasAdminConsolePermission(initialPermissionIds);
  const account = buildTenantAccount(
    userId,
    params.name.trim(),
    normalizedPhone,
    "enterpriseAdmin",
    DEFAULT_MOCK_VERIFICATION_CODE,
    {
      accountId,
      description: `自注册新用户账号，登录后进入${PRODUCT_NAME}完成初始化。`,
      tenant,
    },
  );
  const accountWithRegistrationRole: MockAuthAccount = {
    ...account,
    password: undefined,
    passwordSetupRequired: true,
    roleLabel: NEW_USER_ACCOUNT_ROLE_LABEL,
    identities: account.identities.map(identity => ({
      ...identity,
      permissionIds: [...initialPermissionIds],
      roleLabel: NEW_USER_ACCOUNT_ROLE_LABEL,
      entryPath: hasAdminAccess ? "/web/admin/workspace" : "/web/employee",
      description: `自注册后以${NEW_USER_ACCOUNT_ROLE_LABEL}初始化身份进入 ${tenant.name}。`,
    })),
  };
  const snapshot = saveMockTenantManagementSnapshot({
    tenantId,
    tenantName: tenant.name,
    tenantCode,
    ownerAccountId: accountId,
    adminUserId: userId,
    deploymentMode: "publicCloud",
    billingMode: "points",
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
    users: [
      buildRuntimeUser(
        userId,
        params.name.trim(),
        normalizedPhone,
        "enterpriseAdmin",
        "dept-default",
        [DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin],
      ),
    ],
    agentUsageRecords: [],
    pointsLedger: [
      {
        id: `${tenantId}-register-bonus`,
        title: "注册送额度",
        description: "新租户创建完成后自动发放的初始额度。",
        points: registrationStrategy.defaultGiftPoints,
        direction: "income",
        createdAt: "刚刚",
        actorName: "FrontisAI",
      },
    ],
    pointsUsageRecords: [],
    pointsOrders: [],
    subscriptionOrders: [],
    referralRecords: [],
  });

  saveStoredMockAccount(accountWithRegistrationRole);

  return {
    account: accountWithRegistrationRole,
    snapshot,
  };
};

/**
 * 支付成功后为当前租户完成团队扩充。
 */
export const activateMockTenantSubscriptionPlan = (
  tenantId: string,
  purchaseOption: MockSubscriptionPlanPurchaseOption,
): MockTenantManagementSnapshot | null => {
  return applyMockSubscriptionPlanToTenant(tenantId, purchaseOption, {
    orderSourceLabel: "用户自助购买",
    paymentChannelLabel: "统一扫码支付",
  });
};

/**
 * 支付成功后为积分计费租户补充积分，并同步余额、流水和积分订单。
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

  if (!matchedSnapshot || matchedSnapshot.billingMode !== "points" || points <= 0) {
    return null;
  }

  const timestamp = Date.now();
  const packageTitle = options?.packageTitle?.trim();
  const packageId = options?.packageId?.trim();
  const pointsOrder: MockTenantPointsOrderItem | null =
    packageId && packageTitle && typeof options?.price === "number"
      ? {
          id: `${tenantId}-points-order-${timestamp}`,
          orderNo: `PT-${timestamp.toString().slice(-10)}`,
          packageId,
          packageTitle,
          packagePoints: points,
          amount: options.price,
          status: "paid",
          paymentChannelLabel: options.paymentChannelLabel ?? "统一扫码支付",
          purchaserName: actorName,
          createdAt: "刚刚",
          paidAt: "刚刚",
        }
      : null;

  return saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    pointsBalance: matchedSnapshot.pointsBalance + points,
    pointsLedger: [
      {
        id: `${tenantId}-recharge-${timestamp}`,
        title: options?.title ?? "管理员充值",
        description: options?.description ?? "补充租户积分，用于继续运行模型与第三方接口。",
        points,
        direction: "income",
        createdAt: "刚刚",
        actorName: options?.title === "购买标准积分包" ? "FrontisAI" : actorName,
      },
      ...matchedSnapshot.pointsLedger,
    ],
    pointsOrders: pointsOrder
      ? [pointsOrder, ...matchedSnapshot.pointsOrders]
      : matchedSnapshot.pointsOrders,
  });
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
      description: `${matchedSnapshot.tenantName} 邀请成员账号，进入后共用租户额度。`,
      tenant,
    },
  );
  const nextUsers = [
    ...matchedSnapshot.users,
    buildRuntimeUser(
      userId,
      params.name.trim(),
      normalizedPhone,
      params.role,
      params.departmentId,
      params.roleIds,
    ),
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

const isTenantScopedIdentity = (identity: MockAuthIdentity): boolean =>
  identity.platform !== "operationsAdmin";

/**
 * 获取身份所属部署形态。运营平台仅属于公有云体系。
 */
export const getIdentityDeploymentMode = (identity: MockAuthIdentity): MockTenantDeploymentMode => {
  if (identity.platform === "operationsAdmin") {
    return "publicCloud";
  }

  return getTenantAdminDeploymentMode(identity.tenantId);
};

/**
 * 按部署形态过滤可用身份。
 */
export const getIdentitiesForDeployment = (
  identities: MockAuthIdentity[] | undefined,
  deploymentMode?: MockTenantDeploymentMode,
): MockAuthIdentity[] => {
  const safeIdentities = getSafeIdentities(identities);

  if (!deploymentMode) {
    return safeIdentities;
  }

  return safeIdentities.filter(identity => getIdentityDeploymentMode(identity) === deploymentMode);
};

/**
 * 判断账号在指定部署形态下是否有可进入系统。
 */
export const hasAccountDeploymentMode = (
  account: MockAuthAccount,
  deploymentMode: MockTenantDeploymentMode,
): boolean => getIdentitiesForDeployment(account.identities, deploymentMode).length > 0;

const areStringListsSame = (
  leftValues: string[] | undefined,
  rightValues: string[] | undefined,
): boolean => {
  const safeLeftValues = leftValues ?? [];
  const safeRightValues = rightValues ?? [];

  if (safeLeftValues.length !== safeRightValues.length) {
    return false;
  }

  return safeLeftValues.every((value, index) => value === safeRightValues[index]);
};

const areIdentityListsSame = (
  leftIdentities: MockAuthIdentity[] | undefined,
  rightIdentities: MockAuthIdentity[],
): boolean => {
  if (!Array.isArray(leftIdentities) || leftIdentities.length !== rightIdentities.length) {
    return false;
  }

  return leftIdentities.every((identity, index) => {
    const rightIdentity = rightIdentities[index];

    if (!rightIdentity) {
      return false;
    }

    return (
      identity.id === rightIdentity.id &&
      identity.entryPath === rightIdentity.entryPath &&
      identity.role === rightIdentity.role &&
      identity.roleLabel === rightIdentity.roleLabel &&
      areStringListsSame(identity.permissionIds, rightIdentity.permissionIds)
    );
  });
};

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

  const nextIdentities = getIdentitiesForDeployment(
    matchedAccount.identities,
    session.deploymentMode,
  );
  const nextActiveIdentity =
    nextIdentities.find(identity => identity.id === session.activeIdentityId) ??
    nextIdentities.find(
      identity => identity.subjectId === session.userId && identity.role === session.role,
    ) ??
    nextIdentities.find(identity => identity.subjectId === session.userId) ??
    [...nextIdentities].sort(compareIdentityPriority)[0];
  const isSessionAlreadyNormalized =
    areIdentityListsSame(session.identities, nextIdentities) &&
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

  if (normalizedRedirectPath.startsWith("/ops")) {
    return "operationsAdmin";
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
  getSafeIdentities(identities).filter(
    identity => isTenantScopedIdentity(identity) && identity.tenantId === tenantId,
  );

/**
 * 获取账号所属租户数量。
 */
export const getTenantCount = (identities: MockAuthIdentity[] | undefined): number =>
  new Set(
    getSafeIdentities(identities)
      .filter(isTenantScopedIdentity)
      .map(identity => identity.tenantId),
  ).size;

const isRedirectAllowedForIdentity = (
  identity: MockAuthIdentity,
  redirectPath?: string,
): boolean => {
  const normalizedRedirectPath = normalizeRedirectPath(redirectPath);

  if (!normalizedRedirectPath) {
    return false;
  }

  if (identity.role === "admin") {
    if (identity.platform === "operationsAdmin") {
      return normalizedRedirectPath.startsWith("/ops");
    }

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
  const identityMap = new Map<MockIdentityPlatform, MockAuthIdentity>();

  getSafeIdentities(identities)
    .filter(
      identity =>
        hasIdentitySystemAccess(identity) &&
        (identity.platform === "operationsAdmin" ||
          (tenantId === OPERATIONS_TENANT.id
            ? isTenantScopedIdentity(identity)
            : Boolean(tenantId) && identity.tenantId === tenantId)),
    )
    .forEach(identity => {
      const currentIdentity = identityMap.get(identity.platform);

      if (!currentIdentity || compareIdentityPriority(identity, currentIdentity) < 0) {
        identityMap.set(identity.platform, identity);
      }
    });

  return Array.from(identityMap.values())
    .filter(identity => identity.id !== activeIdentityId)
    .filter(
      identity => identity.platform !== "operationsAdmin" || Boolean(identity.operationsAccountId),
    )
    .sort(compareIdentityPriority)
    .map(identity => ({
      identityId: identity.id,
      label: identity.platformLabel,
      entryPath: identity.entryPath,
      platform: identity.platform,
      operationsAccountId: identity.operationsAccountId,
    }));
};

/**
 * 获取系统入口在账户菜单中的展示文案。
 */
export const getSystemEntryMenuLabel = (entry: MockAuthSystemEntry): string =>
  entry.platform === "operationsAdmin" ? "运营管理后台" : `进入${entry.label}`;

/**
 * 获取当前账号可切换的租户入口。
 */
export const getTenantEntries = (
  identities: MockAuthIdentity[] | undefined,
  activeTenantId?: string,
): MockAuthTenantEntry[] => {
  const tenantMap = new Map<string, MockAuthTenantEntry>();

  getSafeIdentities(identities)
    .filter(isTenantScopedIdentity)
    .forEach(identity => {
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
  deploymentMode?: MockTenantDeploymentMode,
): MockAuthSession => ({
  accountId: account.accountId,
  userId: activeIdentity?.subjectId ?? account.userId,
  name: account.name,
  phone: account.phone,
  role: activeIdentity?.role ?? null,
  roleLabel: activeIdentity?.roleLabel,
  loginAt: new Date().toISOString(),
  identities: getIdentitiesForDeployment(account.identities, deploymentMode),
  activeIdentityId: activeIdentity?.id,
  deploymentMode,
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
    return "/login";
  }

  return resolveIdentityEntryPath(fallbackIdentity, redirectPath);
};
