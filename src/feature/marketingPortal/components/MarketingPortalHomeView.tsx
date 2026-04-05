import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

import {
  PORTAL_EXPERT_DOMAINS,
  PORTAL_HOME_PACKAGE,
  PORTAL_HOME_PROBLEM_OPTIONS,
  PORTAL_HOME_TRUST_BADGES,
  PORTAL_HOME_TRUST_LINE,
} from "@/feature/marketingPortal/portalData";
import type {
  MarketingExpertDomainItem,
  MarketingExpertItem,
  MarketingSubExpertItem,
} from "@/feature/marketingPortal/types";

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
    id: "portal-experts",
    indexLabel: "02",
    label: "AI专家团",
    navLabel: "Experts",
  },
  {
    id: "portal-plan",
    indexLabel: "03",
    label: "优惠",
    navLabel: "Offers",
  },
  {
    id: "portal-cta",
    indexLabel: "04",
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

/* ── 专家展示子组件（桑基图流动式） ── */

interface ExpertShowcaseProps {
  domains: MarketingExpertDomainItem[];
}

const ExpertShowcase = ({ domains }: ExpertShowcaseProps): JSX.Element => {
  const [activeDomainKey, setActiveDomainKey] = useState(domains[0]?.key ?? "");
  const [activeExpertId, setActiveExpertId] = useState<string | null>(null);
  const [activeSubExpertId, setActiveSubExpertId] = useState<string | null>(null);

  const activeDomain = domains.find(d => d.key === activeDomainKey) ?? domains[0];

  const handleDomainHover = useCallback((key: string) => {
    if (key === activeDomainKey) return;
    setActiveDomainKey(key);
    setActiveExpertId(null);
    setActiveSubExpertId(null);
  }, [activeDomainKey]);

  const handleExpertClick = useCallback((expert: MarketingExpertItem) => {
    if (activeExpertId === expert.id) {
      setActiveExpertId(null);
      setActiveSubExpertId(null);
    } else {
      setActiveExpertId(expert.id);
      setActiveSubExpertId(null);
    }
  }, [activeExpertId]);

  const handleSubExpertClick = useCallback((sub: MarketingSubExpertItem) => {
    setActiveSubExpertId(prev => (prev === sub.id ? null : sub.id));
  }, []);

  const activeExpert = activeDomain?.experts.find(e => e.id === activeExpertId) ?? null;
  const activeSubExpert = activeExpert?.subExperts.find(s => s.id === activeSubExpertId) ?? null;

  return (
    <div className={styles.flowShowcase}>
      {/* ── Tier 0：领域选择 ── */}
      <div className={styles.flowTier}>
        <div className={styles.flowNodeRow}>
          {domains.map(domain => (
            <button
              key={domain.key}
              type="button"
              className={classNames(
                styles.flowDomainNode,
                activeDomainKey === domain.key && styles.flowDomainNodeActive,
              )}
              onMouseEnter={() => handleDomainHover(domain.key)}
              onClick={() => handleDomainHover(domain.key)}
            >
              <span className={styles.flowDomainLabel}>{domain.label}</span>
              <span className={styles.flowDomainFull}>{domain.fullLabel}</span>
              <span className={styles.flowDomainCount}>{domain.experts.length} 位专家</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 流动连接线：领域 → 专家 ── */}
      <div className={styles.flowConnector}>
        <div className={styles.flowStream} />
      </div>

      {/* ── Tier 1：专家 ── */}
      <div className={styles.flowTier} key={`experts-${activeDomainKey}`}>
        <div className={styles.flowNodeRow}>
          {activeDomain?.experts.map(expert => (
            <button
              key={expert.id}
              type="button"
              className={classNames(
                styles.flowExpertNode,
                activeExpertId === expert.id && styles.flowExpertNodeActive,
              )}
              onClick={() => handleExpertClick(expert)}
            >
              <div
                className={styles.flowExpertAvatar}
                style={{ background: expert.avatarGradient }}
              >
                <UserOutlined />
              </div>
              <span className={styles.flowExpertName}>{expert.name}</span>
              <span className={styles.flowExpertMeta}>{expert.subExperts.length} 位子专家</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 流动连接线：专家 → 子专家 ── */}
      {activeExpert && (
        <>
          <div className={styles.flowConnector}>
            <div className={styles.flowStream} />
          </div>

          {/* ── Tier 2：子专家 ── */}
          <div className={styles.flowTier} key={`subs-${activeExpert.id}`}>
            <p className={styles.flowTierHint}>
              <span className={styles.flowTierHintAccent}>{activeExpert.name}</span> 专家团成员
            </p>
            <div className={styles.flowNodeRow}>
              {activeExpert.subExperts.map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  className={classNames(
                    styles.flowSubNode,
                    activeSubExpertId === sub.id && styles.flowSubNodeActive,
                  )}
                  onClick={() => handleSubExpertClick(sub)}
                >
                  <div className={styles.flowSubIcon}>
                    <UserOutlined />
                  </div>
                  <span className={styles.flowSubName}>{sub.name}</span>
                  <span className={styles.flowSubMeta}>{sub.skills.length} 项 Skill</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── 流动连接线：子专家 → Skill ── */}
      {activeSubExpert && (
        <>
          <div className={styles.flowConnector}>
            <div className={styles.flowStream} />
          </div>

          {/* ── Tier 3：Skill 能力 ── */}
          <div className={styles.flowTier} key={`skills-${activeSubExpert.id}`}>
            <p className={styles.flowTierHint}>
              <span className={styles.flowTierHintAccent}>{activeSubExpert.name}</span> 的 Skill 能力
            </p>
            <div className={styles.flowSkillRow}>
              {activeSubExpert.skills.map(skill => (
                <article key={skill.id} className={styles.flowSkillCard}>
                  <div className={styles.flowSkillHeader}>
                    <ThunderboltOutlined className={styles.flowSkillIcon} />
                    <span className={styles.flowSkillName}>{skill.name}</span>
                  </div>
                  <p className={styles.flowSkillDesc}>{skill.description}</p>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
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
        {/* ── 第一屏：Hero ── */}
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

        {/* ── 第二屏：AI 专家团展示 ── */}
        <section
          id="portal-experts"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.expertsSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <h2 className={layoutStyles.sectionTitle}>
                <span className={styles.highlightText}>Frontis AI 专家团</span>，覆盖产供销通四大领域
              </h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.expertsDescription)}>
                Frontis AI 为企业打造覆盖生产制造、供应链、销售营销、通用管理的 AI 专家团队，覆盖企业 80% 的核心业务。
              </p>
            </div>

            <ExpertShowcase domains={PORTAL_EXPERT_DOMAINS} />
          </div>
          {nextSectionMap["portal-experts"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-experts"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        {/* ── 第三屏：定价 ── */}
        <section
          id="portal-plan"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.agentSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading} style={{ textAlign: "center", maxWidth: "100%", alignSelf: "center" }}>
              <h2 className={layoutStyles.sectionTitle}>
                19 万 8，换一支<span className={styles.highlightText}>永不离职</span>的 AI 专家团队
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

        {/* ── 第四屏：CTA ── */}
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
