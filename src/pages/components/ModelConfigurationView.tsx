import { useCallback, useDeferredValue, useMemo, useState } from "react";

import classNames from "classnames";
import { ReloadOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { Avatar, Button, Empty, Input, Modal, Select, message } from "antd";

import type { EmployeeItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./FrontisWebViews.module.less";
import {
  formatCurrentDateTime,
  getProviderStatusLabel,
  getProviderStatusTone,
  INITIAL_PROVIDER_CONFIGS,
  isProviderConfigured,
  isProviderConnectionAvailable,
  maskApiKey,
  PROVIDER_MODEL_CATALOG,
  PROVIDER_OPTIONS,
  sleep,
} from "./FrontisWebViews";
import type { ModelProviderConfigState } from "./FrontisWebViews";

interface ModelConfigurationViewProps {
  employees: EmployeeItem[];
}

interface EmployeeModelOverrideState {
  providerKey: string;
  model: string;
}

const resolveProviderKeyByModel = (model: string): string =>
  PROVIDER_OPTIONS.find(item => (PROVIDER_MODEL_CATALOG[item.key] ?? []).includes(model))?.key ??
  "openai";

const getProviderModelOptions = (
  providerKey: string,
  providerConfigs: Record<string, ModelProviderConfigState>,
): string[] =>
  providerConfigs[providerKey]?.fetchedModels.length
    ? providerConfigs[providerKey].fetchedModels
    : (PROVIDER_MODEL_CATALOG[providerKey] ?? []);

const createInitialEmployeeModelOverrides = (
  employees: EmployeeItem[],
): Record<string, EmployeeModelOverrideState> =>
  employees.reduce<Record<string, EmployeeModelOverrideState>>((result, employee) => {
    const providerKey = resolveProviderKeyByModel(employee.model);

    result[employee.id] = {
      model: employee.model,
      providerKey,
    };

    return result;
  }, {});

/**
 * 模型配置视图。
 */
export const ModelConfigurationView = ({ employees }: ModelConfigurationViewProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [providerConfigs, setProviderConfigs] =
    useState<Record<string, ModelProviderConfigState>>(INITIAL_PROVIDER_CONFIGS);
  const [expandedProviderKeys, setExpandedProviderKeys] = useState<Record<string, boolean>>({
    openai: true,
  });
  const [editingProviderKey, setEditingProviderKey] = useState<string>("");
  const [providerDraft, setProviderDraft] = useState<ModelProviderConfigState | null>(null);
  const [isTestingProvider, setIsTestingProvider] = useState<boolean>(false);
  const [isFetchingProviderModels, setIsFetchingProviderModels] = useState<boolean>(false);
  const [employeeModelOverrides, setEmployeeModelOverrides] = useState<
    Record<string, EmployeeModelOverrideState>
  >(() => createInitialEmployeeModelOverrides(employees));
  const deferredKeyword = useDeferredValue(keyword);

  const selectedProvider = useMemo(
    () => PROVIDER_OPTIONS.find(item => item.key === editingProviderKey) ?? null,
    [editingProviderKey],
  );

  const configuredProviderCount = useMemo(
    () => PROVIDER_OPTIONS.filter(item => isProviderConfigured(providerConfigs[item.key])).length,
    [providerConfigs],
  );
  const verifiedProviderCount = useMemo(
    () =>
      PROVIDER_OPTIONS.filter(item => providerConfigs[item.key]?.connectivityStatus === "success")
        .length,
    [providerConfigs],
  );
  const fetchedModelCount = useMemo(
    () =>
      PROVIDER_OPTIONS.reduce(
        (total, item) => total + (providerConfigs[item.key]?.fetchedModels.length ?? 0),
        0,
      ),
    [providerConfigs],
  );
  const customizedExpertCount = useMemo(
    () =>
      employees.filter(item => {
        const currentOverride = employeeModelOverrides[item.id];

        if (!currentOverride) {
          return false;
        }

        return currentOverride.model !== item.model;
      }).length,
    [employeeModelOverrides, employees],
  );

  const filteredProviders = useMemo(() => {
    const normalizedKeyword = deferredKeyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return PROVIDER_OPTIONS;
    }
    return PROVIDER_OPTIONS.filter(item => {
      const config = providerConfigs[item.key];
      const searchText = [
        item.label,
        item.description,
        item.capabilities.join(" "),
        config?.baseUrl ?? "",
        ...(config?.fetchedModels ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedKeyword);
    });
  }, [deferredKeyword, providerConfigs]);

  const handleOpenProviderModal = useCallback(
    (providerKey: string): void => {
      const currentConfig = providerConfigs[providerKey] ?? {
        apiKey: "",
        baseUrl: "",
        connectivityStatus: "idle",
        fetchedModels: [],
        lastCheckedAt: "",
      };
      setEditingProviderKey(providerKey);
      setProviderDraft({
        ...currentConfig,
        fetchedModels: [...currentConfig.fetchedModels],
      });
    },
    [providerConfigs],
  );

  const handleCloseProviderModal = useCallback((): void => {
    if (isTestingProvider || isFetchingProviderModels) {
      return;
    }
    setEditingProviderKey("");
    setProviderDraft(null);
  }, [isFetchingProviderModels, isTestingProvider]);

  const handleProviderDraftFieldChange = useCallback(
    (field: "apiKey" | "baseUrl", value: string): void => {
      setProviderDraft(current => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          [field]: value,
          connectivityStatus: "idle",
          fetchedModels: [],
          lastCheckedAt: "",
        };
      });
    },
    [],
  );

  const handleTestProviderConnection = useCallback(async (): Promise<void> => {
    if (!providerDraft || !selectedProvider) {
      return;
    }
    if (!providerDraft.apiKey.trim()) {
      message.warning("请先填写 API Key。");
      return;
    }
    setIsTestingProvider(true);
    try {
      await sleep(600);
      const checkedAt = formatCurrentDateTime();
      const isConnected = isProviderConnectionAvailable(providerDraft);
      setProviderDraft(current =>
        current
          ? {
              ...current,
              connectivityStatus: isConnected ? "success" : "failed",
              fetchedModels: isConnected ? current.fetchedModels : [],
              lastCheckedAt: checkedAt,
            }
          : current,
      );
      if (isConnected) {
        message.success(`${selectedProvider.label} 连通性测试通过`);
        return;
      }
      message.error(`${selectedProvider.label} 连通性测试失败，请检查 API Key 或 Base URL。`);
    } finally {
      setIsTestingProvider(false);
    }
  }, [providerDraft, selectedProvider]);

  const handleFetchProviderModels = useCallback(async (): Promise<void> => {
    if (!providerDraft || !selectedProvider) {
      return;
    }
    if (!providerDraft.apiKey.trim()) {
      message.warning("请先填写 API Key。");
      return;
    }
    setIsFetchingProviderModels(true);
    try {
      await sleep(800);
      const checkedAt = formatCurrentDateTime();
      if (!isProviderConnectionAvailable(providerDraft)) {
        setProviderDraft(current =>
          current
            ? {
                ...current,
                connectivityStatus: "failed",
                fetchedModels: [],
                lastCheckedAt: checkedAt,
              }
            : current,
        );
        message.error("拉取模型列表失败，请先确认配置连通。");
        return;
      }
      const fetchedModels = PROVIDER_MODEL_CATALOG[selectedProvider.key] ?? [];
      setProviderDraft(current =>
        current
          ? {
              ...current,
              connectivityStatus: "success",
              fetchedModels,
              lastCheckedAt: checkedAt,
            }
          : current,
      );
      message.success(`已拉取 ${fetchedModels.length} 个模型`);
    } finally {
      setIsFetchingProviderModels(false);
    }
  }, [providerDraft, selectedProvider]);

  const handleSaveProviderConfig = useCallback((): void => {
    if (!providerDraft || !selectedProvider || !editingProviderKey) {
      return;
    }
    if (!providerDraft.apiKey.trim()) {
      message.warning("请填写 API Key 后再保存。");
      return;
    }
    const nextConfig: ModelProviderConfigState = {
      ...providerDraft,
      apiKey: providerDraft.apiKey.trim(),
      baseUrl: providerDraft.baseUrl.trim(),
      fetchedModels: [...providerDraft.fetchedModels],
    };
    setProviderConfigs(current => ({
      ...current,
      [editingProviderKey]: nextConfig,
    }));
    if (nextConfig.fetchedModels.length) {
      setExpandedProviderKeys(current => ({
        ...current,
        [editingProviderKey]: true,
      }));
    }
    setEditingProviderKey("");
    setProviderDraft(null);
    message.success(`${selectedProvider.label} 配置已保存`);
  }, [editingProviderKey, providerDraft, selectedProvider]);

  const handleToggleProviderModels = useCallback((providerKey: string): void => {
    setExpandedProviderKeys(current => ({
      ...current,
      [providerKey]: !current[providerKey],
    }));
  }, []);

  const handleSelectEmployeeProvider = useCallback(
    (employeeId: string, providerKey: string): void => {
      const providerModels = getProviderModelOptions(providerKey, providerConfigs);

      setEmployeeModelOverrides(current => ({
        ...current,
        [employeeId]: {
          model: providerModels[0] ?? "",
          providerKey,
        },
      }));
    },
    [providerConfigs],
  );

  const handleSelectEmployeeModel = useCallback((employeeId: string, model: string): void => {
    setEmployeeModelOverrides(current => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] ?? {
          model,
          providerKey: resolveProviderKeyByModel(model),
        }),
        model,
      },
    }));
    message.success("专家默认模型已更新");
  }, []);

  const handleResetEmployeeModel = useCallback((employee: EmployeeItem): void => {
    const providerKey = resolveProviderKeyByModel(employee.model);

    setEmployeeModelOverrides(current => ({
      ...current,
      [employee.id]: {
        model: employee.model,
        providerKey,
      },
    }));
    message.success(`${employee.name} 已恢复到默认模型`);
  }, []);

  return (
    <div className={styles.view}>
      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>模型配置</span>
          <h2 className={styles.heroTitle}>统一接入模型供应商，并给不同专家配置不同的大模型</h2>
          <p className={styles.heroDescription}>
            老板端同时管理两层能力：一层是供应商接入与连通性，另一层是不同 AI
            专家的默认模型路由，方便按岗位做最优配置。
          </p>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>已配置供应商</span>
            <strong className={styles.summaryValue}>{configuredProviderCount}</strong>
            <span className={styles.summaryHint}>未配置的供应商会保持未授权状态</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>连通成功</span>
            <strong className={styles.summaryValue}>{verifiedProviderCount}</strong>
            <span className={styles.summaryHint}>建议保存前先完成连通性测试</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>专家定制策略</span>
            <strong className={styles.summaryValue}>{customizedExpertCount}</strong>
            <span className={styles.summaryHint}>
              已拉取 {fetchedModelCount} 个模型，已有 {customizedExpertCount} 个专家使用专属配置
            </span>
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>模型供应商</div>
            <div className={styles.sectionDescription}>
              支持搜索供应商、查看授权状态，并在配置弹窗里测试连通性和拉取模型列表。
            </div>
          </div>
          <Input
            allowClear
            className={classNames(styles.searchInput, adminStyles.providerSearchInput)}
            placeholder="搜索供应商或模型"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
          />
        </div>
        <div className={adminStyles.providerList}>
          {filteredProviders.length ? (
            filteredProviders.map(item => {
              const config = providerConfigs[item.key];
              const statusTone = getProviderStatusTone(config);
              const hasModels = Boolean(config.fetchedModels.length);
              const isExpanded = Boolean(expandedProviderKeys[item.key]) && hasModels;

              return (
                <article key={item.key} className={styles.providerCard}>
                  <div className={adminStyles.providerLayout}>
                    <div className={adminStyles.providerMain}>
                      <div className={adminStyles.providerIdentity}>
                        <Avatar shape="square" className={adminStyles.providerLogo}>
                          {item.logoText}
                        </Avatar>
                        <div className={adminStyles.providerBody}>
                          <div className={adminStyles.providerTitleRow}>
                            <div
                              className={classNames(
                                styles.providerTitle,
                                adminStyles.providerTitle,
                              )}
                            >
                              {item.label}
                            </div>
                            <div className={styles.providerKey}>
                              {config.baseUrl ? "已自定义 Base URL" : "使用默认 Base URL"}
                            </div>
                          </div>
                          <div className={styles.providerDescription}>{item.description}</div>
                          <div className={adminStyles.providerCapabilityRow}>
                            {item.capabilities.map(capability => (
                              <span key={capability} className={adminStyles.providerCapability}>
                                {capability}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className={adminStyles.providerFooter}>
                        <button
                          type="button"
                          className={adminStyles.providerModelsToggle}
                          disabled={!hasModels}
                          onClick={() => handleToggleProviderModels(item.key)}
                        >
                          {hasModels ? (isExpanded ? "隐藏模型" : "显示模型") : "暂未拉取模型"}
                        </button>
                        <span className={adminStyles.providerFooterMeta}>
                          {hasModels
                            ? `已拉取 ${config.fetchedModels.length} 个模型`
                            : "在配置弹窗中可直接拉取模型列表"}
                        </span>
                      </div>

                      {isExpanded ? (
                        <div className={adminStyles.providerModelList}>
                          {config.fetchedModels.map(model => (
                            <span key={model} className={styles.pill}>
                              {model}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className={adminStyles.providerStatusPanel}>
                      <div className={adminStyles.providerStatusHeader}>
                        <span className={adminStyles.providerStatusValue}>
                          {maskApiKey(config.apiKey)}
                        </span>
                        <span
                          className={classNames(adminStyles.providerStatusDot, {
                            [adminStyles.providerStatusDanger]: statusTone === "danger",
                            [adminStyles.providerStatusSuccess]: statusTone === "success",
                            [adminStyles.providerStatusWarning]: statusTone === "warning",
                          })}
                        />
                      </div>
                      <div className={adminStyles.providerStatusText}>
                        {getProviderStatusLabel(config)}
                      </div>
                      <Button
                        icon={<SettingOutlined />}
                        onClick={() => handleOpenProviderModal(item.key)}
                      >
                        配置
                      </Button>
                      <div className={adminStyles.providerPanelHint}>
                        {config.lastCheckedAt
                          ? `最近测试：${config.lastCheckedAt}`
                          : "尚未完成连通性测试"}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <Empty description="未找到匹配的模型供应商" />
          )}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>专家模型分配</div>
            <div className={styles.sectionDescription}>
              可为不同 AI 专家指定不同模型，老板在这里直接控制各岗位的推理成本与能力上限。
            </div>
          </div>
        </div>

        <div className={adminStyles.overrideGrid}>
          {employees.map(employee => {
            const currentOverride = employeeModelOverrides[employee.id] ?? {
              model: employee.model,
              providerKey: resolveProviderKeyByModel(employee.model),
            };
            const providerModelOptions = getProviderModelOptions(
              currentOverride.providerKey,
              providerConfigs,
            ).map(item => ({
              label: item,
              value: item,
            }));

            return (
              <article key={employee.id} className={styles.overrideCard}>
                <div className={styles.overrideHeader}>
                  <div>
                    <div className={styles.overrideTitle}>{employee.name}</div>
                    <div className={styles.overrideMeta}>
                      {employee.role} · 当前默认 {employee.model}
                    </div>
                  </div>
                  <span className={styles.primaryTag}>
                    {employee.connectionMode === "cloud" ? "云端专家" : "本地专家"}
                  </span>
                </div>

                <div className={adminStyles.overrideCardBody}>
                  <div className={adminStyles.overrideFieldGroup}>
                    <div className={adminStyles.overrideField}>
                      <span className={adminStyles.overrideFieldLabel}>模型供应商</span>
                      <Select
                        className={adminStyles.fieldSelect}
                        options={PROVIDER_OPTIONS.map(item => ({
                          label: item.label,
                          value: item.key,
                        }))}
                        value={currentOverride.providerKey}
                        onChange={value => handleSelectEmployeeProvider(employee.id, value)}
                      />
                    </div>

                    <div className={adminStyles.overrideField}>
                      <span className={adminStyles.overrideFieldLabel}>默认模型</span>
                      <Select
                        className={adminStyles.fieldSelect}
                        options={providerModelOptions}
                        value={currentOverride.model}
                        onChange={value => handleSelectEmployeeModel(employee.id, value)}
                      />
                    </div>
                  </div>

                  <div className={adminStyles.overrideHint}>
                    当前工作模式：
                    {employee.connectionMode === "cloud" ? "云端工作站" : "本地 / 边缘工作站"}
                    ，推荐按岗位能力与成本目标选择不同模型。
                  </div>
                </div>

                <div className={adminStyles.overrideFooter}>
                  <span className={adminStyles.overrideFooterMeta}>
                    子专家模型 {employee.subAgentModel ?? "未单独配置"}
                  </span>
                  <Button onClick={() => handleResetEmployeeModel(employee)}>恢复默认</Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Modal
        cancelText="取消"
        okButtonProps={{ disabled: !providerDraft?.apiKey.trim() }}
        okText="保存配置"
        open={Boolean(selectedProvider && providerDraft)}
        title={selectedProvider ? `${selectedProvider.label} 配置` : "模型供应商配置"}
        onCancel={handleCloseProviderModal}
        onOk={handleSaveProviderConfig}
      >
        {selectedProvider && providerDraft ? (
          <div className={adminStyles.providerModalContent}>
            <div className={adminStyles.providerModalDescription}>
              {selectedProvider.description}
            </div>

            <div className={adminStyles.providerModalForm}>
              <div className={adminStyles.providerField}>
                <span className={adminStyles.providerFieldLabel}>API Key</span>
                <Input.Password
                  autoComplete="off"
                  placeholder={`请输入 ${selectedProvider.label} API Key`}
                  value={providerDraft.apiKey}
                  onChange={event => handleProviderDraftFieldChange("apiKey", event.target.value)}
                />
              </div>

              <div className={adminStyles.providerField}>
                <span className={adminStyles.providerFieldLabel}>Base URL（选填）</span>
                <Input
                  autoComplete="off"
                  placeholder={selectedProvider.defaultBaseUrl}
                  value={providerDraft.baseUrl}
                  onChange={event => handleProviderDraftFieldChange("baseUrl", event.target.value)}
                />
                <span className={adminStyles.providerFieldHint}>
                  留空时默认使用 {selectedProvider.defaultBaseUrl}
                </span>
              </div>
            </div>

            <div className={adminStyles.providerModalActions}>
              <Button
                loading={isTestingProvider}
                onClick={() => void handleTestProviderConnection()}
              >
                测试连通性
              </Button>
              <Button
                icon={<ReloadOutlined />}
                loading={isFetchingProviderModels}
                onClick={() => void handleFetchProviderModels()}
              >
                拉取模型列表
              </Button>
            </div>

            <div
              className={classNames(adminStyles.providerStatusBanner, {
                [adminStyles.providerStatusBannerDanger]:
                  getProviderStatusTone(providerDraft) === "danger",
                [adminStyles.providerStatusBannerSuccess]:
                  getProviderStatusTone(providerDraft) === "success",
                [adminStyles.providerStatusBannerWarning]:
                  getProviderStatusTone(providerDraft) === "warning",
              })}
            >
              <div className={adminStyles.providerStatusBannerTitle}>
                {getProviderStatusLabel(providerDraft)}
              </div>
              <div className={adminStyles.providerStatusBannerText}>
                {providerDraft.lastCheckedAt
                  ? `最近一次检测时间：${providerDraft.lastCheckedAt}`
                  : "尚未进行连通性测试。"}
              </div>
            </div>

            <div className={adminStyles.providerModelsPanel}>
              <div className={adminStyles.providerModelsPanelHeader}>
                <div className={adminStyles.detailBlockTitle}>模型列表</div>
                <div className={styles.inlineMuted}>
                  {providerDraft.fetchedModels.length
                    ? `共 ${providerDraft.fetchedModels.length} 个`
                    : "点击上方按钮拉取"}
                </div>
              </div>
              {providerDraft.fetchedModels.length ? (
                <div className={adminStyles.providerModalModelList}>
                  {providerDraft.fetchedModels.map(model => (
                    <span key={model} className={styles.pill}>
                      {model}
                    </span>
                  ))}
                </div>
              ) : (
                <div className={adminStyles.providerModelsEmpty}>暂无模型列表</div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
