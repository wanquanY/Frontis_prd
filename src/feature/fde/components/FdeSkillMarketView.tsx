import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ArrowLeftOutlined,
  ImportOutlined,
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { App as AntdApp, Button, Dropdown, Empty, Form, Input, Modal, Select } from "antd";

import {
  FDE_SKILL_MARKET_ITEMS,
  FDE_SKILL_PRESET_COVERS,
} from "@/feature/fde/mockData";
import type {
  FdeSkillCategoryFilter,
  FdeSkillItem,
  FdeSkillMarketTab,
  FdeSkillType,
} from "@/feature/fde/types";

import styles from "./FdeSkillMarketView.module.less";

/* ─── 常量 ─── */

const MARKET_TABS: Array<{ key: FdeSkillMarketTab; label: string }> = [
  { key: "mcp", label: "MCP工具" },
  { key: "public", label: "通用skill市场" },
  { key: "team", label: "团队共享" },
  { key: "mine", label: "我的skill" },
];

const CATEGORY_FILTERS: Array<{ key: FdeSkillCategoryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "workflow", label: "workflow类" },
  { key: "skill", label: "skill类" },
  { key: "model", label: "模型类" },
  { key: "tool", label: "MCP工具" },
];

const TYPE_LABEL: Record<FdeSkillType, string> = {
  workflow: "Workflow",
  skill: "Skill",
  model: "模型",
  tool: "MCP工具",
};

const VISIBILITY_LABELS: Record<string, string> = {
  public: "公开",
  private: "仅自己可见",
  team: "团队共享",
};

const VISIBILITY_OPTIONS = [
  { label: "公开到skill市场", value: "public" as const },
  { label: "仅自己可见", value: "private" as const },
  { label: "团队内部共享", value: "team" as const },
];

const CATEGORY_OPTIONS = [
  { label: "Workflow类", value: "workflow" as const },
  { label: "Skill类", value: "skill" as const },
  { label: "模型类", value: "model" as const },
];

const CURRENT_USER = "陈蓝";

/* ─── 上传表单 ─── */

interface UploadFormValues {
  name: string;
  version: string;
  type: FdeSkillType;
  visibility: "public" | "private" | "team";
  tags: string;
  description: string;
}

/* ─── 创建菜单 ─── */

const CREATE_MENU_ITEMS = [
  { key: "import", icon: <ImportOutlined />, label: "导入外部技能" },
  { key: "frontis", icon: <ThunderboltOutlined />, label: "用 Frontis 创建" },
];

/* ─── 组件 ─── */

interface FdeSkillMarketViewProps {
  onNavigateToAgentDev?: () => void;
}

export const FdeSkillMarketView = ({
  onNavigateToAgentDev,
}: FdeSkillMarketViewProps): JSX.Element => {
  const { message } = AntdApp.useApp();
  const [activeTab, setActiveTab] = useState<FdeSkillMarketTab>("public");
  const [categoryFilter, setCategoryFilter] = useState<FdeSkillCategoryFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCover, setSelectedCover] = useState(FDE_SKILL_PRESET_COVERS[0].key);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [form] = Form.useForm<UploadFormValues>();

  const visibleCategoryFilters = useMemo(
    () =>
      activeTab === "mcp"
        ? CATEGORY_FILTERS.filter(cat => cat.key === "all" || cat.key === "tool")
        : CATEGORY_FILTERS.filter(cat => cat.key !== "tool"),
    [activeTab],
  );

  /* 过滤 */
  const filteredSkills = useMemo<FdeSkillItem[]>(() => {
    let items = FDE_SKILL_MARKET_ITEMS;

    if (activeTab === "mcp") {
      items = items.filter(s => s.type === "tool");
    } else if (activeTab === "public") {
      items = items.filter(s => s.type !== "tool");
      items = items.filter(s => s.visibility === "public");
    } else if (activeTab === "team") {
      items = items.filter(s => s.type !== "tool");
      items = items.filter(s => s.visibility === "team");
    } else {
      items = items.filter(s => s.type !== "tool");
      items = items.filter(s => s.publisher === CURRENT_USER);
    }

    if (categoryFilter !== "all") {
      items = items.filter(s => s.type === categoryFilter);
    }

    if (keyword.trim()) {
      const lowerKw = keyword.trim().toLowerCase();
      items = items.filter(
        s =>
          s.name.toLowerCase().includes(lowerKw) ||
          s.description.toLowerCase().includes(lowerKw) ||
          s.tags.some(t => t.toLowerCase().includes(lowerKw)),
      );
    }

    return items;
  }, [activeTab, categoryFilter, keyword]);

  const selectedSkill = useMemo<FdeSkillItem | null>(
    () => (selectedSkillId ? FDE_SKILL_MARKET_ITEMS.find(s => s.id === selectedSkillId) ?? null : null),
    [selectedSkillId],
  );

  const isOwnSkill = selectedSkill?.publisher === CURRENT_USER;

  const handleUploadSubmit = useCallback(async () => {
    try {
      await form.validateFields();
      message.success("Skill 上传成功！");
      setIsUploadOpen(false);
      form.resetFields();
      setSelectedCover(FDE_SKILL_PRESET_COVERS[0].key);
    } catch {
      /* validation failed */
    }
  }, [form, message]);

  const handleCreateMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === "import") {
        setIsUploadOpen(true);
      } else if (key === "frontis") {
        onNavigateToAgentDev?.();
      }
    },
    [onNavigateToAgentDev],
  );

  /* ─── 详情页 ─── */
  if (selectedSkill) {
    return (
      <div className={styles.detailRoot}>
        <div className={styles.detailTopBar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setSelectedSkillId(null)}
          >
            <ArrowLeftOutlined /> 返回列表
          </button>

          {isOwnSkill && (
            <Dropdown
              menu={{ items: CREATE_MENU_ITEMS, onClick: handleCreateMenuClick }}
              trigger={["click"]}
            >
              <Button type="primary">
                <PlusOutlined /> 创建新版本
              </Button>
            </Dropdown>
          )}
        </div>

        <div className={styles.detailBody}>
          {/* 左侧：基本信息 */}
          <div className={styles.detailLeft}>
            <div className={styles.detailHeader}>
              <div
                className={styles.detailIconLarge}
                style={{ background: selectedSkill.iconColor }}
              >
                {selectedSkill.iconText}
              </div>
              <div className={styles.detailHeaderInfo}>
                <h2 className={styles.detailName}>{selectedSkill.name}</h2>
                <div className={styles.detailMetaRow}>
                  <span
                    className={classNames(styles.typeBadge, {
                      [styles.typeBadgeWorkflow]: selectedSkill.type === "workflow",
                      [styles.typeBadgeSkill]: selectedSkill.type === "skill",
                      [styles.typeBadgeModel]: selectedSkill.type === "model",
                      [styles.typeBadgeTool]: selectedSkill.type === "tool",
                    })}
                  >
                    {TYPE_LABEL[selectedSkill.type]}
                  </span>
                  <span className={styles.detailVersion}>v{selectedSkill.version}</span>
                </div>
              </div>
            </div>

            <p className={styles.detailDescriptionFull}>{selectedSkill.description}</p>

            <div className={styles.tagList}>
              {selectedSkill.tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className={styles.detailInfoGrid}>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>发布者</span>
                <span className={styles.detailInfoValue}>{selectedSkill.publisher}</span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>发布时间</span>
                <span className={styles.detailInfoValue}>{selectedSkill.publishTime}</span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>可见性</span>
                <span className={styles.detailInfoValue}>
                  <span
                    className={classNames(styles.visibilityBadge, {
                      [styles.visibilityPublic]: selectedSkill.visibility === "public",
                      [styles.visibilityTeam]: selectedSkill.visibility === "team",
                      [styles.visibilityPrivate]: selectedSkill.visibility === "private",
                    })}
                  >
                    {VISIBILITY_LABELS[selectedSkill.visibility]}
                  </span>
                </span>
              </div>
              <div className={styles.detailInfoRow}>
                <span className={styles.detailInfoLabel}>版本数</span>
                <span className={styles.detailInfoValue}>{selectedSkill.versions.length} 个版本</span>
              </div>
            </div>
          </div>

          {/* 右侧：版本时间线 */}
          <div className={styles.detailRight}>
            <div className={styles.versionHeader}>
              <h3 className={styles.versionTitle}>版本历史</h3>
              <span className={styles.versionCount}>共 {selectedSkill.versions.length} 个版本</span>
            </div>

            <div className={styles.versionTimeline}>
              {selectedSkill.versions.map((ver, index) => (
                <div
                  key={ver.version}
                  className={classNames(styles.versionNode, index === 0 && styles.versionNodeLatest)}
                >
                  <div className={styles.versionDot} />
                  <div className={styles.versionNodeCard}>
                    <div className={styles.versionNodeTop}>
                      <span className={styles.versionLabel}>
                        v{ver.version}
                        {index === 0 && <span className={styles.latestTag}>最新</span>}
                      </span>
                      <span className={styles.versionDate}>{ver.publishTime}</span>
                    </div>
                    <p className={styles.versionNote}>{ver.releaseNote}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 上传弹窗（详情页也可触发） */}
        {renderUploadModal()}
      </div>
    );
  }

  /* ─── 列表页 ─── */
  return (
    <div className={styles.root}>
      {/* ─── 顶部栏 ─── */}
      <div className={styles.topBar}>
        <div className={styles.tabList}>
          {MARKET_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={classNames(styles.tabButton, activeTab === tab.key && styles.tabButtonActive)}
              onClick={() => {
                setActiveTab(tab.key);
                setCategoryFilter("all");
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.topActions}>
          <Input
            allowClear
            value={keyword}
            placeholder={activeTab === "mcp" ? "搜索MCP工具..." : "搜索skill..."}
            prefix={<SearchOutlined className={styles.searchIcon} />}
            className={styles.searchInput}
            onChange={e => setKeyword(e.target.value)}
          />

          {(activeTab === "mine" || activeTab === "public") && (
            <Dropdown
              menu={{ items: CREATE_MENU_ITEMS, onClick: handleCreateMenuClick }}
              trigger={["click"]}
            >
              <Button type="primary" className={styles.createDropdown}>
                <PlusOutlined /> 创建skill
              </Button>
            </Dropdown>
          )}
        </div>
      </div>

      {/* ─── 分类筛选 ─── */}
      <div className={styles.filterBar}>
        {visibleCategoryFilters.map(cat => (
          <button
            key={cat.key}
            type="button"
            className={classNames(
              styles.filterPill,
              categoryFilter === cat.key && styles.filterPillActive,
            )}
            onClick={() => setCategoryFilter(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ─── 卡片网格 ─── */}
      {filteredSkills.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description={activeTab === "mcp" ? "暂无匹配的 MCP 工具" : "暂无匹配的 Skill"} />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredSkills.map(skill => (
            <div
              key={skill.id}
              className={styles.skillCard}
              onClick={() => setSelectedSkillId(skill.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedSkillId(skill.id);
                }
              }}
            >
              <div className={styles.cardHeader}>
                <div
                  className={styles.cardIcon}
                  style={{ background: skill.iconColor }}
                >
                  {skill.iconText}
                </div>
                <div className={styles.cardTitleBlock}>
                  <h3 className={styles.cardName}>{skill.name}</h3>
                  <div className={styles.cardMeta}>
                    <span
                      className={classNames(styles.typeBadge, {
                        [styles.typeBadgeWorkflow]: skill.type === "workflow",
                        [styles.typeBadgeSkill]: skill.type === "skill",
                        [styles.typeBadgeModel]: skill.type === "model",
                        [styles.typeBadgeTool]: skill.type === "tool",
                      })}
                    >
                      {TYPE_LABEL[skill.type]}
                    </span>
                    <span>v{skill.version}</span>
                  </div>
                </div>
              </div>

              <p className={styles.cardDescription}>{skill.description}</p>

              <div className={styles.tagList}>
                {skill.tags.map(tag => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
                {activeTab === "team" && skill.isSharedToMe && (
                  <span className={classNames(styles.shareBadge, styles.shareBadgeToMe)}>
                    共享给我
                  </span>
                )}
                {activeTab === "team" && skill.isSharedByMe && (
                  <span className={classNames(styles.shareBadge, styles.shareBadgeByMe)}>
                    我共享的
                  </span>
                )}
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.footerPublisher}>{skill.publisher}</span>
                <span className={styles.footerTime}>{skill.publishTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {renderUploadModal()}
    </div>
  );

  /* ─── 上传弹窗（共用） ─── */
  function renderUploadModal(): JSX.Element {
    return (
      <Modal
        open={isUploadOpen}
        centered
        destroyOnHidden
        width={680}
        title="上传 Skill"
        okText="开始上传"
        cancelText="取消"
        onCancel={() => {
          setIsUploadOpen(false);
          form.resetFields();
          setSelectedCover(FDE_SKILL_PRESET_COVERS[0].key);
        }}
        onOk={() => void handleUploadSubmit()}
      >
        <Form<UploadFormValues>
          form={form}
          layout="vertical"
          requiredMark
          initialValues={{ version: "1.0.0", type: "skill", visibility: "public" }}
        >
          <div className={styles.uploadGrid}>
            <Form.Item
              label="展示名称"
              name="name"
              rules={[{ required: true, whitespace: true, message: "请输入名称" }]}
            >
              <Input maxLength={200} placeholder="例如：电商商品文案助手" />
            </Form.Item>

            <Form.Item
              label="版本号"
              name="version"
              rules={[{ required: true, whitespace: true, message: "请输入版本号" }]}
            >
              <Input maxLength={64} placeholder="1.0.0" />
            </Form.Item>
          </div>

          <div className={styles.uploadGrid}>
            <Form.Item
              label="分类"
              name="type"
              rules={[{ required: true, message: "请选择分类" }]}
            >
              <Select options={CATEGORY_OPTIONS} placeholder="请选择分类" />
            </Form.Item>

            <Form.Item
              label="可见性"
              name="visibility"
              rules={[{ required: true, message: "请选择可见性" }]}
            >
              <Select options={VISIBILITY_OPTIONS} placeholder="请选择可见性" />
            </Form.Item>
          </div>

          <Form.Item label="标签" name="tags">
            <Input maxLength={200} placeholder="多个标签以逗号分隔，例如：生产,营销,设计" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea
              maxLength={4000}
              placeholder="简要说明这个 Skill 适合解决什么问题"
              rows={4}
              showCount
            />
          </Form.Item>

          <div className={styles.coverSection}>
            <p className={styles.coverSectionTitle}>选择封面</p>
            <div className={styles.coverPresetGrid}>
              {FDE_SKILL_PRESET_COVERS.map(cover => (
                <div
                  key={cover.key}
                  className={classNames(
                    styles.coverPresetItem,
                    selectedCover === cover.key && styles.coverPresetItemActive,
                  )}
                  style={{ background: cover.gradient }}
                  title={cover.label}
                  onClick={() => setSelectedCover(cover.key)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCover(cover.key);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {cover.emoji}
                </div>
              ))}
            </div>
          </div>
        </Form>
      </Modal>
    );
  }
};
