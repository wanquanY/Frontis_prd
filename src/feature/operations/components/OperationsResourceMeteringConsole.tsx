import { useMemo, useState } from "react";

import { App as AntdApp, Button, Empty, Input, InputNumber, Modal, Select, Switch } from "antd";
import classNames from "classnames";

import {
  OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS,
  OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_OPTIONS,
  OPERATIONS_METERING_STATUS_LABELS,
  OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS,
  OPERATIONS_MODEL_INTERFACE_FORMAT_OPTIONS,
  OPERATIONS_MODEL_MODALITY_LABELS,
  OPERATIONS_MODEL_MODALITY_OPTIONS,
  OPERATIONS_USAGE_PRICING_MODE_LABELS,
  createEmptyOperationsExternalMeteredServiceForm,
  createEmptyOperationsMeteringProviderForm,
  createEmptyOperationsModelServiceForm,
} from "@/feature/operations/mockData";
import {
  calculateOperationsSalePrice,
  formatOperationsCurrency,
} from "@/feature/operations/serviceMeteringUtils";
import type {
  OperationsExternalMeteredService,
  OperationsExternalMeteredServiceForm,
  OperationsExternalServiceMeteringUnit,
  OperationsMeteringProvider,
  OperationsMeteringProviderForm,
  OperationsMeteringStatus,
  OperationsModelInterfaceFormat,
  OperationsModelModality,
  OperationsModelService,
  OperationsModelServiceForm,
  OperationsUsagePricingMode,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

export type OperationsResourceMeteringMode = "models" | "interfaces";

interface OperationsResourceMeteringConsoleProps {
  mode: OperationsResourceMeteringMode;
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  externalMeteredServices: OperationsExternalMeteredService[];
  onCreateMeteringProvider: (form: OperationsMeteringProviderForm) => void;
  onUpdateMeteringProvider: (providerId: string, form: OperationsMeteringProviderForm) => void;
  onCreateModelService: (form: OperationsModelServiceForm) => void;
  onUpdateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
  onCreateExternalMeteredService: (form: OperationsExternalMeteredServiceForm) => void;
  onUpdateExternalMeteredService: (
    serviceId: string,
    form: OperationsExternalMeteredServiceForm,
  ) => void;
}

interface ProviderEditorState {
  open: boolean;
  mode: "create" | "edit";
  providerId?: string;
  form: OperationsMeteringProviderForm;
}

interface ModelEditorState {
  open: boolean;
  mode: "create" | "edit";
  modelId?: string;
  form: OperationsModelServiceForm;
}

interface ExternalServiceEditorState {
  open: boolean;
  mode: "create" | "edit";
  serviceId?: string;
  form: OperationsExternalMeteredServiceForm;
}

const METERING_STATUS_OPTIONS: Array<{ value: OperationsMeteringStatus; label: string }> = [
  { value: "active", label: OPERATIONS_METERING_STATUS_LABELS.active },
  { value: "inactive", label: OPERATIONS_METERING_STATUS_LABELS.inactive },
];

const USAGE_PRICING_MODE_OPTIONS: Array<{ value: OperationsUsagePricingMode; label: string }> = [
  { value: "markup", label: OPERATIONS_USAGE_PRICING_MODE_LABELS.markup },
  { value: "grossMargin", label: OPERATIONS_USAGE_PRICING_MODE_LABELS.grossMargin },
  { value: "manual", label: OPERATIONS_USAGE_PRICING_MODE_LABELS.manual },
];

const getStatusClassName = (status: OperationsMeteringStatus): string =>
  classNames(adminStyles.consoleStatusTag, {
    [adminStyles.consoleStatusTagSuccess]: status === "active",
    [adminStyles.consoleStatusTagWarning]: status === "inactive",
  });

const providerToForm = (provider: OperationsMeteringProvider): OperationsMeteringProviderForm => ({
  name: provider.name,
  providerKind: provider.providerKind,
  baseUrl: provider.baseUrl,
  billingCurrency: provider.billingCurrency,
  credentialStatusLabel: provider.credentialStatusLabel,
  status: provider.status,
});

const modelToForm = (model: OperationsModelService): OperationsModelServiceForm => ({
  providerId: model.providerId,
  modelCode: model.modelCode,
  modelName: model.modelName,
  interfaceFormat: model.interfaceFormat,
  modality: model.modality,
  reasoningEnabled: model.reasoningEnabled,
  inputCostPerMillion: model.inputCostPerMillion,
  outputCostPerMillion: model.outputCostPerMillion,
  pricingMode: model.pricingMode,
  markupRate: model.markupRate,
  grossMarginRate: model.grossMarginRate,
  inputSalePricePerMillion: model.inputSalePricePerMillion,
  outputSalePricePerMillion: model.outputSalePricePerMillion,
  status: model.status,
});

const externalServiceToForm = (
  service: OperationsExternalMeteredService,
): OperationsExternalMeteredServiceForm => ({
  providerId: service.providerId,
  name: service.name,
  serviceTypeLabel: service.serviceTypeLabel,
  meteringUnit: service.meteringUnit,
  costPerUnit: service.costPerUnit,
  pricingMode: service.pricingMode,
  markupRate: service.markupRate,
  grossMarginRate: service.grossMarginRate,
  salePricePerUnit: service.salePricePerUnit,
  status: service.status,
});

const createModelFormWithProvider = (providerId: string): OperationsModelServiceForm => ({
  ...createEmptyOperationsModelServiceForm(),
  providerId,
});

const createExternalServiceFormWithProvider = (
  providerId: string,
): OperationsExternalMeteredServiceForm => ({
  ...createEmptyOperationsExternalMeteredServiceForm(),
  providerId,
});

/**
 * 资源池内的大模型与接口资源计量配置。
 */
export const OperationsResourceMeteringConsole = ({
  mode,
  meteringProviders,
  modelServices,
  externalMeteredServices,
  onCreateMeteringProvider,
  onUpdateMeteringProvider,
  onCreateModelService,
  onUpdateModelService,
  onCreateExternalMeteredService,
  onUpdateExternalMeteredService,
}: OperationsResourceMeteringConsoleProps): JSX.Element => {
  const { message } = AntdApp.useApp();
  const [keyword, setKeyword] = useState<string>("");
  const [managedProviderId, setManagedProviderId] = useState<string>("");
  const [providerEditor, setProviderEditor] = useState<ProviderEditorState>({
    open: false,
    mode: "create",
    form: {
      ...createEmptyOperationsMeteringProviderForm(),
      providerKind: "largeModel",
    },
  });
  const [modelEditor, setModelEditor] = useState<ModelEditorState>({
    open: false,
    mode: "create",
    form: createModelFormWithProvider(""),
  });
  const [externalServiceEditor, setExternalServiceEditor] = useState<ExternalServiceEditorState>({
    open: false,
    mode: "create",
    form: createExternalServiceFormWithProvider(""),
  });

  const largeModelProviders = useMemo(
    () => meteringProviders.filter(provider => provider.providerKind === "largeModel"),
    [meteringProviders],
  );
  const externalProviders = useMemo(() => {
    const providers = meteringProviders.filter(provider => provider.providerKind !== "largeModel");

    return providers.length > 0 ? providers : meteringProviders;
  }, [meteringProviders]);
  const filteredModelProviders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return largeModelProviders;
    }

    return largeModelProviders.filter(provider => {
      const models = modelServices.filter(model => model.providerId === provider.id);
      const searchText = [
        provider.name,
        provider.baseUrl,
        provider.credentialStatusLabel,
        ...models.map(model => `${model.modelName} ${model.modelCode}`),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedKeyword);
    });
  }, [keyword, largeModelProviders, modelServices]);
  const managedProvider = largeModelProviders.find(provider => provider.id === managedProviderId);
  const managedProviderModels = managedProvider
    ? modelServices.filter(model => model.providerId === managedProvider.id)
    : [];
  const externalProviderOptions = externalProviders.map(provider => ({
    value: provider.id,
    label: provider.name,
  }));

  const modelPricePreview = useMemo(
    () => ({
      inputSalePricePerMillion: calculateOperationsSalePrice(
        modelEditor.form.inputCostPerMillion,
        modelEditor.form.pricingMode,
        modelEditor.form.markupRate,
        modelEditor.form.grossMarginRate,
        modelEditor.form.inputSalePricePerMillion,
      ),
      outputSalePricePerMillion: calculateOperationsSalePrice(
        modelEditor.form.outputCostPerMillion,
        modelEditor.form.pricingMode,
        modelEditor.form.markupRate,
        modelEditor.form.grossMarginRate,
        modelEditor.form.outputSalePricePerMillion,
      ),
    }),
    [modelEditor.form],
  );

  const externalPricePreview = useMemo(
    () =>
      calculateOperationsSalePrice(
        externalServiceEditor.form.costPerUnit,
        externalServiceEditor.form.pricingMode,
        externalServiceEditor.form.markupRate,
        externalServiceEditor.form.grossMarginRate,
        externalServiceEditor.form.salePricePerUnit,
      ),
    [externalServiceEditor.form],
  );

  const handleOpenCreateProvider = (): void => {
    setProviderEditor({
      open: true,
      mode: "create",
      form: {
        ...createEmptyOperationsMeteringProviderForm(),
        providerKind: "largeModel",
      },
    });
  };

  const handleOpenEditProvider = (provider: OperationsMeteringProvider): void => {
    setProviderEditor({
      open: true,
      mode: "edit",
      providerId: provider.id,
      form: providerToForm(provider),
    });
  };

  const handleCloseProviderEditor = (): void => {
    setProviderEditor({
      open: false,
      mode: "create",
      form: {
        ...createEmptyOperationsMeteringProviderForm(),
        providerKind: "largeModel",
      },
    });
  };

  const handleConfirmProvider = (): void => {
    if (!providerEditor.form.name.trim()) {
      message.warning("请填写供应商名称。");
      return;
    }

    const form: OperationsMeteringProviderForm = {
      ...providerEditor.form,
      providerKind: "largeModel",
    };

    if (providerEditor.mode === "edit" && providerEditor.providerId) {
      onUpdateMeteringProvider(providerEditor.providerId, form);
      message.success("模型供应商已更新。");
    } else {
      onCreateMeteringProvider(form);
      message.success("模型供应商已添加。");
    }

    handleCloseProviderEditor();
  };

  const handleOpenCreateModel = (providerId: string): void => {
    setModelEditor({
      open: true,
      mode: "create",
      form: createModelFormWithProvider(providerId),
    });
  };

  const handleOpenEditModel = (model: OperationsModelService): void => {
    setModelEditor({
      open: true,
      mode: "edit",
      modelId: model.id,
      form: modelToForm(model),
    });
  };

  const handleCloseModelEditor = (): void => {
    setModelEditor({
      open: false,
      mode: "create",
      form: createModelFormWithProvider(""),
    });
  };

  const handleConfirmModel = (): void => {
    if (!modelEditor.form.providerId) {
      message.warning("请先选择模型供应商。");
      return;
    }

    if (!modelEditor.form.modelName.trim() || !modelEditor.form.modelCode.trim()) {
      message.warning("请填写模型名称和模型 ID。");
      return;
    }

    if (modelEditor.mode === "edit" && modelEditor.modelId) {
      onUpdateModelService(modelEditor.modelId, modelEditor.form);
      message.success("模型资源已更新。");
    } else {
      onCreateModelService(modelEditor.form);
      message.success("模型资源已添加。");
    }

    handleCloseModelEditor();
  };

  const handleToggleModelReasoning = (model: OperationsModelService, checked: boolean): void => {
    onUpdateModelService(model.id, {
      ...modelToForm(model),
      reasoningEnabled: checked,
    });
  };

  const handleOpenCreateExternalService = (): void => {
    if (externalProviders.length === 0) {
      message.warning("请先创建接口或 Skill 服务商。");
      return;
    }

    setExternalServiceEditor({
      open: true,
      mode: "create",
      form: createExternalServiceFormWithProvider(externalProviders[0]?.id ?? ""),
    });
  };

  const handleOpenEditExternalService = (service: OperationsExternalMeteredService): void => {
    setExternalServiceEditor({
      open: true,
      mode: "edit",
      serviceId: service.id,
      form: externalServiceToForm(service),
    });
  };

  const handleCloseExternalServiceEditor = (): void => {
    setExternalServiceEditor({
      open: false,
      mode: "create",
      form: createExternalServiceFormWithProvider(""),
    });
  };

  const handleConfirmExternalService = (): void => {
    if (!externalServiceEditor.form.providerId) {
      message.warning("请选择服务商。");
      return;
    }

    if (!externalServiceEditor.form.name.trim()) {
      message.warning("请填写接口或 Skill 名称。");
      return;
    }

    if (externalServiceEditor.mode === "edit" && externalServiceEditor.serviceId) {
      onUpdateExternalMeteredService(externalServiceEditor.serviceId, externalServiceEditor.form);
      message.success("接口资源已更新。");
    } else {
      onCreateExternalMeteredService(externalServiceEditor.form);
      message.success("接口资源已添加。");
    }

    handleCloseExternalServiceEditor();
  };

  const renderModelResources = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>大模型资源配置</h2>
          <p className={adminStyles.consoleSectionDescription}>
            结构与企业管理端模型配置保持一致：先维护模型供应商，再在供应商下管理模型清单；运营侧额外维护成本价和资源计量单价。
          </p>
        </div>
        <div className={adminStyles.consoleInlineActions}>
          <Input
            className={adminStyles.consoleInlineSearch}
            allowClear
            value={keyword}
            placeholder="搜索供应商或模型"
            onChange={event => setKeyword(event.target.value)}
          />
          <Button type="primary" onClick={handleOpenCreateProvider}>
            添加模型供应商
          </Button>
        </div>
      </div>

      {filteredModelProviders.length > 0 ? (
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>供应商名称</th>
                <th>API Key</th>
                <th>Base URL</th>
                <th>状态</th>
                <th>模型数</th>
                <th>最近更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredModelProviders.map(provider => {
                const models = modelServices.filter(model => model.providerId === provider.id);

                return (
                  <tr key={provider.id}>
                    <td className={adminStyles.consoleHtmlTableStrong}>{provider.name}</td>
                    <td>{provider.credentialStatusLabel || "未配置"}</td>
                    <td>{provider.baseUrl || "未填写"}</td>
                    <td>
                      <span className={getStatusClassName(provider.status)}>
                        {OPERATIONS_METERING_STATUS_LABELS[provider.status]}
                      </span>
                    </td>
                    <td>{models.length} 个</td>
                    <td>{provider.updatedAt}</td>
                    <td>
                      <div className={adminStyles.consoleActions}>
                        <Button size="small" onClick={() => setManagedProviderId(provider.id)}>
                          模型管理
                        </Button>
                        <Button size="small" onClick={() => handleOpenCreateModel(provider.id)}>
                          添加模型
                        </Button>
                        <Button size="small" onClick={() => handleOpenEditProvider(provider)}>
                          编辑
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty description="暂无模型供应商。" />
      )}
    </section>
  );

  const renderInterfaceResources = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>接口与 Skill 资源计量</h2>
          <p className={adminStyles.consoleSectionDescription}>
            这里维护第三方 API、Skill
            外部能力的成本和资源计量单价；它们不是商品，商品化仍在商品中心完成。
          </p>
        </div>
        <div className={adminStyles.consoleActions}>
          <Button type="primary" onClick={handleOpenCreateExternalService}>
            新增接口资源
          </Button>
        </div>
      </div>

      {externalMeteredServices.length > 0 ? (
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>资源名称</th>
                <th>服务商</th>
                <th>计量单位</th>
                <th>成本价</th>
                <th>计量策略</th>
                <th>计量单价</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {externalMeteredServices.map(service => (
                <tr key={service.id}>
                  <td>
                    <span className={adminStyles.consoleHtmlTableStrong}>{service.name}</span>
                    <br />
                    {service.serviceTypeLabel}
                  </td>
                  <td>{service.providerName}</td>
                  <td>{OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS[service.meteringUnit]}</td>
                  <td>{formatOperationsCurrency(service.costPerUnit)}</td>
                  <td>
                    {OPERATIONS_USAGE_PRICING_MODE_LABELS[service.pricingMode]}
                    <br />
                    {service.pricingMode === "grossMargin"
                      ? `目标毛利 ${service.grossMarginRate}%`
                      : `倍率 ${service.markupRate}x`}
                  </td>
                  <td>{formatOperationsCurrency(service.salePricePerUnit)}</td>
                  <td>
                    <span className={getStatusClassName(service.status)}>
                      {OPERATIONS_METERING_STATUS_LABELS[service.status]}
                    </span>
                  </td>
                  <td>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => handleOpenEditExternalService(service)}
                    >
                      编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty description="暂无接口或 Skill 资源。" />
      )}
    </section>
  );

  return (
    <>
      {mode === "models" ? renderModelResources() : renderInterfaceResources()}

      <Modal
        title={providerEditor.mode === "edit" ? "编辑模型供应商" : "添加模型供应商"}
        open={providerEditor.open}
        width={720}
        className={classNames(styles.fixedModal, styles.standardModal)}
        okText={providerEditor.mode === "edit" ? "保存" : "添加"}
        cancelText="取消"
        onOk={handleConfirmProvider}
        onCancel={handleCloseProviderEditor}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>供应商名称</span>
            <Input
              placeholder="如：OpenAI、Anthropic、DeepSeek"
              value={providerEditor.form.name}
              onChange={event =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, name: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>API Key</span>
            <Input
              placeholder="仅展示掩码或配置状态"
              value={providerEditor.form.credentialStatusLabel}
              onChange={event =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, credentialStatusLabel: event.target.value },
                }))
              }
            />
          </div>
          <div className={classNames(styles.modalField, styles.modalFieldWide)}>
            <span className={styles.modalLabel}>Base URL</span>
            <Input
              autoComplete="off"
              placeholder="请输入 Base URL"
              value={providerEditor.form.baseUrl}
              onChange={event =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, baseUrl: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>结算币种</span>
            <Input
              value={providerEditor.form.billingCurrency}
              onChange={event =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, billingCurrency: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>状态</span>
            <Select<OperationsMeteringStatus>
              value={providerEditor.form.status}
              options={METERING_STATUS_OPTIONS}
              onChange={value =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, status: value },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        footer={null}
        open={Boolean(managedProvider)}
        width={920}
        className={classNames(styles.fixedModal, styles.largeModal)}
        title={managedProvider ? `模型管理 · ${managedProvider.name}` : "模型管理"}
        onCancel={() => setManagedProviderId("")}
      >
        {managedProvider ? (
          <div className={styles.modalDetailStack}>
            <div className={adminStyles.consoleActions}>
              <Button type="primary" onClick={() => handleOpenCreateModel(managedProvider.id)}>
                添加模型
              </Button>
            </div>
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>模型名称</th>
                    <th>模型 ID</th>
                    <th>接口格式</th>
                    <th>模型能力</th>
                    <th>推理</th>
                    <th>成本价 / 百万 Tokens</th>
                    <th>计量单价 / 百万 Tokens</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {managedProviderModels.length > 0 ? (
                    managedProviderModels.map(model => (
                      <tr key={model.id}>
                        <td className={adminStyles.consoleHtmlTableStrong}>{model.modelName}</td>
                        <td>{model.modelCode}</td>
                        <td>{OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS[model.interfaceFormat]}</td>
                        <td>{OPERATIONS_MODEL_MODALITY_LABELS[model.modality]}</td>
                        <td>
                          <Switch
                            checked={model.reasoningEnabled}
                            checkedChildren="是"
                            unCheckedChildren="否"
                            onChange={checked => handleToggleModelReasoning(model, checked)}
                          />
                        </td>
                        <td>
                          输入 {formatOperationsCurrency(model.inputCostPerMillion)}
                          <br />
                          输出 {formatOperationsCurrency(model.outputCostPerMillion)}
                        </td>
                        <td>
                          输入 {formatOperationsCurrency(model.inputSalePricePerMillion)}
                          <br />
                          输出 {formatOperationsCurrency(model.outputSalePricePerMillion)}
                        </td>
                        <td>
                          <Button
                            size="small"
                            type="link"
                            onClick={() => handleOpenEditModel(model)}
                          >
                            编辑
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
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
        title={modelEditor.mode === "edit" ? "编辑模型资源" : "添加模型资源"}
        open={modelEditor.open}
        width={920}
        className={classNames(styles.fixedModal, styles.largeModal)}
        okText={modelEditor.mode === "edit" ? "保存模型" : "添加模型"}
        cancelText="取消"
        onOk={handleConfirmModel}
        onCancel={handleCloseModelEditor}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型名称</span>
            <Input
              placeholder="如：GPT-4.1"
              value={modelEditor.form.modelName}
              onChange={event =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modelName: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型 ID</span>
            <Input
              placeholder="如：gpt-4.1"
              value={modelEditor.form.modelCode}
              onChange={event =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modelCode: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>接口格式</span>
            <Select<OperationsModelInterfaceFormat>
              value={modelEditor.form.interfaceFormat}
              options={OPERATIONS_MODEL_INTERFACE_FORMAT_OPTIONS}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, interfaceFormat: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型能力</span>
            <Select<OperationsModelModality>
              value={modelEditor.form.modality}
              options={OPERATIONS_MODEL_MODALITY_OPTIONS}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modality: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>输入成本 / 百万 Tokens</span>
            <InputNumber
              min={0}
              className={styles.fullWidthInput}
              value={modelEditor.form.inputCostPerMillion}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, inputCostPerMillion: Number(value ?? 0) },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>输出成本 / 百万 Tokens</span>
            <InputNumber
              min={0}
              className={styles.fullWidthInput}
              value={modelEditor.form.outputCostPerMillion}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, outputCostPerMillion: Number(value ?? 0) },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>计量策略</span>
            <Select<OperationsUsagePricingMode>
              value={modelEditor.form.pricingMode}
              options={USAGE_PRICING_MODE_OPTIONS}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, pricingMode: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>
              {modelEditor.form.pricingMode === "grossMargin" ? "目标毛利率（%）" : "成本倍率（x）"}
            </span>
            <InputNumber
              min={modelEditor.form.pricingMode === "grossMargin" ? 0 : 1}
              max={modelEditor.form.pricingMode === "grossMargin" ? 95 : undefined}
              className={styles.fullWidthInput}
              value={
                modelEditor.form.pricingMode === "grossMargin"
                  ? modelEditor.form.grossMarginRate
                  : modelEditor.form.markupRate
              }
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form:
                    current.form.pricingMode === "grossMargin"
                      ? { ...current.form, grossMarginRate: Number(value ?? 0) }
                      : { ...current.form, markupRate: Number(value ?? 1) },
                }))
              }
            />
          </div>
          {modelEditor.form.pricingMode === "manual" ? (
            <>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>输入计量单价 / 百万 Tokens</span>
                <InputNumber
                  min={0}
                  className={styles.fullWidthInput}
                  value={modelEditor.form.inputSalePricePerMillion}
                  onChange={value =>
                    setModelEditor(current => ({
                      ...current,
                      form: { ...current.form, inputSalePricePerMillion: Number(value ?? 0) },
                    }))
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>输出计量单价 / 百万 Tokens</span>
                <InputNumber
                  min={0}
                  className={styles.fullWidthInput}
                  value={modelEditor.form.outputSalePricePerMillion}
                  onChange={value =>
                    setModelEditor(current => ({
                      ...current,
                      form: { ...current.form, outputSalePricePerMillion: Number(value ?? 0) },
                    }))
                  }
                />
              </div>
            </>
          ) : null}
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>推理开关</span>
            <Switch
              className={styles.statusSwitchRow}
              checked={modelEditor.form.reasoningEnabled}
              checkedChildren="是"
              unCheckedChildren="否"
              onChange={checked =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, reasoningEnabled: checked },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>状态</span>
            <Select<OperationsMeteringStatus>
              value={modelEditor.form.status}
              options={METERING_STATUS_OPTIONS}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, status: value },
                }))
              }
            />
          </div>
          <div className={classNames(styles.modalField, styles.modalFieldWide)}>
            <span className={styles.modalLabel}>资源计量预览</span>
            <div className={adminStyles.consolePillRow}>
              <span className={adminStyles.consolePill}>
                输入计量单价 {formatOperationsCurrency(modelPricePreview.inputSalePricePerMillion)}
              </span>
              <span className={adminStyles.consolePill}>
                输出计量单价 {formatOperationsCurrency(modelPricePreview.outputSalePricePerMillion)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title={externalServiceEditor.mode === "edit" ? "编辑接口资源" : "新增接口资源"}
        open={externalServiceEditor.open}
        width={920}
        className={classNames(styles.fixedModal, styles.largeModal)}
        okText={externalServiceEditor.mode === "edit" ? "保存" : "新增"}
        cancelText="取消"
        onOk={handleConfirmExternalService}
        onCancel={handleCloseExternalServiceEditor}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>服务商</span>
            <Select<string>
              value={externalServiceEditor.form.providerId}
              options={externalProviderOptions}
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, providerId: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>计量单位</span>
            <Select<OperationsExternalServiceMeteringUnit>
              value={externalServiceEditor.form.meteringUnit}
              options={OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_OPTIONS}
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, meteringUnit: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>资源名称</span>
            <Input
              value={externalServiceEditor.form.name}
              onChange={event =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, name: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>服务类型</span>
            <Input
              value={externalServiceEditor.form.serviceTypeLabel}
              onChange={event =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, serviceTypeLabel: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>单位成本</span>
            <InputNumber
              min={0}
              className={styles.fullWidthInput}
              value={externalServiceEditor.form.costPerUnit}
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, costPerUnit: Number(value ?? 0) },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>计量策略</span>
            <Select<OperationsUsagePricingMode>
              value={externalServiceEditor.form.pricingMode}
              options={USAGE_PRICING_MODE_OPTIONS}
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, pricingMode: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>
              {externalServiceEditor.form.pricingMode === "grossMargin"
                ? "目标毛利率（%）"
                : "成本倍率（x）"}
            </span>
            <InputNumber
              min={externalServiceEditor.form.pricingMode === "grossMargin" ? 0 : 1}
              max={externalServiceEditor.form.pricingMode === "grossMargin" ? 95 : undefined}
              className={styles.fullWidthInput}
              value={
                externalServiceEditor.form.pricingMode === "grossMargin"
                  ? externalServiceEditor.form.grossMarginRate
                  : externalServiceEditor.form.markupRate
              }
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form:
                    current.form.pricingMode === "grossMargin"
                      ? { ...current.form, grossMarginRate: Number(value ?? 0) }
                      : { ...current.form, markupRate: Number(value ?? 1) },
                }))
              }
            />
          </div>
          {externalServiceEditor.form.pricingMode === "manual" ? (
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>单位计量单价</span>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                value={externalServiceEditor.form.salePricePerUnit}
                onChange={value =>
                  setExternalServiceEditor(current => ({
                    ...current,
                    form: { ...current.form, salePricePerUnit: Number(value ?? 0) },
                  }))
                }
              />
            </div>
          ) : null}
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>状态</span>
            <Select<OperationsMeteringStatus>
              value={externalServiceEditor.form.status}
              options={METERING_STATUS_OPTIONS}
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, status: value },
                }))
              }
            />
          </div>
          <div className={classNames(styles.modalField, styles.modalFieldWide)}>
            <span className={styles.modalLabel}>资源计量预览</span>
            <div className={adminStyles.consolePillRow}>
              <span className={adminStyles.consolePill}>
                单位计量单价 {formatOperationsCurrency(externalPricePreview)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
