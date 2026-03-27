import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import { FormOutlined } from "@ant-design/icons";
import { Button, Input, message, Modal, Select, Tag } from "antd";

import type { EmployeeItem, EmployeeVisibility, SkillItem } from "../../types";
import prototypeStyles from "../../FrontisPage.module.less";
import adminStyles from "../FrontisAdminViews.module.less";
import styles from "../FrontisWebViews.module.less";
import {
  AGENT_STORE_MARKET_ITEMS,
  AGENT_STORE_SCENE_OWNED_EMPLOYEE_IDS_MAP,
  AGENT_STORE_SCENE_SUMMARY_MAP,
  AGENT_STORE_SCENARIO_OPTIONS,
  createInitialAgentStoreLeadFormState,
} from "./agentStoreData";
import { AgentStoreMarketExpertCard, AgentStoreOwnedExpertCard } from "./AgentStoreCards";
import { renderSkillCategoryIcon } from "./agentStoreUtils";
import type {
  AgentStoreLeadFormState,
  AgentStoreLeadModalMode,
  AgentStoreResolvedScenarioKey,
  AgentStoreScenePresentation,
  AgentStoreScenarioKey,
  AgentStoreViewProps,
} from "./types";

/**
 * 企业管理员侧 AI 专家团视图。
 */
export const AgentStoreView = ({
  employees,
  memberNames,
  onUpdateEmployeeAccess,
  skills,
}: AgentStoreViewProps): JSX.Element => {
  const [skillModalEmployeeId, setSkillModalEmployeeId] = useState<string | null>(null);
  const [configEmployeeId, setConfigEmployeeId] = useState<string | null>(null);
  const [leadModalMode, setLeadModalMode] = useState<AgentStoreLeadModalMode | null>(null);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<AgentStoreScenarioKey>("all");
  const [draftVisibility, setDraftVisibility] = useState<EmployeeVisibility>("all");
  const [draftBoundMembers, setDraftBoundMembers] = useState<string[]>([]);
  const [leadForm, setLeadForm] = useState<AgentStoreLeadFormState>(
    createInitialAgentStoreLeadFormState,
  );

  const employeeMap = useMemo(
    () =>
      employees.reduce<Record<string, EmployeeItem>>((result, employee) => {
        result[employee.id] = employee;
        return result;
      }, {}),
    [employees],
  );

  const skillsByEmployeeId = useMemo(
    () =>
      skills.reduce<Record<string, SkillItem[]>>((result, skill) => {
        skill.installedFor.forEach(employeeId => {
          if (!result[employeeId]) {
            result[employeeId] = [];
          }
          result[employeeId].push(skill);
        });
        return result;
      }, {}),
    [skills],
  );

  const selectedSkillModalEmployee = useMemo(
    () => employees.find(item => item.id === skillModalEmployeeId) ?? null,
    [employees, skillModalEmployeeId],
  );

  const selectedConfigEmployee = useMemo(
    () => employees.find(item => item.id === configEmployeeId) ?? null,
    [configEmployeeId, employees],
  );

  const memberOptions = useMemo(
    () =>
      Array.from(new Set(memberNames)).map(item => ({
        label: item,
        value: item,
      })),
    [memberNames],
  );

  const scenarioLabelMap = useMemo(
    () =>
      AGENT_STORE_SCENARIO_OPTIONS.reduce<Record<AgentStoreScenarioKey, string>>(
        (result, item) => {
          result[item.key] = item.label;
          return result;
        },
        {} as Record<AgentStoreScenarioKey, string>,
      ),
    [],
  );

  const scenePresentations = useMemo<AgentStoreScenePresentation[]>(
    () =>
      AGENT_STORE_SCENARIO_OPTIONS.filter(
        (
          item,
        ): item is (typeof AGENT_STORE_SCENARIO_OPTIONS)[number] & {
          key: AgentStoreResolvedScenarioKey;
        } => item.key !== "all",
      )
        .map(item => {
          const ownedExperts = AGENT_STORE_SCENE_OWNED_EMPLOYEE_IDS_MAP[item.key]
            .map(employeeId => employeeMap[employeeId])
            .filter((employee): employee is EmployeeItem => employee !== undefined)
            .map(employee => ({
              employee,
              sceneKey: item.key,
            }));
          const marketExperts = AGENT_STORE_MARKET_ITEMS.filter(
            marketItem => marketItem.scenarioKey === item.key,
          );

          return {
            description: AGENT_STORE_SCENE_SUMMARY_MAP[item.key],
            key: item.key,
            label: item.label,
            marketExperts,
            ownedExperts,
          };
        })
        .filter(item => item.ownedExperts.length > 0 || item.marketExperts.length > 0),
    [employeeMap],
  );

  const scenarioCountMap = useMemo(
    () =>
      scenePresentations.reduce<Partial<Record<AgentStoreResolvedScenarioKey, number>>>(
        (result, item) => {
          result[item.key] = item.ownedExperts.length + item.marketExperts.length;
          return result;
        },
        {},
      ),
    [scenePresentations],
  );

  const visibleScenarioOptions = useMemo(
    () =>
      AGENT_STORE_SCENARIO_OPTIONS.filter(
        item =>
          item.key === "all" ||
          (scenarioCountMap[item.key as AgentStoreResolvedScenarioKey] ?? 0) > 0,
      ),
    [scenarioCountMap],
  );

  const visibleScenePresentations = useMemo(
    () =>
      selectedScenarioKey === "all"
        ? scenePresentations
        : scenePresentations.filter(item => item.key === selectedScenarioKey),
    [scenePresentations, selectedScenarioKey],
  );

  const totalSceneCount = scenePresentations.length;
  const selectedScenarioLabel = scenarioLabelMap[selectedScenarioKey];

  const visibleOwnedExpertCount = useMemo(
    () => visibleScenePresentations.reduce((result, item) => result + item.ownedExperts.length, 0),
    [visibleScenePresentations],
  );

  const visibleMarketExpertCount = useMemo(
    () => visibleScenePresentations.reduce((result, item) => result + item.marketExperts.length, 0),
    [visibleScenePresentations],
  );

  const handleOpenConfigModal = useCallback(
    (employeeId: string): void => {
      const employee = employeeMap[employeeId];
      if (!employee) {
        return;
      }
      setConfigEmployeeId(employee.id);
      setDraftVisibility(employee.visibility);
      setDraftBoundMembers(employee.boundMembers.filter(item => memberNames.includes(item)));
    },
    [employeeMap, memberNames],
  );

  const handleOpenLeadModal = useCallback(
    (mode: AgentStoreLeadModalMode, desiredAgent = "", scenario = ""): void => {
      setLeadModalMode(mode);
      setLeadForm({
        ...createInitialAgentStoreLeadFormState(),
        desiredAgent,
        scenario,
      });
    },
    [],
  );

  const handleCloseLeadModal = useCallback((): void => {
    setLeadModalMode(null);
    setLeadForm(createInitialAgentStoreLeadFormState());
  }, []);

  const handleLeadFieldChange = <TField extends keyof AgentStoreLeadFormState>(
    field: TField,
    value: AgentStoreLeadFormState[TField],
  ): void => {
    setLeadForm(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSaveAccessConfig = useCallback((): void => {
    if (!selectedConfigEmployee) {
      return;
    }
    if (draftVisibility === "bound" && draftBoundMembers.length === 0) {
      message.info("指定成员使用时，至少选择一个成员。");
      return;
    }
    onUpdateEmployeeAccess(
      selectedConfigEmployee.id,
      draftVisibility,
      draftVisibility === "all" ? selectedConfigEmployee.boundMembers : draftBoundMembers,
    );
    setConfigEmployeeId(null);
    message.success("专家配置已更新");
  }, [draftBoundMembers, draftVisibility, onUpdateEmployeeAccess, selectedConfigEmployee]);

  const handleSubmitLead = useCallback((): void => {
    if (
      !leadForm.company.trim() ||
      !leadForm.contactName.trim() ||
      !leadForm.contactPhone.trim() ||
      !leadForm.scenario.trim()
    ) {
      message.warning("请填写公司名称、联系人、联系方式和使用场景后再提交。");
      return;
    }

    if (leadModalMode === "purchase") {
      message.success(
        `已收到 ${leadForm.desiredAgent || "该 AI 专家"} 的采购意向，我们会尽快联系您。`,
      );
    } else {
      message.success("已收到 AI 专家团需求，我们会在 1～2 个工作日内联系您。");
    }

    handleCloseLeadModal();
  }, [handleCloseLeadModal, leadForm, leadModalMode]);

  return (
    <div className={styles.view}>
      <section
        className={classNames(prototypeStyles.expertsMainCard, adminStyles.agentStoreMainCard)}
      >
        <div className={prototypeStyles.expertsToolbar}>
          <div className={prototypeStyles.expertsToolbarLead}>
            <div>
              <div className={prototypeStyles.expertsSectionTitle}>AI 专家团</div>
              <div className={prototypeStyles.cardSubtitle}>
                按场景查看已启用与待采购的 AI 专家组合，管理员可以先看场景，再决定采购和配置方式。
              </div>
            </div>
          </div>
          <div className={styles.agentStoreToolbarMeta}>
            <span className={adminStyles.agentStoreToolbarPill}>全部场景 {totalSceneCount}</span>
            <span className={adminStyles.agentStoreToolbarPill}>已购买专家 {employees.length}</span>
            <span className={adminStyles.agentStoreToolbarPill}>
              待采购专家 {AGENT_STORE_MARKET_ITEMS.length}
            </span>
            <span className={adminStyles.agentStoreToolbarPill}>
              当前筛选 {selectedScenarioLabel} · 已启用 {visibleOwnedExpertCount} / 待采购{" "}
              {visibleMarketExpertCount}
            </span>
          </div>
        </div>

        <div className={adminStyles.agentStoreScenarioBar}>
          {visibleScenarioOptions.map(item => {
            const isActive = item.key === selectedScenarioKey;
            const scenarioCount =
              item.key === "all"
                ? totalSceneCount
                : (scenarioCountMap[item.key as AgentStoreResolvedScenarioKey] ?? 0);

            return (
              <button
                key={item.key}
                type="button"
                className={classNames(adminStyles.agentStoreScenarioButton, {
                  [adminStyles.agentStoreScenarioButtonActive]: isActive,
                })}
                onClick={() => setSelectedScenarioKey(item.key)}
              >
                <span>{item.label}</span>
                <span className={adminStyles.agentStoreScenarioCount}>{scenarioCount}</span>
              </button>
            );
          })}
        </div>

        <div className={adminStyles.agentStoreSceneList}>
          {visibleScenePresentations.map(scene => (
            <section key={scene.key} className={adminStyles.agentStoreSceneSection}>
              <div className={adminStyles.agentStoreSceneHeader}>
                <div className={adminStyles.agentStoreSceneHeaderBody}>
                  <div className={adminStyles.agentStoreSceneEyebrow}>Scene Crew</div>
                  <div className={adminStyles.agentStoreSceneTitle}>{scene.label}专家团</div>
                  <div className={adminStyles.agentStoreSceneDescription}>{scene.description}</div>
                </div>
                <div className={adminStyles.agentStoreSceneStats}>
                  <span className={adminStyles.agentStoreSceneStatPill}>
                    已启用 {scene.ownedExperts.length}
                  </span>
                  <span className={adminStyles.agentStoreSceneStatPill}>
                    待采购 {scene.marketExperts.length}
                  </span>
                </div>
              </div>

              {scene.ownedExperts.length > 0 ? (
                <div className={adminStyles.agentStoreSceneGroup}>
                  <div className={adminStyles.agentStoreSceneGroupHeader}>
                    <span className={adminStyles.agentStoreSceneGroupTitle}>已启用专家</span>
                    <span className={adminStyles.agentStoreSceneGroupMeta}>
                      当前场景已启用 {scene.ownedExperts.length} 位
                    </span>
                  </div>
                  <div
                    className={classNames(
                      prototypeStyles.expertsEmployeeList,
                      adminStyles.agentStoreSceneGrid,
                    )}
                  >
                    {scene.ownedExperts.map(item => (
                      <AgentStoreOwnedExpertCard
                        key={`${item.sceneKey}-${item.employee.id}`}
                        item={item}
                        installedSkills={skillsByEmployeeId[item.employee.id] ?? []}
                        onOpenConfig={handleOpenConfigModal}
                        onOpenSkillModal={setSkillModalEmployeeId}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {scene.marketExperts.length > 0 ? (
                <div className={adminStyles.agentStoreSceneGroup}>
                  <div className={adminStyles.agentStoreSceneGroupHeader}>
                    <span className={adminStyles.agentStoreSceneGroupTitle}>待采购专家</span>
                    <span className={adminStyles.agentStoreSceneGroupMeta}>
                      可按场景采购 {scene.marketExperts.length} 位
                    </span>
                  </div>
                  <div
                    className={classNames(
                      prototypeStyles.expertsEmployeeList,
                      adminStyles.agentStoreSceneGrid,
                    )}
                  >
                    {scene.marketExperts.map(item => (
                      <AgentStoreMarketExpertCard
                        key={`${scene.key}-${item.id}`}
                        item={item}
                        sceneLabel={scene.label}
                        onOpenPurchaseLead={(desiredAgent, sceneLabel) =>
                          handleOpenLeadModal("purchase", desiredAgent, sceneLabel)
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ))}

          <section
            className={classNames(
              adminStyles.agentStoreSceneSection,
              adminStyles.agentStoreRequestSection,
            )}
          >
            <div className={adminStyles.agentStoreSceneHeader}>
              <div className={adminStyles.agentStoreSceneHeaderBody}>
                <div className={adminStyles.agentStoreSceneEyebrow}>Request Crew</div>
                <div className={adminStyles.agentStoreSceneTitle}>没有合适的专家团？</div>
                <div className={adminStyles.agentStoreSceneDescription}>
                  告诉我们你的业务场景、岗位角色和交付目标，我们会评估补充新的 AI
                  专家或新的场景组合。
                </div>
              </div>
              <Button
                type="primary"
                icon={<FormOutlined />}
                onClick={() =>
                  handleOpenLeadModal(
                    "request",
                    "",
                    selectedScenarioKey === "all" ? "" : selectedScenarioLabel,
                  )
                }
              >
                提交场景需求
              </Button>
            </div>

            <div className={adminStyles.agentStoreRequestBody}>
              <div className={adminStyles.agentStoreRequestIcon}>
                <FormOutlined />
              </div>
              <div className={adminStyles.agentStoreRequestTitle}>支持按场景补充专家团</div>
              <div className={adminStyles.agentStoreRequestDescription}>
                当前没有完全匹配的专家团时，可以直接提交业务场景，我们会按场景评估新增采购方案。
              </div>
              <div className={adminStyles.agentStoreRequestHint}>
                支持补充使用场景、目标能力、期望上线时间和联系方式。
              </div>
            </div>
          </section>
        </div>
      </section>

      <Modal
        open={selectedSkillModalEmployee !== null}
        title={
          selectedSkillModalEmployee ? `${selectedSkillModalEmployee.name} 的全部技能` : "全部技能"
        }
        footer={null}
        destroyOnHidden
        onCancel={() => setSkillModalEmployeeId(null)}
      >
        <div className={styles.agentStoreSkillModalList}>
          {(selectedSkillModalEmployee
            ? (skillsByEmployeeId[selectedSkillModalEmployee.id] ?? [])
            : []
          ).map(skill => (
            <div key={skill.id} className={styles.agentStoreSkillModalItem}>
              <span className={styles.agentStoreSkillModalIcon}>
                {renderSkillCategoryIcon(skill.category)}
              </span>
              <div className={styles.agentStoreSkillModalBody}>
                <div className={styles.agentStoreSkillModalHeader}>
                  <span className={styles.agentStoreSkillName}>{skill.name}</span>
                  <Tag bordered={false} className={styles.lightTag}>
                    {skill.category}
                  </Tag>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={selectedConfigEmployee !== null}
        title={selectedConfigEmployee ? `${selectedConfigEmployee.name} 配置` : "专家配置"}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        onCancel={() => setConfigEmployeeId(null)}
        onOk={handleSaveAccessConfig}
      >
        <div className={styles.agentStoreConfigForm}>
          <div className={styles.agentStoreConfigField}>
            <div className={styles.agentStoreConfigLabel}>可见范围</div>
            <Select
              value={draftVisibility}
              options={[
                { label: "全员可见", value: "all" },
                { label: "指定成员使用", value: "bound" },
              ]}
              onChange={value => setDraftVisibility(value)}
            />
          </div>

          {draftVisibility === "bound" ? (
            <div className={styles.agentStoreConfigField}>
              <div className={styles.agentStoreConfigLabel}>指定成员</div>
              <Select
                mode="multiple"
                placeholder="选择可使用该专家的成员"
                value={draftBoundMembers}
                options={memberOptions}
                maxTagCount="responsive"
                onChange={value => setDraftBoundMembers(value)}
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={leadModalMode !== null}
        title={leadModalMode === "purchase" ? "联系商务购买" : "提交专家团需求"}
        okText={leadModalMode === "purchase" ? "提交购买意向" : "提交需求"}
        cancelText="取消"
        destroyOnHidden
        onCancel={handleCloseLeadModal}
        onOk={handleSubmitLead}
      >
        <div className={styles.agentStoreConfigForm}>
          <div className={adminStyles.agentStoreLeadHint}>
            {leadModalMode === "purchase"
              ? `当前关注的 AI 专家：${leadForm.desiredAgent || "未指定"}`
              : "如果当前 AI 专家团里没有合适的组合，可在这里提交定制需求。"}
          </div>

          <div className={adminStyles.agentStoreDemandGrid}>
            <div className={styles.agentStoreConfigField}>
              <div className={styles.agentStoreConfigLabel}>公司名称</div>
              <Input
                value={leadForm.company}
                placeholder="请输入公司名称"
                onChange={event => handleLeadFieldChange("company", event.target.value)}
              />
            </div>

            <div className={styles.agentStoreConfigField}>
              <div className={styles.agentStoreConfigLabel}>联系人</div>
              <Input
                value={leadForm.contactName}
                placeholder="请输入联系人姓名"
                onChange={event => handleLeadFieldChange("contactName", event.target.value)}
              />
            </div>

            <div className={styles.agentStoreConfigField}>
              <div className={styles.agentStoreConfigLabel}>联系方式</div>
              <Input
                value={leadForm.contactPhone}
                placeholder="请输入手机号或企业微信"
                onChange={event => handleLeadFieldChange("contactPhone", event.target.value)}
              />
            </div>

            <div className={styles.agentStoreConfigField}>
              <div className={styles.agentStoreConfigLabel}>岗位角色</div>
              <Input
                value={leadForm.role}
                placeholder="如：老板 / HR / 客服主管"
                onChange={event => handleLeadFieldChange("role", event.target.value)}
              />
            </div>

            <div
              className={classNames(
                styles.agentStoreConfigField,
                adminStyles.agentStoreDemandGridFull,
              )}
            >
              <div className={styles.agentStoreConfigLabel}>
                {leadModalMode === "purchase" ? "感兴趣的 AI 专家" : "期望专家方向"}
              </div>
              <Input
                value={leadForm.desiredAgent}
                placeholder="请输入专家名称或能力方向"
                onChange={event => handleLeadFieldChange("desiredAgent", event.target.value)}
              />
            </div>

            <div
              className={classNames(
                styles.agentStoreConfigField,
                adminStyles.agentStoreDemandGridFull,
              )}
            >
              <div className={styles.agentStoreConfigLabel}>使用场景</div>
              <Input.TextArea
                rows={4}
                value={leadForm.scenario}
                placeholder="请描述团队场景、数据来源、希望这组专家负责的工作内容"
                onChange={event => handleLeadFieldChange("scenario", event.target.value)}
              />
            </div>

            <div
              className={classNames(styles.agentStoreConfigField, styles.agentStoreDemandGridFull)}
            >
              <div className={styles.agentStoreConfigLabel}>补充说明</div>
              <Input.TextArea
                rows={3}
                value={leadForm.note}
                placeholder="可补充期望上线时间、接入系统或预算范围"
                onChange={event => handleLeadFieldChange("note", event.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
