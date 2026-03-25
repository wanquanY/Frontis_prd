/**
 * 对话附件允许的文件扩展名。
 */
export const CHAT_ATTACHMENT_ALLOWED_EXTENSIONS: readonly string[] = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".ppt",
  ".pptx",
  ".md",
  ".markdown",
];

/**
 * 对话附件允许的 MIME 类型。
 */
export const CHAT_ATTACHMENT_ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * file input 的 accept 属性值。
 */
export const CHAT_ATTACHMENT_ACCEPT_ATTR: string = CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.join(",");

/**
 * 判断文件是否允许作为对话附件上传。
 */
export const isChatAttachmentFileAllowed = (file: File): boolean => {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  return (
    CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension) ||
    CHAT_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.type)
  );
};
