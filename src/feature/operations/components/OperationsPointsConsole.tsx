import { useMemo, useState } from "react";

import { InputNumber, Switch } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import {
  formatOperationsCurrency,
  formatOperationsPoints,
} from "@/feature/operations/serviceMeteringUtils";
import type {
  OperationsPointsUsageRecord,
  OperationsReferralRecord,
  OperationsReferralStatus,
  OperationsRegistrationStrategy,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

interface OperationsPointsConsoleProps {
  registrationStrategy: OperationsRegistrationStrategy;
  pointsUsageRecords: OperationsPointsUsageRecord[];
  referralRecords: OperationsReferralRecord[];
  onUpdateRegistrationStrategy: (
    patch: Partial<
      Pick<
        OperationsRegistrationStrategy,
        | "defaultGiftPoints"
        | "pointsPerCny"
        | "minimumDeductPoints"
        | "roundingUnit"
        | "referralDailyRewardLimit"
        | "referralEnabled"
        | "referralInviteeRewardPoints"
        | "referralInviterRewardPoints"
        | "referralMonthlyRewardLimit"
      >
    >,
  ) => void;
}

type OperationsPointsTabKey = "rules" | "referral" | "reconciliation";
type OperationsPointsUsageRangeKey = "today" | "week" | "month" | "all";

interface OperationsCustomerUsageSummary {
  tenantName: string;
  latestOccurredAt: string;
  costAmount: number;
  marginAmount: number;
  points: number;
  recordCount: number;
  saleAmount: number;
  sourceLabels: string[];
  userCount: number;
}

const POINTS_TAB_OPTIONS: Array<{ key: OperationsPointsTabKey; label: string }> = [
  { key: "rules", label: "积分规则" },
  { key: "referral", label: "邀请奖励" },
  { key: "reconciliation", label: "消耗对账" },
];

const POINTS_USAGE_RANGE_OPTIONS: Array<{ key: OperationsPointsUsageRangeKey; label: string }> = [
  { key: "today", label: "今日" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "all", label: "全部" },
];

const MOCK_TODAY = dayjs("2026-04-24 12:00");

const SOURCE_TYPE_LABELS: Record<OperationsPointsUsageRecord["sourceType"], string> = {
  largeModel: "大模型",
  skill: "Skill",
  thirdPartyApi: "第三方接口",
};

const REFERRAL_STATUS_LABELS: Record<OperationsReferralStatus, string> = {
  rewarded: "已奖励",
  registered: "待发放",
  pending: "待生效",
  blocked: "已拦截",
};

const getReferralStatusClassName = (status: OperationsReferralStatus): string =>
  [
    adminStyles.consoleStatusTag,
    status === "rewarded" ? adminStyles.consoleStatusTagSuccess : "",
    status === "registered" ? adminStyles.consoleStatusTagWarning : "",
    status === "pending" ? adminStyles.consoleStatusTagPrimary : "",
    status === "blocked" ? adminStyles.consoleStatusTagDanger : "",
  ]
    .filter(Boolean)
    .join(" ");

const parseOperationsOccurredAt = (occurredAt: string): Dayjs => {
  const parsedValue = dayjs(occurredAt);

  return parsedValue.isValid() ? parsedValue : MOCK_TODAY;
};

const isUsageRecordInRange = (
  record: OperationsPointsUsageRecord,
  rangeKey: OperationsPointsUsageRangeKey,
): boolean => {
  if (rangeKey === "all") {
    return true;
  }

  const occurredAt = parseOperationsOccurredAt(record.occurredAt);

  if (rangeKey === "today") {
    return occurredAt.isSame(MOCK_TODAY, "day");
  }

  if (rangeKey === "month") {
    return occurredAt.isSame(MOCK_TODAY, "month");
  }

  return occurredAt.isSame(MOCK_TODAY, "week");
};

const summarizeUsageRecords = (
  records: OperationsPointsUsageRecord[],
): {
  costAmount: number;
  customerCount: number;
  marginAmount: number;
  points: number;
  recordCount: number;
  saleAmount: number;
} => {
  const customerNames = new Set(records.map(record => record.tenantName));

  return records.reduce(
    (summary, item) => ({
      ...summary,
      costAmount: summary.costAmount + item.costAmount,
      marginAmount: summary.marginAmount + item.marginAmount,
      points: summary.points + item.points,
      recordCount: summary.recordCount + 1,
      saleAmount: summary.saleAmount + item.saleAmount,
    }),
    {
      costAmount: 0,
      customerCount: customerNames.size,
      marginAmount: 0,
      points: 0,
      recordCount: 0,
      saleAmount: 0,
    },
  );
};

const summarizeReferralRecords = (
  records: OperationsReferralRecord[],
): {
  blockedCount: number;
  effectiveCount: number;
  pendingCount: number;
  rewardedPoints: number;
} =>
  records.reduce(
    (summary, record) => ({
      blockedCount: summary.blockedCount + (record.status === "blocked" ? 1 : 0),
      effectiveCount:
        summary.effectiveCount +
        (record.status === "rewarded" || record.status === "registered" ? 1 : 0),
      pendingCount: summary.pendingCount + (record.status === "pending" ? 1 : 0),
      rewardedPoints:
        summary.rewardedPoints + (record.status === "rewarded" ? record.rewardPoints : 0),
    }),
    {
      blockedCount: 0,
      effectiveCount: 0,
      pendingCount: 0,
      rewardedPoints: 0,
    },
  );

const buildCustomerUsageSummaries = (
  records: OperationsPointsUsageRecord[],
): OperationsCustomerUsageSummary[] => {
  const tenantRecordMap = records.reduce<Map<string, OperationsPointsUsageRecord[]>>(
    (recordMap, record) => {
      recordMap.set(record.tenantName, [...(recordMap.get(record.tenantName) ?? []), record]);

      return recordMap;
    },
    new Map<string, OperationsPointsUsageRecord[]>(),
  );

  return Array.from(tenantRecordMap.entries())
    .map(([tenantName, tenantRecords]) => {
      const sortedRecords = [...tenantRecords].sort(
        (leftRecord, rightRecord) =>
          parseOperationsOccurredAt(rightRecord.occurredAt).valueOf() -
          parseOperationsOccurredAt(leftRecord.occurredAt).valueOf(),
      );
      const sourceLabels = Array.from(
        new Set(tenantRecords.map(record => SOURCE_TYPE_LABELS[record.sourceType])),
      );
      const userCount = new Set(tenantRecords.map(record => record.userName)).size;

      return {
        tenantName,
        latestOccurredAt: sortedRecords[0]?.occurredAt ?? "-",
        costAmount: tenantRecords.reduce((sum, record) => sum + record.costAmount, 0),
        marginAmount: tenantRecords.reduce((sum, record) => sum + record.marginAmount, 0),
        points: tenantRecords.reduce((sum, record) => sum + record.points, 0),
        recordCount: tenantRecords.length,
        saleAmount: tenantRecords.reduce((sum, record) => sum + record.saleAmount, 0),
        sourceLabels,
        userCount,
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.points - leftSummary.points);
};

/**
 * 运营后台积分运营控制台，只负责积分规则、账户消耗和对账。
 */
export const OperationsPointsConsole = ({
  registrationStrategy,
  pointsUsageRecords,
  referralRecords,
  onUpdateRegistrationStrategy,
}: OperationsPointsConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<OperationsPointsTabKey>("rules");
  const [activeUsageRange, setActiveUsageRange] = useState<OperationsPointsUsageRangeKey>("month");
  const usageSummary = useMemo(
    () => summarizeUsageRecords(pointsUsageRecords),
    [pointsUsageRecords],
  );
  const filteredUsageRecords = useMemo(
    () => pointsUsageRecords.filter(record => isUsageRecordInRange(record, activeUsageRange)),
    [activeUsageRange, pointsUsageRecords],
  );
  const activeUsageSummary = useMemo(
    () => summarizeUsageRecords(filteredUsageRecords),
    [filteredUsageRecords],
  );
  const customerUsageSummaries = useMemo(
    () => buildCustomerUsageSummaries(filteredUsageRecords),
    [filteredUsageRecords],
  );
  const referralSummary = useMemo(
    () => summarizeReferralRecords(referralRecords),
    [referralRecords],
  );
  const activeUsageRangeLabel =
    POINTS_USAGE_RANGE_OPTIONS.find(item => item.key === activeUsageRange)?.label ?? "本月";

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>积分运营</h1>
          <p className={adminStyles.consoleSubtitle}>
            维护积分汇率、注册赠送和运行消耗对账；模型、接口的供给成本与计量单价在资源池配置。
          </p>
        </div>
      </header>

      <div className={adminStyles.consoleSummaryStrip}>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>积分汇率</span>
          <span className={adminStyles.consoleSummaryValue}>
            ¥1 = {registrationStrategy.pointsPerCny.toLocaleString("zh-CN")}
          </span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>注册送积分</span>
          <span className={adminStyles.consoleSummaryValue}>
            {registrationStrategy.defaultGiftPoints.toLocaleString("zh-CN")}
          </span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>邀请奖励</span>
          <span className={adminStyles.consoleSummaryValue}>
            {registrationStrategy.referralInviterRewardPoints.toLocaleString("zh-CN")}
          </span>
          <span className={adminStyles.consoleSummaryHint}>
            已发 {referralSummary.rewardedPoints.toLocaleString("zh-CN")} 积分
          </span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>消耗积分</span>
          <span className={adminStyles.consoleSummaryValue}>
            {usageSummary.points.toLocaleString("zh-CN")}
          </span>
          <span className={adminStyles.consoleSummaryHint}>
            销售 {formatOperationsCurrency(usageSummary.saleAmount)} / 毛利{" "}
            {formatOperationsCurrency(usageSummary.marginAmount)}
          </span>
        </div>
      </div>

      <div className={styles.detailTabBar}>
        {POINTS_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={`${styles.detailTabButton} ${
              activeTab === item.key ? styles.detailTabButtonActive : ""
            }`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "rules" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>积分规则</h2>
              <p className={adminStyles.consoleSectionDescription}>
                资源池先把模型 Tokens、Skill
                或第三方接口消耗换算成资源计量金额；积分运营只负责把计量金额折算为积分扣减。
              </p>
            </div>
          </div>

          <div className={adminStyles.consoleRows}>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>注册送积分</span>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                value={registrationStrategy.defaultGiftPoints}
                onChange={value =>
                  onUpdateRegistrationStrategy({ defaultGiftPoints: Number(value ?? 0) })
                }
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>积分汇率（¥1 可兑换积分）</span>
              <InputNumber
                min={1}
                className={styles.fullWidthInput}
                value={registrationStrategy.pointsPerCny}
                onChange={value =>
                  onUpdateRegistrationStrategy({ pointsPerCny: Number(value ?? 1) })
                }
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>最小扣减（积分）</span>
              <InputNumber
                min={1}
                className={styles.fullWidthInput}
                value={registrationStrategy.minimumDeductPoints}
                onChange={value =>
                  onUpdateRegistrationStrategy({ minimumDeductPoints: Number(value ?? 1) })
                }
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>取整单位（积分）</span>
              <InputNumber
                min={1}
                className={styles.fullWidthInput}
                value={registrationStrategy.roundingUnit}
                onChange={value =>
                  onUpdateRegistrationStrategy({ roundingUnit: Number(value ?? 1) })
                }
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>边界说明</span>
              <span className={adminStyles.consoleInfoValue}>
                积分包购买是订单，进入订单中心；运行时
                Tokens、Skill、第三方接口扣减是消耗流水，不作为商品订单。
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "referral" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>邀请奖励</h2>
              <p className={adminStyles.consoleSectionDescription}>
                配置用户邀请好友自注册后的积分奖励，邀请关系只用于增长归因，不等同于租户成员邀请。
              </p>
            </div>
          </div>

          <div className={adminStyles.consoleSummaryStrip}>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>活动状态</span>
              <span className={adminStyles.consoleSummaryValue}>
                {registrationStrategy.referralEnabled ? "启用" : "停用"}
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>有效邀请</span>
              <span className={adminStyles.consoleSummaryValue}>
                {referralSummary.effectiveCount} 个
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>待生效</span>
              <span className={adminStyles.consoleSummaryValue}>
                {referralSummary.pendingCount} 个
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>已拦截</span>
              <span className={adminStyles.consoleSummaryValue}>
                {referralSummary.blockedCount} 个
              </span>
            </div>
          </div>

          <div className={adminStyles.consoleRows}>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>邀请奖励活动</span>
              <Switch
                className={styles.compactSwitch}
                checked={registrationStrategy.referralEnabled}
                checkedChildren="启用"
                unCheckedChildren="停用"
                onChange={checked => onUpdateRegistrationStrategy({ referralEnabled: checked })}
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>邀请人奖励积分</span>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                value={registrationStrategy.referralInviterRewardPoints}
                onChange={value =>
                  onUpdateRegistrationStrategy({ referralInviterRewardPoints: Number(value ?? 0) })
                }
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>被邀请人额外奖励</span>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                value={registrationStrategy.referralInviteeRewardPoints}
                onChange={value =>
                  onUpdateRegistrationStrategy({ referralInviteeRewardPoints: Number(value ?? 0) })
                }
              />
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>单邀请人每日可奖励人数</span>
              <div className={styles.inlineNumberControl}>
                <InputNumber
                  min={1}
                  className={styles.compactNumberInput}
                  value={registrationStrategy.referralDailyRewardLimit}
                  onChange={value =>
                    onUpdateRegistrationStrategy({ referralDailyRewardLimit: Number(value ?? 1) })
                  }
                />
                <span className={styles.inlineNumberUnit}>人 / 日</span>
              </div>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>单邀请人每月可奖励人数</span>
              <div className={styles.inlineNumberControl}>
                <InputNumber
                  min={1}
                  className={styles.compactNumberInput}
                  value={registrationStrategy.referralMonthlyRewardLimit}
                  onChange={value =>
                    onUpdateRegistrationStrategy({ referralMonthlyRewardLimit: Number(value ?? 1) })
                  }
                />
                <span className={styles.inlineNumberUnit}>人 / 月</span>
              </div>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>上限口径</span>
              <span className={adminStyles.consoleInfoValue}>
                按邀请人统计达到生效条件且可发奖励的被邀请人数；不限制用户复制链接、保存海报或分享次数。
              </span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>生效条件</span>
              <span className={adminStyles.consoleInfoValue}>
                被邀请人完成手机号注册并创建 1 席个人版租户后，系统发放邀请人奖励积分。
              </span>
            </div>
          </div>

          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>邀请人</th>
                  <th>被邀请人</th>
                  <th>来源</th>
                  <th>奖励积分</th>
                  <th>注册时间</th>
                  <th>发放时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {referralRecords.map(record => (
                  <tr key={record.id}>
                    <td>
                      <span className={adminStyles.consoleHtmlTableStrong}>
                        {record.inviterName}
                      </span>
                      <br />
                      <span className={adminStyles.consoleSidebarItemMeta}>
                        {record.inviterTenantName}
                      </span>
                    </td>
                    <td>
                      <span className={adminStyles.consoleHtmlTableStrong}>
                        {record.inviteeName}
                      </span>
                      <br />
                      <span className={adminStyles.consoleSidebarItemMeta}>
                        {record.inviteeTenantName} · {record.inviteePhoneMasked}
                      </span>
                    </td>
                    <td>{record.sourceLabel}</td>
                    <td>{formatOperationsPoints(record.rewardPoints)}</td>
                    <td>{record.registeredAt}</td>
                    <td>{record.rewardedAt ?? "-"}</td>
                    <td>
                      <span className={getReferralStatusClassName(record.status)}>
                        {REFERRAL_STATUS_LABELS[record.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "reconciliation" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>消耗对账</h2>
              <p className={adminStyles.consoleSectionDescription}>
                以客户为主视角，按时间范围汇总运行消耗、资源成本、计量金额、扣减积分和毛利。
              </p>
            </div>
            <div className={styles.rangeBar}>
              {POINTS_USAGE_RANGE_OPTIONS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.rangeButton} ${
                    activeUsageRange === item.key ? styles.rangeButtonActive : ""
                  }`}
                  onClick={() => setActiveUsageRange(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={adminStyles.consoleSummaryStrip}>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>时间范围</span>
              <span className={adminStyles.consoleSummaryValue}>{activeUsageRangeLabel}</span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>消耗客户</span>
              <span className={adminStyles.consoleSummaryValue}>
                {activeUsageSummary.customerCount} 个
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>消耗积分</span>
              <span className={adminStyles.consoleSummaryValue}>
                {activeUsageSummary.points.toLocaleString("zh-CN")}
              </span>
              <span className={adminStyles.consoleSummaryHint}>
                计量 {formatOperationsCurrency(activeUsageSummary.saleAmount)}
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>毛利</span>
              <span className={adminStyles.consoleSummaryValue}>
                {formatOperationsCurrency(activeUsageSummary.marginAmount)}
              </span>
            </div>
          </div>

          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>客户 / 租户</th>
                  <th>时间范围</th>
                  <th>消耗积分</th>
                  <th>计量金额</th>
                  <th>成本</th>
                  <th>毛利</th>
                  <th>使用人数</th>
                  <th>消耗来源</th>
                  <th>最近消耗</th>
                </tr>
              </thead>
              <tbody>
                {customerUsageSummaries.length ? (
                  customerUsageSummaries.map(summary => (
                    <tr key={summary.tenantName}>
                      <td className={adminStyles.consoleHtmlTableStrong}>{summary.tenantName}</td>
                      <td>{activeUsageRangeLabel}</td>
                      <td>
                        <span
                          className={`${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagDanger}`}
                        >
                          -{formatOperationsPoints(summary.points)}
                        </span>
                      </td>
                      <td>{formatOperationsCurrency(summary.saleAmount)}</td>
                      <td>{formatOperationsCurrency(summary.costAmount)}</td>
                      <td>{formatOperationsCurrency(summary.marginAmount)}</td>
                      <td>{summary.userCount} 人</td>
                      <td>
                        {summary.sourceLabels.join(" / ")}
                        <br />
                        <span className={adminStyles.consoleSidebarItemMeta}>
                          累计 {summary.recordCount} 次消耗
                        </span>
                      </td>
                      <td>{summary.latestOccurredAt}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className={styles.emptyTableCell}>
                      当前时间范围暂无客户消耗
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
};
