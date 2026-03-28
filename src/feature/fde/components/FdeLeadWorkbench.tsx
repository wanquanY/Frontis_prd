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

interface FdeLeadWorkbenchProps {
  activeRole: FdeWorkbenchRole;
  items: FdeLeadItem[];
  members: FdeTeamMemberItem[];
  sceneOptions: string[];
  selectedLeadId: string;
  setSelectedLeadId: (leadId: string) => void;
  assignLead: (leadId: string, memberId: string | null) => void;
  createLead: (payload: FdeLeadFormState) => void;
  updateLeadStatus: (leadId: string, status: FdeLeadStatus) => void;
}

const LEAD_FILTERS: LeadFilterKey[] = ["全部", "新线索", "跟进中", "已成单", "已放弃"];

const getLeadStatusClassName = (status: FdeLeadStatus): string => {
  if (status === "新线索") {
    return styles.statusNew;
  }

  if (status === "跟进中") {
    return styles.statusActive;
  }

  if (status === "已成单") {
    return styles.statusWon;
  }

  return styles.statusLost;
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
  updateLeadStatus,
}: FdeLeadWorkbenchProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<LeadFilterKey>("全部");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<FdeLeadFormState>(createInitialFdeLeadFormState());

  const filteredItems = useMemo<FdeLeadItem[]>(
    () => (activeFilter === "全部" ? items : items.filter(item => item.status === activeFilter)),
    [activeFilter, items],
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

        {activeRole === "leader" ? (
          <Button
            type="primary"
            className={styles.createButton}
            onClick={() => setIsCreateModalOpen(true)}
          >
            主动添加线索工单
          </Button>
        ) : null}
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
                  <span
                    className={classNames(styles.statusTag, getLeadStatusClassName(item.status))}
                  >
                    {item.status}
                  </span>
                </div>
                <div className={styles.listMeta}>联系人：{item.contactName}</div>
                <div className={styles.listMeta}>感兴趣：{item.interestedScenes.join(" / ")}</div>
                <div className={styles.listMeta}>
                  {item.createdAt} · {item.source}
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
                  <span className={styles.detailLabel}>来源</span>
                  <span className={styles.detailValue}>{selectedLead.source}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>创建时间</span>
                  <span className={styles.detailValue}>{selectedLead.createdAt}</span>
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

              <div className={styles.actionRow}>
                <Button onClick={() => updateLeadStatus(selectedLead.id, "跟进中")}>
                  标记跟进中
                </Button>
                <Button type="primary" onClick={() => updateLeadStatus(selectedLead.id, "已成单")}>
                  转为正式订单
                </Button>
                <Button danger onClick={() => updateLeadStatus(selectedLead.id, "已放弃")}>
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
          <Input
            placeholder="预算范围"
            value={formState.budgetLabel}
            onChange={event => handleFormFieldChange("budgetLabel", event.target.value)}
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
