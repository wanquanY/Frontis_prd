/**
 * 团队套餐上架状态。
 */
export type MockTenantPlanPackageStatus = "active" | "inactive";

/**
 * 原型中的团队版套餐定义。
 */
export interface MockTenantPlanPackageOption {
  id: string;
  title: string;
  description: string;
  includedSeats: number;
  price: number;
  billingCycleLabel: string;
  status: MockTenantPlanPackageStatus;
  sortOrder: number;
  tagLabel?: string;
  updatedAt: string;
}

/**
 * 单席位扩容定价配置。
 */
export interface MockTenantSeatPricing {
  pricePerSeat: number;
  billingCycleLabel: string;
  updatedAt: string;
}
