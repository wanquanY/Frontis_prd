/**
 * diagramPreprocess - 预处理 markdown，将裸写的 infographic/mermaid DSL 自动包裹为代码围栏。
 * 供 MarkdownRenderer、BlockNoteEditor、导出等统一使用。
 */

/** Mermaid 图表类型关键字 */
const MERMAID_START =
  /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|gitGraph|journey|C4Context|C4Container|C4Deployment|C4Dynamic|quadrantChart|sankey|xychart|block)(?:\s|$)/;

/**
 * 扫描 markdown 文本，将未被 ``` 包裹的 infographic / mermaid DSL 自动包上代码围栏。
 * 已有围栏的内容不受影响。
 */
export function wrapUnfencedDiagrams(source: string): string {
  // 先把已有的 fenced code block 用占位符保护起来，避免误判
  const fencedBlocks: string[] = [];
  const PLACEHOLDER_PREFIX = "\x00FENCED_BLOCK_";
  let protected_ = source.replace(/```[\s\S]*?```/g, match => {
    const idx = fencedBlocks.length;
    fencedBlocks.push(match);
    return `${PLACEHOLDER_PREFIX}${idx}\x00`;
  });

  // 处理裸写的 infographic DSL
  protected_ = wrapUnfencedInfographic(protected_);

  // 处理裸写的 mermaid DSL
  protected_ = wrapUnfencedMermaid(protected_);

  // 恢复受保护的 fenced blocks
  for (let i = 0; i < fencedBlocks.length; i++) {
    protected_ = protected_.replace(`${PLACEHOLDER_PREFIX}${i}\x00`, fencedBlocks[i]);
  }

  return protected_;
}

/**
 * 检测并包裹裸写的 infographic DSL。
 * 入口特征：行首 `infographic <template-name>`，且下一行包含 `data`。
 */
function wrapUnfencedInfographic(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimStart();

    // 检测 infographic 入口
    if (
      /^infographic\s+\S+/.test(trimmed) &&
      i + 1 < lines.length &&
      /^\s*data\b/.test(lines[i + 1])
    ) {
      // 收集整个 infographic 块
      const blockLines: string[] = [trimmed];
      i++;
      while (i < lines.length) {
        const line = lines[i];
        const lt = line.trimStart();
        // 属于 infographic 块：缩进行、空行、顶层关键字（data/theme）、数组项
        if (
          lt === "" ||
          /^\s/.test(line) ||
          /^(?:data|theme|items|palette)\b/.test(lt) ||
          /^-\s/.test(lt)
        ) {
          blockLines.push(line);
          i++;
        } else {
          break;
        }
      }
      // 去除尾部空行
      while (blockLines.length && blockLines[blockLines.length - 1].trim() === "") {
        blockLines.pop();
      }
      result.push("```infographic");
      result.push(...blockLines);
      result.push("```");
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join("\n");
}

/**
 * 检测并包裹裸写的 mermaid DSL。
 * 入口特征：行首匹配 mermaid 图表关键字。
 */
function wrapUnfencedMermaid(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimStart();

    if (MERMAID_START.test(trimmed)) {
      const blockLines: string[] = [lines[i]];
      i++;
      while (i < lines.length) {
        const line = lines[i];
        const lt = line.trim();
        // mermaid 内容：非空行，或空行但后续还有缩进内容
        if (lt !== "") {
          blockLines.push(line);
          i++;
        } else if (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
          // 空行但下一行有缩进 → 还在 mermaid 块内
          blockLines.push(line);
          i++;
        } else {
          break;
        }
      }
      // 去除尾部空行
      while (blockLines.length && blockLines[blockLines.length - 1].trim() === "") {
        blockLines.pop();
      }
      result.push("```mermaid");
      result.push(...blockLines);
      result.push("```");
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join("\n");
}
