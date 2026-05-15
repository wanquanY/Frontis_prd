/**
 * 积分包上架状态。
 */
export type MockPointsPackageStatus = "active" | "inactive";

/**
 * 原型中的积分包定义。
 */
export interface MockPointsPackageOption {
  id: string;
  title: string;
  description: string;
  points: number;
  price: number;
  status: MockPointsPackageStatus;
  sortOrder: number;
  tagLabel?: string;
  updatedAt: string;
}
