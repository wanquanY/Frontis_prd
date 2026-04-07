import { Component, type ReactNode } from "react";

import styles from "./BlockItem.module.less";

/**
 * Markdown 渲染错误边界属性。
 */
export interface MarkdownErrorBoundaryProps {
  content: string;
  children: ReactNode;
}

interface MarkdownErrorBoundaryState {
  hasError: boolean;
}

/**
 * 为 Markdown 渲染提供降级兜底，异常时回退为纯文本。
 */
export class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  state: MarkdownErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: MarkdownErrorBoundaryProps): void {
    if (prevProps.content !== this.props.content && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className={styles.text}>{this.props.content}</div>;
    }

    return this.props.children;
  }
}
