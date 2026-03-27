import { useMemo, useState } from "react";

import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { Button, Tag, message } from "antd";

import sharedStyles from "./FrontisWebViews.module.less";
import styles from "./NotificationCenterView.module.less";

type NotificationCategory = "all" | "system" | "todo" | "alert" | "upgrade";

interface NotificationItem {
  id: string;
  category: Exclude<NotificationCategory, "all">;
  title: string;
  summary: string;
  timeLabel: string;
  actionLabel: string;
}

const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    actionLabel: "查看设备",
    category: "alert",
    id: "notice-edge-sales",
    summary: "销售战报助手所在边缘设备仍未激活，线索日报能力还没有恢复。",
    timeLabel: "5 分钟前",
    title: "边缘设备待激活",
  },
  {
    actionLabel: "处理待办",
    category: "todo",
    id: "notice-access-review",
    summary: "新增 3 位成员等待你确认 AI 专家权限分配，涉及产品与内容团队。",
    timeLabel: "今天 17:42",
    title: "成员权限待审批",
  },
  {
    actionLabel: "查看升级",
    category: "upgrade",
    id: "notice-runtime-upgrade",
    summary: "虚拟桌面运行时新增模型热切换能力，可直接对不同专家下发新模型。",
    timeLabel: "今天 15:20",
    title: "运行时能力可升级",
  },
  {
    actionLabel: "查看详情",
    category: "system",
    id: "notice-daily-brief",
    summary: "今日 AI 专家团累计完成 84 个子任务，结果沉淀速度明显快于上周同期。",
    timeLabel: "今天 12:08",
    title: "系统日报已生成",
  },
  {
    actionLabel: "进入群聊",
    category: "todo",
    id: "notice-group-sync",
    summary: "研发群聊里有一条“产品冲刺”的排期待确认，需要老板拍板是否加资源。",
    timeLabel: "今天 10:16",
    title: "群聊中有待拍板事项",
  },
  {
    actionLabel: "查看供应商",
    category: "alert",
    id: "notice-openrouter",
    summary: "OpenRouter 当前处于正常状态，但建议保留 OpenAI-compatible 作为兜底路由。",
    timeLabel: "昨天 18:32",
    title: "模型供应商容灾提醒",
  },
];

const CATEGORY_OPTIONS: Array<{
  key: NotificationCategory;
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "system", label: "系统" },
  { key: "todo", label: "待办" },
  { key: "alert", label: "告警" },
  { key: "upgrade", label: "升级" },
];

const getCategoryLabel = (category: NotificationItem["category"]): string => {
  if (category === "system") {
    return "系统";
  }

  if (category === "todo") {
    return "待办";
  }

  if (category === "alert") {
    return "告警";
  }

  return "升级";
};

const getCategoryActionMessage = (item: NotificationItem): string =>
  `${item.title} 的 "${item.actionLabel}" 入口已在原型中预留，正式版可接到对应业务页面。`;

/**
 * 企业老板通知中心视图。
 */
export const NotificationCenterView = (): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const filteredNotifications = useMemo(
    () =>
      activeCategory === "all"
        ? NOTIFICATION_ITEMS
        : NOTIFICATION_ITEMS.filter(item => item.category === activeCategory),
    [activeCategory],
  );
  const summary = useMemo(
    () => ({
      alert: NOTIFICATION_ITEMS.filter(item => item.category === "alert").length,
      system: NOTIFICATION_ITEMS.filter(item => item.category === "system").length,
      todo: NOTIFICATION_ITEMS.filter(item => item.category === "todo").length,
      upgrade: NOTIFICATION_ITEMS.filter(item => item.category === "upgrade").length,
    }),
    [],
  );

  return (
    <div className={sharedStyles.view}>
      <section className={sharedStyles.heroCard}>
        <div className={sharedStyles.heroContent}>
          <span className={sharedStyles.heroEyebrow}>通知中心</span>
          <h2 className={sharedStyles.heroTitle}>把系统、待办、告警和升级消息放在一个老板入口里</h2>
          <p className={sharedStyles.heroDescription}>
            老板不需要逐页找消息，所有需要拍板、需要关注和值得扩容的信号，都应该沉到这里统一处理。
          </p>
        </div>
        <div className={sharedStyles.summaryGrid}>
          <article className={sharedStyles.summaryCard}>
            <span className={sharedStyles.summaryLabel}>系统通知</span>
            <strong className={sharedStyles.summaryValue}>{summary.system}</strong>
            <span className={sharedStyles.summaryHint}>日报、运行结果与产品更新</span>
          </article>
          <article className={sharedStyles.summaryCard}>
            <span className={sharedStyles.summaryLabel}>待办事项</span>
            <strong className={sharedStyles.summaryValue}>{summary.todo}</strong>
            <span className={sharedStyles.summaryHint}>老板需要确认、分配或拍板的事项</span>
          </article>
          <article className={sharedStyles.summaryCard}>
            <span className={sharedStyles.summaryLabel}>告警与升级</span>
            <strong className={sharedStyles.summaryValue}>{summary.alert + summary.upgrade}</strong>
            <span className={sharedStyles.summaryHint}>设备、模型和容量层面的主动提醒</span>
          </article>
        </div>
      </section>

      <section className={sharedStyles.sectionCard}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <div className={sharedStyles.sectionTitle}>消息分类</div>
            <div className={sharedStyles.sectionDescription}>
              先按类型聚合，再决定哪些需要马上处理，哪些只需要顺手扫一眼。
            </div>
          </div>
        </div>

        <div className={styles.categoryRow}>
          {CATEGORY_OPTIONS.map(item => (
            <button
              key={item.key}
              type="button"
              className={styles.categoryButton}
              data-active={item.key === activeCategory}
              onClick={() => setActiveCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className={sharedStyles.sectionCard}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <div className={sharedStyles.sectionTitle}>消息列表</div>
            <div className={sharedStyles.sectionDescription}>
              共 {filteredNotifications.length} 条消息，按老板决策价值优先展示。
            </div>
          </div>
        </div>

        <div className={styles.notificationList}>
          {filteredNotifications.map(item => (
            <article key={item.id} className={styles.notificationCard}>
              <div className={styles.notificationHeader}>
                <div className={styles.notificationIdentity}>
                  <span className={styles.notificationIcon}>
                    {item.category === "system" ? (
                      <BellOutlined />
                    ) : item.category === "todo" ? (
                      <CheckCircleOutlined />
                    ) : item.category === "alert" ? (
                      <AlertOutlined />
                    ) : (
                      <RocketOutlined />
                    )}
                  </span>
                  <div>
                    <div className={styles.notificationTitle}>{item.title}</div>
                    <div className={styles.notificationTime}>{item.timeLabel}</div>
                  </div>
                </div>
                <Tag bordered={false} className={sharedStyles.lightTag}>
                  {getCategoryLabel(item.category)}
                </Tag>
              </div>

              <div className={styles.notificationSummary}>{item.summary}</div>

              <div className={styles.notificationFooter}>
                <Button onClick={() => message.info(getCategoryActionMessage(item))}>
                  {item.actionLabel}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
