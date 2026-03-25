export interface NameAvatarMeta {
  lines: string[];
  compactText: string;
  background: string;
  textColor: string;
}

const NAME_AVATAR_PALETTE = [
  "linear-gradient(135deg, #4f8cff 0%, #356cf6 100%)",
  "linear-gradient(135deg, #1cc7b7 0%, #0e9f8f 100%)",
  "linear-gradient(135deg, #34c759 0%, #16a34a 100%)",
  "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #ff7a59 0%, #ff5f6d 100%)",
  "linear-gradient(135deg, #ffb547 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #22c1c3 0%, #2d8cf0 100%)",
  "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
] as const;

/** 头像渐变背景上的文字颜色（需配合渐变色保持可读性，故不使用 CSS 变量） */
const NAME_AVATAR_TEXT_COLOR = "#FFFFFF";

const CJK_CHAR_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF]/g;
const LATIN_TOKEN_REGEX = /[A-Za-z0-9]+/g;

const createSeedHash = (seed: string): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const resolveChineseLines = (name: string): string[] => {
  const chars = name.match(CJK_CHAR_REGEX) ?? [];
  const visible = chars.slice(0, 4).join("");

  if (!visible) return [];
  if (visible.length <= 2) return [visible];
  if (visible.length === 3) return [visible.slice(0, 2), visible.slice(2)];
  return [visible.slice(0, 2), visible.slice(2, 4)];
};

const splitLatinToken = (token: string): string[] => {
  const visible = token.slice(0, 8);

  if (visible.length <= 4) return [visible];
  if (/^\d+$/.test(visible)) {
    if (visible.length <= 2) return [visible];
    if (visible.length <= 4) return [visible.slice(0, 2), visible.slice(2)];
    return [visible.slice(0, 2), visible.slice(2, 4)];
  }
  if (visible.length <= 6) return [visible.slice(0, 3), visible.slice(3)];
  return [visible.slice(0, 4), visible.slice(4)];
};

const resolveLatinLines = (name: string): string[] => {
  const tokens = (name.match(LATIN_TOKEN_REGEX) ?? []).filter(Boolean);
  if (!tokens.length) return [];

  const [firstToken, secondToken] = tokens;
  if (firstToken && secondToken && firstToken.length <= 4 && secondToken.length <= 4) {
    return [firstToken.slice(0, 4), secondToken.slice(0, 4)];
  }
  if (firstToken) {
    return splitLatinToken(firstToken);
  }
  return [];
};

const resolveFallbackLines = (name: string): string[] => {
  const normalized = name.trim().replace(/\s+/g, "");
  const visible = Array.from(normalized).slice(0, 4).join("");

  if (!visible) return ["空"];
  if (visible.length <= 2) return [visible];
  if (visible.length === 3) return [visible.slice(0, 2), visible.slice(2)];
  return [visible.slice(0, 2), visible.slice(2, 4)];
};

const resolveCompactText = (lines: string[]): string => {
  const joined = lines.join("");
  const visible = Array.from(joined).join("");
  if (!visible) return "?";
  return Array.from(visible).slice(0, 2).join("");
};

/**
 * 根据名称和稳定种子生成统一的默认头像元数据。
 */
export const buildNameAvatarMeta = (seed: string, name: string): NameAvatarMeta => {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const normalizedSeed = `${seed.trim()}::${normalizedName}`;
  const hash = createSeedHash(normalizedSeed || "avatar");
  const chineseLines = resolveChineseLines(normalizedName);
  const latinLines = chineseLines.length ? [] : resolveLatinLines(normalizedName);
  const lines = chineseLines.length
    ? chineseLines
    : latinLines.length
      ? latinLines
      : resolveFallbackLines(normalizedName);

  return {
    lines,
    compactText: resolveCompactText(lines),
    background: NAME_AVATAR_PALETTE[hash % NAME_AVATAR_PALETTE.length],
    textColor: NAME_AVATAR_TEXT_COLOR,
  };
};
