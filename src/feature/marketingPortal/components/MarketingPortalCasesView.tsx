import { startTransition, useMemo, useState } from "react";

import classNames from "classnames";
import { ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { PORTAL_CASE_STUDIES } from "@/feature/marketingPortal/portalData";
import { createMarketingContactPath } from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalCasesView.module.less";

/**
 * 营销门户案例列表视图。
 */
export const MarketingPortalCasesView = (): JSX.Element => {
  const industryFilters = useMemo(
    () => ["全部", ...Array.from(new Set(PORTAL_CASE_STUDIES.map(item => item.industry)))],
    [],
  );
  const [activeIndustry, setActiveIndustry] = useState<string>("全部");

  const visibleCases = useMemo(
    () =>
      activeIndustry === "全部"
        ? PORTAL_CASE_STUDIES
        : PORTAL_CASE_STUDIES.filter(item => item.industry === activeIndustry),
    [activeIndustry],
  );

  const spotlightCase = visibleCases[0] ?? null;
  const secondaryCases = visibleCases.slice(1);

  return (
    <div className={styles.page}>
      <section className={classNames(layoutStyles.darkSection, styles.heroSection)}>
        <div>
          <p className={layoutStyles.sectionLabel}>Client Stories</p>
          <h1 className={styles.heroTitle}>这些企业已经让 AI 员工进入日常运营</h1>
          <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
            高端 B2B
            门户最重要的不是说自己有多少功能，而是让潜在客户看到类似企业已经如何部署、如何获益，以及为什么这件事值得现在开始。
          </p>
        </div>

        <div className={styles.filterRow}>
          {industryFilters.map(item => (
            <button
              key={item}
              type="button"
              aria-pressed={item === activeIndustry}
              className={classNames(
                styles.filterButton,
                item === activeIndustry && styles.isActiveFilterButton,
              )}
              onClick={() =>
                startTransition(() => {
                  setActiveIndustry(item);
                })
              }
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {spotlightCase ? (
        <section className={classNames(layoutStyles.lightSection, styles.spotlightSection)}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={layoutStyles.sectionLabel}>Featured Story</p>
              <h2 className={layoutStyles.sectionTitle}>{spotlightCase.title}</h2>
              <p className={layoutStyles.sectionDescription}>{spotlightCase.summary}</p>
            </div>

            <Link className={layoutStyles.primaryButton} to={`/portal/cases/${spotlightCase.slug}`}>
              阅读完整案例
              <ArrowRightOutlined />
            </Link>
          </div>

          <div className={styles.spotlightBody}>
            <div className={styles.spotlightMedia}>
              <img
                className={styles.spotlightImage}
                src={spotlightCase.coverImageUrl}
                alt={spotlightCase.title}
              />
            </div>

            <div className={styles.spotlightContent}>
              <span className={layoutStyles.chip}>{spotlightCase.industry}</span>
              <p className={styles.customerName}>{spotlightCase.customerName}</p>
              <div className={styles.metricGrid}>
                {spotlightCase.metrics.map(metric => (
                  <article key={metric.label} className={styles.metricCard}>
                    <p className={styles.metricValue}>{metric.value}</p>
                    <p className={styles.metricLabel}>{metric.label}</p>
                  </article>
                ))}
              </div>
              <Link
                className={layoutStyles.secondaryButton}
                to={createMarketingContactPath(spotlightCase.agentNames)}
              >
                咨询类似方案
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.gridSection}>
        <div className={styles.caseGrid}>
          {secondaryCases.map(item => (
            <article
              key={item.id}
              className={classNames(layoutStyles.lightSection, styles.caseCard)}
            >
              <img className={styles.caseImage} src={item.coverImageUrl} alt={item.title} />
              <div className={styles.caseBody}>
                <div className={styles.caseMeta}>
                  <span className={layoutStyles.chip}>{item.industry}</span>
                  <span className={styles.caseCustomer}>{item.customerName}</span>
                </div>
                <h3 className={styles.caseTitle}>{item.title}</h3>
                <p className={styles.caseSummary}>{item.summary}</p>
                <Link className={styles.caseLink} to={`/portal/cases/${item.slug}`}>
                  查看案例
                  <ArrowRightOutlined />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
