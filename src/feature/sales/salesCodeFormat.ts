export interface ParsedSalesLeadCode {
  fullCode: string;
  memberCode: string;
  randomCode: string;
  tenantMainCode: string;
}

const TENANT_MAIN_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const MEMBER_CODE_PATTERN = /^\d{4}$/;
const RANDOM_CODE_PATTERN = /^\d{6}$/;

export const parseSalesLeadCode = (
  contractCode: string | undefined,
): ParsedSalesLeadCode | null => {
  const parts = contractCode
    ?.trim()
    .toUpperCase()
    .split("-")
    .map(part => part.trim())
    .filter(Boolean);

  if (!parts || parts.length !== 3) {
    return null;
  }

  if (
    !TENANT_MAIN_CODE_PATTERN.test(parts[0]) ||
    !MEMBER_CODE_PATTERN.test(parts[1]) ||
    !RANDOM_CODE_PATTERN.test(parts[2])
  ) {
    return null;
  }

  return {
    fullCode: parts.join("-"),
    tenantMainCode: parts[0],
    memberCode: parts[1],
    randomCode: parts[2],
  };
};

export const resolveMainCodeFromContractInput = (contractCode: string | undefined): string => {
  const salesLeadCode = parseSalesLeadCode(contractCode);

  return salesLeadCode?.tenantMainCode ?? contractCode?.trim().toUpperCase() ?? "";
};
