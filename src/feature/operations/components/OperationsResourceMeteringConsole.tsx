import { useMemo, useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import { OPERATIONS_METERING_STATUS_LABELS } from "@/feature/operations/mockData";
import {
  calculateOperationsSalePrice,
  formatOperationsCurrency,
} from "@/feature/operations/serviceMeteringUtils";
import type {
  OperationsMeteringProvider,
  OperationsMeteringStatus,
  OperationsModelMeteringProtocol,
  OperationsModelProtocolCostConfig,
  OperationsModelService,
  OperationsModelServiceForm,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

interface OperationsResourceMeteringConsoleProps {
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  onUpdateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
}

interface ModelEditorState {
  form: OperationsModelServiceForm;
  modelId?: string;
  open: boolean;
}

const METERING_STATUS_OPTIONS: Array<{ value: OperationsMeteringStatus; label: string }> = [
  { value: "active", label: OPERATIONS_METERING_STATUS_LABELS.active },
  { value: "inactive", label: OPERATIONS_METERING_STATUS_LABELS.inactive },
];

const METERING_PROTOCOL_LABELS: Record<OperationsModelMeteringProtocol, string> = {
  openai: "OpenAI 兼容",
  claude: "Claude 兼容",
};

const METERING_PROTOCOL_ORDER: OperationsModelMeteringProtocol[] = ["openai", "claude"];

type ProtocolCostField =
  | "inputCostPerMillion"
  | "cachedInputCostPerMillion"
  | "cacheCreationCostPerMillion"
  | "cacheReadCostPerMillion"
  | "outputCostPerMillion";

const createEmptyProtocolConfig = (
  protocol: OperationsModelMeteringProtocol,
): OperationsModelProtocolCostConfig => {
  if (protocol === "openai") {
    return {
      protocol,
      inputCostPerMillion: 0,
      cachedInputCostPerMillion: 0,
      outputCostPerMillion: 0,
      inputSalePricePerMillion: 0,
      cachedInputSalePricePerMillion: 0,
      outputSalePricePerMillion: 0,
    };
  }

  return {
    protocol,
    inputCostPerMillion: 0,
    cacheCreationCostPerMillion: 0,
    cacheReadCostPerMillion: 0,
    outputCostPerMillion: 0,
    inputSalePricePerMillion: 0,
    cacheCreationSalePricePerMillion: 0,
    cacheReadSalePricePerMillion: 0,
    outputSalePricePerMillion: 0,
  };
};

const normalizeProtocolConfigs = (
  protocolConfigs: OperationsModelProtocolCostConfig[],
): OperationsModelProtocolCostConfig[] => {
  const configByProtocol = new Map(protocolConfigs.map(config => [config.protocol, config]));

  return METERING_PROTOCOL_ORDER.map(protocol => {
    const fallbackConfig = createEmptyProtocolConfig(protocol);
    const storedConfig = configByProtocol.get(protocol);

    return storedConfig ? { ...fallbackConfig, ...storedConfig } : fallbackConfig;
  });
};

const createEmptyModelEditorForm = (): OperationsModelServiceForm => ({
  providerId: "",
  modelCode: "",
  modelName: "",
  protocolConfigs: METERING_PROTOCOL_ORDER.map(createEmptyProtocolConfig),
  pricingMode: "markup",
  markupRate: 1.3,
  grossMarginRate: 30,
  status: "active",
});

const buildStatusClassName = (status: OperationsMeteringStatus): string =>
  classNames(adminStyles.consoleStatusTag, {
    [adminStyles.consoleStatusTagSuccess]: status === "active",
    [adminStyles.consoleStatusTagWarning]: status === "inactive",
  });

const modelToForm = (model: OperationsModelService): OperationsModelServiceForm => ({
  providerId: model.providerId,
  modelCode: model.modelCode,
  modelName: model.modelName,
  protocolConfigs: normalizeProtocolConfigs(model.protocolConfigs).map(config =>
    calculateProtocolPricePreview(config, model.markupRate),
  ),
  pricingMode: "markup",
  markupRate: model.markupRate,
  grossMarginRate: model.grossMarginRate,
  status: model.status,
});

const calculateProtocolPricePreview = (
  config: OperationsModelProtocolCostConfig,
  markupRate: number,
): OperationsModelProtocolCostConfig => {
  if (config.protocol === "openai") {
    return {
      ...config,
      inputSalePricePerMillion: calculateOperationsSalePrice(
        config.inputCostPerMillion,
        "markup",
        markupRate,
        0,
        0,
      ),
      cachedInputSalePricePerMillion: calculateOperationsSalePrice(
        config.cachedInputCostPerMillion,
        "markup",
        markupRate,
        0,
        0,
      ),
      outputSalePricePerMillion: calculateOperationsSalePrice(
        config.outputCostPerMillion,
        "markup",
        markupRate,
        0,
        0,
      ),
    };
  }

  return {
    ...config,
    inputSalePricePerMillion: calculateOperationsSalePrice(
      config.inputCostPerMillion,
      "markup",
      markupRate,
      0,
      0,
    ),
    cacheCreationSalePricePerMillion: calculateOperationsSalePrice(
      config.cacheCreationCostPerMillion,
      "markup",
      markupRate,
      0,
      0,
    ),
    cacheReadSalePricePerMillion: calculateOperationsSalePrice(
      config.cacheReadCostPerMillion,
      "markup",
      markupRate,
      0,
      0,
    ),
    outputSalePricePerMillion: calculateOperationsSalePrice(
      config.outputCostPerMillion,
      "markup",
      markupRate,
      0,
      0,
    ),
  };
};

const updateProtocolCostConfig = (
  config: OperationsModelProtocolCostConfig,
  field: ProtocolCostField,
  value: number,
): OperationsModelProtocolCostConfig => {
  if (config.protocol === "openai") {
    if (
      field === "inputCostPerMillion" ||
      field === "cachedInputCostPerMillion" ||
      field === "outputCostPerMillion"
    ) {
      return { ...config, [field]: value };
    }

    return config;
  }

  if (
    field === "inputCostPerMillion" ||
    field === "cacheCreationCostPerMillion" ||
    field === "cacheReadCostPerMillion" ||
    field === "outputCostPerMillion"
  ) {
    return { ...config, [field]: value };
  }

  return config;
};

/**
 * 运营后台资源池控制台，维护系统预置模型的成本和计量价。
 */
export const OperationsResourceMeteringConsole = ({
  meteringProviders,
  modelServices,
  onUpdateModelService,
}: OperationsResourceMeteringConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [modelEditor, setModelEditor] = useState<ModelEditorState>({
    form: createEmptyModelEditorForm(),
    open: false,
  });

  const providerNameById = useMemo(
    () => new Map(meteringProviders.map(provider => [provider.id, provider.name])),
    [meteringProviders],
  );
  const currentEditingModel = useMemo(
    () => modelServices.find(model => model.id === modelEditor.modelId),
    [modelEditor.modelId, modelServices],
  );
  const filteredModels = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return modelServices;
    }

    return modelServices.filter(model => {
      const searchText = [
        model.modelName,
        model.modelCode,
        providerNameById.get(model.providerId) ?? "",
        ...normalizeProtocolConfigs(model.protocolConfigs).map(
          config => METERING_PROTOCOL_LABELS[config.protocol],
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedKeyword);
    });
  }, [keyword, modelServices, providerNameById]);

  const validateModelForm = (): boolean => {
    if (!modelEditor.modelId) {
      message.warning("请选择模型。");
      return false;
    }

    if (!modelEditor.form.modelName.trim()) {
      message.warning("请填写显示名称。");
      return false;
    }

    if (modelEditor.form.markupRate < 1) {
      message.warning("成本倍率不能小于 1。");
      return false;
    }

    if (normalizeProtocolConfigs(modelEditor.form.protocolConfigs).length !== METERING_PROTOCOL_ORDER.length) {
      message.warning("请补全协议成本配置。");
      return false;
    }

    return true;
  };

  const handleProtocolCostChange = (
    protocol: OperationsModelMeteringProtocol,
    field: ProtocolCostField,
    value: number,
  ): void => {
    setModelEditor(current => ({
      ...current,
      form: {
        ...current.form,
        protocolConfigs: normalizeProtocolConfigs(current.form.protocolConfigs).map(config =>
          config.protocol === protocol ? updateProtocolCostConfig(config, field, value) : config,
        ),
      },
    }));
  };

  const handleOpenEditModel = (model: OperationsModelService): void => {
    setModelEditor({
      form: modelToForm(model),
      modelId: model.id,
      open: true,
    });
  };

  const handleCloseModelEditor = (): void => {
    setModelEditor({
      form: createEmptyModelEditorForm(),
      open: false,
    });
  };

  const handleConfirmModel = (): void => {
    if (!validateModelForm()) {
      return;
    }

    const editingModelId = modelEditor.modelId;

    if (!editingModelId) {
      return;
    }

    onUpdateModelService(editingModelId, {
      ...modelEditor.form,
      protocolConfigs: normalizeProtocolConfigs(modelEditor.form.protocolConfigs),
      pricingMode: "markup",
    });
    message.success("模型配置已更新。");

    handleCloseModelEditor();
  };

  const renderProtocolCostEditor = (
    config: OperationsModelProtocolCostConfig,
  ): JSX.Element => {
    const preview = calculateProtocolPricePreview(config, modelEditor.form.markupRate);

    return (
      <section key={config.protocol} className={styles.modelProtocolCostCard}>
        <div className={styles.modelProtocolCostHeader}>
          <strong>{METERING_PROTOCOL_LABELS[config.protocol]}</strong>
        </div>
        <div className={styles.modelProtocolCostGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>普通输入成本 / 百万 Tokens</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
              value={config.inputCostPerMillion}
              onChange={value =>
                handleProtocolCostChange(
                  config.protocol,
                  "inputCostPerMillion",
                  Number(value ?? 0),
                )
              }
            />
          </div>
          {config.protocol === "openai" ? (
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>缓存命中输入成本 / 百万 Tokens</span>
              <InputNumber
                className={styles.fullWidthInput}
                min={0}
                value={config.cachedInputCostPerMillion}
                onChange={value =>
                  handleProtocolCostChange(
                    config.protocol,
                    "cachedInputCostPerMillion",
                    Number(value ?? 0),
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>Cache 写入成本 / 百万 Tokens</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
                  value={config.cacheCreationCostPerMillion}
                  onChange={value =>
                    handleProtocolCostChange(
                      config.protocol,
                      "cacheCreationCostPerMillion",
                      Number(value ?? 0),
                    )
                  }
                />
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>Cache 读取成本 / 百万 Tokens</span>
                <InputNumber
                  className={styles.fullWidthInput}
                  min={0}
                  value={config.cacheReadCostPerMillion}
                  onChange={value =>
                    handleProtocolCostChange(
                      config.protocol,
                      "cacheReadCostPerMillion",
                      Number(value ?? 0),
                    )
                  }
                />
              </div>
            </>
          )}
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>输出成本 / 百万 Tokens</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
              value={config.outputCostPerMillion}
              onChange={value =>
                handleProtocolCostChange(
                  config.protocol,
                  "outputCostPerMillion",
                  Number(value ?? 0),
                )
              }
            />
          </div>
        </div>
        <div className={adminStyles.consolePillRow}>
          <span className={adminStyles.consolePill}>
            普通输入 {formatOperationsCurrency(preview.inputSalePricePerMillion)}
          </span>
          {preview.protocol === "openai" ? (
            <span className={adminStyles.consolePill}>
              缓存命中输入 {formatOperationsCurrency(preview.cachedInputSalePricePerMillion)}
            </span>
          ) : (
            <>
              <span className={adminStyles.consolePill}>
                Cache 写入 {formatOperationsCurrency(preview.cacheCreationSalePricePerMillion)}
              </span>
              <span className={adminStyles.consolePill}>
                Cache 读取 {formatOperationsCurrency(preview.cacheReadSalePricePerMillion)}
              </span>
            </>
          )}
          <span className={adminStyles.consolePill}>
            输出 {formatOperationsCurrency(preview.outputSalePricePerMillion)}
          </span>
        </div>
      </section>
    );
  };

  const renderModelProviders = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>模型列表</h2>
        </div>
        <div className={adminStyles.consoleInlineActions}>
          <Input
            allowClear
            className={adminStyles.consoleInlineSearch}
            placeholder="搜索模型名称、模型 ID 或服务商"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
          />
        </div>
      </div>

      {filteredModels.length ? (
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>模型名称</th>
                <th>模型 ID</th>
                <th>支持协议</th>
                <th>状态</th>
                <th>最近更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map(model => (
                <tr key={model.id}>
                  <td>
                    <div className={adminStyles.consoleHtmlTableStrong}>{model.modelName}</div>
                    <div className={adminStyles.consoleSectionMeta}>
                      {providerNameById.get(model.providerId) ?? "未配置服务商"}
                    </div>
                  </td>
                  <td>{model.modelCode}</td>
                  <td>
                    <div className={adminStyles.consolePillRow}>
                      {normalizeProtocolConfigs(model.protocolConfigs).map(config => (
                        <span key={config.protocol} className={adminStyles.consolePill}>
                          {METERING_PROTOCOL_LABELS[config.protocol]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={buildStatusClassName(model.status)}>
                      {OPERATIONS_METERING_STATUS_LABELS[model.status]}
                    </span>
                  </td>
                  <td>{model.updatedAt}</td>
                  <td>
                    <div className={adminStyles.consoleActions}>
                      <Button size="small" onClick={() => handleOpenEditModel(model)}>
                        配置
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty description="暂无模型配置。" />
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

      {renderModelProviders()}

      <Modal
        destroyOnHidden
        open={modelEditor.open}
        title="配置模型"
        width={920}
        onCancel={handleCloseModelEditor}
        footer={
          <div className={styles.modelEditorFooterActions}>
            <Button onClick={handleCloseModelEditor}>取消</Button>
            <Button type="primary" onClick={handleConfirmModel}>
              确定
            </Button>
          </div>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.modelSystemFields}>
            <div className={styles.modelSystemField}>
              <span className={styles.modelSystemFieldLabel}>服务商</span>
              <strong>
                {providerNameById.get(modelEditor.form.providerId) ??
                  currentEditingModel?.providerId ??
                  "-"}
              </strong>
            </div>
            <div className={styles.modelSystemField}>
              <span className={styles.modelSystemFieldLabel}>模型 ID</span>
              <strong>{modelEditor.form.modelCode || "-"}</strong>
            </div>
            <div className={styles.modelSystemField}>
              <span className={styles.modelSystemFieldLabel}>支持协议</span>
              <strong>
                {normalizeProtocolConfigs(modelEditor.form.protocolConfigs)
                  .map(config => METERING_PROTOCOL_LABELS[config.protocol])
                  .join(" / ")}
              </strong>
            </div>
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>显示名称</span>
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
            <span className={styles.modalLabel}>成本倍率（x）</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={1}
              value={modelEditor.form.markupRate}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, markupRate: Number(value ?? 1), pricingMode: "markup" },
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
          {normalizeProtocolConfigs(modelEditor.form.protocolConfigs).map(renderProtocolCostEditor)}
        </div>
      </Modal>
    </div>
  );
};
