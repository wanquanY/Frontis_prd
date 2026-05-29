import { getMockSalesChannelContractCodes } from "@/feature/subscription/mockSubscriptionPlans";
import type { MockSalesChannelContractCode } from "@/feature/subscription/types";

import {
  loadSalesLeadCodes,
  loadSalesMemberCodes,
  saveSalesLeadCodes,
  saveSalesMemberCodes,
} from "./salesStorage";
import { formatSalesDateTime } from "./salesDateFormat";
import { parseSalesLeadCode, resolveMainCodeFromContractInput } from "./salesCodeFormat";
import type { SalesLeadCode, SalesMemberCode, SalesMemberCodeInput } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MEMBER_CODE_LENGTH = 6;
const RANDOM_CODE_LENGTH = 8;

const normalizeCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const createRandomCode = (length: number): string => {
  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }

  return result;
};

const isDateTimeTimestamp = (value: string | undefined): boolean =>
  Boolean(value && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value));

const normalizeDateTimeTimestamp = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  return isDateTimeTimestamp(value) ? value : formatSalesDateTime();
};

const normalizeSalesLeadCodeTime = (code: SalesLeadCode): SalesLeadCode => ({
  ...code,
  createdAt: normalizeDateTimeTimestamp(code.createdAt) ?? formatSalesDateTime(),
  effectiveAt: normalizeDateTimeTimestamp(code.effectiveAt),
  expiredAt: normalizeDateTimeTimestamp(code.expiredAt),
});

const getExistingMemberCodes = (): Set<string> =>
  new Set(loadSalesMemberCodes().map(item => item.memberCode));

const createUniqueMemberCode = (): string => {
  const existingCodes = getExistingMemberCodes();
  let nextCode = "";

  do {
    nextCode = createRandomCode(MEMBER_CODE_LENGTH);
  } while (existingCodes.has(nextCode));

  return nextCode;
};

const createPresetMemberCode = (contractCode: MockSalesChannelContractCode): string => {
  const seed = `${contractCode.tenantId ?? ""}-${contractCode.salesMemberId ?? ""}`;
  const hash = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);

  return `DG${String(hash % 10000).padStart(4, "0")}`;
};

const getPresetSalesMemberCodes = (): SalesMemberCode[] =>
  getMockSalesChannelContractCodes()
    .filter(
      item =>
        item.status === "active" &&
        Boolean(item.tenantId) &&
        Boolean(item.tenantName) &&
        Boolean(item.salesMemberId) &&
        Boolean(item.salesMemberName),
    )
    .map(item => ({
      id: `sales-member-${item.tenantId}-${item.salesMemberId}`,
      tenantId: item.tenantId ?? "",
      tenantName: item.tenantName ?? "",
      tenantMainCode: item.code,
      memberId: item.salesMemberId ?? "",
      memberName: item.salesMemberName ?? "",
      memberCode: createPresetMemberCode(item),
      status: "active",
      createdAt: "预置",
      updatedAt: "预置",
    }));

const getMergedSalesMemberCodes = (): SalesMemberCode[] => {
  const storedCodes = loadSalesMemberCodes();
  const storedKeys = new Set(storedCodes.map(item => `${item.tenantId}:${item.memberId}`));

  return [
    ...storedCodes,
    ...getPresetSalesMemberCodes().filter(
      item => !storedKeys.has(`${item.tenantId}:${item.memberId}`),
    ),
  ];
};

const createUniqueLeadCode = (
  tenantMainCode: string,
  memberCode: string,
): Pick<SalesLeadCode, "fullCode" | "randomCode"> => {
  const existingCodes = new Set(loadSalesLeadCodes().map(item => item.fullCode));
  let randomCode = "";
  let fullCode = "";

  do {
    randomCode = createRandomCode(RANDOM_CODE_LENGTH);
    fullCode = `${tenantMainCode}-${memberCode}-${randomCode}`;
  } while (existingCodes.has(fullCode));

  return { fullCode, randomCode };
};

const buildMockSalesLeadCode = (
  memberCode: SalesMemberCode,
  suffix: string,
  overrides: Partial<
    Pick<
      SalesLeadCode,
      | "amount"
      | "createdAt"
      | "customerTenantName"
      | "effectiveAt"
      | "expiredAt"
      | "orderNo"
      | "seatCount"
      | "status"
    >
  >,
): SalesLeadCode => {
  const randomCode = normalizeCode(suffix);

  return {
    id: `mock-sales-lead-${memberCode.tenantId}-${memberCode.memberId}-${randomCode}`,
    tenantId: memberCode.tenantId,
    tenantName: memberCode.tenantName,
    tenantMainCode: memberCode.tenantMainCode,
    memberId: memberCode.memberId,
    memberName: memberCode.memberName,
    memberCode: memberCode.memberCode,
    randomCode,
    fullCode: `${memberCode.tenantMainCode}-${memberCode.memberCode}-${randomCode}`,
    status: "unused",
    createdAt: "2026-05-29 09:18:00",
    ...overrides,
  };
};

const getMockSalesLeadCodesForMember = (memberCode: SalesMemberCode | null): SalesLeadCode[] => {
  if (!memberCode) {
    return [];
  }

  return [
    buildMockSalesLeadCode(memberCode, "Q8M2K7ND", {
      status: "effective",
      customerTenantName: "杭州云织科技有限公司",
      seatCount: 18,
      amount: 5382,
      createdAt: "2026-05-29 09:18:00",
      effectiveAt: "2026-05-29 10:02:00",
      orderNo: "SUB-2605281002",
    }),
    buildMockSalesLeadCode(memberCode, "TX5P9R2A", {
      status: "effective",
      customerTenantName: "宁波橙界商贸有限公司",
      seatCount: 12,
      amount: 3588,
      createdAt: "2026-05-28 16:45:00",
      effectiveAt: "2026-05-28 17:20:00",
      orderNo: "SUB-2605271720",
    }),
    buildMockSalesLeadCode(memberCode, "HN7C4V6K", {
      status: "unused",
      customerTenantName: "上海岚屿品牌管理有限公司",
      seatCount: 10,
      createdAt: "2026-05-28 11:12:00",
    }),
    buildMockSalesLeadCode(memberCode, "R6JQ8W3L", {
      status: "effective",
      customerTenantName: "苏州青野智能科技有限公司",
      seatCount: 25,
      amount: 7475,
      createdAt: "2026-05-26 14:08:00",
      effectiveAt: "2026-05-26 15:33:00",
      orderNo: "SUB-2605261533",
    }),
    buildMockSalesLeadCode(memberCode, "B4N8S2YE", {
      status: "unused",
      customerTenantName: "合肥新域供应链有限公司",
      seatCount: 8,
      createdAt: "2026-05-25 18:26:00",
    }),
    buildMockSalesLeadCode(memberCode, "M9XK2T4P", {
      status: "expired",
      customerTenantName: "南京晟源数字科技有限公司",
      seatCount: 15,
      createdAt: "2026-05-21 13:50:00",
      expiredAt: "2026-05-28 13:50:00",
    }),
  ];
};

export { parseSalesLeadCode, resolveMainCodeFromContractInput };

export const resolveTenantMainContractCode = (
  tenantId: string | undefined,
): MockSalesChannelContractCode | null => {
  if (!tenantId) {
    return null;
  }

  return (
    getMockSalesChannelContractCodes().find(
      item => item.tenantId === tenantId && item.status === "active",
    ) ?? null
  );
};

export const getSalesMemberCodesByTenant = (tenantId: string | undefined): SalesMemberCode[] =>
  getMergedSalesMemberCodes().filter(item => item.tenantId === tenantId);

export const getSalesMemberCodeForUser = (
  tenantId: string | undefined,
  memberId: string | undefined,
): SalesMemberCode | null =>
  getMergedSalesMemberCodes().find(
    item => item.tenantId === tenantId && item.memberId === memberId,
  ) ?? null;

export const upsertSalesMemberCode = (
  tenant: Pick<SalesMemberCode, "tenantId" | "tenantName" | "tenantMainCode">,
  input: SalesMemberCodeInput,
): SalesMemberCode[] => {
  const currentCodes = loadSalesMemberCodes();
  const existingCode = currentCodes.find(
    item => item.tenantId === tenant.tenantId && item.memberId === input.memberId,
  );
  const memberCode = normalizeCode(input.memberCode ?? existingCode?.memberCode ?? "");
  const nextMemberCode = memberCode || createUniqueMemberCode();
  const nextCode: SalesMemberCode = {
    id: existingCode?.id ?? `sales-member-${tenant.tenantId}-${input.memberId}`,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    tenantMainCode: tenant.tenantMainCode,
    memberId: input.memberId,
    memberName: input.memberName,
    memberCode: nextMemberCode,
    status: input.status,
    createdAt: existingCode?.createdAt ?? formatSalesDateTime(),
    updatedAt: formatSalesDateTime(),
  };
  const nextCodes = [
    ...currentCodes.filter(
      item => !(item.tenantId === tenant.tenantId && item.memberId === input.memberId),
    ),
    nextCode,
  ].sort((left, right) => left.memberName.localeCompare(right.memberName, "zh-CN"));

  saveSalesMemberCodes(nextCodes);

  return nextCodes;
};

export const generateSalesLeadCode = (
  memberCode: SalesMemberCode,
): {
  createdCode: SalesLeadCode;
  codes: SalesLeadCode[];
} => {
  const { fullCode, randomCode } = createUniqueLeadCode(
    memberCode.tenantMainCode,
    memberCode.memberCode,
  );
  const createdCode: SalesLeadCode = {
    id: `sales-lead-${Date.now()}`,
    tenantId: memberCode.tenantId,
    tenantName: memberCode.tenantName,
    tenantMainCode: memberCode.tenantMainCode,
    memberId: memberCode.memberId,
    memberName: memberCode.memberName,
    memberCode: memberCode.memberCode,
    randomCode,
    fullCode,
    status: "unused",
    createdAt: formatSalesDateTime(),
  };
  const codes = [createdCode, ...loadSalesLeadCodes()];

  saveSalesLeadCodes(codes);

  return { createdCode, codes };
};

export const getSalesLeadCodesForUser = (
  tenantId: string | undefined,
  memberId: string | undefined,
): SalesLeadCode[] =>
  [
    ...loadSalesLeadCodes()
      .filter(item => item.tenantId === tenantId && item.memberId === memberId)
      .map(normalizeSalesLeadCodeTime),
    ...getMockSalesLeadCodesForMember(getSalesMemberCodeForUser(tenantId, memberId)),
  ].filter(
    (item, index, codes) => codes.findIndex(code => code.fullCode === item.fullCode) === index,
  );
