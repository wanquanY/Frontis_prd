import classNames from "classnames";
import { ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import type { MarketingAgentItem } from "@/feature/marketingPortal/types";
import {
  createMarketingContactPath,
  getMarketingCasesByAgentName,
  getRelatedMarketingAgents,
} from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalAgentDetailView.module.less";

interface MarketingPortalAgentDetailViewProps {
  agent: MarketingAgentItem;
}

/**
 * 营销门户 AI 专家详情视图。
 */
export const MarketingPortalAgentDetailView = ({
  agent,
}: MarketingPortalAgentDetailViewProps): JSX.Element => {
  const relatedAgents = getRelatedMarketingAgents(agent);
  const relatedCases = getMarketingCasesByAgentName(agent.name).slice(0, 2);

  return (
    <div className={styles.page}>
      <section className={classNames(layoutStyles.darkSection, styles.heroSection)}>
        <div className={styles.heroMedia}>
          <img className={styles.heroImage} src={agent.imageUrl} alt={agent.name} />
        </div>

        <div className={styles.heroContent}>
          <span className={layoutStyles.chip}>{agent.category}</span>
          <p className={styles.heroLabel}>AI Expert Detail</p>
          <h1 className={styles.heroTitle}>{agent.name}</h1>
          <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
            {agent.introduction}
          </p>

          <div className={styles.metaGrid}>
            <article className={styles.metaCard}>
              <p className={styles.metaLabel}>价格区间</p>
              <p className={styles.metaValue}>{agent.priceRange}</p>
            </article>
            <article className={styles.metaCard}>
              <p className={styles.metaLabel}>适用岗位</p>
              <div className={styles.roleList}>
                {agent.targetRoles.map(role => (
                  <span key={role} className={styles.roleChip}>
                    {role}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.heroActions}>
            <Link
              className={layoutStyles.primaryButton}
              to={createMarketingContactPath([agent.name])}
            >
              预约该 AI 专家演示
              <ArrowRightOutlined />
            </Link>
            <Link className={layoutStyles.secondaryButton} to="/portal/agents">
              返回 AI 专家团
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.bodyGrid}>
        <section className={classNames(layoutStyles.lightSection, styles.workflowSection)}>
          <p className={layoutStyles.sectionLabel}>Workflow</p>
          <h2 className={layoutStyles.sectionTitle}>典型工作流程</h2>
          <div className={styles.workflowList}>
            {agent.workflow.map((step, index) => (
              <article key={step} className={styles.workflowItem}>
                <span className={styles.workflowIndex}>0{index + 1}</span>
                <p className={styles.workflowText}>{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={classNames(layoutStyles.lightSection, styles.skillSection)}>
          <p className={layoutStyles.sectionLabel}>Core Skills</p>
          <h2 className={layoutStyles.sectionTitle}>核心技能</h2>
          <div className={styles.skillList}>
            {agent.skills.map(skill => (
              <span key={skill} className={styles.skillChip}>
                {skill}
              </span>
            ))}
          </div>

          <div className={styles.faqList}>
            {agent.faqs.map(item => (
              <details key={item.question} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{item.question}</summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </section>

      {relatedCases.length ? (
        <section className={classNames(layoutStyles.lightSection, styles.relatedSection)}>
          <div className={styles.relatedHeading}>
            <div>
              <p className={layoutStyles.sectionLabel}>Related Cases</p>
              <h2 className={layoutStyles.sectionTitle}>这个 AI 专家已在哪些业务里被验证</h2>
            </div>
            <Link className={layoutStyles.ghostButton} to="/portal/cases">
              查看全部案例
              <ArrowRightOutlined />
            </Link>
          </div>

          <div className={styles.relatedCaseGrid}>
            {relatedCases.map(item => (
              <article key={item.id} className={styles.relatedCaseCard}>
                <img
                  className={styles.relatedCaseImage}
                  src={item.coverImageUrl}
                  alt={item.title}
                />
                <div className={styles.relatedCaseBody}>
                  <span className={layoutStyles.chip}>{item.industry}</span>
                  <h3 className={styles.relatedCaseTitle}>{item.title}</h3>
                  <Link className={styles.relatedCaseLink} to={`/portal/cases/${item.slug}`}>
                    阅读案例
                    <ArrowRightOutlined />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.relatedAgentSection}>
        <div className={styles.relatedHeading}>
          <div>
            <p className={layoutStyles.sectionLabel}>More Experts</p>
            <h2 className={layoutStyles.sectionTitle}>相关 AI 专家</h2>
          </div>
        </div>

        <div className={styles.relatedAgentGrid}>
          {relatedAgents.map(item => (
            <article
              key={item.id}
              className={classNames(layoutStyles.lightSection, styles.relatedAgentCard)}
            >
              <img className={styles.relatedAgentImage} src={item.imageUrl} alt={item.name} />
              <div className={styles.relatedAgentBody}>
                <span className={layoutStyles.chip}>{item.category}</span>
                <h3 className={styles.relatedAgentTitle}>{item.name}</h3>
                <p className={styles.relatedAgentSummary}>{item.summary}</p>
                <Link className={layoutStyles.secondaryButton} to={`/portal/agents/${item.slug}`}>
                  查看详情
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
