import { Navigate, useLocation } from "react-router-dom";

/**
 * 兼容旧的企业选择路由，统一回到登录页内弹窗流程。
 */
export const IdentitySelectionPage = (): JSX.Element => {
  const location = useLocation();

  return <Navigate replace to={`/login${location.search}`} />;
};

export default IdentitySelectionPage;
