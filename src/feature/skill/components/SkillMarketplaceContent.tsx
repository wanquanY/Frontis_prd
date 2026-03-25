import { MoreOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Alert, Button, Dropdown, Empty, Input, Select, Skeleton, Spin } from "antd";
import type { MenuProps } from "antd";
import classNames from "classnames";
import dayjs from "dayjs";

import type {
  CoworkerAgentSkillInstallStatusResponse,
  CoworkerSkillItem,
  SkillCategoryInfo,
  SkillPublisherType,
} from "@/apis/SkillApi";
import { resolveSkillInstallLifecycle } from "@/feature/skill/installStatus";
import type { SkillCategoryFilter } from "@/feature/skill/types";

import styles from "./SkillMarketplaceContent.module.less";

const MY_SKILLS_CATEGORY_KEY = "my_skills";

const publisherTypeOptions: Array<{ label: string; value: SkillPublisherType }> = [
  { label: "全部", value: "all" },
  { label: "官方发布", value: "official" },
  { label: "企业上传", value: "tenant" },
];

/**
 * 技能广场右侧内容区属性。
 */
export interface SkillMarketplaceContentProps {
  skills: CoworkerSkillItem[];
  categories: SkillCategoryInfo[];
  activeCategory: SkillCategoryFilter;
  total: number;
  loading: boolean;
  categoriesLoading: boolean;
  errorMessage: string;
  categoriesErrorMessage: string;
  keyword: string;
  publisherType: SkillPublisherType;
  currentIdentityId?: number;
  selectedInstallAgentId?: string;
  selectedAgentName?: string;
  selectedAgentSkillIdSet: Set<number>;
  selectedAgentSkillInstallStatusMap: Record<number, CoworkerAgentSkillInstallStatusResponse>;
  agentSkillsLoading: boolean;
  agentSkillsErrorMessage: string;
  installSubmitting: boolean;
  installingSkill: CoworkerSkillItem | null;
  onCategoryChange: (value: SkillCategoryFilter) => void;
  onKeywordChange: (value: string) => void;
  onSearch: (value?: string) => void;
  onPublisherTypeChange: (value: SkillPublisherType) => void;
  onOpenUpload: () => void;
  onRetryCategories: () => void;
  onRetrySelectedAgentSkills: () => void;
  onRetry: () => void;
  onEditSkill: (skill: CoworkerSkillItem) => void;
  onUpdateSkill: (skill: CoworkerSkillItem) => void;
  onRemoveSkill: (skill: CoworkerSkillItem) => void;
  onCardAction: (skill: CoworkerSkillItem) => void;
}

const resolveSkillUpdatedAt = (value: string): string => {
  const nextValue = dayjs(value);
  if (!nextValue.isValid()) {
    return "-";
  }
  return nextValue.format("YYYY-MM-DD HH:mm");
};

const resolvePublisherLabel = (skill: CoworkerSkillItem): string => {
  if (typeof skill.publisher === "string") {
    return skill.publisher || (skill.scope === "official" ? "官方发布" : "企业发布");
  }

  if (skill.publisher?.name?.trim()) {
    return skill.publisher.name.trim();
  }

  if (skill.scope === "official") {
    return "官方发布";
  }

  return "企业发布";
};

const isManageableSkill = (skill: CoworkerSkillItem, currentIdentityId?: number): boolean => {
  if (!currentIdentityId || skill.scope !== "tenant") {
    return false;
  }

  if (!skill.publisher || typeof skill.publisher === "string") {
    return false;
  }

  return skill.publisher.owner_identity_id === currentIdentityId;
};

/**
 * 技能广场右侧内容区。
 */
export const SkillMarketplaceContent = ({
  skills,
  categories,
  activeCategory,
  total,
  loading,
  categoriesLoading,
  errorMessage,
  categoriesErrorMessage,
  keyword,
  publisherType,
  currentIdentityId,
  selectedInstallAgentId,
  selectedAgentName,
  selectedAgentSkillIdSet,
  selectedAgentSkillInstallStatusMap,
  agentSkillsLoading,
  agentSkillsErrorMessage,
  installSubmitting,
  installingSkill,
  onCategoryChange,
  onKeywordChange,
  onSearch,
  onPublisherTypeChange,
  onOpenUpload,
  onRetryCategories,
  onRetrySelectedAgentSkills,
  onRetry,
  onEditSkill,
  onUpdateSkill,
  onRemoveSkill,
  onCardAction,
}: SkillMarketplaceContentProps): JSX.Element => {
  const displayCategories: Array<{ id: SkillCategoryFilter; label: string }> = categories.map(
    category => ({
      id: category.key === MY_SKILLS_CATEGORY_KEY ? MY_SKILLS_CATEGORY_KEY : category.category_id,
      label: category.key === MY_SKILLS_CATEGORY_KEY ? "我的技能" : category.name,
    }),
  );

  return (
    <main className={styles.marketPanel}>
      <div className={styles.marketHeader}>
        <div className={styles.marketHeading}>
          <h1 className={styles.marketTitle}>技能广场</h1>
          <span className={styles.marketCount}>{total} 个技能</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.categoryList}>
          <button
            type="button"
            className={classNames(styles.categoryPill, {
              [styles.categoryPillActive]: activeCategory === "all",
            })}
            onClick={() => onCategoryChange("all")}
          >
            全部分类
          </button>
          {categoriesLoading && displayCategories.length === 0
            ? [0, 1, 2].map(item => (
                <Skeleton.Button
                  key={item}
                  active
                  size="small"
                  shape="round"
                  className={styles.categorySkeleton}
                />
              ))
            : displayCategories.map(category => (
                <button
                  key={String(category.id)}
                  type="button"
                  className={classNames(styles.categoryPill, {
                    [styles.categoryPillActive]: activeCategory === category.id,
                  })}
                  onClick={() => onCategoryChange(category.id)}
                >
                  {category.label}
                </button>
              ))}
        </div>

        <div className={styles.toolbarActions}>
          <Select
            value={publisherType}
            options={publisherTypeOptions}
            className={styles.publisherSelect}
            onChange={value => onPublisherTypeChange(value)}
          />
        </div>
        <Input
          allowClear
          value={keyword}
          placeholder="搜索技能..."
          prefix={<SearchOutlined className={styles.searchIcon} />}
          className={styles.searchInput}
          onChange={event => onKeywordChange(event.target.value)}
          onPressEnter={() => onSearch()}
        />
      </div>

      {categoriesErrorMessage ? (
        <div className={styles.noticeWrap}>
          <Alert
            showIcon
            type="warning"
            message="技能分类加载失败"
            description={categoriesErrorMessage}
            action={
              <Button size="small" onClick={onRetryCategories}>
                重试
              </Button>
            }
          />
        </div>
      ) : null}

      {agentSkillsErrorMessage && selectedAgentName ? (
        <div className={styles.noticeWrap}>
          <Alert
            showIcon
            type="warning"
            message={`${selectedAgentName} 的技能状态加载失败`}
            description={agentSkillsErrorMessage}
            action={
              <Button size="small" onClick={onRetrySelectedAgentSkills}>
                重试
              </Button>
            }
          />
        </div>
      ) : null}

      {loading ? (
        <div className={styles.centerState}>
          <Spin size="large" />
        </div>
      ) : null}

      {!loading && errorMessage ? (
        <div className={styles.centerState}>
          <Empty
            description={
              <div className={styles.errorBlock}>
                <div className={styles.errorTitle}>技能列表加载失败</div>
                <div className={styles.errorText}>{errorMessage}</div>
                <Button type="primary" onClick={onRetry}>
                  重新加载
                </Button>
              </div>
            }
          />
        </div>
      ) : null}

      {!loading && !errorMessage ? (
        <div className={styles.skillGrid}>
          <button
            type="button"
            className={classNames(styles.skillCard, styles.importSkillCard)}
            onClick={onOpenUpload}
          >
            <div className={styles.importSkillIcon}>
              <UploadOutlined />
            </div>
            <div className={styles.importSkillBody}>
              <h3 className={styles.importSkillTitle}>导入外部技能</h3>
              <p className={styles.importSkillText}>
                导入 zip 压缩包并补充基础信息，将外部技能加入当前空间广场
              </p>
            </div>
          </button>

          {skills.map(skill => {
            const isInstalled = selectedAgentSkillIdSet.has(skill.skill_id);
            const isUnavailable = !skill.latest_skill_version_id;
            const manageable = isManageableSkill(skill, currentIdentityId);
            const installLifecycle = resolveSkillInstallLifecycle(
              selectedAgentSkillInstallStatusMap[skill.skill_id],
            );
            const isInstalling = Boolean(installLifecycle?.isRunning);
            const isInstallFailed = Boolean(installLifecycle?.isFailed);
            const shouldShowUninstall =
              !isInstalling &&
              (Boolean(installLifecycle?.isInstalled) || (isInstalled && !isInstallFailed));
            const shouldDisableAction =
              installSubmitting || !selectedInstallAgentId || isUnavailable || isInstalling;
            const actionMenu: MenuProps = {
              items: [
                { key: "edit", label: "编辑" },
                { key: "update", label: "更新版本" },
                { key: "remove", label: "移除", danger: true },
              ],
              onClick: ({ key }) => {
                if (key === "edit") {
                  onEditSkill(skill);
                  return;
                }
                if (key === "update") {
                  onUpdateSkill(skill);
                  return;
                }
                if (key === "remove") {
                  onRemoveSkill(skill);
                }
              },
            };

            return (
              <article key={skill.skill_id} className={styles.skillCard}>
                <div className={styles.skillCardHeader}>
                  <div className={styles.skillCardTitleWrap}>
                    {skill.cover?.storage_path ? (
                      <img
                        src={skill.cover.storage_path}
                        alt={`${skill.name} 封面`}
                        className={styles.skillCover}
                      />
                    ) : (
                      <span className={styles.skillIcon}>
                        {skill.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className={styles.skillTitleBlock}>
                      <h3 className={styles.skillName}>{skill.name}</h3>
                      <p className={styles.skillMeta}>
                        {skill.category?.name || "未分类"} · {skill.latest_version || "未发布"}
                      </p>
                    </div>
                  </div>

                  <div className={styles.skillCardActions}>
                    {manageable ? (
                      <Dropdown trigger={["click"]} menu={actionMenu}>
                        <button type="button" className={styles.moreButton}>
                          <MoreOutlined />
                        </button>
                      </Dropdown>
                    ) : null}
                  </div>
                </div>

                <p className={styles.skillDescription}>{skill.description || "暂无技能说明"}</p>

                <div className={styles.skillActionWrap}>
                  <Button
                    block
                    className={classNames(styles.skillActionButton, {
                      [styles.skillActionButtonProgress]: isInstalling,
                      [styles.skillActionButtonPrimary]:
                        !shouldShowUninstall && !isUnavailable && Boolean(selectedInstallAgentId),
                      [styles.skillActionButtonSecondary]:
                        shouldShowUninstall || !selectedInstallAgentId || isUnavailable,
                    })}
                    disabled={shouldDisableAction}
                    loading={
                      installSubmitting &&
                      installingSkill?.skill_id === skill.skill_id &&
                      agentSkillsLoading &&
                      !isInstalling
                    }
                    onClick={() => onCardAction(skill)}
                  >
                    {isInstalling && installLifecycle ? (
                      <span className={styles.skillActionButtonProgressInner}>
                        <span
                          className={styles.skillActionButtonProgressFill}
                          style={{ width: `${installLifecycle.progressPercent}%` }}
                        />
                        <span className={styles.skillActionButtonProgressContent}>
                          <span>{installLifecycle.messageLabel}</span>
                          <span>{installLifecycle.progressPercent}%</span>
                        </span>
                      </span>
                    ) : installLifecycle?.isFailed ? (
                      "重试安装"
                    ) : shouldShowUninstall ? (
                      "卸载"
                    ) : !selectedInstallAgentId ? (
                      "请选择 AI 员工"
                    ) : (
                      "安装"
                    )}
                  </Button>
                  {installLifecycle?.errorMessage && installLifecycle.isFailed ? (
                    <div className={styles.skillActionError}>{installLifecycle.errorMessage}</div>
                  ) : null}
                </div>

                <div className={styles.skillCardFooter}>
                  <span>{resolvePublisherLabel(skill)}</span>
                  <span>{resolveSkillUpdatedAt(skill.updated_at)}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </main>
  );
};
