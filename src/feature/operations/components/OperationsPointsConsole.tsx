import { useMemo, useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, Switch, message } from "antd";
import classNames from "classnames";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type {
  OperationsPointsUsageRecord,
  OperationsReferralRecord,
  OperationsReferralStatus,
  OperationsRegistrationStrategy,
  OperationsTenant,
} from "@/feature/operations/types";
import {
  formatOperationsCurrency,
  formatOperationsPoints,
} from "@/feature/operations/serviceMeteringUtils";
import type { MockPointsPackageOption } from "@/feature/points/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import billingStyles from "./OperationsBillingConsole.module.less";
import platformStyles from "./OperationsPlatformView.module.less";

interface OperationsPointsConsoleProps {
  embedded?: boolean;
  pointsPackages: MockPointsPackageOption[];
  pointsUsageRecords: OperationsPointsUsageRecord[];
  referralRecords: OperationsReferralRecord[];
  registrationStrategy: OperationsRegistrationStrategy;
  tenants: OperationsTenant[];
  onCreatePointsPackage: (
    payload: Pick<
      MockPointsPackageOption,
      "title" | "description" | "points" | "price" | "tagLabel"
    >,
  ) => void;
  onUpdatePointsPackage: (
    packageId: string,
    updates: Partial<
      Pick<
        MockPointsPackageOption,
        "title" | "description" | "points" | "price" | "status" | "sortOrder" | "tagLabel"
      >
    >,
  ) => void;
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

type OperationsPointsTabKey = "rules" | "pointsPackages" | "referral" | "reconciliation";
type OperationsPointsUsageRangeKey = "today" | "week" | "month" | "all";

type PointsPackageEditorState =
  | {
      mode: "create";
      open: true;
      form: PointsPackageForm;
    }
  | {
      mode: "edit";
      open: true;
      packageId: string;
      form: PointsPackageForm;
    }
  | {
      open: false;
    };

interface PointsPackageForm {
  title: string;
  description: string;
  points: number;
  price: number;
  tagLabel: string;
  sortOrder: number;
  status: MockPointsPackageOption["status"];
}

interface TenantPointsRecord {
  tenant: OperationsTenant;
  snapshot: MockTenantManagementSnapshot;
}

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
  { key: "pointsPackages", label: "积分包管理" },
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

const emptyPointsPackageForm: PointsPackageForm = {
  title: "",
  description: "",
  points: 0,
  price: 0,
  tagLabel: "",
  sortOrder: 10,
  status: "active",
};

const buildStatusClassName = (tone?: "primary" | "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "primary" && adminStyles.consoleStatusTagPrimary,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const getReferralStatusClassName = (status: OperationsReferralStatus): string => {
  if (status === "rewarded") return buildStatusClassName("success");
  if (status === "registered") return buildStatusClassName("warning");
  if (status === "pending") return buildStatusClassName("primary");

  return buildStatusClassName("danger");
};

const parseOperationsOccurredAt = (occurredAt: string): Dayjs => {
  const parsedValue = dayjs(occurredAt);

  return parsedValue.isValid() ? parsedValue : MOCK_TODAY;
};

const isUsageRecordInRange = (
  record: OperationsPointsUsageRecord,
  rangeKey: OperationsPointsUsageRangeKey,
): boolean => {
  if (rangeKey === "all") return true;

  const occurredAt = parseOperationsOccurredAt(record.occurredAt);

  if (rangeKey === "today") return occurredAt.isSame(MOCK_TODAY, "day");
  if (rangeKey === "month") return occurredAt.isSame(MOCK_TODAY, "month");

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
      costAmount: summary.costAmount + item.costAmount,
      customerCount: customerNames.size,
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

const createPointsPackageForm = (pointsPackage: MockPointsPackageOption): PointsPackageForm => ({
  title: pointsPackage.title,
  description: pointsPackage.description,
  points: pointsPackage.points,
  price: pointsPackage.price,
  tagLabel: pointsPackage.tagLabel ?? "",
  sortOrder: pointsPackage.sortOrder,
  status: pointsPackage.status,
});

const getStatusLabel = (status: MockPointsPackageOption["status"]): string =>
  status === "active" ? "上架" : "下架";

/**
 * 运营后台积分运营控制台，承载积分规则、积分包、邀请奖励和消耗对账。
 */
export const OperationsPointsConsole = ({
  embedded = false,
  pointsPackages,
  pointsUsageRecords,
  referralRecords,
  registrationStrategy,
  tenants,
  onCreatePointsPackage,
  onUpdatePointsPackage,
  onUpdateRegistrationStrategy,
}: OperationsPointsConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<OperationsPointsTabKey>("rules");
  const [activeUsageRange, setActiveUsageRange] = useState<OperationsPointsUsageRangeKey>("month");
  const [pointsPackageEditor, setPointsPackageEditor] = useState<PointsPackageEditorState>({
    open: false,
  });

  const tenantPointsRecords = useMemo<TenantPointsRecord[]>(
    () =>
      tenants
        .map(tenant => ({
          tenant,
          snapshot: getMockTenantManagementSnapshot(tenant.id),
        }))
        .filter((item): item is TenantPointsRecord => item.snapshot?.billingMode === "points"),
    [tenants],
  );
  const usageSummary = useMemo(
    () => summarizeUsageRecords(pointsUsageRecords),
    [pointsUsageRecords],
  );
  const filteredUsageRecords = useMemo(
    () => pointsUsageRecords.filter(record => isUsageRecordInRange(record, activeUsageRange)),
    [activeUsageRange, pointsUsageRecords],
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
  const activePointsPackages = pointsPackages.filter(item => item.status === "active");
  const lowBalanceTenants = tenantPointsRecords.filter(
    item => item.snapshot.pointsBalance <= item.snapshot.lowBalanceThreshold,
  );

  const handleSubmitPointsPackage = (): void => {
    if (!pointsPackageEditor.open) return;

    if (
      !pointsPackageEditor.form.title.trim() ||
      !pointsPackageEditor.form.description.trim() ||
      pointsPackageEditor.form.points <= 0 ||
      pointsPackageEditor.form.price <= 0
    ) {
      message.warning("请先补齐积分包名称、说明、积分数量和售价。");
      return;
    }

    if (pointsPackageEditor.mode === "create") {
      onCreatePointsPackage({
        title: pointsPackageEditor.form.title.trim(),
        description: pointsPackageEditor.form.description.trim(),
        points: pointsPackageEditor.form.points,
        price: pointsPackageEditor.form.price,
        tagLabel: pointsPackageEditor.form.tagLabel.trim(),
      });
      message.success("积分包已创建。");
    } else {
      onUpdatePointsPackage(pointsPackageEditor.packageId, {
        title: pointsPackageEditor.form.title.trim(),
        description: pointsPackageEditor.form.description.trim(),
        points: pointsPackageEditor.form.points,
        price: pointsPackageEditor.form.price,
        sortOrder: pointsPackageEditor.form.sortOrder,
        status: pointsPackageEditor.form.status,
        tagLabel: pointsPackageEditor.form.tagLabel.trim() || undefined,
      });
      message.success("积分包已更新。");
    }

    setPointsPackageEditor({ open: false });
  };

  const renderRules = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>积分规则</h2>
        </div>
      </div>

      <div className={adminStyles.consoleRows}>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>注册送积分</span>
          <InputNumber
            min={0}
            className={platformStyles.fullWidthInput}
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
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.pointsPerCny}
            onChange={value => onUpdateRegistrationStrategy({ pointsPerCny: Number(value ?? 1) })}
          />
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>最小扣减（积分）</span>
          <InputNumber
            min={1}
            className={platformStyles.fullWidthInput}
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
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.roundingUnit}
            onChange={value => onUpdateRegistrationStrategy({ roundingUnit: Number(value ?? 1) })}
          />
        </div>
      </div>
    </section>
  );

  const renderPointsPackages = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <h2 className={adminStyles.consoleSectionTitle}>积分包管理</h2>
        <Button
          type="primary"
          onClick={() =>
            setPointsPackageEditor({
              open: true,
              mode: "create",
              form: emptyPointsPackageForm,
            })
          }
        >
          新建积分包
        </Button>
      </div>
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>积分包</th>
              <th>到账积分</th>
              <th>售价</th>
              <th>排序</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pointsPackages.map(item => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  <div className={adminStyles.consoleSectionMeta}>{item.description}</div>
                </td>
                <td>{item.points.toLocaleString("zh-CN")}</td>
                <td>{formatOperationsCurrency(item.price)}</td>
                <td>{item.sortOrder}</td>
                <td>
                  <span
                    className={buildStatusClassName(
                      item.status === "active" ? "success" : undefined,
                    )}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>{item.updatedAt}</td>
                <td>
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      setPointsPackageEditor({
                        open: true,
                        mode: "edit",
                        packageId: item.id,
                        form: createPointsPackageForm(item),
                      })
                    }
                  >
                    编辑
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderReferral = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>邀请奖励</h2>
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
          <span className={adminStyles.consoleSummaryValue}>{referralSummary.pendingCount} 个</span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>已拦截</span>
          <span className={adminStyles.consoleSummaryValue}>{referralSummary.blockedCount} 个</span>
        </div>
      </div>

      <div className={adminStyles.consoleRows}>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>邀请奖励活动</span>
          <Switch
            className={platformStyles.compactSwitch}
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
            className={platformStyles.fullWidthInput}
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
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.referralInviteeRewardPoints}
            onChange={value =>
              onUpdateRegistrationStrategy({ referralInviteeRewardPoints: Number(value ?? 0) })
            }
          />
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>单邀请人每日可奖励人数</span>
          <div className={platformStyles.inlineNumberControl}>
            <InputNumber
              min={1}
              className={platformStyles.compactNumberInput}
              value={registrationStrategy.referralDailyRewardLimit}
              onChange={value =>
                onUpdateRegistrationStrategy({ referralDailyRewardLimit: Number(value ?? 1) })
              }
            />
            <span className={platformStyles.inlineNumberUnit}>人 / 日</span>
          </div>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>单邀请人每月可奖励人数</span>
          <div className={platformStyles.inlineNumberControl}>
            <InputNumber
              min={1}
              className={platformStyles.compactNumberInput}
              value={registrationStrategy.referralMonthlyRewardLimit}
              onChange={value =>
                onUpdateRegistrationStrategy({ referralMonthlyRewardLimit: Number(value ?? 1) })
              }
            />
            <span className={platformStyles.inlineNumberUnit}>人 / 月</span>
          </div>
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
                  <span className={adminStyles.consoleHtmlTableStrong}>{record.inviterName}</span>
                  <br />
                  <span className={adminStyles.consoleSidebarItemMeta}>
                    {record.inviterTenantName}
                  </span>
                </td>
                <td>
                  <span className={adminStyles.consoleHtmlTableStrong}>{record.inviteeName}</span>
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
  );

  const renderReconciliation = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>消耗对账</h2>
        </div>
        <div className={platformStyles.rangeBar}>
          {POINTS_USAGE_RANGE_OPTIONS.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(
                platformStyles.rangeButton,
                activeUsageRange === item.key && platformStyles.rangeButtonActive,
              )}
              onClick={() => setActiveUsageRange(item.key)}
            >
              {item.label}
            </button>
          ))}
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
                    <span className={buildStatusClassName("danger")}>
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
                <td colSpan={9} className={platformStyles.emptyTableCell}>
                  当前时间范围暂无客户消耗
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActiveContent = (): JSX.Element => {
    if (activeTab === "rules") return renderRules();
    if (activeTab === "pointsPackages") return renderPointsPackages();
    if (activeTab === "referral") return renderReferral();

    return renderReconciliation();
  };

  return (
    <div className={embedded ? undefined : adminStyles.consolePage}>
      {embedded ? null : (
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h1 className={adminStyles.consoleTitle}>积分运营</h1>
          </div>
        </header>
      )}

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
          <span className={adminStyles.consoleSummaryLabel}>上架积分包</span>
          <span className={adminStyles.consoleSummaryValue}>{activePointsPackages.length} 个</span>
        </div>
        <div className={adminStyles.consoleSummaryItem}>
          <span className={adminStyles.consoleSummaryLabel}>低余额租户</span>
          <span className={adminStyles.consoleSummaryValue}>{lowBalanceTenants.length} 个</span>
          <span className={adminStyles.consoleSummaryHint}>
            消耗 {usageSummary.points.toLocaleString("zh-CN")} 积分
          </span>
        </div>
      </div>

      <div className={platformStyles.detailTabBar}>
        {POINTS_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={classNames(
              platformStyles.detailTabButton,
              activeTab === item.key && platformStyles.detailTabButtonActive,
            )}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {renderActiveContent()}

      <Modal
        open={pointsPackageEditor.open}
        title={
          pointsPackageEditor.open && pointsPackageEditor.mode === "create"
            ? "新建积分包"
            : "编辑积分包"
        }
        width={640}
        onCancel={() => setPointsPackageEditor({ open: false })}
        onOk={handleSubmitPointsPackage}
        destroyOnHidden
      >
        {pointsPackageEditor.open ? (
          <div className={billingStyles.formGrid}>
            <div className={billingStyles.modalField}>
              <span>积分包名称</span>
              <Input
                value={pointsPackageEditor.form.title}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, title: event.target.value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>到账积分</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={pointsPackageEditor.form.points}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, points: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>售价</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={1}
                precision={0}
                value={pointsPackageEditor.form.price}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, price: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>标签</span>
              <Input
                value={pointsPackageEditor.form.tagLabel}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, tagLabel: event.target.value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>排序</span>
              <InputNumber
                className={billingStyles.fullWidthInput}
                min={0}
                precision={0}
                value={pointsPackageEditor.form.sortOrder}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, sortOrder: value ?? 0 } }
                      : current,
                  )
                }
              />
            </div>
            <div className={billingStyles.modalField}>
              <span>状态</span>
              <Select<MockPointsPackageOption["status"]>
                value={pointsPackageEditor.form.status}
                options={[
                  { value: "active", label: "上架" },
                  { value: "inactive", label: "下架" },
                ]}
                onChange={value =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? { ...current, form: { ...current.form, status: value } }
                      : current,
                  )
                }
              />
            </div>
            <div className={classNames(billingStyles.modalField, billingStyles.fullSpanField)}>
              <span>说明</span>
              <Input.TextArea
                rows={3}
                value={pointsPackageEditor.form.description}
                onChange={event =>
                  setPointsPackageEditor(current =>
                    current.open
                      ? {
                          ...current,
                          form: { ...current.form, description: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
