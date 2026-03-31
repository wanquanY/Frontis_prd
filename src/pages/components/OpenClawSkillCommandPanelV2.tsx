import classNames from "classnames";

import type { AiCeoHomeSkillItem } from "@/constants/aiCeoHome";

import styles from "./OpenClawSkillCommandPanelV2.module.less";

type OpenClawSkillPanelTab = "favorite" | "all";

interface OpenClawSkillCommandPanelV2Props {
  visible: boolean;
  tab: OpenClawSkillPanelTab;
  suggestions: AiCeoHomeSkillItem[];
  favoriteCount: number;
  allCount: number;
  favoriteDisabled: boolean;
  activeSkillId: string | null;
  hint: string;
  resolveIcon: (entry: AiCeoHomeSkillItem) => string;
  onUpdateTab: (tab: OpenClawSkillPanelTab) => void;
  onSelect: (skillId: string) => void;
}

/**
 * OpenClaw V2 技能命令面板。
 *
 * 复刻 source chat composer 上方的技能浮层交互，用于在 V2 工作台中
 * 选择当前对话要显式启用的技能。
 */
export const OpenClawSkillCommandPanelV2 = ({
  visible,
  tab,
  suggestions,
  favoriteCount,
  allCount,
  favoriteDisabled,
  activeSkillId,
  hint,
  resolveIcon,
  onUpdateTab,
  onSelect,
}: OpenClawSkillCommandPanelV2Props): JSX.Element | null => {
  if (!visible) {
    return null;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>通过 / 选择技能</span>
        <span className={styles.meta}>{suggestions.length} 个</span>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={classNames(styles.tab, {
            [styles.tabActive]: tab === "favorite",
          })}
          disabled={favoriteDisabled}
          onClick={() => onUpdateTab("favorite")}
        >
          常用 {favoriteCount}
        </button>
        <button
          type="button"
          className={classNames(styles.tab, {
            [styles.tabActive]: tab === "all",
          })}
          onClick={() => onUpdateTab("all")}
        >
          全部 {allCount}
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className={styles.list}>
          {suggestions.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={classNames(styles.item, {
                [styles.itemActive]: entry.id === activeSkillId,
              })}
              title={entry.name}
              onClick={() => onSelect(entry.id)}
            >
              <span className={styles.itemIcon}>{resolveIcon(entry)}</span>
              <span className={styles.itemName}>{entry.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.hint}>{hint}</div>
      )}
    </div>
  );
};
