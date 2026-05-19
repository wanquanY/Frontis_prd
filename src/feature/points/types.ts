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
  promotionEnabled?: boolean;
  discountFactor?: number;
  promotionStartsAt?: string;
  promotionEndsAt?: string;
  giftPoints?: number;
  status: MockPointsPackageStatus;
  sortOrder: number;
  tagLabel?: string;
  updatedAt: string;
}

export type MockPointsPackageInput = Pick<
  MockPointsPackageOption,
  | "title"
  | "description"
  | "points"
  | "price"
  | "tagLabel"
  | "promotionEnabled"
  | "discountFactor"
  | "promotionStartsAt"
  | "promotionEndsAt"
  | "giftPoints"
>;

export type MockPointsPackageUpdate = Partial<
  Pick<
    MockPointsPackageOption,
    | "title"
    | "description"
    | "points"
    | "price"
    | "status"
    | "sortOrder"
    | "tagLabel"
    | "promotionEnabled"
    | "discountFactor"
    | "promotionStartsAt"
    | "promotionEndsAt"
    | "giftPoints"
  >
>;

/**
 * 用户发起积分包购买时锁定的价格和权益快照。
 */
export interface MockPointsPackagePurchaseSnapshot {
  packageId: string;
  packageTitle: string;
  description: string;
  basePoints: number;
  giftPoints: number;
  totalPoints: number;
  originalPrice: number;
  payableAmount: number;
  discountAmount: number;
  discountFactor: number;
  promotionActive: boolean;
  promotionStartsAt?: string;
  promotionEndsAt?: string;
  tagLabel?: string;
}
