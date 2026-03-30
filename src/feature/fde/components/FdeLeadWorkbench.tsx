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
  activeMemberId: string;
  items: FdeLeadItem[];
  members: FdeTeamMemberItem[];
  sceneOptions: string[];
  selectedLeadId: string;
  setSelectedLeadId: (leadId: string) => void;
  assignLead: (leadId: string, memberId: string | null) => void;
  createLead: (payload: FdeLeadFormState) => void;
  updateLeadStatus: (leadId: string, status: FdeLeadStatus, closedNote?: string) => void;
  addLeadProgress: (leadId: string, content: string) => void;
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
  activeMemberId,
  items,
  members,
  sceneOptions,
  selectedLeadId,
  setSelectedLeadId,
  assignLead,
  createLead,
  updateLeadStatus,
  addLeadProgress,
}: FdeLeadWorkbenchProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<LeadFilterKey>("全部");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<FdeLeadFormState>(createInitialFdeLeadFormState());
  const [progressInput, setProgressInput] = useState<string>("");
  const [pendingAssignee, setPendingAssignee] = useState<string | null>(null);
  const [isWonModalOpen, setIsWonModalOpen] = useState<boolean>(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState<boolean>(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState<boolean>(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [closedNote, setClosedNote] = useState<string>("");
  const [remarkInput, setRemarkInput] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState<string>("");

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

  const handleAddProgress = (): void => {
    if (!selectedLead || !progressInput.trim()) {
      message.warning("请输入跟进内容。");
      return;
    }

    addLeadProgress(selectedLead.id, progressInput);
    setProgressInput("");
    message.success("已添加跟进进度。");
  };

  const handleConfirmAssign = (): void => {
    if (!selectedLead || !pendingAssignee) {
      return;
    }
    assignLead(selectedLead.id, pendingAssignee);
    setPendingAssignee(null);
    message.success("已分配跟进人，线索已转为跟进中。");
  };

  const handleMarkWon = (): void => {
    if (!selectedLead || !closedNote.trim()) {
      message.warning("请填写成单备注。");
      return;
    }
    updateLeadStatus(selectedLead.id, "已成单", closedNote);
    setClosedNote("");
    setIsWonModalOpen(false);
    message.success("已标记为已成单。");
  };

  const handleMarkLost = (): void => {
    if (!selectedLead || !closedNote.trim()) {
      message.warning("请填写放弃原因。");
      return;
    }
    updateLeadStatus(selectedLead.id, "已放弃", closedNote);
    setClosedNote("");
    setIsLostModalOpen(false);
    message.success("已标记为已放弃。");
  };

  const handleAddRemark = (): void => {
    if (!remarkInput.trim()) {
      message.warning("请输入备注内容。");
      return;
    }
    if (selectedLead) {
      addLeadProgress(selectedLead.id, remarkInput);
      setRemarkInput("");
      setIsRemarkModalOpen(false);
      message.success("已添加备注。");
    }
  };

  const handleCreateDelivery = (): void => {
    if (!deliveryNote.trim()) {
      message.warning("请填写配置交付说明。");
      return;
    }
    // TODO: 创建配置交付订单逻辑
    setDeliveryNote("");
    setIsDeliveryModalOpen(false);
    message.success("已转为配置交付订单。");
  };

  const canAddProgress = selectedLead?.status === "跟进中" && selectedLead?.assignedToId === activeMemberId;

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
                {activeRole === "leader" && selectedLead.status === "新线索" ? (
                  <>
                    <div className={styles.ownerInfo}>
                      <div className={styles.detailLabel}>当前跟进人</div>
                      <div className={styles.ownerValue}>
                        {selectedLead.assignedToId
                          ? getFdeMemberName(members, selectedLead.assignedToId)
                          : "待分配"}
                      </div>
                    </div>
                    <div className={styles.assignSection}>
                      <Select
                        className={styles.ownerSelect}
                        allowClear
                        placeholder="分配给 FDE 员工"
                        value={pendingAssignee ?? undefined}
                        options={members.filter(m => m.role === "engineer").map(item => ({
                          label: item.name,
                          value: item.id,
                        }))}
                        onChange={value => setPendingAssignee(value ?? null)}
                      />
                      <Button type="primary" onClick={handleConfirmAssign} disabled={!pendingAssignee}>
                        确认分配
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={styles.ownerInfo}>
                    <div className={styles.detailLabel}>当前跟进人</div>
                    <div className={styles.ownerValue}>
                      {selectedLead.assignedToId
                        ? getFdeMemberName(members, selectedLead.assignedToId)
                        : "待分配"}
                    </div>
                  </div>
                )}
              </div>

              {selectedLead.closedNote ? (
                <div className={styles.closedNoteCard}>
                  <div className={styles.detailLabel}>
                    {selectedLead.status === "已成单" ? "成单备注" : "放弃原因"}
                  </div>
                  <p className={styles.summaryText}>{selectedLead.closedNote}</p>
                </div>
              ) : null}

              {canAddProgress ? (
                <div className={styles.progressSection}>
                  <div className={styles.detailLabel}>添加跟进进度</div>
                  <Input.TextArea
                    rows={3}
                    placeholder="填写本次跟进内容..."
                    value={progressInput}
                    onChange={e => setProgressInput(e.target.value)}
                  />
                  <Button
                    type="primary"
                    style={{ marginTop: 8 }}
                    onClick={handleAddProgress}
                  >
                    提交跟进进度
                  </Button>
                </div>
              ) : null}

              {selectedLead.progressList.length > 0 ? (
                <div className={styles.progressList}>
                  <div className={styles.detailLabel}>跟进进度记录</div>
                  {selectedLead.progressList.map(progress => (
                    <div key={progress.id} className={styles.progressItem}>
                      <div className={styles.progressHeader}>
                        <span className={styles.progressAuthor}>
                          {getFdeMemberName(members, progress.createdBy)}
                        </span>
                        <span className={styles.progressTime}>{progress.createdAt}</span>
                      </div>
                      <div className={styles.progressContent}>{progress.content}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedLead.status === "跟进中" ? (
                <div className={styles.actionRow}>
                  <Button onClick={() => setIsRemarkModalOpen(true)}>添加备注</Button>
                  <Button type="primary" onClick={() => setIsWonModalOpen(true)}>
                    标记为已成单
                  </Button>
                  <Button danger onClick={() => setIsLostModalOpen(true)}>
                    标记已放弃
                  </Button>
                </div>
              ) : null}

              {selectedLead.status === "已成单" ? (
                <div className={styles.actionRow}>
                  <Button type="primary" onClick={() => setIsDeliveryModalOpen(true)}>
                    转为配置交付订单
                  </Button>
                </div>
              ) : null}
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

      <Modal
        title="标记为已成单"
        open={isWonModalOpen}
        onCancel={() => {
          setIsWonModalOpen(false);
          setClosedNote("");
        }}
        footer={null}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          <Input.TextArea
            rows={6}
            placeholder="请填写成单备注，如：成单金额、选配方案、交付时间等"
            value={closedNote}
            onChange={e => setClosedNote(e.target.value)}
          />
          <div className={styles.modalActions}>
            <Button onClick={() => setIsWonModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleMarkWon}>
              确认成单
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="标记已放弃"
        open={isLostModalOpen}
        onCancel={() => {
          setIsLostModalOpen(false);
          setClosedNote("");
        }}
        footer={null}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          <Input.TextArea
            rows={6}
            placeholder="请说明放弃原因，如：预算不足、竞品选择、需求不匹配等"
            value={closedNote}
            onChange={e => setClosedNote(e.target.value)}
          />
          <div className={styles.modalActions}>
            <Button onClick={() => setIsLostModalOpen(false)}>取消</Button>
            <Button danger onClick={handleMarkLost}>
              确认放弃
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="添加备注"
        open={isRemarkModalOpen}
        onCancel={() => {
          setIsRemarkModalOpen(false);
          setRemarkInput("");
        }}
        footer={null}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          <Input.TextArea
            rows={4}
            placeholder="填写备注内容..."
            value={remarkInput}
            onChange={e => setRemarkInput(e.target.value)}
          />
          <div className={styles.modalActions}>
            <Button onClick={() => setIsRemarkModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleAddRemark}>
              提交备注
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="转为配置交付订单"
        open={isDeliveryModalOpen}
        onCancel={() => {
          setIsDeliveryModalOpen(false);
          setDeliveryNote("");
        }}
        footer={null}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          <Input.TextArea
            rows={6}
            placeholder="请填写配置交付说明，如：设备配置要求、交付时间节点、特殊需求等"
            value={deliveryNote}
            onChange={e => setDeliveryNote(e.target.value)}
          />
          <div className={styles.modalActions}>
            <Button onClick={() => setIsDeliveryModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleCreateDelivery}>
              确认转为配置交付
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
