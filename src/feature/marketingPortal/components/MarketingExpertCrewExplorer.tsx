import { startTransition, useEffect, useMemo, useState } from "react";

import { ArrowRightOutlined } from "@ant-design/icons";
import { Avatar } from "antd";
import classNames from "classnames";
import { Link } from "react-router-dom";

import type {
  MarketingAgentItem,
  MarketingExpertSceneItem,
  MarketingExpertSceneTone,
} from "@/feature/marketingPortal/types";
import {
  createMarketingContactPath,
  getMarketingAgentsBySceneId,
} from "@/feature/marketingPortal/utils";
import { getAvatarText, getAvatarUrl } from "@/pages/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingExpertCrewExplorer.module.less";

interface MarketingExpertCrewExplorerProps {
  scenes: MarketingExpertSceneItem[];
  mode?: "compact" | "page";
  browseCardTo?: string;
}

interface ResolvedMarketingExpertScene {
  indexLabel: string;
  scene: MarketingExpertSceneItem;
  experts: MarketingAgentItem[];
}

interface CompactScenePresentation {
  hook: string;
  beforeText: string;
  afterText: string;
}

const SCENE_TONE_CLASS_MAP: Record<MarketingExpertSceneTone, string> = {
  aqua: styles.isAquaScene,
  cobalt: styles.isCobaltScene,
  emerald: styles.isEmeraldScene,
  amber: styles.isAmberScene,
  violet: styles.isVioletScene,
};

const COMPACT_SCENE_PRESENTATION_MAP: Record<string, CompactScenePresentation> = {
  "scene-commerce-management": {
    hook: "把昨天 28 家门店的流水、退款、缺货和招聘进度整理成一份我今天 9 点早会就能看的经营简报。",
    beforeText: "以前：财务、店长、HR 各报各的，等老板听全，早会已经开完了。",
    afterText: "现在：一条任务发出后，经营、财务和组织动作会在同一条链路里同步推进。",
  },
  "scene-sales-growth": {
    hook: "今天把 45 条新线索按优先级分层，给销售一个清晰的跟进顺序，同时告诉我哪些客户最值得马上追。",
    beforeText: "以前：线索散在 CRM 和群聊里，销售各跟各的，主管只能靠追问。",
    afterText: "现在：分层、话术、跟进顺序和管理战报在同一条协作链路里一起生成。",
  },
  "scene-content-creation": {
    hook: "给春季上新系列做 12 张主视觉，保留现有品牌调性，并把这次能跑通的方法沉淀成以后都能复用的模板。",
    beforeText: "以前：核心设计师离开，风格、提示词和模板几乎跟着人一起流失。",
    afterText: "现在：每次创作都在沉淀成团队资产，人走了，方法、模板和产能还在。",
  },
  "scene-customer-service": {
    hook: "把今天上午的 86 条咨询先分流，帮我找出最容易流失的客户和最需要培训的客服话术问题。",
    beforeText: "以前：客服质检、回捞商机和培训整理分散在不同人手里，问题总是事后才看见。",
    afterText: "现在：客户咨询、服务质检和商机回捞可以在同一个对话里被拆解执行。",
  },
  "scene-organization": {
    hook: "这个月要同时招 8 个岗位，帮我先拆 JD、筛简历、准备面试重点，再告诉我哪些岗位最影响业务。",
    beforeText: "以前：招聘节拍、岗位判断和管理风险是三套表，负责人只能来回切着看。",
    afterText: "现在：招聘动作、候选人判断和管理风险能被一组专家同时接住。",
  },
};

/**
 * 按业务场景浏览 AI 专家团。
 */
export const MarketingExpertCrewExplorer = ({
  scenes,
  mode = "page",
  browseCardTo,
}: MarketingExpertCrewExplorerProps): JSX.Element => {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [visibleConversationCount, setVisibleConversationCount] = useState<number>(0);

  const resolvedScenes = useMemo<ResolvedMarketingExpertScene[]>(() => {
    return scenes.map((scene, index) => ({
      indexLabel: `0${index + 1}`.slice(-2),
      scene,
      experts: getMarketingAgentsBySceneId(scene.id),
    }));
  }, [scenes]);

  const resolvedActiveSceneId = useMemo(() => {
    if (mode === "compact") {
      return activeSceneId ?? resolvedScenes[0]?.scene.id ?? null;
    }

    return activeSceneId;
  }, [activeSceneId, mode, resolvedScenes]);

  const activeScene = useMemo(() => {
    if (!resolvedActiveSceneId) {
      return null;
    }

    return resolvedScenes.find(item => item.scene.id === resolvedActiveSceneId) ?? null;
  }, [resolvedActiveSceneId, resolvedScenes]);

  useEffect(() => {
    if (mode !== "compact" || !activeScene?.scene.taskDemo) {
      setVisibleConversationCount(0);
      return;
    }

    const totalMessageCount = activeScene.scene.taskDemo.messages.length;
    setVisibleConversationCount(0);

    if (totalMessageCount === 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setVisibleConversationCount(currentCount => {
        if (currentCount >= totalMessageCount) {
          window.clearInterval(timerId);
          return currentCount;
        }

        return currentCount + 1;
      });
    }, 980);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeScene?.scene.id, activeScene?.scene.taskDemo, mode]);

  const handleSceneToggle = (sceneId: string): void => {
    startTransition(() => {
      setActiveSceneId(currentSceneId => {
        if (mode === "compact") {
          return sceneId;
        }

        return currentSceneId === sceneId ? null : sceneId;
      });
    });
  };

  if (resolvedScenes.length === 0) {
    return <div className={styles.emptyState} />;
  }

  if (mode === "compact" && activeScene) {
    const { scene, experts } = activeScene;
    const conversationDemo = scene.taskDemo;
    const scenePresentation = getCompactScenePresentation(scene);
    const visibleConversationMessages =
      conversationDemo?.messages.slice(0, visibleConversationCount) ?? [];
    const nextConversationMessage =
      conversationDemo && visibleConversationCount < conversationDemo.messages.length
        ? conversationDemo.messages[visibleConversationCount]
        : null;

    return (
      <div
        className={classNames(
          styles.explorer,
          styles.isCompactExplorer,
          styles.isCompactExplorerShell,
        )}
      >
        <div className={styles.compactSceneTabsBar}>
          <div className={styles.compactSceneTabs} role="tablist" aria-label="AI 专家团场景切换">
            {resolvedScenes.map(({ indexLabel, scene: sceneItem }) => {
              const isActive = sceneItem.id === scene.id;

              return (
                <button
                  key={sceneItem.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={classNames(
                    styles.compactSceneTab,
                    isActive && styles.isActiveCompactSceneTab,
                  )}
                  onClick={() => handleSceneToggle(sceneItem.id)}
                >
                  <span className={styles.compactSceneTabIndex}>{indexLabel}</span>
                  <span className={styles.compactSceneTabLabel}>{sceneItem.title}</span>
                </button>
              );
            })}
          </div>

          {browseCardTo ? (
            <Link className={styles.compactSceneBrowseLink} to={browseCardTo}>
              查看全部AI专家
              <ArrowRightOutlined />
            </Link>
          ) : null}
        </div>

        <div className={styles.compactSceneStage}>
          <article className={styles.compactScenePanel}>
            <div className={styles.compactHookCard}>
              <span className={styles.compactHookLabel}>任务描述</span>
              <p className={styles.compactHookText}>“{scenePresentation.hook}”</p>
            </div>

            <div className={styles.compactComparisonGrid}>
              <article className={styles.compactComparisonCard}>
                <span className={styles.compactComparisonLabel}>以前</span>
                <p className={styles.compactComparisonText}>{scenePresentation.beforeText}</p>
              </article>

              <article
                className={classNames(
                  styles.compactComparisonCard,
                  styles.isAccentCompactComparisonCard,
                )}
              >
                <span className={styles.compactComparisonLabel}>现在</span>
                <p className={styles.compactComparisonText}>{scenePresentation.afterText}</p>
              </article>
            </div>

            <div className={styles.compactSceneActions}>
              <Link
                className={classNames(layoutStyles.primaryButton, styles.sceneConsultButton)}
                to={createMarketingContactPath(experts.map(expert => expert.name))}
              >
                咨询这一组专家
                <ArrowRightOutlined />
              </Link>
            </div>
          </article>

          <div className={styles.compactConversationPanel}>
            {conversationDemo ? (
              <div key={scene.id} className={styles.conversationShell}>
                <div className={styles.conversationToolbar}>
                  <div className={styles.conversationToolbarCopy}>
                    <p className={styles.conversationEyebrow}>用户侧协作对话</p>
                    <h3 className={styles.conversationTitle}>
                      AI 专家团队 · {conversationDemo.messages.length} 位接力协作
                    </h3>
                  </div>
                  <span className={styles.conversationProgress}>
                    {visibleConversationMessages.length}/{conversationDemo.messages.length}
                  </span>
                </div>

                <div className={styles.conversationStream} role="log" aria-live="polite">
                  <div className={classNames(styles.conversationRow, styles.isUserConversationRow)}>
                    <div className={styles.conversationBody}>
                      <div
                        className={classNames(
                          styles.conversationMeta,
                          styles.isUserConversationMeta,
                        )}
                      >
                        <span className={styles.conversationSpeakerName}>
                          {conversationDemo.user.name}
                        </span>
                        <span className={styles.conversationSpeakerRole}>
                          {conversationDemo.user.role}
                        </span>
                      </div>
                      <div
                        className={classNames(
                          styles.conversationBubble,
                          styles.isUserConversationBubble,
                        )}
                      >
                        {conversationDemo.userPrompt}
                      </div>
                    </div>
                    <Avatar
                      src={getAvatarUrl(`marketing-portal-${conversationDemo.user.avatarSeed}`)}
                      className={classNames(
                        styles.conversationAvatar,
                        styles.isUserConversationAvatar,
                      )}
                    >
                      {getAvatarText(conversationDemo.user.name)}
                    </Avatar>
                  </div>

                  {visibleConversationMessages.map((message, messageIndex) => {
                    const statusLabel = getConversationStatusLabel(
                      messageIndex,
                      visibleConversationMessages.length,
                      conversationDemo.messages.length,
                    );

                    return (
                      <div key={message.id} className={styles.conversationRow}>
                        <Avatar
                          src={getAvatarUrl(`marketing-portal-${message.avatarSeed}`)}
                          className={styles.conversationAvatar}
                        >
                          {getAvatarText(message.speakerName)}
                        </Avatar>
                        <div className={styles.conversationBody}>
                          <div className={styles.conversationMeta}>
                            <span className={styles.conversationSpeakerName}>
                              {message.speakerName}
                            </span>
                            <span className={styles.conversationSpeakerRole}>
                              {message.speakerRole}
                            </span>
                            <span
                              className={classNames(
                                styles.conversationStatus,
                                statusLabel === "处理中"
                                  ? styles.isWorkingConversationStatus
                                  : styles.isDoneConversationStatus,
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className={styles.conversationBubble}>{message.content}</div>
                        </div>
                      </div>
                    );
                  })}

                  {nextConversationMessage ? (
                    <div className={styles.conversationLoadingRow}>
                      <Avatar
                        src={getAvatarUrl(`marketing-portal-${nextConversationMessage.avatarSeed}`)}
                        className={styles.conversationAvatar}
                      >
                        {getAvatarText(nextConversationMessage.speakerName)}
                      </Avatar>
                      <div className={styles.conversationLoadingBubble}>
                        <div className={styles.conversationMeta}>
                          <span className={styles.conversationSpeakerName}>
                            {nextConversationMessage.speakerName}
                          </span>
                          <span className={styles.conversationSpeakerRole}>准备接手</span>
                          <span
                            className={classNames(
                              styles.conversationStatus,
                              styles.isQueuedConversationStatus,
                            )}
                          >
                            排队中
                          </span>
                        </div>
                        <div className={styles.typingDots} aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.conversationOutcomeRow}>
                      <div className={styles.conversationOutcomeBubble}>
                        <span className={styles.conversationOutcomeLabel}>fAI</span>
                        <p className={styles.conversationOutcomeText}>
                          {conversationDemo.completionNote}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (activeScene) {
    const { indexLabel, scene, experts } = activeScene;
    const conversationDemo = mode === "compact" ? scene.taskDemo : undefined;
    const visibleConversationMessages =
      conversationDemo?.messages.slice(0, visibleConversationCount) ?? [];
    const nextConversationMessage =
      conversationDemo && visibleConversationCount < conversationDemo.messages.length
        ? conversationDemo.messages[visibleConversationCount]
        : null;

    return (
      <div
        className={classNames(
          styles.explorer,
          activeScene ? styles.isExpandedExplorer : styles.isCollapsedExplorer,
          mode === "compact" ? styles.isCompactExplorer : styles.isPageExplorer,
        )}
      >
        <div
          className={classNames(
            styles.expandedStage,
            mode === "compact" ? styles.isCompactExpandedStage : styles.isPageExpandedStage,
          )}
        >
          <article
            className={classNames(styles.expandedSceneCard, SCENE_TONE_CLASS_MAP[scene.tone])}
          >
            <img className={styles.sceneCoverImage} src={scene.coverImageUrl} alt={scene.title} />
            <div className={styles.sceneCoverShade} />
            <div className={styles.sceneCoverGrid} />

            <div className={styles.expandedSceneContent}>
              <div className={styles.sceneMeta}>
                <span className={styles.sceneIndex}>{indexLabel}</span>
                <span className={styles.sceneSubtitle}>{scene.subtitle}</span>
              </div>

              <div className={styles.expandedSceneCopy}>
                <h3 className={styles.expandedSceneTitle}>{scene.title}</h3>
                <p className={styles.expandedSceneSummary}>{scene.summary}</p>
              </div>

              <div className={styles.sceneCardActions}>
                <Link
                  className={classNames(layoutStyles.primaryButton, styles.sceneConsultButton)}
                  to={createMarketingContactPath(experts.map(expert => expert.name))}
                >
                  咨询这一组专家
                  <ArrowRightOutlined />
                </Link>

                <button
                  type="button"
                  className={styles.sceneActionButton}
                  onClick={() => handleSceneToggle(scene.id)}
                >
                  收起场景
                  <ArrowRightOutlined />
                </button>
              </div>
            </div>
          </article>

          <div className={styles.expandedRailPanel}>
            {conversationDemo ? (
              <div key={scene.id} className={styles.conversationShell}>
                <div className={styles.conversationToolbar}>
                  <div className={styles.conversationToolbarCopy}>
                    <p className={styles.conversationEyebrow}>用户侧协作对话</p>
                    <h3 className={styles.conversationTitle}>{scene.title} 专家团正在协作执行</h3>
                  </div>
                  <span className={styles.conversationProgress}>
                    {visibleConversationMessages.length}/{conversationDemo.messages.length}
                  </span>
                </div>

                <div className={styles.conversationStream} role="log" aria-live="polite">
                  <div className={classNames(styles.conversationRow, styles.isUserConversationRow)}>
                    <div className={styles.conversationBody}>
                      <div
                        className={classNames(
                          styles.conversationMeta,
                          styles.isUserConversationMeta,
                        )}
                      >
                        <span className={styles.conversationSpeakerName}>
                          {conversationDemo.user.name}
                        </span>
                        <span className={styles.conversationSpeakerRole}>
                          {conversationDemo.user.role}
                        </span>
                      </div>
                      <div
                        className={classNames(
                          styles.conversationBubble,
                          styles.isUserConversationBubble,
                        )}
                      >
                        {conversationDemo.userPrompt}
                      </div>
                    </div>
                    <Avatar
                      src={getAvatarUrl(`marketing-portal-${conversationDemo.user.avatarSeed}`)}
                      className={classNames(
                        styles.conversationAvatar,
                        styles.isUserConversationAvatar,
                      )}
                    >
                      {getAvatarText(conversationDemo.user.name)}
                    </Avatar>
                  </div>

                  {visibleConversationMessages.map((message, messageIndex) => {
                    const statusLabel = getConversationStatusLabel(
                      messageIndex,
                      visibleConversationMessages.length,
                      conversationDemo.messages.length,
                    );

                    return (
                      <div key={message.id} className={styles.conversationRow}>
                        <Avatar
                          src={getAvatarUrl(`marketing-portal-${message.avatarSeed}`)}
                          className={styles.conversationAvatar}
                        >
                          {getAvatarText(message.speakerName)}
                        </Avatar>
                        <div className={styles.conversationBody}>
                          <div className={styles.conversationMeta}>
                            <span className={styles.conversationSpeakerName}>
                              {message.speakerName}
                            </span>
                            <span className={styles.conversationSpeakerRole}>
                              {message.speakerRole}
                            </span>
                            <span
                              className={classNames(
                                styles.conversationStatus,
                                statusLabel === "处理中"
                                  ? styles.isWorkingConversationStatus
                                  : styles.isDoneConversationStatus,
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className={styles.conversationBubble}>{message.content}</div>
                        </div>
                      </div>
                    );
                  })}

                  {nextConversationMessage ? (
                    <div className={styles.conversationLoadingRow}>
                      <Avatar
                        src={getAvatarUrl(`marketing-portal-${nextConversationMessage.avatarSeed}`)}
                        className={styles.conversationAvatar}
                      >
                        {getAvatarText(nextConversationMessage.speakerName)}
                      </Avatar>
                      <div className={styles.conversationLoadingBubble}>
                        <div className={styles.conversationMeta}>
                          <span className={styles.conversationSpeakerName}>
                            {nextConversationMessage.speakerName}
                          </span>
                          <span className={styles.conversationSpeakerRole}>准备接手</span>
                          <span
                            className={classNames(
                              styles.conversationStatus,
                              styles.isQueuedConversationStatus,
                            )}
                          >
                            排队中
                          </span>
                        </div>
                        <div className={styles.typingDots} aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.conversationOutcomeRow}>
                      <div className={styles.conversationOutcomeBubble}>
                        <span className={styles.conversationOutcomeLabel}>fAI</span>
                        <p className={styles.conversationOutcomeText}>
                          {conversationDemo.completionNote}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className={styles.expandedRailHeader}>
                  <div className={styles.expandedRailCopy}>
                    <p className={styles.expandedRailEyebrow}>Scene Overview</p>
                    <h3 className={styles.expandedRailTitle}>{scene.title} 专家团</h3>
                    <p className={styles.expandedRailDescription}>{scene.description}</p>
                  </div>
                </div>

                <div
                  className={styles.expertRail}
                  role="list"
                  aria-label={`${scene.title} 专家列表`}
                >
                  {experts.map(expert => (
                    <article key={expert.id} className={styles.expertCard}>
                      <div className={styles.expertHeader}>
                        <div className={styles.expertIdentity}>
                          <Avatar
                            shape="square"
                            src={getAvatarUrl(`marketing-portal-${expert.slug}`)}
                            className={styles.expertAvatar}
                          >
                            {getAvatarText(expert.name)}
                          </Avatar>
                          <div className={styles.expertIdentityBody}>
                            <h4 className={styles.expertName}>{expert.name}</h4>
                            <p className={styles.expertPrice}>{expert.priceRange}</p>
                          </div>
                        </div>
                      </div>

                      <div className={styles.expertCopy}>
                        <p className={styles.expertDescription}>{expert.introduction}</p>
                      </div>

                      <div className={styles.skillSection}>
                        <p className={styles.skillLabel}>具备技能</p>
                        <div className={styles.skillList}>
                          {expert.skills.map(skill => (
                            <span key={skill} className={styles.skillChip}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Link className={styles.detailLink} to={`/portal/agents/${expert.slug}`}>
                        查看专家详情
                        <ArrowRightOutlined />
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        styles.explorer,
        styles.isCollapsedExplorer,
        mode === "compact" ? styles.isCompactExplorer : styles.isPageExplorer,
      )}
    >
      <div
        className={classNames(
          styles.collapsedStrip,
          mode === "compact" ? styles.isCompactCollapsedStrip : styles.isPageCollapsedStrip,
        )}
        role="list"
        aria-label="AI 专家团场景入口"
      >
        {resolvedScenes.map(({ indexLabel, scene }) => (
          <button
            key={scene.id}
            type="button"
            className={classNames(styles.sceneEntry, SCENE_TONE_CLASS_MAP[scene.tone])}
            onClick={() => handleSceneToggle(scene.id)}
          >
            <img className={styles.sceneCoverImage} src={scene.coverImageUrl} alt={scene.title} />
            <div className={styles.sceneCoverShade} />
            <div className={styles.sceneCoverGrid} />

            <span className={styles.sceneEntryContent}>
              <span className={styles.sceneMeta}>
                <span className={styles.sceneIndex}>{indexLabel}</span>
                <span className={styles.sceneSubtitle}>{scene.subtitle}</span>
              </span>

              <span className={styles.sceneEntryTitle}>{scene.title}</span>

              <span className={styles.sceneActionButton}>
                点击展开
                <ArrowRightOutlined />
              </span>
            </span>
          </button>
        ))}

        {browseCardTo ? (
          <Link to={browseCardTo} className={classNames(styles.sceneEntry, styles.browseEntry)}>
            <span className={styles.browseEntryContent}>
              <span className={styles.browseEntryLabel}>View More</span>
              <span className={styles.browseEntryTitle}>查看更多</span>
              <span className={styles.sceneActionButton}>
                进入 AI 专家团
                <ArrowRightOutlined />
              </span>
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
};

/**
 * 计算协作对话当前消息状态。
 */
const getConversationStatusLabel = (
  messageIndex: number,
  visibleMessageCount: number,
  totalMessageCount: number,
): string => {
  const isLastVisibleMessage = messageIndex === visibleMessageCount - 1;

  if (visibleMessageCount < totalMessageCount && isLastVisibleMessage) {
    return "处理中";
  }

  return "已完成";
};

/**
 * 获取首页第三屏场景文案。
 */
const getCompactScenePresentation = (scene: MarketingExpertSceneItem): CompactScenePresentation => {
  const presentation = COMPACT_SCENE_PRESENTATION_MAP[scene.id];

  if (presentation) {
    return presentation;
  }

  return {
    hook: scene.taskDemo?.userPrompt ?? scene.summary,
    beforeText: "以前：任务散在不同岗位和工具里，靠人反复接力，过程难追踪。",
    afterText: scene.taskDemo?.completionNote ?? "现在：任务进入同一条协作链路，专家分工完成。",
  };
};
