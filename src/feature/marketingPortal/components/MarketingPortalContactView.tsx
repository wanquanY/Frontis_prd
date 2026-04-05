import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowRightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { useSearchParams } from "react-router-dom";

import { MarketingPortalConsultationDrawer } from "@/feature/marketingPortal/components/MarketingPortalConsultationDrawer";
import { parseMarketingLeadTargets } from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalContactView.module.less";

interface MarketingFdeServiceStepItem {
  id: string;
  indexLabel: string;
  title: string;
  description: string;
}

interface MarketingFdeProblemItem {
  id: string;
  label: string;
  headline: string;
  description: string;
  example: string;
  solutionTitle: string;
  solutionBullets: string[];
}

const FDE_SERVICE_STEPS: MarketingFdeServiceStepItem[] = [
  {
    id: "diagnosis",
    indexLabel: "01",
    title: "需求诊断",
    description: "先对齐业务目标、试点范围和现有流程，明确应该先交付哪一组 AI 专家。",
  },
  {
    id: "design",
    indexLabel: "02",
    title: "方案设计",
    description: "把你的业务拆成场景、动作和协作链路，设计对应的 AI 专家组合。",
  },
  {
    id: "delivery",
    indexLabel: "03",
    title: "定制开发",
    description: "按你的系统、数据和岗位要求做适配，补齐标准专家之外的交付部分。",
  },
  {
    id: "launch",
    indexLabel: "04",
    title: "交付上线",
    description: "完成配置、联调和试点陪跑，让这一组 AI 专家真正进入业务现场。",
  },
  {
    id: "iterate",
    indexLabel: "05",
    title: "持续优化",
    description: "不是一次性交付，FDE 会根据使用反馈继续迭代场景和协作流程。",
  },
];

const FDE_PROBLEM_ITEMS: MarketingFdeProblemItem[] = [
  {
    id: "complex-process",
    label: "业务太复杂",
    headline: "你的业务太复杂，标准 AI 专家不能直接套进去",
    description: "真正卡住你的，不是单点能力，而是业务流程太长、角色太多、上下游依赖太重。",
    example:
      "例如：你需要同时处理销售线索、门店日报、库存预警和招聘进度，这不是一个单点专家能直接覆盖的。",
    solutionTitle: "FDE 会怎么做",
    solutionBullets: [
      "先梳理场景边界，明确哪些动作必须同步推进",
      "把一个场景拆成多位 AI 专家协同交付",
      "按你的岗位节奏重新定义任务流，而不是硬套标准模板",
    ],
  },
  {
    id: "legacy-data",
    label: "数据散在旧系统",
    headline: "数据散在旧系统里，标准专家看不见全貌",
    description:
      "很多企业的问题不是没有数据，而是数据散在 ERP、表格、群消息和旧流程里，彼此连不上。",
    example:
      "例如：财务对账在 Excel，经营日报在群里，门店动作在第三方 SaaS，老板永远拿不到同一张实时看板。",
    solutionTitle: "FDE 会怎么做",
    solutionBullets: [
      "先找到关键数据口径，明确哪些系统必须接入",
      "把不同来源的记录统一成可被 AI 专家消费的数据流",
      "把结果重新组织成老板和团队都能直接使用的交付物",
    ],
  },
  {
    id: "multi-experts",
    label: "多专家协同",
    headline: "你要的不是一个专家，而是一组能协作的 AI 专家",
    description:
      "老板真正要买的不是功能点，而是一个场景能不能跑通；跑通往往需要多位 AI 专家共同完成。",
    example:
      "例如：基于 VOC 的产品创新，需要评论监测、竞品分析、趋势判断和选品建议四位 AI 专家协同才能交付。",
    solutionTitle: "FDE 会怎么做",
    solutionBullets: [
      "按场景配置 AI 专家组合，而不是按功能单卖",
      "定义专家之间的接力顺序、上下文和交付物",
      "用试点方式先跑通一个真实场景，再逐步扩展更多场景",
    ],
  },
];

/**
 * 营销门户 FDE 免费咨询页。
 */
export const MarketingPortalContactView = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const interestedAgentNames = useMemo(
    () => parseMarketingLeadTargets(searchParams),
    [searchParams],
  );
  const [activeProblemId, setActiveProblemId] = useState<string>(FDE_PROBLEM_ITEMS[0].id);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(interestedAgentNames.length > 0);

  useEffect(() => {
    if (interestedAgentNames.length) {
      setIsDrawerOpen(true);
    }
  }, [interestedAgentNames]);

  const activeProblem = useMemo(
    () => FDE_PROBLEM_ITEMS.find(item => item.id === activeProblemId) ?? FDE_PROBLEM_ITEMS[0],
    [activeProblemId],
  );

  const handleOpenDrawer = useCallback((): void => {
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback((): void => {
    setIsDrawerOpen(false);

    if (!searchParams.has("agents")) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("agents");
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <>
      <div className={styles.page}>
        <section className={styles.heroSection}>
          <div className={styles.heroCopy}>
            <p className={layoutStyles.sectionLabel}>FDE Service</p>
            <h1 className={styles.heroTitle}>专属 AI 交付顾问，为你的业务量身部署</h1>
            <p className={classNames(layoutStyles.sectionDescription, layoutStyles.darkTextMuted)}>
              FDE 工程师驻场了解你的流程、数据与团队，为你设计并交付真正跑得起来的 AI 专家团队。
            </p>
          </div>
        </section>

        <section className={classNames(layoutStyles.darkSection, styles.introCard)}>
          <p className={styles.cardEyebrow}>FDE 是什么？</p>
          <p className={styles.cardCopy}>
            FDE（Field Delivery Engineer）是 Frontis AI
            的企业交付专家，深入你的企业，理解你的业务，为你设计并部署专属 AI 专家团队。
          </p>
        </section>

        <section className={styles.processSection}>
          <h2 className={styles.sectionHeading}>服务流程</h2>
          <div className={styles.stepRail}>
            {FDE_SERVICE_STEPS.map((item, index) => (
              <div key={item.id} className={styles.stepCard}>
                <span className={styles.stepIndex}>{item.indexLabel}</span>
                <h3 className={styles.stepTitle}>{item.title}</h3>
                <p className={styles.stepCopy}>{item.description}</p>
                {index < FDE_SERVICE_STEPS.length - 1 ? (
                  <span className={styles.stepConnector} />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.problemSection}>
          <h2 className={styles.sectionHeading}>FDE 能解决什么问题</h2>
          <div className={styles.problemTabs} role="tablist" aria-label="FDE 可解决问题">
            {FDE_PROBLEM_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === activeProblem.id}
                className={classNames(
                  styles.problemTab,
                  item.id === activeProblem.id && styles.isActiveProblemTab,
                )}
                onClick={() => setActiveProblemId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={classNames(layoutStyles.darkSection, styles.problemPanel)}>
            <div className={styles.problemPanelMain}>
              <p className={styles.problemPanelEyebrow}>{activeProblem.label}</p>
              <h3 className={styles.problemPanelTitle}>{activeProblem.headline}</h3>
              <p className={styles.problemPanelCopy}>{activeProblem.description}</p>
              <div className={styles.problemExampleCard}>
                <p className={styles.problemExampleLabel}>案例示意</p>
                <p className={styles.problemExampleCopy}>{activeProblem.example}</p>
              </div>
            </div>

            <div className={styles.problemPanelAside}>
              <p className={styles.problemPanelEyebrow}>{activeProblem.solutionTitle}</p>
              <ul className={styles.problemSolutionList}>
                {activeProblem.solutionBullets.map(item => (
                  <li key={item} className={styles.problemSolutionItem}>
                    <span className={styles.problemSolutionDot} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <button
            className={classNames(layoutStyles.primaryButton, styles.ctaButton)}
            type="button"
            onClick={handleOpenDrawer}
          >
            立即联系 FDE 顾问，免费需求诊断
            <ArrowRightOutlined />
          </button>
        </section>
      </div>

      <MarketingPortalConsultationDrawer
        open={isDrawerOpen}
        initialAgentNames={interestedAgentNames}
        onClose={handleCloseDrawer}
      />
    </>
  );
};
