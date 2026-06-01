import { getMockSalesChannelContractCodes } from "@/feature/subscription/mockSubscriptionPlans";
import type { MockSalesChannelContractCode } from "@/feature/subscription/types";

import {
  loadSalesLeadCodes,
  loadSalesMemberCodes,
  saveSalesLeadCodes,
  saveSalesMemberCodes,
} from "./salesStorage";
import { addSalesMinutes, formatSalesDateTime, parseSalesDateTime } from "./salesDateFormat";
import { parseSalesLeadCode, resolveMainCodeFromContractInput } from "./salesCodeFormat";
import type { SalesLeadCode, SalesMemberCode, SalesMemberCodeInput } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MEMBER_CODE_LENGTH = 6;
const RANDOM_CODE_LENGTH = 8;
const SALES_LEAD_CODE_VALIDITY_MINUTES = 10;

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
  usedAt: normalizeDateTimeTimestamp(code.usedAt ?? (code as { effectiveAt?: string }).effectiveAt),
  expiredAt: normalizeDateTimeTimestamp(code.expiredAt),
});

const normalizeSalesLeadCode = (code: SalesLeadCode): SalesLeadCode => {
  const normalizedCode = normalizeSalesLeadCodeTime(code);
  const normalizedStatus =
    normalizedCode.status === ("effective" as SalesLeadCode["status"])
      ? "used"
      : normalizedCode.status === ("expired" as SalesLeadCode["status"])
        ? "invalid"
        : normalizedCode.status;
  const expiredAt =
    normalizedCode.expiredAt ??
    addSalesMinutes(normalizedCode.createdAt, SALES_LEAD_CODE_VALIDITY_MINUTES);
  const expiredDate = parseSalesDateTime(expiredAt);
  const isExpiredUnused =
    normalizedStatus === "unused" && Boolean(expiredDate && expiredDate.getTime() <= Date.now());

  return {
    ...normalizedCode,
    status: isExpiredUnused ? "invalid" : normalizedStatus,
    expiredAt,
  };
};

const getOccupiedSalesLeadCodeCount = (tenantMainCode: string): number =>
  loadSalesLeadCodes()
    .map(normalizeSalesLeadCode)
    .filter(item => item.tenantMainCode === tenantMainCode && item.status !== "invalid").length;

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
      | "expiredAt"
      | "orderNo"
      | "seatCount"
      | "status"
      | "usedAt"
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
    expiredAt: "2026-05-29 09:28:00",
    ...overrides,
  };
};

const getMockSalesLeadCodesForMember = (memberCode: SalesMemberCode | null): SalesLeadCode[] => {
  if (!memberCode) {
    return [];
  }

  return [
    buildMockSalesLeadCode(memberCode, "Q8M2K7ND", {
      status: "used",
      customerTenantName: "杭州云织科技有限公司",
      seatCount: 18,
      amount: 5382,
      createdAt: "2026-05-29 09:18:00",
      usedAt: "2026-05-29 09:24:00",
      orderNo: "SUB-2605281002",
    }),
    buildMockSalesLeadCode(memberCode, "TX5P9R2A", {
      status: "used",
      customerTenantName: "宁波橙界商贸有限公司",
      seatCount: 12,
      amount: 3588,
      createdAt: "2026-05-28 16:45:00",
      usedAt: "2026-05-28 16:51:00",
      orderNo: "SUB-2605271720",
    }),
    buildMockSalesLeadCode(memberCode, "HN7C4V6K", {
      status: "unused",
      customerTenantName: "上海岚屿品牌管理有限公司",
      seatCount: 10,
      createdAt: formatSalesDateTime(),
      expiredAt: addSalesMinutes(formatSalesDateTime(), SALES_LEAD_CODE_VALIDITY_MINUTES),
    }),
    buildMockSalesLeadCode(memberCode, "R6JQ8W3L", {
      status: "used",
      customerTenantName: "苏州青野智能科技有限公司",
      seatCount: 25,
      amount: 7475,
      createdAt: "2026-05-26 14:08:00",
      usedAt: "2026-05-26 14:16:00",
      orderNo: "SUB-2605261533",
    }),
    buildMockSalesLeadCode(memberCode, "B4N8S2YE", {
      status: "unused",
      customerTenantName: "合肥新域供应链有限公司",
      seatCount: 8,
      createdAt: "2026-05-25 18:26:00",
    }),
    buildMockSalesLeadCode(memberCode, "M9XK2T4P", {
      status: "invalid",
      customerTenantName: "南京晟源数字科技有限公司",
      seatCount: 15,
      createdAt: "2026-05-21 13:50:00",
      expiredAt: "2026-05-21 14:00:00",
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
  createdCode: SalesLeadCode | null;
  codes: SalesLeadCode[];
  message?: string;
  success: boolean;
} => {
  const tenantMainContractCode = resolveTenantMainContractCode(memberCode.tenantId);

  if (!tenantMainContractCode || tenantMainContractCode.status !== "active") {
    return {
      createdCode: null,
      codes: getSalesLeadCodesForUser(memberCode.tenantId, memberCode.memberId),
      message: "当前租户没有可用渠道码。",
      success: false,
    };
  }

  if (
    getOccupiedSalesLeadCodeCount(memberCode.tenantMainCode) >= tenantMainContractCode.codeQuota
  ) {
    return {
      createdCode: null,
      codes: getSalesLeadCodesForUser(memberCode.tenantId, memberCode.memberId),
      message: "当前渠道可使用渠道码数量已用完。",
      success: false,
    };
  }

  const { fullCode, randomCode } = createUniqueLeadCode(
    memberCode.tenantMainCode,
    memberCode.memberCode,
  );
  const createdAt = formatSalesDateTime();
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
    createdAt,
    expiredAt: addSalesMinutes(createdAt, SALES_LEAD_CODE_VALIDITY_MINUTES),
  };
  const codes = [createdCode, ...loadSalesLeadCodes()];

  saveSalesLeadCodes(codes);

  return { createdCode, codes, success: true };
};

export const getSalesLeadCodesForUser = (
  tenantId: string | undefined,
  memberId: string | undefined,
): SalesLeadCode[] =>
  [
    ...loadSalesLeadCodes()
      .filter(item => item.tenantId === tenantId && item.memberId === memberId)
      .map(normalizeSalesLeadCode),
    ...getMockSalesLeadCodesForMember(getSalesMemberCodeForUser(tenantId, memberId)),
  ]
    .map(normalizeSalesLeadCode)
    .filter(
      (item, index, codes) => codes.findIndex(code => code.fullCode === item.fullCode) === index,
    );
