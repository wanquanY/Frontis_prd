import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthRoute } from "@/feature/auth/components/AuthRoute";

const FrontisPage = lazy(() => import("@/pages/FrontisPage"));
const FrontisAdminPage = lazy(() => import("@/pages/FrontisAdminPage"));
const OpenClawWorkspaceV2Page = lazy(() => import("@/pages/OpenClawWorkspaceV2Page"));
const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
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
const FdeWorkbenchPage = lazy(() => import("@/pages/fde/FdeWorkbenchPage"));

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
            path="/web/employee"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <FrontisPage viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin"
            element={
              <AuthRoute allowedRole="admin">
                <FrontisAdminPage />
              </AuthRoute>
            }
          />
          <Route
            path="/web/employee/v2"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <OpenClawWorkspaceV2Page viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/employee/v2/agents"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <OpenClawWorkspaceV2Page viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/employee/v2/channels"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <OpenClawWorkspaceV2Page viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/employee/v2/tasks"
            element={
              <AuthRoute allowedRole={["employee", "admin"]}>
                <OpenClawWorkspaceV2Page viewRole="employee" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/workspace"
            element={
              <AuthRoute allowedRole="admin">
                <FrontisPage viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/v2"
            element={
              <AuthRoute allowedRole="admin">
                <FrontisAdminPage workspacePath="/web/admin/v2/workspace" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/v2/workspace"
            element={
              <AuthRoute allowedRole="admin">
                <OpenClawWorkspaceV2Page viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/v2/workspace/agents"
            element={
              <AuthRoute allowedRole="admin">
                <OpenClawWorkspaceV2Page viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/v2/workspace/channels"
            element={
              <AuthRoute allowedRole="admin">
                <OpenClawWorkspaceV2Page viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route
            path="/web/admin/v2/workspace/tasks"
            element={
              <AuthRoute allowedRole="admin">
                <OpenClawWorkspaceV2Page viewRole="admin" />
              </AuthRoute>
            }
          />
          <Route
            path="/fde"
            element={
              <AuthRoute allowedRole={["fdeAdmin", "fdeMember"]}>
                <FdeWorkbenchPage />
              </AuthRoute>
            }
          />
          <Route
            path="/fde/:tabPath"
            element={
              <AuthRoute allowedRole={["fdeAdmin", "fdeMember"]}>
                <FdeWorkbenchPage />
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
