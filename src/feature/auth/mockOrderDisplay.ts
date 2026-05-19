import type {
  MockTenantPointsOrderItem,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");

const isLegacyStandardPointsOrder = (order: MockTenantPointsOrderItem): boolean =>
  (order.packageId === "standard" || order.packageTitle === "标准积分包") &&
  (order.packagePoints !== 10000 || order.giftPoints === undefined || order.totalPoints === undefined);

const getPointsOrderGiftPoints = (order: MockTenantPointsOrderItem): number => {
  if (isLegacyStandardPointsOrder(order)) {
    return 100;
  }

  if (typeof order.giftPoints === "number") {
    return order.giftPoints;
  }

  return 0;
};

const getPointsOrderTotalPoints = (order: MockTenantPointsOrderItem, giftPoints: number): number => {
  if (isLegacyStandardPointsOrder(order)) {
    return 10100;
  }

  return order.totalPoints ?? order.packagePoints + giftPoints;
};

export const formatMockPointsOrderBenefit = (order: MockTenantPointsOrderItem): string => {
  const giftPoints = Math.max(Math.floor(getPointsOrderGiftPoints(order)), 0);
  const totalPoints = getPointsOrderTotalPoints(order, giftPoints);
  const giftLabel = giftPoints > 0 ? `，含赠送 ${formatNumber(giftPoints)}` : "";

  return `到账 ${formatNumber(totalPoints)} 积分${giftLabel}`;
};

export const formatMockSubscriptionOrderBenefit = (
  order: MockTenantSubscriptionOrderItem,
): string => {
  const purchaseModeLabel = order.purchaseMode === "renew" ? "续约" : "新增";

  return `${purchaseModeLabel} ${formatNumber(order.seatCount)} 席`;
};
