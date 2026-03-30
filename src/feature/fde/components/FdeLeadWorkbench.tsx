import { useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, message, Modal, Select } from "antd";

import type {
  FdeLeadFormState,
  FdeLeadItem,
  FdeLeadStatus,
  FdeTeamMemberItem,
  FdeWorkbenchRole,
} from "@/feature/fde/types";
import { createInitialFdeLeadFormState } from "@/feature/fde/mockData";
import { getFdeAvatarUrl, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeLeadWorkbench.module.less";

type LeadFilterKey = "全部" | FdeLeadStatus;
const ALL_SOURCE_FILTER = "全部来源";

interface FdeLeadWorkbenchProps {
  activeRole: FdeWorkbenchRole;
  items: FdeLeadItem[];
  members: FdeTeamMemberItem[];
  sceneOptions: string[];
  selectedLeadId: string;
  setSelectedLeadId: (leadId: string) => void;
  assignLead: (leadId: string, memberId: string | null) => void;
  createLead: (payload: FdeLeadFormState) => void;
  convertLeadToOpportunity: (leadId: string) => string | null;
  updateLeadStatus: (leadId: string, status: FdeLeadStatus) => void;
}

const LEAD_FILTERS: LeadFilterKey[] = ["全部", "新线索", "跟进中", "已转商机", "已放弃"];

const getLeadStatusClassName = (status: FdeLeadStatus): string => {
  if (status === "新线索") {
    return styles.statusNew;
  }

  if (status === "跟进中") {
    return styles.statusActive;
  }

  if (status === "已转商机") {
    return styles.statusWon;
  }

  return styles.statusLost;
};

const getPriorityClassName = (priority: FdeLeadItem["priority"]): string => {
  if (priority === "高") {
    return styles.priorityHigh;
  }

  if (priority === "中") {
    return styles.priorityMedium;
  }

  return styles.priorityLow;
};

/**
 * 线索工单视图。
 */
export const FdeLeadWorkbench = ({
  activeRole,
  items,
  members,
  sceneOptions,
  selectedLeadId,
  setSelectedLeadId,
  assignLead,
  createLead,
  convertLeadToOpportunity,
  updateLeadStatus,
}: FdeLeadWorkbenchProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<LeadFilterKey>("全部");
  const [activeSource, setActiveSource] = useState<string>(ALL_SOURCE_FILTER);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<FdeLeadFormState>(createInitialFdeLeadFormState());
  const sourceOptions = useMemo<string[]>(
    () => [ALL_SOURCE_FILTER, ...Array.from(new Set(items.map(item => item.source)))],
    [items],
  );

  const filteredItems = useMemo<FdeLeadItem[]>(
    () =>
      items.filter(item => {
        const matchesStatus = activeFilter === "全部" ? true : item.status === activeFilter;
        const matchesSource = activeSource === ALL_SOURCE_FILTER ? true : item.source === activeSource;
        return matchesStatus && matchesSource;
      }),
    [activeFilter, activeSource, items],
  );
  const selectedLead = useMemo<FdeLeadItem | null>(
    () => filteredItems.find(item => item.id === selectedLeadId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedLeadId],
  );

  const handleFormFieldChange = <TKey extends keyof FdeLeadFormState>(
    field: TKey,
    value: FdeLeadFormState[TKey],
  ): void => {
    setFormState(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCreateLead = (): void => {
    if (!formState.companyName.trim() || !formState.contactName.trim() || !formState.phone.trim()) {
      message.warning("请先补全公司、联系人和手机号。");
      return;
    }

    createLead(formState);
    setFormState(createInitialFdeLeadFormState());
    setIsCreateModalOpen(false);
    setActiveFilter("新线索");
    message.success("已新增线索工单。");
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无线索工单" />;
  }

  return (
    <div className={styles.workbench}>
      <section className={styles.toolbar}>
        <div className={styles.filterRow}>
          {LEAD_FILTERS.map(filterKey => (
            <button
              key={filterKey}
              type="button"
              className={classNames(
                styles.filterButton,
                activeFilter === filterKey && styles.filterButtonActive,
              )}
              onClick={() => setActiveFilter(filterKey)}
            >
              {filterKey}
              <span className={styles.filterCount}>
                {filterKey === "全部"
                  ? items.length
                  : items.filter(item => item.status === filterKey).length}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          <Select
            className={styles.sourceSelect}
            value={activeSource}
            options={sourceOptions.map(item => ({
              label: item,
              value: item,
            }))}
            onChange={value => setActiveSource(value)}
          />

          {activeRole === "leader" ? (
            <Button
              type="primary"
              className={styles.createButton}
              onClick={() => setIsCreateModalOpen(true)}
            >
              主动添加线索工单
            </Button>
          ) : null}
        </div>
      </section>

      <section className={styles.body}>
        <aside className={styles.listPanel}>
          <div className={styles.listPanelHeader}>线索工单列表</div>
          <div className={styles.list}>
            {filteredItems.map(item => (
              <button
                key={item.id}
                type="button"
                className={classNames(
                  styles.listItem,
                  item.id === selectedLead?.id && styles.listItemActive,
                )}
                onClick={() => setSelectedLeadId(item.id)}
              >
                <div className={styles.listItemTop}>
                  <strong>{item.companyName}</strong>
                  <div className={styles.listItemTags}>
                    <span
                      className={classNames(styles.priorityTag, getPriorityClassName(item.priority))}
                    >
                      {item.priority}优先
                    </span>
                    <span
                      className={classNames(styles.statusTag, getLeadStatusClassName(item.status))}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
                <div className={styles.listMeta}>联系人：{item.contactName}</div>
                <div className={styles.listMeta}>感兴趣：{item.interestedScenes.join(" / ")}</div>
                <div className={styles.listMeta}>
                  {item.createdAt} · {item.source}
                </div>
                <div className={styles.listMeta}>
                  下次回访：{item.nextFollowUpAt || "待安排"}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <article className={styles.detailPanel}>
          {selectedLead ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailTitle}>{selectedLead.companyName}</div>
                  <div className={styles.detailSubtitle}>
                    {selectedLead.contactName} · {selectedLead.phone}
                  </div>
                </div>
                <span
                  className={classNames(
                    styles.statusTag,
                    getLeadStatusClassName(selectedLead.status),
                  )}
                >
                  {selectedLead.status}
                </span>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>感兴趣场景</span>
                  <span className={styles.detailValue}>
                    {selectedLead.interestedScenes.join(" / ")}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>预算</span>
                  <span className={styles.detailValue}>{selectedLead.budgetLabel}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>优先级</span>
                  <span className={styles.detailValue}>{selectedLead.priority}优先</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>来源</span>
                  <span className={styles.detailValue}>{selectedLead.source}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>下次回访</span>
                  <span className={styles.detailValue}>{selectedLead.nextFollowUpAt || "待安排"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>创建时间</span>
                  <span className={styles.detailValue}>{selectedLead.createdAt}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>最近跟进</span>
                  <span className={styles.detailValue}>{selectedLead.lastFollowUpAt}</span>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <section className={styles.summaryBlock}>
                  <div className={styles.detailLabel}>需求摘要</div>
                  <p className={styles.summaryText}>{selectedLead.summary}</p>
                </section>
                <section className={styles.summaryBlock}>
                  <div className={styles.detailLabel}>跟进备注</div>
                  <p className={styles.summaryText}>{selectedLead.remark}</p>
                </section>
              </div>

              <div className={styles.ownerCard}>
                <div className={styles.ownerInfo}>
                  <div className={styles.detailLabel}>当前跟进人</div>
                  <div className={styles.ownerValue}>
                    {selectedLead.assignedToId
                      ? getFdeMemberName(members, selectedLead.assignedToId)
                      : "待分配"}
                  </div>
                </div>

                {activeRole === "leader" ? (
                  <Select
                    className={styles.ownerSelect}
                    allowClear
                    placeholder="分配给 FDE 员工"
                    value={selectedLead.assignedToId ?? undefined}
                    options={members.map(item => ({
                      label: item.name,
                      value: item.id,
                    }))}
                    onChange={value => assignLead(selectedLead.id, value ?? null)}
                  />
                ) : null}
              </div>

              <section className={styles.timelineCard}>
                <div className={styles.detailLabel}>跟进时间线</div>
                <div className={styles.timelineList}>
                  {selectedLead.timeline.map(item => (
                    <div key={item.id} className={styles.timelineItem}>
                      <div className={styles.timelineHeader}>
                        <strong>{item.title}</strong>
                        <span className={styles.timelineTime}>{item.createdAt}</span>
                      </div>
                      <p className={styles.timelineDetail}>{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className={styles.actionRow}>
                <Button
                  disabled={selectedLead.status === "已放弃" || selectedLead.status === "已转商机"}
                  onClick={() => updateLeadStatus(selectedLead.id, "跟进中")}
                >
                  标记跟进中
                </Button>
                <Button
                  type="primary"
                  disabled={selectedLead.status === "已放弃"}
                  onClick={() => {
                    const opportunityId = convertLeadToOpportunity(selectedLead.id);
                    if (!opportunityId) {
                      return;
                    }

                    message.success(
                      selectedLead.status === "已转商机"
                        ? "已打开对应商机。"
                        : "线索已转入商机工作台。",
                    );
                  }}
                >
                  {selectedLead.status === "已转商机" ? "查看商机" : "转为商机"}
                </Button>
                <Button
                  danger
                  disabled={selectedLead.status === "已转商机"}
                  onClick={() => updateLeadStatus(selectedLead.id, "已放弃")}
                >
                  标记已放弃
                </Button>
              </div>
            </>
          ) : (
            <Empty description="当前筛选下暂无线索" />
          )}
        </article>
      </section>

      <Modal
        title="主动添加线索工单"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          <Input
            placeholder="公司名称"
            value={formState.companyName}
            onChange={event => handleFormFieldChange("companyName", event.target.value)}
          />
          <Input
            placeholder="联系人"
            value={formState.contactName}
            onChange={event => handleFormFieldChange("contactName", event.target.value)}
          />
          <Input
            placeholder="手机号"
            value={formState.phone}
            onChange={event => handleFormFieldChange("phone", event.target.value)}
          />
          <Select
            mode="multiple"
            placeholder="感兴趣的业务场景"
            value={formState.interestedScenes}
            options={sceneOptions.map(item => ({ label: item, value: item }))}
            onChange={value => handleFormFieldChange("interestedScenes", value)}
          />
          <Input
            placeholder="线索来源"
            value={formState.source}
            onChange={event => handleFormFieldChange("source", event.target.value)}
          />
          <Select
            value={formState.priority}
            options={[
              { label: "高优先", value: "高" },
              { label: "中优先", value: "中" },
              { label: "低优先", value: "低" },
            ]}
            onChange={value => handleFormFieldChange("priority", value)}
          />
          <Input
            placeholder="预算范围"
            value={formState.budgetLabel}
            onChange={event => handleFormFieldChange("budgetLabel", event.target.value)}
          />
          <Input
            placeholder="下次回访时间，如 2026-03-31 14:00"
            value={formState.nextFollowUpAt}
            onChange={event => handleFormFieldChange("nextFollowUpAt", event.target.value)}
          />
          <Input.TextArea
            rows={3}
            placeholder="需求摘要"
            value={formState.summary}
            onChange={event => handleFormFieldChange("summary", event.target.value)}
          />
          <Input.TextArea
            rows={3}
            placeholder="备注"
            value={formState.remark}
            onChange={event => handleFormFieldChange("remark", event.target.value)}
          />
          <Select
            allowClear
            placeholder="可选：直接分配跟进人"
            value={formState.assignedToId ?? undefined}
            options={members.map(item => ({
              label: (
                <div className={styles.memberOption}>
                  <img src={getFdeAvatarUrl(item.avatarSeed)} alt={item.name} />
                  <span>{item.name}</span>
                </div>
              ),
              value: item.id,
            }))}
            onChange={value => handleFormFieldChange("assignedToId", value ?? null)}
          />
          <div className={styles.modalActions}>
            <Button onClick={() => setIsCreateModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleCreateLead}>
              创建工单
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
