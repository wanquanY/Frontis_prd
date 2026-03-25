import { ErrorBoundary } from "@/components/ErrorBoundary";
import FrontisPage from "@/pages/FrontisPage";

/**
 * App
 *
 * Frontis 原型仓库根组件，直接渲染主页面。
 */
const App = (): JSX.Element => {
  return (
    <ErrorBoundary>
      <FrontisPage />
    </ErrorBoundary>
  );
};

export default App;
