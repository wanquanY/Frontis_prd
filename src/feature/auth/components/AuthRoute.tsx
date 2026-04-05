import type { ReactElement } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { MockAuthRole } from "@/feature/auth/types";

interface AuthRouteProps {
  allowedRole: MockAuthRole | MockAuthRole[];
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

  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];

  if (!allowed.includes(session.role)) {
    return <Navigate replace to={getDefaultPathByRole(session.role)} />;
  }

  return children;
};
