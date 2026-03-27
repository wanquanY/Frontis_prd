import { PORTAL_EXPERT_SCENES } from "@/feature/marketingPortal/portalData";
import type {
  MarketingSceneCatalogCategory,
  MarketingSceneCatalogIconKey,
  MarketingSceneCatalogItem,
} from "@/feature/marketingPortal/types";
import { getMarketingAgentsBySceneId } from "@/feature/marketingPortal/utils";

interface MarketingSceneCatalogMetaItem {
  categories: MarketingSceneCatalogCategory[];
  iconKey: MarketingSceneCatalogIconKey;
}

const DEFAULT_SCENE_CATEGORY: MarketingSceneCatalogCategory = "经营管理";

const SCENE_CATALOG_META: Record<string, MarketingSceneCatalogMetaItem> = {
  "scene-commerce-management": {
    categories: ["经营管理", "电商运营"],
    iconKey: "shop",
  },
  "scene-sales-growth": {
    categories: ["经营管理", "电商运营"],
    iconKey: "growth",
  },
  "scene-content-creation": {
    categories: ["内容创作", "电商运营"],
    iconKey: "content",
  },
  "scene-customer-service": {
    categories: ["经营管理", "零售"],
    iconKey: "service",
  },
  "scene-organization": {
    categories: ["人力资源", "经营管理"],
    iconKey: "organization",
  },
  "scene-finance-operations": {
    categories: ["经营管理", "零售"],
    iconKey: "finance",
  },
  "scene-store-operations": {
    categories: ["零售", "经营管理"],
    iconKey: "store",
  },
  "scene-campaign-delivery": {
    categories: ["内容创作", "电商运营"],
    iconKey: "campaign",
  },
  "scene-training-enablement": {
    categories: ["人力资源", "内容创作"],
    iconKey: "training",
  },
  "scene-executive-command": {
    categories: ["经营管理", "零售"],
    iconKey: "dashboard",
  },
};

/**
 * AI 专家团场景筛选项。
 */
export const MARKETING_SCENE_CATALOG_CATEGORIES: MarketingSceneCatalogCategory[] = [
  "全部",
  "经营管理",
  "电商运营",
  "内容创作",
  "人力资源",
  "零售",
];

/**
 * 获取 AI 专家团目录项。
 */
export const getMarketingSceneCatalogItems = (): MarketingSceneCatalogItem[] =>
  PORTAL_EXPERT_SCENES.map(scene => {
    const sceneMeta = SCENE_CATALOG_META[scene.id];

    return {
      scene,
      categories: sceneMeta?.categories ?? [DEFAULT_SCENE_CATEGORY],
      iconKey: sceneMeta?.iconKey ?? "dashboard",
      agents: getMarketingAgentsBySceneId(scene.id),
    };
  });

/**
 * 根据场景 id 获取目录项。
 */
export const getMarketingSceneCatalogItemById = (
  sceneId: string,
): MarketingSceneCatalogItem | null =>
  getMarketingSceneCatalogItems().find(item => item.scene.id === sceneId) ?? null;

/**
 * 获取某个分类下的场景目录项。
 */
export const getVisibleMarketingSceneCatalogItems = (
  category: MarketingSceneCatalogCategory,
): MarketingSceneCatalogItem[] =>
  getMarketingSceneCatalogItems().filter(item => {
    if (category === "全部") {
      return true;
    }

    return item.categories.includes(category);
  });
