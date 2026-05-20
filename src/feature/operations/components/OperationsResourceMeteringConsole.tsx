import { useMemo, useState } from "react";

import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import {
  OPERATIONS_METERING_STATUS_LABELS,
  OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS,
  OPERATIONS_MODEL_MODALITY_LABELS,
  createEmptyOperationsModelServiceForm,
} from "@/feature/operations/mockData";
import {
  calculateOperationsSalePrice,
  formatOperationsCurrency,
} from "@/feature/operations/serviceMeteringUtils";
import type {
  OperationsMeteringProvider,
  OperationsMeteringStatus,
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
  mode: "create" | "edit";
  modelId?: string;
  open: boolean;
}

const METERING_STATUS_OPTIONS: Array<{ value: OperationsMeteringStatus; label: string }> = [
  { value: "active", label: OPERATIONS_METERING_STATUS_LABELS.active },
  { value: "inactive", label: OPERATIONS_METERING_STATUS_LABELS.inactive },
];

const buildStatusClassName = (status: OperationsMeteringStatus): string =>
  classNames(adminStyles.consoleStatusTag, {
    [adminStyles.consoleStatusTagSuccess]: status === "active",
    [adminStyles.consoleStatusTagWarning]: status === "inactive",
  });

const formatBooleanLabel = (value: boolean): string => (value ? "支持" : "不支持");

const isVisionModel = (model: Pick<OperationsModelService, "modality">): boolean =>
  model.modality === "multimodal" || model.modality === "image";

const modelToForm = (model: OperationsModelService): OperationsModelServiceForm => ({
  providerId: model.providerId,
  modelCode: model.modelCode,
  modelName: model.modelName,
  interfaceFormat: model.interfaceFormat,
  modality: model.modality,
  reasoningEnabled: model.reasoningEnabled,
  inputCostPerMillion: model.inputCostPerMillion,
  outputCostPerMillion: model.outputCostPerMillion,
  pricingMode: "markup",
  markupRate: model.markupRate,
  grossMarginRate: model.grossMarginRate,
  inputSalePricePerMillion: calculateOperationsSalePrice(
    model.inputCostPerMillion,
    "markup",
    model.markupRate,
    0,
    0,
  ),
  outputSalePricePerMillion: calculateOperationsSalePrice(
    model.outputCostPerMillion,
    "markup",
    model.markupRate,
    0,
    0,
  ),
  status: model.status,
});

const createModelForm = (providerId: string): OperationsModelServiceForm => ({
  ...createEmptyOperationsModelServiceForm(),
  providerId,
});

/**
 * 运营后台资源池控制台，维护模型资源和对应成本售价。
 */
export const OperationsResourceMeteringConsole = ({
  meteringProviders,
  modelServices,
  onUpdateModelService,
}: OperationsResourceMeteringConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [modelEditor, setModelEditor] = useState<ModelEditorState>({
    form: createModelForm(""),
    mode: "create",
    open: false,
  });

  const largeModelProviders = useMemo(
    () => meteringProviders.filter(provider => provider.providerKind === "largeModel"),
    [meteringProviders],
  );
  const providerOptions = largeModelProviders.map(provider => ({
    value: provider.id,
    label: provider.name,
  }));
  const filteredModels = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return modelServices;
    }

    return modelServices.filter(model => {
      const searchText = [
        model.modelName,
        model.modelCode,
        model.providerName,
        OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS[model.interfaceFormat],
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedKeyword);
    });
  }, [keyword, modelServices]);
  const modelPricePreview = useMemo(
    () => ({
      input: calculateOperationsSalePrice(
        modelEditor.form.inputCostPerMillion,
        "markup",
        modelEditor.form.markupRate,
        0,
        0,
      ),
      output: calculateOperationsSalePrice(
        modelEditor.form.outputCostPerMillion,
        "markup",
        modelEditor.form.markupRate,
        0,
        0,
      ),
    }),
    [
      modelEditor.form.inputCostPerMillion,
      modelEditor.form.markupRate,
      modelEditor.form.outputCostPerMillion,
    ],
  );
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
    if (!modelEditor.form.modelName.trim()) {
      message.warning("请填写模型名称。");
      return;
    }

    if (modelEditor.mode === "edit" && modelEditor.modelId) {
      onUpdateModelService(modelEditor.modelId, {
        ...modelEditor.form,
        pricingMode: "markup",
      });
      message.success("模型资源已更新。");
    }

    handleCloseModelEditor();
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
                <th>服务商</th>
                <th>视觉</th>
                <th>推理</th>
                <th>输入成本 / 百万 Tokens</th>
                <th>输出成本 / 百万 Tokens</th>
                <th>销售策略</th>
                <th>售价 / 百万 Tokens</th>
                <th>状态</th>
                <th>最近更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map(model => (
                <tr key={model.id}>
                  <td className={adminStyles.consoleHtmlTableStrong}>{model.modelName}</td>
                  <td>{model.modelCode}</td>
                  <td>{model.providerName}</td>
                  <td>{formatBooleanLabel(isVisionModel(model))}</td>
                  <td>{formatBooleanLabel(model.reasoningEnabled)}</td>
                  <td>{formatOperationsCurrency(model.inputCostPerMillion)}</td>
                  <td>{formatOperationsCurrency(model.outputCostPerMillion)}</td>
                  <td>倍率 {model.markupRate.toLocaleString("zh-CN")}x</td>
                  <td>
                    输入{" "}
                    {formatOperationsCurrency(
                      calculateOperationsSalePrice(
                        model.inputCostPerMillion,
                        "markup",
                        model.markupRate,
                        0,
                        0,
                      ),
                    )}
                    <br />
                    输出{" "}
                    {formatOperationsCurrency(
                      calculateOperationsSalePrice(
                        model.outputCostPerMillion,
                        "markup",
                        model.markupRate,
                        0,
                        0,
                      ),
                    )}
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
        title={modelEditor.mode === "edit" ? "配置模型" : "添加模型"}
        width={920}
        onCancel={handleCloseModelEditor}
        onOk={handleConfirmModel}
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型服务商</span>
            <Input
              disabled
              value={
                providerOptions.find(item => item.value === modelEditor.form.providerId)?.label ??
                "-"
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
              disabled
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
            <Input
              disabled
              value={OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS[modelEditor.form.interfaceFormat]}
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>视觉</span>
            <Input disabled value={formatBooleanLabel(isVisionModel(modelEditor.form))} />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>推理</span>
            <Input disabled value={formatBooleanLabel(modelEditor.form.reasoningEnabled)} />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型类型</span>
            <Input disabled value={OPERATIONS_MODEL_MODALITY_LABELS[modelEditor.form.modality]} />
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
              disabled
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
    </div>
  );
};
