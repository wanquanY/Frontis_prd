import { useMemo, useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, Switch, message } from "antd";
import classNames from "classnames";

import {
  OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS,
  OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_OPTIONS,
  OPERATIONS_METERING_PROVIDER_KIND_LABELS,
  OPERATIONS_METERING_STATUS_LABELS,
  OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS,
  OPERATIONS_MODEL_INTERFACE_FORMAT_OPTIONS,
  OPERATIONS_MODEL_MODALITY_LABELS,
  OPERATIONS_MODEL_MODALITY_OPTIONS,
  OPERATIONS_SERVICE_PRICING_MODE_LABELS,
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
  OperationsMeteringProviderKind,
  OperationsMeteringStatus,
  OperationsModelInterfaceFormat,
  OperationsModelModality,
  OperationsModelService,
  OperationsModelServiceForm,
  OperationsServicePricingMode,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

type ResourceMeteringTabKey = "models" | "interfaces";

interface OperationsResourceMeteringConsoleProps {
  externalMeteredServices: OperationsExternalMeteredService[];
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  onCreateExternalMeteredService: (form: OperationsExternalMeteredServiceForm) => void;
  onCreateMeteringProvider: (form: OperationsMeteringProviderForm) => void;
  onCreateModelService: (form: OperationsModelServiceForm) => void;
  onUpdateExternalMeteredService: (
    serviceId: string,
    form: OperationsExternalMeteredServiceForm,
  ) => void;
  onUpdateMeteringProvider: (providerId: string, form: OperationsMeteringProviderForm) => void;
  onUpdateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
}

interface ProviderEditorState {
  form: OperationsMeteringProviderForm;
  mode: "create" | "edit";
  open: boolean;
  providerId?: string;
}

interface ModelEditorState {
  form: OperationsModelServiceForm;
  mode: "create" | "edit";
  modelId?: string;
  open: boolean;
}

interface ExternalServiceEditorState {
  form: OperationsExternalMeteredServiceForm;
  mode: "create" | "edit";
  open: boolean;
  serviceId?: string;
}

const RESOURCE_TABS: Array<{ key: ResourceMeteringTabKey; label: string }> = [
  { key: "models", label: "大模型资源" },
  { key: "interfaces", label: "接口资源" },
];

const METERING_STATUS_OPTIONS: Array<{ value: OperationsMeteringStatus; label: string }> = [
  { value: "active", label: OPERATIONS_METERING_STATUS_LABELS.active },
  { value: "inactive", label: OPERATIONS_METERING_STATUS_LABELS.inactive },
];

const PRICING_MODE_OPTIONS: Array<{ value: OperationsServicePricingMode; label: string }> = [
  { value: "markup", label: OPERATIONS_SERVICE_PRICING_MODE_LABELS.markup },
  { value: "grossMargin", label: OPERATIONS_SERVICE_PRICING_MODE_LABELS.grossMargin },
  { value: "manual", label: OPERATIONS_SERVICE_PRICING_MODE_LABELS.manual },
];

const buildStatusClassName = (status: OperationsMeteringStatus): string =>
  classNames(adminStyles.consoleStatusTag, {
    [adminStyles.consoleStatusTagSuccess]: status === "active",
    [adminStyles.consoleStatusTagWarning]: status === "inactive",
  });

const createProviderForm = (
  providerKind: OperationsMeteringProviderKind,
): OperationsMeteringProviderForm => ({
  ...createEmptyOperationsMeteringProviderForm(),
  providerKind,
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

const createModelForm = (providerId: string): OperationsModelServiceForm => ({
  ...createEmptyOperationsModelServiceForm(),
  providerId,
});

const createExternalServiceForm = (providerId: string): OperationsExternalMeteredServiceForm => ({
  ...createEmptyOperationsExternalMeteredServiceForm(),
  providerId,
});

/**
 * 运营后台资源池控制台，维护模型资源、第三方接口资源和对应成本售价。
 */
export const OperationsResourceMeteringConsole = ({
  externalMeteredServices,
  meteringProviders,
  modelServices,
  onCreateExternalMeteredService,
  onCreateMeteringProvider,
  onCreateModelService,
  onUpdateExternalMeteredService,
  onUpdateMeteringProvider,
  onUpdateModelService,
}: OperationsResourceMeteringConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<ResourceMeteringTabKey>("models");
  const [keyword, setKeyword] = useState<string>("");
  const [managedProviderId, setManagedProviderId] = useState<string>("");
  const [providerEditor, setProviderEditor] = useState<ProviderEditorState>({
    form: createProviderForm("largeModel"),
    mode: "create",
    open: false,
  });
  const [modelEditor, setModelEditor] = useState<ModelEditorState>({
    form: createModelForm(""),
    mode: "create",
    open: false,
  });
  const [externalServiceEditor, setExternalServiceEditor] = useState<ExternalServiceEditorState>({
    form: createExternalServiceForm(""),
    mode: "create",
    open: false,
  });

  const largeModelProviders = useMemo(
    () => meteringProviders.filter(provider => provider.providerKind === "largeModel"),
    [meteringProviders],
  );
  const interfaceProviders = useMemo(
    () => meteringProviders.filter(provider => provider.providerKind !== "largeModel"),
    [meteringProviders],
  );
  const providerOptions = largeModelProviders.map(provider => ({
    value: provider.id,
    label: provider.name,
  }));
  const interfaceProviderOptions = interfaceProviders.map(provider => ({
    value: provider.id,
    label: provider.name,
  }));
  const filteredModelProviders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return largeModelProviders;
    }

    return largeModelProviders.filter(provider => {
      const providerModels = modelServices.filter(model => model.providerId === provider.id);
      const searchText = [
        provider.name,
        provider.baseUrl,
        provider.credentialStatusLabel,
        ...providerModels.map(model => `${model.modelName} ${model.modelCode}`),
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
  const modelPricePreview = useMemo(
    () => ({
      input: calculateOperationsSalePrice(
        modelEditor.form.inputCostPerMillion,
        modelEditor.form.pricingMode,
        modelEditor.form.markupRate,
        modelEditor.form.grossMarginRate,
        modelEditor.form.inputSalePricePerMillion,
      ),
      output: calculateOperationsSalePrice(
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

  const handleOpenCreateProvider = (providerKind: OperationsMeteringProviderKind): void => {
    setProviderEditor({
      form: createProviderForm(providerKind),
      mode: "create",
      open: true,
    });
  };

  const handleOpenEditProvider = (provider: OperationsMeteringProvider): void => {
    setProviderEditor({
      form: providerToForm(provider),
      mode: "edit",
      open: true,
      providerId: provider.id,
    });
  };

  const handleCloseProviderEditor = (): void => {
    setProviderEditor({
      form: createProviderForm("largeModel"),
      mode: "create",
      open: false,
    });
  };

  const handleConfirmProvider = (): void => {
    if (!providerEditor.form.name.trim()) {
      message.warning("请填写服务商名称。");
      return;
    }

    if (providerEditor.mode === "edit" && providerEditor.providerId) {
      onUpdateMeteringProvider(providerEditor.providerId, providerEditor.form);
      message.success("服务商已更新。");
    } else {
      onCreateMeteringProvider(providerEditor.form);
      message.success("服务商已添加。");
    }

    handleCloseProviderEditor();
  };

  const handleOpenCreateModel = (providerId: string): void => {
    setModelEditor({
      form: createModelForm(providerId),
      mode: "create",
      open: true,
    });
  };

  const handleOpenEditModel = (model: OperationsModelService): void => {
    setModelEditor({
      form: modelToForm(model),
      mode: "edit",
      modelId: model.id,
      open: true,
    });
  };

  const handleCloseModelEditor = (): void => {
    setModelEditor({
      form: createModelForm(""),
      mode: "create",
      open: false,
    });
  };

  const handleConfirmModel = (): void => {
    if (!modelEditor.form.providerId) {
      message.warning("请选择模型服务商。");
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

  const handleOpenCreateExternalService = (): void => {
    if (!interfaceProviders.length) {
      message.warning("请先添加接口服务商。");
      return;
    }

    setExternalServiceEditor({
      form: createExternalServiceForm(interfaceProviders[0]?.id ?? ""),
      mode: "create",
      open: true,
    });
  };

  const handleOpenEditExternalService = (service: OperationsExternalMeteredService): void => {
    setExternalServiceEditor({
      form: externalServiceToForm(service),
      mode: "edit",
      open: true,
      serviceId: service.id,
    });
  };

  const handleCloseExternalServiceEditor = (): void => {
    setExternalServiceEditor({
      form: createExternalServiceForm(""),
      mode: "create",
      open: false,
    });
  };

  const handleConfirmExternalService = (): void => {
    if (!externalServiceEditor.form.providerId) {
      message.warning("请选择接口服务商。");
      return;
    }

    if (!externalServiceEditor.form.name.trim()) {
      message.warning("请填写接口资源名称。");
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

  const renderModelProviders = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>大模型资源</h2>
        </div>
        <div className={adminStyles.consoleInlineActions}>
          <Input
            allowClear
            className={adminStyles.consoleInlineSearch}
            placeholder="搜索服务商或模型"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
          />
          <Button type="primary" onClick={() => handleOpenCreateProvider("largeModel")}>
            添加模型服务商
          </Button>
        </div>
      </div>

      {filteredModelProviders.length ? (
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>服务商</th>
                <th>API Key</th>
                <th>Base URL</th>
                <th>模型数</th>
                <th>状态</th>
                <th>最近更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredModelProviders.map(provider => {
                const providerModels = modelServices.filter(
                  model => model.providerId === provider.id,
                );

                return (
                  <tr key={provider.id}>
                    <td className={adminStyles.consoleHtmlTableStrong}>{provider.name}</td>
                    <td>{provider.credentialStatusLabel || "未配置"}</td>
                    <td>{provider.baseUrl || "-"}</td>
                    <td>{providerModels.length} 个</td>
                    <td>
                      <span className={buildStatusClassName(provider.status)}>
                        {OPERATIONS_METERING_STATUS_LABELS[provider.status]}
                      </span>
                    </td>
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
        <Empty description="暂无大模型服务商。" />
      )}
    </section>
  );

  const renderExternalServices = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>接口资源</h2>
        </div>
        <div className={adminStyles.consoleActions}>
          <Button onClick={() => handleOpenCreateProvider("thirdPartyApi")}>添加接口服务商</Button>
          <Button type="primary" onClick={handleOpenCreateExternalService}>
            新增接口资源
          </Button>
        </div>
      </div>

      {externalMeteredServices.length ? (
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>资源名称</th>
                <th>服务商</th>
                <th>计量单位</th>
                <th>成本价</th>
                <th>售价策略</th>
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
                  <td>{OPERATIONS_SERVICE_PRICING_MODE_LABELS[service.pricingMode]}</td>
                  <td>{formatOperationsCurrency(service.salePricePerUnit)}</td>
                  <td>
                    <span className={buildStatusClassName(service.status)}>
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
        <Empty description="暂无接口资源。" />
      )}
    </section>
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>资源池</h1>
        </div>
      </header>

      <div className={adminStyles.consoleTabs}>
        {RESOURCE_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={classNames(adminStyles.consoleTabButton, {
              [adminStyles.consoleTabButtonActive]: activeTab === tab.key,
            })}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "models" ? renderModelProviders() : renderExternalServices()}

      <Modal
        destroyOnHidden
        open={providerEditor.open}
        title={providerEditor.mode === "edit" ? "编辑服务商" : "添加服务商"}
        width={720}
        onCancel={handleCloseProviderEditor}
        onOk={handleConfirmProvider}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>服务商名称</span>
            <Input
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
            <span className={styles.modalLabel}>服务商类型</span>
            <Select<OperationsMeteringProviderKind>
              value={providerEditor.form.providerKind}
              options={Object.entries(OPERATIONS_METERING_PROVIDER_KIND_LABELS).map(
                ([value, label]) => ({
                  value: value as OperationsMeteringProviderKind,
                  label,
                }),
              )}
              onChange={value =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, providerKind: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>API Key</span>
            <Input
              value={providerEditor.form.credentialStatusLabel}
              onChange={event =>
                setProviderEditor(current => ({
                  ...current,
                  form: { ...current.form, credentialStatusLabel: event.target.value },
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
          <div className={classNames(styles.modalField, styles.modalFieldWide)}>
            <span className={styles.modalLabel}>Base URL</span>
            <Input
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
        destroyOnHidden
        footer={null}
        open={Boolean(managedProvider)}
        title={managedProvider ? `模型管理 · ${managedProvider.name}` : "模型管理"}
        width={920}
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
                    <th>售价 / 百万 Tokens</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {managedProviderModels.map(model => (
                    <tr key={model.id}>
                      <td className={adminStyles.consoleHtmlTableStrong}>{model.modelName}</td>
                      <td>{model.modelCode}</td>
                      <td>{OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS[model.interfaceFormat]}</td>
                      <td>{OPERATIONS_MODEL_MODALITY_LABELS[model.modality]}</td>
                      <td>{model.reasoningEnabled ? "是" : "否"}</td>
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
                        <Button size="small" type="link" onClick={() => handleOpenEditModel(model)}>
                          编辑
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        destroyOnHidden
        open={modelEditor.open}
        title={modelEditor.mode === "edit" ? "编辑模型" : "添加模型"}
        width={920}
        onCancel={handleCloseModelEditor}
        onOk={handleConfirmModel}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型服务商</span>
            <Select<string>
              value={modelEditor.form.providerId}
              options={providerOptions}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, providerId: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型名称</span>
            <Input
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
              className={styles.fullWidthInput}
              min={0}
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
              className={styles.fullWidthInput}
              min={0}
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
            <span className={styles.modalLabel}>售价策略</span>
            <Select<OperationsServicePricingMode>
              value={modelEditor.form.pricingMode}
              options={PRICING_MODE_OPTIONS}
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
              className={styles.fullWidthInput}
              max={modelEditor.form.pricingMode === "grossMargin" ? 95 : undefined}
              min={modelEditor.form.pricingMode === "grossMargin" ? 0 : 1}
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
                <span className={styles.modalLabel}>输入售价 / 百万 Tokens</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
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
                <span className={styles.modalLabel}>输出售价 / 百万 Tokens</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
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
            <span className={styles.modalLabel}>推理</span>
            <Switch
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
            <span className={styles.modalLabel}>售价预览</span>
            <div className={adminStyles.consolePillRow}>
              <span className={adminStyles.consolePill}>
                输入 {formatOperationsCurrency(modelPricePreview.input)}
              </span>
              <span className={adminStyles.consolePill}>
                输出 {formatOperationsCurrency(modelPricePreview.output)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        destroyOnHidden
        open={externalServiceEditor.open}
        title={externalServiceEditor.mode === "edit" ? "编辑接口资源" : "新增接口资源"}
        width={920}
        onCancel={handleCloseExternalServiceEditor}
        onOk={handleConfirmExternalService}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>接口服务商</span>
            <Select<string>
              value={externalServiceEditor.form.providerId}
              options={interfaceProviderOptions}
              onChange={value =>
                setExternalServiceEditor(current => ({
                  ...current,
                  form: { ...current.form, providerId: value },
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
            <span className={styles.modalLabel}>单位成本</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
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
            <span className={styles.modalLabel}>售价策略</span>
            <Select<OperationsServicePricingMode>
              value={externalServiceEditor.form.pricingMode}
              options={PRICING_MODE_OPTIONS}
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
              className={styles.fullWidthInput}
              max={externalServiceEditor.form.pricingMode === "grossMargin" ? 95 : undefined}
              min={externalServiceEditor.form.pricingMode === "grossMargin" ? 0 : 1}
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
              <span className={styles.modalLabel}>计量单价</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
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
            <span className={styles.modalLabel}>售价预览</span>
            <div className={adminStyles.consolePillRow}>
              <span className={adminStyles.consolePill}>
                计量单价 {formatOperationsCurrency(externalPricePreview)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
