/**
 * mention 编解码工具
 *
 * 发送时用特殊标识包裹，便于后端解析；展示时还原为 @xxx。
 */
const MENTION_PREFIX_REGEX = /\[\[mention:([^[\]]+?)\]\]/g;
const CHANNEL_MENTION_REGEX = /<@([^|>]+)\|([^>]+)>/g;

/** 匹配展示文本中 @xxx 形式的 mention 片段 */
export const MENTION_DISPLAY_REGEX = /(^|[\s\n])@([^\s@，。！？、,:：;；()（）【】<>《》]+)/g;

/**
 * 将展示用的 @ 前缀编码为传输标识。
 * 例如：content="你好", mentionPrefix="@ 市场专家" -> "[[mention:市场专家]] 你好"
 */
export const encodeMention = (content: string, mentionPrefix?: string): string => {
  if (!mentionPrefix) return content;
  const name = mentionPrefix.replace(/^@/, "").trim();
  if (!name) return content;
  const marker = `[[mention:${name}]]`;

  const trimmed = content.trimStart();
  const withoutPrefix = trimmed.startsWith(mentionPrefix)
    ? trimmed.slice(mentionPrefix.length).trimStart()
    : trimmed;

  return withoutPrefix ? `${marker} ${withoutPrefix}` : marker;
};

/** 将传输标识还原为展示用的 @ 名称 */
export const decodeMention = (text: string): string =>
  text
    .replace(MENTION_PREFIX_REGEX, (_match, name: string) => `@${name.trim()}`)
    .replace(CHANNEL_MENTION_REGEX, (_match, _id: string, name: string) => `@${name.trim()}`);

/** 发送前去掉展示用的 mention 前缀 */
export const stripMentionPrefix = (content: string, mentionPrefix?: string): string => {
  if (!mentionPrefix) return content;
  const prefix = mentionPrefix.trim();
  if (!prefix) return content;
  const normalized = content.trimStart();
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length).trimStart() : normalized;
};
