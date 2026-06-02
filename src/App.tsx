import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthRoute } from "@/feature/auth/components/AuthRoute";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { OperationsAuthRoute } from "@/feature/operations/components/OperationsAuthRoute";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";

const FrontisAdminPage = lazy(() => import("@/pages/FrontisAdminPage"));
const IdentitySelectionPage = lazy(() => import("@/pages/identity/IdentitySelectionPage"));
const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
const UnifiedWorkbenchPage = lazy(() => import("@/pages/unifiedWorkbench/UnifiedWorkbenchPage"));
const UserManualPage = lazy(() => import("@/pages/UserManualPage"));
const OperationsPlatformPage = lazy(() => import("@/pages/operations/OperationsPlatformPage"));

const LegacyOperationsLoginRedirect = (): JSX.Element => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get("redirect")?.trim();
  const loginPath = redirectPath?.startsWith("/")
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : "/login";

  return <Navigate replace to={loginPath} />;
};

const AdminDeploymentRedirect = (): JSX.Element => {
  const { activeIdentity } = useMockAuth();
  const tenantSnapshot = getMockTenantManagementSnapshot(activeIdentity?.tenantId);
  const adminPath =
    tenantSnapshot?.deploymentMode === "privateCloud"
      ? "/web/admin/private-cloud"
      : "/web/admin/public-cloud";

  return <Navigate replace to={adminPath} />;
};

/**
 * App
 *
 * Frontis 原型仓库根组件，直接渲染主页面。
 */
const App = (): JSX.Element => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div />}>
        <Routes>
          <Route path="/" element={<Navigate replace to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate replace to="/login" />} />
          <Route path="/ops/login" element={<LegacyOperationsLoginRedirect />} />
          <Route path="/user-manual" element={<UserManualPage />} />
          <Route path="/select-tenant" element={<IdentitySelectionPage />} />
          <Route path="/select-identity" element={<Navigate replace to="/select-tenant" />} />
          <Route
            path="/ops"
            element={
              <OperationsAuthRoute>
                <OperationsPlatformPage />
              </OperationsAuthRoute>
            }
          />
          <Route
            path="/ops/tenants/:tenantId"
            element={
              <OperationsAuthRoute>
                <OperationsPlatformPage />
              </OperationsAuthRoute>
            }
          />
          <Route
            path="/ops/products/:productId"
            element={
              <OperationsAuthRoute>
                <OperationsPlatformPage />
              </OperationsAuthRoute>
            }
          />
          <Route
            path="/ops/agents/:submissionId"
            element={
              <OperationsAuthRoute>
                <Navigate replace to="/ops/agents" />
              </OperationsAuthRoute>
            }
          />
          <Route
            path="/ops/:tabPath"
            element={
              <OperationsAuthRoute>
                <OperationsPlatformPage />
              </OperationsAuthRoute>
            }
          />
          <Route
            path="/web/employee"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <UnifiedWorkbenchPage viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/employee/:tabPath"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <UnifiedWorkbenchPage viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin"
            element={
              <AuthRoute allowedRole={["admin"]}>
                <AdminDeploymentRedirect />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/public-cloud"
            element={
              <AuthRoute allowedRole={["admin"]}>
                <FrontisAdminPage />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/private-cloud"
            element={
              <AuthRoute allowedRole={["admin"]}>
                <FrontisAdminPage />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/workspace"
            element={
              <AuthRoute allowedRole={["admin"]}>
                <UnifiedWorkbenchPage viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/workspace/:tabPath"
            element={
              <AuthRoute allowedRole={["admin"]}>
                <UnifiedWorkbenchPage viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route path="*" element={<Navigate replace to="/login" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
