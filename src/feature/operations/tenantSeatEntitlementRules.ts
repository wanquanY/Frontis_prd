import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantEntitlementGrantItem,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import type { MockSubscriptionValidityUnit } from "@/feature/subscription/types";

const LONG_TERM_EXPIRES_AT = "长期有效";

const parseSeatExpiresAt = (value?: string): Dayjs | null => {
  const normalizedValue = value?.trim();

  if (!normalizedValue || normalizedValue === LONG_TERM_EXPIRES_AT) {
    return null;
  }

  const parsedDate = dayjs(normalizedValue.slice(0, 10));

  return parsedDate.isValid() ? parsedDate.startOf("day") : null;
};

const formatSeatExpiresAt = (value: Dayjs): string => value.format("YYYY-MM-DD");

const getActiveSeatExpiryCandidates = (snapshot?: MockTenantManagementSnapshot | null): Dayjs[] => {
  if (!snapshot) {
    return [];
  }

  const grantExpiresAtValues = (snapshot.entitlementGrants ?? [])
    .filter(item => item.kind === "seats" && item.status === "active")
    .flatMap(item => [item.expiresAt, item.afterExpiresAt]);

  return [snapshot.planExpiresAt, ...grantExpiresAtValues]
    .map(parseSeatExpiresAt)
    .filter((item): item is Dayjs => Boolean(item));
};

export const getLatestTenantActiveSeatExpiresAt = (
  snapshot?: MockTenantManagementSnapshot | null,
  referenceDate: Dayjs = dayjs(),
): string | null => {
  const today = referenceDate.startOf("day");
  const latestActiveExpiry = getActiveSeatExpiryCandidates(snapshot)
    .filter(item => !item.isBefore(today, "day"))
    .sort((left, right) => right.valueOf() - left.valueOf())[0];

  return latestActiveExpiry ? formatSeatExpiresAt(latestActiveExpiry) : null;
};

export const addTenantSeatPackageValidity = (
  baseDate: string,
  validityCount: number,
  validityUnit: MockSubscriptionValidityUnit,
): string => {
  const parsedBaseDate = parseSeatExpiresAt(baseDate) ?? dayjs().startOf("day");

  return formatSeatExpiresAt(parsedBaseDate.add(Math.max(validityCount, 1), validityUnit));
};

export const getTenantSeatGrantKindLabel = (grant: MockTenantEntitlementGrantItem): string => {
  if (grant.kind === "points") {
    return "积分包";
  }

  return grant.seatAction === "renewal" ? "席位续约" : "席位分配";
};

export const getTenantSeatGrantContent = (grant: MockTenantEntitlementGrantItem): string => {
  if (grant.kind === "points") {
    return `${(grant.points ?? 0).toLocaleString("zh-CN")} 积分`;
  }

  const giftPoints =
    grant.giftPoints && grant.giftPoints > 0 ? ` · 赠送 ${grant.giftPoints} 积分` : "";

  if (grant.seatAction === "renewal") {
    return `${grant.seatCount ?? 0} 个席位 · ${grant.beforeExpiresAt ?? "-"} 续约至 ${
      grant.afterExpiresAt ?? grant.expiresAt ?? "-"
    }${giftPoints}`;
  }

  return `${grant.seatCount ?? 0} 个席位 · 到期 ${grant.expiresAt ?? "-"}${giftPoints}`;
};

export const getTenantEntitlementRevokeBlockReason = (
  snapshot: MockTenantManagementSnapshot | null,
  grant: MockTenantEntitlementGrantItem,
): string | null => {
  if (!snapshot) {
    return "缺少租户权益数据。";
  }

  if (grant.status === "revoked") {
    return "该发放记录已撤销。";
  }

  if (grant.kind === "points") {
    const revokePoints = Math.max(Math.floor(grant.points ?? 0), 0);

    return snapshot.pointsBalance >= revokePoints ? null : "当前积分余额不足，无法撤销该积分包。";
  }

  if (grant.seatAction === "renewal") {
    return "席位续约记录只延长到期时间，不扣减席位，不在发放撤销范围内。";
  }

  const revokeSeats = Math.max(Math.floor(grant.seatCount ?? 0), 0);
  const giftPoints = Math.max(Math.floor(grant.giftPoints ?? 0), 0);

  if (snapshot.totalSeats - revokeSeats < snapshot.usedSeats) {
    return "席位已被占用，无法撤销该席位包。";
  }

  if (giftPoints > 0 && snapshot.pointsBalance < giftPoints) {
    return "席位包赠送积分已被消耗，无法撤销该席位包。";
  }

  return null;
};
