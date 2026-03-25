import { ErrorBoundary } from "@/components/ErrorBoundary";
import PrdPage from "@/pages/prd/PrdPage";

/**
 * App
 *
 * Frontis PRD 独立仓库根组件，直接渲染 PRD 页面。
 */
const App = (): JSX.Element => {
  return (
    <ErrorBoundary>
      <PrdPage />
    </ErrorBoundary>
  );
};

export default App;
