import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { MoreOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Dropdown, message } from "antd";

import type { EmployeeItem } from "@/pages/types";

import type {
  OpenClawV2SkillCatalogItem,
  OpenClawV2SkillInstallOption,
} from "../openClawV2Mock";
import styles from "./OpenClawAgentsV2View.module.less";

const ALL_SKILL_FILTER_KEY = "all";

type SkillFilterKey = string;

interface OpenClawAgentsV2ViewProps {
  employees: EmployeeItem[];
  initialSkills: OpenClawV2SkillCatalogItem[];
}

const cloneSkillCatalogItem = (
  item: OpenClawV2SkillCatalogItem,
): OpenClawV2SkillCatalogItem => ({
  ...item,
  installedFor: [...item.installedFor],
  favoriteFor: [...item.favoriteFor],
  disabledFor: [...item.disabledFor],
  missingRequirements: [...item.missingRequirements],
  installOptions: item.installOptions.map(option => ({ ...option })),
});

const isSkillInstalled = (
  item: OpenClawV2SkillCatalogItem,
  agentId: string,
): boolean => item.installedFor.includes(agentId);

const resolveSkillInstallOption = (
  item: OpenClawV2SkillCatalogItem,
): OpenClawV2SkillInstallOption =>
  item.installOptions[0] ?? {
    id: `${item.id}-default-install`,
    label: "安装",
    kind: "bundled",
  };

/**
 * OpenClaw V2 AI 伙伴页。
 */
export const OpenClawAgentsV2View = ({
  employees,
  initialSkills,
}: OpenClawAgentsV2ViewProps): JSX.Element => {
  const supportsSkillImport = false;
  const [selectedAgentId, setSelectedAgentId] = useState<string>(employees[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<SkillFilterKey>(ALL_SKILL_FILTER_KEY);
  const [connected, setConnected] = useState<boolean>(true);
  const [skills, setSkills] = useState<OpenClawV2SkillCatalogItem[]>(() =>
    initialSkills.map(cloneSkillCatalogItem),
  );

  useEffect(() => {
    setSkills(initialSkills.map(cloneSkillCatalogItem));
  }, [initialSkills]);

  useEffect(() => {
    if (!employees.length) {
      setSelectedAgentId("");
      return;
    }

    if (employees.some(item => item.id === selectedAgentId)) {
      return;
    }

    setSelectedAgentId(employees[0].id);
  }, [employees, selectedAgentId]);

  const selectedAgent = useMemo(
    () => employees.find(item => item.id === selectedAgentId) ?? null,
    [employees, selectedAgentId],
  );

  const filterItems = useMemo(() => {
    const categoryCounts = new Map<string, number>();

    skills.forEach(item => {
      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
    });

    return [
      {
        key: ALL_SKILL_FILTER_KEY,
        label: "全部",
        count: skills.length,
      },
      ...Array.from(categoryCounts.entries()).map(([category, count]) => ({
        key: category,
        label: category,
        count,
      })),
    ];
  }, [skills]);

  const visibleSkills = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return skills.filter(item => {
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      if (activeFilter === ALL_SKILL_FILTER_KEY) {
        return true;
      }

      return item.category === activeFilter;
    });
  }, [activeFilter, searchQuery, skills]);

  const updateSkill = useCallback(
    (
      skillId: string,
      updater: (item: OpenClawV2SkillCatalogItem) => OpenClawV2SkillCatalogItem,
    ): void => {
      setSkills(prev =>
        prev.map(item => (item.id === skillId ? updater(cloneSkillCatalogItem(item)) : item)),
      );
    },
    [],
  );

  const handleCreateAgent = useCallback((): void => {
    message.info("V2 原型暂不接真实创建流程，这里保留 source 的入口与位置。");
  }, []);

  const handleConnect = useCallback((): void => {
    setConnected(true);
    message.success("OpenClaw 网关已连接。");
  }, []);

  const handleInstallSkill = useCallback(
    (skill: OpenClawV2SkillCatalogItem): void => {
      if (!selectedAgentId) {
        return;
      }

      const installOption = resolveSkillInstallOption(skill);

      updateSkill(skill.id, item => ({
        ...item,
        installedFor: item.installedFor.includes(selectedAgentId)
          ? item.installedFor
          : [...item.installedFor, selectedAgentId],
        disabledFor: item.disabledFor.filter(agentId => agentId !== selectedAgentId),
        missingRequirements: [],
      }));

      message.success(`已为当前 AI 伙伴安装：${installOption.label}`);
    },
    [selectedAgentId, updateSkill],
  );

  const handleUninstallSkill = useCallback(
    (skill: OpenClawV2SkillCatalogItem): void => {
      if (!selectedAgentId) {
        return;
      }

      updateSkill(skill.id, item => ({
        ...item,
        installedFor: item.installedFor.filter(agentId => agentId !== selectedAgentId),
        favoriteFor: item.favoriteFor.filter(agentId => agentId !== selectedAgentId),
        disabledFor: item.disabledFor.filter(agentId => agentId !== selectedAgentId),
      }));

      message.success(`已从当前 AI 伙伴卸载：${skill.name}`);
    },
    [selectedAgentId, updateSkill],
  );

  const resolveAgentMenuItems = useCallback(
    (agent: EmployeeItem): MenuProps["items"] => [
      {
        key: "edit",
        label: "编辑 AI 伙伴",
        onClick: () => message.info(`暂未接入“${agent.name}”的编辑表单。`),
      },
      {
        key: "sync",
        label: "同步技能状态",
        onClick: () => message.success(`已同步 ${agent.name} 的技能状态。`),
      },
      {
        key: "workspace",
        label: "打开工作目录",
        onClick: () => message.info(`${agent.name} 的工作目录入口仅在桌面客户端中可用。`),
      },
    ],
    [],
  );

  const resolveAgentSkillLabel = useCallback(
    (agentId: string): string => {
      const count = skills.filter(item => isSkillInstalled(item, agentId)).length;

      return count > 0 ? `${count} 个技能已安装` : "尚未安装技能";
    },
    [skills],
  );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h1 className={styles.sidebarTitle}>AI 伙伴列表</h1>
            </div>

            <div className={styles.agentList}>
              <article
                className={classNames(styles.agentItem, styles.agentCreateItem)}
                role="button"
                tabIndex={0}
                onClick={handleCreateAgent}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleCreateAgent();
                  }
                }}
              >
                <div className={classNames(styles.agentAvatar, styles.agentCreateAvatar)}>
                  <PlusOutlined />
                </div>
                <div className={styles.agentMeta}>
                  <div className={styles.agentName}>新建 AI 伙伴</div>
                  <div className={styles.agentSub}>创建您的专属 AI 伙伴</div>
                </div>
              </article>

              {employees.map(item => (
                <article
                  key={item.id}
                  className={classNames(styles.agentItem, {
                    [styles.agentItemActive]: item.id === selectedAgentId,
                  })}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedAgentId(item.id)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedAgentId(item.id);
                    }
                  }}
                >
                  <div className={styles.agentAvatar}>
                    <img src={item.avatarUrl} alt={item.name} />
                  </div>

                  <div className={styles.agentMeta}>
                    <div className={styles.agentNameRow}>
                      <div className={styles.agentName}>{item.name}</div>
                    </div>
                    <div className={styles.agentSub}>{resolveAgentSkillLabel(item.id)}</div>
                  </div>

                  <Dropdown
                    menu={{ items: resolveAgentMenuItems(item) }}
                    placement="bottomRight"
                    trigger={["click"]}
                  >
                    <button
                      type="button"
                      className={styles.agentMenuButton}
                      onClick={event => event.stopPropagation()}
                    >
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                </article>
              ))}
            </div>
          </aside>

          <section className={styles.main}>
            {selectedAgent ? (
              <div className={styles.skillPanel}>
                <div className={styles.skillPanelHeader}>
                  <div className={styles.skillTopbar}>
                    <div className={styles.skillTopbarLeft}>
                      <div>
                        <h2 className={styles.skillTitle}>技能广场</h2>
                        <div className={styles.skillContext}>
                          当前 AI 伙伴：{selectedAgent.name}
                        </div>
                      </div>
                      <span className={styles.skillCount}>{skills.length} 个技能</span>
                    </div>

                    <div className={styles.skillTopbarRight}>
                      <label className={styles.skillSearch}>
                        <SearchOutlined className={styles.skillSearchIcon} />
                        <input
                          className={styles.skillSearchInput}
                          value={searchQuery}
                          placeholder="搜索技能..."
                          onChange={event => setSearchQuery(event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className={classNames(styles.skillButton, {
                          [styles.skillButtonConnected]: connected,
                        })}
                        onClick={handleConnect}
                      >
                        <span
                          className={classNames(styles.skillButtonDot, {
                            [styles.skillButtonDotConnected]: connected,
                          })}
                        />
                        {connected ? "已连接" : "连接"}
                      </button>
                      <button
                        type="button"
                        className={classNames(styles.skillButton, {
                          [styles.skillButtonDisabledHint]: !supportsSkillImport,
                        })}
                        disabled={!supportsSkillImport}
                        title={supportsSkillImport ? undefined : "当前原型未接入外部技能导入"}
                      >
                        导入外部技能
                      </button>
                    </div>
                  </div>

                  <div className={styles.filterRow}>
                    {filterItems.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        className={classNames(styles.filterChip, {
                          [styles.filterChipActive]: activeFilter === item.key,
                        })}
                        onClick={() => setActiveFilter(item.key)}
                      >
                        {item.label}
                        <span className={styles.filterChipCount}>{item.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.skillPanelBody}>
                  {!connected && skills.length === 0 ? (
                    <div className={styles.skillEmpty}>
                      <div className={styles.skillEmptyIcon}>🔌</div>
                      <p className={styles.skillEmptyText}>请先连接 OpenClaw 网关</p>
                    </div>
                  ) : visibleSkills.length === 0 ? (
                    <div className={styles.skillEmpty}>
                      <div className={styles.skillEmptyIcon}>📭</div>
                      <p className={styles.skillEmptyText}>没有匹配的技能</p>
                    </div>
                  ) : (
                    <div className={styles.skillGrid}>
                      {visibleSkills.map(item => {
                        const installed = isSkillInstalled(item, selectedAgent.id);

                        return (
                          <div key={item.id} className={styles.skillCard}>
                            <div className={styles.skillCardTop}>
                              <div className={styles.skillCardIcon}>{item.emoji}</div>
                            </div>

                            <div className={styles.skillCardBody}>
                              <h3 className={styles.skillCardName}>{item.name}</h3>
                              <p className={styles.skillCardDescription}>{item.description}</p>
                            </div>

                            <div className={styles.skillCardFooter}>
                              <span className={styles.skillSourceLabel}>{item.category}</span>
                              <div className={styles.skillActions}>
                                {installed ? (
                                  <button
                                    type="button"
                                    className={classNames(
                                      styles.skillButton,
                                      styles.skillButtonSmall,
                                      styles.skillButtonMuted,
                                    )}
                                    onClick={() => handleUninstallSkill(item)}
                                  >
                                    卸载
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={classNames(
                                      styles.skillButton,
                                      styles.skillButtonSmall,
                                      styles.skillButtonGreen,
                                    )}
                                    onClick={() => handleInstallSkill(item)}
                                  >
                                    安装
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyTitle}>选择一个 AI 伙伴</div>
                <div className={styles.emptyDescription}>
                  右侧会显示该 AI 伙伴对应的技能状态。
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
