import { useState, useRef, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import {
  BarChartOutlined,
  LineChartOutlined,
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
  ShopOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Input, Row, Dropdown, Badge } from "antd";
import type { MenuProps } from "antd";

import styles from "./FdeOpsInsightsView.module.less";

const { TextArea } = Input;

interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

interface StatCardData {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend: string;
  trendUp: boolean;
}

interface OrgAgentItem {
  id: number;
  icon: string;
  name: string;
  calls: number;
  status: "online" | "offline" | "pending" | "ready";
}

interface OrgUsageData {
  agents: number;
  activeAgents: number;
  deploys: number;
  valueIndex: number;
  items: OrgAgentItem[];
}

// 企业使用详情数据（来自0405.html）
const ORG_USAGE_DETAIL: Record<string, OrgUsageData> = {
  "全部企业": {
    agents: 62,
    activeAgents: 36,
    deploys: 1247,
    valueIndex: 86,
    items: [
      { id: 1, icon: "💬", name: "销售话术助手", calls: 168, status: "online" },
      { id: 7, icon: "📊", name: "每日工作简报", calls: 152, status: "online" },
      { id: 4, icon: "🏢", name: "广州联创CRM集成", calls: 136, status: "online" },
      { id: 16, icon: "📉", name: "供应链风控助手", calls: 118, status: "offline" },
      { id: 11, icon: "📈", name: "季报分析Agent", calls: 96, status: "pending" },
      { id: 14, icon: "🏗️", name: "成都蓉城项目管理", calls: 82, status: "ready" },
    ],
  },
  "广州联创科技": {
    agents: 18,
    activeAgents: 12,
    deploys: 312,
    valueIndex: 96,
    items: [
      { id: 1, icon: "💬", name: "销售话术助手", calls: 128, status: "online" },
      { id: 4, icon: "🏢", name: "广州联创CRM集成", calls: 89, status: "online" },
      { id: 2, icon: "🔔", name: "商机跟进提醒", calls: 56, status: "online" },
      { id: 7, icon: "📊", name: "每日工作简报", calls: 39, status: "online" },
      { id: 6, icon: "🧾", name: "回款预测助手", calls: 24, status: "online" },
    ],
  },
  "深圳鼎盛物流": {
    agents: 14,
    activeAgents: 10,
    deploys: 248,
    valueIndex: 91,
    items: [
      { id: 17, icon: "📦", name: "供应链履约协调", calls: 94, status: "online" },
      { id: 18, icon: "🚚", name: "物流异常处置助手", calls: 71, status: "online" },
      { id: 16, icon: "📉", name: "供应链风控助手", calls: 52, status: "offline" },
      { id: 19, icon: "🧾", name: "对账单核验助手", calls: 31, status: "online" },
      { id: 20, icon: "📡", name: "在途预警助手", calls: 22, status: "online" },
    ],
  },
  "成都蓉城投资": {
    agents: 11,
    activeAgents: 8,
    deploys: 186,
    valueIndex: 86,
    items: [
      { id: 14, icon: "🏗️", name: "成都蓉城项目管理", calls: 73, status: "ready" },
      { id: 11, icon: "📈", name: "季报分析Agent", calls: 48, status: "pending" },
      { id: 21, icon: "📊", name: "经营分析助理", calls: 37, status: "online" },
      { id: 22, icon: "⚖️", name: "合同合规顾问", calls: 28, status: "online" },
      { id: 23, icon: "🗂️", name: "投资档案助手", calls: 19, status: "online" },
    ],
  },
  "杭州云谷科技": {
    agents: 9,
    activeAgents: 7,
    deploys: 143,
    valueIndex: 82,
    items: [
      { id: 24, icon: "🛠️", name: "研发需求拆解助手", calls: 51, status: "online" },
      { id: 25, icon: "📋", name: "测试用例生成器", calls: 39, status: "online" },
      { id: 26, icon: "🧠", name: "知识库问答助理", calls: 31, status: "online" },
      { id: 27, icon: "📬", name: "客户工单分流助手", calls: 22, status: "online" },
      { id: 28, icon: "🖥️", name: "发布巡检助手", calls: 18, status: "online" },
    ],
  },
  "北京智汇科技": {
    agents: 8,
    activeAgents: 6,
    deploys: 127,
    valueIndex: 79,
    items: [
      { id: 29, icon: "🧮", name: "财务对账助手", calls: 44, status: "online" },
      { id: 30, icon: "📚", name: "培训知识教练", calls: 33, status: "online" },
      { id: 31, icon: "🧾", name: "发票识别助手", calls: 28, status: "online" },
      { id: 32, icon: "📌", name: "OKR跟踪助手", calls: 22, status: "online" },
      { id: 33, icon: "🧑‍🏫", name: "新人带教助手", calls: 16, status: "online" },
    ],
  },
  "上海融创集团": {
    agents: 7,
    activeAgents: 5,
    deploys: 98,
    valueIndex: 76,
    items: [
      { id: 34, icon: "📑", name: "投标文件生成器", calls: 36, status: "online" },
      { id: 35, icon: "🔎", name: "尽调分析助手", calls: 24, status: "online" },
      { id: 36, icon: "📊", name: "周报汇总助手", calls: 21, status: "online" },
      { id: 37, icon: "🤝", name: "客户接待助手", calls: 17, status: "online" },
      { id: 38, icon: "🧠", name: "知识沉淀助手", calls: 12, status: "online" },
    ],
  },
  "武汉长江物流": {
    agents: 5,
    activeAgents: 4,
    deploys: 76,
    valueIndex: 71,
    items: [
      { id: 39, icon: "🚛", name: "运力调度助手", calls: 27, status: "online" },
      { id: 40, icon: "📦", name: "仓配协同助手", calls: 19, status: "online" },
      { id: 41, icon: "🛰️", name: "轨迹监控助手", calls: 17, status: "online" },
      { id: 42, icon: "⚠️", name: "异常预警助手", calls: 13, status: "online" },
      { id: 43, icon: "📞", name: "司机沟通助手", calls: 9, status: "online" },
    ],
  },
  "西安丝路科技": {
    agents: 4,
    activeAgents: 3,
    deploys: 57,
    valueIndex: 68,
    items: [
      { id: 44, icon: "🧭", name: "项目导航助手", calls: 19, status: "online" },
      { id: 45, icon: "📁", name: "文档归档助手", calls: 15, status: "online" },
      { id: 46, icon: "🔐", name: "权限巡检助手", calls: 13, status: "online" },
      { id: 47, icon: "📝", name: "周会纪要助手", calls: 10, status: "online" },
      { id: 48, icon: "📌", name: "任务提醒助手", calls: 7, status: "online" },
    ],
  },
};

// 状态标签映射
const STATUS_MAP: Record<string, { text: string; color: string }> = {
  online: { text: "已上架", color: "#10b981" },
  offline: { text: "已下架", color: "#6b7280" },
  pending: { text: "待审核", color: "#f59e0b" },
  ready: { text: "待上架", color: "#3b82f6" },
};

// 企业价值排行榜基础数据（来自0405.html）
const ORG_RANK_BASE = [
  { name: "广州联创科技", agents: 18, activeAgents: 12, deploys: 312, valueIndex: 96 },
  { name: "深圳鼎盛物流", agents: 14, activeAgents: 10, deploys: 248, valueIndex: 91 },
  { name: "成都蓉城投资", agents: 11, activeAgents: 8, deploys: 186, valueIndex: 86 },
  { name: "杭州云谷科技", agents: 9, activeAgents: 7, deploys: 143, valueIndex: 82 },
  { name: "北京智汇科技", agents: 8, activeAgents: 6, deploys: 127, valueIndex: 79 },
  { name: "上海融创集团", agents: 7, activeAgents: 5, deploys: 98, valueIndex: 76 },
  { name: "武汉长江物流", agents: 5, activeAgents: 4, deploys: 76, valueIndex: 71 },
  { name: "西安丝路科技", agents: 4, activeAgents: 3, deploys: 57, valueIndex: 68 },
  { name: "苏州新曜制造", agents: 4, activeAgents: 3, deploys: 44, valueIndex: 64 },
  { name: "青岛海岳零售", agents: 3, activeAgents: 2, deploys: 38, valueIndex: 61 },
];

// 时间范围选项（来自0405.html）
const ORG_RANGE_OPTIONS = [
  { value: "all", label: "全部", factor: 1.18 },
  { value: "3d", label: "近三天", factor: 0.24 },
  { value: "7d", label: "近一周", factor: 0.38 },
  { value: "1m", label: "近一个月", factor: 0.56 },
  { value: "3m", label: "近三月", factor: 0.82 },
  { value: "1y", label: "近一年", factor: 1 },
];

/**
 * 运营洞察页面
 * 整合自 0405.html 的运营洞察模块
 */
export const FdeOpsInsightsView = (): JSX.Element => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      content:
        "你好，我是运营专家Agent。你可以直接问我企业覆盖、企业激活、价值排行、上架变化、调用趋势、风险复核重点等运营问题。",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string>("全部企业");
  const [rankRange, setRankRange] = useState<string>("7d");
  const [chartMetric, setChartMetric] = useState<string>("publish");
  const [chartGranularity, setChartGranularity] = useState<string>("week");
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // 当前选中的企业数据
  const currentOrgData = ORG_USAGE_DETAIL[selectedOrg] || ORG_USAGE_DETAIL["全部企业"];

  // 根据时间范围计算排行榜数据
  const rankData = useMemo(() => {
    const factor = ORG_RANGE_OPTIONS.find(opt => opt.value === rankRange)?.factor || 0.38;
    return ORG_RANK_BASE.map(org => ({
      ...org,
      valueIndex: Math.round(org.valueIndex * factor * 10) / 10,
    })).sort((a, b) => b.valueIndex - a.valueIndex);
  }, [rankRange]);

  // 图表指标配置（来自0405.html）
  const chartMetrics = [
    { key: "publish", label: "Agent上架数趋势", icon: "📈", color: "#818cf8", seriesKey: "publish" },
    { key: "authorization", label: "Agent授权数", icon: "🔑", color: "#f59e0b", seriesKey: "coveragePulls" },
    { key: "tenants", label: "服务租户数", icon: "🏢", color: "#34d399", seriesKey: "coverageOrgs" },
    { key: "calls", label: "Agent调用趋势", icon: "📞", color: "#6366f1", seriesKey: "calls" },
  ];

  // 图表数据（来自0405.html）
  const chartSeriesData: Record<string, Record<string, { labels: string[]; values: number[] }>> = {
    publish: {
      day: { labels: ["4/10", "4/11", "4/12", "4/13", "4/14", "4/15", "4/16"], values: [3, 4, 2, 5, 6, 4, 7] },
      week: { labels: ["W11", "W12", "W13", "W14", "W15", "W16"], values: [8, 12, 10, 14, 11, 17] },
      month: { labels: ["11月", "12月", "1月", "2月", "3月", "4月"], values: [16, 22, 19, 25, 28, 34] },
    },
    coveragePulls: {
      day: { labels: ["4/10", "4/11", "4/12", "4/13", "4/14", "4/15", "4/16"], values: [42, 46, 44, 51, 56, 54, 63] },
      week: { labels: ["W11", "W12", "W13", "W14", "W15", "W16"], values: [186, 204, 221, 248, 276, 312] },
      month: { labels: ["11月", "12月", "1月", "2月", "3月", "4月"], values: [96, 128, 166, 204, 258, 312] },
    },
    coverageOrgs: {
      day: { labels: ["4/10", "4/11", "4/12", "4/13", "4/14", "4/15", "4/16"], values: [12, 13, 14, 15, 16, 18, 19] },
      week: { labels: ["W11", "W12", "W13", "W14", "W15", "W16"], values: [18, 19, 21, 23, 25, 28] },
      month: { labels: ["11月", "12月", "1月", "2月", "3月", "4月"], values: [8, 11, 14, 18, 23, 28] },
    },
    calls: {
      day: { labels: ["4/10", "4/11", "4/12", "4/13", "4/14", "4/15", "4/16"], values: [182, 196, 188, 210, 238, 226, 251] },
      week: { labels: ["W11", "W12", "W13", "W14", "W15", "W16"], values: [920, 1015, 978, 1128, 1186, 1247] },
      month: { labels: ["11月", "12月", "1月", "2月", "3月", "4月"], values: [2860, 3120, 3380, 3615, 4020, 4388] },
    },
  };

  // 当前选中的指标
  const currentMetric = chartMetrics.find(m => m.key === chartMetric) || chartMetrics[0];

  // 获取当前图表数据
  const currentChartData = useMemo(() => {
    const seriesKey = currentMetric.seriesKey;
    return chartSeriesData[seriesKey]?.[chartGranularity] || chartSeriesData.publish.week;
  }, [currentMetric, chartGranularity]);

  // 统计卡片数据
  const statCards: StatCardData[] = [
    {
      icon: <RobotOutlined />,
      value: 90,
      label: "全部 Agent",
      trend: "本月新增 12",
      trendUp: true,
    },
    {
      icon: <ShopOutlined />,
      value: 62,
      label: "已上架",
      trend: "较上月 +8",
      trendUp: true,
    },
    {
      icon: <BarChartOutlined />,
      value: 28,
      label: "服务企业",
      trend: "本月新增 2",
      trendUp: true,
    },
    {
      icon: <LineChartOutlined />,
      value: "1,247",
      label: "累计分发",
      trend: "本月 +186",
      trendUp: true,
    },
    {
      icon: <MessageOutlined />,
      value: "4,826",
      label: "累计调用次数",
      trend: "本月 +372",
      trendUp: true,
    },
  ];

  // 快捷问题
  const quickQuestions = [
    "近一周哪些企业价值最高？",
    "当前最需要关注的风险点是什么？",
    "平台调用增长主要来自哪里？",
    "本月上架变化怎么样？",
  ];

  // 企业筛选下拉菜单项
  const orgMenuItems: MenuProps["items"] = Object.entries(ORG_USAGE_DETAIL).map(([name, data]) => ({
    key: name,
    label: (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span>{name}</span>
        <span style={{ color: "#6b7280", fontSize: 12 }}>{data.deploys} 次</span>
      </div>
    ),
  }));

  // 自动滚动到底部
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // 添加用户消息
    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue,
    };
    setChatMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // 模拟 Agent 回复
    setTimeout(() => {
      const agentReply: ChatMessage = {
        role: "agent",
        content: `收到您的问题："${userMessage.content}"

根据当前运营数据分析：
• 近一周最活跃的企业是"广州联创科技"，调用量增长 45%
• 风险点主要集中在"合同审查助手"Agent 的响应延迟
• 建议关注：API 调用配额使用情况

如需更详细的分析，请告诉我具体想了解哪个维度。`,
      };
      setChatMessages(prev => [...prev, agentReply]);
    }, 1000);
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  const handleOrgSelect: MenuProps["onClick"] = ({ key }) => {
    setSelectedOrg(key);
  };

  return (
    <div className={styles.root}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        运营总览 · 聚焦分发效率、调用活跃与企业覆盖
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} className={styles.statRow}>
        {statCards.map((card, index) => (
          <Col span={index === 0 ? 5 : 4} key={index}>
            <Card className={styles.statCard} bordered={false}>
              <div className={styles.statIcon}>{card.icon}</div>
              <div className={styles.statValue}>{card.value}</div>
              <div className={styles.statLabel}>{card.label}</div>
              <div
                className={
                  card.trendUp ? styles.statTrendUp : styles.statTrendDown
                }
              >
                ↑ {card.trend}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 运营专家 Agent 对话 */}
      <Card className={styles.chatCard} bordered={false}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>
            <RobotOutlined /> 运营专家Agent
          </div>
          <div className={styles.chatDesc}>
            直接提问平台运营情况，系统将基于当前页面内的上架、分发、调用、企业覆盖与风险信息返回运营反馈。
          </div>
        </div>

        <div className={styles.chatWindow} ref={chatWindowRef}>
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? styles.chatMessageUser
                  : styles.chatMessageAgent
              }
            >
              <div className={styles.chatRole}>
                {msg.role === "user" ? "用户" : "运营专家Agent"}
              </div>
              <div className={styles.chatContent}>{msg.content}</div>
            </div>
          ))}
        </div>

        <div className={styles.chatInputArea}>
          <TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="例如：近一周哪些企业分发最活跃？当前最需要关注的风险点是什么？"
            autoSize={{ minRows: 3, maxRows: 5 }}
            className={styles.chatInput}
            onPressEnter={e => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            className={styles.sendBtn}
          >
            发送
          </Button>
        </div>

        <div className={styles.quickQuestions}>
          {quickQuestions.map((q, index) => (
            <span
              key={index}
              className={styles.quickQuestionTag}
              onClick={() => handleQuickQuestion(q)}
            >
              {q}
            </span>
          ))}
        </div>
      </Card>

      {/* 趋势图表区域 */}
      <Card
        className={styles.chartCard}
        bordered={false}
        title={
          <div className={styles.chartHeader}>
            <span>{currentMetric.icon} {currentMetric.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* 指标切换标签 */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f3f4f6", padding: "2px", borderRadius: 6 }}>
                {chartMetrics.map(metric => (
                  <button
                    key={metric.key}
                    type="button"
                    onClick={() => setChartMetric(metric.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: "pointer",
                      border: "none",
                      whiteSpace: "nowrap",
                      background: chartMetric === metric.key ? "#fff" : "transparent",
                      color: chartMetric === metric.key ? "#4f46e5" : "#6b7280",
                      fontWeight: chartMetric === metric.key ? 600 : 400,
                      boxShadow: chartMetric === metric.key ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
              {/* 时间粒度切换 */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[
                  { key: "day", label: "日" },
                  { key: "week", label: "周" },
                  { key: "month", label: "月" },
                ].map(g => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setChartGranularity(g.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: "pointer",
                      border: "1px solid",
                      background: chartGranularity === g.key ? "#4f46e5" : "#fff",
                      color: chartGranularity === g.key ? "#fff" : "#6b7280",
                      borderColor: chartGranularity === g.key ? "#4f46e5" : "#e5e7eb",
                      fontWeight: chartGranularity === g.key ? 600 : 400,
                      transition: "all 0.2s",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div className={styles.chartPlaceholder}>
          <div className={styles.chartMock}>
            <DynamicChart data={currentChartData} color={currentMetric.color} />
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: currentMetric.color }} />
                {currentMetric.label}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 企业数据区域 */}
      <Row gutter={16} className={styles.enterpriseRow}>
        <Col span={12}>
          <Card
            className={styles.enterpriseCard}
            bordered={false}
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>🏢 企业 Agent 使用详情</span>
                <Dropdown
                  menu={{ items: orgMenuItems, onClick: handleOrgSelect }}
                  placement="bottomRight"
                  trigger={["click"]}
                >
                  <Button size="small" style={{ fontSize: 12 }}>
                    {selectedOrg} <DownOutlined />
                  </Button>
                </Dropdown>
              </div>
            }
          >
            <Row gutter={16} className={styles.enterpriseStats}>
              <Col span={12}>
                <div className={styles.enterpriseStatItem} style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.15)" }}>
                  <div className={styles.enterpriseStatValue} style={{ color: "#818cf8" }}>{currentOrgData.agents}</div>
                  <div className={styles.enterpriseStatLabel}>已覆盖 Agent</div>
                </div>
              </Col>
              <Col span={12}>
                <div className={styles.enterpriseStatItem} style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.15)" }}>
                  <div className={styles.enterpriseStatValue} style={{ color: "#34d399" }}>{currentOrgData.activeAgents}</div>
                  <div className={styles.enterpriseStatLabel}>活跃 Agent 数</div>
                </div>
              </Col>
              <Col span={12}>
                <div className={styles.enterpriseStatItem} style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.15)" }}>
                  <div className={styles.enterpriseStatValue} style={{ color: "#fbbf24" }}>{currentOrgData.deploys}</div>
                  <div className={styles.enterpriseStatLabel}>近30天调用量</div>
                </div>
              </Col>
              <Col span={12}>
                <div className={styles.enterpriseStatItem} style={{ background: "rgba(236,72,153,.08)", border: "1px solid rgba(236,72,153,.15)" }}>
                  <div className={styles.enterpriseStatValue} style={{ color: "#f472b6" }}>{currentOrgData.valueIndex}</div>
                  <div className={styles.enterpriseStatLabel}>企业价值指数</div>
                </div>
              </Col>
            </Row>

            {/* Agent 列表 */}
            <div style={{ marginTop: 16 }}>
              {currentOrgData.items.map(item => {
                const status = STATUS_MAP[item.status];
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      background: "#f9fafb",
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      border: "1px solid transparent",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.borderColor = "rgba(99,102,241,.18)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ flex: 1, color: "#111827", fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: "#6b7280" }}>{item.calls} 次</span>
                    <Badge
                      text={status.text}
                      style={{
                        backgroundColor: `${status.color}20`,
                        color: status.color,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            className={styles.enterpriseCard}
            bordered={false}
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>🏆 企业价值排行榜TOP10</span>
                <Dropdown
                  menu={{
                    items: ORG_RANGE_OPTIONS.map(opt => ({
                      key: opt.value,
                      label: opt.label,
                    })),
                    onClick: ({ key }) => setRankRange(key),
                  }}
                  placement="bottomRight"
                  trigger={["click"]}
                >
                  <Button size="small" style={{ fontSize: 12 }}>
                    {ORG_RANGE_OPTIONS.find(opt => opt.value === rankRange)?.label || "近一周"} <DownOutlined />
                  </Button>
                </Dropdown>
              </div>
            }
          >
            <div className={styles.rankList}>
              {rankData.map((item, index) => (
                <div key={index} className={styles.rankItem}>
                  <span className={styles.rankNumber}>{index + 1}</span>
                  <span className={styles.rankName}>{item.name}</span>
                  <span className={styles.rankValue}>{item.valueIndex.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// 动态图表组件
interface DynamicChartProps {
  data: { labels: string[]; values: number[] };
  color: string;
}

const DynamicChart = ({ data, color }: DynamicChartProps): JSX.Element => {
  const { labels, values } = data;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  // 计算点的坐标
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 800;
    const y = 180 - ((value - minValue) / range) * 160; // 留出边距
    return { x, y, value, label: labels[index] };
  });

  // 生成平滑曲线路径
  const generatePath = () => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M${points[0].x},${points[0].y}`;

    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.3;
      const cpy1 = prev.y;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.7;
      const cpy2 = curr.y;
      path += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
    }
    return path;
  };

  // 生成填充区域路径
  const generateAreaPath = () => {
    const linePath = generatePath();
    if (!linePath) return "";
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    return `${linePath} L${lastPoint.x},200 L${firstPoint.x},200 Z`;
  };

  return (
    <div className={styles.chartLine} style={{ position: "relative" }}>
      <svg viewBox="0 0 800 220" className={styles.chartSvg}>
        <defs>
          <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 填充区域 */}
        <path
          d={generateAreaPath()}
          fill={`url(#gradient-${color.replace("#", "")})`}
        />

        {/* 折线 */}
        <path
          d={generatePath()}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />

        {/* 数据点和数值标签 */}
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="4" fill={color} />
            {/* 数值标签 */}
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#374151"
            >
              {point.value}
            </text>
          </g>
        ))}
      </svg>

      {/* X轴标签 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0 20px",
        marginTop: "-20px",
        fontSize: "11px",
        color: "#6b7280",
      }}>
        {labels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
};
