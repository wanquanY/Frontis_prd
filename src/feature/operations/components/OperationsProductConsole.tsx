import { useCallback, useEffect, useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Select,
  Switch,
  Tabs,
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
import {
  AgentSnapshotCoreFilesPanel,
  AgentSnapshotDetailPanel,
  AgentSnapshotSkillsPanel,
  resolveAgentSubmissionSnapshot,
  resolveProductReleaseSnapshot,
} from "./OperationsAgentSnapshotPanels";
import styles from "./OperationsPlatformView.module.less";

type ProductConsoleTabKey = "delivery" | "pointsPackage" | "seatPackage" | "category" | "contact";
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

const PRODUCT_FIELD_IDS = {
  storeZone: "operations-product-store-zone",
  category: "operations-product-category",
  visibility: "operations-product-visibility",
  visibleTenants: "operations-product-visible-tenants",
  status: "operations-product-status",
  plazaSort: "operations-product-plaza-sort",
  linkedAgentId: "operations-product-linked-agent",
} as const;

const getProductZoneIds = (product: OperationsProduct): OperationsAgentStoreZone[] =>
  product.storeZones?.length ? product.storeZones : product.storeZone ? [product.storeZone] : [];

const getSubmissionSourceAgentId = (submission: OperationsAgentSubmission): string =>
  submission.sourceAgentId ?? submission.id;

const getProductLinkedAgentSourceId = (product: OperationsProduct): string | undefined =>
  product.linkedAgentSourceId ?? product.linkedAgentId;

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
  const activeProduct = useMemo<OperationsProduct | null>(
    () => products.find(item => item.id === productId) ?? null,
    [productId, products],
  );
  const productEditorProduct = useMemo<OperationsProduct | null>(
    () => products.find(item => item.id === productEditor.productId) ?? null,
    [productEditor.productId, products],
  );
  const productizedAgentSourceIds = useMemo<Set<string>>(
    () =>
      new Set(
        products
          .filter(item => item.supplyKind === "agent" && item.status !== "pendingProductization")
          .map(getProductLinkedAgentSourceId)
          .filter((sourceId): sourceId is string => Boolean(sourceId)),
      ),
    [products],
  );
  const productizableApprovedAgents = useMemo<OperationsAgentSubmission[]>(
    () =>
      approvedAgents.filter(
        item =>
          item.applicationKind !== "versionUpdate" &&
          !productizedAgentSourceIds.has(getSubmissionSourceAgentId(item)),
      ),
    [approvedAgents, productizedAgentSourceIds],
  );
  const productEditorSnapshot = useMemo(
    () => {
      if (productEditorProduct) {
        return resolveProductReleaseSnapshot(productEditorProduct, approvedAgents);
      }

      const selectedAgent = productEditor.form.linkedAgentId
        ? approvedAgents.find(item => item.id === productEditor.form.linkedAgentId)
        : undefined;

      return selectedAgent ? resolveAgentSubmissionSnapshot(selectedAgent) : null;
    },
    [approvedAgents, productEditor.form.linkedAgentId, productEditorProduct],
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

        if (item.status === "pendingProductization") {
          return false;
        }

        const releaseSnapshot = resolveProductReleaseSnapshot(item, approvedAgents);
        const searchSource = [
          item.name,
          item.linkedAgentName ?? "",
          item.description,
          releaseSnapshot.agentName,
          releaseSnapshot.description,
          item.plazaCategory ?? "",
          releaseSnapshot.sceneTags.join(" "),
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
    [approvedAgents, keyword, products, storeZoneLabelMap],
  );

  const handleOpenCreateProduct = useCallback((): void => {
    const defaultZoneId = storeZoneOptions[0]?.value ?? "roleZone";
    const defaultCategory =
      categoryOptionsByZone[defaultZoneId]?.[0]?.value ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;

    setProductEditor({
      open: true,
      mode: "create",
      productId: undefined,
      form: {
        ...emptyProductForm,
        supplyKind: "agent",
        deliveryKind: "softwareService",
        saleType: "free",
        billingMode: "subscription",
        meteringUnit: "duration",
        billingSpec: "year",
        linkedAgentId: undefined,
        resourcePoolId: undefined,
        name: "",
        description: "",
        identityAvatarUrl: "",
        identityName: "",
        identityDescription: "",
        usageGuide: "",
        tags: [],
        price: 0,
        supportsTrial: false,
        trialUnit: "day",
        trialValue: 7,
        contactMode: "disabled",
        contactQrCodeValue: "",
        contactRemark: "",
        storeZone: defaultZoneId,
        storeZones: [defaultZoneId],
        plazaCategory: defaultCategory,
        plazaCategoryByZone: {
          [defaultZoneId]: defaultCategory,
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
      const releaseSnapshot = resolveProductReleaseSnapshot(product, approvedAgents);

      setProductEditor({
        open: true,
        mode: "edit",
        productId: product.id,
        form: {
          name: releaseSnapshot.agentName,
          supplyKind: "agent",
          deliveryKind: "softwareService",
          saleType: "free",
          billingMode: "subscription",
          meteringUnit: "duration",
          billingSpec: "year",
          linkedAgentId: product.linkedAgentId,
          resourcePoolId: undefined,
          description: releaseSnapshot.description,
          identityAvatarUrl: releaseSnapshot.avatarUrl ?? "",
          identityName: releaseSnapshot.agentName,
          identityDescription: releaseSnapshot.description,
          usageGuide: releaseSnapshot.usageGuide,
          tags: releaseSnapshot.sceneTags,
          price: 0,
          subscriptionPlans:
            product.subscriptionPlans?.map(item => ({
              ...item,
            })) ?? emptyProductForm.subscriptionPlans,
          supportsTrial: false,
          trialUnit: product.trialUnit ?? "day",
          trialValue: product.trialValue ?? 7,
          contactMode: "disabled",
          contactQrCodeValue: "",
          contactRemark: "",
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
    [approvedAgents, emptyProductForm.subscriptionPlans],
  );

  const handleCloseProductEditor = useCallback((): void => {
    setProductEditor({
      open: false,
      mode: "create",
      form: emptyProductForm,
    });
  }, [emptyProductForm]);

  const handleSubmitProduct = useCallback((): void => {
    const selectedAgent = productEditor.form.linkedAgentId
      ? approvedAgents.find(item => item.id === productEditor.form.linkedAgentId)
      : undefined;
    const editingProduct = productEditor.productId
      ? products.find(item => item.id === productEditor.productId)
      : undefined;

    if (productEditor.mode === "create" && !selectedAgent) {
      message.warning("请选择已审核通过且未商品化的 AI专家。");
      return;
    }

    if (productEditor.mode === "edit" && !editingProduct) {
      message.warning("未找到当前 AI专家商品。");
      return;
    }

    if (
      productEditor.mode === "create" &&
      selectedAgent &&
      productizedAgentSourceIds.has(getSubmissionSourceAgentId(selectedAgent))
    ) {
      message.warning("该 AI专家已经存在商品，请在商品列表中编辑配置。");
      return;
    }

    const releaseSnapshot = editingProduct
      ? resolveProductReleaseSnapshot(editingProduct, approvedAgents)
      : selectedAgent
        ? resolveAgentSubmissionSnapshot(selectedAgent)
        : null;

    if (!releaseSnapshot) {
      message.warning("未找到绑定 AI专家信息。");
      return;
    }

    if (!releaseSnapshot.sceneTags.length) {
      message.warning("绑定 AI专家缺少场景标签，请先退回开发者补齐。");
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
      linkedAgentId: editingProduct?.linkedAgentId ?? selectedAgent?.id,
      description: releaseSnapshot.description,
      identityAvatarUrl: releaseSnapshot.avatarUrl ?? "",
      identityName: releaseSnapshot.agentName,
      identityDescription: releaseSnapshot.description,
      usageGuide: releaseSnapshot.usageGuide,
      tags: releaseSnapshot.sceneTags,
      price: 0,
      supportsTrial: false,
      billingScopes: ["points"],
      storeZone: productEditor.form.storeZones[0],
      plazaCategory: productEditor.form.plazaCategoryByZone[productEditor.form.storeZones[0]],
      plazaSort: productEditor.form.plazaSort,
      name: releaseSnapshot.agentName,
      contactMode: "disabled",
      contactQrCodeValue: "",
      contactRemark: "",
      visibleTenantIds:
        productEditor.form.plazaVisibility === "tenant" ? productEditor.form.visibleTenantIds : [],
      visibleTenantNames,
    };

    if (productEditor.mode === "create") {
      onCreateProduct(normalizedForm);
      message.success("AI专家商品已创建。");
    } else if (productEditor.productId) {
      onUpdateProduct(productEditor.productId, normalizedForm);
      message.success("商品配置已更新。");
    }

    handleCloseProductEditor();
  }, [
    approvedAgents,
    handleCloseProductEditor,
    onCreateProduct,
    onUpdateProduct,
    productEditor,
    productizedAgentSourceIds,
    products,
    tenants,
  ]);

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
          approvedAgents={approvedAgents}
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
                    placeholder="搜索 AI专家商品、专区、分类"
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
              approvedAgents={approvedAgents}
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
        title={productEditor.mode === "create" ? "新建AI专家商品" : "配置AI专家商品"}
        className={classNames(styles.fixedModal, styles.productEditorModal)}
        width={OPERATIONS_MODAL_WIDTHS.productEditor}
        onCancel={handleCloseProductEditor}
        onOk={handleSubmitProduct}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          {productEditor.mode === "create" ? (
            <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
              <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.linkedAgentId}>
                绑定 AI专家
              </label>
              <Select
                id={PRODUCT_FIELD_IDS.linkedAgentId}
                value={productEditor.form.linkedAgentId}
                placeholder="请选择已审核通过且未商品化的 AI专家"
                options={productizableApprovedAgents.map(item => ({
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
              {!productizableApprovedAgents.length ? (
                <p className={styles.readonlyHint}>暂无可新建商品的已通过 AI专家。</p>
              ) : null}
            </div>
          ) : null}

          {productEditorSnapshot ? (
            <section className={`${adminStyles.detailBlock} ${styles.modalFieldWide}`}>
              <h3 className={adminStyles.detailBlockTitle}>AI 专家信息</h3>
              <div className={styles.productIdentityPreview}>
                <div className={styles.productIdentityAvatar}>
                  {productEditorSnapshot.avatarUrl ? (
                    <img src={productEditorSnapshot.avatarUrl} alt={productEditorSnapshot.agentName} />
                  ) : (
                    <span>{productEditorSnapshot.agentName.slice(0, 1)}</span>
                  )}
                </div>
                <div className={styles.productIdentityContent}>
                  <strong>{productEditorSnapshot.agentName}</strong>
                  <p>{productEditorSnapshot.description}</p>
                  <div className={styles.pillRow}>
                    {productEditorSnapshot.sceneTags.map(tag => (
                      <span key={tag} className={adminStyles.consoleStatusTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

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
  approvedAgents: OperationsAgentSubmission[];
  keyword: string;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  products: OperationsProduct[];
  storeZoneLabelMap: Map<string, string>;
  onNavigateToProduct: (productId: string) => void;
}

const ProductList = ({
  approvedAgents,
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
              <th>场景标签</th>
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
            {products.map(product => {
              const releaseSnapshot = resolveProductReleaseSnapshot(product, approvedAgents);

              return (
                <tr key={product.id}>
                  <td>
                    <button
                      type="button"
                      className={styles.recordEntryButton}
                      onClick={() => onNavigateToProduct(product.id)}
                    >
                      <span className={styles.recordEntryTitle}>
                        {releaseSnapshot.agentName}
                      </span>
                    </button>
                  </td>
                  <td>
                    {releaseSnapshot.sceneTags.length ? (
                      <div className={styles.pillRow}>
                        {releaseSnapshot.sceneTags.map(tag => (
                          <span
                            key={`${product.id}-${tag}`}
                            className={adminStyles.consoleStatusTag}
                          >
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
                    <Button
                      size="small"
                      type="link"
                      onClick={() => onNavigateToProduct(product.id)}
                    >
                      查看详情
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={styles.emptyWrap}>
        <Empty
          description={
            keyword.trim() ? "当前筛选下暂无 AI专家商品。" : "暂无 AI专家商品。"
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
  approvedAgents: OperationsAgentSubmission[];
  storeZoneLabelMap: Map<string, string>;
  productStatusLabels: Record<OperationsProduct["status"], string>;
  onBack: () => void;
  onEdit: (product: OperationsProduct) => void;
  onToggleStatus: (product: OperationsProduct) => void;
}

const ProductInfoTab = ({
  product,
  releaseSnapshot,
  storeZoneLabelMap,
}: {
  product: OperationsProduct;
  releaseSnapshot: ReturnType<typeof resolveProductReleaseSnapshot>;
  storeZoneLabelMap: Map<string, string>;
}): JSX.Element => (
  <div className={styles.productTabGrid}>
    <section className={adminStyles.detailBlock}>
      <h3 className={adminStyles.detailBlockTitle}>商品配置</h3>
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
          <span className={adminStyles.consoleInfoValue}>{getProductVisibilityLabel(product)}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>更新时间</span>
          <span className={adminStyles.consoleInfoValue}>{product.updatedAt}</span>
        </div>
      </div>
    </section>

    <section className={adminStyles.detailBlock}>
      <h3 className={adminStyles.detailBlockTitle}>专家广场展示信息</h3>
      <div className={styles.productIdentityPreview}>
        <div className={styles.productIdentityAvatar}>
          {releaseSnapshot.avatarUrl ? (
            <img src={releaseSnapshot.avatarUrl} alt={releaseSnapshot.agentName} />
          ) : (
            <span>{releaseSnapshot.agentName.slice(0, 1)}</span>
          )}
        </div>
        <div className={styles.productIdentityContent}>
          <strong>{releaseSnapshot.agentName}</strong>
          <p>{releaseSnapshot.description}</p>
          {releaseSnapshot.sceneTags.length ? (
            <div className={styles.pillRow}>
              {releaseSnapshot.sceneTags.map(tag => (
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
        <p>{releaseSnapshot.usageGuide}</p>
      </div>
    </section>
  </div>
);

const ProductDetail = ({
  product,
  approvedAgents,
  storeZoneLabelMap,
  productStatusLabels,
  onBack,
  onEdit,
  onToggleStatus,
}: ProductDetailProps): JSX.Element => {
  const releaseSnapshot = product
    ? resolveProductReleaseSnapshot(product, approvedAgents)
    : null;

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <div className={adminStyles.consoleActions}>
            <Button type="link" size="small" onClick={onBack}>
              返回商品列表
            </Button>
          </div>
          <h1 className={adminStyles.consoleTitle}>
            {releaseSnapshot?.agentName ?? "商品详情"}
          </h1>
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
            <Button onClick={() => onEdit(product)}>编辑配置</Button>
            <Button onClick={() => onToggleStatus(product)}>
              {product.status === "active" ? "下架商品" : "上架商品"}
            </Button>
          </div>
        ) : null}
      </header>

      {product && releaseSnapshot ? (
        <section className={adminStyles.consoleSection}>
          <Tabs
            className={styles.productDetailTabs}
            items={[
              {
                key: "product",
                label: "商品信息",
                children: (
                  <ProductInfoTab
                    product={product}
                    releaseSnapshot={releaseSnapshot}
                    storeZoneLabelMap={storeZoneLabelMap}
                  />
                ),
              },
              {
                key: "agent",
                label: "AI 专家详情",
                children: (
                  <AgentSnapshotDetailPanel
                    snapshot={releaseSnapshot}
                    title="绑定 AI 专家"
                    note="专家广场展示信息直接使用已审核 AI 专家版本快照。"
                  />
                ),
              },
              {
                key: "skills",
                label: "技能列表",
                children: <AgentSnapshotSkillsPanel skills={releaseSnapshot.skills} />,
              },
              {
                key: "files",
                label: "核心文件",
                children: <AgentSnapshotCoreFilesPanel coreFiles={releaseSnapshot.coreFiles} />,
              },
            ]}
          />
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
};
