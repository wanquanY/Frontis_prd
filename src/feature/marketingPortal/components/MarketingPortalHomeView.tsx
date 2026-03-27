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
    label: "封面",
    navLabel: "Cover",
  },
  {
    id: "portal-anxiety",
    indexLabel: "02",
    label: "焦虑",
    navLabel: "Anxiety",
  },
  {
    id: "portal-handoff",
    indexLabel: "03",
    label: "接管",
    navLabel: "Handoff",
  },
  {
    id: "portal-mindset",
    indexLabel: "04",
    label: "认知",
    navLabel: "Mindset",
  },
  {
    id: "portal-logo",
    indexLabel: "05",
    label: "背书",
    navLabel: "Logos",
  },
  {
    id: "portal-plan",
    indexLabel: "06",
    label: "套餐",
    navLabel: "Plan",
  },
  {
    id: "portal-cta",
    indexLabel: "07",
    label: "收口",
    navLabel: "CTA",
  },
];

const LIGHT_HOME_SECTION_IDS = new Set<string>(["portal-anxiety", "portal-mindset", "portal-plan"]);

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
  const ctaContactPath = useMemo(() => {
    const params = new URLSearchParams();

    if (leadName.trim()) {
      params.set("name", leadName.trim());
    }
    if (leadPhone.trim()) {
      params.set("phone", leadPhone.trim());
    }
    if (problemFocus) {
      params.set("focus", problemFocus);
    }

    const query = params.toString();

    return query ? `/portal/contact?${query}` : "/portal/contact";
  }, [leadName, leadPhone, problemFocus]);

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
              <p className={layoutStyles.sectionLabel}>fAI Public Cloud</p>
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
                <Link className={layoutStyles.secondaryButton} to="/portal/contact">
                  预约一次 15 分钟演示
                </Link>
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
          className={classNames(layoutStyles.glassSection, styles.pageSection, styles.valueSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>说的就是你</p>
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
              tone="light"
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
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>AI 专家接管</p>
              <h2 className={styles.archTitle}>
                老板说一句话
                <br />
                AI 专家团队，把整件事从头交付
              </h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.archDescription)}>
                不是工具。不是软件。是一组真正懂业务的 AI 专家，分工协作，随时待命。
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
            layoutStyles.lightSection,
            styles.pageSection,
            styles.scenarioSection,
          )}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>重新认识这件事</p>
              <h2 className={layoutStyles.sectionTitle}>
                你以为你在买软件
                <br />
                但你买到的是一组不会离岗的 AI 专家团
              </h2>
            </div>

            <div className={styles.mindsetBoard}>
              <article className={styles.mindsetColumn}>
                <div className={styles.mindsetColumnHeader}>
                  <CloseCircleFilled className={styles.mindsetColumnIcon} />
                  <div>
                    <p className={styles.mindsetColumnEyebrow}>传统方式</p>
                    <h3 className={styles.mindsetColumnTitle}>传统软件 / 传统人力</h3>
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
                    <p className={styles.mindsetColumnEyebrow}>AI 专家团</p>
                    <h3 className={styles.mindsetColumnTitle}>Frontis AI 专家团</h3>
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
              tone="light"
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
            <div className={classNames(styles.sectionHeading, styles.logoHeading)}>
              <p className={layoutStyles.sectionLabel}>客户 Logo 墙</p>
              <h2 className={styles.caseTitle}>他们已经把这些事，交出去了</h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.caseDescription)}>
                来自不同行业的企业主，正在用 fAI 的 AI 员工团队跑业务。
              </p>
            </div>

            <div className={styles.logoWall}>
              {PORTAL_HOME_LOGO_WALL_ITEMS.map(item => (
                <article
                  key={item.id}
                  className={classNames(
                    styles.logoItem,
                    item.tileSize === "wide" && styles.isWideLogoItem,
                  )}
                >
                  <img className={styles.logoImage} src={item.logoUrl} alt={item.name} />
                  <span className={styles.logoName}>{item.name}</span>
                </article>
              ))}
            </div>

            <p className={styles.logoFootnote}>
              以下品牌 Logo 仅作版式占位示意 · 可替换为正式客户 Logo 墙
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
          className={classNames(layoutStyles.lightSection, styles.pageSection, styles.agentSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>套餐与信任</p>
              <h2 className={layoutStyles.sectionTitle}>一次投入，换一支永不离职的 AI 员工团队</h2>
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
              tone="light"
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
              <p className={layoutStyles.sectionLabel}>最终 CTA</p>
              <h2 className={styles.ctaTitle}>
                你不需要现在就决定
                <br />
                先看看，AI 员工能替你做什么
              </h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.ctaDescription)}>
                留下你的联系方式，我们的 FDE 顾问会在 24 小时内联系你。
                <br />
                给你 15 分钟，演示一个你最头疼的业务场景。
              </p>

              <div className={styles.ctaFormCard}>
                <div className={styles.ctaFieldGrid}>
                  <input
                    className={styles.ctaInput}
                    placeholder="姓名"
                    value={leadName}
                    onChange={event => setLeadName(event.target.value)}
                  />
                  <input
                    className={styles.ctaInput}
                    placeholder="手机"
                    value={leadPhone}
                    onChange={event => setLeadPhone(event.target.value)}
                  />
                  <select
                    className={styles.ctaSelect}
                    value={problemFocus}
                    onChange={event => setProblemFocus(event.target.value)}
                  >
                    {PORTAL_HOME_PROBLEM_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.ctaActions}>
                  <Link className={layoutStyles.primaryButton} to={ctaContactPath}>
                    预约 15 分钟演示
                    <ArrowRightOutlined />
                  </Link>
                </div>
              </div>

              <p className={styles.ctaClosing}>
                你的同行，已经不靠人解决这些问题了。
                <span>你呢？</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
