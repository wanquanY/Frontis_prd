import { useEffect, useMemo } from "react";
import type { ReactElement } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { findIdentityForPath } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";

interface OperationsAuthRouteProps {
  children: ReactElement;
}

/**
 * 保护运营后台路由，未登录时统一跳转到运营后台登录页。
 */
export const OperationsAuthRoute = ({ children }: OperationsAuthRouteProps): JSX.Element | null => {
  const location = useLocation();
  const redirectPath = `${location.pathname}${location.search}`;
  const { session: unifiedSession } = useMockAuth();
  const { loginByAccountId, logout, session } = useOperationsAuth();
  const operationsIdentity = useMemo(
    () => findIdentityForPath(unifiedSession?.identities, redirectPath, ["admin"]),
    [redirectPath, unifiedSession?.identities],
  );

  useEffect(() => {
    if (!operationsIdentity?.operationsAccountId) {
      if (session) {
        logout();
      }

      return;
    }

    if (!session || session.accountId !== operationsIdentity.operationsAccountId) {
      loginByAccountId(operationsIdentity.operationsAccountId, redirectPath);
    }
  }, [loginByAccountId, logout, operationsIdentity, redirectPath, session]);

  if (!unifiedSession) {
    return <Navigate replace to={`/login?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  if (!operationsIdentity?.operationsAccountId) {
    return <Navigate replace to="/" />;
  }

  if (!session || session.accountId !== operationsIdentity.operationsAccountId) {
    return null;
  }

  return children;
};
