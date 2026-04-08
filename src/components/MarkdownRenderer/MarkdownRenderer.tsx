/**
 * MarkdownRenderer - 支持 mermaid 和 infographic 的 Markdown 渲染组件
 */

import { App as AntdApp } from "antd";
import { toBlob as renderNodeToBlob } from "html-to-image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from "react";
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
  enableMermaidActions?: boolean;
  artifactFileName?: string;
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

const normalizeDiagnosticError = (
  error: unknown,
): {
  name: string;
  message: string;
  stack?: string;
} => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
};

const logMermaidCopyDiagnostic = (stage: string, detail: Record<string, unknown>): void => {
  console.error("[MermaidCopy]", stage, detail);
};

const renderMermaidNodeToPngBlob = async (node: HTMLElement): Promise<Blob> => {
  const blob = await renderNodeToBlob(node, {
    cacheBust: true,
    pixelRatio: Math.max(2, Math.ceil(window.devicePixelRatio || 1)),
    backgroundColor: "#ffffff",
  });

  if (!blob) {
    const error = new Error("Failed to render mermaid node");
    logMermaidCopyDiagnostic("renderMermaidNodeToPngBlob", {
      error: normalizeDiagnosticError(error),
    });
    throw error;
  }

  return blob;
};

const loadSvgImage = (objectUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      const error = new Error("Failed to load mermaid svg");
      logMermaidCopyDiagnostic("loadSvgImage", {
        error: normalizeDiagnosticError(error),
        objectUrl,
      });
      reject(error);
    };
    image.src = objectUrl;
  });

const rasterizeSvgToPngBlob = async (svgMarkup: string): Promise<Blob> => {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadSvgImage(objectUrl);
    const width = Math.max(1, image.naturalWidth || image.width || 1200);
    const height = Math.max(1, image.naturalHeight || image.height || 800);
    const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext("2d");
    if (!context) {
      const error = new Error("Canvas context is unavailable");
      logMermaidCopyDiagnostic("canvasContext", {
        error: normalizeDiagnosticError(error),
        width,
        height,
        scale,
      });
      throw error;
    }

    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(nextBlob => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }

        const error = new Error("Failed to rasterize mermaid diagram");
        logMermaidCopyDiagnostic("canvasToBlob", {
          error: normalizeDiagnosticError(error),
          width,
          height,
          scale,
        });
        reject(error);
      }, "image/png");
    });

    return pngBlob;
  } catch (error) {
    logMermaidCopyDiagnostic("rasterizeSvgToPngBlob", {
      error: normalizeDiagnosticError(error),
      svgLength: svgMarkup.length,
      svgPreview: svgMarkup.slice(0, 200),
    });
    throw error;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/**
 * Mermaid 图表渲染组件
 */
const MermaidBlock = memo(
  ({
    code,
    id,
    enableActions = false,
    downloadFileName,
  }: {
    code: string;
    id: string;
    enableActions?: boolean;
    downloadFileName?: string;
  }) => {
    const { message } = AntdApp.useApp();
    const diagramRef = useRef<HTMLDivElement>(null);
    const [svgMarkup, setSvgMarkup] = useState("");
    const [hasRenderError, setHasRenderError] = useState(false);

    useEffect(() => {
      if (!code.trim()) {
        setSvgMarkup("");
        setHasRenderError(false);
        return;
      }

      let cancelled = false;

      setSvgMarkup("");
      setHasRenderError(false);

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
          if (!cancelled) {
            setSvgMarkup(svg);
            setHasRenderError(false);
          }
        } catch {
          if (!cancelled) {
            setSvgMarkup("");
            setHasRenderError(true);
          }
        }
      };

      void renderMermaid();

      return () => {
        cancelled = true;
      };
    }, [code, id]);

    const handleCopyMermaid = useCallback(async (): Promise<void> => {
      const clipboardItemCtor = typeof window === "undefined" ? undefined : window["ClipboardItem"];

      if (!svgMarkup.trim()) {
        logMermaidCopyDiagnostic("copyBlocked", {
          reason: "svgMarkup is empty",
        });
        message.error("Mermaid 图尚未渲染完成");
        return;
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        !clipboardItemCtor ||
        typeof navigator.clipboard.write !== "function"
      ) {
        logMermaidCopyDiagnostic("clipboardUnsupported", {
          hasNavigator: typeof navigator !== "undefined",
          hasClipboard: typeof navigator !== "undefined" ? Boolean(navigator.clipboard) : false,
          hasClipboardWrite:
            typeof navigator !== "undefined"
              ? typeof navigator.clipboard?.write === "function"
              : false,
          hasClipboardItem: Boolean(clipboardItemCtor),
        });
        message.error("当前环境不支持图片复制");
        return;
      }

      try {
        let pngBlob: Blob;

        if (diagramRef.current) {
          try {
            pngBlob = await renderMermaidNodeToPngBlob(diagramRef.current);
          } catch (error) {
            logMermaidCopyDiagnostic("renderNodeFallback", {
              error: normalizeDiagnosticError(error),
            });
            pngBlob = await rasterizeSvgToPngBlob(svgMarkup);
          }
        } else {
          pngBlob = await rasterizeSvgToPngBlob(svgMarkup);
        }

        await navigator.clipboard.write([
          new clipboardItemCtor({
            "image/png": pngBlob,
          }),
        ]);
        message.success("Mermaid 图片已复制");
      } catch (error) {
        logMermaidCopyDiagnostic("handleCopyMermaid", {
          error: normalizeDiagnosticError(error),
          hasClipboardWrite: typeof navigator.clipboard.write === "function",
          hasClipboardItem: Boolean(clipboardItemCtor),
          svgLength: svgMarkup.length,
          svgPreview: svgMarkup.slice(0, 200),
          userAgent: navigator.userAgent,
        });
        message.error("复制图片失败，请稍后重试");
      }
    }, [message, svgMarkup]);

    const handleDownloadMermaid = useCallback((): void => {
      if (!svgMarkup.trim()) {
        message.error("Mermaid 图尚未渲染完成");
        return;
      }

      const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = downloadFileName ?? "mermaid-diagram.svg";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      message.success("Mermaid 图已开始下载");
    }, [downloadFileName, message, svgMarkup]);

    const content = hasRenderError ? (
      <pre className={styles.diagramError}>
        <code>{code}</code>
      </pre>
    ) : (
      <div
        ref={diagramRef}
        className={styles.mermaidContainer}
        dangerouslySetInnerHTML={svgMarkup ? { __html: svgMarkup } : undefined}
      />
    );

    if (!enableActions) {
      return content;
    }

    return (
      <section className={styles.mermaidCard} aria-label="Mermaid 图表">
        <div className={styles.mermaidToolbar}>
          <span className={styles.mermaidToolbarTag}>Mermaid</span>
          <div className={styles.mermaidToolbarActions}>
            <button
              type="button"
              className={styles.mermaidActionButton}
              onClick={() => {
                void handleCopyMermaid();
              }}
            >
              复制
            </button>
            <button
              type="button"
              className={styles.mermaidActionButton}
              onClick={handleDownloadMermaid}
              disabled={!svgMarkup.trim()}
            >
              下载
            </button>
          </div>
        </div>
        {content}
      </section>
    );
  },
);

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

const resolveMermaidDownloadFileName = (
  artifactFileName: string | undefined,
  diagramIndex: number,
): string => {
  const normalizedBaseName = artifactFileName?.replace(/\.[^.]+$/, "").trim() || "mermaid-diagram";
  return `${normalizedBaseName}-mermaid-${diagramIndex}.svg`;
};

/**
 * MarkdownRenderer 主组件
 */
export function MarkdownRenderer({
  source,
  className,
  enableMermaidActions = false,
  artifactFileName,
}: MarkdownRendererProps) {
  const blocks = parseMarkdownWithDiagrams(source);
  const idPrefix = useRef(`md-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  let mermaidIndex = 0;

  return (
    <div className={className} data-color-mode="light">
      {blocks.map((block, index) => {
        const key = `${idPrefix.current}-${index}`;

        if (block.type === "mermaid") {
          mermaidIndex += 1;

          return (
            <MermaidBlock
              key={key}
              code={block.content}
              id={`mermaid-${key}`}
              enableActions={enableMermaidActions}
              downloadFileName={resolveMermaidDownloadFileName(artifactFileName, mermaidIndex)}
            />
          );
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
