import { INITIAL_FRONTIS_WEB_USERS } from "@/mocks/mockData";
import type { FrontisWebUserItem } from "@/pages/types";

import { DEFAULT_TENANT_ROLE_IDS } from "@/constants/tenantRolePermissions";
import type {
  MockTenantAgentUsageRecordItem,
  MockTenantManagementSnapshot,
  MockTenantPointsOrderItem,
  MockTenantPointsLedgerItem,
  MockTenantPointsUsageRecordItem,
} from "@/feature/auth/types";

const MOCK_TENANT_MANAGEMENT_STORAGE_KEY = "frontis.mock.tenant-management";
const NEW_USER_ONBOARDING_TENANT_ID = "tenant-new-user-onboarding-demo";

const DEFAULT_ADMIN_ASSIGNED_AGENT_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-admin-001")?.assignedAgentIds ?? [];
const DEFAULT_MEMBER_ASSIGNED_AGENT_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-member-001")?.assignedAgentIds ?? [];
const DEFAULT_ADMIN_ASSIGNED_WORKSPACE_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-admin-001")?.assignedWorkspaceIds ?? [];
const DEFAULT_MEMBER_ASSIGNED_WORKSPACE_IDS =
  INITIAL_FRONTIS_WEB_USERS.find(item => item.id === "user-member-001")?.assignedWorkspaceIds ?? [];

const buildPointsLedgerItem = (item: MockTenantPointsLedgerItem): MockTenantPointsLedgerItem =>
  item;

const buildPointsUsageRecordItem = (
  item: MockTenantPointsUsageRecordItem,
): MockTenantPointsUsageRecordItem => item;

const buildAgentUsageRecordItem = (
  item: MockTenantAgentUsageRecordItem,
): MockTenantAgentUsageRecordItem => item;

const buildTenantUser = (user: FrontisWebUserItem): FrontisWebUserItem => user;

const mergeStoredItemsWithPreset = <TItem extends { id: string }>(
  presetItems: TItem[],
  storedItems: TItem[],
): TItem[] => {
  const storedItemMap = new Map(storedItems.map(item => [item.id, item]));
  const presetItemIds = new Set(presetItems.map(item => item.id));

  return [
    ...presetItems.map(item => storedItemMap.get(item.id) ?? item),
    ...storedItems.filter(item => !presetItemIds.has(item.id)),
  ];
};

const createTenantUser = (
  overrides: Partial<FrontisWebUserItem> &
    Pick<FrontisWebUserItem, "id" | "name" | "phone" | "role">,
): FrontisWebUserItem =>
  buildTenantUser({
    ...overrides,
    assignedAgentIds:
      overrides.assignedAgentIds ??
      (overrides.role === "enterpriseAdmin"
        ? [...DEFAULT_ADMIN_ASSIGNED_AGENT_IDS]
        : [...DEFAULT_MEMBER_ASSIGNED_AGENT_IDS]),
    assignedWorkspaceIds:
      overrides.assignedWorkspaceIds ??
      (overrides.role === "enterpriseAdmin"
        ? [...DEFAULT_ADMIN_ASSIGNED_WORKSPACE_IDS]
        : [...DEFAULT_MEMBER_ASSIGNED_WORKSPACE_IDS]),
    departmentId: "dept-default",
    dialogueCount: 0,
    lastActiveAt: "刚刚",
    resultCount: 0,
    roleIds: overrides.roleIds ?? [DEFAULT_TENANT_ROLE_IDS[overrides.role]],
    status: "active",
    tokenUsage: 0,
  });

const PRESET_TENANT_SNAPSHOTS: MockTenantManagementSnapshot[] = [
  {
    tenantId: "tenant-enterprise-demo",
    tenantName: "星澜服饰租户",
    tenantCode: "ENT-2026-001",
    ownerAccountId: "mock-account-private-admin",
    adminUserId: "user-admin-001",
    deploymentMode: "privateCloud",
    edition: "team",
    planLabel: "团队 20 席版",
    includedSeats: 20,
    extraSeatCount: 4,
    teamPlanPackageId: "team-20",
    planExpiresAt: "2027-04-22",
    hasAgentListingAccess: true,
    invitePolicyLabel: "团队版租户支持组织管理与成员邀请。",
    lowBalanceThreshold: 2000,
    monthlyUsedPoints: 182600,
    pointsBalance: 27800,
    totalSeats: 24,
    usedSeats: 6,
    users: INITIAL_FRONTIS_WEB_USERS,
    agentUsageRecords: [
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-demo-agent-usage-01",
        actorName: "杨万泉",
        agentName: "序列总览专家",
        departmentName: "产品中台",
        inputTokens: 428000,
        outputTokens: 126000,
        callCount: 58,
        costAmount: 724,
        humanCostAmount: 6200,
        industryBenchmarkCostAmount: 4100,
        occurredAt: "今天 15:30",
      }),
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-demo-agent-usage-02",
        actorName: "杨万泉",
        agentName: "需求拆解专家",
        departmentName: "产品中台",
        inputTokens: 312000,
        outputTokens: 94000,
        callCount: 42,
        costAmount: 516,
        humanCostAmount: 4600,
        industryBenchmarkCostAmount: 3200,
        occurredAt: "今天 11:40",
      }),
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-demo-agent-usage-03",
        actorName: "王晨",
        agentName: "销售话术助手",
        departmentName: "销售一部",
        inputTokens: 286000,
        outputTokens: 76000,
        callCount: 64,
        costAmount: 388,
        humanCostAmount: 5200,
        industryBenchmarkCostAmount: 2800,
        occurredAt: "今天 10:25",
      }),
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-demo-agent-usage-04",
        actorName: "林若岚",
        agentName: "商机跟进提醒",
        departmentName: "客户成功",
        inputTokens: 198000,
        outputTokens: 52000,
        callCount: 37,
        costAmount: 284,
        humanCostAmount: 3400,
        industryBenchmarkCostAmount: 1900,
        occurredAt: "昨天 18:10",
      }),
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-demo-agent-usage-05",
        actorName: "赵明",
        agentName: "商品推荐实验 Agent",
        departmentName: "商品运营",
        inputTokens: 164000,
        outputTokens: 47000,
        callCount: 29,
        costAmount: 226,
        humanCostAmount: 2800,
        industryBenchmarkCostAmount: 1500,
        occurredAt: "2026-04-21 16:20",
      }),
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-demo-agent-usage-06",
        actorName: "陈可心",
        agentName: "会议纪要同步专家",
        departmentName: "市场运营",
        inputTokens: 96000,
        outputTokens: 26000,
        callCount: 21,
        costAmount: 132,
        humanCostAmount: 1800,
        industryBenchmarkCostAmount: 960,
        occurredAt: "2026-04-18 19:10",
      }),
    ],
    pointsLedger: [
      buildPointsLedgerItem({
        id: "tenant-enterprise-demo-recharge-01",
        title: "购买标准积分包",
        description: "补充模型与第三方接口运行额度。",
        points: 120000,
        direction: "income",
        createdAt: "今天 09:20",
        actorName: "FrontisAI",
      }),
      buildPointsLedgerItem({
        id: "tenant-enterprise-demo-consume-01",
        title: "ME 调用",
        description: "产品评审、PRD 拆解与成果页生成。",
        points: 36500,
        direction: "expense",
        createdAt: "今天 11:40",
        actorName: "杨万泉",
      }),
      buildPointsLedgerItem({
        id: "tenant-enterprise-demo-consume-02",
        title: "销售话术助手",
        description: "销售话术助手与商机跟进提醒运行消耗。",
        points: 18600,
        direction: "expense",
        createdAt: "昨天 18:10",
        actorName: "王晨",
      }),
    ],
    pointsUsageRecords: [
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-demo-usage-01",
        channelLabel: "ME",
        targetLabel: "需求拆解与评审协同",
        actorName: "杨万泉",
        runtimeLabel: "GPT-4.1 + 飞书文档接口",
        points: 18200,
        occurredAt: "今天 11:40",
        description: "围绕 PRD 梳理、任务拆解和工作轨迹检索的连续调用。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-demo-usage-04",
        channelLabel: "AI专家",
        targetLabel: "序列总览专家",
        actorName: "杨万泉",
        runtimeLabel: "GPT-4.1 + 数据洞察接口",
        points: 7400,
        occurredAt: "昨天 15:30",
        description: "分析序列评分、预警和趋势变化。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-demo-usage-05",
        channelLabel: "开发空间",
        targetLabel: "商品推荐实验 Agent 调试",
        actorName: "杨万泉",
        runtimeLabel: "DeepSeek-R1 + 向量检索",
        points: 6800,
        occurredAt: "今天 16:20",
        description: "在开发空间调试提示词、知识检索和工具调用链路。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-demo-usage-06",
        channelLabel: "Skill",
        targetLabel: "飞书会议纪要同步",
        actorName: "杨万泉",
        runtimeLabel: "飞书开放接口",
        points: 2600,
        occurredAt: "2026-04-21 19:10",
        description: "同步会议纪要并生成任务拆解结果。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-demo-usage-02",
        channelLabel: "AI专家",
        targetLabel: "销售话术助手",
        actorName: "王晨",
        runtimeLabel: "Kimi 销售版",
        points: 9600,
        occurredAt: "今天 10:25",
        description: "生成销售话术与客户回复建议。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-demo-usage-03",
        channelLabel: "Skill",
        targetLabel: "商机跟进提醒",
        actorName: "林若岚",
        runtimeLabel: "Claude 3.7 + 短信接口",
        points: 5200,
        occurredAt: "昨天 18:10",
        description: "调用外部提醒接口并写回跟进建议。",
      }),
    ],
    pointsOrders: [],
    referralRecords: [],
  },
  {
    tenantId: "tenant-enterprise-hq",
    tenantName: "星澜服饰集团租户",
    tenantCode: "ENT-HQ-2026-001",
    ownerAccountId: "mock-account-enterprise-admin",
    adminUserId: "user-admin-001",
    deploymentMode: "publicCloud",
    edition: "team",
    planLabel: "团队 20 席版",
    includedSeats: 20,
    extraSeatCount: 20,
    teamPlanPackageId: "team-20",
    planExpiresAt: "2027-03-12",
    hasAgentListingAccess: true,
    invitePolicyLabel: "团队版租户支持组织管理与成员邀请。",
    lowBalanceThreshold: 5000,
    monthlyUsedPoints: 96500,
    pointsBalance: 68400,
    totalSeats: 40,
    usedSeats: 2,
    users: [INITIAL_FRONTIS_WEB_USERS[0], INITIAL_FRONTIS_WEB_USERS[1]].filter(
      (item): item is FrontisWebUserItem => Boolean(item),
    ),
    agentUsageRecords: [
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-hq-agent-usage-01",
        actorName: "杨万泉",
        agentName: "集团经营复盘专家",
        departmentName: "集团管理",
        inputTokens: 186000,
        outputTokens: 54000,
        callCount: 31,
        points: 14200,
        occurredAt: "昨天 14:20",
      }),
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-hq-agent-usage-02",
        actorName: "林若岚",
        agentName: "商品运营素材助手",
        departmentName: "商品运营",
        inputTokens: 128000,
        outputTokens: 43000,
        callCount: 27,
        points: 7800,
        occurredAt: "昨天 10:12",
      }),
    ],
    pointsLedger: [
      buildPointsLedgerItem({
        id: "tenant-enterprise-hq-income-01",
        title: "购买标准积分包",
        description: "FrontisAI 为租户配置积分额度。",
        points: 200000,
        direction: "income",
        createdAt: "本月 1 日",
        actorName: "FrontisAI",
      }),
      buildPointsLedgerItem({
        id: "tenant-enterprise-hq-income-02",
        title: "邀请奖励",
        description: "邀请陈可心完成注册后发放奖励。",
        points: 200,
        direction: "income",
        createdAt: "4月 23日",
        actorName: "FrontisAI",
      }),
      buildPointsLedgerItem({
        id: "tenant-enterprise-hq-expense-01",
        title: "ME 调用",
        description: "通过 ME 生成集团经营复盘内容。",
        points: 14200,
        direction: "expense",
        createdAt: "昨天 14:20",
        actorName: "杨万泉",
      }),
      buildPointsLedgerItem({
        id: "tenant-enterprise-hq-expense-02",
        title: "商品运营素材助手",
        description: "调用商品运营素材助手生成活动素材。",
        points: 7800,
        direction: "expense",
        createdAt: "昨天 10:12",
        actorName: "林若岚",
      }),
    ],
    pointsUsageRecords: [
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-hq-usage-01",
        channelLabel: "ME",
        targetLabel: "集团经营复盘",
        actorName: "杨万泉",
        runtimeLabel: "GPT-4.1",
        points: 14200,
        occurredAt: "昨天 14:20",
        description: "集团经营复盘与汇报材料生成。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-hq-usage-02",
        channelLabel: "AI专家",
        targetLabel: "商品运营素材助手",
        actorName: "林若岚",
        runtimeLabel: "文心一言 + 图像处理接口",
        points: 7800,
        occurredAt: "昨天 10:12",
        description: "活动海报文案与详情素材生成。",
      }),
    ],
    pointsOrders: [],
    referralRecords: [
      {
        id: "tenant-enterprise-hq-referral-01",
        inviteeName: "陈可心",
        inviteeTenantName: "陈可心的工作室",
        registeredAt: "2026-04-22 15:10",
        rewardPoints: 200,
        rewardedAt: "2026-04-22 15:11",
        status: "rewarded",
      },
    ],
  },
  {
    tenantId: "tenant-enterprise-east-ops",
    tenantName: "凌光零售华东租户",
    tenantCode: "ENT-EAST-2026-017",
    ownerAccountId: "mock-account-multi-tenant",
    adminUserId: "user-member-001",
    deploymentMode: "publicCloud",
    edition: "team",
    planLabel: "团队 5 席版",
    includedSeats: 5,
    extraSeatCount: 0,
    teamPlanPackageId: "team-5",
    planExpiresAt: "2027-04-14",
    hasAgentListingAccess: false,
    invitePolicyLabel: "团队版租户支持组织管理与成员邀请。",
    lowBalanceThreshold: 1000,
    monthlyUsedPoints: 24800,
    pointsBalance: 6200,
    totalSeats: 5,
    usedSeats: 1,
    users: [
      createTenantUser({
        id: "user-member-001",
        name: "王晨",
        phone: "13800000011",
        role: "enterpriseAdmin",
        dialogueCount: 18,
        tokenUsage: 24800,
        resultCount: 6,
      }),
    ],
    agentUsageRecords: [
      buildAgentUsageRecordItem({
        id: "tenant-enterprise-east-ops-agent-usage-01",
        actorName: "王晨",
        agentName: "经营日报助手",
        departmentName: "华东运营",
        inputTokens: 76000,
        outputTokens: 24000,
        callCount: 18,
        points: 3200,
        occurredAt: "今天 10:30",
      }),
    ],
    pointsLedger: [
      buildPointsLedgerItem({
        id: "tenant-enterprise-east-ops-income-01",
        title: "购买标准积分包",
        description: "租户试点开通奖励。",
        points: 12000,
        direction: "income",
        createdAt: "4月 1 日",
        actorName: "FrontisAI",
      }),
      buildPointsLedgerItem({
        id: "tenant-enterprise-east-ops-expense-01",
        title: "销售话术助手",
        description: "华东运营租户近期试点任务消耗。",
        points: 5800,
        direction: "expense",
        createdAt: "今天 10:30",
        actorName: "王晨",
      }),
    ],
    pointsUsageRecords: [
      buildPointsUsageRecordItem({
        id: "tenant-enterprise-east-ops-usage-01",
        channelLabel: "AI专家",
        targetLabel: "经营日报助手",
        actorName: "王晨",
        runtimeLabel: "DeepSeek-R1",
        points: 3200,
        occurredAt: "今天 10:30",
        description: "生成门店日报与异常经营提示。",
      }),
    ],
    pointsOrders: [],
    referralRecords: [
      {
        id: "tenant-enterprise-east-ops-referral-01",
        inviteeName: "林若岚",
        inviteeTenantName: "林若岚的工作室",
        registeredAt: "2026-04-23 14:12",
        rewardPoints: 200,
        status: "registered",
      },
    ],
  },
  {
    tenantId: "tenant-personal-studio-demo",
    tenantName: "李想的工作室",
    tenantCode: "SELF-2026-430",
    ownerAccountId: "mock-account-personal-admin",
    adminUserId: "user-self-admin-001",
    deploymentMode: "publicCloud",
    edition: "personal",
    planLabel: "个人版",
    includedSeats: 1,
    extraSeatCount: 0,
    hasAgentListingAccess: false,
    invitePolicyLabel: "个人版仅支持单人使用。",
    lowBalanceThreshold: 500,
    monthlyUsedPoints: 4200,
    pointsBalance: 3600,
    totalSeats: 1,
    usedSeats: 1,
    users: [
      createTenantUser({
        id: "user-self-admin-001",
        name: "李想",
        phone: "13800005555",
        role: "enterpriseAdmin",
        dialogueCount: 9,
        tokenUsage: 4200,
        resultCount: 4,
      }),
    ],
    agentUsageRecords: [],
    pointsLedger: [
      buildPointsLedgerItem({
        id: "tenant-personal-studio-demo-income-01",
        title: "注册送积分",
        description: "新租户开通奖励积分。",
        points: 6000,
        direction: "income",
        createdAt: "今天 09:00",
        actorName: "FrontisAI",
      }),
      buildPointsLedgerItem({
        id: "tenant-personal-studio-demo-income-02",
        title: "邀请奖励",
        description: "邀请顾南完成注册后发放奖励。",
        points: 200,
        direction: "income",
        createdAt: "2026-04-22 11:09",
        actorName: "FrontisAI",
      }),
      buildPointsLedgerItem({
        id: "tenant-personal-studio-demo-expense-01",
        title: "ME 调用",
        description: "需求拆解与工作轨迹检索演示消耗。",
        points: 2400,
        direction: "expense",
        createdAt: "今天 11:15",
        actorName: "李想",
      }),
      buildPointsLedgerItem({
        id: "tenant-personal-studio-demo-expense-02",
        title: "客户对账核验助手",
        description: "体验客户对账核验助手的本次运行消耗。",
        points: 1800,
        direction: "expense",
        createdAt: "昨天 18:40",
        actorName: "李想",
      }),
    ],
    pointsUsageRecords: [
      buildPointsUsageRecordItem({
        id: "tenant-personal-studio-demo-usage-01",
        channelLabel: "ME",
        targetLabel: "工作轨迹与原型梳理",
        actorName: "李想",
        runtimeLabel: "GPT-4.1 + 文档检索",
        points: 2400,
        occurredAt: "今天 11:15",
        description: "围绕 PRD 和原型迭代的连续协作消耗。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-personal-studio-demo-usage-02",
        channelLabel: "AI专家",
        targetLabel: "客户对账核验助手",
        actorName: "李想",
        runtimeLabel: "GPT-4.1 + 表格核验接口",
        points: 1800,
        occurredAt: "昨天 18:40",
        description: "对一批对账记录进行规则核验与异常输出。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-personal-studio-demo-usage-03",
        channelLabel: "开发空间",
        targetLabel: "客户核验 Skill 调试",
        actorName: "李想",
        runtimeLabel: "GPT-4.1 + 表格解析接口",
        points: 900,
        occurredAt: "今天 16:35",
        description: "在开发空间调试对账核验 Skill 的字段映射和异常规则。",
      }),
      buildPointsUsageRecordItem({
        id: "tenant-personal-studio-demo-usage-04",
        channelLabel: "Skill",
        targetLabel: "表格异常标记",
        actorName: "李想",
        runtimeLabel: "表格处理接口",
        points: 700,
        occurredAt: "2026-04-20 19:10",
        description: "批量标记表格中的异常字段和待复核记录。",
      }),
    ],
    pointsOrders: [],
    referralRecords: [
      {
        id: "tenant-personal-studio-demo-referral-01",
        inviteeName: "沈佳",
        inviteeTenantName: "沈佳的工作室",
        registeredAt: "2026-04-23 18:20",
        rewardPoints: 200,
        status: "registered",
      },
      {
        id: "tenant-personal-studio-demo-referral-02",
        inviteeName: "顾南",
        inviteeTenantName: "顾南的工作室",
        registeredAt: "2026-04-22 11:08",
        rewardPoints: 200,
        rewardedAt: "2026-04-22 11:09",
        status: "rewarded",
      },
    ],
  },
  {
    tenantId: "tenant-new-user-onboarding-demo",
    tenantName: "沈一新的工作室",
    tenantCode: "SELF-2026-NEW",
    ownerAccountId: "mock-account-new-user-onboarding",
    adminUserId: "user-new-admin-001",
    deploymentMode: "publicCloud",
    edition: "personal",
    planLabel: "个人版",
    includedSeats: 1,
    extraSeatCount: 0,
    hasAgentListingAccess: false,
    invitePolicyLabel: "个人版仅支持单人使用。",
    lowBalanceThreshold: 500,
    monthlyUsedPoints: 0,
    pointsBalance: 6000,
    totalSeats: 1,
    usedSeats: 1,
    users: [
      createTenantUser({
        id: "user-new-admin-001",
        name: "沈一新",
        phone: "13800007777",
        role: "employee",
        assignedAgentIds: [],
      }),
    ],
    agentUsageRecords: [],
    pointsLedger: [
      buildPointsLedgerItem({
        id: "tenant-new-user-onboarding-demo-income-01",
        title: "注册送积分",
        description: "新租户开通奖励积分。",
        points: 6000,
        direction: "income",
        createdAt: "刚刚",
        actorName: "FrontisAI",
      }),
    ],
    pointsUsageRecords: [],
    pointsOrders: [],
    referralRecords: [],
  },
];

const mergeSnapshotWithPreset = (
  presetSnapshot: MockTenantManagementSnapshot,
  storedSnapshot: MockTenantManagementSnapshot,
): MockTenantManagementSnapshot =>
  cloneSnapshot({
    ...presetSnapshot,
    ...storedSnapshot,
    tenantName: presetSnapshot.tenantName,
    tenantCode: presetSnapshot.tenantCode,
    ownerAccountId: presetSnapshot.ownerAccountId,
    adminUserId: presetSnapshot.adminUserId,
    deploymentMode: presetSnapshot.deploymentMode,
    users:
      presetSnapshot.tenantId === NEW_USER_ONBOARDING_TENANT_ID
        ? presetSnapshot.users
        : storedSnapshot.users.length
          ? storedSnapshot.users
          : presetSnapshot.users,
    agentUsageRecords: mergeStoredItemsWithPreset(
      presetSnapshot.agentUsageRecords,
      storedSnapshot.agentUsageRecords ?? [],
    ),
    pointsLedger: mergeStoredItemsWithPreset(
      presetSnapshot.pointsLedger,
      storedSnapshot.pointsLedger,
    ),
    pointsUsageRecords: mergeStoredItemsWithPreset(
      presetSnapshot.pointsUsageRecords,
      storedSnapshot.pointsUsageRecords,
    ),
    pointsOrders: mergeStoredItemsWithPreset(
      presetSnapshot.pointsOrders,
      storedSnapshot.pointsOrders,
    ),
    referralRecords: mergeStoredItemsWithPreset(
      presetSnapshot.referralRecords,
      storedSnapshot.referralRecords ?? [],
    ),
  });

const isValidTenantSnapshot = (value: unknown): value is MockTenantManagementSnapshot =>
  typeof value === "object" &&
  value !== null &&
  "tenantId" in value &&
  "tenantName" in value &&
  "users" in value &&
  Array.isArray((value as MockTenantManagementSnapshot).users);

const normalizeTenantSnapshot = (
  snapshot: MockTenantManagementSnapshot,
): MockTenantManagementSnapshot => {
  const isPersonalLikeSnapshot =
    snapshot.edition === "personal" || snapshot.planLabel.includes("个人");
  const nextEdition =
    snapshot.edition ??
    (snapshot.teamPlanPackageId
      ? "team"
      : isPersonalLikeSnapshot
        ? "personal"
        : snapshot.totalSeats > 1
          ? "team"
          : "personal");
  const nextIncludedSeats =
    nextEdition === "personal"
      ? 1
      : typeof snapshot.includedSeats === "number"
        ? snapshot.includedSeats
        : nextEdition === "team"
          ? Math.max(snapshot.totalSeats - (snapshot.extraSeatCount ?? 0), 1)
          : 1;
  const nextExtraSeatCount =
    nextEdition === "personal"
      ? 0
      : typeof snapshot.extraSeatCount === "number"
        ? snapshot.extraSeatCount
        : Math.max(snapshot.totalSeats - nextIncludedSeats, 0);

  return {
    ...snapshot,
    deploymentMode: snapshot.deploymentMode ?? "publicCloud",
    edition: nextEdition,
    includedSeats: nextIncludedSeats,
    extraSeatCount: nextExtraSeatCount,
    totalSeats: nextEdition === "personal" ? 1 : nextIncludedSeats + nextExtraSeatCount,
    hasAgentListingAccess:
      typeof snapshot.hasAgentListingAccess === "boolean" ? snapshot.hasAgentListingAccess : false,
    teamPlanPackageId:
      snapshot.teamPlanPackageId ??
      (nextEdition === "team" && nextIncludedSeats >= 20
        ? "team-20"
        : nextEdition === "team"
          ? "team-5"
          : undefined),
    planExpiresAt: snapshot.planExpiresAt ?? (nextEdition === "team" ? "2027-04-23" : undefined),
  };
};

const cloneSnapshot = (snapshot: MockTenantManagementSnapshot): MockTenantManagementSnapshot => ({
  ...normalizeTenantSnapshot(snapshot),
  users: snapshot.users.map(user => ({ ...user })),
  agentUsageRecords: (snapshot.agentUsageRecords ?? []).map(item => ({ ...item })),
  pointsLedger: snapshot.pointsLedger.map(item => ({ ...item })),
  pointsUsageRecords: snapshot.pointsUsageRecords.map(item => ({ ...item })),
  pointsOrders: [],
  referralRecords: [],
});

const readStoredTenantSnapshots = (): MockTenantManagementSnapshot[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_TENANT_MANAGEMENT_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidTenantSnapshot).map(item =>
      cloneSnapshot({
        ...normalizeTenantSnapshot(item),
        agentUsageRecords: Array.isArray(item.agentUsageRecords) ? item.agentUsageRecords : [],
        pointsUsageRecords: Array.isArray(item.pointsUsageRecords) ? item.pointsUsageRecords : [],
        pointsOrders: Array.isArray(item.pointsOrders) ? item.pointsOrders : [],
        referralRecords: Array.isArray(item.referralRecords) ? item.referralRecords : [],
      }),
    );
  } catch {
    return [];
  }
};

const writeStoredTenantSnapshots = (snapshots: MockTenantManagementSnapshot[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_TENANT_MANAGEMENT_STORAGE_KEY, JSON.stringify(snapshots));
};

const mergeTenantSnapshots = (
  presetSnapshots: MockTenantManagementSnapshot[],
  storedSnapshots: MockTenantManagementSnapshot[],
): MockTenantManagementSnapshot[] => {
  const snapshotMap = new Map<string, MockTenantManagementSnapshot>();

  presetSnapshots.forEach(snapshot => {
    snapshotMap.set(snapshot.tenantId, cloneSnapshot(snapshot));
  });

  storedSnapshots.forEach(snapshot => {
    const matchedPresetSnapshot = snapshotMap.get(snapshot.tenantId);

    snapshotMap.set(
      snapshot.tenantId,
      matchedPresetSnapshot
        ? mergeSnapshotWithPreset(matchedPresetSnapshot, snapshot)
        : cloneSnapshot(snapshot),
    );
  });

  return Array.from(snapshotMap.values());
};

/**
 * 获取当前原型中的全部租户管理快照。
 */
export const getMockTenantManagementSnapshots = (): MockTenantManagementSnapshot[] =>
  mergeTenantSnapshots(PRESET_TENANT_SNAPSHOTS, readStoredTenantSnapshots());

/**
 * 根据租户 id 获取租户管理快照。
 */
export const getMockTenantManagementSnapshot = (
  tenantId: string | undefined,
): MockTenantManagementSnapshot | null => {
  if (!tenantId) {
    return null;
  }

  return (
    getMockTenantManagementSnapshots().find(snapshot => snapshot.tenantId === tenantId) ?? null
  );
};

/**
 * 按租户读取成员列表。
 */
export const getMockTenantUsers = (tenantId: string | undefined): FrontisWebUserItem[] | null => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  return matchedSnapshot ? matchedSnapshot.users.map(user => ({ ...user })) : null;
};

/**
 * 按租户读取积分购买订单。
 */
export const getMockTenantPointsOrders = (
  tenantId: string | undefined,
): MockTenantPointsOrderItem[] => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  return matchedSnapshot ? matchedSnapshot.pointsOrders.map(item => ({ ...item })) : [];
};

/**
 * 读取全部租户积分购买订单，并附带租户信息。
 */
export const getAllMockTenantPointsOrders = (): Array<
  MockTenantPointsOrderItem & {
    tenantId: string;
    tenantName: string;
    tenantCode: string;
  }
> =>
  getMockTenantManagementSnapshots()
    .flatMap(snapshot =>
      snapshot.pointsOrders.map(item => ({
        ...item,
        tenantId: snapshot.tenantId,
        tenantName: snapshot.tenantName,
        tenantCode: snapshot.tenantCode,
      })),
    )
    .sort((leftItem, rightItem) => rightItem.createdAt.localeCompare(leftItem.createdAt));

/**
 * 写入单个租户管理快照。
 */
export const saveMockTenantManagementSnapshot = (
  snapshot: MockTenantManagementSnapshot,
): MockTenantManagementSnapshot => {
  const currentSnapshots = getMockTenantManagementSnapshots().filter(
    item => item.tenantId !== snapshot.tenantId,
  );
  const nextSnapshots = [...currentSnapshots, cloneSnapshot(snapshot)];

  writeStoredTenantSnapshots(nextSnapshots);

  return cloneSnapshot(snapshot);
};
