import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  LockOutlined,
  UpCircleOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

import type { FrontisWebTabKey } from "../types";

/**
 * 通知分类标识。
 */
export type NotificationCategory = "all" | "system" | "alert" | "todo" | "security" | "upgrade";

/**
 * 可跳转的后台模块。
 */
export type NotificationActionTab = Extract<
  FrontisWebTabKey,
  "organization" | "store"
>;

/**
 * 通知项定义。
 */
export interface NotificationItem {
  id: string;
  category: Exclude<NotificationCategory, "all">;
  title: string;
  summary: string;
  timeLabel: string;
  pinned?: boolean;
  actionLabel?: string;
  actionTab?: NotificationActionTab;
}

/**
 * 通知分类展示元数据。
 */
export interface NotificationCategoryMeta {
  label: string;
  color: string;
  icon: ReactNode;
}

export const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    id: "notice-agent-v21",
    category: "upgrade",
    title: "Agent v2.1 新版本发布",
    summary: "新版本包含多项性能优化和功能增强，建议尽快升级以获得更好的体验。",
    timeLabel: "3小时前",
    pinned: true,
    actionLabel: "立即升级",
    actionTab: "store",
  },
  {
    id: "notice-todo",
    category: "todo",
    title: "待办事项",
    summary: "您有 3 个待处理的审批请求和 2 个待确认的权限申请，请尽快处理。",
    timeLabel: "昨天",
    actionLabel: "去处理",
    actionTab: "organization",
  },
  {
    id: "notice-security",
    category: "security",
    title: "安全通知",
    summary: "检测到您的账号在新设备登录，如非本人操作请立即修改密码。",
    timeLabel: "2天前",
    actionLabel: "查看记录",
    actionTab: "organization",
  },
  {
    id: "notice-system-update",
    category: "system",
    title: "系统更新公告",
    summary: "平台将于本周六 02:00-06:00 进行系统维护升级，届时部分功能可能暂时不可用。",
    timeLabel: "3天前",
    actionLabel: "查看AI专家管理",
    actionTab: "store",
  },
  {
    id: "notice-agent-v20",
    category: "upgrade",
    title: "AI商机洞察专家团 v2.0 发布",
    summary: "全新升级的商机洞察能力，支持多维度线索评分和智能推荐。",
    timeLabel: "1周前",
    actionLabel: "立即升级",
    actionTab: "store",
  },
];

export const CATEGORY_OPTIONS: Array<{ key: NotificationCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "system", label: "系统" },
  { key: "alert", label: "告警" },
  { key: "todo", label: "待办" },
  { key: "security", label: "安全" },
  { key: "upgrade", label: "升级" },
];

export const CATEGORY_META: Record<
  NotificationItem["category"],
  NotificationCategoryMeta
> = {
  system: { label: "系统通知", color: "blue", icon: <BellOutlined /> },
  alert: { label: "告警通知", color: "orange", icon: <AlertOutlined /> },
  todo: { label: "待办通知", color: "purple", icon: <CheckCircleOutlined /> },
  security: { label: "安全通知", color: "red", icon: <LockOutlined /> },
  upgrade: { label: "升级提醒", color: "green", icon: <UpCircleOutlined /> },
};
