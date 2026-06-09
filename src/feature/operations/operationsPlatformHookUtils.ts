import type {
  MockTenantEntitlementGrantItem,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import { DEFAULT_TENANT_ROLE_IDS } from "@/constants/tenantRolePermissions";
import type { OperationsTenant } from "@/feature/operations/types";

export const DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT = 1;

export const formatOperationsTimestamp = (): string => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");
  const hours = `${currentDate.getHours()}`.padStart(2, "0");
  const minutes = `${currentDate.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const buildOperationsTenantMemberId = (): string => `ops-tenant-member-${Date.now()}`;

export const buildOperationsProductId = (): string => `ops-product-${Date.now()}`;

export const buildOperationsAgentPlazaCategoryId = (): string =>
  `ops-agent-plaza-category-${Date.now()}`;

export const buildOperationsSkillCenterCategoryId = (): string =>
  `ops-skill-center-category-${Date.now()}`;

export const buildOperationsMeteringProviderId = (): string =>
  `ops-metering-provider-${Date.now()}`;

export const buildOperationsModelServiceId = (): string => `ops-model-service-${Date.now()}`;

export const getTenantEntitlementGrants = (
  snapshot: MockTenantManagementSnapshot,
): MockTenantEntitlementGrantItem[] => snapshot.entitlementGrants ?? [];

export const buildAdminTenantMember = (adminName: string, adminPhone: string, addedAt: string) => ({
  id: buildOperationsTenantMemberId(),
  name: adminName.trim(),
  phone: adminPhone.trim(),
  roleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
  roleLabel: "初始管理员",
  addedAt,
});

export const syncAdminTenantMember = (
  members: OperationsTenant["members"],
  adminName: string,
  adminPhone: string,
  fallbackAddedAt: string,
): OperationsTenant["members"] => {
  const adminMemberIndex = members.findIndex(
    item => item.phone === adminPhone.trim() || item.roleLabel.includes("管理员"),
  );

  if (adminMemberIndex < 0) {
    return [buildAdminTenantMember(adminName, adminPhone, fallbackAddedAt), ...members];
  }

  return members.map((item, index) =>
    index === adminMemberIndex
      ? {
          ...item,
          name: adminName.trim(),
          phone: adminPhone.trim(),
          roleId: item.roleId ?? DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
          roleLabel: "初始管理员",
        }
      : item,
  );
};
