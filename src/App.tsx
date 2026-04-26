import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthRoute } from "@/feature/auth/components/AuthRoute";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { OperationsAuthRoute } from "@/feature/operations/components/OperationsAuthRoute";
import type { FrontisWebRole } from "@/pages/types";

const FrontisAdminPage = lazy(() => import("@/pages/FrontisAdminPage"));
const IdentitySelectionPage = lazy(() => import("@/pages/identity/IdentitySelectionPage"));
const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
const UnifiedWorkbenchPage = lazy(() => import("@/pages/unifiedWorkbench/UnifiedWorkbenchPage"));
const UserManualPage = lazy(() => import("@/pages/UserManualPage"));
const OperationsLoginPage = lazy(() => import("@/pages/operations/login/OperationsLoginPage"));
const OperationsPlatformPage = lazy(() => import("@/pages/operations/OperationsPlatformPage"));
const MarketingPortalShellPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalShellPage"),
);
const MarketingPortalHomePage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalHomePage"),
);
const MarketingPortalAgentsPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalAgentsPage"),
);
const MarketingPortalSceneDetailPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalSceneDetailPage"),
);
const MarketingPortalAgentDetailPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalAgentDetailPage"),
);
const MarketingPortalCasesPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalCasesPage"),
);
const MarketingPortalCaseDetailPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalCaseDetailPage"),
);
const MarketingPortalContactPage = lazy(
  () => import("@/pages/marketingPortal/MarketingPortalContactPage"),
);

const getLegacyFdeRedirectPath = (role?: FrontisWebRole | null): string =>
  role === "admin" ? "/web/admin/workspace/frontis-dev" : "/web/employee/frontis-dev";

const LegacyFdeRouteRedirect = (): JSX.Element => {
  const { session } = useMockAuth();

  return <Navigate replace to={getLegacyFdeRedirectPath(session?.role)} />;
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
          <Route path="/" element={<Navigate replace to="/portal" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ops/login" element={<OperationsLoginPage />} />
          <Route path="/user-manual" element={<UserManualPage />} />
          <Route path="/select-tenant" element={<IdentitySelectionPage />} />
          <Route path="/select-identity" element={<Navigate replace to="/select-tenant" />} />
          <Route path="/portal" element={<MarketingPortalShellPage />}>
            <Route index element={<MarketingPortalHomePage />} />
            <Route path="agents" element={<MarketingPortalAgentsPage />} />
            <Route path="agents/scenes/:sceneId" element={<MarketingPortalSceneDetailPage />} />
            <Route path="agents/:agentSlug" element={<MarketingPortalAgentDetailPage />} />
            <Route path="cases" element={<MarketingPortalCasesPage />} />
            <Route path="cases/:caseSlug" element={<MarketingPortalCaseDetailPage />} />
            <Route path="contact" element={<MarketingPortalContactPage />} />
            <Route path="*" element={<Navigate replace to="/portal" />} />
          </Route>
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
            path="/ops/agents/:submissionId"
            element={
              <OperationsAuthRoute>
                <Navigate replace to="/ops/agents" />
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
            path="/ops/usage/:recordId"
            element={
              <OperationsAuthRoute>
                <Navigate replace to="/ops/tenants" />
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
          <Route
            path="/fde"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <LegacyFdeRouteRedirect />
              </AuthRoute>
            }
          />
          <Route
            path="/fde/:tabPath"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <LegacyFdeRouteRedirect />
              </AuthRoute>
            }
          />
          <Route
            path="/fde-dev/*"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <LegacyFdeRouteRedirect />
              </AuthRoute>
            }
          />
          <Route path="*" element={<Navigate replace to="/portal" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
