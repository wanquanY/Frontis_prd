import { useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";

import {
  OPERATIONS_METERING_STATUS_LABELS,
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
  onCreateModelService: (form: OperationsModelServiceForm) => void;
  onUpdateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
}

interface ModelEditorState {
  form: OperationsModelServiceForm;
  mode: "create" | "edit";
  modelId?: string;
  open: boolean;
}

interface ModelTestState {
  loading: boolean;
  message: string;
  status: "idle" | "success" | "error";
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

const modelToForm = (model: OperationsModelService): OperationsModelServiceForm => ({
  providerId: model.providerId,
  modelCode: model.modelCode,
  modelName: model.modelName,
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
  onCreateModelService,
  onUpdateModelService,
}: OperationsResourceMeteringConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [modelEditor, setModelEditor] = useState<ModelEditorState>({
    form: createModelForm(""),
    mode: "create",
    open: false,
  });
  const [modelTest, setModelTest] = useState<ModelTestState>({
    loading: false,
    message: "",
    status: "idle",
  });

  const largeModelProviders = useMemo(
    () => meteringProviders.filter(provider => provider.providerKind === "largeModel"),
    [meteringProviders],
  );
  const filteredModels = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return modelServices;
    }

    return modelServices.filter(model => {
      const searchText = [model.modelName, model.modelCode].join(" ").toLowerCase();

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
  const resetModelTest = (): void => {
    setModelTest({
      loading: false,
      message: "",
      status: "idle",
    });
  };

  const validateModelForm = (): boolean => {
    if (!modelEditor.form.providerId) {
      message.warning("请先配置大模型服务商。");
      return false;
    }

    if (!modelEditor.form.modelName.trim()) {
      message.warning("请填写模型名称。");
      return false;
    }

    if (!modelEditor.form.modelCode.trim()) {
      message.warning("请填写模型 ID。");
      return false;
    }

    const hasDuplicateModel = modelServices.some(model => {
      const isSameRecord = modelEditor.mode === "edit" && model.id === modelEditor.modelId;

      return (
        !isSameRecord &&
        model.providerId === modelEditor.form.providerId &&
        model.modelCode.trim().toLowerCase() === modelEditor.form.modelCode.trim().toLowerCase()
      );
    });

    if (hasDuplicateModel) {
      message.warning("该服务商下已存在相同模型 ID。");
      return false;
    }

    return true;
  };

  const handleOpenCreateModel = (): void => {
    const defaultProviderId =
      largeModelProviders.find(provider => provider.status === "active")?.id ??
      largeModelProviders[0]?.id ??
      "";

    if (!defaultProviderId) {
      message.warning("请先配置大模型服务商。");
      return;
    }

    setModelEditor({
      form: createModelForm(defaultProviderId),
      mode: "create",
      open: true,
    });
    resetModelTest();
  };

  const handleOpenEditModel = (model: OperationsModelService): void => {
    setModelEditor({
      form: modelToForm(model),
      mode: "edit",
      modelId: model.id,
      open: true,
    });
    resetModelTest();
  };

  const handleCloseModelEditor = (): void => {
    setModelEditor({
      form: createModelForm(""),
      mode: "create",
      open: false,
    });
    resetModelTest();
  };

  const handleTestModel = (): void => {
    if (!validateModelForm()) {
      return;
    }

    const selectedProvider = largeModelProviders.find(
      provider => provider.id === modelEditor.form.providerId,
    );

    if (!selectedProvider) {
      setModelTest({
        loading: false,
        message: "测试失败：未找到模型服务商。",
        status: "error",
      });
      return;
    }

    setModelTest({
      loading: true,
      message: "正在测试模型调用...",
      status: "idle",
    });

    window.setTimeout(() => {
      if (selectedProvider.status !== "active") {
        setModelTest({
          loading: false,
          message: "测试失败：模型服务商已停用。",
          status: "error",
        });
        return;
      }

      if (!selectedProvider.baseUrl.trim()) {
        setModelTest({
          loading: false,
          message: "测试失败：模型服务商 Base URL 未配置。",
          status: "error",
        });
        return;
      }

      if (!selectedProvider.credentialStatusLabel.trim()) {
        setModelTest({
          loading: false,
          message: "测试失败：模型服务商凭证状态未配置。",
          status: "error",
        });
        return;
      }

      setModelTest({
        loading: false,
        message: `测试通过：${modelEditor.form.modelName.trim()} 可正常调用。`,
        status: "success",
      });
    }, 720);
  };

  const handleConfirmModel = (): void => {
    if (!validateModelForm()) {
      return;
    }

    if (modelEditor.mode === "edit" && modelEditor.modelId) {
      onUpdateModelService(modelEditor.modelId, {
        ...modelEditor.form,
        pricingMode: "markup",
      });
      message.success("模型资源已更新。");
    } else {
      onCreateModelService({
        ...modelEditor.form,
        pricingMode: "markup",
      });
      message.success("模型资源已添加。");
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
            placeholder="搜索模型名称或模型 ID"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModel}>
            添加模型
          </Button>
        </div>
      </div>

      {filteredModels.length ? (
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>模型名称</th>
                <th>模型 ID</th>
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
        footer={
          <div className={styles.modelEditorFooter}>
            <div className={styles.modelEditorTestResult}>
              {modelTest.status !== "idle" || modelTest.message ? (
                <span
                  className={classNames(adminStyles.consoleStatusTag, {
                    [adminStyles.consoleStatusTagSuccess]: modelTest.status === "success",
                    [adminStyles.consoleStatusTagWarning]:
                      modelTest.status === "idle" || modelTest.status === "error",
                  })}
                >
                  {modelTest.message}
                </span>
              ) : null}
            </div>
            <div className={styles.modelEditorFooterActions}>
              <Button loading={modelTest.loading} onClick={handleTestModel}>
                测试模型
              </Button>
              <Button onClick={handleCloseModelEditor}>取消</Button>
              <Button type="primary" onClick={handleConfirmModel}>
                确定
              </Button>
            </div>
          </div>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>模型 ID</span>
            <Input
              value={modelEditor.form.modelCode}
              placeholder="例如 gpt-4.1"
              onChange={event => {
                setModelEditor(current => ({
                  ...current,
                  form: { ...current.form, modelCode: event.target.value },
                }));
                resetModelTest();
              }}
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
