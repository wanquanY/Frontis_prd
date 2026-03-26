import classNames from "classnames";
import {
  ArrowLeftOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button, Dropdown, Empty, Input, Modal, Select, Tabs, Tag } from "antd";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { WORKSPACE_MODEL_OPTIONS } from "@/feature/workspace/types";

import type { EmployeeItem, WorkspaceItem } from "../types";
import {
  getAvatarText,
  getStatusLabel,
  EMPLOYEE_AVATAR_PRESETS,
} from "../utils";
import styles from "../FrontisPage.module.less";

interface ExpertsPrototypeViewProps {
  canRemoveEmployee: boolean;
  employeeModalMode: "create" | "edit" | null;
  employees: EmployeeItem[];
  isCreateEmployeeModalOpen: boolean;
  newEmployeeAvatarUrl: string;
  newEmployeeModel: string;
  newEmployeeName: string;
  newEmployeeRole: string;
  onEmployeeAvatarChange: (value: string) => void;
  onEmployeeAvatarFileSelect: (file: File | null) => void;
  onEditEmployee: (employeeId: string) => void;
  onCloseCreateEmployeeModal: () => void;
  onCreateEmployee: () => void;
  onEmployeeModelChange: (value: string) => void;
  onEmployeeNameChange: (value: string) => void;
  onEmployeeRoleChange: (value: string) => void;
  onOpenCreateEmployeeModal: () => void;
  onRemoveEmployee: (employeeId: string) => void;
  onStartDialogue: (employeeId: string) => void;
  onUpdateEmployee: (
    employeeId: string,
    patch: Partial<
      Pick<
        EmployeeItem,
        | "avatarUrl"
        | "name"
        | "role"
        | "summary"
        | "visibility"
        | "workspaceId"
        | "connectionMode"
        | "model"
        | "subAgentModel"
        | "boundMembers"
      >
    >,
  ) => void;
  onUpdateEmployeeAvatarFileSelect: (employeeId: string, file: File | null) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  employeeDocumentsById: Record<string, string[]>;
  employeeDocumentContentsById: Record<string, Record<string, string>>;
  skillCountByEmployeeId: Record<string, number>;
  skillNamesByEmployeeId: Record<string, string[]>;
  workspaces: WorkspaceItem[];
}

/**
 * AI 专家团视图。
 */
export const ExpertsPrototypeView = ({
  canRemoveEmployee,
  employeeModalMode,
  employees,
  isCreateEmployeeModalOpen,
  newEmployeeAvatarUrl,
  newEmployeeModel,
  newEmployeeName,
  newEmployeeRole,
  onEmployeeAvatarChange,
  onEmployeeAvatarFileSelect,
  onEditEmployee,
  onCloseCreateEmployeeModal,
  onCreateEmployee,
  onEmployeeModelChange,
  onEmployeeNameChange,
  onEmployeeRoleChange,
  onOpenCreateEmployeeModal,
  onRemoveEmployee,
  onStartDialogue,
  onUpdateEmployee,
  onUpdateEmployeeAvatarFileSelect,
  onUpdateEmployeeModel,
  employeeDocumentsById,
  employeeDocumentContentsById,
  skillNamesByEmployeeId,
  skillCountByEmployeeId,
  workspaces,
}: ExpertsPrototypeViewProps): JSX.Element => {
  const employeeAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const detailAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedResourceTab, setSelectedResourceTab] = useState<string>("members");
  const [selectedDocumentName, setSelectedDocumentName] = useState<string>("");
  const employeeModelOptions = useMemo(
    () =>
      WORKSPACE_MODEL_OPTIONS.map(option => ({
        label: option.label,
        value: option.label,
      })),
    [],
  );
  const workspaceOptions = useMemo(
    () =>
      workspaces.map(item => ({
        label: item.name,
        value: item.id,
      })),
    [workspaces],
  );
  const memberOptions = useMemo(
    () =>
      Array.from(new Set(employees.flatMap(item => item.boundMembers)))
        .filter(Boolean)
        .map(item => ({
          label: item,
          value: item,
        })),
    [employees],
  );

  const selectedEmployee = useMemo(
    () => employees.find(item => item.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );
  const isDetailMode = selectedEmployee !== null;
  const selectedEmployeeDocuments = useMemo(
    () => (selectedEmployee ? (employeeDocumentsById[selectedEmployee.id] ?? []) : []),
    [employeeDocumentsById, selectedEmployee],
  );
  const selectedDocumentContent = useMemo(() => {
    if (!selectedEmployee || !selectedDocumentName) return "";
    return employeeDocumentContentsById[selectedEmployee.id]?.[selectedDocumentName] ?? "";
  }, [employeeDocumentContentsById, selectedDocumentName, selectedEmployee]);

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

  const handleDetailAvatarInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (!selectedEmployee) return;
    onUpdateEmployeeAvatarFileSelect(selectedEmployee.id, event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployeeId(null);
      return;
    }
    if (selectedEmployeeId && employees.some(item => item.id === selectedEmployeeId)) {
      return;
    }
    setSelectedEmployeeId(current => (current ? employees[0].id : null));
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployee) {
      setSelectedDocumentName("");
      return;
    }
    const nextDocuments = employeeDocumentsById[selectedEmployee.id] ?? [];
    if (nextDocuments.length === 0) {
      setSelectedDocumentName("");
      return;
    }
    if (nextDocuments.includes(selectedDocumentName)) {
      return;
    }
    setSelectedDocumentName(nextDocuments[0]);
  }, [employeeDocumentsById, selectedDocumentName, selectedEmployee]);

  const handleEmployeeCardSelect = (employeeId: string): void => {
    setSelectedEmployeeId(employeeId);
  };

  const handleEmployeeCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    employeeId: string,
  ): void => {
    handleInlineActionKeyDown(event, () => {
      handleEmployeeCardSelect(employeeId);
    });
  };

  const renderEmployeeCard = (item: EmployeeItem, compact = false): JSX.Element => (
    <article
      key={item.id}
      className={classNames(styles.expertsEmployeeCard, {
        [styles.expertsEmployeeCardCompact]: compact,
        [styles.expertsEmployeeCardActive]: selectedEmployeeId === item.id,
      })}
      role={compact ? "button" : undefined}
      tabIndex={compact ? 0 : undefined}
      onClick={compact ? () => handleEmployeeCardSelect(item.id) : undefined}
      onKeyDown={compact ? event => handleEmployeeCardKeyDown(event, item.id) : undefined}
    >
      <div className={styles.expertsEmployeeHeader}>
        <div className={styles.expertsEmployeeIdentity}>
          <Avatar src={item.avatarUrl} className={styles.expertsEmployeeAvatar}>
            {getAvatarText(item.name)}
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
      {!compact ? (
        <div className={styles.expertsEmployeeBody}>
          <div className={styles.expertsEmployeeSummary}>{item.summary}</div>
          <div className={styles.expertsEmployeeSkillsPanel}>
            <div className={styles.expertsEmployeeSkillsLabel}>已安装技能</div>
            {(skillNamesByEmployeeId[item.id] ?? []).length > 0 ? (
              <div className={styles.expertsEmployeeSkillList}>
                {(skillNamesByEmployeeId[item.id] ?? []).map(skillName => (
                  <div key={skillName} className={styles.expertsEmployeeSkillItem}>
                    <span className={styles.expertsEmployeeSkillDot} />
                    <span className={styles.expertsEmployeeSkillText}>{skillName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.expertsEmployeeSkillEmpty}>当前未安装技能</div>
            )}
            <div className={styles.expertsEmployeeHoverActions}>
              <Button
                block
                className={styles.expertsEmployeeActionSecondary}
                onClick={event => {
                  event.stopPropagation();
                  handleEmployeeCardSelect(item.id);
                }}
              >
                查看详情
              </Button>
              <Button
                type="primary"
                block
                className={styles.expertsEmployeeActionPrimary}
                onClick={event => {
                  event.stopPropagation();
                  onStartDialogue(item.id);
                }}
              >
                直接对话
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.expertsEmployeeCompactMeta}>
          <span className={styles.infoTag}>
            {item.source === "coworker" ? "Coworker 受管" : "OpenClaw 外部"}
          </span>
          <span className={styles.expertsEmployeeCompactModel}>{item.model}</span>
        </div>
      )}
    </article>
  );

  return (
    <div
      className={classNames(styles.expertsShell, {
        [styles.expertsShellSingle]: !isDetailMode,
        [styles.expertsShellDetail]: isDetailMode,
      })}
    >
      {isDetailMode && selectedEmployee ? (
        <aside className={styles.expertsRail}>
          <div className={styles.expertsRailHeader}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedEmployeeId(null)}>
              返回广场
            </Button>
          </div>
          <button
            type="button"
            className={classNames(
              styles.expertsEmployeeCard,
              styles.expertsEmployeeCreateCard,
              styles.expertsEmployeeCreateCardCompact,
            )}
            onClick={onOpenCreateEmployeeModal}
          >
            <div className={styles.expertsEmployeeCreateIcon}>
              <PlusOutlined />
            </div>
            <div className={styles.expertsEmployeeCreateTitle}>新建 AI 专家</div>
          </button>

          <div className={styles.expertsRailList}>
            {employees.map(item => renderEmployeeCard(item, true))}
          </div>
        </aside>
      ) : null}

      <section
        className={classNames(styles.expertsMainCard, styles.expertsMainCardPlain, {
          [styles.expertsMainCardDetail]: isDetailMode,
        })}
      >
        <div className={styles.expertsToolbar}>
          <div className={styles.expertsToolbarLead}>
            <div>
              <div className={styles.expertsSectionTitle}>AI 专家</div>
              <div className={styles.cardSubtitle}>
                {isDetailMode && selectedEmployee
                  ? "查看 AI 专家的详细配置与运行信息"
                  : `当前共创建 ${employees.length} 名 AI 专家`}
              </div>
            </div>
          </div>
        </div>

        {!isDetailMode && employees.length > 0 ? (
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
              <div className={styles.expertsEmployeeCreateText}>添加头像、昵称与职责描述</div>
            </button>

            {employees.map(item => renderEmployeeCard(item))}
          </div>
        ) : null}

        {!isDetailMode && employees.length === 0 ? (
          <div className={styles.expertsEmptyState}>
            <div className={styles.expertsEmptyBlock}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前暂无 AI 专家" />
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreateEmployeeModal}>
                新建 AI 专家
              </Button>
            </div>
          </div>
        ) : null}

        {isDetailMode && selectedEmployee ? (
          <div className={styles.expertsDetailPanel}>
            <section className={styles.expertsDetailHero}>
              <div className={styles.expertsDetailHeroLayout}>
                <div className={styles.expertsDetailAvatarCard}>
                  <input
                    ref={detailAvatarInputRef}
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleDetailAvatarInputChange}
                  />
                  <Avatar src={selectedEmployee.avatarUrl} className={styles.expertsDetailAvatar}>
                    {getAvatarText(selectedEmployee.name)}
                  </Avatar>
                  <div className={styles.expertsDetailAvatarMeta}>
                    <div className={styles.expertsDetailAvatarTitle}>头像</div>
                    <div className={styles.expertsDetailAvatarHint}>
                      可替换当前头像，或切换为默认头像模板
                    </div>
                  </div>
                  <div className={styles.expertsDetailAvatarActions}>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => detailAvatarInputRef.current?.click()}
                    >
                      更换头像
                    </Button>
                  </div>
                  <div className={styles.expertsDetailAvatarPresetRow}>
                    {EMPLOYEE_AVATAR_PRESETS.slice(0, 4).map(item => (
                      <button
                        key={item}
                        type="button"
                        className={classNames(styles.expertsDetailAvatarPreset, {
                          [styles.expertsDetailAvatarPresetActive]:
                            selectedEmployee.avatarUrl === item,
                        })}
                        onClick={() => {
                          onUpdateEmployee(selectedEmployee.id, {
                            avatarUrl: item,
                          });
                        }}
                      >
                        <Avatar src={item} className={styles.expertsDetailAvatarPresetInner}>
                          {getAvatarText(selectedEmployee.name)}
                        </Avatar>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.expertsDetailProfileCard}>
                  <div className={styles.expertsDetailProfileMeta}>
                    <Tag color="cyan">
                      {selectedEmployee.source === "coworker"
                        ? "Coworker 受管"
                        : "OpenClaw 外部"}
                    </Tag>
                  </div>
                  <div className={styles.expertsDetailProfileGrid}>
                    <div className={styles.expertsDetailFieldGroup}>
                      <div className={styles.fieldLabel}>AI 专家名称</div>
                      <Input
                        value={selectedEmployee.name}
                        size="large"
                        className={styles.expertsDetailNameInput}
                        onChange={event => {
                          onUpdateEmployee(selectedEmployee.id, {
                            name: event.target.value,
                          });
                        }}
                      />
                    </div>
                    <div
                      className={classNames(
                        styles.expertsDetailFieldGroup,
                        styles.expertsDetailFieldGroupFull,
                      )}
                    >
                      <div className={styles.fieldLabel}>职责描述</div>
                      <Input.TextArea
                        value={selectedEmployee.summary}
                        autoSize={{ minRows: 3, maxRows: 5 }}
                        className={styles.expertsDetailSummaryInput}
                        onChange={event => {
                          onUpdateEmployee(selectedEmployee.id, {
                            summary: event.target.value,
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.expertsDetailSection}>
              <div className={styles.expertsDetailSectionTitle}>基础配置</div>
              <div className={styles.expertsDetailGrid}>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>可见范围</span>
                  <Select
                    value={selectedEmployee.visibility}
                    className={styles.expertsDetailControl}
                    options={[
                      { label: "租户全员可见", value: "all" },
                      { label: "仅绑定成员可见", value: "bound" },
                    ]}
                    onChange={value => {
                      onUpdateEmployee(selectedEmployee.id, {
                        visibility: value,
                      });
                    }}
                  />
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>绑定工作站</span>
                  <Select
                    value={selectedEmployee.workspaceId}
                    className={styles.expertsDetailControl}
                    disabled={Boolean(selectedEmployee.workspaceId)}
                    options={workspaceOptions}
                    onChange={value => {
                      onUpdateEmployee(selectedEmployee.id, {
                        workspaceId: value,
                      });
                    }}
                  />
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>连接模式</span>
                  <Select
                    value={selectedEmployee.connectionMode}
                    className={styles.expertsDetailControl}
                    options={[
                      { label: "云端托管", value: "cloud" },
                      { label: "本地 / 边缘", value: "local" },
                    ]}
                    onChange={value => {
                      onUpdateEmployee(selectedEmployee.id, {
                        connectionMode: value,
                      });
                    }}
                  />
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>远程状态</span>
                  <span className={styles.expertsDetailValue}>
                    {getStatusLabel(selectedEmployee.status)}
                  </span>
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>执行模型</span>
                  <Select
                    value={selectedEmployee.model}
                    className={styles.expertsDetailControl}
                    options={employeeModelOptions}
                    onChange={value => {
                      onUpdateEmployeeModel(selectedEmployee.id, value);
                    }}
                  />
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>子 Agent 模型</span>
                  <Select
                    value={selectedEmployee.subAgentModel}
                    allowClear
                    placeholder="沿用默认"
                    className={styles.expertsDetailControl}
                    options={employeeModelOptions}
                    onChange={value => {
                      onUpdateEmployee(selectedEmployee.id, {
                        subAgentModel: value,
                      });
                    }}
                  />
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>AI 员工 ID</span>
                  <span className={styles.expertsDetailCode}>{selectedEmployee.agentId}</span>
                </div>
                <div className={styles.expertsDetailItem}>
                  <span className={styles.expertsDetailLabel}>Runtime Agent ID</span>
                  <span className={styles.expertsDetailCode}>{selectedEmployee.runtimeAgentId}</span>
                </div>
              </div>
            </section>

            <section className={styles.expertsDetailSection}>
              <div className={styles.expertsDetailSectionTitle}>成员、技能与文档</div>
              <div className={styles.expertsResourceTabsCard}>
                <Tabs
                  size="small"
                  activeKey={selectedResourceTab}
                  items={[
                    { key: "members", label: "绑定成员" },
                    { key: "skills", label: "已安装技能" },
                    { key: "documents", label: "Agent Markdown 文档" },
                  ]}
                  onChange={setSelectedResourceTab}
                />
                {selectedResourceTab === "members" ? (
                  <div className={styles.expertsResourceStage}>
                    {selectedEmployee.visibility === "bound" ? (
                      <div className={styles.expertsMemberEditor}>
                        <div className={styles.expertsMemberEditorHeader}>
                          <div className={styles.fieldLabel}>绑定成员列表</div>
                        </div>
                        <Select
                          mode="multiple"
                          value={selectedEmployee.boundMembers}
                          options={memberOptions}
                          placeholder="请选择可见成员"
                          className={styles.expertsDetailControl}
                          onChange={value => {
                            onUpdateEmployee(selectedEmployee.id, {
                              boundMembers: value,
                            });
                          }}
                        />
                        {selectedEmployee.boundMembers.length > 0 ? (
                          <div className={styles.expertsResourceList}>
                            {selectedEmployee.boundMembers.map(item => (
                              <div key={item} className={styles.expertsResourceListItem}>
                                <span className={styles.expertsResourceListBullet} />
                                <span className={styles.expertsResourceListText}>{item}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.cardSubtitle}>当前未绑定成员</span>
                        )}
                      </div>
                    ) : (
                      <span className={styles.cardSubtitle}>
                        当前为租户全员可见，无需单独配置绑定成员。
                      </span>
                    )}
                  </div>
                ) : null}
                {selectedResourceTab === "skills" ? (
                  <div className={styles.expertsResourceStage}>
                    {(skillNamesByEmployeeId[selectedEmployee.id] ?? []).length > 0 ? (
                      <div className={styles.expertsResourceList}>
                        {(skillNamesByEmployeeId[selectedEmployee.id] ?? []).map(item => (
                          <div key={item} className={styles.expertsResourceListItem}>
                            <span className={styles.expertsResourceListBullet} />
                            <span className={styles.expertsResourceListText}>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.cardSubtitle}>当前未安装技能</span>
                    )}
                  </div>
                ) : null}
                {selectedResourceTab === "documents" ? (
                  <div className={styles.expertsResourceStage}>
                    {selectedEmployeeDocuments.length > 0 ? (
                      <div className={styles.expertsDocumentTabsWrap}>
                        <Tabs
                          size="small"
                          activeKey={selectedDocumentName}
                          items={selectedEmployeeDocuments.map(item => ({
                            key: item,
                            label: item,
                          }))}
                          onChange={setSelectedDocumentName}
                        />
                        <div className={styles.expertsDocumentStage}>
                          <div className={styles.expertsDocumentStageHeader}>
                            {selectedDocumentName}
                          </div>
                          <div className={styles.expertsDocumentContent}>
                            <MarkdownRenderer source={selectedDocumentContent} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className={styles.cardSubtitle}>当前暂无文档</span>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

          </div>
        ) : (
          null
        )}
      </section>

      <Modal
        title={employeeModalMode === "edit" ? "编辑 AI 专家" : "新建 AI 专家"}
        open={isCreateEmployeeModalOpen}
        onCancel={onCloseCreateEmployeeModal}
        footer={null}
        destroyOnHidden
      >
        <div className={styles.expertsModalBody}>
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
                  {getAvatarText(newEmployeeName || "AI 专家")}
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
              {EMPLOYEE_AVATAR_PRESETS.map(item => (
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
