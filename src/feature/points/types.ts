/**
 * 积分包上架状态。
 */
export type MockPointsPackageStatus = "active" | "inactive";

/**
 * 积分包可见范围。内部包只供运营后台给指定租户充值，用户侧不可见。
 */
export type MockPointsPackageScope = "public" | "internal";

/**
 * 原型中的积分包定义。
 */
export interface MockPointsPackageOption {
  id: string;
  title: string;
  description: string;
  points: number;
  price: number;
  giftPoints?: number;
  scope: MockPointsPackageScope;
  status: MockPointsPackageStatus;
  sortOrder: number;
  tagLabel?: string;
  updatedAt: string;
}

export type MockPointsPackageInput = Pick<
  MockPointsPackageOption,
  "title" | "description" | "points" | "price" | "tagLabel" | "giftPoints"
> & {
  scope?: MockPointsPackageScope;
};

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
    | "giftPoints"
    | "scope"
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
  paymentChannelLabel?: string;
  tagLabel?: string;
}
