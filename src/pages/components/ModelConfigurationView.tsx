import { useCallback, useDeferredValue, useMemo, useState } from "react";

import classNames from "classnames";
import { PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { Avatar, Button, Empty, Input, Modal, message } from "antd";

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

/**
 * 模型配置视图。
 */
export const ModelConfigurationView = (): JSX.Element => {
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
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState<boolean>(false);
  const [newProviderName, setNewProviderName] = useState<string>("");
  const [newProviderDescription, setNewProviderDescription] = useState<string>("");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState<string>("");
  const [newProviderApiKey, setNewProviderApiKey] = useState<string>("");
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

  const handleAddProvider = useCallback((): void => {
    if (!newProviderName.trim()) {
      message.warning("请填写供应商名称");
      return;
    }
    if (!newProviderApiKey.trim()) {
      message.warning("请填写 API Key");
      return;
    }
    message.success(`${newProviderName} 已添加`);
    setIsAddProviderModalOpen(false);
    setNewProviderName("");
    setNewProviderDescription("");
    setNewProviderBaseUrl("");
    setNewProviderApiKey("");
  }, [newProviderName, newProviderApiKey]);

  return (
    <div className={styles.view}>
      <div className={adminStyles.devicePageHeader}>
        <h1 className={adminStyles.devicePageTitle}>模型配置</h1>
        <p className={adminStyles.devicePageSubtitle}>
          统一接入模型供应商，并给不同专家配置不同的大模型
        </p>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>模型供应商</div>
            <div className={styles.sectionDescription}>
              支持搜索供应商、查看授权状态，并在配置弹窗里测试连通性和拉取模型列表。
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddProviderModalOpen(true)}
            >
              添加大模型
            </Button>
            <Input
              allowClear
              className={classNames(styles.searchInput, adminStyles.providerSearchInput)}
              placeholder="搜索供应商或模型"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
          </div>
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

      <Modal
        title="添加大模型供应商"
        open={isAddProviderModalOpen}
        onCancel={() => setIsAddProviderModalOpen(false)}
        onOk={handleAddProvider}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: !newProviderName.trim() || !newProviderApiKey.trim() }}
      >
        <div className={adminStyles.providerModalContent}>
          <div className={adminStyles.providerModalForm}>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>供应商名称</span>
              <Input
                placeholder="如：OpenAI、Anthropic、DeepSeek"
                value={newProviderName}
                onChange={e => setNewProviderName(e.target.value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>描述（选填）</span>
              <Input
                placeholder="请输入供应商描述"
                value={newProviderDescription}
                onChange={e => setNewProviderDescription(e.target.value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>API Key</span>
              <Input.Password
                autoComplete="off"
                placeholder="请输入 API Key"
                value={newProviderApiKey}
                onChange={e => setNewProviderApiKey(e.target.value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>Base URL（选填）</span>
              <Input
                placeholder="留空使用默认地址"
                value={newProviderBaseUrl}
                onChange={e => setNewProviderBaseUrl(e.target.value)}
              />
              <span className={adminStyles.providerFieldHint}>
                留空时将使用供应商默认 API 地址
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
