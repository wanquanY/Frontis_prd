import { v4 as uuidv4 } from "uuid";
import type { StorageSTSResponse } from "@/apis/FileApi";
import { useHomeStore } from "@/store/home";
import { useAuthStore } from "@/store/auth";

export interface TencentUploadResult {
  key: string;
  location: string;
  etag?: string;
}

type ProgressCallback = (percent: number) => void;

/**
 * 使用临时凭证上传文件到腾讯云 COS
 *
 * @param file - 要上传的文件
 * @param sts - STS 临时凭证
 * @param onProgress - 上传进度回调
 * @param category - 文件分类（传入时路径包含 identity 和 category 层）
 *   - "attachments" 附件
 *   - "space_data" 空间文件
 *   - "space_cover" 空间封面
 */
export const uploadToTencentCloud = async (
  file: File,
  sts: StorageSTSResponse,
  onProgress?: ProgressCallback,
  category?: string,
): Promise<TencentUploadResult> => {
  const { default: COS } = await import("cos-js-sdk-v5");
  const cos = new COS({
    SecretId: sts.access_key_id,
    SecretKey: sts.secret_access_key,
    SecurityToken: sts.session_token,
  });
  const bizConfig = useHomeStore.getState().bizConfig;
  const tenant = useAuthStore.getState().tenant;
  const user = useAuthStore.getState().user;

  const fileExtension =
    file.name.lastIndexOf(".") > -1 ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const uniqueFileName = `${uuidv4()}${fileExtension}`;
  const prefix = bizConfig?.storage?.path_prefix || "";

  // 传入 category 时使用新路径: {prefix}/tenant/{tenant_id}/identity/{identity_id}/{category}/{uuid}.{ext}
  // 否则保持旧路径: {prefix}/tenant/{tenant_id}/{uuid}.{ext}
  const key = category
    ? `${prefix}/tenant/${tenant?.id}/identity/${user?.id}/${category}/${uniqueFileName}`
    : `${prefix}/tenant/${tenant?.id}/${uniqueFileName}`;

  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: sts.bucket,
        Region: sts.region,
        Key: key,
        Body: file,
        ContentType: file.type || undefined,
        onProgress: (progressData: { percent?: number }) => {
          if (onProgress) {
            const percent = Math.min(100, Math.max(0, (progressData.percent || 0) * 100));
            onProgress(percent);
          }
        },
      },
      (err: unknown, data: { Location?: string; ETag?: string }) => {
        if (err) {
          console.error("上传到腾讯云 COS 失败:", err);
          reject(err);
          return;
        }
        const fallbackLocation = `https://${sts.bucket}.cos.${sts.region}.myqcloud.com/${encodeURI(key)}`;
        const location = data?.Location
          ? data.Location.startsWith("http")
            ? data.Location
            : `https://${data.Location}`
          : fallbackLocation;
        resolve({
          key,
          location,
          etag: data?.ETag,
        });
      },
    );
  });
};
