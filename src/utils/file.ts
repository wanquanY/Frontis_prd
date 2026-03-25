/**
 * getFileExtension
 *
 * 获取文件名后缀（不含 `.`），统一返回小写；若不存在后缀则返回空字符串。
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex >= filename.length - 1) return "";
  return filename.slice(lastDotIndex + 1).toLowerCase();
};

/**
 * formatFileSize
 *
 * 将字节数格式化为可读字符串（B / KB / MB）。
 */
export const formatFileSize = (size: number): string => {
  if (!Number.isFinite(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const IMAGE_FILE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

const ZIP_FILE_MIME_TYPES = new Set([
  "application/x-zip",
  "application/x-zip-compressed",
  "application/zip",
  "multipart/x-zip",
]);

const SKILL_PACKAGE_FILE_EXTENSIONS = new Set(["skill", "zip"]);

/**
 * Skill 包文件选择器 accept 属性。
 */
export const SKILL_PACKAGE_ACCEPT_ATTR: string =
  ".skill,.zip,application/zip,application/x-zip,application/x-zip-compressed,multipart/x-zip";

/**
 * isImageFile
 *
 * 根据 MIME 或扩展名判断文件是否为图片。
 */
export const isImageFile = (file: Pick<File, "name" | "type">): boolean => {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_FILE_EXTENSIONS.has(getFileExtension(file.name));
};

/**
 * isSkillPackageFile
 *
 * 根据 MIME 或扩展名判断文件是否为 Skill 压缩包。
 */
export const isSkillPackageFile = (file: Pick<File, "name" | "type">): boolean => {
  const normalizedType = file.type.trim().toLowerCase();
  if (ZIP_FILE_MIME_TYPES.has(normalizedType)) return true;
  return SKILL_PACKAGE_FILE_EXTENSIONS.has(getFileExtension(file.name));
};

/**
 * resolveSkillPackageMimeType
 *
 * 归一化 Skill 包 MIME；对 `.skill` 这类扩展名文件统一按 zip 处理。
 */
export const resolveSkillPackageMimeType = (file: Pick<File, "name" | "type">): string => {
  const normalizedType = file.type.trim().toLowerCase();
  if (ZIP_FILE_MIME_TYPES.has(normalizedType)) {
    return normalizedType;
  }
  if (SKILL_PACKAGE_FILE_EXTENSIONS.has(getFileExtension(file.name))) {
    return "application/zip";
  }
  return normalizedType || "application/zip";
};
