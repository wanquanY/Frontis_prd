import type { NameAvatarMeta } from "@/utils/nameAvatar";
import { buildNameAvatarMeta } from "@/utils/nameAvatar";

export type SynClawSpaceAvatarMeta = NameAvatarMeta;

/**
 * 根据空间名称和空间 ID 生成稳定的默认头像展示元数据。
 */
export const buildSynClawSpaceAvatarMeta = (
  spaceId: string,
  name: string,
): SynClawSpaceAvatarMeta => {
  return buildNameAvatarMeta(spaceId, name);
};
