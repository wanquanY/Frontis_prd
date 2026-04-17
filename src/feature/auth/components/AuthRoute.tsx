import { useEffect, useMemo } from "react";
import type { ReactElement } from "react";

import { Navigate, useLocation } from "react-router-dom";

import {
  findIdentityForPath,
  getLoginPath,
  getTenantCount,
  getTenantIdentities,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { MockAuthRole } from "@/feature/auth/types";

interface AuthRouteProps {
  allowedRole: MockAuthRole | MockAuthRole[];
  children: ReactElement;
}

/**
 * 保护工作台路由，并在角色不匹配时重定向到对应视图。
 */
export const AuthRoute = ({ allowedRole, children }: AuthRouteProps): JSX.Element | null => {
  const location = useLocation();
  const redirectPath = `${location.pathname}${location.search}`;
  const allowed = useMemo(
    () => (Array.isArray(allowedRole) ? allowedRole : [allowedRole]),
    [allowedRole],
  );
  const {
    activateIdentity,
    activeIdentity,
    resolveSessionPath,
    session,
  } = useMockAuth();
  const hasPendingTenantSelection = Boolean(
    session && !activeIdentity && getTenantCount(session.identities) > 1,
  );
  const availableIdentities = session
    ? activeIdentity
      ? getTenantIdentities(session.identities, activeIdentity.tenantId)
      : session.identities
    : [];
  const matchedIdentity =
    !session || hasPendingTenantSelection
      ? null
      : findIdentityForPath(availableIdentities, redirectPath, allowed);

  useEffect(() => {
    if (!session || !matchedIdentity) {
      return;
    }

    if (
      activeIdentity?.id === matchedIdentity.id &&
      session.role &&
      allowed.includes(session.role)
    ) {
      return;
    }

    void activateIdentity(matchedIdentity.id, redirectPath);
  }, [
    activateIdentity,
    activeIdentity?.id,
    allowed,
    matchedIdentity,
    redirectPath,
    session,
  ]);

  if (!session) {
    return <Navigate replace to={`/login?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  if (hasPendingTenantSelection) {
    return <Navigate replace to={getLoginPath(redirectPath)} />;
  }

  if (!matchedIdentity) {
    return <Navigate replace to={resolveSessionPath(session)} />;
  }

  if (activeIdentity?.id !== matchedIdentity.id || !session.role || !allowed.includes(session.role)) {
    return null;
  }

  return children;
};
