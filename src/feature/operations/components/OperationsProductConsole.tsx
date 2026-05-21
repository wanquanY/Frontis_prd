import { useCallback, useEffect, useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Input, InputNumber, Modal, QRCode, Select, Switch, message } from "antd";
import classNames from "classnames";

import {
  OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
} from "@/feature/operations/mockData";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentPlazaVisibility,
  OperationsAgentSubmission,
  OperationsProduct,
  OperationsProductForm,
  OperationsServiceContactConfig,
  OperationsSkillCenterCategoryOption,
  OperationsTenant,
} from "@/feature/operations/types";
import type {
  MockPointsPackageInput,
  MockPointsPackageOption,
  MockPointsPackageUpdate,
} from "@/feature/points/types";
import type {
  MockSubscriptionPlanKey,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
} from "@/feature/subscription/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import {
  OperationsPointsPackagePanel,
  OperationsSeatPackagePanel,
} from "./OperationsProductPackagePanels";
import styles from "./OperationsPlatformView.module.less";

type ProductConsoleTabKey = "delivery" | "pointsPackage" | "seatPackage" | "category" | "contact";
type ProductAcquisitionMode = "freeAdd" | "trial" | "contactSupport";
type CategoryManagementScope = "expertPlaza" | "skillCenter";

interface CatalogCategoryListItem {
  id: string;
  name: string;
  sortOrder: number;
  status: "active" | "inactive";
  updatedAt: string;
}

interface ProductEditorState {
  open: boolean;
  mode: "create" | "edit";
  productId?: string;
  form: OperationsProductForm;
}

interface CatalogCategoryEditorState {
  open: boolean;
  mode: "create" | "edit";
  categoryId?: string;
  name: string;
  sortOrder: number;
}

export interface OperationsProductConsoleProps {
  approvedAgents: OperationsAgentSubmission[];
  categories: OperationsAgentPlazaCategoryOption[];
  emptyProductForm: OperationsProductForm;
  productId?: string;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  pointsPackages: MockPointsPackageOption[];
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  productTrialUnitOptions: Array<{
    value: NonNullable<OperationsProduct["trialUnit"]>;
    label: string;
  }>;
  products: OperationsProduct[];
  serviceContactConfig: OperationsServiceContactConfig;
  skillCategories: OperationsSkillCenterCategoryOption[];
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  tenants: OperationsTenant[];
  onBackToProductList: () => void;
  onCreateCategory: (
    payload: Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder">,
  ) => void;
  onCreatePointsPackage: (payload: MockPointsPackageInput) => void;
  onCreateProduct: (form: OperationsProductForm) => void;
  onCreateSkillCategory: (
    payload: Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder">,
  ) => void;
  onNavigateToProduct: (productId: string) => void;
  onToggleProductStatus: (productId: string, status: OperationsProduct["status"]) => void;
  onUpdateServiceContactConfig: (
    config: Pick<
      OperationsServiceContactConfig,
      "enabled" | "contactName" | "qrCodeValue" | "remarkTemplate"
    >,
  ) => void;
  onUpdateCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder" | "status">>,
  ) => void;
  onUpdateSkillCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder" | "status">>,
  ) => void;
  onUpdatePointsPackage: (packageId: string, updates: MockPointsPackageUpdate) => void;
  onUpdateProduct: (productId: string, form: OperationsProductForm) => void;
  onUpdateSubscriptionPlan: (
    planKey: MockSubscriptionPlanKey,
    updates: Partial<MockSubscriptionPlanTemplateInput>,
  ) => void;
}

const PRODUCT_CONSOLE_TAB_OPTIONS: Array<{
  key: ProductConsoleTabKey;
  label: string;
}> = [
  { key: "delivery", label: "AI专家商品" },
  { key: "pointsPackage", label: "积分包" },
  { key: "seatPackage", label: "团队席位包" },
  { key: "category", label: "分类管理" },
  { key: "contact", label: "客服配置" },
];

const CATEGORY_MANAGEMENT_SCOPE_OPTIONS: Array<{
  key: CategoryManagementScope;
  label: string;
}> = [
  { key: "expertPlaza", label: "专家广场分类" },
  { key: "skillCenter", label: "技能中心分类" },
];

const PRODUCT_ACQUISITION_MODE_OPTIONS: Array<{
  value: ProductAcquisitionMode;
  label: string;
}> = [
  { value: "freeAdd", label: "免费添加" },
  { value: "trial", label: "免费试用" },
  { value: "contactSupport", label: "联系客服" },
];

const PRODUCT_FIELD_IDS = {
  name: "operations-product-name",
  category: "operations-product-category",
  visibility: "operations-product-visibility",
  visibleTenants: "operations-product-visible-tenants",
  status: "operations-product-status",
  acquisitionMode: "operations-product-acquisition-mode",
  linkedAgentId: "operations-product-linked-agent",
  trialUnit: "operations-product-trial-unit",
  trialValue: "operations-product-trial-value",
  description: "operations-product-description",
} as const;

const AGENT_PLAZA_CATEGORY_FIELD_IDS = {
  name: "operations-agent-plaza-category-name",
  sortOrder: "operations-agent-plaza-category-sort-order",
} as const;

const SERVICE_CONTACT_FIELD_IDS = {
  enabled: "operations-service-contact-enabled",
  contactName: "operations-service-contact-name",
  qrCodeValue: "operations-service-contact-qrcode-value",
  remarkTemplate: "operations-service-contact-remark-template",
} as const;

const OPERATIONS_MODAL_WIDTHS = {
  compact: 560,
  productEditor: 860,
} as const;

const buildStatusClassName = (tone?: "primary" | "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "primary" && adminStyles.consoleStatusTagPrimary,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const getProductStatusClassName = (status: OperationsProduct["status"]): string => {
  if (status === "active") {
    return buildStatusClassName("success");
  }

  if (status === "pendingProductization" || status === "draft") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName();
};

const getCatalogCategoryStatusClassName = (status: CatalogCategoryListItem["status"]): string =>
  status === "active" ? buildStatusClassName("success") : buildStatusClassName();

const getCatalogCategoryStatusLabel = (status: CatalogCategoryListItem["status"]): string =>
  status === "active" ? "启用" : "停用";

const getSortedCatalogCategories = <TCategory extends CatalogCategoryListItem>(
  categories: TCategory[],
): TCategory[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

const getAgentPlazaCategorySelectOptions = (
  categories: OperationsAgentPlazaCategoryOption[],
  currentCategory: string,
): Array<{ label: string; value: string; disabled?: boolean }> => {
  const activeOptions = getSortedCatalogCategories(categories)
    .filter(item => item.status === "active")
    .map(item => ({
      label: item.name,
      value: item.name,
    }));
  const hasCurrentOption = activeOptions.some(item => item.value === currentCategory);

  if (hasCurrentOption || !currentCategory.trim()) {
    return activeOptions;
  }

  return [
    {
      label: `${currentCategory}（已停用）`,
      value: currentCategory,
      disabled: true,
    },
    ...activeOptions,
  ];
};

const getProductTrialLabel = (
  product: OperationsProduct,
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>,
): string => {
  if (!product.supportsTrial || !product.trialUnit || !product.trialValue) {
    return "不支持试用";
  }

  return `${product.trialValue}${productTrialUnitLabels[product.trialUnit]}`;
};

const getProductVisibilityLabel = (product: OperationsProduct): string => {
  if (product.plazaVisibility !== "tenant") {
    return "全平台";
  }

  return product.visibleTenantNames?.length ? product.visibleTenantNames.join("、") : "指定租户";
};

const getProductAcquisitionLabel = (product: OperationsProduct): string => {
  if (product.contactMode && product.contactMode !== "disabled") {
    return "联系客服";
  }

  if (product.supportsTrial) {
    return "免费试用";
  }

  return "免费添加";
};

const getProductAcquisitionMode = (
  form: Pick<OperationsProductForm, "contactMode" | "supportsTrial">,
): ProductAcquisitionMode => {
  if (form.contactMode !== "disabled") {
    return "contactSupport";
  }

  if (form.supportsTrial) {
    return "trial";
  }

  return "freeAdd";
};

const applyProductAcquisitionMode = (
  form: OperationsProductForm,
  mode: ProductAcquisitionMode,
): OperationsProductForm => {
  if (mode === "contactSupport") {
    return {
      ...form,
      supportsTrial: false,
      contactMode: "platformDefault",
      contactQrCodeValue: "",
      contactRemark: "",
    };
  }

  const shouldSupportTrial = mode === "trial";

  return {
    ...form,
    supportsTrial: shouldSupportTrial,
    contactMode: "disabled",
    contactQrCodeValue: "",
    contactRemark: "",
  };
};

/**
 * 运营后台商品中心原型，管理 AI 专家商品、专家广场分类与技能中心分类。
 */
export const OperationsProductConsole = ({
  approvedAgents,
  categories,
  emptyProductForm,
  productId,
  productStatusLabels,
  pointsPackages,
  productTrialUnitLabels,
  productTrialUnitOptions,
  products,
  serviceContactConfig,
  skillCategories,
  subscriptionPlans,
  tenants,
  onBackToProductList,
  onCreateCategory,
  onCreatePointsPackage,
  onCreateProduct,
  onCreateSkillCategory,
  onNavigateToProduct,
  onToggleProductStatus,
  onUpdateServiceContactConfig,
  onUpdateCategory,
  onUpdateSkillCategory,
  onUpdatePointsPackage,
  onUpdateProduct,
  onUpdateSubscriptionPlan,
}: OperationsProductConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [activeConsoleTab, setActiveConsoleTab] = useState<ProductConsoleTabKey>("delivery");
  const [activeCategoryScope, setActiveCategoryScope] =
    useState<CategoryManagementScope>("expertPlaza");
  const [productEditor, setProductEditor] = useState<ProductEditorState>({
    open: false,
    mode: "create",
    form: emptyProductForm,
  });
  const [categoryEditor, setCategoryEditor] = useState<CatalogCategoryEditorState>({
    open: false,
    mode: "create",
    name: "",
    sortOrder: 10,
  });
  const activeProduct = useMemo<OperationsProduct | null>(
    () => products.find(item => item.id === productId) ?? null,
    [productId, products],
  );
  const sortedCategories = useMemo<OperationsAgentPlazaCategoryOption[]>(
    () => getSortedCatalogCategories(categories),
    [categories],
  );
  const sortedSkillCategories = useMemo<OperationsSkillCenterCategoryOption[]>(
    () => getSortedCatalogCategories(skillCategories),
    [skillCategories],
  );
  const currentManagedCategories = useMemo<CatalogCategoryListItem[]>(
    () => (activeCategoryScope === "expertPlaza" ? sortedCategories : sortedSkillCategories),
    [activeCategoryScope, sortedCategories, sortedSkillCategories],
  );
  const activeCategoryScopeLabel =
    activeCategoryScope === "expertPlaza" ? "专家广场分类" : "技能中心分类";
  const categoryOptions = useMemo(
    () => getAgentPlazaCategorySelectOptions(categories, productEditor.form.plazaCategory),
    [categories, productEditor.form.plazaCategory],
  );
  const filteredAgentProducts = useMemo<OperationsProduct[]>(
    () =>
      products.filter(item => {
        if (item.supplyKind !== "agent") {
          return false;
        }

        const searchSource = [
          item.name,
          item.linkedAgentName ?? "",
          item.description,
          item.plazaCategory ?? "",
          getProductAcquisitionLabel(item),
          getProductVisibilityLabel(item),
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [keyword, products],
  );

  const handleOpenCreateProduct = useCallback((): void => {
    setProductEditor({
      open: true,
      mode: "create",
      form: {
        ...emptyProductForm,
        supplyKind: "agent",
        deliveryKind: "softwareService",
        billingMode: "subscription",
        meteringUnit: "duration",
        billingSpec: "year",
        contactMode: "disabled",
        plazaCategory: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
        plazaVisibility: "public",
        visibleTenantIds: [],
        visibleTenantNames: [],
        plazaStatus: "offline",
        billingScopes: ["points"],
      },
    });
  }, [emptyProductForm]);

  const handleOpenEditProduct = useCallback(
    (product: OperationsProduct): void => {
      setProductEditor({
        open: true,
        mode: "edit",
        productId: product.id,
        form: {
          name: product.name,
          supplyKind: "agent",
          deliveryKind: "softwareService",
          saleType: "free",
          billingMode: "subscription",
          meteringUnit: "duration",
          billingSpec: "year",
          linkedAgentId: product.linkedAgentId,
          resourcePoolId: undefined,
          description: product.description,
          price: 0,
          subscriptionPlans:
            product.subscriptionPlans?.map(item => ({
              ...item,
            })) ?? emptyProductForm.subscriptionPlans,
          supportsTrial: product.supportsTrial,
          trialUnit: product.trialUnit ?? "day",
          trialValue: product.trialValue ?? 7,
          contactMode: product.contactMode ?? "disabled",
          contactQrCodeValue: product.contactQrCodeValue ?? "",
          contactRemark: product.contactRemark ?? "",
          plazaCategory: product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
          plazaVisibility: product.plazaVisibility ?? "public",
          visibleTenantIds: product.visibleTenantIds ?? [],
          visibleTenantNames: product.visibleTenantNames ?? [],
          plazaStatus: product.status === "active" ? "online" : (product.plazaStatus ?? "offline"),
          billingScopes: product.billingScopes?.length ? product.billingScopes : ["points"],
        },
      });
    },
    [emptyProductForm.subscriptionPlans],
  );

  const handleCloseProductEditor = useCallback((): void => {
    setProductEditor({
      open: false,
      mode: "create",
      form: emptyProductForm,
    });
  }, [emptyProductForm]);

  const handleSubmitProduct = useCallback((): void => {
    if (!productEditor.form.name.trim()) {
      message.warning("请先补齐商品名称。");
      return;
    }

    if (!productEditor.form.linkedAgentId) {
      message.warning("请选择绑定 AI专家。");
      return;
    }

    if (productEditor.form.supportsTrial && productEditor.form.trialValue <= 0) {
      message.warning("请填写有效的试用规则。");
      return;
    }

    if (
      productEditor.form.plazaVisibility === "tenant" &&
      !productEditor.form.visibleTenantIds.length
    ) {
      message.warning("请选择指定可见租户。");
      return;
    }

    const visibleTenantNames =
      productEditor.form.plazaVisibility === "tenant"
        ? tenants
            .filter(tenant => productEditor.form.visibleTenantIds.includes(tenant.id))
            .map(tenant => tenant.name)
        : [];
    const normalizedForm: OperationsProductForm = {
      ...productEditor.form,
      supplyKind: "agent",
      deliveryKind: "softwareService",
      saleType: "free",
      billingMode: "subscription",
      meteringUnit: "duration",
      billingSpec: "year",
      resourcePoolId: undefined,
      price: 0,
      billingScopes: ["points"],
      contactMode: productEditor.form.contactMode,
      contactQrCodeValue:
        productEditor.form.contactMode === "custom"
          ? productEditor.form.contactQrCodeValue.trim()
          : "",
      contactRemark:
        productEditor.form.contactMode === "custom" ? productEditor.form.contactRemark.trim() : "",
      visibleTenantIds:
        productEditor.form.plazaVisibility === "tenant" ? productEditor.form.visibleTenantIds : [],
      visibleTenantNames,
    };

    if (productEditor.mode === "create") {
      onCreateProduct(normalizedForm);
      message.success("商品已创建。");
    } else if (productEditor.productId) {
      onUpdateProduct(productEditor.productId, normalizedForm);
      message.success("商品信息已更新。");
    }

    handleCloseProductEditor();
  }, [handleCloseProductEditor, onCreateProduct, onUpdateProduct, productEditor, tenants]);

  const handleOpenCreateCategory = useCallback((): void => {
    const maxSortOrder = currentManagedCategories.reduce(
      (result, item) => Math.max(result, item.sortOrder),
      0,
    );

    setCategoryEditor({
      open: true,
      mode: "create",
      name: "",
      sortOrder: maxSortOrder + 10,
    });
  }, [currentManagedCategories]);

  const handleOpenEditCategory = useCallback((category: CatalogCategoryListItem): void => {
    setCategoryEditor({
      open: true,
      mode: "edit",
      categoryId: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
    });
  }, []);

  const handleCloseCategoryEditor = useCallback((): void => {
    setCategoryEditor({
      open: false,
      mode: "create",
      name: "",
      sortOrder: 10,
    });
  }, []);

  const handleSubmitCategory = useCallback((): void => {
    const nextName = categoryEditor.name.trim();

    if (!nextName || categoryEditor.sortOrder < 0) {
      message.warning("请先补齐分类名称，并填写有效排序。");
      return;
    }

    const hasDuplicateName = currentManagedCategories.some(
      item =>
        item.id !== categoryEditor.categoryId &&
        item.name.trim().toLowerCase() === nextName.toLowerCase(),
    );

    if (hasDuplicateName) {
      message.warning("分类名称已存在，请换一个名称。");
      return;
    }

    if (categoryEditor.mode === "create") {
      if (activeCategoryScope === "expertPlaza") {
        onCreateCategory({
          name: nextName,
          sortOrder: categoryEditor.sortOrder,
        });
      } else {
        onCreateSkillCategory({
          name: nextName,
          sortOrder: categoryEditor.sortOrder,
        });
      }

      message.success(`${activeCategoryScopeLabel}已创建。`);
    } else if (categoryEditor.categoryId) {
      if (activeCategoryScope === "expertPlaza") {
        onUpdateCategory(categoryEditor.categoryId, {
          name: nextName,
          sortOrder: categoryEditor.sortOrder,
        });
      } else {
        onUpdateSkillCategory(categoryEditor.categoryId, {
          name: nextName,
          sortOrder: categoryEditor.sortOrder,
        });
      }

      message.success(`${activeCategoryScopeLabel}已更新。`);
    }

    handleCloseCategoryEditor();
  }, [
    activeCategoryScope,
    activeCategoryScopeLabel,
    categoryEditor,
    currentManagedCategories,
    handleCloseCategoryEditor,
    onCreateCategory,
    onCreateSkillCategory,
    onUpdateCategory,
    onUpdateSkillCategory,
  ]);

  const handleToggleCategoryStatus = useCallback(
    (category: CatalogCategoryListItem): void => {
      const nextStatus = category.status === "active" ? "inactive" : "active";
      const currentActiveCategoryCount = currentManagedCategories.filter(
        item => item.status === "active",
      ).length;

      if (category.status === "active" && currentActiveCategoryCount <= 1) {
        message.warning("至少需要保留一个启用分类。");
        return;
      }

      if (activeCategoryScope === "expertPlaza") {
        onUpdateCategory(category.id, {
          status: nextStatus,
        });
      } else {
        onUpdateSkillCategory(category.id, {
          status: nextStatus,
        });
      }

      message.success(nextStatus === "active" ? "分类已启用。" : "分类已停用。");
    },
    [activeCategoryScope, currentManagedCategories, onUpdateCategory, onUpdateSkillCategory],
  );

  const handleToggleProductStatus = useCallback(
    (product: OperationsProduct): void => {
      if (product.status === "pendingProductization") {
        message.warning("请先完善商品信息，再执行上架。");
        return;
      }

      const nextStatus = product.status === "active" ? "inactive" : "active";

      onToggleProductStatus(product.id, nextStatus);
      message.success(nextStatus === "active" ? "商品已上架。" : "商品已下架。");
    },
    [onToggleProductStatus],
  );

  return (
    <>
      {productId ? (
        <ProductDetail
          product={activeProduct}
          productStatusLabels={productStatusLabels}
          productTrialUnitLabels={productTrialUnitLabels}
          onBack={onBackToProductList}
          onEdit={handleOpenEditProduct}
          onToggleStatus={handleToggleProductStatus}
        />
      ) : (
        <div className={adminStyles.consolePage}>
          <header className={adminStyles.consoleHeader}>
            <div className={adminStyles.consoleHeaderMain}>
              <h1 className={adminStyles.consoleTitle}>商品中心</h1>
            </div>

            <div className={adminStyles.consoleHeaderSide}>
              {activeConsoleTab === "delivery" ? (
                <>
                  <Input
                    className={adminStyles.consoleInlineSearch}
                    value={keyword}
                    placeholder="搜索 AI专家商品、分类、获取方式"
                    onChange={event => setKeyword(event.target.value)}
                  />
                  <Button type="primary" onClick={handleOpenCreateProduct}>
                    新建AI专家商品
                  </Button>
                </>
              ) : null}
              {activeConsoleTab === "category" ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateCategory}>
                  {activeCategoryScope === "expertPlaza" ? "新建专家分类" : "新建技能分类"}
                </Button>
              ) : null}
            </div>
          </header>

          <div className={styles.detailTabBar}>
            {PRODUCT_CONSOLE_TAB_OPTIONS.map(item => (
              <button
                key={item.key}
                type="button"
                className={classNames(
                  styles.detailTabButton,
                  activeConsoleTab === item.key && styles.detailTabButtonActive,
                )}
                onClick={() => setActiveConsoleTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {activeConsoleTab === "delivery" ? (
            <ProductList
              keyword={keyword}
              products={filteredAgentProducts}
              productStatusLabels={productStatusLabels}
              productTrialUnitLabels={productTrialUnitLabels}
              onNavigateToProduct={onNavigateToProduct}
            />
          ) : null}

          {activeConsoleTab === "pointsPackage" ? (
            <OperationsPointsPackagePanel
              pointsPackages={pointsPackages}
              onCreatePointsPackage={onCreatePointsPackage}
              onUpdatePointsPackage={onUpdatePointsPackage}
            />
          ) : null}

          {activeConsoleTab === "seatPackage" ? (
            <OperationsSeatPackagePanel
              subscriptionPlans={subscriptionPlans}
              onUpdateSubscriptionPlan={onUpdateSubscriptionPlan}
            />
          ) : null}

          {activeConsoleTab === "category" ? (
            <>
              <div className={styles.detailTabBar}>
                {CATEGORY_MANAGEMENT_SCOPE_OPTIONS.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={classNames(
                      styles.detailTabButton,
                      activeCategoryScope === item.key && styles.detailTabButtonActive,
                    )}
                    onClick={() => setActiveCategoryScope(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <CategoryList
                categories={currentManagedCategories}
                onEditCategory={handleOpenEditCategory}
                onToggleCategoryStatus={handleToggleCategoryStatus}
              />
            </>
          ) : null}

          {activeConsoleTab === "contact" ? (
            <ServiceContactConfigPanel
              config={serviceContactConfig}
              onSave={onUpdateServiceContactConfig}
            />
          ) : null}
        </div>
      )}

      <Modal
        open={productEditor.open}
        title={productEditor.mode === "create" ? "创建AI专家商品" : "编辑AI专家商品"}
        className={classNames(styles.fixedModal, styles.productEditorModal)}
        width={OPERATIONS_MODAL_WIDTHS.productEditor}
        onCancel={handleCloseProductEditor}
        onOk={handleSubmitProduct}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.name}>
              商品名称
            </label>
            <Input
              id={PRODUCT_FIELD_IDS.name}
              value={productEditor.form.name}
              onChange={event =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    name: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.linkedAgentId}>
              绑定 AI专家
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.linkedAgentId}
              value={productEditor.form.linkedAgentId}
              placeholder="请选择已审核通过的 AI专家"
              options={approvedAgents.map(item => ({
                value: item.id,
                label: `${item.name} · ${item.version}`,
              }))}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    linkedAgentId: nextValue,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.acquisitionMode}>
              获取方式
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.acquisitionMode}
              value={getProductAcquisitionMode(productEditor.form)}
              options={PRODUCT_ACQUISITION_MODE_OPTIONS}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: applyProductAcquisitionMode(currentState.form, nextValue),
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.category}>
              商品分类
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.category}
              value={productEditor.form.plazaCategory}
              options={categoryOptions}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    plazaCategory: nextValue,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.visibility}>
              可见范围
            </label>
            <Select<OperationsAgentPlazaVisibility>
              id={PRODUCT_FIELD_IDS.visibility}
              value={productEditor.form.plazaVisibility}
              options={[
                { value: "public", label: "全平台" },
                { value: "tenant", label: "指定租户" },
              ]}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    plazaVisibility: nextValue,
                    visibleTenantIds:
                      nextValue === "tenant" ? currentState.form.visibleTenantIds : [],
                    visibleTenantNames:
                      nextValue === "tenant" ? currentState.form.visibleTenantNames : [],
                  },
                }))
              }
            />
          </div>

          {productEditor.form.plazaVisibility === "tenant" ? (
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.visibleTenants}>
                指定租户
              </label>
              <Select<string[]>
                id={PRODUCT_FIELD_IDS.visibleTenants}
                mode="multiple"
                value={productEditor.form.visibleTenantIds}
                placeholder="请选择可见租户"
                options={tenants.map(tenant => ({
                  value: tenant.id,
                  label: tenant.name,
                }))}
                onChange={nextValue =>
                  setProductEditor(currentState => ({
                    ...currentState,
                    form: {
                      ...currentState.form,
                      visibleTenantIds: nextValue,
                      visibleTenantNames: tenants
                        .filter(tenant => nextValue.includes(tenant.id))
                        .map(tenant => tenant.name),
                    },
                  }))
                }
              />
            </div>
          ) : null}

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.status}>
              上架状态
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.status}
              value={productEditor.form.plazaStatus}
              options={[
                { value: "offline", label: "下架" },
                { value: "online", label: "上架" },
              ]}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    plazaStatus: nextValue,
                  },
                }))
              }
            />
          </div>

          {productEditor.form.supportsTrial ? (
            <>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.trialUnit}>
                  试用方式
                </label>
                <Select
                  id={PRODUCT_FIELD_IDS.trialUnit}
                  value={productEditor.form.trialUnit}
                  options={productTrialUnitOptions}
                  onChange={nextValue =>
                    setProductEditor(currentState => ({
                      ...currentState,
                      form: {
                        ...currentState.form,
                        trialUnit: nextValue,
                      },
                    }))
                  }
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.trialValue}>
                  试用规则
                </label>
                <InputNumber
                  id={PRODUCT_FIELD_IDS.trialValue}
                  className={styles.fullWidthInput}
                  min={1}
                  precision={0}
                  value={productEditor.form.trialValue}
                  addonAfter={productTrialUnitLabels[productEditor.form.trialUnit]}
                  onChange={nextValue =>
                    setProductEditor(currentState => ({
                      ...currentState,
                      form: {
                        ...currentState.form,
                        trialValue: nextValue ?? 1,
                      },
                    }))
                  }
                />
              </div>
            </>
          ) : null}

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.description}>
              商品描述
            </label>
            <Input.TextArea
              id={PRODUCT_FIELD_IDS.description}
              rows={4}
              value={productEditor.form.description}
              onChange={event =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    description: event.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={categoryEditor.open}
        title={
          categoryEditor.mode === "create"
            ? `新建${activeCategoryScopeLabel}`
            : `编辑${activeCategoryScopeLabel}`
        }
        className={classNames(styles.fixedModal, styles.compactModal)}
        width={OPERATIONS_MODAL_WIDTHS.compact}
        onCancel={handleCloseCategoryEditor}
        onOk={handleSubmitCategory}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_CATEGORY_FIELD_IDS.name}>
              分类名称
            </label>
            <Input
              id={AGENT_PLAZA_CATEGORY_FIELD_IDS.name}
              value={categoryEditor.name}
              placeholder={
                activeCategoryScope === "expertPlaza"
                  ? "如 销售、供应链、财务"
                  : "如 工作流、数据分析、工具"
              }
              onChange={event =>
                setCategoryEditor(currentState => ({
                  ...currentState,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_CATEGORY_FIELD_IDS.sortOrder}>
              排序
            </label>
            <InputNumber
              id={AGENT_PLAZA_CATEGORY_FIELD_IDS.sortOrder}
              className={styles.fullWidthInput}
              min={0}
              value={categoryEditor.sortOrder}
              onChange={nextValue =>
                setCategoryEditor(currentState => ({
                  ...currentState,
                  sortOrder: typeof nextValue === "number" ? nextValue : 0,
                }))
              }
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

interface ProductListProps {
  keyword: string;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  products: OperationsProduct[];
  onNavigateToProduct: (productId: string) => void;
}

const ProductList = ({
  keyword,
  productStatusLabels,
  productTrialUnitLabels,
  products,
  onNavigateToProduct,
}: ProductListProps): JSX.Element => (
  <section className={adminStyles.consoleSection}>
    <div className={adminStyles.consoleSectionHeader}>
      <div className={adminStyles.consoleSectionHeaderMain}>
        <h2 className={adminStyles.consoleSectionTitle}>AI专家商品</h2>
      </div>
    </div>

    {products.length ? (
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>AI专家商品</th>
              <th>分类</th>
              <th>可见范围</th>
              <th>获取方式</th>
              <th>试用规则</th>
              <th>上架状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>
                  <button
                    type="button"
                    className={styles.recordEntryButton}
                    onClick={() => onNavigateToProduct(product.id)}
                  >
                    <span className={styles.recordEntryTitle}>{product.name}</span>
                  </button>
                </td>
                <td>{product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}</td>
                <td>{getProductVisibilityLabel(product)}</td>
                <td>{getProductAcquisitionLabel(product)}</td>
                <td>{getProductTrialLabel(product, productTrialUnitLabels)}</td>
                <td>
                  <span className={getProductStatusClassName(product.status)}>
                    {productStatusLabels[product.status]}
                  </span>
                </td>
                <td>{product.updatedAt}</td>
                <td>
                  <Button size="small" type="link" onClick={() => onNavigateToProduct(product.id)}>
                    {product.status === "pendingProductization" ? "完善配置" : "查看详情"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={styles.emptyWrap}>
        <Empty
          description={
            keyword.trim() ? "当前筛选下暂无 AI专家商品。" : "暂无 AI专家商品，请先创建商品。"
          }
        />
      </div>
    )}
  </section>
);

interface CategoryListProps {
  categories: CatalogCategoryListItem[];
  onEditCategory: (category: CatalogCategoryListItem) => void;
  onToggleCategoryStatus: (category: CatalogCategoryListItem) => void;
}

const CategoryList = ({
  categories,
  onEditCategory,
  onToggleCategoryStatus,
}: CategoryListProps): JSX.Element => (
  <section className={adminStyles.consoleSection}>
    {categories.length ? (
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>分类名称</th>
              <th>排序</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td className={adminStyles.consoleHtmlTableStrong}>{category.name}</td>
                <td>{category.sortOrder}</td>
                <td>
                  <span className={getCatalogCategoryStatusClassName(category.status)}>
                    {getCatalogCategoryStatusLabel(category.status)}
                  </span>
                </td>
                <td>{category.updatedAt}</td>
                <td>
                  <div className={adminStyles.consoleActions}>
                    <Button size="small" type="link" onClick={() => onEditCategory(category)}>
                      编辑
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => onToggleCategoryStatus(category)}
                    >
                      {category.status === "active" ? "停用" : "启用"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={styles.emptyWrap}>
        <Empty description="暂无分类，请先创建分类。" />
      </div>
    )}
  </section>
);

interface ServiceContactConfigPanelProps {
  config: OperationsServiceContactConfig;
  onSave: (
    config: Pick<
      OperationsServiceContactConfig,
      "enabled" | "contactName" | "qrCodeValue" | "remarkTemplate"
    >,
  ) => void;
}

const ServiceContactConfigPanel = ({
  config,
  onSave,
}: ServiceContactConfigPanelProps): JSX.Element => {
  const [draft, setDraft] = useState<OperationsServiceContactConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleSave = useCallback((): void => {
    if (!draft.contactName.trim()) {
      message.warning("请填写客服名称。");
      return;
    }

    if (draft.enabled && !draft.qrCodeValue.trim()) {
      message.warning("启用客服二维码前，请先填写二维码内容。");
      return;
    }

    onSave({
      enabled: draft.enabled,
      contactName: draft.contactName,
      qrCodeValue: draft.qrCodeValue,
      remarkTemplate: draft.remarkTemplate,
    });
    message.success("客服配置已保存。");
  }, [draft, onSave]);

  return (
    <section className={adminStyles.consoleSection}>
      <div className={styles.platformConfigStack}>
        <div className={styles.platformConfigForm}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={SERVICE_CONTACT_FIELD_IDS.enabled}>
              启用状态
            </label>
            <div className={styles.statusSwitchRow}>
              <Switch
                id={SERVICE_CONTACT_FIELD_IDS.enabled}
                checked={draft.enabled}
                onChange={nextValue =>
                  setDraft(currentDraft => ({
                    ...currentDraft,
                    enabled: nextValue,
                  }))
                }
              />
              <span className={styles.statusSwitchText}>
                {draft.enabled ? "专家广场可展示客服二维码" : "专家广场暂不展示客服二维码"}
              </span>
            </div>
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={SERVICE_CONTACT_FIELD_IDS.contactName}>
              客服名称
            </label>
            <Input
              id={SERVICE_CONTACT_FIELD_IDS.contactName}
              value={draft.contactName}
              placeholder="如 FrontisAI 客服"
              onChange={event =>
                setDraft(currentDraft => ({
                  ...currentDraft,
                  contactName: event.target.value,
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={SERVICE_CONTACT_FIELD_IDS.qrCodeValue}>
              二维码内容
            </label>
            <Input
              id={SERVICE_CONTACT_FIELD_IDS.qrCodeValue}
              value={draft.qrCodeValue}
              placeholder="填写微信二维码链接、企微名片链接或客服识别码"
              onChange={event =>
                setDraft(currentDraft => ({
                  ...currentDraft,
                  qrCodeValue: event.target.value,
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={SERVICE_CONTACT_FIELD_IDS.remarkTemplate}>
              联系说明
            </label>
            <Input.TextArea
              id={SERVICE_CONTACT_FIELD_IDS.remarkTemplate}
              rows={4}
              value={draft.remarkTemplate}
              placeholder="说明用户扫码后需要备注的信息"
              onChange={event =>
                setDraft(currentDraft => ({
                  ...currentDraft,
                  remarkTemplate: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <aside className={classNames(styles.serviceContactPreview, styles.platformConfigPreview)}>
          <div className={styles.serviceContactPreviewHeader}>
            <span className={styles.serviceContactPreviewTitle}>{draft.contactName}</span>
            <span className={getProductStatusClassName(draft.enabled ? "active" : "inactive")}>
              {draft.enabled ? "已启用" : "已停用"}
            </span>
          </div>
          <div className={styles.serviceContactQrBox}>
            {draft.qrCodeValue.trim() ? (
              <QRCode value={draft.qrCodeValue.trim()} size={168} bordered={false} />
            ) : (
              <Empty description="暂无二维码内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
          <p className={styles.serviceContactRemark}>
            {draft.remarkTemplate.trim() || "保存后将在专家广场联系弹窗中展示。"}
          </p>
        </aside>

        <div className={styles.configFooterRow}>
          <Button type="primary" onClick={handleSave}>
            保存配置
          </Button>
          <span className={adminStyles.consoleInfoLabel}>上次更新：{config.updatedAt}</span>
        </div>
      </div>
    </section>
  );
};

interface ProductDetailProps {
  product: OperationsProduct | null;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  onBack: () => void;
  onEdit: (product: OperationsProduct) => void;
  onToggleStatus: (product: OperationsProduct) => void;
}

const ProductDetail = ({
  product,
  productStatusLabels,
  productTrialUnitLabels,
  onBack,
  onEdit,
  onToggleStatus,
}: ProductDetailProps): JSX.Element => (
  <div className={adminStyles.consolePage}>
    <header className={adminStyles.consoleHeader}>
      <div className={adminStyles.consoleHeaderMain}>
        <div className={adminStyles.consoleActions}>
          <Button type="link" size="small" onClick={onBack}>
            返回商品列表
          </Button>
        </div>
        <h1 className={adminStyles.consoleTitle}>{product?.name ?? "商品详情"}</h1>
        <p className={adminStyles.consoleSubtitle}>
          {product
            ? getProductAcquisitionLabel(product)
            : "当前商品不存在或已被移除，请返回列表重新选择。"}
        </p>
      </div>

      {product ? (
        <div className={adminStyles.consoleActions}>
          <span className={getProductStatusClassName(product.status)}>
            {productStatusLabels[product.status]}
          </span>
          <Button onClick={() => onEdit(product)}>
            {product.status === "pendingProductization" ? "完善配置" : "编辑配置"}
          </Button>
          <Button onClick={() => onToggleStatus(product)}>
            {product.status === "active" ? "下架商品" : "上架商品"}
          </Button>
        </div>
      ) : null}
    </header>

    {product ? (
      <section className={adminStyles.consoleSection}>
        {product.status === "pendingProductization" ? (
          <div className={styles.alertBlock}>
            该 AI专家 已通过审核，请先完善获取方式和试用规则后再上架。
          </div>
        ) : null}
        <div className={styles.detailGrid}>
          <section className={adminStyles.detailBlock}>
            <h3 className={adminStyles.detailBlockTitle}>获取配置</h3>
            <div className={adminStyles.consoleRows}>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>商品分类</span>
                <span className={adminStyles.consoleInfoValue}>
                  {product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>可见范围</span>
                <span className={adminStyles.consoleInfoValue}>
                  {getProductVisibilityLabel(product)}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>获取方式</span>
                <span className={adminStyles.consoleInfoValue}>
                  {getProductAcquisitionLabel(product)}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>试用策略</span>
                <span className={adminStyles.consoleInfoValue}>
                  {getProductTrialLabel(product, productTrialUnitLabels)}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>关联 AI专家</span>
                <span className={adminStyles.consoleInfoValue}>
                  {product.linkedAgentName ?? "未绑定 AI专家"}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>更新时间</span>
                <span className={adminStyles.consoleInfoValue}>{product.updatedAt}</span>
              </div>
            </div>
          </section>

          <section className={adminStyles.detailBlock}>
            <h3 className={adminStyles.detailBlockTitle}>商品描述</h3>
            <p className={styles.detailParagraph}>{product.description}</p>
          </section>
        </div>
      </section>
    ) : (
      <section className={adminStyles.consoleSection}>
        <div className={styles.emptyWrap}>
          <Empty description="未找到该商品。">
            <Button onClick={onBack}>返回商品列表</Button>
          </Empty>
        </div>
      </section>
    )}
  </div>
);
