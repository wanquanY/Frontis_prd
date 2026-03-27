import { Navigate, useParams } from "react-router-dom";

import { MarketingPortalCaseDetailView } from "@/feature/marketingPortal/components/MarketingPortalCaseDetailView";
import { getMarketingCaseStudyBySlug } from "@/feature/marketingPortal/utils";

/**
 * 营销门户案例详情页。
 */
export const MarketingPortalCaseDetailPage = (): JSX.Element => {
  const { caseSlug } = useParams<{ caseSlug: string }>();

  if (!caseSlug) {
    return <Navigate replace to="/portal/cases" />;
  }

  const caseStudy = getMarketingCaseStudyBySlug(caseSlug);

  if (!caseStudy) {
    return <Navigate replace to="/portal/cases" />;
  }

  return <MarketingPortalCaseDetailView caseStudy={caseStudy} />;
};

export default MarketingPortalCaseDetailPage;
