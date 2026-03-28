import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import { Avatar } from "antd";
import { Link } from "react-router-dom";

import {
  PORTAL_HOME_ANXIETY_MOMENTS,
  PORTAL_FEATURED_EXPERT_SCENES,
  PORTAL_HOME_LOGO_WALL_ITEMS,
  PORTAL_HOME_MINDSET_COMPARISONS,
  PORTAL_HOME_PACKAGE,
  PORTAL_HOME_PROBLEM_OPTIONS,
  PORTAL_HOME_TRUST_BADGES,
  PORTAL_HOME_TRUST_LINE,
} from "@/feature/marketingPortal/portalData";
import { getAvatarText, getAvatarUrl } from "@/pages/utils";

import { MarketingExpertCrewExplorer } from "./MarketingExpertCrewExplorer";
import { MarketingPortalConsultationDrawer } from "./MarketingPortalConsultationDrawer";
import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalHomeView.module.less";

interface HomeSectionItem {
  id: string;
  indexLabel: string;
  label: string;
  navLabel: string;
}

type HomeHeaderTone = "dark" | "light";

const HOME_SECTIONS: HomeSectionItem[] = [
  {
    id: "portal-hero",
    indexLabel: "01",
    label: "Frontis AI",
    navLabel: "Frontis AI",
  },
  {
    id: "portal-anxiety",
    indexLabel: "02",
    label: "是否遇到过",
    navLabel: "Struggling",
  },
  {
    id: "portal-handoff",
    indexLabel: "03",
    label: "AI专家团",
    navLabel: "Experts",
  },
  {
    id: "portal-mindset",
    indexLabel: "04",
    label: "重新认识",
    navLabel: "Discover",
  },
  {
    id: "portal-logo",
    indexLabel: "05",
    label: "他们都选择",
    navLabel: "Trusted",
  },
  {
    id: "portal-plan",
    indexLabel: "06",
    label: "优惠",
    navLabel: "Offers",
  },
  {
    id: "portal-cta",
    indexLabel: "07",
    label: "联系我们",
    navLabel: "Contact",
  },
];

const LIGHT_HOME_SECTION_IDS = new Set<string>([]);

interface SectionCueProps {
  nextSection: HomeSectionItem;
  tone: HomeHeaderTone;
  onJump: (sectionId: string) => void;
}

const SectionCue = ({ nextSection, tone, onJump }: SectionCueProps): JSX.Element => {
  return (
    <button
      type="button"
      className={classNames(styles.sectionCue, tone === "light" && styles.isLightSectionCue)}
      onClick={() => onJump(nextSection.id)}
    >
      <span className={styles.sectionCueMeta}>Next Chapter</span>
      <span className={styles.sectionCueLine} />
      <span className={styles.sectionCueChip}>
        <span className={styles.sectionCueIndex}>{nextSection.indexLabel}</span>
        <span className={styles.sectionCueLabel}>{nextSection.label}</span>
        <ArrowDownOutlined />
      </span>
    </button>
  );
};

/**
 * 营销门户首页视图。
 */
export const MarketingPortalHomeView = (): JSX.Element => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>(HOME_SECTIONS[0]?.id ?? "");
  const [leadName, setLeadName] = useState<string>("");
  const [leadPhone, setLeadPhone] = useState<string>("");
  const [problemFocus, setProblemFocus] = useState<string>(PORTAL_HOME_PROBLEM_OPTIONS[0] ?? "");
  const [consultDrawerOpen, setConsultDrawerOpen] = useState(false);

  const headerTone: HomeHeaderTone = LIGHT_HOME_SECTION_IDS.has(activeSectionId) ? "light" : "dark";
  const nextSectionMap = useMemo(() => {
    return HOME_SECTIONS.reduce<Record<string, HomeSectionItem | null>>(
      (accumulator, section, index) => {
        accumulator[section.id] = HOME_SECTIONS[index + 1] ?? null;
        return accumulator;
      },
      {},
    );
  }, []);
  const anxietyVoiceRows = useMemo(() => {
    const rows: Array<Array<(typeof PORTAL_HOME_ANXIETY_MOMENTS)[number]>> = [[], []];

    PORTAL_HOME_ANXIETY_MOMENTS.forEach((item, index) => {
      rows[index % rows.length]?.push(item);
    });

    return rows
      .filter(items => items.length > 0)
      .map((items, index) => ({
        id: `voice-row-${index + 1}`,
        isReverse: index % 2 === 1,
        items: [...items, ...items],
      }));
  }, []);
  useEffect(() => {
    const sectionHostElement = pageRef.current;

    if (!sectionHostElement) {
      return;
    }

    const portalRootElement =
      sectionHostElement.closest<HTMLElement>("[data-portal-root='true']") ?? null;

    const sectionElements = Array.from(
      sectionHostElement.querySelectorAll<HTMLElement>("[data-home-section='true']"),
    );

    const observer = new IntersectionObserver(
      entries => {
        const visibleEntry = entries
          .filter(entry => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      {
        root: portalRootElement,
        threshold: [0.45, 0.68, 0.9],
      },
    );

    sectionElements.forEach(sectionElement => observer.observe(sectionElement));

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const portalRootElement = pageRef.current?.closest<HTMLElement>("[data-portal-root='true']");

    if (!portalRootElement) {
      return;
    }

    portalRootElement.dataset.portalHome = "true";

    return () => {
      delete portalRootElement.dataset.portalHome;
    };
  }, []);

  useLayoutEffect(() => {
    const portalRootElement = pageRef.current?.closest<HTMLElement>("[data-portal-root='true']");

    if (!portalRootElement) {
      return;
    }

    portalRootElement.dataset.portalHeaderTone = headerTone;

    return () => {
      portalRootElement.dataset.portalHeaderTone = "dark";
    };
  }, [headerTone]);

  const handleSectionJump = (sectionId: string): void => {
    const targetElement = document.getElementById(sectionId);

    targetElement?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const currentSection =
    HOME_SECTIONS.find(section => section.id === activeSectionId) ?? HOME_SECTIONS[0] ?? null;

  return (
    <div className={styles.pageShell}>
      <aside className={styles.pageNav} aria-label="首页章节导航">
        <div className={styles.pageNavMeta}>
          <span className={styles.pageNavIndex}>{currentSection?.indexLabel}</span>
          <span className={styles.pageNavLabel}>{currentSection?.label}</span>
        </div>

        <div className={styles.pageNavDots}>
          {HOME_SECTIONS.map(section => (
            <button
              key={section.id}
              type="button"
              aria-label={section.navLabel}
              aria-pressed={section.id === activeSectionId}
              className={classNames(
                styles.pageNavButton,
                section.id === activeSectionId && styles.isActivePageNavButton,
              )}
              onClick={() => handleSectionJump(section.id)}
            >
              <span className={styles.pageNavDot} />
              <span className={styles.pageNavText}>{section.navLabel}</span>
            </button>
          ))}
        </div>
      </aside>

      <div ref={pageRef} className={styles.pageViewport}>
        <section
          id="portal-hero"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.heroSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.heroCopy}>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroLeadLine}>为你的企业配备一支</span>
                <span className={styles.heroAccentLine}>AI 专家团队</span>
              </h1>
              <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
                销售跟进、内容产出、市场洞察、经营决策
                <br />
                这些事，Frontis 的 AI 专家团队，今天就能接管。
              </p>

              <div className={styles.heroActions}>
                <Link className={layoutStyles.primaryButton} to="/portal/agents">
                  看看 AI 专家能替你做什么
                  <ArrowRightOutlined />
                </Link>
                <button
                  type="button"
                  className={layoutStyles.secondaryButton}
                  onClick={() => setConsultDrawerOpen(true)}
                >
                  预约一次 15 分钟演示
                </button>
              </div>

              <p className={styles.heroTrustLine}>{PORTAL_HOME_TRUST_LINE}</p>
            </div>
          </div>
          {nextSectionMap["portal-hero"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-hero"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-anxiety"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.valueSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <h2 className={layoutStyles.sectionTitle}>你是不是也有这些时刻</h2>
            </div>

            <div className={styles.anxietyStage}>
              <div className={styles.voiceWall} aria-label="用户之声">
                {anxietyVoiceRows.map(row => (
                  <div key={row.id} className={styles.voiceRowViewport}>
                    <div
                      className={classNames(
                        styles.voiceRowTrack,
                        row.isReverse && styles.isReverseVoiceRowTrack,
                      )}
                    >
                      {row.items.map((item, index) => (
                        <article key={`${item.id}-${index}`} className={styles.voiceCard}>
                          <div className={styles.voiceCardHeader}>
                            <div className={styles.voiceIdentity}>
                              <Avatar
                                src={getAvatarUrl(`portal-voice-${item.avatarSeed}`)}
                                className={styles.voiceAvatar}
                              >
                                {getAvatarText(item.authorName)}
                              </Avatar>

                              <div className={styles.voiceIdentityBody}>
                                <div className={styles.voiceAuthorRow}>
                                  <span className={styles.voiceAuthorName}>{item.authorName}</span>
                                  <span className={styles.voiceAuthorRole}>{item.authorRole}</span>
                                </div>
                                <p className={styles.voiceAuthorCompany}>{item.authorCompany}</p>
                              </div>
                            </div>

                            <span className={styles.voiceIndex}>{item.indexLabel}</span>
                          </div>

                          <p className={styles.voiceQuote}>“{item.quote}”</p>
                          <p className={styles.voiceContext}>{item.context}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.transitionDialogue} aria-label="承接对话">
                <div className={styles.transitionBubble}>
                  <span className={styles.transitionBubbleLabel}>老板</span>
                  <p className={styles.transitionBubbleText}>这些不是你一个人的问题。</p>
                </div>

                <div
                  className={classNames(styles.transitionBubble, styles.isAccentTransitionBubble)}
                >
                  <span className={styles.transitionBubbleLabel}>fAI</span>
                  <p className={styles.transitionBubbleText}>
                    这是所有还在靠“人”撑着的公司，眼下都在经历的事。
                  </p>
                </div>

                <div className={classNames(styles.transitionBubble, styles.isSoftTransitionBubble)}>
                  <p className={styles.transitionBubbleText}>但现在，有另一种选项。</p>
                </div>
              </div>
            </div>
          </div>
          {nextSectionMap["portal-anxiety"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-anxiety"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-handoff"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.archSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <h2 className={styles.archTitle}>
                AI专家团，实现任务的端到端交付
              </h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.archDescription)} style={{ marginLeft: "auto", marginRight: "auto" }}>
                不是工具。不是软件。是一批真正懂业务的数字员工，分工协作，随时待命。
              </p>
            </div>

            <MarketingExpertCrewExplorer
              mode="compact"
              scenes={PORTAL_FEATURED_EXPERT_SCENES}
              browseCardTo="/portal/agents"
            />
          </div>
          {nextSectionMap["portal-handoff"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-handoff"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-mindset"
          data-home-section="true"
          className={classNames(
            layoutStyles.darkSection,
            styles.pageSection,
            styles.scenarioSection,
          )}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <p className={classNames(layoutStyles.darkTextMuted, styles.mindsetSubtitle)}>
                你以为你在买软件
              </p>
              <h2 className={layoutStyles.sectionTitle}>
                但你买到的是一批{" "}
                <span className={styles.highlightText}>不休假</span>、
                <span className={styles.highlightText}>不离职</span>、
                <span className={styles.highlightText}>不要五险一金</span>
                {" "}的员工
              </h2>
            </div>

            <div className={styles.mindsetBoard}>
              <article className={styles.mindsetColumn}>
                <div className={styles.mindsetColumnHeader}>
                  <CloseCircleFilled className={styles.mindsetColumnIcon} />
                  <div>
                    <h3 className={styles.mindsetColumnTitle}>传统软件</h3>
                  </div>
                </div>

                <div className={styles.mindsetColumnList}>
                  {PORTAL_HOME_MINDSET_COMPARISONS.map(item => (
                    <article key={item.id} className={styles.mindsetColumnItem}>
                      <span className={styles.mindsetBullet} />
                      <p className={styles.mindsetLegacy}>{item.legacyLabel}</p>
                    </article>
                  ))}
                </div>
              </article>

              <article className={classNames(styles.mindsetColumn, styles.isAccentMindsetColumn)}>
                <div className={styles.mindsetColumnHeader}>
                  <CheckCircleFilled className={styles.mindsetColumnIcon} />
                  <div>
                    <h3 className={styles.mindsetColumnTitle}>Frontis AI 员工</h3>
                  </div>
                </div>

                <div className={styles.mindsetColumnList}>
                  {PORTAL_HOME_MINDSET_COMPARISONS.map(item => (
                    <article key={item.id} className={styles.mindsetColumnItem}>
                      <span className={styles.mindsetBullet} />
                      <p className={styles.mindsetNext}>{item.nextLabel}</p>
                    </article>
                  ))}
                </div>
              </article>
            </div>

            <div className={styles.mindsetHighlights}>
              <article className={styles.valueCard}>
                <span className={styles.valueIndex}>数字员工</span>
                <h3 className={styles.valueTitle}>不是工具，是数字员工</h3>
                <p className={styles.valueDescription}>
                  有分工、有协作，能独立完成整件事的 AI 员工团队。
                </p>
              </article>
              <article className={styles.valueCard}>
                <span className={styles.valueIndex}>开箱即用</span>
                <h3 className={styles.valueTitle}>不用配置，开箱即用</h3>
                <p className={styles.valueDescription}>
                  FDE 工程师全程配置，你的业务场景直接跑通。
                </p>
              </article>
              <article className={styles.valueCard}>
                <span className={styles.valueIndex}>越用越懂</span>
                <h3 className={styles.valueTitle}>越用越懂你</h3>
                <p className={styles.valueDescription}>
                  在你的业务里跑得越久，越知道你真正想要什么。
                </p>
              </article>
            </div>
          </div>
          {nextSectionMap["portal-mindset"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-mindset"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-logo"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.caseSection)}
        >
          <div className={styles.sectionInner}>
            <div className={classNames(styles.sectionHeading, styles.logoHeading)} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <h2 className={styles.caseTitle}>他们已经把这些事，交出去了</h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.caseDescription)} style={{ marginLeft: "auto", marginRight: "auto" }}>
                来自不同行业的企业主，正在用 Frontis 的 AI 专家团队跑业务。
              </p>
            </div>

            <div className={styles.logoMarquee}>
              <div className={styles.voiceRowViewport}>
                <div className={styles.logoRowTrack}>
                  {[...PORTAL_HOME_LOGO_WALL_ITEMS.slice(0, 6), ...PORTAL_HOME_LOGO_WALL_ITEMS.slice(0, 6)].map((item, index) => (
                    <article key={`${item.id}-a-${index}`} className={styles.logoCard}>
                      <img className={styles.logoCardImage} src={item.logoUrl} alt={item.name} />
                      <span className={styles.logoCardName}>{item.name}</span>
                    </article>
                  ))}
                </div>
              </div>
              <div className={styles.voiceRowViewport}>
                <div className={classNames(styles.logoRowTrack, styles.isReverseLogoRowTrack)}>
                  {[...PORTAL_HOME_LOGO_WALL_ITEMS.slice(6), ...PORTAL_HOME_LOGO_WALL_ITEMS.slice(6)].map((item, index) => (
                    <article key={`${item.id}-b-${index}`} className={styles.logoCard}>
                      <img className={styles.logoCardImage} src={item.logoUrl} alt={item.name} />
                      <span className={styles.logoCardName}>{item.name}</span>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <p className={styles.logoFootnote}>
              覆盖电商、品牌、服务、制造等多个行业 · 持续增长中
            </p>
          </div>
          {nextSectionMap["portal-logo"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-logo"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-plan"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.agentSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <h2 className={layoutStyles.sectionTitle}>
                一次投入，换一支<span className={styles.highlightText}>永不离职</span>的 AI 员工团队
              </h2>
            </div>

            <div className={styles.planLayout}>
              <article className={styles.planCard}>
                <span className={styles.planBadge}>企业标准版</span>
                <h3 className={styles.planPrice}>{PORTAL_HOME_PACKAGE.price}</h3>
                <p className={styles.planDescription}>{PORTAL_HOME_PACKAGE.description}</p>

                <div className={styles.planFeatureList}>
                  {PORTAL_HOME_PACKAGE.features.map(feature => (
                    <div key={feature} className={styles.planFeatureItem}>
                      <span className={styles.planFeatureDot}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.heroActions}>
                  <Link className={layoutStyles.primaryButton} to="/portal/contact">
                    {PORTAL_HOME_PACKAGE.primaryActionLabel}
                    <ArrowRightOutlined />
                  </Link>
                  <Link className={layoutStyles.secondaryButton} to="/portal/contact">
                    {PORTAL_HOME_PACKAGE.secondaryActionLabel}
                  </Link>
                </div>
              </article>

              <div className={styles.trustGrid}>
                {PORTAL_HOME_TRUST_BADGES.map(item => (
                  <article key={item.id} className={styles.trustCard}>
                    <span className={styles.trustIcon}>{item.icon}</span>
                    <h3 className={styles.trustTitle}>{item.title}</h3>
                    <p className={styles.trustDescription}>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
          {nextSectionMap["portal-plan"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-plan"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-cta"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.ctaSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.ctaPanel}>
              <p className={classNames(layoutStyles.darkTextMuted, styles.ctaSubtitle)}>
                你不需要现在就决定
              </p>
              <h2 className={styles.ctaTitle}>
                先看看，AI 专家能替你做什么
              </h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.ctaDescription)}>
                留下你的联系方式，我们的 FDE 顾问会在 24 小时内联系你
                <br />
                给你 15 分钟，演示一个你最头疼的业务场景
              </p>

                <div className={styles.ctaFormCard}>
                  <div className={styles.ctaFieldGroup}>
                    <label className={styles.ctaLabel} htmlFor="portalLeadName">
                      姓名 <span className={styles.ctaRequired}>*</span>
                    </label>
                    <input
                      id="portalLeadName"
                      className={styles.ctaInput}
                      placeholder="请输入您的姓名"
                      value={leadName}
                      onChange={event => setLeadName(event.target.value)}
                    />
                  </div>

                  <div className={styles.ctaFieldGroup}>
                    <label className={styles.ctaLabel} htmlFor="portalLeadPhone">
                      手机 <span className={styles.ctaRequired}>*</span>
                    </label>
                    <input
                      id="portalLeadPhone"
                      className={styles.ctaInput}
                      placeholder="请输入您的手机号"
                      value={leadPhone}
                      onChange={event => setLeadPhone(event.target.value)}
                    />
                  </div>

                  <div className={styles.ctaFieldGroup}>
                    <span className={styles.ctaLabel}>最想解决的问题</span>
                    <div className={styles.ctaPillGroup}>
                      {PORTAL_HOME_PROBLEM_OPTIONS.map(option => (
                        <button
                          key={option}
                          type="button"
                          className={classNames(
                            styles.ctaPill,
                            problemFocus === option && styles.isActivePill,
                          )}
                          onClick={() => setProblemFocus(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                <button
                  type="button"
                  className={styles.ctaSubmitButton}
                  onClick={() => setConsultDrawerOpen(true)}
                >
                  预约 15 分钟演示
                </button>
              </div>

              <p className={styles.ctaClosing}>
                你的同行，已经不靠人解决这些问题了。
                <span>你呢？</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      <MarketingPortalConsultationDrawer
        open={consultDrawerOpen}
        initialAgentNames={[]}
        onClose={() => setConsultDrawerOpen(false)}
      />
    </div>
  );
};
