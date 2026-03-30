import classNames from "classnames";
import { Button, Input, Select } from "antd";

import type {
  FdeWorkbenchActivityItem,
  FdeWorkbenchFilterState,
  FdeWorkbenchRole,
  FdeWorkbenchSearchResultItem,
  FdeWorkbenchTargetInfo,
  FdeWorkbenchTodoItem,
} from "@/feature/fde/types";

import styles from "./FdeOverviewDashboard.module.less";

interface FdeOverviewDashboardProps {
  activeRole: FdeWorkbenchRole;
  activityFeed: FdeWorkbenchActivityItem[];
  hasActiveFilters: boolean;
  onOpenTarget: (target: FdeWorkbenchTargetInfo) => void;
  ownerOptions: Array<{ label: string; value: string }>;
  resetWorkbenchFilters: () => void;
  sceneOptions: string[];
  searchResults: FdeWorkbenchSearchResultItem[];
  setWorkbenchFilterOwnerId: (ownerId: string) => void;
  setWorkbenchFilterSceneName: (sceneName: string) => void;
  setWorkbenchFilterSearchKeyword: (keyword: string) => void;
  setWorkbenchFilterStatusLabel: (statusLabel: string) => void;
  statusOptions: string[];
  todoItems: FdeWorkbenchTodoItem[];
  workbenchFilters: FdeWorkbenchFilterState;
}

interface TodoCardProps {
  item: FdeWorkbenchTodoItem;
  onClick: (item: FdeWorkbenchTargetInfo) => void;
}

const TodoCard = ({ item, onClick }: TodoCardProps): JSX.Element => (
  <button
    type="button"
    className={classNames(
      styles.todoCard,
      styles[`todoCard${item.tone.charAt(0).toUpperCase()}${item.tone.slice(1)}`],
      item.disabled && styles.todoCardDisabled,
    )}
    disabled={item.disabled}
    onClick={() => onClick(item)}
  >
    <div className={styles.todoTop}>
      <span className={styles.todoScope}>{item.scopeLabel}</span>
      <strong className={styles.todoCount}>{item.count}</strong>
    </div>
    <div className={styles.todoLabel}>{item.label}</div>
    <div className={styles.todoDescription}>{item.description}</div>
  </button>
);

interface SearchResultCardProps {
  item: FdeWorkbenchSearchResultItem;
  onClick: (item: FdeWorkbenchTargetInfo) => void;
}

const SearchResultCard = ({ item, onClick }: SearchResultCardProps): JSX.Element => (
  <button type="button" className={styles.searchResultItem} onClick={() => onClick(item)}>
    <div className={styles.searchResultTop}>
      <span className={styles.searchResultModule}>{item.moduleLabel}</span>
      <span className={styles.searchResultStatus}>{item.statusLabel}</span>
    </div>
    <div className={styles.searchResultTitle}>{item.title}</div>
    <div className={styles.searchResultSubtitle}>{item.subtitle}</div>
    <div className={styles.searchResultMeta}>负责人：{item.ownerLabel}</div>
  </button>
);

/**
 * FDE 工作台总控页。
 */
export const FdeOverviewDashboard = ({
  activeRole,
  activityFeed,
  hasActiveFilters,
  onOpenTarget,
  ownerOptions,
  resetWorkbenchFilters,
  sceneOptions,
  searchResults,
  setWorkbenchFilterOwnerId,
  setWorkbenchFilterSceneName,
  setWorkbenchFilterSearchKeyword,
  setWorkbenchFilterStatusLabel,
  statusOptions,
  todoItems,
  workbenchFilters,
}: FdeOverviewDashboardProps): JSX.Element => {
  const overviewTitle = activeRole === "leader" ? "团队待办中心" : "我的待办中心";

  return (
    <div className={styles.dashboard}>
      <section className={styles.filterPanel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>统一搜索与筛选</div>
            <div className={styles.panelDescription}>
              按客户、负责人、场景和状态快速收敛当前工作台范围。
            </div>
          </div>

          <Button onClick={resetWorkbenchFilters}>重置条件</Button>
        </div>

        <div className={styles.filterGrid}>
          <Input
            allowClear
            className={styles.filterInput}
            placeholder="搜索客户、Agent、联系人、工单号、问题关键词"
            value={workbenchFilters.searchKeyword}
            onChange={event => setWorkbenchFilterSearchKeyword(event.target.value)}
          />
          <Select
            className={styles.filterSelect}
            options={ownerOptions}
            value={workbenchFilters.ownerId}
            onChange={value => setWorkbenchFilterOwnerId(value)}
          />
          <Select
            className={styles.filterSelect}
            options={[
              {
                label: "全部场景",
                value: "all",
              },
              ...sceneOptions.map(item => ({
                label: item,
                value: item,
              })),
            ]}
            value={workbenchFilters.sceneName}
            onChange={value => setWorkbenchFilterSceneName(value)}
          />
          <Select
            className={styles.filterSelect}
            options={[
              {
                label: "全部状态",
                value: "all",
              },
              ...statusOptions.map(item => ({
                label: item,
                value: item,
              })),
            ]}
            value={workbenchFilters.statusLabel}
            onChange={value => setWorkbenchFilterStatusLabel(value)}
          />
        </div>
      </section>

      <section className={styles.overviewGrid}>
        <article className={styles.overviewPanel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelTitle}>
                {hasActiveFilters ? "快速定位结果" : overviewTitle}
              </div>
              <div className={styles.panelDescription}>
                {hasActiveFilters
                  ? "已按当前筛选条件返回跨模块对象，点击后会直接打开对应工作区。"
                  : activeRole === "leader"
                    ? "负责人可以直接查看跨模块待推进事项，并一键跳到对应对象。"
                    : "工程师只展示和当前成员直接相关的待办，便于快速处理。"}
              </div>
            </div>
          </div>
          {hasActiveFilters ? (
            searchResults.length ? (
              <div className={styles.searchResultList}>
                {searchResults.map(item => (
                  <SearchResultCard key={item.id} item={item} onClick={onOpenTarget} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                当前筛选条件下没有命中的工作对象，可以调整负责人、场景或状态范围。
              </div>
            )
          ) : (
            <div className={styles.todoGrid}>
              {todoItems.map(item => (
                <TodoCard key={item.id} item={item} onClick={onOpenTarget} />
              ))}
            </div>
          )}
        </article>

        <article className={styles.activityPanel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelTitle}>统一日志</div>
              <div className={styles.panelDescription}>
                {hasActiveFilters
                  ? "日志已按当前筛选条件联动收敛，便于追踪跨模块操作记录。"
                  : "最近跨模块操作和待处理告警都会汇总在这里。"}
              </div>
            </div>
          </div>
          {activityFeed.length ? (
            <div className={styles.activityList}>
              {activityFeed.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.activityItem}
                  onClick={() => onOpenTarget(item)}
                >
                  <div className={styles.activityTop}>
                    <span className={styles.activityModule}>{item.moduleLabel}</span>
                    <span className={styles.activityTime}>{item.createdAt}</span>
                  </div>
                  <div className={styles.activityTitle}>{item.title}</div>
                  <div className={styles.activityDetail}>{item.detail}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>当前筛选条件下没有可展示的跨模块日志记录。</div>
          )}
        </article>
      </section>
    </div>
  );
};
