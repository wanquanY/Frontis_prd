import { useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";
import classNames from "classnames";
import { Button, Input, InputNumber, Modal, Progress, Select, Tabs, message } from "antd";

import type {
  FdeAddOpportunityCommentPayload,
  FdeOpportunityCommentItem,
  FdeOpportunityItem,
  FdeOpportunityStatus,
  FdeTeamMemberItem,
  FdeCreateOpportunityPayload,
} from "@/feature/fde/types";
import { formatWanAmount, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeOpportunityWorkbench.module.less";

interface FdeOpportunityWorkbenchProps {
  activeRole: FdeTeamMemberItem["role"];
  items: FdeOpportunityItem[];
  members: FdeTeamMemberItem[];
  selectedOpportunityId: string;
  setSelectedOpportunityId: (opportunityId: string) => void;
  assignOpportunity: (opportunityId: string, memberId: string | null) => void;
  createOpportunity: (payload: FdeCreateOpportunityPayload) => void;
  updateOpportunityStatus: (opportunityId: string, status: FdeOpportunityStatus) => void;
  addOpportunityComment: (payload: FdeAddOpportunityCommentPayload) => void;
}

type OpportunityViewKey = "list" | "board";

interface CreateOpportunityFormState {
  companyName: string;
  scenarioName: string;
  industry: string;
  amountWan: number | null;
  submitterName: string;
  submitterPhone: string;
  sourceEntryLabel: string;
  interestedAgents: string[];
  requirementSummary: string;
  requirementDetail: string;
  ownerId?: string;
}

const OPPORTUNITY_STATUS_OPTIONS: Array<{ label: string; value: FdeOpportunityStatus }> = [
  { label: "未开始", value: "未开始" },
  { label: "对接中", value: "对接中" },
  { label: "已成单", value: "已成单" },
  { label: "异常终止", value: "异常终止" },
];

const getStatusClassName = (status: FdeOpportunityStatus): string => {
  if (status === "已成单") {
    return styles.statusDone;
  }

  if (status === "异常终止") {
    return styles.statusStopped;
  }

  if (status === "对接中") {
    return styles.statusActive;
  }

  return styles.statusPending;
};

const formatDateTime = (value: string): string => dayjs(value).format("YYYY-MM-DD HH:mm");

const createInitialOpportunityForm = (): CreateOpportunityFormState => ({
  companyName: "",
  scenarioName: "",
  industry: "",
  amountWan: null,
  submitterName: "",
  submitterPhone: "",
  sourceEntryLabel: "FDE 手动录入",
  interestedAgents: [],
  requirementSummary: "",
  requirementDetail: "",
  ownerId: undefined,
});

/**
 * FDE 商机管理视图。
 */
export const FdeOpportunityWorkbench = ({
  activeRole,
  items,
  members,
  selectedOpportunityId,
  setSelectedOpportunityId,
  assignOpportunity,
  createOpportunity,
  updateOpportunityStatus,
  addOpportunityComment,
}: FdeOpportunityWorkbenchProps): JSX.Element => {
  const [activeView, setActiveView] = useState<OpportunityViewKey>("list");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [replyToCommentId, setReplyToCommentId] = useState<string>("");
  const [createForm, setCreateForm] = useState<CreateOpportunityFormState>(
    createInitialOpportunityForm(),
  );
  const selectedOpportunity = useMemo(
    () => items.find(item => item.id === selectedOpportunityId) ?? items[0] ?? null,
    [items, selectedOpportunityId],
  );
  const enabledMemberOptions = useMemo(
    () =>
      members
        .filter(item => item.role === "member" && item.accountStatus === "enabled")
        .map(item => ({
          label: `${item.name} · ${item.title}`,
          value: item.id,
        })),
    [members],
  );
  const metrics = useMemo(
    () => {
      const totalAmount = items.reduce((total, item) => total + item.amountWan, 0);
      const convertedAmount = items
        .filter(item => item.status === "已成单")
        .reduce((total, item) => total + item.amountWan, 0);

      return [
        {
          label: "商机数量",
          value: `${items.length}`,
          hint: "包含门户提交和手动录入的全部商机",
        },
        {
          label: "已分配商机",
          value: `${items.filter(item => item.ownerId).length}`,
          hint: "已明确分配给 FDE 成员跟进",
        },
        {
          label: "已成单金额",
          value: formatWanAmount(convertedAmount),
          hint: "当前状态为已成单的商机金额汇总",
        },
        {
          label: "异常终止",
          value: `${items.filter(item => item.status === "异常终止").length}`,
          hint: "已终止但仍保留评论和需求记录",
        },
      ];
    },
    [items],
  );
  const statusGroups = useMemo(
    () =>
      OPPORTUNITY_STATUS_OPTIONS.map(option => ({
        items: items.filter(item => item.status === option.value),
        label: option.label,
        status: option.value,
      })),
    [items],
  );
  const replyTarget = useMemo(
    () => selectedOpportunity?.comments.find(item => item.id === replyToCommentId) ?? null,
    [replyToCommentId, selectedOpportunity],
  );
  const canAssignOpportunity = activeRole === "leader" || activeRole === "admin";

  const handleCreateFieldChange = <TKey extends keyof CreateOpportunityFormState>(
    key: TKey,
    value: CreateOpportunityFormState[TKey],
  ): void => {
    setCreateForm(previous => ({
      ...previous,
      [key]: value,
    }));
  };

  useEffect(() => {
    setCommentDraft("");
    setReplyToCommentId("");
  }, [selectedOpportunity?.id, isDetailModalOpen]);

  const handleOpenCreateModal = (): void => {
    setCreateForm(createInitialOpportunityForm());
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = (): void => {
    setIsCreateModalOpen(false);
    setCreateForm(createInitialOpportunityForm());
  };

  const handleOpenDetail = (opportunityId: string): void => {
    setSelectedOpportunityId(opportunityId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = (): void => {
    setIsDetailModalOpen(false);
    setCommentDraft("");
    setReplyToCommentId("");
  };

  const handleSubmitComment = (): void => {
    if (!selectedOpportunity) {
      return;
    }

    if (!commentDraft.trim()) {
      message.warning("请先输入评论内容。");
      return;
    }

    addOpportunityComment({
      opportunityId: selectedOpportunity.id,
      content: commentDraft,
      replyToCommentId: replyToCommentId || undefined,
    });
    setCommentDraft("");
    setReplyToCommentId("");
    message.success("评论已提交。");
  };

  const handleCreateOpportunity = (): void => {
    if (
      !createForm.companyName.trim() ||
      !createForm.scenarioName.trim() ||
      !createForm.industry.trim() ||
      !createForm.submitterName.trim() ||
      !createForm.submitterPhone.trim() ||
      !createForm.requirementSummary.trim() ||
      !createForm.requirementDetail.trim() ||
      !createForm.amountWan ||
      createForm.amountWan <= 0
    ) {
      message.warning("请先补齐商机基础信息和需求内容。");
      return;
    }

    createOpportunity({
      companyName: createForm.companyName.trim(),
      scenarioName: createForm.scenarioName.trim(),
      industry: createForm.industry.trim(),
      amountWan: createForm.amountWan,
      submitterName: createForm.submitterName.trim(),
      submitterPhone: createForm.submitterPhone.trim(),
      sourceEntryLabel: createForm.sourceEntryLabel.trim() || "FDE 手动录入",
      interestedAgents: createForm.interestedAgents,
      requirementSummary: createForm.requirementSummary.trim(),
      requirementDetail: createForm.requirementDetail.trim(),
      ownerId: canAssignOpportunity ? createForm.ownerId ?? null : undefined,
    });
    setIsCreateModalOpen(false);
    setIsDetailModalOpen(true);
    setCreateForm(createInitialOpportunityForm());
    message.success("商机已创建。");
  };

  const renderCommentItem = (comment: FdeOpportunityCommentItem): JSX.Element => {
    const authorName = getFdeMemberName(members, comment.authorId);
    const replyAuthorName = comment.replyToAuthorId
      ? getFdeMemberName(members, comment.replyToAuthorId)
      : "";

    return (
      <div key={comment.id} className={styles.commentCard}>
        <div className={styles.commentHeader}>
          <div className={styles.commentAuthor}>{authorName}</div>
          <div className={styles.commentTime}>{formatDateTime(comment.createdAt)}</div>
        </div>
        {replyAuthorName ? (
          <div className={styles.commentReplyHint}>回复 {replyAuthorName}</div>
        ) : null}
        <div className={styles.commentContent}>{comment.content}</div>
        <div className={styles.commentActions}>
          <Button size="small" type="link" onClick={() => setReplyToCommentId(comment.id)}>
            回复
          </Button>
        </div>
      </div>
    );
  };

  const listView = (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>商机列表</div>
      </div>

      <div className={styles.tableHeader}>
        <span>企业名称</span>
        <span>提交人</span>
        <span>提交时间</span>
        <span>来源入口</span>
        <span>需求摘要</span>
        <span>状态</span>
        <span>负责人</span>
      </div>
      <div className={styles.tableBody}>
        {items.length ? (
          items.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.tableRow,
                item.id === selectedOpportunity?.id && styles.tableRowActive,
              )}
              onClick={() => handleOpenDetail(item.id)}
            >
              <span className={styles.companyCell}>{item.companyName}</span>
              <span>{item.requirementInfo.submitterName}</span>
              <span>{formatDateTime(item.requirementInfo.submittedAt)}</span>
              <span>{item.requirementInfo.sourceEntryLabel}</span>
              <span className={styles.summaryCell}>{item.requirementInfo.requirementSummary}</span>
              <span className={classNames(styles.statusTag, getStatusClassName(item.status))}>
                {item.status}
              </span>
              <span>{getFdeMemberName(members, item.ownerId ?? "")}</span>
            </button>
          ))
        ) : (
          <div className={styles.emptyHint}>当前暂无商机</div>
        )}
      </div>
    </section>
  );

  const boardView = (
    <div className={styles.boardLayout}>
      <section className={styles.metricGrid}>
        {metrics.map(item => (
          <article key={item.label} className={styles.metricCard}>
            <div className={styles.metricLabel}>{item.label}</div>
            <div className={styles.metricValue}>{item.value}</div>
            <div className={styles.metricHint}>{item.hint}</div>
          </article>
        ))}
      </section>

      <section className={styles.boardPanel}>
        {statusGroups.map(group => (
          <article key={group.status} className={styles.boardColumn}>
            <div className={styles.boardColumnHeader}>
              <span>{group.label}</span>
              <span className={classNames(styles.statusTag, getStatusClassName(group.status))}>
                {group.items.length}
              </span>
            </div>
            <div className={styles.boardColumnList}>
              {group.items.length ? (
                group.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.boardCard}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <div className={styles.boardCardTitle}>{item.companyName}</div>
                    <div className={styles.boardCardSummary}>
                      {item.requirementInfo.requirementSummary}
                    </div>
                    <div className={styles.boardCardMeta}>
                      <span>{formatWanAmount(item.amountWan)}</span>
                      <span>{getFdeMemberName(members, item.ownerId ?? "")}</span>
                    </div>
                    <Progress
                      percent={item.winRate}
                      showInfo={false}
                      strokeColor="var(--fdeAccent)"
                    />
                  </button>
                ))
              ) : (
                <div className={styles.emptyHint}>当前状态下暂无商机</div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );

  return (
    <div className={styles.layout}>
      <Tabs
        activeKey={activeView}
        className={styles.viewTabs}
        tabBarExtraContent={
          <Button type="primary" onClick={handleOpenCreateModal}>
            手动创建商机
          </Button>
        }
        onChange={key => {
          if (key === "list" || key === "board") {
            setActiveView(key);
          }
        }}
        items={[
          {
            key: "list",
            label: "商机管理",
            children: listView,
          },
          {
            key: "board",
            label: "看板视图",
            children: boardView,
          },
        ]}
      />

      <Modal
        title="手动创建商机"
        open={isCreateModalOpen}
        width={760}
        onCancel={handleCloseCreateModal}
        onOk={handleCreateOpportunity}
        okText="创建商机"
        cancelText="取消"
        destroyOnClose
      >
        <div className={styles.createForm}>
          <div className={styles.createFormGrid}>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>企业名称</div>
              <Input
                value={createForm.companyName}
                placeholder="请输入企业名称"
                onChange={event => handleCreateFieldChange("companyName", event.target.value)}
              />
            </div>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>业务场景</div>
              <Input
                value={createForm.scenarioName}
                placeholder="请输入业务场景"
                onChange={event => handleCreateFieldChange("scenarioName", event.target.value)}
              />
            </div>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>行业</div>
              <Input
                value={createForm.industry}
                placeholder="请输入行业"
                onChange={event => handleCreateFieldChange("industry", event.target.value)}
              />
            </div>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>预计金额（万）</div>
              <InputNumber
                className={styles.fullWidthControl}
                min={1}
                value={createForm.amountWan}
                placeholder="请输入预计金额"
                onChange={value => handleCreateFieldChange("amountWan", value)}
              />
            </div>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>提交人</div>
              <Input
                value={createForm.submitterName}
                placeholder="请输入提交人"
                onChange={event => handleCreateFieldChange("submitterName", event.target.value)}
              />
            </div>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>联系电话</div>
              <Input
                value={createForm.submitterPhone}
                placeholder="请输入联系电话"
                onChange={event => handleCreateFieldChange("submitterPhone", event.target.value)}
              />
            </div>
            <div className={styles.formBlock}>
              <div className={styles.controlLabel}>来源入口</div>
              <Input
                value={createForm.sourceEntryLabel}
                placeholder="请输入来源入口"
                onChange={event => handleCreateFieldChange("sourceEntryLabel", event.target.value)}
              />
            </div>
            {canAssignOpportunity ? (
              <div className={styles.formBlock}>
                <div className={styles.controlLabel}>分配成员</div>
                <Select<string>
                  allowClear
                  className={styles.fullWidthControl}
                  placeholder="可选，创建后再分配"
                  value={createForm.ownerId}
                  options={enabledMemberOptions}
                  onChange={value => handleCreateFieldChange("ownerId", value)}
                />
              </div>
            ) : null}
          </div>
          <div className={styles.formBlock}>
            <div className={styles.controlLabel}>感兴趣的 AI 专家</div>
            <Select
              mode="tags"
              className={styles.fullWidthControl}
              value={createForm.interestedAgents}
              placeholder="输入后回车，可添加多个"
              onChange={value => handleCreateFieldChange("interestedAgents", value)}
            />
          </div>
          <div className={styles.formBlock}>
            <div className={styles.controlLabel}>需求摘要</div>
            <Input.TextArea
              rows={3}
              value={createForm.requirementSummary}
              placeholder="请输入需求摘要"
              onChange={event =>
                handleCreateFieldChange("requirementSummary", event.target.value)
              }
            />
          </div>
          <div className={styles.formBlock}>
            <div className={styles.controlLabel}>详细需求介绍</div>
            <Input.TextArea
              rows={5}
              value={createForm.requirementDetail}
              placeholder="请输入详细需求介绍"
              onChange={event =>
                handleCreateFieldChange("requirementDetail", event.target.value)
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="商机详情"
        open={Boolean(selectedOpportunity) && isDetailModalOpen}
        centered
        width={920}
        className={styles.detailModal}
        wrapClassName={styles.detailModalWrap}
        onCancel={handleCloseDetail}
        footer={null}
        destroyOnClose
      >
        {selectedOpportunity ? (
          <div className={styles.detailBody}>
            <div className={styles.detailLayout}>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailEyebrow}>商机需求详情</div>
                  <h2 className={styles.detailTitle}>{selectedOpportunity.companyName}</h2>
                  <div className={styles.detailSubtitle}>
                    {selectedOpportunity.scenarioName} · {selectedOpportunity.industry}
                  </div>
                </div>
                <div className={classNames(styles.statusTag, getStatusClassName(selectedOpportunity.status))}>
                  {selectedOpportunity.status}
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.sectionTitle}>跟进配置</div>
                <div className={styles.controlGrid}>
                  <div className={styles.controlBlock}>
                    <div className={styles.controlLabel}>商机状态</div>
                    <Select<FdeOpportunityStatus>
                      className={styles.fullWidthControl}
                      value={selectedOpportunity.status}
                      options={OPPORTUNITY_STATUS_OPTIONS}
                      onChange={value => updateOpportunityStatus(selectedOpportunity.id, value)}
                    />
                  </div>
                  <div className={styles.controlBlock}>
                    <div className={styles.controlLabel}>分配成员</div>
                    <Select<string>
                      allowClear
                      disabled={!canAssignOpportunity}
                      className={styles.fullWidthControl}
                      placeholder={canAssignOpportunity ? "选择要跟进的成员" : "仅管理员可分配"}
                      value={selectedOpportunity.ownerId ?? undefined}
                      options={enabledMemberOptions}
                      onChange={value => assignOpportunity(selectedOpportunity.id, value ?? null)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.sectionTitle}>需求信息</div>
                <div className={styles.requirementGrid}>
                  <div className={styles.requirementRow}>
                    <span className={styles.requirementLabel}>提交人</span>
                    <span className={styles.requirementValue}>{selectedOpportunity.requirementInfo.submitterName}</span>
                  </div>
                  <div className={styles.requirementRow}>
                    <span className={styles.requirementLabel}>联系电话</span>
                    <span className={styles.requirementValue}>{selectedOpportunity.requirementInfo.submitterPhone}</span>
                  </div>
                  <div className={styles.requirementRow}>
                    <span className={styles.requirementLabel}>提交时间</span>
                    <span className={styles.requirementValue}>
                      {formatDateTime(selectedOpportunity.requirementInfo.submittedAt)}
                    </span>
                  </div>
                  <div className={styles.requirementRow}>
                    <span className={styles.requirementLabel}>来源入口</span>
                    <span className={styles.requirementValue}>{selectedOpportunity.requirementInfo.sourceEntryLabel}</span>
                  </div>
                  <div className={styles.requirementRow}>
                    <span className={styles.requirementLabel}>预计金额</span>
                    <span className={styles.requirementValue}>{formatWanAmount(selectedOpportunity.amountWan)}</span>
                  </div>
                  <div className={styles.requirementRow}>
                    <span className={styles.requirementLabel}>当前负责人</span>
                    <span className={styles.requirementValue}>
                      {getFdeMemberName(members, selectedOpportunity.ownerId ?? "")}
                    </span>
                  </div>
                  <div className={styles.requirementRowFull}>
                    <span className={styles.requirementLabel}>感兴趣的 AI 专家</span>
                    <div className={styles.tagList}>
                      {selectedOpportunity.requirementInfo.interestedAgents.map(item => (
                        <span key={item} className={styles.agentTag}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.requirementRowFull}>
                    <span className={styles.requirementLabel}>需求摘要</span>
                    <span className={styles.requirementValue}>
                      {selectedOpportunity.requirementInfo.requirementSummary}
                    </span>
                  </div>
                  <div className={styles.requirementRowFull}>
                    <span className={styles.requirementLabel}>详细需求介绍</span>
                    <div className={styles.requirementDetail}>
                      {selectedOpportunity.requirementInfo.requirementDetail}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.sectionTitle}>评论动态</div>
                <div className={styles.commentComposer}>
                  {replyTarget ? (
                    <div className={styles.replyBar}>
                      <span>正在回复 {getFdeMemberName(members, replyTarget.authorId)}</span>
                      <Button type="link" size="small" onClick={() => setReplyToCommentId("")}>
                        取消回复
                      </Button>
                    </div>
                  ) : null}
                  <Input.TextArea
                    rows={4}
                    value={commentDraft}
                    placeholder="输入当前跟进情况、结论或阻塞信息"
                    onChange={event => setCommentDraft(event.target.value)}
                  />
                  <div className={styles.commentSubmitRow}>
                    <div className={styles.commentHint}>成员和负责人都可以连续多次评论或回复。</div>
                    <Button type="primary" onClick={handleSubmitComment}>
                      提交评论
                    </Button>
                  </div>
                </div>

                <div className={styles.commentList}>
                  {selectedOpportunity.comments.length ? (
                    selectedOpportunity.comments.map(renderCommentItem)
                  ) : (
                    <div className={styles.emptyHint}>当前还没有跟进评论</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
