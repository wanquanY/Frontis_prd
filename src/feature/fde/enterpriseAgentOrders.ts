/**
 * 企业侧 AI 专家订单在本地原型中的持久化 key。
 */
export const ENTERPRISE_AGENT_ORDER_STORAGE_KEY = "frontis.enterprise.agent.orders";

export type EnterpriseAgentOrderType = "trial" | "purchase";
export type EnterpriseAgentPaymentMethod = "bankTransfer" | "offlineContract";
export type EnterpriseAgentOrderStatus =
  | "awaitingReceipt"
  | "reviewing"
  | "awaitingActivation"
  | "active"
  | "rejected";
export type EnterpriseAgentReceiptStatus =
  | "notRequired"
  | "notSubmitted"
  | "submitted"
  | "confirmed";

/**
 * 企业侧 AI 专家订单记录。
 */
export interface EnterpriseAgentOrderRecord {
  id: string;
  agentId: number;
  orderNo: string;
  orderType: EnterpriseAgentOrderType;
  status: EnterpriseAgentOrderStatus;
  paymentMethod?: EnterpriseAgentPaymentMethod;
  companyName: string;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  priceLabel: string;
  remark?: string;
  receiptStatus: EnterpriseAgentReceiptStatus;
  receiptFileName?: string;
  receiptSubmittedAt?: string;
  reviewNote?: string;
  expiresAt?: string;
}

const normalizeEnterpriseAgentOrder = (
  order: EnterpriseAgentOrderRecord,
): EnterpriseAgentOrderRecord => {
  if (order.orderType === "trial") {
    return {
      ...order,
      paymentMethod: undefined,
      receiptStatus: "notRequired",
      receiptFileName: undefined,
      receiptSubmittedAt: undefined,
    };
  }

  if (order.status === "awaitingReceipt") {
    return {
      ...order,
      paymentMethod: "bankTransfer",
      receiptStatus: "notSubmitted",
      receiptFileName: undefined,
      receiptSubmittedAt: undefined,
    };
  }

  if (order.status === "reviewing") {
    return {
      ...order,
      paymentMethod: "bankTransfer",
      receiptStatus: "submitted",
    };
  }

  if (order.status === "awaitingActivation" || order.status === "active") {
    return {
      ...order,
      paymentMethod: "bankTransfer",
      receiptStatus: "confirmed",
    };
  }

  return {
    ...order,
    paymentMethod: "bankTransfer",
  };
};

/**
 * 从本地存储读取企业 AI 专家订单。
 */
export const loadEnterpriseAgentOrders = (): EnterpriseAgentOrderRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(ENTERPRISE_AGENT_ORDER_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(
        (item): item is EnterpriseAgentOrderRecord =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "agentId" in item &&
          "orderNo" in item &&
          "status" in item,
      )
      .map(normalizeEnterpriseAgentOrder);
  } catch {
    return [];
  }
};

/**
 * 将企业 AI 专家订单写入本地存储。
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
