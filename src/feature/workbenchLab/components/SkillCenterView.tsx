import { useCallback, useEffect, useMemo, useState } from "react";

import { DeleteOutlined, FileTextOutlined, ProfileOutlined, SearchOutlined } from "@ant-design/icons";
import { Modal, Popconfirm, message } from "antd";

import { TENANT_PERMISSION_IDS } from "@/constants/tenantRolePermissions";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { loadStoredSkillCenterCategories } from "@/feature/operations/skillCenterCategoryStorage";
import { hasPermission } from "@/utils/tenantRoleAccess";

import styles from "./SkillCenterView.module.less";

// Skill 类型
type SkillType = "workflow" | "skill" | "model" | "tool";
type SkillTab = "public" | "mine" | "mcp";
type Visibility = "仅自己可见" | "公开" | "团队";
type PrimaryCatalogTab = "skill" | "mcp";
type SkillCenterMode = "store" | "team";
type TeamSkillScope = "teamShare" | "mine";
type SkillCategoryFilter = "all" | string;
type McpPublishScope = "organization" | "platform";
type SkillDetailTab = "overview" | "requirements" | "files" | "versions";
type SkillCoreFileKey = "skillMarkdown" | "manifestJson" | "examplesMarkdown";

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

interface SkillCenterViewProps {
  mode?: SkillCenterMode;
}

interface McpPublishFormState {
  name: string;
  version: string;
  endpoint: string;
  category: string;
  scope: McpPublishScope;
  description: string;
}

interface SkillCoreFile {
  key: SkillCoreFileKey;
  name: string;
  description: string;
  content: string;
}

const PRIMARY_CATALOG_TABS: Array<{ key: PrimaryCatalogTab; label: string }> = [
  { key: "skill", label: "Skill" },
  { key: "mcp", label: "MCP" },
];

const TEAM_SKILL_SCOPE_TABS: Array<{ key: TeamSkillScope; label: string }> = [
  { key: "teamShare", label: "团队共享" },
  { key: "mine", label: "我的" },
];

const DEFAULT_MCP_PUBLISH_FORM: McpPublishFormState = {
  name: "",
  version: "v1.0.0",
  endpoint: "",
  category: "通用",
  scope: "organization",
  description: "",
};

const getSkillCategory = (skill: Skill): string => {
  if (skill.tags.some(tag => ["销售", "营销", "电商"].includes(tag))) {
    return "销售";
  }

  if (skill.tags.some(tag => ["生产", "调度"].includes(tag))) {
    return "生产";
  }

  if (skill.tags.some(tag => ["供应链", "库存", "物流"].includes(tag))) {
    return "供应链";
  }

  if (
    skill.tags.some(tag =>
      ["办公协同", "客服", "知识", "法务", "合规", "浏览器", "检索", "数据库"].includes(tag),
    )
  ) {
    return "办公协同";
  }

  if (skill.tags.some(tag => tag.includes("数据") || tag.includes("分析"))) {
    return "办公协同";
  }

  return "通用";
};

const isPlatformSkill = (skill: Skill): boolean =>
  skill.publisher === "Frontis 官方" || skill.publisher === "FrontisAI发布";

const canRemoveSkillItem = (skill: Skill): boolean =>
  skill.tab === "mine" || skill.id.startsWith("mcp-custom-");

const getSkillTypeLabel = (skill: Skill): string => {
  if (skill.tab === "mcp") {
    return "MCP";
  }

  if (skill.type === "workflow") {
    return "Workflow";
  }

  if (skill.type === "model") {
    return "模型能力";
  }

  if (skill.type === "tool") {
    return "工具";
  }

  return "Skill";
};

const getSkillInstallStatus = (skill: Skill, mode: SkillCenterMode): string => {
  if (mode === "store") {
    return skill.tab === "mcp" ? "可接入" : "可安装";
  }

  if (skill.tab === "mine") {
    return skill.visibility ?? "我的";
  }

  return "团队可用";
};

const getSkillCoreFiles = (skill: Skill): SkillCoreFile[] => [
  {
    key: "skillMarkdown",
    name: skill.tab === "mcp" ? "MCP.md" : "SKILL.md",
    description: "定义技能名称、描述、适用场景、输入输出和执行边界。",
    content: [
      `# ${skill.name}`,
      "",
      "## 名称",
      skill.name,
      "",
      "## 描述",
      skill.desc,
      "",
      "## 类型",
      getSkillTypeLabel(skill),
      "",
      "## 适用标签",
      skill.tags.map(tag => `- ${tag}`).join("\n"),
      "",
      "## 使用边界",
      skill.tab === "mcp"
        ? "- 仅在完成 MCP 服务鉴权并确认服务地址可访问后调用。"
        : "- 仅在当前租户具备安装权限且运行环境已启用后执行。",
    ].join("\n"),
  },
  {
    key: "manifestJson",
    name: "manifest.json",
    description: "记录技能元信息、版本、发布方和运行入口。",
    content: JSON.stringify(
      {
        id: skill.id,
        name: skill.name,
        description: skill.desc,
        version: skill.version,
        type: getSkillTypeLabel(skill),
        publisher: skill.publisher,
        category: getSkillCategory(skill),
        tags: skill.tags,
      },
      null,
      2,
    ),
  },
  {
    key: "examplesMarkdown",
    name: "examples.md",
    description: "沉淀示例输入、示例输出和验收要点。",
    content: [
      `# ${skill.name} Examples`,
      "",
      "## 示例输入",
      `请基于当前业务资料执行「${skill.name}」。`,
      "",
      "## 示例输出",
      `输出与「${getSkillCategory(skill)}」场景相关的结构化结果，并保留关键判断依据。`,
      "",
      "## 验收要点",
      "- 结果必须对应用户输入，不生成无来源结论。",
      "- 失败时返回明确原因和下一步处理建议。",
    ].join("\n"),
  },
];

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

/**
 * Skill 与 MCP 资产视图。
 */
export const SkillCenterView = ({ mode = "store" }: SkillCenterViewProps): JSX.Element => {
  const { activeIdentity } = useMockAuth();
  const currentPermissionIds = activeIdentity?.permissionIds ?? [];
  const canPublishMcpOrganization = hasPermission(
    currentPermissionIds,
    TENANT_PERMISSION_IDS.mcpPublishTenant,
  );
  const canPublishMcpPlatform = hasPermission(
    currentPermissionIds,
    TENANT_PERMISSION_IDS.mcpPublishPublic,
  );
  const canPublishMcp = canPublishMcpOrganization || canPublishMcpPlatform;
  const defaultMcpPublishScope: McpPublishScope = canPublishMcpOrganization
    ? "organization"
    : "platform";
  const mcpPublishButtonLabel = canPublishMcpOrganization
    ? canPublishMcpPlatform
      ? "发布 / 上架 MCP"
      : "发布 MCP"
    : "上架 MCP";
  const [searchKeyword, setSearchKeyword] = useState("");
  const [primaryTab, setPrimaryTab] = useState<PrimaryCatalogTab>("skill");
  const [teamScope, setTeamScope] = useState<TeamSkillScope>("teamShare");
  const [activeCategory, setActiveCategory] = useState<SkillCategoryFilter>("all");
  const [skillItems, setSkillItems] = useState<Skill[]>(SKILLS);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [detailTab, setDetailTab] = useState<SkillDetailTab>("overview");
  const [detailFileKey, setDetailFileKey] = useState<SkillCoreFileKey>("skillMarkdown");
  const [isMcpPublishOpen, setIsMcpPublishOpen] = useState(false);
  const [mcpPublishForm, setMcpPublishForm] =
    useState<McpPublishFormState>(DEFAULT_MCP_PUBLISH_FORM);
  const skillCategories = useMemo(
    () =>
      loadStoredSkillCenterCategories()
        .filter(category => category.status === "active")
        .map(category => category.name),
    [],
  );
  const categoryTabs = useMemo(
    () => [
      {
        key: "all",
        label: "全部",
      },
      ...skillCategories.map(category => ({
        key: category,
        label: category,
      })),
    ],
    [skillCategories],
  );
  const publishCategoryOptions = useMemo(
    () => Array.from(new Set(["通用", ...skillCategories])),
    [skillCategories],
  );
  const detailSkillCoreFiles = useMemo(
    () => (detailSkill ? getSkillCoreFiles(detailSkill) : []),
    [detailSkill],
  );
  const activeSkillCoreFile = useMemo(
    () => detailSkillCoreFiles.find(file => file.key === detailFileKey) ?? detailSkillCoreFiles[0],
    [detailFileKey, detailSkillCoreFiles],
  );

  useEffect(() => {
    if (activeCategory === "all") {
      return;
    }

    if (!skillCategories.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, skillCategories]);

  const filteredSkills = useMemo(() => {
    let list = skillItems.filter(skill =>
      primaryTab === "mcp" ? skill.tab === "mcp" : skill.tab !== "mcp",
    );

    if (mode === "store") {
      list = list.filter(skill => isPlatformSkill(skill));
    } else {
      list = list.filter(skill => {
        if (isPlatformSkill(skill)) {
          return false;
        }

        if (teamScope === "mine") {
          return skill.tab === "mine";
        }

        return skill.tab !== "mine";
      });
    }

    if (activeCategory !== "all") {
      list = list.filter(skill => getSkillCategory(skill) === activeCategory);
    }

    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        skill =>
          skill.name.toLowerCase().includes(kw) ||
          skill.desc.toLowerCase().includes(kw) ||
          skill.tags.some(tag => tag.toLowerCase().includes(kw)),
      );
    }
    return list;
  }, [activeCategory, mode, primaryTab, searchKeyword, skillItems, teamScope]);

  const handleOpenMcpPublish = useCallback((): void => {
    if (!canPublishMcp) {
      return;
    }

    setMcpPublishForm({
      ...DEFAULT_MCP_PUBLISH_FORM,
      category: skillCategories[0] ?? DEFAULT_MCP_PUBLISH_FORM.category,
      scope: defaultMcpPublishScope,
    });
    setIsMcpPublishOpen(true);
  }, [canPublishMcp, defaultMcpPublishScope, skillCategories]);

  const handleCloseMcpPublish = useCallback((): void => {
    setIsMcpPublishOpen(false);
  }, []);

  const updateMcpPublishForm = useCallback((updates: Partial<McpPublishFormState>): void => {
    setMcpPublishForm(current => ({
      ...current,
      ...updates,
    }));
  }, []);

  const handleSubmitMcpPublish = useCallback((): void => {
    const trimmedName = mcpPublishForm.name.trim();
    const trimmedVersion = mcpPublishForm.version.trim();
    const trimmedEndpoint = mcpPublishForm.endpoint.trim();
    const trimmedDescription = mcpPublishForm.description.trim();

    if (!trimmedName || !trimmedVersion || !trimmedEndpoint || !trimmedDescription) {
      message.warning("请完整填写 MCP 名称、版本、服务地址和描述");
      return;
    }

    const nextItem: Skill = {
      id: `mcp-custom-${Date.now()}`,
      name: trimmedName,
      version: trimmedVersion,
      type: "tool",
      tags: [mcpPublishForm.category, mcpPublishForm.scope === "platform" ? "平台公开" : "组织内"],
      iconColor: mcpPublishForm.scope === "platform" ? "#0f766e" : "#2563eb",
      iconText: "M",
      publisher:
        mcpPublishForm.scope === "platform"
          ? "FrontisAI发布"
          : (activeIdentity?.tenantName ?? "当前租户"),
      publishTime: new Date().toISOString().slice(0, 10),
      desc: trimmedDescription,
      tab: "mcp",
      visibility: mcpPublishForm.scope === "platform" ? "公开" : "团队",
    };

    setSkillItems(current => [nextItem, ...current]);
    setIsMcpPublishOpen(false);
    setPrimaryTab("mcp");
    setActiveCategory("all");
    message.success(
      mcpPublishForm.scope === "platform" ? "MCP 已上架到商店" : "MCP 已发布到团队资产",
    );
  }, [activeIdentity?.tenantName, mcpPublishForm]);

  const handleRemoveSkill = useCallback((skill: Skill): void => {
    if (!canRemoveSkillItem(skill)) {
      return;
    }

    setSkillItems(current => current.filter(item => item.id !== skill.id));
    message.success(
      skill.tab === "mcp" ? "已从团队资产删除该 MCP。" : "已从团队资产删除该 Skill。",
    );
  }, []);

  const handleOpenSkillDetail = useCallback((skill: Skill): void => {
    setDetailSkill(skill);
    setDetailTab("overview");
    setDetailFileKey("skillMarkdown");
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.primaryToolbar}>
        <div className={styles.categoryFilterBar}>
          <div className={styles.marketTabs} role="tablist" aria-label="技能类型">
            {PRIMARY_CATALOG_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={primaryTab === tab.key}
                className={`${styles.marketTab} ${
                  primaryTab === tab.key ? styles.marketTabActive : ""
                }`}
                onClick={() => setPrimaryTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === "team" ? (
            <div className={styles.categoryTabs} role="tablist" aria-label="技能资产归属">
              {TEAM_SKILL_SCOPE_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={teamScope === tab.key}
                  className={`${styles.categoryTab} ${
                    teamScope === tab.key ? styles.categoryTabActive : ""
                  }`}
                  onClick={() => setTeamScope(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className={styles.categoryTabs} role="tablist" aria-label="技能场景分类">
            {categoryTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeCategory === tab.key}
                className={`${styles.categoryTab} ${
                  activeCategory === tab.key ? styles.categoryTabActive : ""
                }`}
                onClick={() => setActiveCategory(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchBox}>
          <SearchOutlined className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="搜索 Skill、MCP"
            value={searchKeyword}
            onChange={event => setSearchKeyword(event.target.value)}
          />
        </div>

        {mode === "team" && primaryTab === "mcp" && canPublishMcp ? (
          <button type="button" className={styles.publishButton} onClick={handleOpenMcpPublish}>
            {mcpPublishButtonLabel}
          </button>
        ) : null}
      </div>

      {filteredSkills.length === 0 ? (
        <div className={styles.empty}>暂无匹配的 Skill / MCP</div>
      ) : (
        <div className={styles.skillGrid}>
          {filteredSkills.map(skill => (
            <article
              key={skill.id}
              className={styles.skillCard}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenSkillDetail(skill)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  handleOpenSkillDetail(skill);
                }
              }}
            >
              <div className={styles.cardTop}>
                <div className={styles.skillIcon} style={{ background: skill.iconColor }}>
                  {skill.iconText}
                </div>
                <div className={styles.cardMeta}>
                  <div className={styles.skillTitleRow}>
                    <h3 className={styles.cardTitle}>{skill.name}</h3>
                    <span className={styles.skillStatusBadge}>{getSkillInstallStatus(skill, mode)}</span>
                  </div>
                  <p className={styles.cardDesc}>{skill.desc}</p>
                </div>
              </div>

              <div className={styles.skillTagRow}>
                <span>{getSkillTypeLabel(skill)}</span>
                {skill.tags.slice(0, 3).map(tag => (
                  <span key={`${skill.id}-${tag}`}>{tag}</span>
                ))}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.cardFooterMeta}>
                  <span>{skill.publisher}</span>
                  <span>{skill.version}</span>
                  <span>{getSkillCategory(skill)}</span>
                  <span>{skill.publishTime}</span>
                </div>
                {canRemoveSkillItem(skill) ? (
                  <Popconfirm
                    title={skill.tab === "mcp" ? "删除 MCP" : "删除 Skill"}
                    description={
                      skill.tab === "mcp"
                        ? "删除后，该 MCP 将不再显示在团队资产。"
                        : "删除后，该 Skill 将不再显示在团队资产。"
                    }
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleRemoveSkill(skill)}
                  >
                    <button
                      type="button"
                      className={styles.deleteButton}
                      aria-label={skill.tab === "mcp" ? "删除 MCP" : "删除 Skill"}
                      onClick={event => event.stopPropagation()}
                    >
                      <DeleteOutlined />
                      删除
                    </button>
                  </Popconfirm>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(detailSkill)}
        title={null}
        footer={null}
        width={960}
        centered
        destroyOnHidden
        className={styles.skillDetailModal}
        onCancel={() => setDetailSkill(null)}
      >
        {detailSkill ? (
          <div className={styles.skillDetailPanel}>
            <header className={styles.skillDetailHeader}>
              <div className={styles.skillDetailIcon} style={{ background: detailSkill.iconColor }}>
                {detailSkill.iconText}
              </div>
              <div>
                <h2>{detailSkill.name}</h2>
                <p>{detailSkill.desc}</p>
              </div>
            </header>

            <div className={styles.skillDetailBody}>
              <aside className={styles.skillDetailNav} role="tablist" aria-label="技能详情">
                {[
                  { key: "overview", label: "详情" },
                  { key: "requirements", label: detailSkill.tab === "mcp" ? "接入" : "依赖" },
                  { key: "files", label: "核心文件" },
                  { key: "versions", label: "版本" },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === item.key}
                    className={detailTab === item.key ? styles.skillDetailNavActive : ""}
                    onClick={() => setDetailTab(item.key as SkillDetailTab)}
                  >
                    {item.label}
                  </button>
                ))}
              </aside>

              <section className={styles.skillDetailContent}>
                {detailTab === "overview" ? (
                  <div className={styles.skillDetailGrid}>
                    <section className={styles.skillDetailBlock}>
                      <h3>基础信息</h3>
                      <dl className={styles.skillInfoGrid}>
                        <div>
                          <dt>名称</dt>
                          <dd>{detailSkill.name}</dd>
                        </div>
                        <div>
                          <dt>描述</dt>
                          <dd>{detailSkill.desc}</dd>
                        </div>
                        <div>
                          <dt>类型</dt>
                          <dd>{getSkillTypeLabel(detailSkill)}</dd>
                        </div>
                        <div>
                          <dt>状态</dt>
                          <dd>{getSkillInstallStatus(detailSkill, mode)}</dd>
                        </div>
                        <div>
                          <dt>发布方</dt>
                          <dd>{detailSkill.publisher}</dd>
                        </div>
                        <div>
                          <dt>场景分类</dt>
                          <dd>{getSkillCategory(detailSkill)}</dd>
                        </div>
                        <div>
                          <dt>版本</dt>
                          <dd>{detailSkill.version}</dd>
                        </div>
                        <div>
                          <dt>发布时间</dt>
                          <dd>{detailSkill.publishTime}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className={styles.skillDetailBlock}>
                      <h3>标签</h3>
                      <div className={styles.skillDetailTags}>
                        {detailSkill.tags.map(tag => (
                          <span key={`${detailSkill.id}-detail-${tag}`}>{tag}</span>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : detailTab === "requirements" ? (
                  <div className={styles.skillRequirementList}>
                    {[
                      detailSkill.tab === "mcp" ? "服务地址可访问" : "当前租户具备安装权限",
                      detailSkill.tab === "mcp" ? "已完成 MCP Server 鉴权" : "运行环境已启用",
                      "调用日志进入团队资产记录",
                    ].map(item => (
                      <article key={item}>
                        <span>✓</span>
                        <strong>{item}</strong>
                      </article>
                    ))}
                  </div>
                ) : detailTab === "files" ? (
                  <div className={styles.skillFilesPane}>
                    <div className={styles.skillFileTabs}>
                      {detailSkillCoreFiles.map(file => (
                        <button
                          key={file.key}
                          type="button"
                          className={detailFileKey === file.key ? styles.skillFileTabActive : ""}
                          onClick={() => setDetailFileKey(file.key)}
                        >
                          <FileTextOutlined />
                          <span>{file.name}</span>
                        </button>
                      ))}
                    </div>
                    {activeSkillCoreFile ? (
                      <article className={styles.skillFileViewer}>
                        <header>
                          <div>
                            <h3>{activeSkillCoreFile.name}</h3>
                            <p>{activeSkillCoreFile.description}</p>
                          </div>
                        </header>
                        <pre>{activeSkillCoreFile.content}</pre>
                      </article>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.skillVersionList}>
                    {[detailSkill.version, "v1.0.0"].map((version, index) => (
                      <article key={`${detailSkill.id}-${version}-${index}`}>
                        <div>
                          <strong>{version}</strong>
                          <span>{index === 0 ? detailSkill.desc : "首个可用版本。"}</span>
                        </div>
                        <em>{index === 0 ? "当前版本" : "历史版本"}</em>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </Modal>

      {isMcpPublishOpen ? (
        <div className={styles.publishModalMask} role="presentation">
          <div
            className={styles.publishModal}
            role="dialog"
            aria-modal="true"
            aria-label="发布或上架 MCP"
          >
            <div className={styles.publishModalHeader}>
              <h3 className={styles.publishModalTitle}>发布 / 上架 MCP</h3>
              <button
                type="button"
                className={styles.publishModalClose}
                aria-label="关闭 MCP 发布上架弹窗"
                onClick={handleCloseMcpPublish}
              >
                ×
              </button>
            </div>

            <div className={styles.publishFormGrid}>
              <label className={styles.publishField}>
                <span>MCP 名称</span>
                <input
                  value={mcpPublishForm.name}
                  placeholder="例如：订单查询 MCP"
                  onChange={event => updateMcpPublishForm({ name: event.target.value })}
                />
              </label>
              <label className={styles.publishField}>
                <span>版本号</span>
                <input
                  value={mcpPublishForm.version}
                  placeholder="v1.0.0"
                  onChange={event => updateMcpPublishForm({ version: event.target.value })}
                />
              </label>
              <label className={styles.publishField}>
                <span>服务地址</span>
                <input
                  value={mcpPublishForm.endpoint}
                  placeholder="https://mcp.example.com/server"
                  onChange={event => updateMcpPublishForm({ endpoint: event.target.value })}
                />
              </label>
              <label className={styles.publishField}>
                <span>分类</span>
                <select
                  value={mcpPublishForm.category}
                  onChange={event => updateMcpPublishForm({ category: event.target.value })}
                >
                  {publishCategoryOptions.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className={styles.publishScopeGroup}>
              <legend>发布范围</legend>
              {canPublishMcpOrganization ? (
                <label>
                  <input
                    type="radio"
                    name="mcpPublishScope"
                    checked={mcpPublishForm.scope === "organization"}
                    onChange={() => updateMcpPublishForm({ scope: "organization" })}
                  />
                  <span>组织内发布</span>
                </label>
              ) : null}
              {canPublishMcpPlatform ? (
                <label>
                  <input
                    type="radio"
                    name="mcpPublishScope"
                    checked={mcpPublishForm.scope === "platform"}
                    onChange={() => updateMcpPublishForm({ scope: "platform" })}
                  />
                  <span>平台公开上架</span>
                </label>
              ) : null}
            </fieldset>

            <label className={styles.publishField}>
              <span>描述</span>
              <textarea
                value={mcpPublishForm.description}
                rows={4}
                placeholder="说明 MCP 的能力、适用场景和调用边界"
                onChange={event => updateMcpPublishForm({ description: event.target.value })}
              />
            </label>

            <div className={styles.publishModalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleCloseMcpPublish}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSubmitMcpPublish}
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
