import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { ArrowRightOutlined, CheckCircleFilled } from "@ant-design/icons";
import { message } from "antd";
import { useSearchParams } from "react-router-dom";

import {
  PORTAL_BUNDLES,
  PORTAL_INDUSTRY_OPTIONS,
  PORTAL_PROOF_STATS,
  PORTAL_AGENTS,
} from "@/feature/marketingPortal/portalData";
import type { MarketingLeadFormState } from "@/feature/marketingPortal/types";
import {
  createInitialMarketingLeadFormState,
  isValidMarketingPhone,
  parseMarketingLeadTargets,
} from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalContactView.module.less";

/**
 * 营销门户联系页视图。
 */
export const MarketingPortalContactView = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const selectedAgents = useMemo(() => parseMarketingLeadTargets(searchParams), [searchParams]);
  const [formState, setFormState] = useState<MarketingLeadFormState>(
    createInitialMarketingLeadFormState(selectedAgents),
  );

  useEffect(() => {
    setFormState(createInitialMarketingLeadFormState(selectedAgents));
  }, [selectedAgents]);

  const handleFieldChange = useCallback(
    <TField extends keyof MarketingLeadFormState>(
      field: TField,
      value: MarketingLeadFormState[TField],
    ): void => {
      setFormState(previous => ({
        ...previous,
        [field]: value,
      }));
    },
    [],
  );

  const handleAgentToggle = useCallback((name: string): void => {
    setFormState(previous => {
      const nextInterestedAgents = previous.interestedAgents.includes(name)
        ? previous.interestedAgents.filter(item => item !== name)
        : [...previous.interestedAgents, name];

      return {
        ...previous,
        interestedAgents: nextInterestedAgents,
      };
    });
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (
        !formState.name.trim() ||
        !formState.company.trim() ||
        !formState.role.trim() ||
        !formState.phone.trim() ||
        !formState.industry.trim()
      ) {
        message.warning("请补全姓名、公司名、职位、手机号和行业后再提交。");
        return;
      }

      if (!isValidMarketingPhone(formState.phone)) {
        message.warning("请输入正确的 11 位手机号。");
        return;
      }

      message.success("已收到您的需求，我们将在 1～2 个工作日内联系您。");
      setFormState(createInitialMarketingLeadFormState(selectedAgents));
    },
    [formState, selectedAgents],
  );

  return (
    <div className={styles.page}>
      <section className={classNames(layoutStyles.darkSection, styles.heroSection)}>
        <div className={styles.heroCopy}>
          <p className={layoutStyles.sectionLabel}>Contact Sales</p>
          <h1 className={styles.heroTitle}>从一场产品演示开始，把 AI 员工带进你的企业</h1>
          <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
            如果你已经看到了某个岗位切入点，或者想讨论一套组合方案，这一页的目标只有一个：让销售和
            FDE 团队拿到足够完整的信息，进入真正的方案沟通。
          </p>

          <div className={styles.expectationList}>
            {PORTAL_PROOF_STATS.map(item => (
              <article key={item.label} className={styles.expectationCard}>
                <CheckCircleFilled />
                <div>
                  <p className={styles.expectationTitle}>{item.label}</p>
                  <p className={styles.expectationCopy}>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.timelineCard}>
          <p className={styles.timelineLabel}>接下来会发生什么</p>
          <div className={styles.timelineList}>
            <article className={styles.timelineItem}>
              <span className={styles.timelineIndex}>01</span>
              <div>
                <p className={styles.timelineTitle}>确认场景</p>
                <p className={styles.timelineCopy}>先锁定一个最值得试点的岗位或部门。</p>
              </div>
            </article>
            <article className={styles.timelineItem}>
              <span className={styles.timelineIndex}>02</span>
              <div>
                <p className={styles.timelineTitle}>演示与方案沟通</p>
                <p className={styles.timelineCopy}>
                  围绕盒子部署、Agent 组合和管理端体验展开演示。
                </p>
              </div>
            </article>
            <article className={styles.timelineItem}>
              <span className={styles.timelineIndex}>03</span>
              <div>
                <p className={styles.timelineTitle}>FDE 交付与扩容</p>
                <p className={styles.timelineCopy}>试点验证后，再逐步增加设备与 Agent 组合。</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={classNames(layoutStyles.lightSection, styles.formCard)}>
          <div className={styles.formHeading}>
            <div>
              <p className={layoutStyles.sectionLabel}>Lead Form</p>
              <h2 className={layoutStyles.sectionTitle}>提交需求</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>姓名 *</span>
                <input
                  className={styles.input}
                  value={formState.name}
                  onChange={event => handleFieldChange("name", event.target.value)}
                  placeholder="请输入姓名"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>公司名 *</span>
                <input
                  className={styles.input}
                  value={formState.company}
                  onChange={event => handleFieldChange("company", event.target.value)}
                  placeholder="请输入公司名"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>职位 *</span>
                <input
                  className={styles.input}
                  value={formState.role}
                  onChange={event => handleFieldChange("role", event.target.value)}
                  placeholder="如：老板 / 管理员 / 业务负责人"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>手机号 *</span>
                <input
                  className={styles.input}
                  inputMode="numeric"
                  value={formState.phone}
                  onChange={event => handleFieldChange("phone", event.target.value)}
                  placeholder="请输入 11 位手机号"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>微信号</span>
                <input
                  className={styles.input}
                  value={formState.wechat}
                  onChange={event => handleFieldChange("wechat", event.target.value)}
                  placeholder="选填"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>行业 *</span>
                <select
                  className={styles.input}
                  value={formState.industry}
                  onChange={event => handleFieldChange("industry", event.target.value)}
                >
                  <option value="">请选择行业</option>
                  {PORTAL_INDUSTRY_OPTIONS.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>感兴趣的 AI 员工</span>
              <div className={styles.agentChoiceGrid}>
                {PORTAL_AGENTS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={classNames(
                      styles.agentChoiceButton,
                      formState.interestedAgents.includes(item.name) &&
                        styles.isActiveAgentChoiceButton,
                    )}
                    onClick={() => handleAgentToggle(item.name)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>备注需求</span>
              <textarea
                className={styles.textarea}
                value={formState.remark}
                onChange={event => handleFieldChange("remark", event.target.value)}
                placeholder="可填写现有流程、计划试点时间或想优先演示的岗位"
              />
            </label>

            <div className={styles.formActions}>
              <button className={layoutStyles.primaryButton} type="submit">
                提交需求
                <ArrowRightOutlined />
              </button>
              <p className={styles.formHint}>
                提交成功后显示“已收到您的需求，我们将在 1～2 个工作日内联系您”。
              </p>
            </div>
          </form>
        </div>

        <div className={styles.asideColumn}>
          {PORTAL_BUNDLES.map(item => (
            <article
              key={item.id}
              className={classNames(layoutStyles.lightSection, styles.bundleCard)}
            >
              <div className={styles.bundleMeta}>
                <span className={layoutStyles.chip}>{item.badge}</span>
                <span className={styles.bundlePrice}>{item.priceRange}</span>
              </div>
              <h3 className={styles.bundleTitle}>{item.name}</h3>
              <p className={styles.bundleDescription}>{item.description}</p>
              <div className={styles.bundleAgentList}>
                {item.agentNames.map(agentName => (
                  <span key={agentName} className={styles.bundleAgent}>
                    {agentName}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
