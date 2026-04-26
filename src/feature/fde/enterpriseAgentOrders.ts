import dayjs from "dayjs";

import type { OperationsProductSubscriptionPlanKey } from "@/feature/operations/types";

/**
 * AI 专家商品订单在原型中的持久化 key。
 */
export const ENTERPRISE_AGENT_ORDER_STORAGE_KEY = "frontis.enterprise.agent.orders";

export type EnterpriseAgentOrderType = "trial" | "purchase";
export type EnterpriseAgentOrderStatus = "trialing" | "active" | "expired";

/**
 * AI 专家商品订单记录。
 */
export interface EnterpriseAgentOrderRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  productId: string;
  productName: string;
  agentName: string;
  orderNo: string;
  orderType: EnterpriseAgentOrderType;
  status: EnterpriseAgentOrderStatus;
  amount: number;
  priceLabel: string;
  subscriptionPlanKey?: OperationsProductSubscriptionPlanKey;
  subscriptionPlanLabel?: string;
  subscriptionDurationLabel?: string;
  paymentChannelLabel: string;
  purchaserName: string;
  createdAt: string;
  startsAt: string;
  paidAt?: string;
  expiresAt?: string;
}

const PRESET_ENTERPRISE_AGENT_ORDERS: EnterpriseAgentOrderRecord[] = [
  {
    id: "enterprise-agent-order-personal-001",
    tenantId: "tenant-personal-studio-demo",
    tenantName: "李想的工作室",
    productId: "ops-product-002",
    productName: "对账核验标准版",
    agentName: "客户对账核验助手",
    orderNo: "EAO-20260421-001",
    orderType: "purchase",
    status: "active",
    amount: 399,
    priceLabel: "¥399",
    subscriptionPlanKey: "month",
    subscriptionPlanLabel: "包月",
    subscriptionDurationLabel: "30天",
    paymentChannelLabel: "统一扫码支付",
    purchaserName: "李想",
    createdAt: "2026-04-21 20:18",
    startsAt: "2026-04-21 20:19",
    paidAt: "2026-04-21 20:19",
    expiresAt: "2026-05-21 23:59",
  },
];

const normalizeEnterpriseAgentOrder = (
  order: EnterpriseAgentOrderRecord,
): EnterpriseAgentOrderRecord => {
  const nextStatus =
    order.orderType === "trial" &&
    order.expiresAt &&
    dayjs(order.expiresAt).isBefore(dayjs(), "minute")
      ? "expired"
      : order.status;

  return {
    ...order,
    status: nextStatus,
  };
};

const isValidEnterpriseAgentOrder = (
  value: unknown,
): value is EnterpriseAgentOrderRecord =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "tenantId" in value &&
  "productId" in value &&
  "orderNo" in value &&
  "orderType" in value &&
  "status" in value;

/**
 * 从本地存储读取 AI 专家商品订单。
 */
export const loadEnterpriseAgentOrders = (): EnterpriseAgentOrderRecord[] => {
  if (typeof window === "undefined") {
    return PRESET_ENTERPRISE_AGENT_ORDERS.map(normalizeEnterpriseAgentOrder);
  }

  try {
    const rawValue = window.localStorage.getItem(ENTERPRISE_AGENT_ORDER_STORAGE_KEY);
    const storedOrders = !rawValue
      ? []
      : (() => {
          const parsedValue = JSON.parse(rawValue) as unknown;

          if (!Array.isArray(parsedValue)) {
            return [];
          }

          return parsedValue.filter(isValidEnterpriseAgentOrder);
        })();
    const mergedOrders = new Map<string, EnterpriseAgentOrderRecord>();

    [...PRESET_ENTERPRISE_AGENT_ORDERS, ...storedOrders].forEach(order => {
      mergedOrders.set(order.id, normalizeEnterpriseAgentOrder(order));
    });

    return Array.from(mergedOrders.values());
  } catch {
    return PRESET_ENTERPRISE_AGENT_ORDERS.map(normalizeEnterpriseAgentOrder);
  }
};

/**
 * 将 AI 专家商品订单写入本地存储。
 */
export const saveEnterpriseAgentOrders = (orders: EnterpriseAgentOrderRecord[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ENTERPRISE_AGENT_ORDER_STORAGE_KEY,
    JSON.stringify(orders.map(normalizeEnterpriseAgentOrder)),
  );
};
