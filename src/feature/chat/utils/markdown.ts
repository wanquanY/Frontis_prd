const MARKDOWN_TABLE_SEPARATOR_REGEX = /\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?/;
const STANDARD_MARKDOWN_TABLE_REGEX = /(^|\n)\|.*\n\|\s*:?-{3,}:?/;
const MARKDOWN_TABLE_SEPARATOR_LINE_REGEX = /^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/;

const normalizeCompressedMarkdownTableChunk = (chunk: string): string => {
  const trimmedChunk = chunk.trim();
  if (!trimmedChunk.startsWith("|")) return chunk;
  if (!trimmedChunk.includes("||")) return chunk;
  if (!MARKDOWN_TABLE_SEPARATOR_REGEX.test(trimmedChunk)) return chunk;
  if (STANDARD_MARKDOWN_TABLE_REGEX.test(trimmedChunk)) return chunk;

  const normalizedCandidate = trimmedChunk.replace(/\s*\|\|\s*/g, "\n").trim();
  const candidateLines = normalizedCandidate
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (candidateLines.length < 2) return chunk;
  if (!candidateLines.every(line => line.startsWith("|"))) return chunk;
  if (!MARKDOWN_TABLE_SEPARATOR_LINE_REGEX.test(candidateLines[1])) return chunk;

  const leadingWhitespace = chunk.match(/^\s*/)?.[0] ?? "";
  const trailingWhitespace = chunk.match(/\s*$/)?.[0] ?? "";
  return `${leadingWhitespace}${candidateLines.join("\n")}${trailingWhitespace}`;
};

/**
 * normalizeMarkdownTables
 *
 * 修复被压缩成单行 `||` 形式的 Markdown 表格，兼容流式输出与历史消息。
 */
export function normalizeMarkdownTables(source: string): string {
  if (!source.includes("||")) return source;

  const segments = source.split(/(```[\s\S]*?```)/g);

  return segments
    .map(segment => {
      if (segment.startsWith("```") && segment.endsWith("```")) {
        return segment;
      }

      return segment
        .split(/(\n{2,})/g)
        .map(chunk => {
          if (/^\n{2,}$/.test(chunk)) return chunk;
          return normalizeCompressedMarkdownTableChunk(chunk);
        })
        .join("");
    })
    .join("");
}
