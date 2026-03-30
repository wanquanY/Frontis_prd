import {
  AppstoreOutlined,
  CloseOutlined,
  FileTextOutlined,
  RiseOutlined,
} from "@ant-design/icons";

import type { DialogueGeneratedResultItem } from "../types";
import { DialogueGeneratedPanel } from "./DialogueGeneratedPanel";
import styles from "./DialogueResultPanel.module.less";

interface DialogueResultPanelProps {
  results: DialogueGeneratedResultItem[];
  activeResultId?: string | null;
  onSelectResult: (resultId: string) => void;
  onBackToGrid: () => void;
  onClose: () => void;
}

/**
 * 对话结果面板。
 *
 * 负责在右侧展示结果卡片宫格，以及放大后的生成式结果详情。
 */
export const DialogueResultPanel = ({
  results,
  activeResultId,
  onSelectResult,
  onBackToGrid,
  onClose,
}: DialogueResultPanelProps): JSX.Element => {
  const selectedResult =
    results.find(item => item.id === activeResultId) ?? (results.length === 1 ? results[0] : null);

  if (selectedResult) {
    return (
      <DialogueGeneratedPanel
        panel={selectedResult.panel}
        onBack={results.length > 1 ? onBackToGrid : undefined}
        onClose={onClose}
      />
    );
  }

  return (
    <aside className={styles.panel} aria-label="结果面板">
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.badge}>
            <AppstoreOutlined />
            <span>结果</span>
          </div>
          <h3 className={styles.title}>交互结果列表</h3>
          <div className={styles.subtitle}>{results.length} 个结果视图，可点击放大查看</div>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="关闭结果面板"
          onClick={onClose}
        >
          <CloseOutlined />
        </button>
      </header>

      <div className={styles.body}>
        {results.length > 0 ? (
          <div className={styles.grid}>
            {results.map(item => (
              <button
                key={item.id}
                type="button"
                className={styles.card}
                onClick={() => onSelectResult(item.id)}
                aria-label={`展开结果：${item.title}`}
              >
                <span className={styles.cardIcon} aria-hidden={true}>
                  <FileTextOutlined />
                </span>
                <span className={styles.cardBody}>
                  {item.badge ? <span className={styles.cardBadge}>{item.badge}</span> : null}
                  <span className={styles.cardTitle}>{item.title}</span>
                  <span className={styles.cardSubtitle}>{item.subtitle}</span>
                  <span className={styles.cardMeta}>
                    {item.panel.skillName} · {item.createdAt}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <RiseOutlined className={styles.emptyStateIcon} />
            <div className={styles.emptyStateTitle}>当前会话还没有结果</div>
            <div className={styles.emptyStateText}>
              当本轮任务完成后，交互结果会整理成卡片，点击即可放大查看。
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
