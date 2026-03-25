import { getStorageSTS } from "@/apis/FileApi";
import { createSkillFileAsset, type SkillFileAssetPurpose } from "@/apis/SkillApi";
import { resolveSkillPackageMimeType } from "@/utils/file";
import { uploadToTencentCloud } from "@/utils/tencentUpload";

const resolveMimeType = (file: File, fallback: string): string => {
  if (file.type.trim()) {
    return file.type;
  }
  return fallback;
};

const computeSha256 = async (file: File): Promise<string> => {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new Error("当前浏览器环境不支持文件摘要计算，无法上传 Skill");
  }
  const buffer = await file.arrayBuffer();
  const digest = await webCrypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
};

export async function uploadSkillAsset(
  file: File,
  purpose: SkillFileAssetPurpose,
  category: "archive" | "image",
): Promise<number> {
  const [sts, sha256] = await Promise.all([getStorageSTS(), computeSha256(file)]);
  const uploadResult = await uploadToTencentCloud(file, sts, undefined, purpose);
  const asset = await createSkillFileAsset({
    name: file.name,
    // Keep the stored path directly downloadable so the skill parser can fetch it
    // even if the runtime side only needs a plain URL.
    storage_path: uploadResult.location,
    size: file.size,
    mime_type:
      purpose === "skill_cover"
        ? resolveMimeType(file, "image/png")
        : resolveSkillPackageMimeType(file),
    sha256,
    purpose,
    category,
  });
  return asset.file_id;
}
