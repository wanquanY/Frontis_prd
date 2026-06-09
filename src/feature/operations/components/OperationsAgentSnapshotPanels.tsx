import { Tabs } from "antd";

import type {
  OperationsAgentSnapshotCoreFile,
  OperationsAgentSnapshotSkill,
  OperationsAgentSubmission,
  OperationsProduct,
} from "@/feature/operations/types";
import { resolveAiAgentSceneTags } from "@/feature/operations/agentSceneTags";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

export interface OperationsAgentReleaseSnapshot {
  agentName: string;
  avatarUrl?: string;
  version: string;
  submitter: string;
  submittedAt: string;
  reviewedAt: string;
  lastReviewedAt?: string;
  statusLabel: string;
  description: string;
  usageGuide: string;
  sceneTags: string[];
  submitReason?: string;
  currentScopeLabel?: string;
  rejectReason?: string;
  skills: OperationsAgentSnapshotSkill[];
  coreFiles: OperationsAgentSnapshotCoreFile[];
}

export const AGENT_APPROVAL_STATUS_LABELS: Record<
  OperationsAgentSubmission["status"],
  string
> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

const createFallbackSnapshotSkills = (
  baseId: string,
  agentName: string,
): OperationsAgentSnapshotSkill[] => [
  {
    id: `${baseId}-default-analysis`,
    name: "业务理解",
    typeLabel: "基础技能",
    description: `围绕「${agentName}」的业务场景理解用户目标、输入材料和约束条件。`,
  },
  {
    id: `${baseId}-default-delivery`,
    name: "结果交付",
    typeLabel: "交付技能",
    description: "按任务要求输出可复核的分析结论、处理建议和后续动作。",
  },
];

const createFallbackSnapshotCoreFiles = (
  baseId: string,
  snapshot: Pick<
    OperationsAgentReleaseSnapshot,
    "agentName" | "description" | "reviewedAt" | "skills"
  >,
): OperationsAgentSnapshotCoreFile[] => [
  {
    id: `${baseId}-soul`,
    name: "SOUL.md",
    fileType: "身份与边界",
    updatedAt: snapshot.reviewedAt,
    description: "定义已审核上架版本的身份、能力边界和工作原则。",
    content: [
      `# ${snapshot.agentName}`,
      "",
      "## 身份定位",
      snapshot.description,
      "",
      "## 工作边界",
      "- 仅处理已授权业务数据和用户显式输入。",
      "- 输出前说明判断依据、缺失信息和需要人工确认的风险点。",
    ].join("\n"),
  },
  {
    id: `${baseId}-memory`,
    name: "MEMORY.md",
    fileType: "长期上下文",
    updatedAt: snapshot.reviewedAt,
    description: "沉淀该上架版本可公开复用的业务上下文。",
    content: [
      `# ${snapshot.agentName} Memory`,
      "",
      "## 可复用上下文",
      ...snapshot.skills.map(skill => `- ${skill.name}：${skill.description}`),
    ].join("\n"),
  },
  {
    id: `${baseId}-user`,
    name: "USER.md",
    fileType: "交互约束",
    updatedAt: snapshot.reviewedAt,
    description: "描述用户输入要求、默认响应格式和人工确认边界。",
    content: [
      `# ${snapshot.agentName} User Rules`,
      "",
      "## 默认交互",
      "- 先识别任务目标、数据范围和输出格式。",
      "- 缺少字段或权限时，不直接推断为事实。",
    ].join("\n"),
  },
];

const normalizeSnapshotSceneTags = (
  sceneTags?: string[],
  fallbackTags?: string[],
): string[] => resolveAiAgentSceneTags(sceneTags, fallbackTags);

export const resolveAgentSubmissionSnapshot = (
  submission: OperationsAgentSubmission,
): OperationsAgentReleaseSnapshot => {
  const reviewedAt =
    submission.lastReviewedAt ?? submission.plazaUpdatedAt ?? submission.submittedAt;
  const skills = submission.skills?.length
    ? submission.skills
    : createFallbackSnapshotSkills(submission.id, submission.name);

  return {
    agentName: submission.name,
    avatarUrl: submission.avatarUrl,
    version: submission.version,
    submitter: submission.submitter,
    submittedAt: submission.submittedAt,
    reviewedAt,
    lastReviewedAt: submission.lastReviewedAt,
    statusLabel: AGENT_APPROVAL_STATUS_LABELS[submission.status],
    description: submission.description,
    usageGuide: submission.usageGuide?.trim() || "暂未填写使用指南。",
    sceneTags: normalizeSnapshotSceneTags(
      submission.sceneTags,
      submission.plazaCategory ? [submission.plazaCategory] : undefined,
    ),
    submitReason: submission.submitReason,
    currentScopeLabel: submission.currentScopeLabel,
    rejectReason: submission.rejectReason,
    skills,
    coreFiles: submission.coreFiles?.length
      ? submission.coreFiles
      : createFallbackSnapshotCoreFiles(submission.id, {
          agentName: submission.name,
          description: submission.description,
          reviewedAt,
          skills,
        }),
  };
};

export const resolveProductReleaseSnapshot = (
  product: OperationsProduct,
  approvedAgents: OperationsAgentSubmission[],
): OperationsAgentReleaseSnapshot => {
  const linkedAgent = product.linkedAgentId
    ? approvedAgents.find(agent => agent.id === product.linkedAgentId)
    : undefined;

  if (linkedAgent) {
    return resolveAgentSubmissionSnapshot(linkedAgent);
  }

  const agentName = product.identityName?.trim() || product.linkedAgentName || product.name;
  const description = product.identityDescription?.trim() || product.description;
  const reviewedAt = product.updatedAt;
  const skills = createFallbackSnapshotSkills(product.id, agentName);

  return {
    agentName,
    avatarUrl: product.identityAvatarUrl,
    version: "未记录",
    submitter: "未记录",
    submittedAt: "未记录",
    reviewedAt,
    statusLabel: "未找到上架申请",
    description,
    usageGuide: product.usageGuide?.trim() || "暂未配置使用指南。",
    sceneTags: normalizeSnapshotSceneTags(
      product.tags,
      product.plazaCategory ? [product.plazaCategory] : undefined,
    ),
    skills,
    coreFiles: createFallbackSnapshotCoreFiles(product.id, {
      agentName,
      description,
      reviewedAt,
      skills,
    }),
  };
};

const getSnapshotInitial = (name: string): string => name.trim().slice(0, 1) || "专";

const AgentSnapshotIdentity = ({
  snapshot,
}: {
  snapshot: OperationsAgentReleaseSnapshot;
}): JSX.Element => (
  <div className={styles.agentSnapshotHero}>
    <div className={styles.agentSnapshotAvatar}>
      {snapshot.avatarUrl ? (
        <img src={snapshot.avatarUrl} alt={snapshot.agentName} />
      ) : (
        <span>{getSnapshotInitial(snapshot.agentName)}</span>
      )}
    </div>
    <div className={styles.agentSnapshotIdentity}>
      <strong>{snapshot.agentName}</strong>
    </div>
  </div>
);

const AgentSnapshotBaseInfo = ({
  snapshot,
}: {
  snapshot: OperationsAgentReleaseSnapshot;
}): JSX.Element => (
  <div className={styles.snapshotBaseInfo}>
    <div className={styles.snapshotInfoGrid}>
      <div className={styles.snapshotInfoBlock}>
        <span>名称</span>
        <strong>{snapshot.agentName}</strong>
      </div>
      <div className={styles.snapshotInfoBlock}>
        <span>版本号</span>
        <strong>{snapshot.version}</strong>
      </div>
    </div>
    <div className={styles.snapshotInfoBlock}>
      <span>描述</span>
      <p>{snapshot.description}</p>
    </div>
    <div className={styles.snapshotInfoBlock}>
      <span>使用指南</span>
      <p>{snapshot.usageGuide}</p>
    </div>
    <div className={styles.snapshotInfoBlock}>
      <span>场景标签（1-5个）</span>
      {snapshot.sceneTags.length ? (
        <div className={styles.snapshotTagRow}>
          {snapshot.sceneTags.map(tag => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : (
        <p>暂未填写场景标签，需先补齐后再申请上架。</p>
      )}
    </div>
  </div>
);

export const AgentSnapshotDetailPanel = ({
  snapshot,
  title = "AI 专家详情",
  note,
}: {
  snapshot: OperationsAgentReleaseSnapshot;
  title?: string;
  note?: string;
}): JSX.Element => (
  <section className={adminStyles.detailBlock}>
    <div className={styles.readonlyBlockHeader}>
      <h3 className={adminStyles.detailBlockTitle}>{title}</h3>
      <span>只读</span>
    </div>
    <AgentSnapshotIdentity snapshot={snapshot} />
    <AgentSnapshotBaseInfo snapshot={snapshot} />
    {note ? <p className={styles.readonlyHint}>{note}</p> : null}
  </section>
);

export const AgentSnapshotSkillsPanel = ({
  skills,
}: {
  skills: OperationsAgentSnapshotSkill[];
}): JSX.Element => (
  <section className={adminStyles.detailBlock}>
    <div className={styles.readonlyBlockHeader}>
      <h3 className={adminStyles.detailBlockTitle}>技能列表</h3>
      <span>版本快照</span>
    </div>
    <div className={styles.snapshotList}>
      {skills.map(skill => (
        <article key={skill.id} className={styles.snapshotCard}>
          <div className={styles.snapshotCardHead}>
            <strong>{skill.name}</strong>
            <span>{skill.typeLabel}</span>
          </div>
          <p>{skill.description}</p>
        </article>
      ))}
    </div>
  </section>
);

export const AgentSnapshotCoreFilesPanel = ({
  coreFiles,
}: {
  coreFiles: OperationsAgentSnapshotCoreFile[];
}): JSX.Element => (
  <section className={adminStyles.detailBlock}>
    <div className={styles.readonlyBlockHeader}>
      <h3 className={adminStyles.detailBlockTitle}>核心文件</h3>
      <span>版本快照</span>
    </div>
    <div className={styles.coreFileGrid}>
      {coreFiles.map(file => (
        <article key={file.id} className={styles.coreFileCard}>
          <header>
            <div>
              <strong>{file.name}</strong>
              <span>
                {file.fileType} · {file.updatedAt}
              </span>
            </div>
          </header>
          <p>{file.description}</p>
          <pre>{file.content}</pre>
        </article>
      ))}
    </div>
  </section>
);

const AgentSubmissionReviewInfoPanel = ({
  snapshot,
}: {
  snapshot: OperationsAgentReleaseSnapshot;
}): JSX.Element => (
  <div className={styles.modalDetailStack}>
    <section className={adminStyles.detailBlock}>
      <h3 className={adminStyles.detailBlockTitle}>基础信息</h3>
      <AgentSnapshotIdentity snapshot={snapshot} />
      <AgentSnapshotBaseInfo snapshot={snapshot} />
    </section>

    <section className={adminStyles.detailBlock}>
      <h3 className={adminStyles.detailBlockTitle}>上架理由</h3>
      <p className={styles.detailParagraph}>{snapshot.submitReason || "未填写上架理由。"}</p>
      {snapshot.rejectReason ? (
        <div className={styles.alertBlock}>驳回原因：{snapshot.rejectReason}</div>
      ) : null}
    </section>
  </div>
);

export const AgentSubmissionReviewTabs = ({
  submission,
}: {
  submission: OperationsAgentSubmission;
}): JSX.Element => {
  const snapshot = resolveAgentSubmissionSnapshot(submission);

  return (
    <Tabs
      className={styles.productDetailTabs}
      items={[
        {
          key: "review",
          label: "审核信息",
          children: <AgentSubmissionReviewInfoPanel snapshot={snapshot} />,
        },
        {
          key: "agent",
          label: "AI 专家详情",
          children: <AgentSnapshotDetailPanel snapshot={snapshot} />,
        },
        {
          key: "skills",
          label: "技能列表",
          children: <AgentSnapshotSkillsPanel skills={snapshot.skills} />,
        },
        {
          key: "files",
          label: "核心文件",
          children: <AgentSnapshotCoreFilesPanel coreFiles={snapshot.coreFiles} />,
        },
      ]}
    />
  );
};
