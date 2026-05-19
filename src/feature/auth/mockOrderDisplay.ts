import type {
  MockTenantPointsOrderItem,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");

const getPointsOrderGiftPoints = (order: MockTenantPointsOrderItem): number => {
  if (typeof order.giftPoints === "number") {
    return order.giftPoints;
  }

  // 兼容旧浏览器 localStorage 中缺少赠送字段的标准积分包订单。
  return order.packageId === "standard" || order.packageTitle === "标准积分包" ? 100 : 0;
};

export const formatMockPointsOrderBenefit = (order: MockTenantPointsOrderItem): string => {
  const giftPoints = Math.max(Math.floor(getPointsOrderGiftPoints(order)), 0);
  const totalPoints = order.totalPoints ?? order.packagePoints + giftPoints;
  const giftLabel = giftPoints > 0 ? `，含赠送 ${formatNumber(giftPoints)}` : "";

  return `到账 ${formatNumber(totalPoints)} 积分${giftLabel}`;
};

export const formatMockSubscriptionOrderBenefit = (
  order: MockTenantSubscriptionOrderItem,
): string => {
  const purchaseModeLabel = order.purchaseMode === "renew" ? "续约" : "新增";

  return `${purchaseModeLabel} ${formatNumber(order.seatCount)} 席`;
};
