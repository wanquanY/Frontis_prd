import { getMockSalesChannelContractCodes } from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodePriceVersion,
} from "@/feature/subscription/types";

import {
  loadSalesLeadCodes,
  loadSalesMemberCodes,
  saveSalesLeadCodes,
  saveSalesMemberCodes,
} from "./salesStorage";
import { addSalesMinutes, formatSalesDateTime, parseSalesDateTime } from "./salesDateFormat";
import { parseSalesLeadCode, resolveMainCodeFromContractInput } from "./salesCodeFormat";
import type { SalesLeadCode, SalesMemberCode, SalesMemberCodeInput } from "./types";

const MEMBER_CODE_LENGTH = 4;
const RANDOM_CODE_LENGTH = 6;
const SALES_LEAD_CODE_VALIDITY_MINUTES = 10;

export interface SalesChannelRechargeRecord {
  codeQuota: number;
  createdAt: string;
  id: string;
  quantity: number;
  title: string;
  unitPriceAmount: number;
}

const normalizeCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const createRandomNumericCode = (length: number): string => {
  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += String(Math.floor(Math.random() * 10));
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

export const getSalesLeadCodesByChannel = (tenantMainCode: string): SalesLeadCode[] => {
  const channelCode =
    getMockSalesChannelContractCodes().find(item => item.code === tenantMainCode) ?? null;
  const storedCodes = loadSalesLeadCodes().filter(item => item.tenantMainCode === tenantMainCode);
  const mockCodes = getMergedSalesMemberCodes()
    .filter(item => item.tenantMainCode === tenantMainCode)
    .flatMap(getMockSalesLeadCodesForMember);
  const channelMockCodes = getMockSalesLeadCodesForMember(
    channelCode?.salesMemberId && channelCode.salesMemberName
      ? createMockSalesMemberCodeFromChannel(channelCode)
      : null,
  );

  return [...storedCodes, ...mockCodes, ...channelMockCodes]
    .map(normalizeSalesLeadCode)
    .filter(
      (item, index, codes) => codes.findIndex(code => code.fullCode === item.fullCode) === index,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const getOccupiedSalesLeadCodeCount = (tenantMainCode: string): number =>
  getSalesLeadCodesByChannel(tenantMainCode)
    .filter(item => item.status !== "invalid")
    .reduce((total, item) => total + Math.max(item.seatCount ?? 1, 1), 0);

export const getRedeemedSalesLeadCodeCount = (tenantMainCode: string): number =>
  getSalesLeadCodesByChannel(tenantMainCode)
    .filter(item => item.status === "used")
    .reduce((total, item) => total + Math.max(item.seatCount ?? 1, 1), 0);

const getRechargeRecordTitle = (
  operationLabel: MockSalesChannelContractCodePriceVersion["operationLabel"],
): string => {
  if (operationLabel === "appendQuota") {
    return "分配席位";
  }

  if (operationLabel === "updateUnitPrice") {
    return "优惠调整";
  }

  return "首次分配";
};

export const getSalesChannelRechargeRecords = (
  contractCode: MockSalesChannelContractCode | null,
): SalesChannelRechargeRecord[] => {
  if (!contractCode) {
    return [];
  }

  let previousQuota = 0;

  return contractCode.priceVersions
    .map(version => {
      const quantity = Math.max(version.codeQuota - previousQuota, 0);
      previousQuota = version.codeQuota;

      return {
        id: version.id,
        title: getRechargeRecordTitle(version.operationLabel),
        quantity,
        codeQuota: version.codeQuota,
        unitPriceAmount: version.unitPriceAmount,
        createdAt: version.createdAt,
      };
    })
    .filter(record => record.quantity > 0 || record.title === "优惠调整")
    .reverse();
};

const getExistingMemberCodes = (): Set<string> =>
  new Set(loadSalesMemberCodes().map(item => item.memberCode));

const createUniqueMemberCode = (): string => {
  const existingCodes = getExistingMemberCodes();
  let nextCode = "";

  do {
    nextCode = createRandomNumericCode(MEMBER_CODE_LENGTH);
  } while (existingCodes.has(nextCode));

  return nextCode;
};

const createPresetMemberCode = (contractCode: MockSalesChannelContractCode): string => {
  const seed = `${contractCode.tenantId ?? ""}-${contractCode.salesMemberId ?? ""}`;
  const hash = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);

  return String(hash % 10000).padStart(MEMBER_CODE_LENGTH, "0");
};

function createMockSalesMemberCodeFromChannel(
  contractCode: MockSalesChannelContractCode,
): SalesMemberCode {
  const memberId = contractCode.salesMemberId || `${contractCode.code}-sales-member`;

  return {
    id: `sales-member-${contractCode.tenantId ?? contractCode.code}-${memberId}`,
    tenantId: contractCode.tenantId ?? "",
    tenantName: contractCode.tenantName ?? contractCode.channelName,
    tenantMainCode: contractCode.code,
    memberId,
    memberName: contractCode.salesMemberName || contractCode.ownerName,
    memberCode: createPresetMemberCode(contractCode),
    status: "active",
    createdAt: "预置",
    updatedAt: "预置",
  };
}

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

const resolveActiveTenantMainCode = (tenantId: string): string | null =>
  getMockSalesChannelContractCodes().find(
    item => item.tenantId === tenantId && item.status === "active",
  )?.code ?? null;

const normalizeStoredSalesMemberCode = (code: SalesMemberCode): SalesMemberCode => ({
  ...code,
  tenantMainCode: resolveActiveTenantMainCode(code.tenantId) ?? code.tenantMainCode,
});

const dedupeSalesMemberCodes = (codes: SalesMemberCode[]): SalesMemberCode[] => {
  const dedupedCodes = new Map<string, SalesMemberCode>();

  codes.forEach(code => {
    const key = `${code.tenantId}:${code.memberName}:${code.memberCode}`;
    dedupedCodes.set(key, code);
  });

  return Array.from(dedupedCodes.values());
};

const getMergedSalesMemberCodes = (): SalesMemberCode[] => {
  const storedCodes = loadSalesMemberCodes().map(normalizeStoredSalesMemberCode);
  const storedKeys = new Set(storedCodes.map(item => `${item.tenantId}:${item.memberId}`));

  return dedupeSalesMemberCodes([
    ...storedCodes,
    ...getPresetSalesMemberCodes().filter(
      item => !storedKeys.has(`${item.tenantId}:${item.memberId}`),
    ),
  ]);
};

const createUniqueLeadCode = (
  tenantMainCode: string,
  memberCode: string,
): Pick<SalesLeadCode, "fullCode" | "randomCode"> => {
  const existingCodes = new Set(loadSalesLeadCodes().map(item => item.fullCode));
  let randomCode = "";
  let fullCode = "";

  do {
    randomCode = createRandomNumericCode(RANDOM_CODE_LENGTH);
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
    buildMockSalesLeadCode(memberCode, "897654", {
      status: "used",
      customerTenantName: "杭州云织科技有限公司",
      seatCount: 18,
      amount: 5382,
      createdAt: "2026-05-29 09:18:00",
      usedAt: "2026-05-29 09:24:00",
      orderNo: "SUB-2605281002",
    }),
    buildMockSalesLeadCode(memberCode, "438912", {
      status: "used",
      customerTenantName: "宁波橙界商贸有限公司",
      seatCount: 12,
      amount: 3588,
      createdAt: "2026-05-28 16:45:00",
      usedAt: "2026-05-28 16:51:00",
      orderNo: "SUB-2605271720",
    }),
    buildMockSalesLeadCode(memberCode, "560183", {
      status: "unused",
      seatCount: 10,
      createdAt: formatSalesDateTime(),
      expiredAt: addSalesMinutes(formatSalesDateTime(), SALES_LEAD_CODE_VALIDITY_MINUTES),
    }),
    buildMockSalesLeadCode(memberCode, "726045", {
      status: "used",
      customerTenantName: "苏州青野智能科技有限公司",
      seatCount: 25,
      amount: 7475,
      createdAt: "2026-05-26 14:08:00",
      usedAt: "2026-05-26 14:16:00",
      orderNo: "SUB-2605261533",
    }),
    buildMockSalesLeadCode(memberCode, "119872", {
      status: "unused",
      seatCount: 8,
      createdAt: "2026-05-25 18:26:00",
    }),
    buildMockSalesLeadCode(memberCode, "304689", {
      status: "invalid",
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
  seatCount = 1,
): {
  createdCode: SalesLeadCode | null;
  codes: SalesLeadCode[];
  message?: string;
  success: boolean;
} => {
  const tenantMainContractCode = resolveTenantMainContractCode(memberCode.tenantId);
  const normalizedSeatCount = Math.max(Math.floor(seatCount), 1);

  if (!tenantMainContractCode || tenantMainContractCode.status !== "active") {
    return {
      createdCode: null,
      codes: getSalesLeadCodesForUser(memberCode.tenantId, memberCode.memberId),
      message: "当前租户没有可用渠道码。",
      success: false,
    };
  }

  if (
    getOccupiedSalesLeadCodeCount(memberCode.tenantMainCode) + normalizedSeatCount >
    tenantMainContractCode.codeQuota
  ) {
    return {
      createdCode: null,
      codes: getSalesLeadCodesForUser(memberCode.tenantId, memberCode.memberId),
      message: "当前渠道剩余席位不足。",
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
    seatCount: normalizedSeatCount,
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
