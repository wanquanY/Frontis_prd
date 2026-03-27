import classNames from "classnames";
import { ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { PORTAL_AGENTS, PORTAL_CASE_STUDIES } from "@/feature/marketingPortal/portalData";
import type { MarketingCaseStudyItem } from "@/feature/marketingPortal/types";
import { createMarketingContactPath } from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalCaseDetailView.module.less";

interface MarketingPortalCaseDetailViewProps {
  caseStudy: MarketingCaseStudyItem;
}

/**
 * 营销门户案例详情视图。
 */
export const MarketingPortalCaseDetailView = ({
  caseStudy,
}: MarketingPortalCaseDetailViewProps): JSX.Element => {
  const relatedAgents = PORTAL_AGENTS.filter(item => caseStudy.agentNames.includes(item.name));
  const relatedCases = PORTAL_CASE_STUDIES.filter(item => item.slug !== caseStudy.slug).slice(0, 2);

  return (
    <div className={styles.page}>
      <section className={classNames(layoutStyles.darkSection, styles.heroSection)}>
        <div className={styles.heroMedia}>
          <img className={styles.heroImage} src={caseStudy.coverImageUrl} alt={caseStudy.title} />
          <div className={styles.heroOverlay} />
        </div>

        <div className={styles.heroContent}>
          <span className={layoutStyles.chip}>{caseStudy.industry}</span>
          <p className={styles.customerName}>{caseStudy.customerName}</p>
          <h1 className={styles.heroTitle}>{caseStudy.title}</h1>
          <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
            {caseStudy.summary}
          </p>

          <div className={styles.metricGrid}>
            {caseStudy.metrics.map(metric => (
              <article key={metric.label} className={styles.metricCard}>
                <p className={styles.metricValue}>{metric.value}</p>
                <p className={styles.metricLabel}>{metric.label}</p>
              </article>
            ))}
          </div>

          <div className={styles.heroActions}>
            <Link
              className={layoutStyles.primaryButton}
              to={createMarketingContactPath(caseStudy.agentNames)}
            >
              复制这套方案
              <ArrowRightOutlined />
            </Link>
            <Link className={layoutStyles.secondaryButton} to="/portal/cases">
              返回案例列表
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.storySection}>
        <article className={classNames(layoutStyles.lightSection, styles.storyCard)}>
          <p className={layoutStyles.sectionLabel}>Background</p>
          <h2 className={styles.storyTitle}>背景</h2>
          <p className={styles.storyCopy}>{caseStudy.background}</p>
        </article>

        <article className={classNames(layoutStyles.lightSection, styles.storyCard)}>
          <p className={layoutStyles.sectionLabel}>Solution</p>
          <h2 className={styles.storyTitle}>方案</h2>
          <p className={styles.storyCopy}>{caseStudy.solution}</p>
        </article>

        <article className={classNames(layoutStyles.lightSection, styles.storyCard)}>
          <p className={layoutStyles.sectionLabel}>Outcome</p>
          <h2 className={styles.storyTitle}>效果</h2>
          <p className={styles.storyCopy}>{caseStudy.effect}</p>
        </article>
      </section>

      <section className={classNames(layoutStyles.lightSection, styles.gallerySection)}>
        <div className={styles.galleryGrid}>
          {caseStudy.detailImageUrls.map(imageUrl => (
            <img
              key={imageUrl}
              className={styles.galleryImage}
              src={imageUrl}
              alt={caseStudy.title}
            />
          ))}
        </div>

        {caseStudy.quote ? (
          <article className={styles.quoteCard}>
            <p className={styles.quoteContent}>“{caseStudy.quote.content}”</p>
            <div className={styles.quoteAuthor}>
              <img
                className={styles.quoteAvatar}
                src={caseStudy.quote.avatarUrl}
                alt={caseStudy.quote.authorName}
              />
              <div>
                <p className={styles.quoteName}>{caseStudy.quote.authorName}</p>
                <p className={styles.quoteRole}>{caseStudy.quote.authorRole}</p>
              </div>
            </div>
          </article>
        ) : null}
      </section>

      <section className={styles.relatedSection}>
        <div className={styles.relatedGrid}>
          <article className={classNames(layoutStyles.lightSection, styles.relatedCard)}>
            <p className={layoutStyles.sectionLabel}>Agents Involved</p>
            <h2 className={layoutStyles.sectionTitle}>使用的 AI 员工</h2>
            <div className={styles.agentList}>
              {relatedAgents.map(item => (
                <Link key={item.id} className={styles.agentChip} to={`/portal/agents/${item.slug}`}>
                  {item.name}
                </Link>
              ))}
            </div>
          </article>

          <article className={classNames(layoutStyles.lightSection, styles.relatedCard)}>
            <p className={layoutStyles.sectionLabel}>More Stories</p>
            <h2 className={layoutStyles.sectionTitle}>相似案例</h2>
            <div className={styles.relatedCaseList}>
              {relatedCases.map(item => (
                <Link
                  key={item.id}
                  className={styles.relatedCaseLink}
                  to={`/portal/cases/${item.slug}`}
                >
                  <span>{item.title}</span>
                  <ArrowRightOutlined />
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};
