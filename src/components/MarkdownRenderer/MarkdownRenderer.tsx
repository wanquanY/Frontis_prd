/**
 * MarkdownRenderer - 支持 mermaid 和 infographic 的 Markdown 渲染组件
 */

import { useEffect, useRef, memo, lazy, Suspense, Component, type ReactNode } from "react";
import { wrapUnfencedDiagrams } from "@/utils/diagramPreprocess";
import styles from "./MarkdownRenderer.module.less";

/** 懒加载 MDEditor.Markdown 预览组件（~1MB，仅渲染 markdown 内容时按需加载） */
const LazyMarkdownPreview = lazy(() =>
  import("@uiw/react-md-editor").then(mod => ({
    default: mod.default.Markdown,
  })),
);

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

interface MarkdownPreviewBoundaryProps {
  content: string;
  children: ReactNode;
}

interface MarkdownPreviewBoundaryState {
  hasError: boolean;
}

class MarkdownPreviewBoundary extends Component<
  MarkdownPreviewBoundaryProps,
  MarkdownPreviewBoundaryState
> {
  state: MarkdownPreviewBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarkdownPreviewBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: MarkdownPreviewBoundaryProps): void {
    if (prevProps.content !== this.props.content && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre className={styles.diagramError}>
          <code>{this.props.content}</code>
        </pre>
      );
    }
    return this.props.children;
  }
}

/** 全局自增计数器，确保 mermaid render ID 永远唯一（解决 StrictMode 双重挂载问题） */
let mermaidRenderSeq = 0;

/**
 * Mermaid 图表渲染组件
 */
const MermaidBlock = memo(({ code, id }: { code: string; id: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;

    let cancelled = false;

    const renderMermaid = async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });
        // 每次调用用唯一 ID，避免 StrictMode 双重挂载时 ID 冲突
        const renderId = `${id}-${++mermaidRenderSeq}`;
        const { svg } = await mermaid.render(renderId, code.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="${styles.diagramError}"><code>${code}</code></pre>`;
        }
      }
    };

    void renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return <div ref={containerRef} className={styles.mermaidContainer} />;
});

MermaidBlock.displayName = "MermaidBlock";

/** 候选 infographic 模板（未指定时随机选取） */
const INFOGRAPHIC_TEMPLATES = [
  "list-grid-ribbon-card",
  "list-grid-candy-card-lite",
  "list-grid-compact-card",
  "list-grid-badge-card",
  "list-grid-progress-card",
  "list-row-circular-progress",
];

/** 简单字符串 hash（djb2），用于确定性选模板 */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * 确保 infographic 语法包含模板声明（第一行 `infographic <template>`）
 */
function ensureInfographicTemplate(code: string, id: string): string {
  const trimmed = code.trim();
  // 已有模板声明
  if (/^infographic\s/m.test(trimmed)) return trimmed;
  // 根据 id hash 确定性选取模板
  const tpl = INFOGRAPHIC_TEMPLATES[hashStr(id) % INFOGRAPHIC_TEMPLATES.length];
  return `infographic ${tpl}\n${trimmed}`;
}

/**
 * Infographic 信息图渲染组件
 */
const InfographicBlock = memo(({ code, id }: { code: string; id: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const igRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;

    let cancelled = false;

    const renderInfographic = async () => {
      try {
        const { Infographic } = await import("@antv/infographic");
        if (cancelled) return;

        igRef.current?.destroy();

        const syntax = ensureInfographicTemplate(code, id);
        const ig = new Infographic({
          container: containerRef.current!,
          width: "100%",
        });

        // 监听 error 事件（库内部通过 emitter 报错，不会抛异常）
        ig.on("error", (err: unknown) => {
          console.warn("Infographic error:", err);
        });

        ig.render(syntax);
        igRef.current = ig;
      } catch (err) {
        console.error("Infographic render error:", err);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="${styles.diagramError}"><code>${code}</code></pre>`;
        }
      }
    };

    void renderInfographic();

    return () => {
      cancelled = true;
      igRef.current?.destroy();
      igRef.current = null;
    };
  }, [code, id]);

  return <div ref={containerRef} id={id} className={styles.infographicContainer} />;
});

InfographicBlock.displayName = "InfographicBlock";

/**
 * 解析 markdown 中的 mermaid 和 infographic 代码块。
 * 先预处理裸写 DSL（自动包围栏），再统一提取 fenced blocks。
 */
function parseMarkdownWithDiagrams(
  source: string,
): Array<{ type: "markdown" | "mermaid" | "infographic"; content: string }> {
  // 预处理：裸写 DSL 自动包上代码围栏
  const preprocessed = wrapUnfencedDiagrams(source);

  const blocks: Array<{ type: "markdown" | "mermaid" | "infographic"; content: string }> = [];
  const pattern = /```(mermaid|infographic)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(preprocessed)) !== null) {
    if (match.index > lastIndex) {
      const mdContent = preprocessed.slice(lastIndex, match.index).trim();
      if (mdContent) {
        blocks.push({ type: "markdown", content: mdContent });
      }
    }

    const diagramType = match[1] as "mermaid" | "infographic";
    blocks.push({ type: diagramType, content: match[2] });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < preprocessed.length) {
    const mdContent = preprocessed.slice(lastIndex).trim();
    if (mdContent) {
      blocks.push({ type: "markdown", content: mdContent });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: "markdown", content: source });
  }

  return blocks;
}

/**
 * MarkdownRenderer 主组件
 */
export function MarkdownRenderer({ source, className }: MarkdownRendererProps) {
  const blocks = parseMarkdownWithDiagrams(source);
  const idPrefix = useRef(`md-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  return (
    <div className={className} data-color-mode="light">
      {blocks.map((block, index) => {
        const key = `${idPrefix.current}-${index}`;

        if (block.type === "mermaid") {
          return <MermaidBlock key={key} code={block.content} id={`mermaid-${key}`} />;
        }

        if (block.type === "infographic") {
          return <InfographicBlock key={key} code={block.content} id={`infographic-${key}`} />;
        }

        return (
          <Suspense key={key} fallback={null}>
            <MarkdownPreviewBoundary content={block.content}>
              <LazyMarkdownPreview source={block.content} />
            </MarkdownPreviewBoundary>
          </Suspense>
        );
      })}
    </div>
  );
}

export default MarkdownRenderer;
