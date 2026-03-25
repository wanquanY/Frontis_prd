import classNames from "classnames";
import {
  ApiOutlined,
  CloudServerOutlined,
  CopyOutlined,
  KeyOutlined,
  LaptopOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { MenuProps, ModalProps } from "antd";
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useMemo, useRef } from "react";
import { Avatar, Button, Dropdown, Empty, Input, Modal, Popover, Select } from "antd";
import { WORKSPACE_MODEL_OPTIONS } from "@/feature/workspace/types";

import type { EmployeeItem, WorkspaceItem, WorkspaceType } from "../types";
import {
  getPrdAvatarText,
  getPrdActivationExpireText,
  getPrdActivationTitle,
  getStatusClassName,
  getStatusLabel,
  getWorkspaceTypeLabel,
  PRD_EMPLOYEE_AVATAR_PRESETS,
} from "../utils";
import styles from "../PrdPage.module.less";

interface ExpertsPrototypeViewProps {
  activeWorkspace: WorkspaceItem;
  canRemoveEmployee: boolean;
  canRemoveWorkspace: boolean;
  employeeModalMode: "create" | "edit" | null;
  isCreateEmployeeModalOpen: boolean;
  isCreateWorkspaceModalOpen: boolean;
  newEmployeeAvatarUrl: string;
  newEmployeeModel: string;
  newEmployeeName: string;
  newEmployeeRole: string;
  newWorkspaceName: string;
  newWorkspaceType: WorkspaceType;
  onEmployeeAvatarChange: (value: string) => void;
  onEmployeeAvatarFileSelect: (file: File | null) => void;
  onEditEmployee: (employeeId: string) => void;
  onEditWorkspace: (workspaceId: string) => void;
  onCloseCreateEmployeeModal: () => void;
  onCloseCreateWorkspaceModal: () => void;
  onCreateEmployee: () => void;
  onCreateWorkspace: () => void;
  onCopyWorkspaceActivationCode: (workspaceId: string) => Promise<void>;
  onEmployeeModelChange: (value: string) => void;
  onEmployeeNameChange: (value: string) => void;
  onEmployeeRoleChange: (value: string) => void;
  onOpenCreateEmployeeModal: () => void;
  onOpenCreateWorkspaceModal: () => void;
  onRemoveEmployee: (employeeId: string) => void;
  onRemoveWorkspace: (workspaceId: string) => void;
  onRegenerateWorkspaceActivationCode: (workspaceId: string) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceSelect: (workspaceId: string) => void;
  onWorkspaceTypeChange: (value: WorkspaceType) => void;
  skillCountByEmployeeId: Record<string, number>;
  workspaceModalMode: "create" | "edit" | null;
  workspaceEmployees: EmployeeItem[];
  workspaces: WorkspaceItem[];
}

const WORKSPACE_TYPE_OPTIONS: Array<{ label: string; value: WorkspaceType }> = [
  { label: "云端工作站", value: "cloud" },
  { label: "本地工作站", value: "local" },
  { label: "边缘工作站", value: "edge" },
];

const LOCAL_CLIENT_DOWNLOADS: Array<{ label: string; href: string }> = [
  { label: "下载 macOS 客户端", href: "https://download.synclaw.ai/client/macos" },
  { label: "下载 Windows 客户端", href: "https://download.synclaw.ai/client/windows" },
];

const EDGE_CLIENT_DOWNLOADS: Array<{ label: string; href: string }> = [
  { label: "下载 macOS 安装包", href: "https://download.synclaw.ai/edge/macos" },
  { label: "下载 Windows 安装包", href: "https://download.synclaw.ai/edge/windows" },
  { label: "下载 Linux 安装包", href: "https://download.synclaw.ai/edge/linux" },
];

const EDGE_API_URL = "https://syngents-api.frontis.cn";
const EDGE_SETUP_EXAMPLE_URL =
  "https://syngents-prod-1346293574.cos.ap-beijing.myqcloud.com/syngents/test/tenant/1/identity/undefined/attachments/04ae5670-a51d-476f-ac26-4b745e2d3cd0.png";

const WORKSPACE_MODAL_STYLES: NonNullable<ModalProps["styles"]> = {
  container: {
    height: 760,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "24px 24px 0",
    marginBottom: 0,
    flex: "0 0 auto",
  },
  body: {
    flex: 1,
    minHeight: 0,
    padding: "20px 24px 24px",
  },
  title: {
    fontSize: 18,
    lineHeight: "28px",
    fontWeight: 700,
  },
};

const getWorkspaceIcon = (type: WorkspaceType): ReactNode => {
  if (type === "cloud") {
    return <CloudServerOutlined />;
  }
  if (type === "local") {
    return <LaptopOutlined />;
  }
  return <ApiOutlined />;
};

/**
 * AI 专家团视图。
 */
export const ExpertsPrototypeView = ({
  activeWorkspace,
  canRemoveEmployee,
  canRemoveWorkspace,
  employeeModalMode,
  isCreateEmployeeModalOpen,
  isCreateWorkspaceModalOpen,
  newEmployeeAvatarUrl,
  newEmployeeModel,
  newEmployeeName,
  newEmployeeRole,
  newWorkspaceName,
  newWorkspaceType,
  onEmployeeAvatarChange,
  onEmployeeAvatarFileSelect,
  onEditEmployee,
  onEditWorkspace,
  onCloseCreateEmployeeModal,
  onCloseCreateWorkspaceModal,
  onCreateEmployee,
  onCreateWorkspace,
  onCopyWorkspaceActivationCode,
  onEmployeeModelChange,
  onEmployeeNameChange,
  onEmployeeRoleChange,
  onOpenCreateEmployeeModal,
  onOpenCreateWorkspaceModal,
  onRemoveEmployee,
  onRemoveWorkspace,
  onRegenerateWorkspaceActivationCode,
  onUpdateEmployeeModel,
  onWorkspaceNameChange,
  onWorkspaceSelect,
  onWorkspaceTypeChange,
  skillCountByEmployeeId,
  workspaceModalMode,
  workspaceEmployees,
  workspaces,
}: ExpertsPrototypeViewProps): JSX.Element => {
  const employeeAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const employeeModelOptions = useMemo(
    () =>
      WORKSPACE_MODEL_OPTIONS.map(option => ({
        label: option.label,
        value: option.label,
      })),
    [],
  );

  const handleMenuButtonClick = (event: MouseEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMenuButtonKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    event.stopPropagation();
  };

  const handleInlineActionKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action?: () => void,
  ): void => {
    event.stopPropagation();
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action?.();
  };

  const getWorkspaceMenuItems = (workspaceId: string): MenuProps["items"] => [
    {
      key: "edit",
      label: "编辑",
      onClick: () => onEditWorkspace(workspaceId),
    },
    {
      key: "remove",
      label: "移除",
      disabled: !canRemoveWorkspace,
      danger: true,
      onClick: () => onRemoveWorkspace(workspaceId),
    },
  ];

  const getEmployeeMenuItems = (employeeId: string): MenuProps["items"] => [
    {
      key: "edit",
      label: "编辑",
      onClick: () => onEditEmployee(employeeId),
    },
    {
      key: "remove",
      label: "移除",
      disabled: !canRemoveEmployee,
      danger: true,
      onClick: () => onRemoveEmployee(employeeId),
    },
  ];

  const handleEmployeeAvatarInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onEmployeeAvatarFileSelect(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const renderEdgeWorkspaceActivationTrigger = (workspace: WorkspaceItem): ReactNode => {
    if (workspace.type !== "edge" || !workspace.activationCode) return null;

    return (
      <Popover
        trigger="click"
        placement="bottomLeft"
        overlayClassName={styles.edgeWorkspaceActivationPopover}
        content={
          <div className={styles.edgeWorkspaceActivationCard}>
            <div className={styles.edgeWorkspaceActivationCardTitle}>
              {getPrdActivationTitle(workspace.activationValidDays)}
            </div>
            <div className={styles.edgeWorkspaceActivationHint}>
              {workspace.activationHint ?? "请在工作站客户端输入激活码完成接入。"}
            </div>
            <div className={styles.edgeWorkspaceActivationCodeRow}>
              <span className={styles.edgeWorkspaceActivationCode}>{workspace.activationCode}</span>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  void onCopyWorkspaceActivationCode(workspace.id);
                }}
              >
                复制
              </Button>
            </div>
            <div className={styles.edgeWorkspaceActivationExpire}>
              {getPrdActivationExpireText(workspace.activationExpiresAt)}
            </div>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              className={styles.edgeWorkspaceActivationPrimaryButton}
              onClick={() => {
                onRegenerateWorkspaceActivationCode(workspace.id);
              }}
            >
              重新生成激活码
            </Button>
          </div>
        }
      >
        <span
          role="button"
          tabIndex={0}
          className={styles.edgeWorkspaceActivationTrigger}
          onClick={handleMenuButtonClick}
          onKeyDown={event => {
            handleInlineActionKeyDown(event, () => {
              event.currentTarget.click();
            });
          }}
        >
          <KeyOutlined />
          激活码
        </span>
      </Popover>
    );
  };

  return (
    <div className={styles.expertsShell}>
      <aside className={styles.expertsSidebarCard}>
        <div className={styles.expertsSidebarHeader}>
          <div>
            <div className={styles.cardTitle}>工作站</div>
            <div className={styles.cardSubtitle}>{workspaces.length} 个工作站</div>
          </div>
        </div>

        <div className={styles.expertsWorkspaceList}>
          <button
            type="button"
            className={classNames(
              styles.expertsWorkspaceButton,
              styles.expertsWorkspaceCreateButton,
            )}
            onClick={onOpenCreateWorkspaceModal}
          >
            <div className={styles.expertsWorkspaceCreateIcon}>
              <PlusOutlined />
            </div>
            <div className={styles.expertsWorkspaceCreateContent}>
              <span className={styles.expertsWorkspaceName}>新建工作站</span>
              <span className={styles.expertsWorkspaceHint}>添加云端、本地或边缘设备</span>
            </div>
          </button>

          {workspaces.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(styles.expertsWorkspaceButton, {
                [styles.expertsWorkspaceButtonActive]: item.id === activeWorkspace.id,
              })}
              onClick={() => onWorkspaceSelect(item.id)}
            >
              <div className={styles.expertsWorkspaceLead}>
                <div className={styles.expertsWorkspaceIcon}>{getWorkspaceIcon(item.type)}</div>
                <div className={styles.expertsWorkspaceMain}>
                  <div className={styles.expertsWorkspaceButtonHeader}>
                    <span className={styles.expertsWorkspaceName}>{item.name}</span>
                    <Dropdown menu={{ items: getWorkspaceMenuItems(item.id) }} trigger={["click"]}>
                      <span
                        role="button"
                        tabIndex={0}
                        className={styles.cardActionButton}
                        aria-label={`${item.name} 操作`}
                        onClick={handleMenuButtonClick}
                        onKeyDown={handleMenuButtonKeyDown}
                      >
                        <MoreOutlined />
                      </span>
                    </Dropdown>
                  </div>
                  <div className={styles.expertsWorkspaceMetaRow}>
                    <span className={styles.infoTag}>{getWorkspaceTypeLabel(item.type)}</span>
                    <span
                      className={classNames(
                        styles.statusPill,
                        getStatusClassName(item.status, styles),
                      )}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                    {renderEdgeWorkspaceActivationTrigger(item)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={styles.expertsMainCard}>
        <div className={styles.expertsToolbar}>
          <div>
            <div className={styles.expertsSectionTitle}>AI 专家</div>
            <div className={styles.cardSubtitle}>
              当前工作站已挂载 {workspaceEmployees.length} 名 AI 专家
            </div>
          </div>
        </div>

        {workspaceEmployees.length > 0 ? (
          <div className={styles.expertsEmployeeList}>
            <button
              type="button"
              className={classNames(styles.expertsEmployeeCard, styles.expertsEmployeeCreateCard)}
              onClick={onOpenCreateEmployeeModal}
            >
              <div className={styles.expertsEmployeeCreateIcon}>
                <PlusOutlined />
              </div>
              <div className={styles.expertsEmployeeCreateTitle}>新建 AI 专家</div>
              <div className={styles.expertsEmployeeCreateText}>
                添加头像、昵称与职责描述，挂载到当前工作站
              </div>
            </button>

            {workspaceEmployees.map(item => (
              <article key={item.id} className={styles.expertsEmployeeCard}>
                <div className={styles.expertsEmployeeHeader}>
                  <div className={styles.expertsEmployeeIdentity}>
                    <Avatar src={item.avatarUrl} className={styles.expertsEmployeeAvatar}>
                      {getPrdAvatarText(item.name)}
                    </Avatar>
                    <div className={styles.expertsEmployeeIdentityBody}>
                      <div className={styles.expertsEmployeeName}>{item.name}</div>
                      <div className={styles.expertsEmployeeSkillCount}>
                        {skillCountByEmployeeId[item.id] ?? 0} 个技能
                      </div>
                    </div>
                  </div>
                  <Dropdown menu={{ items: getEmployeeMenuItems(item.id) }} trigger={["click"]}>
                    <span
                      role="button"
                      tabIndex={0}
                      className={styles.cardActionButton}
                      aria-label={`${item.name} 操作`}
                      onClick={handleMenuButtonClick}
                      onKeyDown={handleMenuButtonKeyDown}
                    >
                      <MoreOutlined />
                    </span>
                  </Dropdown>
                </div>
                <div className={styles.expertsEmployeeModelField}>
                  <span className={styles.expertsEmployeeModelLabel}>模型</span>
                  <Select
                    size="large"
                    value={item.model}
                    className={styles.expertsEmployeeModelSelect}
                    options={WORKSPACE_MODEL_OPTIONS.map(option => ({
                      label: option.label,
                      value: option.label,
                    }))}
                    onChange={value => onUpdateEmployeeModel(item.id, value)}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.expertsEmptyState}>
            <div className={styles.expertsEmptyBlock}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前工作站暂无 AI 专家" />
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreateEmployeeModal}>
                新建 AI 专家
              </Button>
            </div>
          </div>
        )}
      </section>

      <Modal
        title={workspaceModalMode === "edit" ? "编辑工作站" : "新建工作站"}
        open={isCreateWorkspaceModalOpen}
        width={760}
        centered
        onCancel={onCloseCreateWorkspaceModal}
        footer={null}
        destroyOnHidden
        rootClassName={styles.expertsWorkspaceModal}
        styles={WORKSPACE_MODAL_STYLES}
      >
        <div className={styles.expertsWorkspaceModalLayout}>
          <div className={classNames(styles.expertsModalBody, styles.expertsWorkspaceModalBody)}>
            <label className={styles.fieldLabel} htmlFor="prd-workspace-name">
              工作站名称
            </label>
            <Input
              id="prd-workspace-name"
              size="large"
              value={newWorkspaceName}
              placeholder="输入工作站名称"
              onChange={event => onWorkspaceNameChange(event.target.value)}
            />
            <div className={styles.fieldLabel}>工作站类型</div>
            <Select
              size="large"
              value={newWorkspaceType}
              options={WORKSPACE_TYPE_OPTIONS}
              onChange={value => onWorkspaceTypeChange(value)}
            />
            <div className={styles.workspaceTypeGuideCard}>
              <div className={styles.workspaceTypeGuideHeader}>
                <span className={styles.workspaceTypeGuideIcon}>
                  {getWorkspaceIcon(newWorkspaceType)}
                </span>
                <div className={styles.workspaceTypeGuideTitleBlock}>
                  <div className={styles.workspaceTypeGuideTitle}>
                    {newWorkspaceType === "cloud"
                      ? "云端工作站"
                      : newWorkspaceType === "local"
                        ? "本地工作站"
                        : "边缘工作站"}
                  </div>
                  <div className={styles.workspaceTypeGuideDesc}>
                    {newWorkspaceType === "cloud"
                      ? "创建云设备后会直接连接到平台，适合需要云桌面、远端浏览器和云端执行的场景。"
                      : newWorkspaceType === "local"
                        ? "下载并登录客户端后，会把当前电脑注册为本地工作站，适合直接使用本机环境和本地文件。"
                        : "先创建设备，再生成企业侧激活码；设备激活完成后，才会正式接入该工作站。"}
                  </div>
                </div>
              </div>

              {newWorkspaceType === "cloud" ? (
                <div className={styles.workspaceTypeGuidePanel}>
                  <div className={styles.workspaceTypeGuideLabel}>创建后动作</div>
                  <div className={styles.workspaceTypeGuideValue}>
                    直接创建云设备并自动连接到 SynClaw
                  </div>
                </div>
              ) : null}

              {newWorkspaceType === "local" ? (
                <div className={styles.workspaceTypeGuidePanel}>
                  <div className={styles.workspaceTypeGuideLabel}>客户端下载</div>
                  <div className={styles.workspaceTypeGuideLinkRow}>
                    {LOCAL_CLIENT_DOWNLOADS.map(item => (
                      <a
                        key={item.href}
                        className={styles.workspaceTypeGuideLink}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                  <div className={styles.workspaceTypeGuideHint}>
                    下载客户端并完成登录后，即可把当前设备接入为本地工作站。
                  </div>
                </div>
              ) : null}

              {newWorkspaceType === "edge" ? (
                <div className={styles.workspaceTypeGuidePanel}>
                  <div className={styles.workspaceTypeGuideLabel}>客户端下载</div>
                  <div className={styles.workspaceTypeGuideLinkRow}>
                    {EDGE_CLIENT_DOWNLOADS.map(item => (
                      <a
                        key={item.href}
                        className={styles.workspaceTypeGuideLink}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                  <div className={styles.workspaceTypeGuideMetaBlock}>
                    <div className={styles.workspaceTypeGuideLabel}>云端 API</div>
                    <div className={styles.workspaceTypeGuideValue}>{EDGE_API_URL}</div>
                  </div>
                  <div className={styles.workspaceTypeGuideHint}>
                    安装软件后，需要在客户端内输入云端 API 和激活码，完成后才会正式接入边缘工作站。
                  </div>
                  <div className={styles.workspaceTypeGuidePreviewBlock}>
                    <div className={styles.workspaceTypeGuideLabel}>安装配置示例</div>
                    <div className={styles.workspaceTypeGuidePreviewFrame}>
                      <img
                        src={EDGE_SETUP_EXAMPLE_URL}
                        alt="边缘工作站安装配置示例截图"
                        className={styles.workspaceTypeGuidePreviewImage}
                      />
                    </div>
                  </div>
                  <a
                    className={styles.workspaceTypeGuideSecondaryLink}
                    href={EDGE_SETUP_EXAMPLE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    在新窗口打开示例截图
                  </a>
                  <div className={styles.workspaceTypeGuideHint}>云端 API 地址：{EDGE_API_URL}</div>
                </div>
              ) : null}
            </div>
          </div>
          <div
            className={classNames(styles.expertsModalActions, styles.expertsWorkspaceModalActions)}
          >
            <Button size="large" onClick={onCloseCreateWorkspaceModal}>
              取消
            </Button>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onCreateWorkspace}>
              {workspaceModalMode === "edit"
                ? "保存工作站"
                : newWorkspaceType === "cloud"
                  ? "创建云设备"
                  : newWorkspaceType === "local"
                    ? "创建本地工作站"
                    : "创建设备并生成激活码"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={employeeModalMode === "edit" ? "编辑 AI 专家" : "新建 AI 专家"}
        open={isCreateEmployeeModalOpen}
        onCancel={onCloseCreateEmployeeModal}
        footer={null}
        destroyOnHidden
      >
        <div className={styles.expertsModalBody}>
          <div className={styles.cardSubtitle}>当前挂载到 {activeWorkspace.name}</div>
          <div className={styles.fieldLabel}>头像</div>
          <div className={styles.employeeAvatarField}>
            <input
              ref={employeeAvatarInputRef}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleEmployeeAvatarInputChange}
            />
            <div className={styles.employeeAvatarCurrentSection}>
              <button
                type="button"
                className={styles.employeeAvatarPreviewButton}
                onClick={() => employeeAvatarInputRef.current?.click()}
              >
                <Avatar src={newEmployeeAvatarUrl} className={styles.employeeAvatarPreview}>
                  {getPrdAvatarText(newEmployeeName || "AI 专家")}
                </Avatar>
                <span className={styles.employeeAvatarUploadText}>
                  <UploadOutlined />
                  上传头像
                </span>
              </button>
              <div className={styles.employeeAvatarMeta}>
                <div className={styles.employeeAvatarMetaTitle}>当前头像</div>
                <div className={styles.employeeAvatarMetaHint}>
                  可上传自定义头像，或从下方默认头像中选择
                </div>
              </div>
            </div>
            <div className={styles.employeeAvatarPresetGrid}>
              {PRD_EMPLOYEE_AVATAR_PRESETS.map(item => (
                <button
                  key={item}
                  type="button"
                  className={classNames(styles.employeeAvatarPreset, {
                    [styles.employeeAvatarPresetActive]: newEmployeeAvatarUrl === item,
                  })}
                  onClick={() => onEmployeeAvatarChange(item)}
                >
                  <Avatar src={item} className={styles.employeeAvatarPresetInner}>
                    AI
                  </Avatar>
                </button>
              ))}
            </div>
          </div>
          <label className={styles.fieldLabel} htmlFor="prd-employee-name">
            AI 员工名称
          </label>
          <Input
            id="prd-employee-name"
            size="large"
            value={newEmployeeName}
            placeholder="例如：法务摘要助手"
            onChange={event => onEmployeeNameChange(event.target.value)}
          />
          <label className={styles.fieldLabel} htmlFor="prd-employee-role">
            角色定位
          </label>
          <Input
            id="prd-employee-role"
            size="large"
            value={newEmployeeRole}
            placeholder="例如：合同条款整理与风险提示"
            onChange={event => onEmployeeRoleChange(event.target.value)}
          />
          <div className={styles.fieldLabel}>模型</div>
          <Select
            size="large"
            value={newEmployeeModel}
            options={employeeModelOptions}
            onChange={onEmployeeModelChange}
          />
          <div className={styles.expertsModalActions}>
            <Button size="large" onClick={onCloseCreateEmployeeModal}>
              取消
            </Button>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onCreateEmployee}>
              {employeeModalMode === "edit" ? "保存 AI 专家" : "创建 AI 专家"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
