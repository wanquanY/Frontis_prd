import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Select, Switch, message } from "antd";

import type { EmployeeItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import {
  formatCurrentDateTime,
  INITIAL_PROVIDER_CONFIGS,
  isProviderConnectionAvailable,
  maskApiKey,
  PROVIDER_OPTIONS,
  sleep,
} from "./FrontisWebViews";
import type { ModelProviderConfigState } from "./FrontisWebViews";

interface ModelConfigurationViewProps {
  employees: EmployeeItem[];
  onApplyGlobalModel: (model: string) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
}

interface ProviderModelItem {
  id: string;
  inputModalities: ModelInputModality[];
  interfaceFormat: ModelInterfaceFormat;
  name: string;
  reasoningEnabled: boolean;
}

type ModelInterfaceFormat = "anthropic" | "gemini" | "openai";
type ModelInputModality = "audio" | "image" | "text" | "video";
type ModelModalMode = "add" | "edit";
type ProviderOptionItem = (typeof PROVIDER_OPTIONS)[number];
type ProviderModalMode = "add" | "edit";
type ProviderListStatusTone = "success" | "danger";

const DEFAULT_CUSTOM_PROVIDER_DESCRIPTION = "自定义模型供应商";
const DEFAULT_MODEL_INPUT_MODALITIES: ModelInputModality[] = ["text", "image"];

const MODEL_INTERFACE_FORMAT_OPTIONS: Array<{ label: string; value: ModelInterfaceFormat }> = [
  { label: "OpenAI 格式", value: "openai" },
  { label: "Anthropic 格式", value: "anthropic" },
  { label: "Gemini 格式", value: "gemini" },
];

const MODEL_INPUT_MODALITY_OPTIONS: Array<{ label: string; value: ModelInputModality }> = [
  { label: "Audio", value: "audio" },
  { label: "Text", value: "text" },
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
];

const getProviderStatusClassName = (tone: ProviderListStatusTone): string => {
  if (tone === "success") {
    return `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`;
  }

  return `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagDanger}`;
};

const getProviderListStatusLabel = (config: ModelProviderConfigState): string =>
  config.connectivityStatus === "success" ? "已连通" : "连接异常";

const getProviderListStatusTone = (config: ModelProviderConfigState): ProviderListStatusTone =>
  config.connectivityStatus === "success" ? "success" : "danger";

const getModelInterfaceFormatLabel = (value: ModelInterfaceFormat): string =>
  value === "anthropic" ? "Anthropic 格式" : value === "gemini" ? "Gemini 格式" : "OpenAI 格式";

const getModelInputModalityLabel = (value: ModelInputModality): string =>
  value === "audio" ? "Audio" : value === "image" ? "Image" : value === "video" ? "Video" : "Text";

const getDefaultModelInterfaceFormat = (providerKey: string): ModelInterfaceFormat =>
  providerKey.includes("anthropic") ? "anthropic" : providerKey.includes("gemini") ? "gemini" : "openai";

const createEmptyProviderConfig = (baseUrl = ""): ModelProviderConfigState => ({
  apiKey: "",
  baseUrl,
  connectivityStatus: "idle",
  fetchedModels: [],
  lastCheckedAt: "",
});

const buildInitialProviderModels = (): Record<string, ProviderModelItem[]> => {
  const initialModels: Record<string, ProviderModelItem[]> = {};

  PROVIDER_OPTIONS.forEach(provider => {
    const fetchedModels = INITIAL_PROVIDER_CONFIGS[provider.key]?.fetchedModels ?? [];
    initialModels[provider.key] = fetchedModels.map(modelId => ({
      id: modelId,
      inputModalities: [...DEFAULT_MODEL_INPUT_MODALITIES],
      interfaceFormat: getDefaultModelInterfaceFormat(provider.key),
      name: modelId,
      reasoningEnabled: true,
    }));
  });

  return initialModels;
};

const buildProviderKey = (providerName: string, existingKeys: string[]): string => {
  const normalizedKey = providerName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const baseKey = normalizedKey || `provider-${Date.now()}`;
  let nextKey = baseKey;
  let suffix = 1;

  while (existingKeys.includes(nextKey)) {
    nextKey = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  return nextKey;
};

/**
 * 模型管理视图。
 */
export const ModelConfigurationView = (props: ModelConfigurationViewProps): JSX.Element => {
  void props;

  const [keyword, setKeyword] = useState<string>("");
  const [providerOptions, setProviderOptions] = useState<ProviderOptionItem[]>(PROVIDER_OPTIONS);
  const [providerConfigs, setProviderConfigs] =
    useState<Record<string, ModelProviderConfigState>>(INITIAL_PROVIDER_CONFIGS);
  const [providerModels, setProviderModels] =
    useState<Record<string, ProviderModelItem[]>>(buildInitialProviderModels);
  const [providerModalMode, setProviderModalMode] = useState<ProviderModalMode>("add");
  const [editingProviderKey, setEditingProviderKey] = useState<string>("");
  const [providerDraftName, setProviderDraftName] = useState<string>("");
  const [providerDraft, setProviderDraft] = useState<ModelProviderConfigState | null>(null);
  const [isTestingProvider, setIsTestingProvider] = useState<boolean>(false);
  const [managedProviderKey, setManagedProviderKey] = useState<string>("");
  const [isModelFormVisible, setIsModelFormVisible] = useState<boolean>(false);
  const [modelModalMode, setModelModalMode] = useState<ModelModalMode>("add");
  const [modelDraftProviderKey, setModelDraftProviderKey] = useState<string>("");
  const [editingModelOriginalId, setEditingModelOriginalId] = useState<string>("");
  const [modelDraftName, setModelDraftName] = useState<string>("");
  const [modelDraftId, setModelDraftId] = useState<string>("");
  const [modelDraftInterfaceFormat, setModelDraftInterfaceFormat] =
    useState<ModelInterfaceFormat>("openai");
  const [modelDraftInputModalities, setModelDraftInputModalities] =
    useState<ModelInputModality[]>([...DEFAULT_MODEL_INPUT_MODALITIES]);
  const [modelDraftReasoningEnabled, setModelDraftReasoningEnabled] = useState<boolean>(true);
  const deferredKeyword = useDeferredValue(keyword);

  const filteredProviders = useMemo(() => {
    const normalizedKeyword = deferredKeyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return providerOptions;
    }

    return providerOptions.filter(provider => {
      const config = providerConfigs[provider.key];
      const models = providerModels[provider.key] ?? [];
      const searchText = [
        provider.label,
        provider.description,
        config?.baseUrl ?? provider.defaultBaseUrl,
        ...models.map(
          model =>
            `${model.name} ${model.id} ${getModelInterfaceFormatLabel(model.interfaceFormat)} ${model.inputModalities.join(" ")}`,
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedKeyword);
    });
  }, [deferredKeyword, providerConfigs, providerModels, providerOptions]);

  const managedProvider = useMemo(
    () => providerOptions.find(provider => provider.key === managedProviderKey) ?? null,
    [managedProviderKey, providerOptions],
  );

  const managedProviderModels = useMemo(() => {
    if (!managedProvider) {
      return [];
    }

    return providerModels[managedProvider.key] ?? [];
  }, [managedProvider, providerModels]);

  const editingProvider = useMemo(
    () => providerOptions.find(provider => provider.key === editingProviderKey) ?? null,
    [editingProviderKey, providerOptions],
  );
  const modelDraftProvider = useMemo(
    () => providerOptions.find(provider => provider.key === modelDraftProviderKey) ?? null,
    [modelDraftProviderKey, providerOptions],
  );

  const resetProviderModal = useCallback((): void => {
    setEditingProviderKey("");
    setProviderDraftName("");
    setProviderDraft(null);
  }, []);

  const resetModelForm = useCallback((): void => {
    setIsModelFormVisible(false);
    setModelModalMode("add");
    setModelDraftProviderKey("");
    setEditingModelOriginalId("");
    setModelDraftName("");
    setModelDraftId("");
    setModelDraftInterfaceFormat("openai");
    setModelDraftInputModalities([...DEFAULT_MODEL_INPUT_MODALITIES]);
    setModelDraftReasoningEnabled(true);
  }, []);

  const handleOpenAddProvider = useCallback((): void => {
    setProviderModalMode("add");
    setEditingProviderKey("");
    setProviderDraftName("");
    setProviderDraft(createEmptyProviderConfig(""));
  }, []);

  const handleOpenEditProvider = useCallback(
    (providerKey: string): void => {
      const currentProvider = providerOptions.find(provider => provider.key === providerKey);
      const currentConfig =
        providerConfigs[providerKey] ??
        createEmptyProviderConfig(currentProvider?.defaultBaseUrl ?? "");

      if (!currentProvider) {
        return;
      }

      setProviderModalMode("edit");
      setEditingProviderKey(providerKey);
      setProviderDraftName(currentProvider.label);
      setProviderDraft({
        ...currentConfig,
        fetchedModels: [...currentConfig.fetchedModels],
      });
    },
    [providerConfigs, providerOptions],
  );

  const handleCloseProviderModal = useCallback((): void => {
    if (isTestingProvider) {
      return;
    }

    resetProviderModal();
  }, [isTestingProvider, resetProviderModal]);

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
          lastCheckedAt: "",
        };
      });
    },
    [],
  );

  const handleTestProviderConnection = useCallback(async (): Promise<void> => {
    if (!providerDraft) {
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
      const providerName = providerDraftName.trim() || "供应商";

      setProviderDraft(current =>
        current
          ? {
              ...current,
              connectivityStatus: isConnected ? "success" : "failed",
              lastCheckedAt: checkedAt,
            }
          : current,
      );

      if (isConnected) {
        message.success(`${providerName} 连通性测试通过`);
        return;
      }

      message.error(`${providerName} 连通性测试失败，请检查 API Key 或 Base URL。`);
    } finally {
      setIsTestingProvider(false);
    }
  }, [providerDraft, providerDraftName]);

  const handleSaveProvider = useCallback((): void => {
    if (!providerDraft) {
      return;
    }
    if (!providerDraftName.trim()) {
      message.warning("请填写供应商名称");
      return;
    }
    if (!providerDraft.apiKey.trim()) {
      message.warning("请填写 API Key");
      return;
    }

    const trimmedProviderName = providerDraftName.trim();
    const trimmedBaseUrl = providerDraft.baseUrl.trim();
    const nextConfig: ModelProviderConfigState = {
      ...providerDraft,
      apiKey: providerDraft.apiKey.trim(),
      baseUrl: trimmedBaseUrl,
      fetchedModels: [...providerDraft.fetchedModels],
    };

    if (providerModalMode === "add") {
      const nextProviderKey = buildProviderKey(
        trimmedProviderName,
        providerOptions.map(provider => provider.key),
      );

      setProviderOptions(current => [
        ...current,
        {
          capabilities: ["LLM"],
          defaultBaseUrl: trimmedBaseUrl,
          description: DEFAULT_CUSTOM_PROVIDER_DESCRIPTION,
          inputCost: "—",
          key: nextProviderKey,
          label: trimmedProviderName,
          logoText: trimmedProviderName.slice(0, 1).toUpperCase() || "M",
          monthlyEstimate: "—",
          outputCost: "—",
          price: "—",
        },
      ]);
      setProviderConfigs(current => ({
        ...current,
        [nextProviderKey]: nextConfig,
      }));
      setProviderModels(current => ({
        ...current,
        [nextProviderKey]: [],
      }));
      message.success(`${trimmedProviderName} 已添加`);
      resetProviderModal();
      return;
    }

    if (!editingProviderKey) {
      return;
    }

    setProviderOptions(current =>
      current.map(provider =>
        provider.key === editingProviderKey
          ? {
              ...provider,
              defaultBaseUrl: trimmedBaseUrl,
              label: trimmedProviderName,
              logoText: trimmedProviderName.slice(0, 1).toUpperCase() || provider.logoText,
            }
          : provider,
      ),
    );
    setProviderConfigs(current => ({
      ...current,
      [editingProviderKey]: nextConfig,
    }));
    message.success(`${trimmedProviderName} 已更新`);
    resetProviderModal();
  }, [
    editingProviderKey,
    providerDraft,
    providerDraftName,
    providerModalMode,
    providerOptions,
    resetProviderModal,
  ]);

  const handleDeleteProvider = useCallback(
    (providerKey: string): void => {
      setProviderOptions(current => current.filter(provider => provider.key !== providerKey));
      setProviderConfigs(current => {
        const nextConfigs = { ...current };
        delete nextConfigs[providerKey];
        return nextConfigs;
      });
      setProviderModels(current => {
        const nextModels = { ...current };
        delete nextModels[providerKey];
        return nextModels;
      });

      if (managedProviderKey === providerKey) {
        setManagedProviderKey("");
      }
      if (editingProviderKey === providerKey) {
        resetProviderModal();
      }
      if (modelDraftProviderKey === providerKey) {
        resetModelForm();
      }

      message.success("供应商已删除");
    },
    [editingProviderKey, managedProviderKey, modelDraftProviderKey, resetModelForm, resetProviderModal],
  );

  const handleOpenModelManager = useCallback((providerKey: string): void => {
    setManagedProviderKey(providerKey);
    setIsModelFormVisible(false);
    setEditingModelOriginalId("");
    setModelDraftName("");
    setModelDraftId("");
    setModelDraftInterfaceFormat(getDefaultModelInterfaceFormat(providerKey));
    setModelDraftInputModalities([...DEFAULT_MODEL_INPUT_MODALITIES]);
    setModelDraftReasoningEnabled(true);
  }, []);

  const handleCloseModelManager = useCallback((): void => {
    setManagedProviderKey("");
  }, []);

  const handleOpenAddModelModal = useCallback((providerKey: string): void => {
    setIsModelFormVisible(true);
    setModelModalMode("add");
    setModelDraftProviderKey(providerKey);
    setEditingModelOriginalId("");
    setModelDraftName("");
    setModelDraftId("");
    setModelDraftInterfaceFormat(getDefaultModelInterfaceFormat(providerKey));
    setModelDraftInputModalities([...DEFAULT_MODEL_INPUT_MODALITIES]);
    setModelDraftReasoningEnabled(true);
  }, []);

  const handleOpenEditModelModal = useCallback((providerKey: string, model: ProviderModelItem): void => {
    setIsModelFormVisible(true);
    setModelModalMode("edit");
    setModelDraftProviderKey(providerKey);
    setEditingModelOriginalId(model.id);
    setModelDraftName(model.name);
    setModelDraftId(model.id);
    setModelDraftInterfaceFormat(model.interfaceFormat);
    setModelDraftInputModalities([...model.inputModalities]);
    setModelDraftReasoningEnabled(model.reasoningEnabled);
  }, []);

  const handleSaveModel = useCallback((): void => {
    if (!modelDraftProvider) {
      return;
    }
    if (!modelDraftName.trim()) {
      message.warning("请填写模型名称");
      return;
    }
    if (!modelDraftId.trim()) {
      message.warning("请填写模型 ID");
      return;
    }
    if (!modelDraftInputModalities.length) {
      message.warning("请至少选择一种输入模态");
      return;
    }

    const trimmedModelName = modelDraftName.trim();
    const trimmedModelId = modelDraftId.trim();
    const currentModels = providerModels[modelDraftProvider.key] ?? [];
    const duplicatedModel = currentModels.some(
      model => model.id === trimmedModelId && model.id !== editingModelOriginalId,
    );

    if (duplicatedModel) {
      message.warning("当前供应商下已存在相同的模型 ID");
      return;
    }

    const nextModels = editingModelOriginalId
      ? currentModels.map(model =>
          model.id === editingModelOriginalId
            ? {
                id: trimmedModelId,
                inputModalities: [...modelDraftInputModalities],
                interfaceFormat: modelDraftInterfaceFormat,
                name: trimmedModelName,
                reasoningEnabled: modelDraftReasoningEnabled,
              }
            : model,
        )
      : [
          ...currentModels,
          {
            id: trimmedModelId,
            inputModalities: [...modelDraftInputModalities],
            interfaceFormat: modelDraftInterfaceFormat,
            name: trimmedModelName,
            reasoningEnabled: modelDraftReasoningEnabled,
          },
        ];

    setProviderModels(current => ({
      ...current,
      [modelDraftProvider.key]: nextModels,
    }));
    setProviderConfigs(current => {
      const currentConfig =
        current[modelDraftProvider.key] ?? createEmptyProviderConfig(modelDraftProvider.defaultBaseUrl);

      return {
        ...current,
        [modelDraftProvider.key]: {
          ...currentConfig,
          fetchedModels: nextModels.map(model => model.id),
        },
      };
    });

    message.success(editingModelOriginalId ? "模型已更新" : "模型已添加");
    resetModelForm();
  }, [
    editingModelOriginalId,
    modelDraftInputModalities,
    modelDraftInterfaceFormat,
    modelDraftId,
    modelDraftName,
    modelDraftProvider,
    modelDraftReasoningEnabled,
    providerModels,
    resetModelForm,
  ]);

  const handleToggleModelReasoning = useCallback(
    (modelId: string, enabled: boolean): void => {
      if (!managedProvider) {
        return;
      }

      setProviderModels(current => ({
        ...current,
        [managedProvider.key]: (current[managedProvider.key] ?? []).map(model =>
          model.id === modelId
            ? {
                ...model,
                reasoningEnabled: enabled,
              }
            : model,
        ),
      }));
      message.success(`推理已${enabled ? "开启" : "关闭"}`);
    },
    [managedProvider],
  );

  const handleDeleteModel = useCallback(
    (modelId: string): void => {
      if (!managedProvider) {
        return;
      }

      const currentModels = providerModels[managedProvider.key] ?? [];
      const nextModels = currentModels.filter(model => model.id !== modelId);

      setProviderModels(current => ({
        ...current,
        [managedProvider.key]: nextModels,
      }));
      setProviderConfigs(current => {
        const currentConfig =
          current[managedProvider.key] ?? createEmptyProviderConfig(managedProvider.defaultBaseUrl);

        return {
          ...current,
          [managedProvider.key]: {
            ...currentConfig,
            fetchedModels: nextModels.map(model => model.id),
          },
        };
      });

      if (editingModelOriginalId === modelId) {
        resetModelForm();
      }

      message.success("模型已删除");
    },
    [editingModelOriginalId, managedProvider, providerModels, resetModelForm],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>模型管理</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>供应商列表</h2>
          </div>
          <div className={adminStyles.consoleInlineActions}>
            <Input
              className={adminStyles.consoleInlineSearch}
              allowClear
              placeholder="搜索供应商或模型"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddProvider}>
              添加模型供应商
            </Button>
          </div>
        </div>

        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>供应商名称</th>
                <th>API Key</th>
                <th>Base URL</th>
                <th>状态</th>
                <th>模型数</th>
                <th>最近检测</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.length ? (
                filteredProviders.map(provider => {
                  const providerConfig =
                    providerConfigs[provider.key] ?? createEmptyProviderConfig(provider.defaultBaseUrl);
                  const models = providerModels[provider.key] ?? [];

                  return (
                    <tr key={provider.key}>
                      <td className={adminStyles.consoleHtmlTableStrong}>{provider.label}</td>
                      <td>{maskApiKey(providerConfig.apiKey)}</td>
                      <td>{providerConfig.baseUrl || provider.defaultBaseUrl || "未填写"}</td>
                      <td>
                        <span className={getProviderStatusClassName(getProviderListStatusTone(providerConfig))}>
                          {getProviderListStatusLabel(providerConfig)}
                        </span>
                      </td>
                      <td>{models.length} 个</td>
                      <td>{providerConfig.lastCheckedAt || "未检测"}</td>
                      <td>
                        <div className={adminStyles.consoleActions}>
                          <Button size="small" onClick={() => handleOpenModelManager(provider.key)}>
                            模型管理
                          </Button>
                          <Button size="small" onClick={() => handleOpenAddModelModal(provider.key)}>
                            添加模型
                          </Button>
                          <Button size="small" onClick={() => handleOpenEditProvider(provider.key)}>
                            编辑
                          </Button>
                          <Popconfirm
                            title="确认删除该供应商？"
                            description="删除后会同时移除该供应商下的所有模型。"
                            onConfirm={() => handleDeleteProvider(provider.key)}
                            okText="确认"
                            cancelText="取消"
                          >
                            <Button size="small" danger>
                              删除
                            </Button>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className={adminStyles.consoleEmpty}>当前没有匹配的模型供应商。</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        cancelText="取消"
        okButtonProps={{ disabled: !providerDraftName.trim() || !providerDraft?.apiKey.trim() }}
        okText={providerModalMode === "add" ? "添加" : "保存"}
        open={Boolean(providerDraft)}
        title={providerModalMode === "add" ? "添加模型供应商" : "编辑模型供应商"}
        onCancel={handleCloseProviderModal}
        onOk={handleSaveProvider}
      >
        {providerDraft ? (
          <div className={adminStyles.providerModalContent}>
            {providerModalMode === "edit" && editingProvider ? (
              <div className={adminStyles.providerModalDescription}>{editingProvider.description}</div>
            ) : null}

            <div className={adminStyles.providerModalForm}>
              <div className={adminStyles.providerField}>
                <span className={adminStyles.providerFieldLabel}>供应商名称</span>
                <Input
                  placeholder="如：OpenAI、Anthropic、DeepSeek"
                  value={providerDraftName}
                  onChange={event => setProviderDraftName(event.target.value)}
                />
              </div>

              <div className={adminStyles.providerField}>
                <span className={adminStyles.providerFieldLabel}>API Key</span>
                <Input.Password
                  autoComplete="off"
                  placeholder="请输入 API Key"
                  value={providerDraft.apiKey}
                  onChange={event => handleProviderDraftFieldChange("apiKey", event.target.value)}
                />
              </div>

              <div className={adminStyles.providerField}>
                <span className={adminStyles.providerFieldLabel}>Base URL（选填）</span>
                <Input
                  autoComplete="off"
                  placeholder="请输入 Base URL"
                  value={providerDraft.baseUrl}
                  onChange={event => handleProviderDraftFieldChange("baseUrl", event.target.value)}
                />
              </div>
            </div>

            <div className={adminStyles.providerModalActions}>
              <Button loading={isTestingProvider} onClick={() => void handleTestProviderConnection()}>
                测试连通性
              </Button>
            </div>

          </div>
        ) : null}
      </Modal>

      <Modal
        footer={null}
        open={Boolean(managedProvider)}
        title={managedProvider ? `模型管理 · ${managedProvider.label}` : "模型管理"}
        onCancel={handleCloseModelManager}
      >
        {managedProvider ? (
          <div className={adminStyles.providerModalContent}>
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>模型名称</th>
                    <th>模型 ID</th>
                    <th>接口格式</th>
                    <th>输入模态</th>
                    <th>推理</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {managedProviderModels.length ? (
                    managedProviderModels.map(model => (
                      <tr key={model.id}>
                        <td className={adminStyles.consoleHtmlTableStrong}>{model.name}</td>
                        <td>{model.id}</td>
                        <td>{getModelInterfaceFormatLabel(model.interfaceFormat)}</td>
                        <td>
                          <div className={adminStyles.consolePillRow}>
                            {model.inputModalities.map(modality => (
                              <span key={modality} className={adminStyles.consolePill}>
                                {getModelInputModalityLabel(modality)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <Switch
                            checked={model.reasoningEnabled}
                            checkedChildren="是"
                            unCheckedChildren="否"
                            onChange={checked => handleToggleModelReasoning(model.id, checked)}
                          />
                        </td>
                        <td>
                          <div className={adminStyles.consoleActions}>
                            <Button
                              size="small"
                              onClick={() => handleOpenEditModelModal(managedProvider.key, model)}
                            >
                              编辑
                            </Button>
                            <Popconfirm
                              title="确认删除该模型？"
                              onConfirm={() => handleDeleteModel(model.id)}
                              okText="确认"
                              cancelText="取消"
                            >
                              <Button size="small" danger>
                                删除
                              </Button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className={adminStyles.consoleEmpty}>当前供应商下暂无模型。</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isModelFormVisible}
        title={
          modelDraftProvider
            ? `${modelModalMode === "add" ? "添加模型" : "编辑模型"} · ${modelDraftProvider.label}`
            : modelModalMode === "add"
              ? "添加模型"
              : "编辑模型"
        }
        onCancel={resetModelForm}
        onOk={handleSaveModel}
        okText={modelModalMode === "add" ? "添加模型" : "保存模型"}
        cancelText="取消"
      >
        <div className={adminStyles.providerModalContent}>
          <div className={adminStyles.providerModalForm}>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>模型名称</span>
              <Input
                placeholder="如：GPT-4o"
                value={modelDraftName}
                onChange={event => setModelDraftName(event.target.value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>模型 ID</span>
              <Input
                placeholder="如：gpt-4o"
                value={modelDraftId}
                onChange={event => setModelDraftId(event.target.value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>接口格式</span>
              <Select
                className={adminStyles.consoleControl}
                options={MODEL_INTERFACE_FORMAT_OPTIONS}
                value={modelDraftInterfaceFormat}
                onChange={(value: ModelInterfaceFormat) => setModelDraftInterfaceFormat(value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>输入模态</span>
              <Select
                mode="multiple"
                className={adminStyles.consoleControl}
                options={MODEL_INPUT_MODALITY_OPTIONS}
                value={modelDraftInputModalities}
                onChange={(value: ModelInputModality[]) => setModelDraftInputModalities(value)}
              />
            </div>
            <div className={adminStyles.providerField}>
              <span className={adminStyles.providerFieldLabel}>推理开关</span>
              <Switch
                className={adminStyles.providerFieldSwitch}
                checked={modelDraftReasoningEnabled}
                checkedChildren="是"
                unCheckedChildren="否"
                onChange={checked => setModelDraftReasoningEnabled(checked)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
