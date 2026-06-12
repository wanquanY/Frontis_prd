import { useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Input, InputNumber, Modal, Select, Switch, message } from "antd";
import classNames from "classnames";

import { OPERATIONS_METERING_STATUS_LABELS } from "@/feature/operations/mockData";
import {
  calculateOperationsSalePrice,
  formatOperationsCurrency,
} from "@/feature/operations/serviceMeteringUtils";
import type {
  OperationsMeteringStatus,
  OperationsModelMeteringProtocol,
  OperationsModelRegion,
  OperationsModelService,
  OperationsModelServiceForm,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

interface OperationsResourceMeteringConsoleProps {
  modelServices: OperationsModelService[];
  onCreateModelService: (form: OperationsModelServiceForm) => void;
  onUpdateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
}

interface ModelEditorState {
  form: OperationsModelServiceForm;
  mode: "create" | "edit";
  modelId?: string;
  open: boolean;
}

const INTERFACE_FORMAT_LABELS: Record<OperationsModelMeteringProtocol, string> = {
  openai: "OpenAI",
  claude: "Claude",
};

const INTERFACE_FORMAT_OPTIONS: Array<{
  value: OperationsModelMeteringProtocol;
  label: string;
}> = (["openai", "claude"] as OperationsModelMeteringProtocol[]).map(protocol => ({
  value: protocol,
  label: INTERFACE_FORMAT_LABELS[protocol],
}));

const MODEL_REGION_LABELS: Record<OperationsModelRegion, string> = {
  domestic: "国内模型",
  overseas: "国外模型",
};

const MODEL_REGION_OPTIONS: Array<{ value: OperationsModelRegion; label: string }> = (
  ["domestic", "overseas"] as OperationsModelRegion[]
).map(region => ({
  value: region,
  label: MODEL_REGION_LABELS[region],
}));

const createEmptyModelEditorForm = (): OperationsModelServiceForm => ({
  modelCode: "",
  modelName: "",
  modelRegion: "domestic",
  modelValue: "",
  interfaceFormat: "openai",
  inputCostPerMillion: 0,
  cacheCostPerMillion: 0,
  outputCostPerMillion: 0,
  pricingMode: "markup",
  markupRate: 1.4,
  grossMarginRate: 30,
  inputSalePricePerMillion: 0,
  cacheSalePricePerMillion: 0,
  outputSalePricePerMillion: 0,
  sortOrder: 10,
  status: "active",
});

const buildStatusClassName = (status: OperationsMeteringStatus): string =>
  classNames(adminStyles.consoleStatusTag, {
    [adminStyles.consoleStatusTagSuccess]: status === "active",
    [adminStyles.consoleStatusTagWarning]: status === "inactive",
  });

const modelToForm = (model: OperationsModelService): OperationsModelServiceForm => ({
  modelCode: model.modelCode,
  modelName: model.modelName,
  modelRegion: model.modelRegion,
  modelValue: model.modelValue,
  interfaceFormat: model.interfaceFormat,
  inputCostPerMillion: model.inputCostPerMillion,
  cacheCostPerMillion: model.cacheCostPerMillion,
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
  cacheSalePricePerMillion: calculateOperationsSalePrice(
    model.cacheCostPerMillion,
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
  sortOrder: model.sortOrder,
  status: model.status,
});

const calculateModelPricePreview = (
  form: OperationsModelServiceForm,
): Pick<
  OperationsModelServiceForm,
  "inputSalePricePerMillion" | "cacheSalePricePerMillion" | "outputSalePricePerMillion"
> => ({
  inputSalePricePerMillion: calculateOperationsSalePrice(
    form.inputCostPerMillion,
    "markup",
    form.markupRate,
    0,
    0,
  ),
  cacheSalePricePerMillion: calculateOperationsSalePrice(
    form.cacheCostPerMillion,
    "markup",
    form.markupRate,
    0,
    0,
  ),
  outputSalePricePerMillion: calculateOperationsSalePrice(
    form.outputCostPerMillion,
    "markup",
    form.markupRate,
    0,
    0,
  ),
});

/**
 * 运营后台资源池控制台，维护大模型资源的成本和计量价。
 */
export const OperationsResourceMeteringConsole = ({
  modelServices,
  onCreateModelService,
  onUpdateModelService,
}: OperationsResourceMeteringConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [modelEditor, setModelEditor] = useState<ModelEditorState>({
    form: createEmptyModelEditorForm(),
    mode: "create",
    open: false,
  });

  const sortedModels = useMemo(
    () =>
      [...modelServices].sort((leftModel, rightModel) => {
        if (leftModel.sortOrder !== rightModel.sortOrder) {
          return leftModel.sortOrder - rightModel.sortOrder;
        }

        return leftModel.modelName.localeCompare(rightModel.modelName, "zh-CN");
      }),
    [modelServices],
  );

  const filteredModels = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return sortedModels;
    }

    return sortedModels.filter(model => {
      const searchText = [
        model.modelName,
        model.modelCode,
        MODEL_REGION_LABELS[model.modelRegion],
        model.modelValue,
        INTERFACE_FORMAT_LABELS[model.interfaceFormat],
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedKeyword);
    });
  }, [keyword, sortedModels]);

  const validateModelForm = (): boolean => {
    if (!modelEditor.form.modelName.trim()) {
      message.warning("请填写模型名称。");
      return false;
    }

    if (!modelEditor.form.modelCode.trim()) {
      message.warning("请填写模型 ID。");
      return false;
    }

    if (!modelEditor.form.modelRegion) {
      message.warning("请选择模型区域。");
      return false;
    }

    if (!modelEditor.form.modelValue.trim()) {
      message.warning("请填写模型值。");
      return false;
    }

    if (modelEditor.form.markupRate < 1) {
      message.warning("成本倍率不能小于 1。");
      return false;
    }

    if (modelEditor.form.sortOrder < 0) {
      message.warning("排序不能小于 0。");
      return false;
    }

    const hasDuplicateModel = modelServices.some(model => {
      const isSameRecord = modelEditor.mode === "edit" && model.id === modelEditor.modelId;

      return (
        !isSameRecord &&
        model.modelCode.trim().toLowerCase() === modelEditor.form.modelCode.trim().toLowerCase()
      );
    });

    if (hasDuplicateModel) {
      message.warning("已存在相同模型 ID。");
      return false;
    }

    return true;
  };

  const handleOpenCreateModel = (): void => {
    setModelEditor({
      form: createEmptyModelEditorForm(),
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
      form: createEmptyModelEditorForm(),
      mode: "create",
      open: false,
    });
  };

  const handleConfirmModel = (): void => {
    if (!validateModelForm()) {
      return;
    }

    const nextForm = {
      ...modelEditor.form,
      pricingMode: "markup" as const,
    };

    if (modelEditor.mode === "create") {
      onCreateModelService(nextForm);
      message.success("模型已添加。");
    } else if (modelEditor.modelId) {
      onUpdateModelService(modelEditor.modelId, nextForm);
      message.success("模型配置已更新。");
    }

    handleCloseModelEditor();
  };

  const modelPricePreview = calculateModelPricePreview(modelEditor.form);

  const renderModelProviders = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>模型列表</h2>
        </div>
        <div className={adminStyles.consoleInlineActions}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModel}>
            新增模型
          </Button>
          <Input
            allowClear
            className={adminStyles.consoleInlineSearch}
            placeholder="搜索模型名称、模型 ID 或模型值"
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
                <th>接口格式</th>
                <th>模型区域</th>
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
                    <div className={adminStyles.consoleSectionMeta}>{model.modelValue}</div>
                  </td>
                  <td>{model.modelCode}</td>
                  <td>
                    <div className={adminStyles.consolePillRow}>
                      <span className={adminStyles.consolePill}>
                        {INTERFACE_FORMAT_LABELS[model.interfaceFormat]}
                      </span>
                    </div>
                  </td>
                  <td>{MODEL_REGION_LABELS[model.modelRegion]}</td>
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
        title={modelEditor.mode === "create" ? "创建模型" : "配置模型"}
        width={920}
        onCancel={handleCloseModelEditor}
        footer={
          <div className={styles.modelEditorFooterActions}>
            <Button onClick={() => message.success("模型测试通过。")}>测试模型</Button>
            <Button onClick={handleCloseModelEditor}>取消</Button>
            <Button type="primary" onClick={handleConfirmModel}>
              确定
            </Button>
          </div>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型名称</span>
            <Input
              showCount
              maxLength={48}
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
              placeholder="请输入模型 ID"
              onChange={event =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modelCode: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型区域</span>
            <Select<OperationsModelRegion>
              value={modelEditor.form.modelRegion}
              options={MODEL_REGION_OPTIONS}
              placeholder="请选择模型区域"
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modelRegion: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型值</span>
            <Input
              value={modelEditor.form.modelValue}
              placeholder="如 gpt-4.1,gpt-4.1-2025-04-14"
              onChange={event =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modelValue: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>接口格式</span>
            <Select<OperationsModelMeteringProtocol>
              value={modelEditor.form.interfaceFormat}
              options={INTERFACE_FORMAT_OPTIONS}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, interfaceFormat: value },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>状态</span>
            <Switch
              checked={modelEditor.form.status === "active"}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={checked =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, status: checked ? "active" : "inactive" },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>输入成本 / 百万 Tokens</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
              precision={4}
              value={modelEditor.form.inputCostPerMillion}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: {
                    ...current.form,
                    inputCostPerMillion: Number(value ?? 0),
                    pricingMode: "markup",
                  },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>缓存成本 / 百万 Tokens</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
              precision={4}
              value={modelEditor.form.cacheCostPerMillion}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: {
                    ...current.form,
                    cacheCostPerMillion: Number(value ?? 0),
                    pricingMode: "markup",
                  },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>输出成本 / 百万 Tokens</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
              precision={4}
              value={modelEditor.form.outputCostPerMillion}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: {
                    ...current.form,
                    outputCostPerMillion: Number(value ?? 0),
                    pricingMode: "markup",
                  },
                }))
              }
            />
          </div>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>成本倍率（x）</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={1}
              precision={4}
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
            <span className={styles.modalLabel}>排序</span>
            <InputNumber
              className={styles.fullWidthInput}
              min={0}
              precision={0}
              value={modelEditor.form.sortOrder}
              onChange={value =>
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, sortOrder: Number(value ?? 0) },
                }))
              }
            />
          </div>
          <div className={styles.formGridWide}>
            <div className={styles.modelPricePreview}>
              <div className={styles.modelPricePreviewTitle}>售价预览</div>
              <div>输入 {formatOperationsCurrency(modelPricePreview.inputSalePricePerMillion)}</div>
              <div>缓存 {formatOperationsCurrency(modelPricePreview.cacheSalePricePerMillion)}</div>
              <div>
                输出 {formatOperationsCurrency(modelPricePreview.outputSalePricePerMillion)}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
