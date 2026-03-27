import { useMemo } from "react";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, message } from "antd";

import type {
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebUserItem,
  WorkspaceItem,
} from "../types";
import { getStatusLabel } from "../utils";

import styles from "./BossDashboardView.module.less";

interface BossDashboardViewProps {
  currentUserName?: string;
  dialogueSessions: DialogueSessionItem[];
  employees: EmployeeItem[];
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

interface DashboardMetricItem {
  key: string;
  title: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "accent";
  icon: JSX.Element;
}

interface CrewSummaryItem {
  id: string;
  name: string;
  status: string;
  taskCount: number;
  summary: string;
}

const getGreetingLabel = (): string => {
  const currentHour = new Date().getHours();

  if (currentHour < 6) {
    return "夜深了";
  }

  if (currentHour < 12) {
    return "早上好";
  }

  if (currentHour < 18) {
    return "下午好";
  }

  return "晚上好";
};

const getExecutiveTitle = (currentUserName?: string): string => {
  const normalizedName = currentUserName?.trim();

  if (!normalizedName) {
    return "老板";
  }

  return `${normalizedName.slice(0, 1)}总`;
};

/**
 * 企业老板驾驶舱视图。
 */
export const BossDashboardView = ({
  currentUserName,
  dialogueSessions,
  employees,
  users,
  workspaces,
}: BossDashboardViewProps): JSX.Element => {
  const activeUserCount = useMemo(
    () => users.filter(item => item.status === "active").length,
    [users],
  );
  const onlineWorkspaceCount = useMemo(
    () => workspaces.filter(item => item.status === "online" || item.status === "busy").length,
    [workspaces],
  );
  const completedTaskCount = useMemo(
    () =>
      dialogueSessions.reduce((total, session, index) => {
        const assistantMessageCount = session.messages.filter(
          item => item.role === "assistant",
        ).length;
        return total + assistantMessageCount * 8 + 12 + index;
      }, 0),
    [dialogueSessions],
  );
  const savedHours = useMemo(
    () => Math.round(completedTaskCount * 0.48 + onlineWorkspaceCount * 26),
    [completedTaskCount, onlineWorkspaceCount],
  );
  const roiValue = useMemo(
    () => Math.min(92, 24 + activeUserCount * 6 + employees.length * 4),
    [activeUserCount, employees.length],
  );
  const paybackProgress = useMemo(
    () => Math.min(96, 58 + Math.round(savedHours / 24)),
    [savedHours],
  );
  const averageDialogueLoad = useMemo(
    () =>
      Math.max(
        1,
        Math.round(
          dialogueSessions.reduce((total, item) => total + item.messages.length, 0) /
            Math.max(1, employees.length),
        ),
      ),
    [dialogueSessions, employees.length],
  );
  const metricItems = useMemo<DashboardMetricItem[]>(
    () => [
      {
        hint: "AI 专家团持续承担需求拆解、资料整理和交付跟进",
        icon: <ClockCircleOutlined />,
        key: "runtime",
        title: "平台稳定运行天数",
        tone: "primary",
        value: "128 天",
      },
      {
        hint: `${employees.length} 个 AI 专家处于可调用状态`,
        icon: <RocketOutlined />,
        key: "agents",
        title: "AI 专家数量",
        tone: "accent",
        value: `${employees.length} 个`,
      },
      {
        hint: `今日人均负载 ${averageDialogueLoad} 条消息处理`,
        icon: <CheckCircleOutlined />,
        key: "tasks",
        title: "累计完成任务",
        tone: "success",
        value: completedTaskCount.toLocaleString(),
      },
      {
        hint: `${onlineWorkspaceCount} 台设备在线支撑交付`,
        icon: <ThunderboltOutlined />,
        key: "hours",
        title: "节省人力",
        tone: "warning",
        value: `${savedHours} 小时`,
      },
    ],
    [averageDialogueLoad, completedTaskCount, employees.length, onlineWorkspaceCount, savedHours],
  );
  const crewSummary = useMemo<CrewSummaryItem[]>(
    () =>
      employees.slice(0, 5).map((employee, index) => {
        const relatedSessions = dialogueSessions.filter(item => item.employeeId === employee.id);

        return {
          id: employee.id,
          name: employee.name,
          status: getStatusLabel(employee.status),
          summary: employee.lastAction,
          taskCount: relatedSessions.length * 5 + index * 2 + 6,
        };
      }),
    [dialogueSessions, employees],
  );
  const noticeItems = useMemo(
    () => [
      {
        description: "本周已经有 4 个 AI 专家连续稳定交付，冲刺窗口没有出现新的阻塞告警。",
        title: "经营状态稳定",
      },
      {
        description: "OpenRouter 与 OpenAI 双供应商已连通，模型切换可直接下发到不同专家。",
        title: "模型底座已备份",
      },
      {
        description: "销售战报助手仍处于待激活状态，建议尽快完成边缘设备激活，补足一线数据闭环。",
        title: "边缘节点待补齐",
      },
    ],
    [],
  );

  return (
    <div className={styles.dashboard}>
      <section className={styles.heroCard}>
        <div className={styles.heroMain}>
          <span className={styles.heroEyebrow}>驾驶舱</span>
          <h2 className={styles.heroTitle}>
            {getGreetingLabel()}，{getExecutiveTitle(currentUserName)}
          </h2>
          <p className={styles.heroDescription}>
            今天 AI
            专家团已经替团队扛住了最重的重复劳动，老板现在看到的是经营结果、风险提醒和下一步最值得推动的动作。
          </p>
          <div className={styles.heroTagRow}>
            <span className={styles.heroTag}>活跃成员 {activeUserCount} 人</span>
            <span className={styles.heroTag}>在线设备 {onlineWorkspaceCount} 台</span>
            <span className={styles.heroTag}>本轮对话 {dialogueSessions.length} 个会话</span>
          </div>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.signalCard}>
            <span className={styles.signalLabel}>经营信号</span>
            <strong className={styles.signalValue}>AI 专家团已进入稳态交付</strong>
            <p className={styles.signalDescription}>
              当前运营节奏健康，建议把更多重复协作迁移到群聊和自动化任务里，继续拉高产能密度。
            </p>
          </div>

          <button
            type="button"
            className={styles.noticeButton}
            onClick={() => message.info("老板端通知中心里可以查看全部系统、待办、告警和升级通知。")}
          >
            <NotificationOutlined />
            查看重点通知
          </button>
        </div>
      </section>

      <section className={styles.metricGrid}>
        {metricItems.map(item => (
          <article key={item.key} className={styles.metricCard} data-tone={item.tone}>
            <div className={styles.metricIcon}>{item.icon}</div>
            <div className={styles.metricTitle}>{item.title}</div>
            <div className={styles.metricValue}>{item.value}</div>
            <div className={styles.metricHint}>{item.hint}</div>
          </article>
        ))}
      </section>

      <section className={styles.progressGrid}>
        <article className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div>
              <div className={styles.progressTitle}>投资回报概览</div>
              <div className={styles.progressHint}>
                按当前负载估算，AI 专家团正在持续释放组织产能。
              </div>
            </div>
            <strong className={styles.progressValue}>¥2.8 万</strong>
          </div>
          <div className={styles.progressMeta}>
            年框服务费 ¥9.8 万，已替团队消化重复劳动与返工成本。
          </div>
        </article>

        <article className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div>
              <div className={styles.progressTitle}>投资回报率 ROI</div>
              <div className={styles.progressHint}>
                当前看齐老板视角，只展示能不能继续投、值不值得扩。
              </div>
            </div>
            <strong className={styles.progressValue}>{roiValue}%</strong>
          </div>
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} style={{ width: `${roiValue}%` }} />
          </div>
          <div className={styles.progressMeta}>
            已跑出正向回报，建议继续加配内容、销售和运营场景。
          </div>
        </article>

        <article className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div>
              <div className={styles.progressTitle}>预计回本进度</div>
              <div className={styles.progressHint}>
                综合任务完成量、交付稳定度和设备在线率估算。
              </div>
            </div>
            <strong className={styles.progressValue}>{paybackProgress}%</strong>
          </div>
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} style={{ width: `${paybackProgress}%` }} />
          </div>
          <div className={styles.progressMeta}>只要保持当前使用密度，回本节奏基本已经锁定。</div>
        </article>
      </section>

      <section className={styles.crewSection}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>AI 专家团今日工作汇总</div>
            <div className={styles.sectionDescription}>
              老板只看经营摘要，不需要翻每个会话也能知道谁在产生价值。
            </div>
          </div>
          <Button onClick={() => message.info("AI 对话页会直接打开老板身份下的专家协作工作区。")}>
            去 AI 对话
          </Button>
        </div>

        <div className={styles.crewGrid}>
          {crewSummary.map(item => (
            <article key={item.id} className={styles.crewCard}>
              <div className={styles.crewHeader}>
                <div className={styles.crewName}>{item.name}</div>
                <span className={styles.crewStatus}>{item.status}</span>
              </div>
              <div className={styles.crewTaskCount}>{item.taskCount}</div>
              <div className={styles.crewTaskLabel}>今日任务</div>
              <div className={styles.crewSummary}>{item.summary}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.noticePanel}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>老板提醒</div>
            <div className={styles.sectionDescription}>
              把值得你拍板的事项集中放到一屏里，不让信息埋进操作细节。
            </div>
          </div>
        </div>

        <div className={styles.noticeList}>
          {noticeItems.map(item => (
            <article key={item.title} className={styles.noticeItem}>
              <div className={styles.noticeTitle}>{item.title}</div>
              <div className={styles.noticeDescription}>{item.description}</div>
            </article>
          ))}
        </div>

        <div className={styles.upgradeBanner}>
          <div>
            <div className={styles.upgradeTitle}>升级提醒</div>
            <div className={styles.upgradeDescription}>
              建议优先给销售战报助手补齐设备激活，并把群聊中的高频任务沉淀为自动化模板。
            </div>
          </div>
          <Button
            type="primary"
            onClick={() => message.info("原型阶段先展示老板升级入口，正式版可接采购或扩容流程。")}
          >
            立即处理
          </Button>
        </div>
      </section>
    </div>
  );
};
