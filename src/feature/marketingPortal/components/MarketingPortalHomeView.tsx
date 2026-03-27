import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { ArrowDownOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import {
  PORTAL_ARCHITECTURE_STEPS,
  PORTAL_FEATURED_EXPERT_SCENES,
  PORTAL_INDUSTRY_SIGNALS,
  PORTAL_SCENARIOS,
  PORTAL_TECH_FEATURES,
  PORTAL_VALUE_PILLARS,
} from "@/feature/marketingPortal/portalData";
import {
  createMarketingContactPath,
  getFeaturedMarketingCaseStudies,
} from "@/feature/marketingPortal/utils";

import { MarketingExpertCrewExplorer } from "./MarketingExpertCrewExplorer";
import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalHomeView.module.less";

interface HomeSectionItem {
  id: string;
  label: string;
  indexLabel: string;
  navLabel: string;
}

type HomeHeaderTone = "dark" | "light";

const HOME_SECTIONS: HomeSectionItem[] = [
  {
    id: "portal-hero",
    label: "封面",
    indexLabel: "01",
    navLabel: "Cover",
  },
  {
    id: "portal-value",
    label: "价值",
    indexLabel: "02",
    navLabel: "Value",
  },
  {
    id: "portal-architecture",
    label: "架构",
    indexLabel: "03",
    navLabel: "System",
  },
  {
    id: "portal-scenarios",
    label: "场景",
    indexLabel: "04",
    navLabel: "Scenarios",
  },
  {
    id: "portal-case",
    label: "案例",
    indexLabel: "05",
    navLabel: "Case",
  },
  {
    id: "portal-agents",
    label: "AI 专家团",
    indexLabel: "06",
    navLabel: "Agents",
  },
  {
    id: "portal-cta",
    label: "收口",
    indexLabel: "07",
    navLabel: "CTA",
  },
];

const LIGHT_HOME_SECTION_IDS = new Set<string>([
  "portal-value",
  "portal-scenarios",
  "portal-agents",
]);

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

  const featuredCases = useMemo(() => getFeaturedMarketingCaseStudies(), []);
  const leadCase = featuredCases[0] ?? null;
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
        <section
          id="portal-hero"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.heroSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.heroCopy}>
              <p className={layoutStyles.sectionLabel}>Enterprise AI Employee Delivery</p>
              <h1 className={styles.heroTitle}>让 AI 员工真正进入你的企业</h1>
              <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
                FrontisAI 把岗位能力封装成可交付的 AI
                员工，在企业本地盒子运行，在云端统一协作与管理。
                它不是一个聊天工具，而是一套能被采购、部署、扩容和持续运营的企业能力。
              </p>

              <div className={styles.heroActions}>
                <Link className={layoutStyles.primaryButton} to="/portal/contact">
                  预约产品演示
                  <ArrowRightOutlined />
                </Link>
                <Link className={layoutStyles.secondaryButton} to="/portal/cases">
                  查看客户案例
                </Link>
              </div>

              <div className={styles.signalRow}>
                {PORTAL_INDUSTRY_SIGNALS.map(item => (
                  <span
                    key={item.id}
                    className={classNames(layoutStyles.chip, layoutStyles.chipDark)}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.heroPoster}>
              <div className={styles.posterGlow} />
              <div className={styles.posterGrid} />
              <div className={styles.posterNodeBox}>
                <p className={styles.posterLabel}>现场盒子</p>
                <p className={styles.posterTitle}>本地运行</p>
                <p className={styles.posterCopy}>文件、记录与执行过程留在企业现场。</p>
              </div>
              <div className={styles.posterNodeCloud}>
                <p className={styles.posterLabel}>云端控制平面</p>
                <p className={styles.posterTitle}>统一管理</p>
                <p className={styles.posterCopy}>账号、权限、线索与运营统计全部上云。</p>
              </div>
              <div className={styles.posterNodeWeb}>
                <p className={styles.posterLabel}>浏览器使用端</p>
                <p className={styles.posterTitle}>多人协作</p>
                <p className={styles.posterCopy}>员工和管理员都通过 Web 直接使用。</p>
              </div>
              <div className={styles.posterRingPrimary} />
              <div className={styles.posterRingSecondary} />
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
          id="portal-value"
          data-home-section="true"
          className={classNames(layoutStyles.glassSection, styles.pageSection, styles.valueSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>Why FrontisAI</p>
              <h2 className={layoutStyles.sectionTitle}>先讲价值，不讲功能表</h2>
              <p className={layoutStyles.sectionDescription}>
                对外官网应该像品牌册，而不是原型说明书。这里一屏只保留三条最有杀伤力的价值表达。
              </p>
            </div>

            <div className={styles.valueGrid}>
              {PORTAL_VALUE_PILLARS.map(item => (
                <article key={item.id} className={styles.valueCard}>
                  <span className={styles.valueIndex}>{item.eyebrow}</span>
                  <h3 className={styles.valueTitle}>{item.title}</h3>
                  <p className={styles.valueDescription}>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
          {nextSectionMap["portal-value"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-value"]}
              tone="light"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-architecture"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.archSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.archCopy}>
              <p className={layoutStyles.sectionLabel}>System Design</p>
              <h2 className={styles.archTitle}>盒子负责运行，云端负责管理，团队只管使用。</h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.archDescription)}>
                FrontisAI
                的核心差异在于云边端架构。它同时解决老板的采购心智、管理员的安全顾虑，以及员工的真实使用体验。
              </p>
            </div>

            <div className={styles.archFlow}>
              {PORTAL_ARCHITECTURE_STEPS.map((item, index) => (
                <article key={item.id} className={styles.archFlowCard}>
                  <span className={styles.archFlowIndex}>0{index + 1}</span>
                  <h3 className={styles.archFlowTitle}>{item.title}</h3>
                  <p className={styles.archFlowDescription}>{item.description}</p>
                </article>
              ))}
            </div>

            <div className={styles.archFeatureRail}>
              {PORTAL_TECH_FEATURES.map(item => (
                <article key={item.id} className={styles.archFeatureCard}>
                  <h3 className={styles.archFeatureTitle}>{item.title}</h3>
                  <p className={styles.archFeatureDescription}>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
          {nextSectionMap["portal-architecture"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-architecture"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-scenarios"
          data-home-section="true"
          className={classNames(
            layoutStyles.lightSection,
            styles.pageSection,
            styles.scenarioSection,
          )}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>Use Cases</p>
              <h2 className={layoutStyles.sectionTitle}>三个最容易成交的切入点</h2>
              <p className={layoutStyles.sectionDescription}>
                一屏只留三个场景，不再铺满列表。让访客先对号入座，再决定是否深入看 Agent 商店。
              </p>
            </div>

            <div className={styles.scenarioGrid}>
              {PORTAL_SCENARIOS.map(item => (
                <article key={item.id} className={styles.scenarioCard}>
                  <div className={styles.scenarioMedia}>
                    <img className={styles.scenarioImage} src={item.imageUrl} alt={item.title} />
                  </div>
                  <div className={styles.scenarioBody}>
                    <p className={styles.scenarioResult}>{item.result}</p>
                    <h3 className={styles.scenarioTitle}>{item.title}</h3>
                    <p className={styles.scenarioDescription}>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          {nextSectionMap["portal-scenarios"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-scenarios"]}
              tone="light"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-case"
          data-home-section="true"
          className={classNames(layoutStyles.darkSection, styles.pageSection, styles.caseSection)}
        >
          <div className={styles.sectionInner}>
            {leadCase ? (
              <article className={styles.caseSpotlight}>
                <div className={styles.caseCopy}>
                  <p className={layoutStyles.sectionLabel}>Featured Case</p>
                  <h2 className={styles.caseTitle}>{leadCase.title}</h2>
                  <p className={classNames(layoutStyles.darkTextMuted, styles.caseDescription)}>
                    {leadCase.summary}
                  </p>

                  <div className={styles.caseMetricRow}>
                    {leadCase.metrics.map(metric => (
                      <article key={metric.label} className={styles.caseMetricCard}>
                        <p className={styles.caseMetricValue}>{metric.value}</p>
                        <p className={styles.caseMetricLabel}>{metric.label}</p>
                      </article>
                    ))}
                  </div>

                  <div className={styles.caseActions}>
                    <Link
                      className={layoutStyles.primaryButton}
                      to={`/portal/cases/${leadCase.slug}`}
                    >
                      阅读完整案例
                      <ArrowRightOutlined />
                    </Link>
                    <Link
                      className={layoutStyles.secondaryButton}
                      to={createMarketingContactPath(leadCase.agentNames)}
                    >
                      复制这套方案
                    </Link>
                  </div>
                </div>

                <div className={styles.caseVisual}>
                  <img
                    className={styles.caseImage}
                    src={leadCase.coverImageUrl}
                    alt={leadCase.title}
                  />
                  <div className={styles.caseOverlay} />
                </div>
              </article>
            ) : null}
          </div>
          {nextSectionMap["portal-case"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-case"]}
              tone="dark"
              onJump={handleSectionJump}
            />
          ) : null}
        </section>

        <section
          id="portal-agents"
          data-home-section="true"
          className={classNames(layoutStyles.lightSection, styles.pageSection, styles.agentSection)}
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={layoutStyles.sectionLabel}>AI Expert Crews</p>
              <h2 className={layoutStyles.sectionTitle}>沿着场景入口横向展开 AI 专家团</h2>
              <p className={layoutStyles.sectionDescription}>
                每个斜切矩形都是一个业务场景入口。点击之后，卡片会直接展开这一组 AI
                专家，让访客先理解场景，再理解组合。
              </p>
            </div>

            <MarketingExpertCrewExplorer
              mode="compact"
              scenes={PORTAL_FEATURED_EXPERT_SCENES}
              browseCardTo="/portal/agents"
            />
          </div>
          {nextSectionMap["portal-agents"] ? (
            <SectionCue
              nextSection={nextSectionMap["portal-agents"]}
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
              <p className={layoutStyles.sectionLabel}>Start Now</p>
              <h2 className={styles.ctaTitle}>
                如果你正在考虑给团队配备第一批 AI 员工，现在可以开始。
              </h2>
              <p className={classNames(layoutStyles.darkTextMuted, styles.ctaDescription)}>
                从一个高频岗位开始试点，再根据设备、角色和业务流程逐步扩容。FrontisAI
                的设计目标不是展示一次，而是持续交付。
              </p>

              <div className={styles.ctaActions}>
                <Link className={layoutStyles.primaryButton} to="/portal/contact">
                  预约产品演示
                  <ArrowRightOutlined />
                </Link>
                <Link className={layoutStyles.secondaryButton} to="/portal/agents">
                  浏览 AI 专家团
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
