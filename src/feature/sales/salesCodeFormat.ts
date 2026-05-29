export interface ParsedSalesLeadCode {
  fullCode: string;
  memberCode: string;
  randomCode: string;
  tenantMainCode: string;
}

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
