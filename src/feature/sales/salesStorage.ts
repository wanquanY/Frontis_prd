import type { SalesLeadCode, SalesMemberCode } from "./types";

const SALES_MEMBER_CODES_STORAGE_KEY = "frontis.mock.sales.member-codes";
const SALES_LEAD_CODES_STORAGE_KEY = "frontis.mock.sales.lead-codes";

const readArray = <T>(storageKey: string): T[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
};

const writeArray = <T>(storageKey: string, values: T[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(values));
};

export const loadSalesMemberCodes = (): SalesMemberCode[] =>
  readArray<SalesMemberCode>(SALES_MEMBER_CODES_STORAGE_KEY).filter(
    item =>
      Boolean(item?.tenantId) &&
      Boolean(item.memberId) &&
      Boolean(item.memberCode) &&
      Boolean(item.tenantMainCode),
  );

export const saveSalesMemberCodes = (codes: SalesMemberCode[]): void => {
  writeArray(SALES_MEMBER_CODES_STORAGE_KEY, codes);
};

export const loadSalesLeadCodes = (): SalesLeadCode[] =>
  readArray<SalesLeadCode>(SALES_LEAD_CODES_STORAGE_KEY).filter(
    item => Boolean(item?.tenantId) && Boolean(item.fullCode) && Boolean(item.memberId),
  );

export const saveSalesLeadCodes = (codes: SalesLeadCode[]): void => {
  writeArray(SALES_LEAD_CODES_STORAGE_KEY, codes);
};

export const activateSalesLeadCode = (
  fullCode: string | undefined,
  activation: Pick<
    SalesLeadCode,
    "amount" | "customerTenantName" | "effectiveAt" | "orderNo" | "seatCount"
  >,
): SalesLeadCode | null => {
  const normalizedCode = fullCode?.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const currentCodes = loadSalesLeadCodes();
  let activatedCode: SalesLeadCode | null = null;
  const nextCodes = currentCodes.map(item => {
    if (item.fullCode !== normalizedCode) {
      return item;
    }

    activatedCode = {
      ...item,
      ...activation,
      status: "effective",
      expiredAt: undefined,
    };

    return activatedCode;
  });

  if (activatedCode) {
    saveSalesLeadCodes(nextCodes);
  }

  return activatedCode;
};
