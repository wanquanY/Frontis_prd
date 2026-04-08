import { useMemo } from "react";

import { Button } from "antd";

import type {
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebUserItem,
  WorkspaceItem,
} from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./BossDashboardView.module.less";

interface BossDashboardViewProps {
  currentUserName?: string;
  dialogueSessions: DialogueSessionItem[];
  employees: EmployeeItem[];
  onNavigateToTab: (tabKey: "devices" | "models" | "organization" | "store") => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

const DAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

interface ExpertTeamDef {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

interface TimelineSegment {
  text: string;
}

interface TimelineEntryDef {
  id: string;
  time: string;
  employeeId: string;
  agentLabel: string;
  segments: TimelineSegment[];
}

const EXPERT_TEAMS: ExpertTeamDef[] = [
  {
    id: "team-product",
    name: "产研协作专家团",
    description: "重点管理专家可用范围、升级状态和配置完整度。",
    memberIds: ["employee-pm", "employee-designer", "employee-research", "employee-ops"],
  },
  {
    id: "team-sales",
    name: "销售增长专家团",
    description: "重点关注业务团队可用权限、运行状态和版本接收情况。",
    memberIds: ["employee-writer", "employee-sales"],
  },
];

const VERSION_UPGRADE_MAP: Record<string, string> = {
  "employee-designer": "v1.9",
  "employee-pm": "v2.2",
  "employee-writer": "v1.7",
};

const TIMELINE_ENTRIES: TimelineEntryDef[] = [
  {
    id: "tl-1",
    time: "21:15",
    employeeId: "employee-pm",
    agentLabel: "产品策略官 · 产研协作专家团",
    segments: [
      { text: "完成 SynClaw 独立窗口 " },
      { text: "五 Tab 结构方案" },
      { text: "，输出评审文档 1 份，等待你确认后进入下一阶段。" },
    ],
  },
  {
    id: "tl-2",
    time: "20:42",
    employeeId: "employee-research",
    agentLabel: "资料研究员 · 产研协作专家团",
    segments: [
      { text: "完成竞品页面资料同步，梳理出 " },
      { text: "3 个关键差异点" },
      { text: "，建议优先在首屏强化“AI 专家团”概念。" },
    ],
  },
  {
    id: "tl-3",
    time: "19:30",
    employeeId: "employee-writer",
    agentLabel: "本地内容助理 · 销售增长专家团",
    segments: [
      { text: "整理完成昨日会议纪要摘要，提炼出 " },
      { text: "7 个功能拆解点" },
      { text: "，已同步对话记录，等待你继续安排。" },
    ],
  },
  {
    id: "tl-4",
    time: "17:08",
    employeeId: "employee-sales",
    agentLabel: "销售战报助手 · 销售增长专家团",
    segments: [
      { text: "设备激活码尚未录入，" },
      { text: "一线销售数据无法回流" },
      { text: "，建议尽快完成激活，补齐数据闭环。" },
    ],
  },
  {
    id: "tl-5",
    time: "14:55",
    employeeId: "employee-designer",
    agentLabel: "交互设计师 · 产研协作专家团",
    segments: [
      { text: "AI 专家团页面命名方案整理完毕，提供 " },
      { text: "3 个候选方案" },
      { text: " 供选择，确认后立即推进原型设计。" },
    ],
  },
];

const getGreetingLabel = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
};

const getExecutiveTitle = (name?: string): string => {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    return "老板";
  }
  return `${normalizedName.slice(0, 1)}总`;
};

const formatDateLine = (): string => {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${
    DAY_NAMES[now.getDay()]
  } · ${getGreetingLabel()}`;
};

const isEmployeeActive = (employee: EmployeeItem): boolean =>
  ["running", "online"].includes(employee.status);

export const BossDashboardView = ({
  currentUserName,
  dialogueSessions,
  employees,
  onNavigateToTab,
  users,
  workspaces,
}: BossDashboardViewProps): JSX.Element => {
  const completedTaskCount = useMemo(
    () =>
      dialogueSessions.reduce((total, session) => {
        const assistantMessageCount = session.messages.filter(message => message.role === "assistant")
          .length;
        return total + assistantMessageCount * 6 + 4;
      }, 0),
    [dialogueSessions],
  );

  const runtimeHours = useMemo(
    () =>
      employees.reduce((total, employee) => {
        if (employee.status === "running") return total + 18;
        if (employee.status === "online") return total + 14;
        return total;
      }, 0),
    [employees],
  );

  const savedHours = useMemo(
    () => Math.max(32, Math.round(completedTaskCount * 0.62 + runtimeHours * 0.35)),
    [completedTaskCount, runtimeHours],
  );

  const activeExpertCount = useMemo(
    () => employees.filter(employee => isEmployeeActive(employee)).length,
    [employees],
  );

  const activeUserNames = useMemo(
    () => users.filter(user => user.status === "active").map(user => user.name),
    [users],
  );

  const pendingUpgradeCount = useMemo(
    () => employees.filter(employee => VERSION_UPGRADE_MAP[employee.id]).length,
    [employees],
  );

  const abnormalWorkspaceCount = useMemo(
    () => workspaces.filter(workspace => !["busy", "idle", "online"].includes(workspace.status)).length,
    [workspaces],
  );

  const riskCount = pendingUpgradeCount + abnormalWorkspaceCount;
  const isHealthy = riskCount === 0;
  const totalTokenUsage = useMemo(
    () => users.reduce((total, user) => total + user.tokenUsage, 0),
    [users],
  );

  const teamData = useMemo(
    () =>
      EXPERT_TEAMS.map(team => {
        const members = employees.filter(employee => team.memberIds.includes(employee.id));
        const allowedNames = new Set<string>();
        const workspaceNames = new Set<string>();

        members.forEach(member => {
          if (member.visibility === "all") {
            activeUserNames.forEach(name => allowedNames.add(name));
          } else {
            member.boundMembers.forEach(name => allowedNames.add(name));
          }

          const workspaceName = workspaces.find(item => item.id === member.workspaceId)?.name;
          if (workspaceName) {
            workspaceNames.add(workspaceName);
          }
        });

        return {
          activeCount: members.filter(member => isEmployeeActive(member)).length,
          allowedNames: Array.from(allowedNames),
          memberCount: members.length,
          runtimeLabel: Array.from(workspaceNames).join("、") || "后台统一配置",
          teamPendingUpgradeCount: members.filter(member => VERSION_UPGRADE_MAP[member.id]).length,
          ...team,
        };
      }),
    [activeUserNames, employees, workspaces],
  );

  const summaryItems = useMemo(
    () => [
      {
        icon: "✅",
        label: "完成任务数",
        tone: "primary" as const,
        value: completedTaskCount.toString(),
      },
      {
        icon: "⏱️",
        label: "运行时长",
        tone: "purple" as const,
        value: `${runtimeHours} 小时`,
      },
      {
        icon: "👥",
        label: "节省工时",
        tone: "success" as const,
        value: `${savedHours} 小时`,
      },
      {
        icon: "🤖",
        label: "活跃 AI 专家",
        tone: "amber" as const,
        value: `${activeExpertCount} 个`,
      },
      {
        icon: "🪙",
        label: "消耗 Tokens",
        tone: "warning" as const,
        value: totalTokenUsage.toLocaleString(),
      },
    ],
    [activeExpertCount, completedTaskCount, runtimeHours, savedHours, totalTokenUsage],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <p className={styles.dateLine}>{formatDateLine()}</p>
          <h1 className={adminStyles.consoleTitle}>
            {getGreetingLabel()}，{getExecutiveTitle(currentUserName)}
          </h1>
          {/* <p className={styles.summaryLine}>
            企业正式配置已经收口到管理后台。当前共有{" "}
            <span className={styles.highlight}>{activeExpertCount} 个活跃 AI 专家</span>
            ，近一轮累计完成 <span className={styles.highlight}>{completedTaskCount} 条任务</span>
            ，估算节省 <span className={styles.strongText}>{savedHours} 小时</span> 人工处理时间。
          </p> */}
        </div>
        {/* <div className={adminStyles.consoleHeaderSide}>
          <span
            className={
              isHealthy
                ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`
                : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`
            }
          >
            {isHealthy ? "配置状态稳定" : `${riskCount} 项配置待处理`}
          </span>
        </div> */}
      </header>

      <div className={styles.summaryCardGrid}>
        {summaryItems.map(item => (
          <article key={item.label} className={styles.summaryCard}>
            <div className={styles.summaryCardHeader}>
              <div className={styles.summaryCardIcon} data-tone={item.tone}>
                {item.icon}
              </div>
              <p className={styles.summaryCardLabel}>{item.label}</p>
            </div>
            <p className={styles.summaryCardValue} data-tone={item.tone}>
              {item.value}
            </p>
          </article>
        ))}
      </div>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>AI 专家团配置概览</h2>
          </div>
          <Button type="link" size="small" onClick={() => onNavigateToTab("store")}>
            去专家团配置
          </Button>
        </div>

        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>专家团</th>
                <th>AI 专家</th>
                <th>可用成员</th>
                <th>活跃专家</th>
                <th>待升级</th>
                <th>运行主体</th>
              </tr>
            </thead>
            <tbody>
              {teamData.map(team => (
                <tr key={team.id}>
                  <td>
                    <div className={styles.tableMainText}>{team.name}</div>
                    <div className={styles.tableSubText}>{team.description}</div>
                  </td>
                  <td>{team.memberCount} 个</td>
                  <td>{team.allowedNames.length ? team.allowedNames.join("、") : "暂未分配"}</td>
                  <td>{team.activeCount} 个</td>
                  <td>{team.teamPendingUpgradeCount} 个</td>
                  <td>{team.runtimeLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>AI 专家最新动态</h2>
          </div>
        </div>

        <div className={adminStyles.consoleTimeline}>
          {TIMELINE_ENTRIES.map(entry => (
            <div key={entry.id} className={adminStyles.consoleTimelineItem}>
              <div className={adminStyles.consoleTimelineTime}>{entry.time}</div>
              <div className={adminStyles.consoleTimelineBody}>
                <p className={adminStyles.consoleTimelineTitle}>{entry.agentLabel}</p>
                <p className={adminStyles.consoleTimelineText}>
                  {entry.segments.map((segment, index) => (
                    <span key={`${entry.id}-${index}`}>{segment.text}</span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
