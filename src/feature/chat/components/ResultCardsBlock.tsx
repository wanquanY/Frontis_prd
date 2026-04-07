import { FileTextOutlined } from "@ant-design/icons";

import type { Block, ResultCardsData } from "@/types/block";

import styles from "./BlockItem.module.less";

/**
 * 结果卡片块组件属性。
 */
export interface ResultCardsBlockProps {
  block: Block;
  onOpenResult?: (resultId: string) => void;
}

/**
 * 渲染结果卡片列表。
 */
export const ResultCardsBlock = ({ block, onOpenResult }: ResultCardsBlockProps) => {
  const data = block.data as unknown as ResultCardsData;
  const items = Array.isArray(data.items)
    ? data.items.filter(item => typeof item.id === "string" && typeof item.title === "string")
    : [];

  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.resultCardsBlock}>
      <div className={styles.resultCardsGrid}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={styles.resultCard}
            onClick={() => onOpenResult?.(item.id)}
            disabled={!onOpenResult}
            aria-label={`打开结果：${item.title}`}
          >
            <span className={styles.resultCardIcon} aria-hidden={true}>
              <FileTextOutlined />
            </span>
            <span className={styles.resultCardBody}>
              {item.badge ? <span className={styles.resultCardBadge}>{item.badge}</span> : null}
              <span className={styles.resultCardTitle}>{item.title}</span>
              {item.subtitle ? (
                <span className={styles.resultCardSubtitle}>{item.subtitle}</span>
              ) : null}
              {item.created_at ? (
                <span className={styles.resultCardMeta}>创建时间：{item.created_at}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
