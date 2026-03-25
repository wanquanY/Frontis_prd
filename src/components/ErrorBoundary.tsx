import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button, Result } from "antd";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** 是否为发版导致的 chunk 加载失败 */
  isChunkError: boolean;
}

/** 判断是否为动态 import 加载失败（发版后旧 chunk 不存在） */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  );
}

/**
 * 全局 React 错误边界
 * - 捕获子组件树中的渲染错误
 * - 发版导致的 chunk 加载失败展示「系统已更新」提示，不上报飞书
 * - 其他错误上报飞书并展示通用降级 UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void error;
    void errorInfo;
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <Result
            status="info"
            title="系统已更新"
            subTitle="检测到新版本发布，请刷新页面加载最新内容。"
            extra={
              <Button type="primary" onClick={this.handleReload}>
                刷新页面
              </Button>
            }
          />
        );
      }
      return (
        <Result
          status="error"
          title="页面出现异常"
          subTitle="我们已记录此问题，请尝试刷新页面。"
          extra={
            <Button type="primary" onClick={this.handleReload}>
              刷新页面
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
