import { useMemo } from "react";

import { BellOutlined } from "@ant-design/icons";
import { Button, message } from "antd";

import type {
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebUserItem,
  WorkspaceItem,
} from "../types";

import styles from "./BossDashboardView.module.less";

interface BossDashboardViewProps {
  currentUserName?: string;
  dialogueSessions: DialogueSessionItem[];
  employees: EmployeeItem[];
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

/* ── Constants ── */

const DAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const PLATFORM_LAUNCH = new Date(2025, 10, 20);

interface ExpertTeamDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  memberIds: string[];
}

const EXPERT_TEAMS: ExpertTeamDef[] = [
  {
    id: "team-product",
    name: "产研协作专家团",
    icon: "🧠",
    description: "产品策略 · 交互设计 · 资料研究 · 上线协调",
    memberIds: ["employee-pm", "employee-designer", "employee-research", "employee-ops"],
  },
  {
    id: "team-sales",
    name: "销售增长专家团",
    icon: "📈",
    description: "销售战报 · 内容创作 · 本地市场跟进",
    memberIds: ["employee-writer", "employee-sales"],
  },
];

const CHIP_STATUS_MAP: Record<string, "online" | "waiting" | "paused"> = {
  online: "online",
  busy: "online",
  idle: "waiting",
  pending: "waiting",
  paused: "paused",
  draft: "paused",
};

interface TimelineSegment {
  text: string;
  tone?: "primary" | "success" | "danger";
}

interface TimelineEntryDef {
  id: string;
  time: string;
  employeeId: string;
  agentLabel: string;
  segments: TimelineSegment[];
  tag: { label: string; tone: "warn" | "done" | "alert" };
}

const TIMELINE_ENTRIES: TimelineEntryDef[] = [
  {
    id: "tl-1",
    time: "21:15",
    employeeId: "employee-pm",
    agentLabel: "产品策略官 · 产研协作专家团",
    segments: [
      { text: "完成 SynClaw 独立窗口 " },
      { text: "五 Tab 结构方案", tone: "primary" },
      { text: "，输出评审文档 1 份，等待你确认后进入下一阶段。" },
    ],
    tag: { label: "待确认", tone: "warn" },
  },
  {
    id: "tl-2",
    time: "20:42",
    employeeId: "employee-research",
    agentLabel: "资料研究员 · 产研协作专家团",
    segments: [
      { text: "完成竞品页面资料同步，梳理出 " },
      { text: "3 个关键差异点", tone: "success" },
      { text: "，建议优先在首屏强化\"AI 专家团\"概念。" },
    ],
    tag: { label: "已完成", tone: "done" },
  },
  {
    id: "tl-3",
    time: "19:30",
    employeeId: "employee-writer",
    agentLabel: "本地内容助理 · 销售增长专家团",
    segments: [
      { text: "整理完成昨日会议纪要摘要，提炼出 " },
      { text: "7 个功能拆解点", tone: "primary" },
      { text: "，已同步对话记录，等待你继续安排。" },
    ],
    tag: { label: "已完成", tone: "done" },
  },
  {
    id: "tl-4",
    time: "17:08",
    employeeId: "employee-sales",
    agentLabel: "销售战报助手 · 销售增长专家团",
    segments: [
      { text: "设备激活码尚未录入，" },
      { text: "一线销售数据无法回流", tone: "danger" },
      { text: "，建议尽快完成激活，补齐数据闭环。" },
    ],
    tag: { label: "需处理", tone: "alert" },
  },
  {
    id: "tl-5",
    time: "14:55",
    employeeId: "employee-designer",
    agentLabel: "交互设计师 · 产研协作专家团",
    segments: [
      { text: "AI 专家团页面命名方案整理完毕，提供 " },
      { text: "3 个候选方案", tone: "primary" },
      { text: " 供选择，确认后立即推进原型设计。" },
    ],
    tag: { label: "待确认", tone: "warn" },
  },
];

const AVATAR_COLORS = [
  { bg: "rgba(0, 193, 212, 0.12)", color: "#00a8ba" },
  { bg: "rgba(22, 163, 74, 0.12)", color: "#16a34a" },
  { bg: "rgba(124, 58, 237, 0.12)", color: "#7c3aed" },
  { bg: "rgba(217, 119, 6, 0.12)", color: "#d97706" },
  { bg: "rgba(219, 39, 119, 0.12)", color: "#db2777" },
];

/* ── Helpers ── */

const getGreetingLabel = (): string => {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
};

const getExecutiveTitle = (name?: string): string => {
  const n = name?.trim();
  if (!n) return "老板";
  return `${n.slice(0, 1)}总`;
};

const formatDateLine = (): string => {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${DAY_NAMES[now.getDay()]} · ${getGreetingLabel()}`;
};

/* ── Component ── */

export const BossDashboardView = ({
  currentUserName,
  dialogueSessions,
  employees,
  users,
}: BossDashboardViewProps): JSX.Element => {
  const completedTaskCount = useMemo(
    () =>
      dialogueSessions.reduce((total, session, index) => {
        const aCount = session.messages.filter(m => m.role === "assistant").length;
        return total + aCount * 8 + 12 + index;
      }, 0),
    [dialogueSessions],
  );

  const savedHours = useMemo(
    () => Math.round(completedTaskCount * 0.48 + 2 * 26),
    [completedTaskCount],
  );

  const recoveredValue = useMemo(() => {
    const v = Math.round(savedHours * 63.3) / 10000;
    return v.toFixed(1);
  }, [savedHours]);

  const roiPercent = useMemo(
    () => Math.min(92, Math.round((parseFloat(recoveredValue) / 9.8) * 100)),
    [recoveredValue],
  );

  const platformDays = useMemo(() => {
    return Math.floor((Date.now() - PLATFORM_LAUNCH.getTime()) / 86_400_000);
  }, []);

  const cumulativeTaskCount = useMemo(
    () => completedTaskCount + 3142,
    [completedTaskCount],
  );

  const savedPeople = useMemo(() => Math.max(1, Math.round(savedHours / 160)), [savedHours]);

  const savedDays = useMemo(
    () => Math.max(1, Math.round(savedHours / (savedPeople * 8))),
    [savedHours, savedPeople],
  );

  const isHealthy = useMemo(
    () => employees.every(e => e.status !== "paused" && e.status !== "draft"),
    [employees],
  );

  const teamData = useMemo(
    () =>
      EXPERT_TEAMS.map(team => {
        const members = employees.filter(e => team.memberIds.includes(e.id));
        const isRunning = members.some(e => ["online", "busy", "idle"].includes(e.status));
        const collaborators = users.filter(
          u => u.status === "active" && u.assignedAgentIds.some(id => team.memberIds.includes(id)),
        );
        const taskCount = dialogueSessions
          .filter(s => team.memberIds.includes(s.employeeId))
          .reduce((sum, s) => {
            const aCount = s.messages.filter(m => m.role === "assistant").length;
            return sum + aCount * 8 + 12;
          }, team.memberIds.length * 5);
        return { ...team, members, isRunning, collaborators, taskCount };
      }),
    [dialogueSessions, employees, users],
  );

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  return (
    <div className={styles.dashboard}>
      {/* ── Section 1: Greeting ── */}
      <header className={styles.header}>
        <div>
          <p className={styles.greetingTime}>{formatDateLine()}</p>
          <h1 className={styles.greetingName}>
            {getGreetingLabel()}，{getExecutiveTitle(currentUserName)}
          </h1>
          <p className={styles.greetingSummary}>
            你的 AI 专家团今天帮团队完成了{" "}
            <span className={styles.highlight}>{completedTaskCount} 条任务</span>，相当于节省了{" "}
            <span className={styles.emphasis}>
              {savedPeople} 名员工整整 {savedDays} 天
            </span>{" "}
            的工作量。
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={isHealthy ? styles.statusChipOk : styles.statusChipWarn}>
            <span className={isHealthy ? styles.statusDotOk : styles.statusDotWarn} />
            {isHealthy ? "专家团运转正常" : "有异常需关注"}
          </div>
          <button
            type="button"
            className={styles.notifyButton}
            onClick={() => message.info("通知中心可查看全部系统、待办和告警通知。")}
          >
            <BellOutlined />
            <span className={styles.notifyDot} />
          </button>
        </div>
      </header>

      {/* ── Section 2: 运营概览 ── */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>运营概览</p>
        <div className={styles.statsGrid}>
          <article className={styles.statCard}>
            <div className={styles.statIcon} data-tone="primary">⚡</div>
            <p className={styles.statCardLabel}>平台稳定运行</p>
            <p className={styles.statValue} data-tone="primary">
              {platformDays} <span className={styles.statUnit}>天</span>
            </p>
            <p className={styles.statSub}>AI 专家团持续稳定承载企业业务</p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statIcon} data-tone="purple">📋</div>
            <p className={styles.statCardLabel}>累计完成任务</p>
            <p className={styles.statValue} data-tone="purple">
              {cumulativeTaskCount.toLocaleString()} <span className={styles.statUnit}>条</span>
            </p>
            <p className={styles.statSub}>
              今日新增 {completedTaskCount} 条，本月日均 {Math.round(cumulativeTaskCount / 30)} 条
            </p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statIcon} data-tone="success">🕐</div>
            <p className={styles.statCardLabel}>累计节省人力</p>
            <p className={styles.statValue} data-tone="success">
              {savedHours} <span className={styles.statUnit}>小时</span>
            </p>
            <p className={styles.statSub}>
              相当于 {savedPeople} 名员工工作了整整 {savedDays} 天
            </p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statIcon} data-tone="amber">💰</div>
            <p className={styles.statCardLabel}>累计创造价值</p>
            <p className={styles.statValue} data-tone="amber">
              ¥{recoveredValue} <span className={styles.statUnit}>万</span>
            </p>
            <p className={styles.statSub}>年服务费 ¥9.8 万，已回本 {roiPercent}%</p>
          </article>
        </div>
      </section>

      {/* ── Section 3: AI 专家团执行状态 ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeaderTitle}>AI 专家团执行状态</h2>
          <Button
            type="link"
            size="small"
            onClick={() => message.info("管理专家团页面即将上线。")}
          >
            管理专家团 &rarr;
          </Button>
        </div>

        <div className={styles.teamsGrid}>
          {teamData.map((team, teamIndex) => (
            <article key={team.id} className={styles.teamCard}>
              <div className={styles.teamHeader}>
                <div className={styles.teamNameRow}>
                  <div
                    className={styles.teamAvatar}
                    data-tone={teamIndex === 0 ? "primary" : "success"}
                  >
                    {team.icon}
                  </div>
                  <div>
                    <p className={styles.teamName}>{team.name}</p>
                    <p className={styles.teamDesc}>{team.description}</p>
                  </div>
                </div>
                <span className={team.isRunning ? styles.badgeRunning : styles.badgeIdle}>
                  {team.isRunning ? "运行中" : "已暂停"}
                </span>
              </div>

              <div className={styles.teamStatsRow}>
                <div className={styles.teamStat}>
                  <p className={styles.teamStatVal} data-tone="primary">
                    {team.members.length}
                  </p>
                  <p className={styles.teamStatLbl}>AI 专家</p>
                </div>
                <div className={styles.teamStat}>
                  <p className={styles.teamStatVal} data-tone="purple">
                    {team.collaborators.length}
                  </p>
                  <p className={styles.teamStatLbl}>协作成员</p>
                </div>
                <div className={styles.teamStat}>
                  <p className={styles.teamStatVal} data-tone="success">
                    {team.taskCount}
                  </p>
                  <p className={styles.teamStatLbl}>今日任务</p>
                </div>
              </div>

              <div>
                <p className={styles.expertsTitle}>在线专家</p>
                <div className={styles.expertsDots}>
                  {team.members.map(member => (
                    <div key={member.id} className={styles.expertChip}>
                      <span
                        className={styles.chipDot}
                        data-status={CHIP_STATUS_MAP[member.status] ?? "paused"}
                      />
                      {member.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.collabSection}>
                <p className={styles.collabTitle}>正在协作的员工</p>
                <div className={styles.collabRow}>
                  <p className={styles.collabInfo}>
                    共 <strong>{team.collaborators.length} 名员工</strong> 与本专家团协作中
                  </p>
                  <div className={styles.collabAvatars}>
                    {team.collaborators.slice(0, 5).map((u, i) => {
                      const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
                      return (
                        <div
                          key={u.id}
                          className={styles.collabAv}
                          style={{ background: c.bg, color: c.color }}
                        >
                          {u.name.slice(0, 1)}
                        </div>
                      );
                    })}
                    {team.collaborators.length > 5 && (
                      <div className={styles.collabAvMore}>+{team.collaborators.length - 5}</div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Section 4: AI 专家最新动态 ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeaderTitle}>AI 专家最新动态</h2>
          <Button
            type="link"
            size="small"
            onClick={() => message.info("AI 对话页会直接打开老板身份下的专家协作工作区。")}
          >
            去 AI 对话 &rarr;
          </Button>
        </div>

        <div className={styles.activityWrap}>
          {TIMELINE_ENTRIES.map(entry => {
            const emp = employeeMap.get(entry.employeeId);
            return (
              <div key={entry.id} className={styles.activityItem}>
                <div className={styles.activityTimeCol}>
                  <span className={styles.activityTime}>{entry.time}</span>
                </div>
                {emp?.avatarUrl ? (
                  <img className={styles.activityAvatar} src={emp.avatarUrl} alt={emp.name} />
                ) : (
                  <div className={styles.activityAvatarFallback}>{entry.agentLabel.slice(0, 1)}</div>
                )}
                <div className={styles.activityContent}>
                  <p className={styles.activityAgent}>{entry.agentLabel}</p>
                  <p className={styles.activityText}>
                    {entry.segments.map((seg, i) =>
                      seg.tone ? (
                        <strong key={i} data-tone={seg.tone}>
                          {seg.text}
                        </strong>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      ),
                    )}
                    <span className={styles.activityTag} data-tone={entry.tag.tone}>
                      {entry.tag.label}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
