import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Select,
  Switch,
  message,
} from "antd";
import classNames from "classnames";

import { OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY } from "@/feature/operations/mockData";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentPlazaVisibility,
  OperationsAgentStoreZone,
  OperationsAgentStoreZoneOption,
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
type ProductAcquisitionMode = "freeAdd" | "contactSupport";
type CategoryManagementScope = "storeZone" | "expertPlaza" | "skillCenter";

interface CatalogCategoryListItem {
  id: string;
  zoneId?: string;
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
  zoneId: string;
  name: string;
  sortOrder: number;
}

export interface OperationsProductConsoleProps {
  approvedAgents: OperationsAgentSubmission[];
  storeZones: OperationsAgentStoreZoneOption[];
  categories: OperationsAgentPlazaCategoryOption[];
  emptyProductForm: OperationsProductForm;
  productId?: string;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  pointsPackages: MockPointsPackageOption[];
  products: OperationsProduct[];
  serviceContactConfig: OperationsServiceContactConfig;
  skillCategories: OperationsSkillCenterCategoryOption[];
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  tenants: OperationsTenant[];
  onBackToProductList: () => void;
  onCreateCategory: (
    payload: Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder">,
  ) => void;
  onCreateStoreZone: (payload: Pick<OperationsAgentStoreZoneOption, "name" | "sortOrder">) => void;
  onCreatePointsPackage: (payload: MockPointsPackageInput) => void;
  onCreateSubscriptionPlan: (payload: MockSubscriptionPlanTemplateInput) => void;
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
    updates: Partial<
      Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder" | "status">
    >,
  ) => void;
  onUpdateStoreZone: (
    zoneId: string,
    updates: Partial<Pick<OperationsAgentStoreZoneOption, "name" | "sortOrder" | "status">>,
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

const PRODUCT_ACQUISITION_MODE_OPTIONS: Array<{
  value: ProductAcquisitionMode;
  label: string;
}> = [
  { value: "freeAdd", label: "免费使用" },
  { value: "contactSupport", label: "联系客服" },
];

const PRODUCT_FIELD_IDS = {
  name: "operations-product-name",
  storeZone: "operations-product-store-zone",
  category: "operations-product-category",
  visibility: "operations-product-visibility",
  visibleTenants: "operations-product-visible-tenants",
  status: "operations-product-status",
  plazaSort: "operations-product-plaza-sort",
  acquisitionMode: "operations-product-acquisition-mode",
  linkedAgentId: "operations-product-linked-agent",
  identityAvatarUrl: "operations-product-identity-avatar-url",
  identityDescription: "operations-product-identity-description",
  usageGuide: "operations-product-usage-guide",
  tags: "operations-product-tags",
} as const;

const getProductZoneIds = (product: OperationsProduct): OperationsAgentStoreZone[] =>
  product.storeZones?.length ? product.storeZones : product.storeZone ? [product.storeZone] : [];

const MAX_PRODUCT_CARD_TAG_COUNT = 3;

const normalizeProductTags = (tags: string[]): string[] => {
  const normalizedTags = tags.map(tag => tag.trim()).filter(Boolean);

  return Array.from(new Set(normalizedTags)).slice(0, MAX_PRODUCT_CARD_TAG_COUNT);
};

const getProductTags = (product: OperationsProduct): string[] => normalizeProductTags(product.tags ?? []);

const AGENT_PLAZA_CATEGORY_FIELD_IDS = {
  zoneId: "operations-agent-plaza-category-zone-id",
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

  return "免费使用";
};

const getProductAcquisitionMode = (
  form: Pick<OperationsProductForm, "contactMode">,
): ProductAcquisitionMode => {
  if (form.contactMode !== "disabled") {
    return "contactSupport";
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

  return {
    ...form,
    supportsTrial: false,
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
  storeZones,
  categories,
  emptyProductForm,
  productId,
  productStatusLabels,
  pointsPackages,
  products,
  serviceContactConfig,
  skillCategories,
  subscriptionPlans,
  tenants,
  onBackToProductList,
  onCreateCategory,
  onCreateStoreZone,
  onCreatePointsPackage,
  onCreateSubscriptionPlan,
  onCreateProduct,
  onCreateSkillCategory,
  onNavigateToProduct,
  onToggleProductStatus,
  onUpdateServiceContactConfig,
  onUpdateCategory,
  onUpdateStoreZone,
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
    zoneId: "",
    name: "",
    sortOrder: 10,
  });
  const productCoverInputRef = useRef<HTMLInputElement | null>(null);
  const activeProduct = useMemo<OperationsProduct | null>(
    () => products.find(item => item.id === productId) ?? null,
    [productId, products],
  );
  const sortedCategories = useMemo<OperationsAgentPlazaCategoryOption[]>(
    () => getSortedCatalogCategories(categories),
    [categories],
  );
  const sortedStoreZones = useMemo<OperationsAgentStoreZoneOption[]>(
    () => getSortedCatalogCategories(storeZones),
    [storeZones],
  );
  const sortedSkillCategories = useMemo<OperationsSkillCenterCategoryOption[]>(
    () => getSortedCatalogCategories(skillCategories),
    [skillCategories],
  );
  const currentManagedCategories = useMemo<CatalogCategoryListItem[]>(
    () =>
      activeCategoryScope === "storeZone"
        ? sortedStoreZones
        : activeCategoryScope === "expertPlaza"
          ? sortedCategories
          : sortedSkillCategories,
    [activeCategoryScope, sortedCategories, sortedSkillCategories, sortedStoreZones],
  );
  const activeCategoryScopeLabel =
    activeCategoryScope === "storeZone"
      ? "专家广场专区"
      : activeCategoryScope === "expertPlaza"
        ? "专区分类"
        : "技能中心分类";
  const storeZoneOptions = useMemo(
    () =>
      sortedStoreZones
        .filter(zone => zone.status === "active")
        .map(zone => ({
          value: zone.id,
          label: zone.name,
        })),
    [sortedStoreZones],
  );
  const storeZoneLabelMap = useMemo(
    () => new Map(sortedStoreZones.map(zone => [zone.id, zone.name] as const)),
    [sortedStoreZones],
  );
  const categoryOptionsByZone = useMemo(
    () =>
      sortedStoreZones.reduce<Record<string, Array<{ value: string; label: string }>>>(
        (result, zone) => {
          result[zone.id] = sortedCategories
            .filter(category => category.zoneId === zone.id && category.status === "active")
            .map(category => ({
              value: category.name,
              label: category.name,
            }));
          return result;
        },
        {},
      ),
    [sortedCategories, sortedStoreZones],
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
          getProductTags(item).join(" "),
          getProductZoneIds(item)
            .map(zoneId => storeZoneLabelMap.get(zoneId) ?? zoneId)
            .join(" "),
          Object.values(item.plazaCategoryByZone ?? {}).join(" "),
          getProductAcquisitionLabel(item),
          getProductVisibilityLabel(item),
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [keyword, products, storeZoneLabelMap],
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
        storeZone: storeZoneOptions[0]?.value ?? "roleZone",
        storeZones: storeZoneOptions[0]?.value ? [storeZoneOptions[0].value] : ["roleZone"],
        plazaCategory:
          categoryOptionsByZone[storeZoneOptions[0]?.value ?? "roleZone"]?.[0]?.value ??
          OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
        plazaCategoryByZone: {
          [storeZoneOptions[0]?.value ?? "roleZone"]:
            categoryOptionsByZone[storeZoneOptions[0]?.value ?? "roleZone"]?.[0]?.value ??
            OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
        },
        plazaVisibility: "public",
        visibleTenantIds: [],
        visibleTenantNames: [],
        plazaStatus: "offline",
        plazaSort: 10,
        billingScopes: ["points"],
      },
    });
  }, [categoryOptionsByZone, emptyProductForm, storeZoneOptions]);

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
          identityAvatarUrl: product.identityAvatarUrl ?? "",
          identityName: product.identityName ?? product.linkedAgentName ?? product.name,
          identityDescription: product.identityDescription ?? product.description,
          usageGuide: product.usageGuide ?? "",
          tags: getProductTags(product),
          price: 0,
          subscriptionPlans:
            product.subscriptionPlans?.map(item => ({
              ...item,
            })) ?? emptyProductForm.subscriptionPlans,
          supportsTrial: false,
          trialUnit: product.trialUnit ?? "day",
          trialValue: product.trialValue ?? 7,
          contactMode: product.contactMode ?? "disabled",
          contactQrCodeValue: product.contactQrCodeValue ?? "",
          contactRemark: product.contactRemark ?? "",
          storeZone: product.storeZones?.[0] ?? product.storeZone ?? "roleZone",
          storeZones: getProductZoneIds(product),
          plazaCategory: product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
          plazaCategoryByZone:
            product.plazaCategoryByZone ??
            (product.storeZone && product.plazaCategory
              ? { [product.storeZone]: product.plazaCategory }
              : {}),
          plazaVisibility: product.plazaVisibility ?? "public",
          visibleTenantIds: product.visibleTenantIds ?? [],
          visibleTenantNames: product.visibleTenantNames ?? [],
          plazaStatus: product.status === "active" ? "online" : (product.plazaStatus ?? "offline"),
          plazaSort: product.plazaSort ?? 10,
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

  const handleProductCoverUpload = useCallback((file: File): void => {
    if (!file.type.startsWith("image/")) {
      message.error("封面必须为图片文件。");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error("封面图片大小不能超过 5MB。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextCover = typeof reader.result === "string" ? reader.result : "";

      if (!nextCover) {
        message.error("封面图片读取失败，请重新上传。");
        return;
      }

      setProductEditor(currentState => ({
        ...currentState,
        form: {
          ...currentState.form,
          identityAvatarUrl: nextCover,
        },
      }));
    };
    reader.onerror = () => {
      message.error("封面图片读取失败，请重新上传。");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmitProduct = useCallback((): void => {
    if (!productEditor.form.name.trim()) {
      message.warning("请先补齐商品名称。");
      return;
    }

    if (!productEditor.form.linkedAgentId) {
      message.warning("请选择绑定 AI专家。");
      return;
    }

    if (!productEditor.form.storeZones.length) {
      message.warning("请至少选择一个专区。");
      return;
    }

    const hasMissingZoneCategory = productEditor.form.storeZones.some(
      zoneId => !productEditor.form.plazaCategoryByZone[zoneId],
    );

    if (hasMissingZoneCategory) {
      message.warning("请为已选专区选择分类。");
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
      description:
        productEditor.form.identityDescription.trim() ||
        productEditor.form.description.trim() ||
        productEditor.form.name.trim(),
      identityName: productEditor.form.name.trim(),
      tags: normalizeProductTags(productEditor.form.tags),
      price: 0,
      supportsTrial: false,
      billingScopes: ["points"],
      storeZone: productEditor.form.storeZones[0],
      plazaCategory: productEditor.form.plazaCategoryByZone[productEditor.form.storeZones[0]],
      plazaSort: productEditor.form.plazaSort,
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

  const handleOpenCreateCategory = useCallback(
    (scope: CategoryManagementScope = activeCategoryScope, zoneId?: string): void => {
      const categorySource =
        scope === "storeZone"
          ? sortedStoreZones
          : scope === "expertPlaza"
            ? sortedCategories
            : sortedSkillCategories;
      const maxSortOrder = categorySource.reduce(
        (result, item) => Math.max(result, item.sortOrder),
        0,
      );

      setActiveCategoryScope(scope);
      setCategoryEditor({
        open: true,
        mode: "create",
        zoneId: zoneId ?? storeZoneOptions[0]?.value ?? "",
        name: "",
        sortOrder: maxSortOrder + 10,
      });
    },
    [
      activeCategoryScope,
      sortedCategories,
      sortedSkillCategories,
      sortedStoreZones,
      storeZoneOptions,
    ],
  );

  const handleOpenEditCategory = useCallback(
    (
      category: CatalogCategoryListItem,
      scope: CategoryManagementScope = activeCategoryScope,
    ): void => {
      setActiveCategoryScope(scope);
      setCategoryEditor({
        open: true,
        mode: "edit",
        categoryId: category.id,
        zoneId: category.zoneId ?? "",
        name: category.name,
        sortOrder: category.sortOrder,
      });
    },
    [activeCategoryScope],
  );

  const handleCloseCategoryEditor = useCallback((): void => {
    setCategoryEditor({
      open: false,
      mode: "create",
      zoneId: "",
      name: "",
      sortOrder: 10,
    });
  }, []);

  const handleSubmitCategory = useCallback((): void => {
    const nextName = categoryEditor.name.trim();

    if (!nextName || categoryEditor.sortOrder < 0) {
      message.warning("请先补齐名称，并填写有效排序。");
      return;
    }

    if (activeCategoryScope === "expertPlaza" && !categoryEditor.zoneId) {
      message.warning("请选择所属专区。");
      return;
    }

    const hasDuplicateName = currentManagedCategories.some(
      item =>
        item.id !== categoryEditor.categoryId &&
        (activeCategoryScope !== "expertPlaza" || item.zoneId === categoryEditor.zoneId) &&
        item.name.trim().toLowerCase() === nextName.toLowerCase(),
    );

    if (hasDuplicateName) {
      message.warning("分类名称已存在，请换一个名称。");
      return;
    }

    if (categoryEditor.mode === "create") {
      if (activeCategoryScope === "storeZone") {
        onCreateStoreZone({
          name: nextName,
          sortOrder: categoryEditor.sortOrder,
        });
      } else if (activeCategoryScope === "expertPlaza") {
        onCreateCategory({
          zoneId: categoryEditor.zoneId,
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
      if (activeCategoryScope === "storeZone") {
        onUpdateStoreZone(categoryEditor.categoryId, {
          name: nextName,
          sortOrder: categoryEditor.sortOrder,
        });
      } else if (activeCategoryScope === "expertPlaza") {
        onUpdateCategory(categoryEditor.categoryId, {
          zoneId: categoryEditor.zoneId,
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
    onCreateStoreZone,
    onCreateSkillCategory,
    onUpdateCategory,
    onUpdateStoreZone,
    onUpdateSkillCategory,
  ]);

  const handleToggleCategoryStatus = useCallback(
    (
      category: CatalogCategoryListItem,
      scope: CategoryManagementScope = activeCategoryScope,
    ): void => {
      const nextStatus = category.status === "active" ? "inactive" : "active";
      const categorySource =
        scope === "storeZone"
          ? sortedStoreZones
          : scope === "expertPlaza"
            ? sortedCategories
            : sortedSkillCategories;
      const currentActiveCategoryCount = categorySource.filter(
        item => item.status === "active",
      ).length;

      if (category.status === "active" && currentActiveCategoryCount <= 1) {
        message.warning("至少需要保留一个启用分类。");
        return;
      }

      if (scope === "storeZone") {
        onUpdateStoreZone(category.id, {
          status: nextStatus,
        });
      } else if (scope === "expertPlaza") {
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
    [
      activeCategoryScope,
      onUpdateCategory,
      onUpdateSkillCategory,
      onUpdateStoreZone,
      sortedCategories,
      sortedSkillCategories,
      sortedStoreZones,
    ],
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
          storeZoneLabelMap={storeZoneLabelMap}
          productStatusLabels={productStatusLabels}
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
                <div className={adminStyles.consoleActions}>
                  <Button icon={<PlusOutlined />} onClick={() => handleOpenCreateCategory("storeZone")}>
                    新建专区
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenCreateCategory("expertPlaza")}
                  >
                    新建专区分类
                  </Button>
                </div>
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
              storeZoneLabelMap={storeZoneLabelMap}
              productStatusLabels={productStatusLabels}
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
              onCreateSubscriptionPlan={onCreateSubscriptionPlan}
              onUpdateSubscriptionPlan={onUpdateSubscriptionPlan}
            />
          ) : null}

          {activeConsoleTab === "category" ? (
            <CategoryTreeList
              storeZones={sortedStoreZones}
              categories={sortedCategories}
              onCreateChildCategory={zoneId => handleOpenCreateCategory("expertPlaza", zoneId)}
              onEditStoreZone={category => handleOpenEditCategory(category, "storeZone")}
              onToggleStoreZoneStatus={category =>
                handleToggleCategoryStatus(category, "storeZone")
              }
              onEditCategory={category => handleOpenEditCategory(category, "expertPlaza")}
              onToggleCategoryStatus={category =>
                handleToggleCategoryStatus(category, "expertPlaza")
              }
            />
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
                    identityName: event.target.value,
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
                    identityDescription:
                      currentState.form.identityDescription ||
                      approvedAgents.find(item => item.id === nextValue)?.description ||
                      "",
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
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.tags}>
              专家广场卡片标签
            </label>
            <Select<string[]>
              id={PRODUCT_FIELD_IDS.tags}
              mode="tags"
              value={productEditor.form.tags}
              placeholder="输入标签后回车，最多 3 个"
              tokenSeparators={["，", ","]}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    tags: normalizeProductTags(nextValue),
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.storeZone}>
              专区
            </label>
            <Select<OperationsAgentStoreZone[]>
              id={PRODUCT_FIELD_IDS.storeZone}
              mode="multiple"
              value={productEditor.form.storeZones}
              options={storeZoneOptions}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    storeZone: nextValue[0] ?? currentState.form.storeZone,
                    storeZones: nextValue,
                    plazaCategoryByZone: nextValue.reduce<Record<string, string>>(
                      (result, zoneId) => {
                        result[zoneId] =
                          currentState.form.plazaCategoryByZone[zoneId] ??
                          categoryOptionsByZone[zoneId]?.[0]?.value ??
                          OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;
                        return result;
                      },
                      {},
                    ),
                  },
                }))
              }
            />
          </div>

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.category}>
              专区分类
            </label>
            <div className={styles.platformConfigStack}>
              {productEditor.form.storeZones.map(zoneId => (
                <div key={zoneId} className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>
                    {storeZoneLabelMap.get(zoneId) ?? zoneId}
                  </span>
                  <Select
                    className={styles.fullWidthInput}
                    value={productEditor.form.plazaCategoryByZone[zoneId]}
                    options={categoryOptionsByZone[zoneId] ?? []}
                    placeholder="请选择分类"
                    onChange={nextValue =>
                      setProductEditor(currentState => ({
                        ...currentState,
                        form: {
                          ...currentState.form,
                          plazaCategory:
                            zoneId === currentState.form.storeZones[0]
                              ? nextValue
                              : currentState.form.plazaCategory,
                          plazaCategoryByZone: {
                            ...currentState.form.plazaCategoryByZone,
                            [zoneId]: nextValue,
                          },
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
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

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.plazaSort}>
              排序
            </label>
            <InputNumber
              id={PRODUCT_FIELD_IDS.plazaSort}
              className={styles.fullWidthInput}
              min={0}
              precision={0}
              value={productEditor.form.plazaSort}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    plazaSort: typeof nextValue === "number" ? nextValue : 0,
                  },
                }))
              }
            />
          </div>

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.identityAvatarUrl}>
              添加封面
            </label>
            <input
              ref={productCoverInputRef}
              id={PRODUCT_FIELD_IDS.identityAvatarUrl}
              className={styles.visuallyHiddenInput}
              type="file"
              accept="image/*"
              onChange={event => {
                if (event.target.files?.[0]) {
                  handleProductCoverUpload(event.target.files[0]);
                }
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className={classNames(styles.productCoverUploadCard, {
                [styles.productCoverUploadCardFilled]: Boolean(
                  productEditor.form.identityAvatarUrl,
                ),
              })}
              onClick={() => productCoverInputRef.current?.click()}
            >
              {productEditor.form.identityAvatarUrl ? (
                <img
                  className={styles.productCoverUploadImage}
                  src={productEditor.form.identityAvatarUrl}
                  alt="商品封面预览"
                />
              ) : (
                <span className={styles.productCoverUploadEmpty}>
                  <span className={styles.productCoverUploadIcon}>
                    <UploadOutlined />
                  </span>
                  <span className={styles.productCoverUploadPrimary}>点击上传封面</span>
                  <span className={styles.productCoverUploadSecondary}>支持 PNG、JPG、WebP</span>
                </span>
              )}
            </button>
            {productEditor.form.identityAvatarUrl ? (
              <Button
                size="small"
                type="link"
                onClick={() =>
                  setProductEditor(currentState => ({
                    ...currentState,
                    form: {
                      ...currentState.form,
                      identityAvatarUrl: "",
                    },
                  }))
                }
              >
                移除封面
              </Button>
            ) : null}
          </div>

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.identityDescription}>
              详情描述
            </label>
            <Input.TextArea
              id={PRODUCT_FIELD_IDS.identityDescription}
              rows={4}
              value={productEditor.form.identityDescription}
              placeholder="用人格化介绍说明这个专家是谁、擅长什么、会怎样帮助用户工作"
              onChange={event =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    identityDescription: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.usageGuide}>
              使用指南
            </label>
            <Input.TextArea
              id={PRODUCT_FIELD_IDS.usageGuide}
              rows={6}
              value={productEditor.form.usageGuide}
              placeholder="支持输入富文本内容，用于说明适合处理、建议输入、交付结果和使用方式"
              onChange={event =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    usageGuide: event.target.value,
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
          {activeCategoryScope === "expertPlaza" ? (
            <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
              <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_CATEGORY_FIELD_IDS.zoneId}>
                所属专区
              </label>
              <Select
                id={AGENT_PLAZA_CATEGORY_FIELD_IDS.zoneId}
                value={categoryEditor.zoneId}
                options={storeZoneOptions}
                onChange={nextValue =>
                  setCategoryEditor(currentState => ({
                    ...currentState,
                    zoneId: nextValue,
                  }))
                }
              />
            </div>
          ) : null}

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_CATEGORY_FIELD_IDS.name}>
              {activeCategoryScope === "storeZone" ? "专区名称" : "分类名称"}
            </label>
            <Input
              id={AGENT_PLAZA_CATEGORY_FIELD_IDS.name}
              value={categoryEditor.name}
              placeholder={
                activeCategoryScope === "expertPlaza"
                  ? "如 销售、供应链、财务"
                  : activeCategoryScope === "storeZone"
                    ? "如 角色专区、行业专区"
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
  products: OperationsProduct[];
  storeZoneLabelMap: Map<string, string>;
  onNavigateToProduct: (productId: string) => void;
}

const ProductList = ({
  keyword,
  productStatusLabels,
  products,
  storeZoneLabelMap,
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
              <th>标签</th>
              <th>专区</th>
              <th>专区分类</th>
              <th>排序</th>
              <th>可见范围</th>
              <th>获取方式</th>
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
                <td>
                  {getProductTags(product).length ? (
                    <div className={styles.pillRow}>
                      {getProductTags(product).map(tag => (
                        <span key={`${product.id}-${tag}`} className={adminStyles.consoleStatusTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {getProductZoneIds(product)
                    .map(zoneId => storeZoneLabelMap.get(zoneId) ?? zoneId)
                    .join("、")}
                </td>
                <td>
                  {getProductZoneIds(product)
                    .map(zoneId => product.plazaCategoryByZone?.[zoneId] ?? product.plazaCategory)
                    .filter(Boolean)
                    .join("、") || OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}
                </td>
                <td>{product.plazaSort ?? 0}</td>
                <td>{getProductVisibilityLabel(product)}</td>
                <td>{getProductAcquisitionLabel(product)}</td>
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

interface CategoryTreeListProps {
  categories: OperationsAgentPlazaCategoryOption[];
  storeZones: OperationsAgentStoreZoneOption[];
  onCreateChildCategory: (zoneId: string) => void;
  onEditStoreZone: (category: CatalogCategoryListItem) => void;
  onToggleStoreZoneStatus: (category: CatalogCategoryListItem) => void;
  onEditCategory: (category: CatalogCategoryListItem) => void;
  onToggleCategoryStatus: (category: CatalogCategoryListItem) => void;
}

const CategoryTreeList = ({
  categories,
  storeZones,
  onCreateChildCategory,
  onEditStoreZone,
  onToggleStoreZoneStatus,
  onEditCategory,
  onToggleCategoryStatus,
}: CategoryTreeListProps): JSX.Element => (
  <section className={adminStyles.consoleSection}>
    <div className={adminStyles.consoleSectionHeader}>
      <div className={adminStyles.consoleSectionHeaderMain}>
        <h2 className={adminStyles.consoleSectionTitle}>专家广场分类</h2>
      </div>
    </div>
    {storeZones.length ? (
      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>分类名称</th>
              <th>层级</th>
              <th>排序</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {storeZones.flatMap(zone => {
              const childCategories = categories.filter(category => category.zoneId === zone.id);
              const zoneRow = (
                <tr key={zone.id}>
                  <td className={adminStyles.consoleHtmlTableStrong}>{zone.name}</td>
                  <td>专区</td>
                  <td>{zone.sortOrder}</td>
                  <td>
                    <span className={getCatalogCategoryStatusClassName(zone.status)}>
                      {getCatalogCategoryStatusLabel(zone.status)}
                    </span>
                  </td>
                  <td>{zone.updatedAt}</td>
                  <td>
                    <div className={adminStyles.consoleActions}>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => onCreateChildCategory(zone.id)}
                      >
                        新建二级分类
                      </Button>
                      <Button size="small" type="link" onClick={() => onEditStoreZone(zone)}>
                        编辑
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => onToggleStoreZoneStatus(zone)}
                      >
                        {zone.status === "active" ? "停用" : "启用"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
              const childRows = childCategories.map(category => (
                <tr key={category.id}>
                  <td>
                    <span className={styles.categoryChildName}>└ {category.name}</span>
                  </td>
                  <td>专区分类</td>
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
              ));

              return [zoneRow, ...childRows];
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={styles.emptyWrap}>
        <Empty description="暂无专区，请先创建专区。" />
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
  storeZoneLabelMap: Map<string, string>;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  onBack: () => void;
  onEdit: (product: OperationsProduct) => void;
  onToggleStatus: (product: OperationsProduct) => void;
}

const ProductDetail = ({
  product,
  storeZoneLabelMap,
  productStatusLabels,
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
            该 AI专家 已通过审核，请先完善获取方式和用户侧展示信息后再上架。
          </div>
        ) : null}
        <div className={styles.detailGrid}>
          <section className={adminStyles.detailBlock}>
            <h3 className={adminStyles.detailBlockTitle}>获取配置</h3>
            <div className={adminStyles.consoleRows}>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>专区</span>
                <span className={adminStyles.consoleInfoValue}>
                  {getProductZoneIds(product)
                    .map(zoneId => storeZoneLabelMap.get(zoneId) ?? zoneId)
                    .join("、")}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>专区分类</span>
                <span className={adminStyles.consoleInfoValue}>
                  {getProductZoneIds(product)
                    .map(zoneId => product.plazaCategoryByZone?.[zoneId] ?? product.plazaCategory)
                    .filter(Boolean)
                    .join("、") || OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>排序</span>
                <span className={adminStyles.consoleInfoValue}>{product.plazaSort ?? 0}</span>
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
            <h3 className={adminStyles.detailBlockTitle}>用户侧详情配置</h3>
            <div className={styles.productIdentityPreview}>
              <div className={styles.productIdentityAvatar}>
                {product.identityAvatarUrl ? (
                  <img src={product.identityAvatarUrl} alt={product.identityName ?? product.name} />
                ) : (
                  <span>
                    {(product.identityName ?? product.linkedAgentName ?? product.name).slice(0, 1)}
                  </span>
                )}
              </div>
              <div className={styles.productIdentityContent}>
                <strong>{product.identityName || product.linkedAgentName || product.name}</strong>
                <p>{product.identityDescription || product.description}</p>
                {getProductTags(product).length ? (
                  <div className={styles.pillRow}>
                    {getProductTags(product).map(tag => (
                      <span key={`${product.id}-${tag}`} className={adminStyles.consoleStatusTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.productUsageGuidePreview}>
              <h4>使用指南</h4>
              <p>{product.usageGuide || "暂未配置使用指南。"}</p>
            </div>
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
