import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { visualizer } from "rollup-plugin-visualizer";
import { compression } from "vite-plugin-compression2";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/** 构建时的 git SHA，用于版本检测 */
const GIT_SHA = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "local";
  }
})();

/**
 * 注入 git 信息到 html
 */
const injectGitInfo = () => {
  return {
    name: "inject-git-info",
    transformIndexHtml(html: string) {
      try {
        // 获取Git信息
        const gitSha = execSync("git rev-parse --short HEAD", {
          encoding: "utf8",
        }).trim();
        const gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
          encoding: "utf8",
        }).trim();
        const buildTime = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss");
        const gitCommitDate = execSync("git log -1 --format=%cI", {
          encoding: "utf8",
        }).trim();
        const gitCommitMessage = execSync("git log -1 --format=%s", {
          encoding: "utf8",
        }).trim();

        // 转义特殊字符
        const escapedCommitMessage = gitCommitMessage
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

        // 创建Git信息的HTML注释
        const gitInfoComment = [
          "<!-- Git Information",
          `  SHA: ${gitSha}`,
          `  Branch: ${gitBranch}`,
          `  Build Time: ${buildTime}`,
          `  Commit Date: ${dayjs(gitCommitDate).tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss")}`,
          `  Commit Message: ${escapedCommitMessage}`,
          "-->",
        ].join("\n");

        // 将Git信息注释插入到head标签中
        return html.replace(/<!doctype\s+html>/i, `${gitInfoComment}\n<!doctype html>`);
      } catch (error: unknown) {
        console.warn("⚠️ 无法获取Git信息:", (error as Error).message);
        return html;
      }
    },
  };
};

/**
 * 构建完成后在产物目录生成 version.json
 * 运行时通过 fetch 对比该文件判断是否有新版本
 */
const generateVersionFile = () => {
  let outDir = "dist";
  return {
    name: "generate-version-file",
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      mkdirSync(path.resolve(outDir), { recursive: true });
      writeFileSync(path.resolve(outDir, "version.json"), JSON.stringify({ version: GIT_SHA }));
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isProduction = mode === "production";
  const enableCompression = mode === "production" || mode === "test";
  return {
    // CDN 加速：通过环境变量 VITE_CDN_BASE 控制静态资源的公共基础路径
    // 设置后，构建产物中所有 JS/CSS/图片/字体引用都会指向 CDN 地址
    // 未设置时使用相对路径（本地 nginx 提供服务）
    base: env.VITE_CDN_BASE || "/",
    plugins: [
      react(),
      injectGitInfo(),
      generateVersionFile(),
      // 构建产物可视化分析（build时生成）
      isProduction &&
        visualizer({
          gzipSize: true,
          brotliSize: true,
          open: true,
          template: "treemap",
        }),
      // 构建时生成 .gz 预压缩文件，配合 nginx gzip_static on 使用
      enableCompression &&
        compression({
          algorithm: "gzip",
          threshold: 1024,
        }),
      // 构建时生成 .br 预压缩文件，配合 nginx brotli_static on 使用
      enableCompression &&
        compression({
          algorithm: "brotliCompress",
          threshold: 1024,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/api/, ""),
        },
      },
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV || mode),
      __APP_VERSION__: JSON.stringify(GIT_SHA),
    },
    /**
     * 依赖预购建
     * - include： 强制预购建，提高dev冷启动/首屏
     */
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "antd",
        "@ant-design/icons",
        "axios",
        "dayjs",
        "@uiw/react-md-editor",
        "@ant-design/x-markdown",
      ],
    },
    build: {
      target: "modules",
      minify: "esbuild",
      sourcemap: !isProduction,
      cssCodeSplit: true,
      assetsInlineLimit: 2 * 1024,

      /**
       * 构建警戒阈值 超过会waring
       */
      chunkSizeWarningLimit: 1500,

      rollupOptions: {
        output: {
          /**
           * 拆包策略
           *
           * 规则顺序至关重要——所有 @scope/ 前缀的规则必须在通用路径匹配
           * （如 /react/）之前，否则 @blocknote/react 等包会被 /react/ 规则
           * 错误捕获，导致循环引用。
           *
           * 原则：
           * 1. @scope/ 作用域包优先匹配（精确）
           * 2. 核心框架 + 紧密内部依赖一起打包（避免循环）
           * 3. 大型低频库独立打包（按需加载）
           * 4. 兜底 vendor-lib 收容所有剩余 node_modules（杜绝散落导致循环）
           */
          manualChunks: id => {
            if (!id.includes("node_modules")) {
              return;
            }

            // ── 第一梯队：@scope/ 作用域包（必须最先匹配） ──

            // 1. Ant Design X 系列（必须在 antd 之前，路径均含 @ant-design）
            if (id.includes("@ant-design/x")) {
              return "vendor-antd-x";
            }

            // 2. Ant Design 全家桶 + rc-* 内部组件库 + 样式引擎
            if (
              id.includes("@ant-design/icons") ||
              id.includes("/antd/") ||
              id.includes("/rc-") ||
              id.includes("@rc-component/") ||
              id.includes("@ant-design/cssinjs") ||
              id.includes("@ant-design/colors") ||
              id.includes("@ant-design/fast-color") ||
              id.includes("@ant-design/react-slick") ||
              id.includes("@ctrl/tinycolor")
            ) {
              return "vendor-antd";
            }

            // 3. BlockNote 富文本编辑器（@blocknote/react 含 /react/ 子串，
            //    必须在 vendor-react 之前匹配，否则会被错误归入 vendor-react）
            if (id.includes("@blocknote/")) {
              return "vendor-blocknote";
            }

            // 4. Sandpack 代码沙箱
            if (id.includes("@codesandbox/sandpack")) {
              return "vendor-sandpack";
            }

            // 5. UIW Markdown 编辑器（动态导入）
            if (id.includes("@uiw/react-md-editor") || id.includes("@uiw/react-markdown")) {
              return "vendor-uiw";
            }

            // 6. AntV 信息图（动态导入）
            if (id.includes("@antv/")) {
              return "vendor-antv";
            }

            // 7. Mantine UI（BlockNote 的 UI 层依赖）
            if (id.includes("@mantine/")) {
              return "vendor-mantine";
            }

            // 8. SSE 通信
            if (id.includes("@microsoft/fetch-event-source")) {
              return "vendor-fetch";
            }

            // ── 守卫：防止 @scope/react 类包被后续 /react/ 规则误捕获 ──

            // 路径含 /react/ 或 /react-dom/ 的作用域包（如 @floating-ui/react-dom、
            // @emotion/react）不是 React 核心，应归入 vendor-lib 而非 vendor-react。
            // 通过 /@（pnpm 路径特征）识别作用域包。
            if (id.includes("/@") && (id.includes("/react/") || id.includes("/react-dom/"))) {
              return "vendor-lib";
            }

            // ── 第二梯队：通用路径匹配 ──

            // 8. React 核心 + 紧密内部依赖
            //    包含 loose-envify / js-tokens（react-dom、scheduler 入口文件的
            //    静态依赖），避免它们落入 vendor-lib 产生最后一条循环引用
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/") ||
              id.includes("/react-is/") ||
              id.includes("/use-sync-external-store/") ||
              id.includes("/loose-envify/") ||
              id.includes("/js-tokens/")
            ) {
              return "vendor-react";
            }

            // 9. React Router
            if (id.includes("react-router")) {
              return "vendor-router";
            }

            // ── 第三梯队：拆分 vendor-lib 中的大型包族 ──
            // 这些包体积大、更新频率独立，拆出后 CDN 缓存粒度更细：
            // 更新 blocknote 不会使 d3 缓存失效，反之亦然

            // 10. ProseMirror + TipTap（BlockNote 的编辑器内核，~1MB）
            if (id.includes("prosemirror-") || id.includes("@tiptap/")) {
              return "vendor-prosemirror";
            }

            // 11. CodeMirror + Lezer（Sandpack 代码编辑器内核，~700KB）
            if (id.includes("@codemirror/") || id.includes("@lezer/")) {
              return "vendor-codemirror";
            }

            // 12. D3 可视化系列（Mermaid + AntV 的共享底层，~500KB）
            //     包含 d3 的小型工具依赖，避免落入 vendor-lib 产生循环
            if (
              id.includes("/d3-") ||
              id.includes("/d3/") ||
              id.includes("/internmap/") ||
              id.includes("/delaunator/") ||
              id.includes("/robust-predicates/")
            ) {
              return "vendor-d3";
            }

            // 13. Mermaid 图表 + 子依赖（动态导入）
            //     包含 mermaid 的工具依赖，避免落入 vendor-lib 产生循环
            if (
              id.includes("/mermaid/") ||
              id.includes("/langium/") ||
              id.includes("/chevrotain/") ||
              id.includes("/@chevrotain/") ||
              id.includes("/dagre-d3-es/") ||
              id.includes("@mermaid-js/") ||
              id.includes("/culori/") ||
              id.includes("/khroma/") ||
              id.includes("/elkjs/") ||
              id.includes("/cytoscape") ||
              id.includes("/dompurify/") ||
              id.includes("/katex/") ||
              id.includes("/marked/") ||
              id.includes("/roughjs/") ||
              id.includes("/stylis/") ||
              id.includes("/ts-dedent/") ||
              id.includes("/@braintree/sanitize-url/") ||
              id.includes("/cose-base/") ||
              id.includes("/layout-base/") ||
              id.includes("/vscode-languageserver") ||
              id.includes("/vscode-uri/") ||
              id.includes("/chevrotain-allstar/") ||
              id.includes("/@iconify/utils/") ||
              id.includes("/hachure-fill/") ||
              id.includes("/path-data-parser/") ||
              id.includes("/points-on-curve/") ||
              id.includes("/points-on-path/") ||
              id.includes("/commander/")
            ) {
              return "vendor-mermaid";
            }

            // 13.5 语法高亮（代码块渲染）
            //     rehype-prism-plus 必须在此匹配，否则会被后面的 /rehype 规则捕获
            if (
              id.includes("/refractor/") ||
              id.includes("/react-syntax-highlighter/") ||
              id.includes("/rehype-prism-plus/") ||
              id.includes("/highlight.js/") ||
              id.includes("/lowlight/") ||
              id.includes("/prismjs/") ||
              id.includes("/fault/") ||
              id.includes("/format/") ||
              id.includes("/highlightjs-vue/") ||
              id.includes("/parse-numeric-range/")
            ) {
              return "vendor-syntax-highlight";
            }

            // 13.6 Markdown/HTML AST 解析
            //     包含 rehype-*/remark-*/unified 生态及其小型工具依赖，
            //     避免工具库落入 vendor-lib 产生循环引用
            if (
              id.includes("/mdast-") ||
              id.includes("/hast-") ||
              id.includes("/micromark") ||
              id.includes("/unist-") ||
              id.includes("/vfile") ||
              id.includes("/character-entities") ||
              id.includes("/stringify-entities/") ||
              id.includes("/property-information/") ||
              id.includes("/parse5/") ||
              id.includes("/hastscript/") ||
              id.includes("/html-react-parser/") ||
              id.includes("/html-dom-parser/") ||
              id.includes("/rehype") ||
              id.includes("/remark") ||
              id.includes("/unified/") ||
              id.includes("/react-markdown/") ||
              id.includes("/devlop/") ||
              id.includes("/comma-separated-tokens/") ||
              id.includes("/space-separated-tokens/") ||
              id.includes("/web-namespaces/") ||
              id.includes("/zwitch/") ||
              id.includes("/ccount/") ||
              id.includes("/decode-named-character-reference/") ||
              id.includes("/parse-entities/") ||
              id.includes("/bail/") ||
              id.includes("/is-plain-obj/") ||
              id.includes("/trough/") ||
              id.includes("/trim-lines/") ||
              id.includes("/markdown-table/") ||
              id.includes("/longest-streak/") ||
              id.includes("/@types/hast/") ||
              id.includes("/@types/mdast/") ||
              id.includes("/@types/unist/")
            ) {
              return "vendor-markdown";
            }

            // 14. 腾讯云 COS SDK（动态导入）
            if (id.includes("cos-js-sdk-v5")) {
              return "vendor-cos";
            }

            // 15. DOCX 导出（动态导入，仅导出时加载）
            if (id.includes("/docx/") || id.includes("/file-saver/")) {
              return "vendor-docx";
            }

            // 16. 常用工具库
            if (
              id.includes("/axios/") ||
              id.includes("/dayjs/") ||
              id.includes("/zustand/") ||
              id.includes("/uuid/") ||
              id.includes("/lodash") ||
              id.includes("/classnames/")
            ) {
              return "vendor-utils";
            }

            // ── 兜底 ──

            // 17. 剩余 node_modules 统一归入 vendor-lib
            //     防止 Rollup 将未匹配的中间依赖随意放入上述 chunk 导致循环引用
            return "vendor-lib";
          },
        },
      },
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none",
      target: "es2020",
    },
  };
});
