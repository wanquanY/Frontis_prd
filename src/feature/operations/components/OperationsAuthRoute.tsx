import type { ReactElement } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";

interface OperationsAuthRouteProps {
  children: ReactElement;
}

/**
 * 保护运营后台路由，未登录时统一跳转到运营后台登录页。
 */
export const OperationsAuthRoute = ({
  children,
}: OperationsAuthRouteProps): JSX.Element => {
  const location = useLocation();
  const { session } = useOperationsAuth();

  if (!session) {
    const redirectPath = `${location.pathname}${location.search}`;

    return <Navigate replace to={`/ops/login?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  return children;
};

