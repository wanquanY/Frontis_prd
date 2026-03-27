import type { ReactElement } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { FrontisWebRole } from "@/pages/types";

interface AuthRouteProps {
  allowedRole: FrontisWebRole;
  children: ReactElement;
}

/**
 * 保护工作台路由，并在角色不匹配时重定向到对应视图。
 */
export const AuthRoute = ({ allowedRole, children }: AuthRouteProps): JSX.Element => {
  const location = useLocation();
  const { getDefaultPathByRole, session } = useMockAuth();

  if (!session) {
    const redirectPath = `${location.pathname}${location.search}`;

    return <Navigate replace to={`/login?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  if (session.role !== allowedRole) {
    return <Navigate replace to={getDefaultPathByRole(session.role)} />;
  }

  return children;
};
