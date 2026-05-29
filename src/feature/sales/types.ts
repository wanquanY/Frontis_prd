export type SalesMemberCodeStatus = "active" | "inactive";

export type SalesLeadCodeStatus = "unused" | "effective" | "expired";

export interface SalesMemberCode {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantMainCode: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  status: SalesMemberCodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SalesLeadCode {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantMainCode: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  randomCode: string;
  fullCode: string;
  status: SalesLeadCodeStatus;
  createdAt: string;
  effectiveAt?: string;
  expiredAt?: string;
  orderNo?: string;
  customerTenantName?: string;
  amount?: number;
  seatCount?: number;
}

export interface SalesMemberCodeInput {
  memberId: string;
  memberName: string;
  memberCode?: string;
  status: SalesMemberCodeStatus;
}
