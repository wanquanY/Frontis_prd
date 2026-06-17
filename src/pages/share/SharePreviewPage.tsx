import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  createMockSharePreviewSnapshot,
  isSharePreviewRevoked,
  loadSharePreviewSnapshot,
  type SharePreviewKind,
  type SharePreviewSnapshot,
} from "@/feature/share/sharePreviewStorage";

import styles from "./SharePreviewPage.module.less";

type ArtifactPreviewKind =
  | "document"
  | "html"
  | "image"
  | "markdown"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "text"
  | "unsupported";

const decodeDataUrlContent = (url?: string): string => {
  if (!url || !url.startsWith("data:")) {
    return "";
  }

  const commaIndex = url.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }

  try {
    return decodeURIComponent(url.slice(commaIndex + 1));
  } catch {
    return "";
  }
};

const getFileExtension = (fileName?: string): string => {
  const normalized = fileName?.trim().toLowerCase() ?? "";
  const lastDotIndex = normalized.lastIndexOf(".");
  return lastDotIndex >= 0 ? normalized.slice(lastDotIndex + 1) : normalized;
};

const resolveArtifactPreviewKind = (
  fileName?: string,
  fileType?: string,
  mimeType?: string,
): ArtifactPreviewKind => {
  const extension = getFileExtension(fileName) || getFileExtension(fileType);
  const normalizedType = fileType?.toLowerCase() ?? "";
  const normalizedMimeType = mimeType?.toLowerCase() ?? "";

  if (normalizedMimeType.includes("pdf") || extension === "pdf") return "pdf";
  if (
    normalizedMimeType.includes("word") ||
    normalizedMimeType.includes("officedocument.wordprocessing") ||
    ["doc", "docx"].includes(extension)
  ) {
    return "document";
  }
  if (
    normalizedMimeType.includes("spreadsheet") ||
    normalizedMimeType.includes("excel") ||
    ["xls", "xlsx"].includes(extension)
  ) {
    return "spreadsheet";
  }
  if (
    normalizedMimeType.includes("presentation") ||
    normalizedMimeType.includes("powerpoint") ||
    ["ppt", "pptx"].includes(extension)
  ) {
    return "presentation";
  }
  if (normalizedMimeType.includes("html") || ["html", "htm"].includes(extension) || normalizedType === "html") return "html";
  if (normalizedMimeType.includes("markdown") || ["md", "markdown"].includes(extension)) {
    return "markdown";
  }
  if (normalizedMimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "svg"].includes(extension)) {
    return "image";
  }
  if (normalizedMimeType.startsWith("text/") || ["txt", "json", "csv"].includes(extension)) {
    return "text";
  }

  return "unsupported";
};

const normalizeDocumentPreviewContent = (content: string): string =>
  content
    .replace(/!\[[^\]]*]\(data:[^)]+\)/g, "图片已包含在原文件中。")
    .replace(/data:[^\s)]+/g, "内嵌资源已省略。")
    .replace(/^#+\s*/gm, "")
    .replace(/\|/g, " ")
    .trim();

const renderDocumentMock = (snapshot: SharePreviewSnapshot): JSX.Element => {
  const artifact = snapshot.artifact;
  const content = normalizeDocumentPreviewContent(
    artifact?.content?.trim() ||
      "分享页直接展示分享内容。用户打开链接后优先看到文档正文，不再经过文件卡片或说明页。",
  );

  return (
    <article className={styles.documentPage}>
      <h1>ME 输出文件预览能力说明</h1>
      <p>
        产物分享用于把 ME 生成的文件以在线页面形式交付给外部协作者。分享链接打开后，页面主体直接展示文件内容。
      </p>
      <h2>本期范围</h2>
      <ul>
        <li>打开分享链接后直接进入内容预览。</li>
        <li>页面不展示额外标签、文件名标题和说明区。</li>
        <li>预览内容保持在页面容器内，不因长链接或内嵌资源撑破布局。</li>
      </ul>
      <h2>页面呈现</h2>
      <p>{content}</p>
      <blockquote>打开分享链接后，用户看到的是内容本身，而不是成果卡片或文件信息页。</blockquote>
    </article>
  );
};

const renderSpreadsheetMock = (): JSX.Element => (
  <div className={styles.sheetPreview}>
    <table>
      <thead>
        <tr>
          <th>模块</th>
          <th>需求</th>
          <th>状态</th>
          <th>负责人</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>分享设置</td>
          <td>点击后直接生成链接</td>
          <td>本期</td>
          <td>ME</td>
        </tr>
        <tr>
          <td>分享预览</td>
          <td>直接展示内容</td>
          <td>本期</td>
          <td>ME</td>
        </tr>
        <tr>
          <td>预览边界</td>
          <td>不展示内部日志</td>
          <td>本期</td>
          <td>ME</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const renderPresentationMock = (): JSX.Element => (
  <div className={styles.slidePreview}>
    <div className={styles.slidePage}>
      <span>Frontis AI</span>
      <h1>产物分享体验升级</h1>
      <p>直接预览内容 · 点击生成链接 · 内容不越界</p>
    </div>
  </div>
);

const renderArtifactPreview = (snapshot: SharePreviewSnapshot): JSX.Element => {
  const artifact = snapshot.artifact;
  if (!artifact) {
    return <div className={styles.emptyState}>分享内容缺失。</div>;
  }

  const previewKind = resolveArtifactPreviewKind(artifact.fileName, artifact.fileType, artifact.mimeType);
  const content = artifact.content || decodeDataUrlContent(artifact.canonicalPath);

  if (previewKind === "markdown") {
    return (
      <div className={styles.markdownCard}>
        <MarkdownRenderer
          source={content || `# ${artifact.fileName}\n\n当前分享快照暂无正文内容。`}
          artifactFileName={artifact.fileName}
          enableMermaidActions={true}
        />
      </div>
    );
  }

  if (previewKind === "html" && artifact.canonicalPath) {
    return <iframe className={styles.previewFrame} src={artifact.canonicalPath} title={artifact.fileName} />;
  }

  if (previewKind === "pdf" && artifact.canonicalPath) {
    return <iframe className={styles.previewFrame} src={artifact.canonicalPath} title={artifact.fileName} />;
  }

  if (previewKind === "image" && artifact.canonicalPath) {
    return <img className={styles.previewImage} src={artifact.canonicalPath} alt={artifact.fileName} />;
  }

  if (previewKind === "document") {
    return renderDocumentMock(snapshot);
  }

  if (previewKind === "spreadsheet") {
    return renderSpreadsheetMock();
  }

  if (previewKind === "presentation") {
    return renderPresentationMock();
  }

  if (previewKind === "text") {
    return <pre className={styles.textPreview}>{content || "当前分享快照暂无正文内容。"}</pre>;
  }

  return (
    <div className={styles.emptyState}>
      <span>当前链接内容暂不支持预览。</span>
    </div>
  );
};

const renderConversationPreview = (snapshot: SharePreviewSnapshot): JSX.Element => {
  const items = snapshot.conversationItems ?? [];
  if (!items.length) {
    return <div className={styles.emptyState}>分享对话内容缺失。</div>;
  }

  return (
    <div className={styles.conversationList}>
      {items.map(item => (
        <article key={item.id} className={styles.conversationItem}>
          <div className={styles.conversationAvatar}>{item.title.slice(0, 1)}</div>
          <div className={styles.conversationBubble}>
            <div className={styles.conversationMeta}>{item.title}</div>
            <MarkdownRenderer source={item.content} />
          </div>
        </article>
      ))}
    </div>
  );
};

const SharePreviewPage = (): JSX.Element => {
  const params = useParams<{ kind: SharePreviewKind; token: string }>();
  const kind = params.kind === "conversation" ? "conversation" : "artifact";
  const token = params.token ?? "";
  const isRevoked = useMemo(() => isSharePreviewRevoked(kind, token), [kind, token]);
  const snapshot = useMemo(
    () =>
      isRevoked
        ? null
        : loadSharePreviewSnapshot(kind, token) ?? createMockSharePreviewSnapshot(kind, token),
    [isRevoked, kind, token],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>F</span>
          <span>Frontis AI</span>
        </div>
        <Link to="/login" className={styles.headerAction}>
          使用 Frontis AI 创建
        </Link>
      </header>

      <section className={styles.previewShell}>
        {snapshot ? (
          snapshot.kind === "artifact" ? (
            renderArtifactPreview(snapshot)
          ) : (
            renderConversationPreview(snapshot)
          )
        ) : (
          <div className={styles.notFoundCard}>
            <h1>分享已取消</h1>
            <p>当前分享链接已取消或不可访问。</p>
            <Link to="/login" className={styles.primaryLink}>
              使用 Frontis AI 创建
            </Link>
          </div>
        )}
      </section>
    </main>
  );
};

export default SharePreviewPage;
