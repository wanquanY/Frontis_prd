import { Navigate, useParams } from "react-router-dom";

import { MarketingPortalSceneDetailView } from "@/feature/marketingPortal/components/MarketingPortalSceneDetailView";
import { getMarketingSceneCatalogItemById } from "@/feature/marketingPortal/sceneCatalog";

/**
 * 营销门户 AI 专家团场景详情页。
 */
export const MarketingPortalSceneDetailPage = (): JSX.Element => {
  const { sceneId } = useParams<{ sceneId: string }>();

  if (!sceneId) {
    return <Navigate replace to="/portal/agents" />;
  }

  const sceneItem = getMarketingSceneCatalogItemById(sceneId);

  if (!sceneItem) {
    return <Navigate replace to="/portal/agents" />;
  }

  return <MarketingPortalSceneDetailView sceneItem={sceneItem} />;
};

export default MarketingPortalSceneDetailPage;
