import ArrowTop from "@/assets/images/workspace/workspace-arrow-top.svg";
import ArrowLeft from "@/assets/images/workspace/workspace-arrow-left.svg";
import type { WorkspaceEmptyStateProps } from "@/feature/workspace/types";

import styles from "./WorkspaceEmptyState.module.less";

/**
 * WorkspaceEmptyState
 *
 * 工作空间空状态（首次新建引导）。
 */
export const WorkspaceEmptyState = ({
  title = "在工作空间",
  subtitle = "与智能体伙伴一起，让你的想法快速落地为成果",
  showGuides = true,
  showNavHint = false,
  navHintLabel,
  actionLabel,
  onActionClick,
}: WorkspaceEmptyStateProps): JSX.Element => {
  return (
    <div className={styles.wrapper}>
      {showGuides ? (
        <>
          <div className={styles.arrow_top}>
            <img src={ArrowTop} alt="" />
            <div className={styles.arrow_top_desc}>邀请智能体伙伴</div>
          </div>
          <div className={styles.arrow_left}>
            <img src={ArrowLeft} alt="" />
            <div className={styles.arrow_left_desc}>上传文件到知识库</div>
          </div>
        </>
      ) : null}

      {showNavHint && navHintLabel ? (
        <div className={styles.navGuide} aria-label={navHintLabel}>
          <img className={styles.navGuideArrow} src={ArrowTop} alt="" aria-hidden="true" />
          <div className={styles.navGuideDesc}>{navHintLabel}</div>
        </div>
      ) : null}

      {actionLabel ? (
        <div className={styles.actionGroup} aria-label={actionLabel}>
          <img className={styles.actionArrow} src={ArrowLeft} alt="" aria-hidden="true" />
          <button
            type="button"
            className={styles.actionButton}
            onClick={onActionClick}
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
      <div></div>

      <div className={styles.content}>
        <div className={styles.con_mask}></div>
        <div className={styles.con_img} />
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>

        {/* <div className={styles.upload}>
          <WorkspaceUploadCard onClick={onUploadClick} onDrop={onUploadDrop} onDragOver={onUploadDragOver} />
        </div> */}

        <div className={styles.steps}>{/* <WorkspaceSteps steps={steps} /> */}</div>
      </div>
    </div>
  );
};
