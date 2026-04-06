import { useMemo, useState } from "react";

import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Modal, Tag } from "antd";

import styles from "./FdeSkillMarketView.module.less";

// Skill 类型
type SkillType = "workflow" | "skill" | "model" | "tool";
type SkillTab = "public" | "mine" | "mcp";
type Visibility = "仅自己可见" | "公开" | "团队";

interface Skill {
  id: string;
  name: string;
  version: string;
  type: SkillType;
  tags: string[];
  iconColor: string;
  iconText: string;
  publisher: string;
  publishTime: string;
  desc: string;
  tab: SkillTab;
  visibility?: Visibility;
}

// 模拟数据 - 来自 0405.html
const SKILLS: Skill[] = [
  {
    id: "skill-001",
    name: "电商商品上架流程",
    version: "v2.1.0",
    type: "workflow",
    tags: ["生产", "电商"],
    iconColor: "#667eea",
    iconText: "电",
    publisher: "Frontis 官方",
    publishTime: "2026-03-28",
    desc: "自动化商品信息采集、图片处理、SKU 生成和多平台同步上架的端到端 workflow，支持淘宝、京东、拼多多等主流电商平台。",
    tab: "public",
  },
  {
    id: "skill-002",
    name: "智能文案生成",
    version: "v3.0.1",
    type: "skill",
    tags: ["营销", "创作"],
    iconColor: "#f5576c",
    iconText: "文",
    publisher: "Frontis 官方",
    publishTime: "2026-03-25",
    desc: "基于大语言模型的营销文案自动生成能力，支持小红书种草文、公众号长文、短视频脚本等多种文体风格。",
    tab: "public",
  },
  {
    id: "skill-003",
    name: "GPT-4o 文本模型",
    version: "v1.0.0",
    type: "model",
    tags: ["通用", "对话"],
    iconColor: "#11998e",
    iconText: "G",
    publisher: "Frontis 官方",
    publishTime: "2026-03-20",
    desc: "OpenAI GPT-4o 多模态大语言模型封装，支持文本理解、生成、推理等通用 NLP 任务，上下文窗口 128K。",
    tab: "public",
  },
  {
    id: "skill-004",
    name: "客户投诉处理流程",
    version: "v1.3.0",
    type: "workflow",
    tags: ["客服", "生产"],
    iconColor: "#764ba2",
    iconText: "投",
    publisher: "张伟",
    publishTime: "2026-03-18",
    desc: "涵盖投诉受理、分类分级、自动派单、处理跟踪和满意度回访全流程的 workflow，集成企业微信和工单系统。",
    tab: "public",
  },
  {
    id: "skill-005",
    name: "数据分析助手",
    version: "v2.0.0",
    type: "skill",
    tags: ["分析", "数据"],
    iconColor: "#4facfe",
    iconText: "数",
    publisher: "Frontis 官方",
    publishTime: "2026-03-15",
    desc: "支持自然语言查询 SQL 数据库，自动生成可视化图表和分析报告，兼容 MySQL、PostgreSQL、ClickHouse。",
    tab: "public",
  },
  {
    id: "skill-006",
    name: "Whisper 语音识别",
    version: "v1.2.0",
    type: "model",
    tags: ["语音", "识别"],
    iconColor: "#38ef7d",
    iconText: "W",
    publisher: "Frontis 官方",
    publishTime: "2026-03-12",
    desc: "基于 OpenAI Whisper 的高精度语音识别模型，支持中英日韩等 50+ 种语言的实时和离线转写。",
    tab: "public",
  },
  {
    id: "skill-007",
    name: "内容审核自动化",
    version: "v1.5.0",
    type: "workflow",
    tags: ["安全", "合规"],
    iconColor: "#434343",
    iconText: "审",
    publisher: "李明",
    publishTime: "2026-03-10",
    desc: "多模态内容安全审核流程，涵盖文本敏感词、图片违规、视频截帧审核，支持自定义审核规则。",
    tab: "public",
  },
  {
    id: "skill-008",
    name: "多语言翻译引擎",
    version: "v2.4.0",
    type: "skill",
    tags: ["翻译", "国际化"],
    iconColor: "#00f2fe",
    iconText: "译",
    publisher: "Frontis 官方",
    publishTime: "2026-03-08",
    desc: "企业级多语言翻译能力，支持术语库对齐、记忆库匹配，确保专业领域翻译的一致性和准确性。",
    tab: "public",
  },
  {
    id: "skill-009",
    name: "DALL-E 图像生成",
    version: "v1.0.0",
    type: "model",
    tags: ["设计", "图像"],
    iconColor: "#a18cd1",
    iconText: "D",
    publisher: "Frontis 官方",
    publishTime: "2026-03-05",
    desc: "基于 DALL-E 3 的文生图模型封装，支持高分辨率图片生成、风格迁移和局部编辑。",
    tab: "public",
  },
  {
    id: "skill-010",
    name: "销售线索评分",
    version: "v1.1.0",
    type: "skill",
    tags: ["营销", "销售"],
    iconColor: "#f093fb",
    iconText: "销",
    publisher: "王芳",
    publishTime: "2026-03-02",
    desc: "基于历史成交数据和行为特征的线索智能评分模型，帮助销售团队优先跟进高价值线索。",
    tab: "public",
  },
  {
    id: "mcp-001",
    name: "Browser Automation MCP",
    version: "v1.0.0",
    type: "tool",
    tags: ["浏览器", "自动化"],
    iconColor: "#1677ff",
    iconText: "B",
    publisher: "Frontis 官方",
    publishTime: "2026-03-29",
    desc: "面向网页操作场景的 MCP 工具，可用于页面打开、点击、表单提交与结果抓取。",
    tab: "mcp",
  },
  {
    id: "mcp-002",
    name: "Search MCP Server",
    version: "v1.2.0",
    type: "tool",
    tags: ["检索", "连接器"],
    iconColor: "#13c2c2",
    iconText: "S",
    publisher: "Frontis 官方",
    publishTime: "2026-03-31",
    desc: "提供 MCP Server 与 Tool 的发现、搜索和基础连接能力，适合工具市场统一接入。",
    tab: "mcp",
  },
  {
    id: "mcp-003",
    name: "Database Query MCP",
    version: "v1.1.0",
    type: "tool",
    tags: ["数据库", "SQL"],
    iconColor: "#722ed1",
    iconText: "D",
    publisher: "数据平台组",
    publishTime: "2026-03-27",
    desc: "支持只读查询、参数化执行与结果结构化返回的数据库 MCP 工具。",
    tab: "mcp",
  },
  {
    id: "skill-mine-001",
    name: "智能排班引擎",
    version: "v1.4.0",
    type: "skill",
    tags: ["生产", "调度"],
    iconColor: "#764ba2",
    iconText: "排",
    publisher: "我",
    publishTime: "2026-03-27",
    desc: "根据员工技能、工作偏好和法规约束自动生成最优排班方案，支持轮班制和弹性工时。",
    tab: "mine",
    visibility: "仅自己可见",
  },
  {
    id: "skill-mine-002",
    name: "知识库问答",
    version: "v2.0.0",
    type: "skill",
    tags: ["知识", "客服"],
    iconColor: "#4facfe",
    iconText: "知",
    publisher: "我",
    publishTime: "2026-03-24",
    desc: "基于企业知识库的 RAG 问答能力，支持文档上传、自动分块、向量检索和精准回答。",
    tab: "mine",
    visibility: "公开",
  },
  {
    id: "skill-mine-003",
    name: "合同审核流程",
    version: "v1.0.0",
    type: "workflow",
    tags: ["法务", "合规"],
    iconColor: "#434343",
    iconText: "合",
    publisher: "我",
    publishTime: "2026-03-19",
    desc: "自动提取合同关键条款、对比模板差异、标注风险点，辅助法务团队高效完成合同审核。",
    tab: "mine",
    visibility: "团队",
  },
];

// 类型映射
const typeMap: Record<SkillType, { label: string; className: string }> = {
  workflow: { label: "Workflow", className: styles.typeWorkflow },
  skill: { label: "Skill", className: styles.typeSkill },
  model: { label: "模型", className: styles.typeModel },
  tool: { label: "MCP Tool", className: styles.typeTool },
};

// 可见性映射
const visibilityMap: Record<Visibility, { className: string }> = {
  "仅自己可见": { className: styles.visPrivate },
  公开: { className: styles.visPublic },
  团队: { className: styles.visTeam },
};

interface FdeSkillMarketViewProps {
  onNavigateToAgentDev?: () => void;
}

/**
 * Skill 市场视图。
 * 基于同事版本的新版市场布局接入当前 FDE 开发工作台。
 */
export const FdeSkillMarketView = ({
  onNavigateToAgentDev,
}: FdeSkillMarketViewProps): JSX.Element => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [primaryTab, setPrimaryTab] = useState<"mcp" | "skill">("skill");
  const [subTab, setSubTab] = useState<"public" | "mine">("public");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 当前选中的 tab
  const curSkillTab = primaryTab === "mcp" ? "mcp" : subTab;

  // 过滤 Skill 列表
  const filteredSkills = useMemo(() => {
    let list = SKILLS.filter((s) => s.tab === curSkillTab);
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.desc.toLowerCase().includes(kw) ||
          s.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [curSkillTab, searchKeyword]);

  // 打开详情
  const openDetail = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsDetailModalOpen(true);
  };

  return (
    <div className={styles.root}>
      {/* 搜索框 */}
      <div className={styles.searchBox}>
        <SearchOutlined className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="搜索 Skill、工具名称…"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>

      {/* 页面描述 */}
      <div className={styles.pageDesc}>
        Skill 及工具市场 · 浏览和管理可复用的 Skill、Workflow 和 MCP 工具
      </div>

      {/* 控制栏 */}
      <div className={styles.controlsRow}>
        {/* 主标签 */}
        <div className={styles.marketTabs}>
          <div
            className={`${styles.marketTab} ${
              primaryTab === "mcp" ? styles.marketTabActive : ""
            }`}
            onClick={() => setPrimaryTab("mcp")}
          >
            MCP工具
          </div>
          <div
            className={`${styles.marketTab} ${
              primaryTab === "skill" ? styles.marketTabActive : ""
            }`}
            onClick={() => setPrimaryTab("skill")}
          >
            Skill
          </div>
        </div>

        {/* 子标签 */}
        {primaryTab === "skill" && (
          <div className={styles.subTabs}>
            <div
              className={`${styles.subTab} ${
                subTab === "public" ? styles.subTabActive : ""
              }`}
              onClick={() => setSubTab("public")}
            >
              公共
            </div>
            <div
              className={`${styles.subTab} ${
                subTab === "mine" ? styles.subTabActive : ""
              }`}
              onClick={() => setSubTab("mine")}
            >
              我的
            </div>
          </div>
        )}

        {/* 创建按钮 */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className={styles.createBtn}
          onClick={onNavigateToAgentDev}
        >
          创建Skill
        </Button>
      </div>

      {/* Skill 卡片网格 */}
      {filteredSkills.length === 0 ? (
        <div className={styles.empty}>暂无匹配的 Skill / 工具</div>
      ) : (
        <div className={styles.skillGrid}>
          {filteredSkills.map((skill) => {
            const t = typeMap[skill.type] || {
              label: skill.type,
              className: "",
            };
            return (
              <Card
                key={skill.id}
                className={styles.skillCard}
                bordered={false}
                onClick={() => openDetail(skill)}
              >
                <div className={styles.cardTop}>
                  <div
                    className={styles.skillIcon}
                    style={{ background: skill.iconColor }}
                  >
                    {skill.iconText}
                  </div>
                  <div className={styles.cardMeta}>
                    <div className={styles.cardTitleLine}>
                      {skill.name}
                      <span className={`${styles.typeBadge} ${t.className}`}>
                        {t.label}
                      </span>
                      {skill.tab === "mine" && skill.visibility && (
                        <span
                          className={`${styles.visibilityBadge} ${
                            visibilityMap[skill.visibility]?.className || ""
                          }`}
                        >
                          {skill.visibility}
                        </span>
                      )}
                    </div>
                    <div className={styles.cardVersion}>{skill.version}</div>
                  </div>
                </div>

                <div className={styles.cardDesc}>{skill.desc}</div>

                <div className={styles.cardTags}>
                  {skill.tags.map((tag) => (
                    <span key={tag} className={styles.skillTag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  <span>{skill.publisher}</span>
                  <span>{skill.publishTime}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 详情弹窗 */}
      <Modal
        title={selectedSkill ? `${selectedSkill.name} 详情` : "详情"}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedSkill && (
          <div className={styles.detailContent}>
            <div className={styles.detailHeader}>
              <div
                className={styles.skillIcon}
                style={{ background: selectedSkill.iconColor }}
              >
                {selectedSkill.iconText}
              </div>
              <div>
                <div className={styles.detailTitle}>
                  {selectedSkill.name}
                  <span
                    className={`${styles.typeBadge} ${
                      typeMap[selectedSkill.type]?.className || ""
                    }`}
                  >
                    {typeMap[selectedSkill.type]?.label || selectedSkill.type}
                  </span>
                </div>
                <div className={styles.detailVersion}>
                  {selectedSkill.version}
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>描述</div>
              <div className={styles.detailDesc}>{selectedSkill.desc}</div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>标签</div>
              <div className={styles.detailTags}>
                {selectedSkill.tags.map((tag) => (
                  <span key={tag} className={styles.skillTag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>发布信息</div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>发布者</span>
                <span>{selectedSkill.publisher}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>发布时间</span>
                <span>{selectedSkill.publishTime}</span>
              </div>
              {selectedSkill.tab === "mine" && selectedSkill.visibility && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>可见性</span>
                  <span>{selectedSkill.visibility}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
