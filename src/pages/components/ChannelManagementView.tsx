import { useCallback, useMemo, useState } from "react";

import {
  ArrowLeftOutlined,
  DeleteOutlined,
  LinkOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { Button, Input, Modal, Switch, Tag, Upload, message } from "antd";
import classNames from "classnames";

import {
  DEFAULT_FEISHU_QR_CODE,
  FEISHU_QR_CODE_STORAGE_KEY,
  FEISHU_QR_CONFIGURED_STORAGE_KEY,
  FEISHU_QR_UPDATED_EVENT,
} from "@/constants/feishuChannel";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";

import agentStoreStyles from "./agentStore/AgentStoreView.module.less";
import adminStyles from "./FrontisAdminViews.module.less";

type MetaAgentManagementTabKey = "sessions" | "channels";
type SessionCategoryKey = "all" | "member" | "group" | "external";
type SessionDetailTabKey = "persona" | "agents";
type FeishuSessionStatus = "active" | "disabled";

interface ChannelManagementViewProps {
  tenantSnapshot: MockTenantManagementSnapshot;
}

interface AgentOption {
  id: string;
  name: string;
  description: string;
}

interface FeishuSessionItem {
  id: string;
  name: string;
  category: Exclude<SessionCategoryKey, "all">;
  ownerName: string;
  phone: string;
  status: FeishuSessionStatus;
  lastActive: string;
  soulMd: string;
  userMd: string;
  enabledAgentIds: string[];
}

interface FeishuChannelState {
  appId: string;
  appSecret: string;
  connected: boolean;
  qrCode: string;
}

const MANAGEMENT_TABS: Array<{ key: MetaAgentManagementTabKey; label: string }> = [
  { key: "sessions", label: "会话管理" },
  { key: "channels", label: "渠道管理" },
];

const SESSION_CATEGORY_TABS: Array<{ key: SessionCategoryKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "member", label: "已绑定成员" },
  { key: "group", label: "群聊" },
  { key: "external", label: "外部会话" },
];

const SESSION_DETAIL_TABS: Array<{ key: SessionDetailTabKey; label: string }> = [
  { key: "persona", label: "配置文件" },
  { key: "agents", label: "可调度 Agent" },
];

const SESSION_CATEGORY_LABEL: Record<Exclude<SessionCategoryKey, "all">, string> = {
  member: "已绑定成员",
  group: "群聊",
  external: "外部会话",
};

const AGENT_OPTIONS: AgentOption[] = [
  {
    id: "agent-competitor",
    name: "竞品分析专家",
    description: "竞品收集、卖点对比和机会识别。",
  },
  {
    id: "agent-selection",
    name: "选品推荐专家",
    description: "基于类目、价格带和供给情况生成选品建议。",
  },
  {
    id: "agent-script",
    name: "销售话术助手",
    description: "生成客户沟通、跟进提醒和转化话术。",
  },
  {
    id: "agent-doc",
    name: "文档处理专家",
    description: "解析 PDF、表格和合同并抽取结构化信息。",
  },
];

const INITIAL_FEISHU_SESSIONS: FeishuSessionItem[] = [
  {
    id: "session-member-li",
    name: "小李 · 个人单聊",
    category: "member",
    ownerName: "小李",
    phone: "138****0921",
    status: "active",
    lastActive: "刚刚",
    soulMd:
      "你是小李的跨境电商增长助理，优先把零散需求拆成可执行任务，并在需要时调度合适的 AI 专家完成。",
    userMd:
      "小李主要负责 Amazon 选品和新品冷启动。回答要直接、可落地，涉及表格或清单时优先结构化输出。",
    enabledAgentIds: AGENT_OPTIONS.map(agent => agent.id),
  },
  {
    id: "session-group-selection",
    name: "跨境电商选品交流群",
    category: "group",
    ownerName: "群聊",
    phone: "-",
    status: "active",
    lastActive: "12 分钟前",
    soulMd:
      "你是群聊里的选品协作助手，需要识别群成员提出的商品、市场和竞品问题，并整理为可复用结论。",
    userMd: "群成员来自不同公司，回答时避免泄露个人配置和私有数据，只输出公开可分享的分析结果。",
    enabledAgentIds: ["agent-competitor", "agent-selection"],
  },
  {
    id: "session-group-sales",
    name: "销售跟进战情群",
    category: "group",
    ownerName: "群聊",
    phone: "-",
    status: "active",
    lastActive: "今天 10:42",
    soulMd: "你是销售团队的跟进助手，重点识别客户异议、跟进节奏和下一步动作。",
    userMd: "输出要短，适合群聊阅读；重要跟进事项用列表表达。",
    enabledAgentIds: ["agent-script"],
  },
  {
    id: "session-external-wang",
    name: "王敏 · 外部单聊",
    category: "external",
    ownerName: "王敏",
    phone: "139****8820",
    status: "disabled",
    lastActive: "昨天",
    soulMd: "你是财务材料检查助手，帮助用户检查材料完整性和潜在风险。",
    userMd: "涉及财务判断时先列检查点，再说明缺失信息，不直接替用户做最终审批结论。",
    enabledAgentIds: ["agent-doc"],
  },
];

const getInitialQrCode = (): string =>
  localStorage.getItem(FEISHU_QR_CODE_STORAGE_KEY) ??
  (localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true" ? DEFAULT_FEISHU_QR_CODE : "");

/**
 * ME 管理原型，承载会话管理和飞书渠道连接配置。
 */
export const ChannelManagementView = ({
  tenantSnapshot,
}: ChannelManagementViewProps): JSX.Element => {
  const [activeTabKey, setActiveTabKey] = useState<MetaAgentManagementTabKey>("sessions");
  const [activeCategoryKey, setActiveCategoryKey] = useState<SessionCategoryKey>("all");
  const [activeDetailTabKey, setActiveDetailTabKey] = useState<SessionDetailTabKey>("persona");
  const [sessions, setSessions] = useState<FeishuSessionItem[]>(INITIAL_FEISHU_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [agentPickerSessionId, setAgentPickerSessionId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [feishuChannel, setFeishuChannel] = useState<FeishuChannelState>({
    appId: "cli_a97b15d512391cbd",
    appSecret: "frontis-feishu-demo-secret",
    connected: Boolean(getInitialQrCode()),
    qrCode: getInitialQrCode(),
  });

  const selectedSession = useMemo(
    () => sessions.find(session => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );
  const visibleSessions = useMemo(
    () =>
      activeCategoryKey === "all"
        ? sessions
        : sessions.filter(session => session.category === activeCategoryKey),
    [activeCategoryKey, sessions],
  );

  const handleUpdateSession = useCallback(
    (sessionId: string, updates: Partial<FeishuSessionItem>): void => {
      setSessions(currentSessions =>
        currentSessions.map(session =>
          session.id === sessionId
            ? {
                ...session,
                ...updates,
              }
            : session,
        ),
      );
    },
    [],
  );

  const handleToggleAgent = useCallback(
    (session: FeishuSessionItem, agentId: string, shouldAdd: boolean): void => {
      if (session.category === "member") {
        return;
      }

      const enabledAgentIds = shouldAdd
        ? Array.from(new Set([...session.enabledAgentIds, agentId]))
        : session.enabledAgentIds.filter(currentAgentId => currentAgentId !== agentId);

      handleUpdateSession(session.id, { enabledAgentIds });
    },
    [handleUpdateSession],
  );

  const handleToggleSessionStatus = useCallback(
    (session: FeishuSessionItem): void => {
      handleUpdateSession(session.id, {
        status: session.status === "active" ? "disabled" : "active",
      });
    },
    [handleUpdateSession],
  );

  const handleConnectFeishu = useCallback((): void => {
    if (!feishuChannel.appId.trim() || !feishuChannel.appSecret.trim()) {
      message.warning("请填写 App ID 和 App Secret。");
      return;
    }

    const hasQrCode = Boolean(feishuChannel.qrCode.trim());
    localStorage.setItem(FEISHU_QR_CONFIGURED_STORAGE_KEY, hasQrCode ? "true" : "false");
    if (hasQrCode) {
      localStorage.setItem(FEISHU_QR_CODE_STORAGE_KEY, feishuChannel.qrCode.trim());
    } else {
      localStorage.removeItem(FEISHU_QR_CODE_STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(FEISHU_QR_UPDATED_EVENT, {
        detail: {
          configured: hasQrCode,
          qrCode: hasQrCode ? feishuChannel.qrCode.trim() : "",
        },
      }),
    );
    setFeishuChannel(currentChannel => ({
      ...currentChannel,
      connected: true,
    }));
    setIsConnectModalOpen(false);
    message.success("飞书配置已保存。");
  }, [feishuChannel.appId, feishuChannel.appSecret, feishuChannel.qrCode]);

  const handleVerifyFeishuConfig = useCallback((): void => {
    if (!feishuChannel.appId.trim() || !feishuChannel.appSecret.trim()) {
      message.warning("请填写 App ID 和 App Secret。");
      return;
    }

    message.success("配置验证通过。");
  }, [feishuChannel.appId, feishuChannel.appSecret]);

  const handleBeforeUploadQrCode: NonNullable<UploadProps["beforeUpload"]> = useCallback(file => {
    setFeishuChannel(currentChannel => ({
      ...currentChannel,
      qrCode: `已上传：${file.name}`,
    }));
    return false;
  }, []);

  const renderManagementTabs = (): JSX.Element => (
    <div className={adminStyles.consoleTabs}>
      {MANAGEMENT_TABS.map(tab => (
        <button
          key={tab.key}
          type="button"
          className={classNames(adminStyles.consoleTabButton, {
            [adminStyles.consoleTabButtonActive]: activeTabKey === tab.key,
          })}
          onClick={() => {
            setActiveTabKey(tab.key);
            setSelectedSessionId(null);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderConnectModal = (): JSX.Element => (
    <Modal
      className={adminStyles.channelConnectModal}
      width={720}
      centered
      title="连接飞书"
      open={isConnectModalOpen}
      onCancel={() => setIsConnectModalOpen(false)}
      footer={
        <div className={adminStyles.channelModalFooter}>
          <Button onClick={handleVerifyFeishuConfig}>验证配置</Button>
          <Button type="primary" onClick={handleConnectFeishu}>
            保存并连接
          </Button>
        </div>
      }
    >
      <div className={adminStyles.channelModalBody}>
        <label className={adminStyles.channelModalField}>
          <span>App ID</span>
          <Input
            size="large"
            value={feishuChannel.appId}
            onChange={event =>
              setFeishuChannel(currentChannel => ({
                ...currentChannel,
                appId: event.target.value,
              }))
            }
          />
        </label>
        <label className={adminStyles.channelModalField}>
          <span>App Secret</span>
          <Input.Password
            size="large"
            value={feishuChannel.appSecret}
            onChange={event =>
              setFeishuChannel(currentChannel => ({
                ...currentChannel,
                appSecret: event.target.value,
              }))
            }
          />
        </label>
        <label className={adminStyles.channelModalField}>
          <span>飞书应用二维码</span>
          <div className={adminStyles.channelQrUploadRow}>
            <Input
              size="large"
              value={feishuChannel.qrCode}
              placeholder="输入二维码链接，或上传二维码图片"
              onChange={event =>
                setFeishuChannel(currentChannel => ({
                  ...currentChannel,
                  qrCode: event.target.value,
                }))
              }
            />
            <Upload
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              beforeUpload={handleBeforeUploadQrCode}
            >
              <Button size="large" icon={<UploadOutlined />}>
                上传图片
              </Button>
            </Upload>
          </div>
        </label>
      </div>
    </Modal>
  );

  const renderAgentPickerModal = (): JSX.Element => {
    const targetSession =
      sessions.find(
        session => session.id === agentPickerSessionId && session.category !== "member",
      ) ?? null;
    const availableAgents = targetSession
      ? AGENT_OPTIONS.filter(agent => !targetSession.enabledAgentIds.includes(agent.id))
      : [];

    return (
      <Modal
        className={adminStyles.channelConnectModal}
        width={760}
        centered
        title="从 AI 专家广场添加"
        open={Boolean(targetSession)}
        onCancel={() => setAgentPickerSessionId(null)}
        footer={null}
      >
        <div className={agentStoreStyles.assetCardGrid}>
          {availableAgents.length > 0 ? (
            availableAgents.map(agent => (
              <article key={agent.id} className={agentStoreStyles.assetCard}>
                <button
                  type="button"
                  className={agentStoreStyles.assetPreviewButton}
                  onClick={() => {
                    if (!targetSession) {
                      return;
                    }

                    handleToggleAgent(targetSession, agent.id, true);
                    message.success("已添加。");
                  }}
                >
                  <div
                    className={classNames(
                      agentStoreStyles.assetVisualPanel,
                      agentStoreStyles.assetVisualPanelDeveloped,
                    )}
                  >
                    <span className={agentStoreStyles.assetVisibilityBadge}>可添加</span>
                    <div className={agentStoreStyles.assetVisualGlow} />
                    <div className={adminStyles.channelAgentCardIcon}>{agent.name.slice(0, 1)}</div>
                  </div>

                  <div className={agentStoreStyles.assetBody}>
                    <div className={agentStoreStyles.assetTitleRow}>
                      <h3 className={agentStoreStyles.assetTitle}>{agent.name}</h3>
                      <div className={agentStoreStyles.assetVersionMeta}>
                        <span className={agentStoreStyles.assetPublishBadge}>已发布</span>
                        <span className={agentStoreStyles.assetVersionText}>v1.0</span>
                      </div>
                    </div>
                    <div className={agentStoreStyles.assetBadgeRow}>
                      <span className={agentStoreStyles.assetOwnerBadge}>AI专家广场</span>
                      <span className={agentStoreStyles.assetRangeBadge}>可调度</span>
                    </div>
                    <p className={agentStoreStyles.assetDescription}>{agent.description}</p>
                    <div className={adminStyles.channelAgentCardAction}>
                      <PlusOutlined />
                      <span>添加</span>
                    </div>
                  </div>
                </button>
              </article>
            ))
          ) : (
            <div className={adminStyles.channelAgentEmpty}>暂无可添加的 AI 专家</div>
          )}
        </div>
      </Modal>
    );
  };

  if (selectedSession) {
    const isBoundMemberSession = selectedSession.category === "member";
    const selectedAgentOptions = AGENT_OPTIONS.filter(agent =>
      selectedSession.enabledAgentIds.includes(agent.id),
    );

    return (
      <div className={adminStyles.consolePage}>
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <button
              type="button"
              className={adminStyles.channelBackButton}
              onClick={() => setSelectedSessionId(null)}
            >
              <ArrowLeftOutlined />
              返回会话列表
            </button>
            <h1 className={adminStyles.consoleTitle}>{selectedSession.name}</h1>
          </div>
          <Switch
            checked={selectedSession.status === "active"}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={() => handleToggleSessionStatus(selectedSession)}
          />
        </header>

        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSummaryStrip}>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>会话类型</span>
              <span className={adminStyles.consoleSummaryValue}>
                {SESSION_CATEGORY_LABEL[selectedSession.category]}
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>绑定对象</span>
              <span className={adminStyles.consoleSummaryValue}>{selectedSession.ownerName}</span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>手机号</span>
              <span className={adminStyles.consoleSummaryValue}>{selectedSession.phone}</span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>最近活跃</span>
              <span className={adminStyles.consoleSummaryValue}>{selectedSession.lastActive}</span>
            </div>
          </div>

          <div className={adminStyles.consoleTabs}>
            {SESSION_DETAIL_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={classNames(adminStyles.consoleTabButton, {
                  [adminStyles.consoleTabButtonActive]: activeDetailTabKey === tab.key,
                })}
                onClick={() => setActiveDetailTabKey(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDetailTabKey === "persona" ? (
            <div className={adminStyles.channelPromptGrid}>
              <label className={adminStyles.channelPromptField}>
                <span>user.md</span>
                <Input.TextArea
                  value={selectedSession.userMd}
                  autoSize={{ minRows: 8, maxRows: 12 }}
                  onChange={event =>
                    handleUpdateSession(selectedSession.id, {
                      userMd: event.target.value,
                    })
                  }
                />
              </label>
              <label className={adminStyles.channelPromptField}>
                <span>soul.md</span>
                <Input.TextArea
                  value={selectedSession.soulMd}
                  autoSize={{ minRows: 8, maxRows: 12 }}
                  onChange={event =>
                    handleUpdateSession(selectedSession.id, {
                      soulMd: event.target.value,
                    })
                  }
                />
              </label>
              <div className={adminStyles.channelEditorActions}>
                <Button type="primary" onClick={() => message.success("会话配置已保存。")}>
                  保存配置
                </Button>
              </div>
            </div>
          ) : null}

          {activeDetailTabKey === "agents" ? (
            <>
              <div className={adminStyles.channelAgentSectionHeader}>
                <span>
                  {isBoundMemberSession ? "用户权限范围内的 AI 专家" : "当前会话可调度的 AI 专家"}
                </span>
                {!isBoundMemberSession ? (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAgentPickerSessionId(selectedSession.id)}
                  >
                    从 AI 专家广场添加
                  </Button>
                ) : null}
              </div>
              <div className={adminStyles.channelAgentGrid}>
                {selectedAgentOptions.map(agent => (
                  <div
                    key={agent.id}
                    className={classNames(
                      adminStyles.channelAgentCard,
                      adminStyles.channelAgentCardActive,
                      {
                        [adminStyles.channelAgentCardReadonly]: isBoundMemberSession,
                      },
                    )}
                  >
                    <span className={adminStyles.channelAgentBody}>
                      <span className={adminStyles.channelAgentName}>{agent.name}</span>
                      <span className={adminStyles.channelAgentDescription}>
                        {agent.description}
                      </span>
                    </span>
                    {!isBoundMemberSession ? (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          handleToggleAgent(selectedSession, agent.id, false);
                          message.success("已移除。");
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              {selectedAgentOptions.length === 0 ? (
                <div className={adminStyles.channelAgentEmpty}>暂无可调度 AI 专家</div>
              ) : null}
              {renderAgentPickerModal()}
            </>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>ME 管理</h1>
        </div>
      </header>

      {renderManagementTabs()}

      {activeTabKey === "sessions" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleTabs}>
            {SESSION_CATEGORY_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={classNames(adminStyles.consoleTabButton, {
                  [adminStyles.consoleTabButtonActive]: activeCategoryKey === tab.key,
                })}
                onClick={() => setActiveCategoryKey(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={adminStyles.channelSessionTable}>
            {visibleSessions.map(session => (
              <div key={session.id} className={adminStyles.channelSessionRow}>
                <span>
                  <strong>{session.name}</strong>
                  <small>{SESSION_CATEGORY_LABEL[session.category]}</small>
                </span>
                <span>{session.ownerName}</span>
                <span>{session.lastActive}</span>
                <span className={adminStyles.channelSessionStatusCell}>
                  <Switch
                    checked={session.status === "active"}
                    checkedChildren="启用"
                    unCheckedChildren="停用"
                    onChange={() => handleToggleSessionStatus(session)}
                  />
                  <Button onClick={() => setSelectedSessionId(session.id)}>进入配置</Button>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTabKey === "channels" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.channelGrid}>
            <button
              type="button"
              className={adminStyles.channelCard}
              onClick={() => setIsConnectModalOpen(true)}
            >
              <span className={classNames(adminStyles.channelIcon, adminStyles.channelIconFeishu)}>
                <LinkOutlined />
              </span>
              <span className={adminStyles.channelCardBody}>
                <span className={adminStyles.channelCardHeader}>
                  <span className={adminStyles.channelCardTitle}>飞书 / Lark</span>
                  <Tag color={feishuChannel.connected ? "success" : "default"}>
                    {feishuChannel.connected ? "已连接" : "未连接"}
                  </Tag>
                </span>
                <span className={adminStyles.channelCardMeta}>
                  <span>{sessions.length} 个会话</span>
                  <span>{feishuChannel.qrCode.trim() ? "已配置二维码" : "未配置二维码"}</span>
                </span>
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {renderConnectModal()}
      {renderAgentPickerModal()}
    </div>
  );
};
