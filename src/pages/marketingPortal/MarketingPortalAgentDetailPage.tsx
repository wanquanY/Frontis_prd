import { Navigate, useParams } from "react-router-dom";

import { MarketingPortalAgentDetailView } from "@/feature/marketingPortal/components/MarketingPortalAgentDetailView";
import { getMarketingAgentBySlug } from "@/feature/marketingPortal/utils";

/**
 * 营销门户 Agent 详情页。
 */
export const MarketingPortalAgentDetailPage = (): JSX.Element => {
  const { agentSlug } = useParams<{ agentSlug: string }>();

  if (!agentSlug) {
    return <Navigate replace to="/portal/agents" />;
  }

  const agent = getMarketingAgentBySlug(agentSlug);

  if (!agent) {
    return <Navigate replace to="/portal/agents" />;
  }

  return <MarketingPortalAgentDetailView agent={agent} />;
};

export default MarketingPortalAgentDetailPage;
