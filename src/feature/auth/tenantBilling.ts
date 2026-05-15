import type { MockTenantBillingMode, MockTenantManagementSnapshot } from "@/feature/auth/types";

/**
 * 解析租户计费口径，兼容历史 mock 数据中尚未显式保存 billingMode 的记录。
 */
export const resolveTenantBillingMode = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): MockTenantBillingMode => {
  if (tenantSnapshot?.billingMode) {
    return tenantSnapshot.billingMode;
  }

  return tenantSnapshot?.deploymentMode === "privateCloud" ? "cost" : "points";
};

/**
 * 判断当前租户是否走积分计费，决定积分余额、团队扩充与订单记录入口是否展示。
 */
export const isPointsBillingTenant = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): boolean => resolveTenantBillingMode(tenantSnapshot) === "points";

/**
 * 判断当前租户是否走成本计费，驾驶舱需直接按成本统计。
 */
export const isCostBillingTenant = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): boolean => resolveTenantBillingMode(tenantSnapshot) === "cost";
