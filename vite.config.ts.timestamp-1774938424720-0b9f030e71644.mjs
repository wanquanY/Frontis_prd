// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.30_less@4.5.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_vite@5.4.21_@types+node@20.19.30_less@4.5.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { visualizer } from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/rollup-plugin-visualizer@6.0.5_rollup@4.56.0/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { compression } from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/vite-plugin-compression2@2.4.0_rollup@4.56.0/node_modules/vite-plugin-compression2/dist/index.mjs";
import dayjs from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/dayjs@1.11.19/node_modules/dayjs/dayjs.min.js";
import utc from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/dayjs@1.11.19/node_modules/dayjs/plugin/utc.js";
import timezone from "file:///Users/yangwanquan/syngents/code/Frontis_prd/node_modules/.pnpm/dayjs@1.11.19/node_modules/dayjs/plugin/timezone.js";
var __vite_injected_original_dirname = "/Users/yangwanquan/syngents/code/Frontis_prd";
dayjs.extend(utc);
dayjs.extend(timezone);
var GIT_SHA = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "local";
  }
})();
var injectGitInfo = () => {
  return {
    name: "inject-git-info",
    transformIndexHtml(html) {
      try {
        const gitSha = execSync("git rev-parse --short HEAD", {
          encoding: "utf8"
        }).trim();
        const gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
          encoding: "utf8"
        }).trim();
        const buildTime = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss");
        const gitCommitDate = execSync("git log -1 --format=%cI", {
          encoding: "utf8"
        }).trim();
        const gitCommitMessage = execSync("git log -1 --format=%s", {
          encoding: "utf8"
        }).trim();
        const escapedCommitMessage = gitCommitMessage.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        const gitInfoComment = [
          "<!-- Git Information",
          `  SHA: ${gitSha}`,
          `  Branch: ${gitBranch}`,
          `  Build Time: ${buildTime}`,
          `  Commit Date: ${dayjs(gitCommitDate).tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss")}`,
          `  Commit Message: ${escapedCommitMessage}`,
          "-->"
        ].join("\n");
        return html.replace(/<!doctype\s+html>/i, `${gitInfoComment}
<!doctype html>`);
      } catch (error) {
        console.warn("\u26A0\uFE0F \u65E0\u6CD5\u83B7\u53D6Git\u4FE1\u606F:", error.message);
        return html;
      }
    }
  };
};
var generateVersionFile = () => {
  let outDir = "dist";
  return {
    name: "generate-version-file",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      mkdirSync(path.resolve(outDir), { recursive: true });
      writeFileSync(path.resolve(outDir, "version.json"), JSON.stringify({ version: GIT_SHA }));
    }
  };
};
var vite_config_default = defineConfig(({ mode }) => {
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
      isProduction && visualizer({
        gzipSize: true,
        brotliSize: true,
        open: true,
        template: "treemap"
      }),
      // 构建时生成 .gz 预压缩文件，配合 nginx gzip_static on 使用
      enableCompression && compression({
        algorithm: "gzip",
        threshold: 1024
      }),
      // 构建时生成 .br 预压缩文件，配合 nginx brotli_static on 使用
      enableCompression && compression({
        algorithm: "brotliCompress",
        threshold: 1024
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
          rewrite: (path2) => path2.replace(/^\/api/, "")
        }
      }
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV || mode),
      __APP_VERSION__: JSON.stringify(GIT_SHA)
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
        "@ant-design/x-markdown"
      ]
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
          manualChunks: (id) => {
            if (!id.includes("node_modules")) {
              return;
            }
            if (id.includes("@ant-design/x")) {
              return "vendor-antd-x";
            }
            if (id.includes("@ant-design/icons") || id.includes("/antd/") || id.includes("/rc-") || id.includes("@rc-component/") || id.includes("@ant-design/cssinjs") || id.includes("@ant-design/colors") || id.includes("@ant-design/fast-color") || id.includes("@ant-design/react-slick") || id.includes("@ctrl/tinycolor")) {
              return "vendor-antd";
            }
            if (id.includes("@blocknote/")) {
              return "vendor-blocknote";
            }
            if (id.includes("@codesandbox/sandpack")) {
              return "vendor-sandpack";
            }
            if (id.includes("@uiw/react-md-editor") || id.includes("@uiw/react-markdown")) {
              return "vendor-uiw";
            }
            if (id.includes("@antv/")) {
              return "vendor-antv";
            }
            if (id.includes("@mantine/")) {
              return "vendor-mantine";
            }
            if (id.includes("@microsoft/fetch-event-source")) {
              return "vendor-fetch";
            }
            if (id.includes("/@") && (id.includes("/react/") || id.includes("/react-dom/"))) {
              return "vendor-lib";
            }
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/") || id.includes("/react-is/") || id.includes("/use-sync-external-store/") || id.includes("/loose-envify/") || id.includes("/js-tokens/")) {
              return "vendor-react";
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("prosemirror-") || id.includes("@tiptap/")) {
              return "vendor-prosemirror";
            }
            if (id.includes("@codemirror/") || id.includes("@lezer/")) {
              return "vendor-codemirror";
            }
            if (id.includes("/d3-") || id.includes("/d3/") || id.includes("/internmap/") || id.includes("/delaunator/") || id.includes("/robust-predicates/")) {
              return "vendor-d3";
            }
            if (id.includes("/mermaid/") || id.includes("/langium/") || id.includes("/chevrotain/") || id.includes("/@chevrotain/") || id.includes("/dagre-d3-es/") || id.includes("@mermaid-js/") || id.includes("/culori/") || id.includes("/khroma/") || id.includes("/elkjs/") || id.includes("/cytoscape") || id.includes("/dompurify/") || id.includes("/katex/") || id.includes("/marked/") || id.includes("/roughjs/") || id.includes("/stylis/") || id.includes("/ts-dedent/") || id.includes("/@braintree/sanitize-url/") || id.includes("/cose-base/") || id.includes("/layout-base/") || id.includes("/vscode-languageserver") || id.includes("/vscode-uri/") || id.includes("/chevrotain-allstar/") || id.includes("/@iconify/utils/") || id.includes("/hachure-fill/") || id.includes("/path-data-parser/") || id.includes("/points-on-curve/") || id.includes("/points-on-path/") || id.includes("/commander/")) {
              return "vendor-mermaid";
            }
            if (id.includes("/refractor/") || id.includes("/react-syntax-highlighter/") || id.includes("/rehype-prism-plus/") || id.includes("/highlight.js/") || id.includes("/lowlight/") || id.includes("/prismjs/") || id.includes("/fault/") || id.includes("/format/") || id.includes("/highlightjs-vue/") || id.includes("/parse-numeric-range/")) {
              return "vendor-syntax-highlight";
            }
            if (id.includes("/mdast-") || id.includes("/hast-") || id.includes("/micromark") || id.includes("/unist-") || id.includes("/vfile") || id.includes("/character-entities") || id.includes("/stringify-entities/") || id.includes("/property-information/") || id.includes("/parse5/") || id.includes("/hastscript/") || id.includes("/html-react-parser/") || id.includes("/html-dom-parser/") || id.includes("/rehype") || id.includes("/remark") || id.includes("/unified/") || id.includes("/react-markdown/") || id.includes("/devlop/") || id.includes("/comma-separated-tokens/") || id.includes("/space-separated-tokens/") || id.includes("/web-namespaces/") || id.includes("/zwitch/") || id.includes("/ccount/") || id.includes("/decode-named-character-reference/") || id.includes("/parse-entities/") || id.includes("/bail/") || id.includes("/is-plain-obj/") || id.includes("/trough/") || id.includes("/trim-lines/") || id.includes("/markdown-table/") || id.includes("/longest-streak/") || id.includes("/@types/hast/") || id.includes("/@types/mdast/") || id.includes("/@types/unist/")) {
              return "vendor-markdown";
            }
            if (id.includes("cos-js-sdk-v5")) {
              return "vendor-cos";
            }
            if (id.includes("/docx/") || id.includes("/file-saver/")) {
              return "vendor-docx";
            }
            if (id.includes("/axios/") || id.includes("/dayjs/") || id.includes("/zustand/") || id.includes("/uuid/") || id.includes("/lodash") || id.includes("/classnames/")) {
              return "vendor-utils";
            }
            return "vendor-lib";
          }
        }
      }
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none",
      target: "es2020"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMveWFuZ3dhbnF1YW4vc3luZ2VudHMvY29kZS9Gcm9udGlzX3ByZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3lhbmd3YW5xdWFuL3N5bmdlbnRzL2NvZGUvRnJvbnRpc19wcmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3lhbmd3YW5xdWFuL3N5bmdlbnRzL2NvZGUvRnJvbnRpc19wcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IG1rZGlyU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSBcInJvbGx1cC1wbHVnaW4tdmlzdWFsaXplclwiO1xuaW1wb3J0IHsgY29tcHJlc3Npb24gfSBmcm9tIFwidml0ZS1wbHVnaW4tY29tcHJlc3Npb24yXCI7XG5pbXBvcnQgZGF5anMgZnJvbSBcImRheWpzXCI7XG5pbXBvcnQgdXRjIGZyb20gXCJkYXlqcy9wbHVnaW4vdXRjXCI7XG5pbXBvcnQgdGltZXpvbmUgZnJvbSBcImRheWpzL3BsdWdpbi90aW1lem9uZVwiO1xuXG5kYXlqcy5leHRlbmQodXRjKTtcbmRheWpzLmV4dGVuZCh0aW1lem9uZSk7XG5cbi8qKiBcdTY3ODRcdTVFRkFcdTY1RjZcdTc2ODQgZ2l0IFNIQVx1RkYwQ1x1NzUyOFx1NEU4RVx1NzI0OFx1NjcyQ1x1NjhDMFx1NkQ0QiAqL1xuY29uc3QgR0lUX1NIQSA9ICgoKSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGV4ZWNTeW5jKFwiZ2l0IHJldi1wYXJzZSAtLXNob3J0IEhFQURcIiwgeyBlbmNvZGluZzogXCJ1dGY4XCIgfSkudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gXCJsb2NhbFwiO1xuICB9XG59KSgpO1xuXG4vKipcbiAqIFx1NkNFOFx1NTE2NSBnaXQgXHU0RkUxXHU2MDZGXHU1MjMwIGh0bWxcbiAqL1xuY29uc3QgaW5qZWN0R2l0SW5mbyA9ICgpID0+IHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcImluamVjdC1naXQtaW5mb1wiLFxuICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sOiBzdHJpbmcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFx1ODNCN1x1NTNENkdpdFx1NEZFMVx1NjA2RlxuICAgICAgICBjb25zdCBnaXRTaGEgPSBleGVjU3luYyhcImdpdCByZXYtcGFyc2UgLS1zaG9ydCBIRUFEXCIsIHtcbiAgICAgICAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgICAgIH0pLnRyaW0oKTtcbiAgICAgICAgY29uc3QgZ2l0QnJhbmNoID0gZXhlY1N5bmMoXCJnaXQgcmV2LXBhcnNlIC0tYWJicmV2LXJlZiBIRUFEXCIsIHtcbiAgICAgICAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgICAgIH0pLnRyaW0oKTtcbiAgICAgICAgY29uc3QgYnVpbGRUaW1lID0gZGF5anMoKS50eihcIkFzaWEvU2hhbmdoYWlcIikuZm9ybWF0KFwiWVlZWS1NTS1ERCBISDptbTpzc1wiKTtcbiAgICAgICAgY29uc3QgZ2l0Q29tbWl0RGF0ZSA9IGV4ZWNTeW5jKFwiZ2l0IGxvZyAtMSAtLWZvcm1hdD0lY0lcIiwge1xuICAgICAgICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICAgICAgfSkudHJpbSgpO1xuICAgICAgICBjb25zdCBnaXRDb21taXRNZXNzYWdlID0gZXhlY1N5bmMoXCJnaXQgbG9nIC0xIC0tZm9ybWF0PSVzXCIsIHtcbiAgICAgICAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgICAgIH0pLnRyaW0oKTtcblxuICAgICAgICAvLyBcdThGNkNcdTRFNDlcdTcyNzlcdTZCOEFcdTVCNTdcdTdCMjZcbiAgICAgICAgY29uc3QgZXNjYXBlZENvbW1pdE1lc3NhZ2UgPSBnaXRDb21taXRNZXNzYWdlXG4gICAgICAgICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXG4gICAgICAgICAgLnJlcGxhY2UoLycvZywgXCImIzM5O1wiKTtcblxuICAgICAgICAvLyBcdTUyMUJcdTVFRkFHaXRcdTRGRTFcdTYwNkZcdTc2ODRIVE1MXHU2Q0U4XHU5MUNBXG4gICAgICAgIGNvbnN0IGdpdEluZm9Db21tZW50ID0gW1xuICAgICAgICAgIFwiPCEtLSBHaXQgSW5mb3JtYXRpb25cIixcbiAgICAgICAgICBgICBTSEE6ICR7Z2l0U2hhfWAsXG4gICAgICAgICAgYCAgQnJhbmNoOiAke2dpdEJyYW5jaH1gLFxuICAgICAgICAgIGAgIEJ1aWxkIFRpbWU6ICR7YnVpbGRUaW1lfWAsXG4gICAgICAgICAgYCAgQ29tbWl0IERhdGU6ICR7ZGF5anMoZ2l0Q29tbWl0RGF0ZSkudHooXCJBc2lhL1NoYW5naGFpXCIpLmZvcm1hdChcIllZWVktTU0tREQgSEg6bW06c3NcIil9YCxcbiAgICAgICAgICBgICBDb21taXQgTWVzc2FnZTogJHtlc2NhcGVkQ29tbWl0TWVzc2FnZX1gLFxuICAgICAgICAgIFwiLS0+XCIsXG4gICAgICAgIF0uam9pbihcIlxcblwiKTtcblxuICAgICAgICAvLyBcdTVDMDZHaXRcdTRGRTFcdTYwNkZcdTZDRThcdTkxQ0FcdTYzRDJcdTUxNjVcdTUyMzBoZWFkXHU2ODA3XHU3QjdFXHU0RTJEXG4gICAgICAgIHJldHVybiBodG1sLnJlcGxhY2UoLzwhZG9jdHlwZVxccytodG1sPi9pLCBgJHtnaXRJbmZvQ29tbWVudH1cXG48IWRvY3R5cGUgaHRtbD5gKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIlx1MjZBMFx1RkUwRiBcdTY1RTBcdTZDRDVcdTgzQjdcdTUzRDZHaXRcdTRGRTFcdTYwNkY6XCIsIChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59O1xuXG4vKipcbiAqIFx1Njc4NFx1NUVGQVx1NUI4Q1x1NjIxMFx1NTQwRVx1NTcyOFx1NEVBN1x1NzI2OVx1NzZFRVx1NUY1NVx1NzUxRlx1NjIxMCB2ZXJzaW9uLmpzb25cbiAqIFx1OEZEMFx1ODg0Q1x1NjVGNlx1OTAxQVx1OEZDNyBmZXRjaCBcdTVCRjlcdTZCRDRcdThCRTVcdTY1ODdcdTRFRjZcdTUyMjRcdTY1QURcdTY2MkZcdTU0MjZcdTY3MDlcdTY1QjBcdTcyNDhcdTY3MkNcbiAqL1xuY29uc3QgZ2VuZXJhdGVWZXJzaW9uRmlsZSA9ICgpID0+IHtcbiAgbGV0IG91dERpciA9IFwiZGlzdFwiO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwiZ2VuZXJhdGUtdmVyc2lvbi1maWxlXCIsXG4gICAgY29uZmlnUmVzb2x2ZWQoY29uZmlnOiB7IGJ1aWxkOiB7IG91dERpcjogc3RyaW5nIH0gfSkge1xuICAgICAgb3V0RGlyID0gY29uZmlnLmJ1aWxkLm91dERpcjtcbiAgICB9LFxuICAgIGNsb3NlQnVuZGxlKCkge1xuICAgICAgbWtkaXJTeW5jKHBhdGgucmVzb2x2ZShvdXREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIHdyaXRlRmlsZVN5bmMocGF0aC5yZXNvbHZlKG91dERpciwgXCJ2ZXJzaW9uLmpzb25cIiksIEpTT04uc3RyaW5naWZ5KHsgdmVyc2lvbjogR0lUX1NIQSB9KSk7XG4gICAgfSxcbiAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCBcIlZJVEVfXCIpO1xuICBjb25zdCBpc1Byb2R1Y3Rpb24gPSBtb2RlID09PSBcInByb2R1Y3Rpb25cIjtcbiAgY29uc3QgZW5hYmxlQ29tcHJlc3Npb24gPSBtb2RlID09PSBcInByb2R1Y3Rpb25cIiB8fCBtb2RlID09PSBcInRlc3RcIjtcbiAgcmV0dXJuIHtcbiAgICAvLyBDRE4gXHU1MkEwXHU5MDFGXHVGRjFBXHU5MDFBXHU4RkM3XHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIFZJVEVfQ0ROX0JBU0UgXHU2M0E3XHU1MjM2XHU5NzU5XHU2MDAxXHU4RDQ0XHU2RTkwXHU3Njg0XHU1MTZDXHU1MTcxXHU1N0ZBXHU3ODQwXHU4REVGXHU1Rjg0XG4gICAgLy8gXHU4QkJFXHU3RjZFXHU1NDBFXHVGRjBDXHU2Nzg0XHU1RUZBXHU0RUE3XHU3MjY5XHU0RTJEXHU2MjQwXHU2NzA5IEpTL0NTUy9cdTU2RkVcdTcyNDcvXHU1QjU3XHU0RjUzXHU1RjE1XHU3NTI4XHU5MEZEXHU0RjFBXHU2MzA3XHU1NDExIENETiBcdTU3MzBcdTU3NDBcbiAgICAvLyBcdTY3MkFcdThCQkVcdTdGNkVcdTY1RjZcdTRGN0ZcdTc1MjhcdTc2RjhcdTVCRjlcdThERUZcdTVGODRcdUZGMDhcdTY3MkNcdTU3MzAgbmdpbnggXHU2M0QwXHU0RjlCXHU2NzBEXHU1MkExXHVGRjA5XG4gICAgYmFzZTogZW52LlZJVEVfQ0ROX0JBU0UgfHwgXCIvXCIsXG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3QoKSxcbiAgICAgIGluamVjdEdpdEluZm8oKSxcbiAgICAgIGdlbmVyYXRlVmVyc2lvbkZpbGUoKSxcbiAgICAgIC8vIFx1Njc4NFx1NUVGQVx1NEVBN1x1NzI2OVx1NTNFRlx1ODlDNlx1NTMxNlx1NTIwNlx1Njc5MFx1RkYwOGJ1aWxkXHU2NUY2XHU3NTFGXHU2MjEwXHVGRjA5XG4gICAgICBpc1Byb2R1Y3Rpb24gJiZcbiAgICAgICAgdmlzdWFsaXplcih7XG4gICAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICAgICAgICBvcGVuOiB0cnVlLFxuICAgICAgICAgIHRlbXBsYXRlOiBcInRyZWVtYXBcIixcbiAgICAgICAgfSksXG4gICAgICAvLyBcdTY3ODRcdTVFRkFcdTY1RjZcdTc1MUZcdTYyMTAgLmd6IFx1OTg4NFx1NTM4Qlx1N0YyOVx1NjU4N1x1NEVGNlx1RkYwQ1x1OTE0RFx1NTQwOCBuZ2lueCBnemlwX3N0YXRpYyBvbiBcdTRGN0ZcdTc1MjhcbiAgICAgIGVuYWJsZUNvbXByZXNzaW9uICYmXG4gICAgICAgIGNvbXByZXNzaW9uKHtcbiAgICAgICAgICBhbGdvcml0aG06IFwiZ3ppcFwiLFxuICAgICAgICAgIHRocmVzaG9sZDogMTAyNCxcbiAgICAgICAgfSksXG4gICAgICAvLyBcdTY3ODRcdTVFRkFcdTY1RjZcdTc1MUZcdTYyMTAgLmJyIFx1OTg4NFx1NTM4Qlx1N0YyOVx1NjU4N1x1NEVGNlx1RkYwQ1x1OTE0RFx1NTQwOCBuZ2lueCBicm90bGlfc3RhdGljIG9uIFx1NEY3Rlx1NzUyOFxuICAgICAgZW5hYmxlQ29tcHJlc3Npb24gJiZcbiAgICAgICAgY29tcHJlc3Npb24oe1xuICAgICAgICAgIGFsZ29yaXRobTogXCJicm90bGlDb21wcmVzc1wiLFxuICAgICAgICAgIHRocmVzaG9sZDogMTAyNCxcbiAgICAgICAgfSksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgb3BlbjogZmFsc2UsXG4gICAgICBwcm94eToge1xuICAgICAgICBcIi9hcGlcIjoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfQVBJX0JBU0VfVVJMIHx8IFwiaHR0cDovL2xvY2FsaG9zdDo4MDAwXCIsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgcmV3cml0ZTogcGF0aCA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCBcIlwiKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIF9fQVBQX0VOVl9fOiBKU09OLnN0cmluZ2lmeShlbnYuQVBQX0VOViB8fCBtb2RlKSxcbiAgICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkoR0lUX1NIQSksXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBcdTRGOURcdThENTZcdTk4ODRcdThEMkRcdTVFRkFcbiAgICAgKiAtIGluY2x1ZGVcdUZGMUEgXHU1RjNBXHU1MjM2XHU5ODg0XHU4RDJEXHU1RUZBXHVGRjBDXHU2M0QwXHU5QUQ4ZGV2XHU1MUI3XHU1NDJGXHU1MkE4L1x1OTk5Nlx1NUM0RlxuICAgICAqL1xuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogW1xuICAgICAgICBcInJlYWN0XCIsXG4gICAgICAgIFwicmVhY3QtZG9tXCIsXG4gICAgICAgIFwiYW50ZFwiLFxuICAgICAgICBcIkBhbnQtZGVzaWduL2ljb25zXCIsXG4gICAgICAgIFwiYXhpb3NcIixcbiAgICAgICAgXCJkYXlqc1wiLFxuICAgICAgICBcIkB1aXcvcmVhY3QtbWQtZWRpdG9yXCIsXG4gICAgICAgIFwiQGFudC1kZXNpZ24veC1tYXJrZG93blwiLFxuICAgICAgXSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICB0YXJnZXQ6IFwibW9kdWxlc1wiLFxuICAgICAgbWluaWZ5OiBcImVzYnVpbGRcIixcbiAgICAgIHNvdXJjZW1hcDogIWlzUHJvZHVjdGlvbixcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICAgIGFzc2V0c0lubGluZUxpbWl0OiAyICogMTAyNCxcblxuICAgICAgLyoqXG4gICAgICAgKiBcdTY3ODRcdTVFRkFcdThCNjZcdTYyMTJcdTk2MDhcdTUwM0MgXHU4RDg1XHU4RkM3XHU0RjFBd2FyaW5nXG4gICAgICAgKi9cbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTUwMCxcblxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBcdTYyQzZcdTUzMDVcdTdCNTZcdTc1NjVcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIFx1ODlDNFx1NTIxOVx1OTg3QVx1NUU4Rlx1ODFGM1x1NTE3M1x1OTFDRFx1ODk4MVx1MjAxNFx1MjAxNFx1NjI0MFx1NjcwOSBAc2NvcGUvIFx1NTI0RFx1N0YwMFx1NzY4NFx1ODlDNFx1NTIxOVx1NUZDNVx1OTg3Qlx1NTcyOFx1OTAxQVx1NzUyOFx1OERFRlx1NUY4NFx1NTMzOVx1OTE0RFxuICAgICAgICAgICAqIFx1RkYwOFx1NTk4MiAvcmVhY3QvXHVGRjA5XHU0RTRCXHU1MjREXHVGRjBDXHU1NDI2XHU1MjE5IEBibG9ja25vdGUvcmVhY3QgXHU3QjQ5XHU1MzA1XHU0RjFBXHU4OEFCIC9yZWFjdC8gXHU4OUM0XHU1MjE5XG4gICAgICAgICAgICogXHU5NTE5XHU4QkVGXHU2MzU1XHU4M0I3XHVGRjBDXHU1QkZDXHU4MUY0XHU1RkFBXHU3M0FGXHU1RjE1XHU3NTI4XHUzMDAyXG4gICAgICAgICAgICpcbiAgICAgICAgICAgKiBcdTUzOUZcdTUyMTlcdUZGMUFcbiAgICAgICAgICAgKiAxLiBAc2NvcGUvIFx1NEY1Q1x1NzUyOFx1NTdERlx1NTMwNVx1NEYxOFx1NTE0OFx1NTMzOVx1OTE0RFx1RkYwOFx1N0NCRVx1Nzg2RVx1RkYwOVxuICAgICAgICAgICAqIDIuIFx1NjgzOFx1NUZDM1x1Njg0Nlx1NjdCNiArIFx1N0QyN1x1NUJDNlx1NTE4NVx1OTBFOFx1NEY5RFx1OEQ1Nlx1NEUwMFx1OEQ3N1x1NjI1M1x1NTMwNVx1RkYwOFx1OTA3Rlx1NTE0RFx1NUZBQVx1NzNBRlx1RkYwOVxuICAgICAgICAgICAqIDMuIFx1NTkyN1x1NTc4Qlx1NEY0RVx1OTg5MVx1NUU5M1x1NzJFQ1x1N0FDQlx1NjI1M1x1NTMwNVx1RkYwOFx1NjMwOVx1OTcwMFx1NTJBMFx1OEY3RFx1RkYwOVxuICAgICAgICAgICAqIDQuIFx1NTE1Q1x1NUU5NSB2ZW5kb3ItbGliIFx1NjUzNlx1NUJCOVx1NjI0MFx1NjcwOVx1NTI2OVx1NEY1OSBub2RlX21vZHVsZXNcdUZGMDhcdTY3NUNcdTdFRERcdTY1NjNcdTg0M0RcdTVCRkNcdTgxRjRcdTVGQUFcdTczQUZcdUZGMDlcbiAgICAgICAgICAgKi9cbiAgICAgICAgICBtYW51YWxDaHVua3M6IGlkID0+IHtcbiAgICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBcdTI1MDBcdTI1MDAgXHU3QjJDXHU0RTAwXHU2OEFGXHU5NjFGXHVGRjFBQHNjb3BlLyBcdTRGNUNcdTc1MjhcdTU3REZcdTUzMDVcdUZGMDhcdTVGQzVcdTk4N0JcdTY3MDBcdTUxNDhcdTUzMzlcdTkxNERcdUZGMDkgXHUyNTAwXHUyNTAwXG5cbiAgICAgICAgICAgIC8vIDEuIEFudCBEZXNpZ24gWCBcdTdDRkJcdTUyMTdcdUZGMDhcdTVGQzVcdTk4N0JcdTU3MjggYW50ZCBcdTRFNEJcdTUyNERcdUZGMENcdThERUZcdTVGODRcdTU3NDdcdTU0MkIgQGFudC1kZXNpZ25cdUZGMDlcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIkBhbnQtZGVzaWduL3hcIikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWFudGQteFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAyLiBBbnQgRGVzaWduIFx1NTE2OFx1NUJCNlx1Njg3NiArIHJjLSogXHU1MTg1XHU5MEU4XHU3RUM0XHU0RUY2XHU1RTkzICsgXHU2ODM3XHU1RjBGXHU1RjE1XHU2NENFXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQGFudC1kZXNpZ24vaWNvbnNcIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvYW50ZC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmMtXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQHJjLWNvbXBvbmVudC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJAYW50LWRlc2lnbi9jc3NpbmpzXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQGFudC1kZXNpZ24vY29sb3JzXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQGFudC1kZXNpZ24vZmFzdC1jb2xvclwiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIkBhbnQtZGVzaWduL3JlYWN0LXNsaWNrXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiQGN0cmwvdGlueWNvbG9yXCIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWFudGRcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gMy4gQmxvY2tOb3RlIFx1NUJDQ1x1NjU4N1x1NjcyQ1x1N0YxNlx1OEY5MVx1NTY2OFx1RkYwOEBibG9ja25vdGUvcmVhY3QgXHU1NDJCIC9yZWFjdC8gXHU1QjUwXHU0RTMyXHVGRjBDXG4gICAgICAgICAgICAvLyAgICBcdTVGQzVcdTk4N0JcdTU3MjggdmVuZG9yLXJlYWN0IFx1NEU0Qlx1NTI0RFx1NTMzOVx1OTE0RFx1RkYwQ1x1NTQyNlx1NTIxOVx1NEYxQVx1ODhBQlx1OTUxOVx1OEJFRlx1NUY1Mlx1NTE2NSB2ZW5kb3ItcmVhY3RcdUZGMDlcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIkBibG9ja25vdGUvXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1ibG9ja25vdGVcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gNC4gU2FuZHBhY2sgXHU0RUUzXHU3ODAxXHU2Qzk5XHU3QkIxXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAY29kZXNhbmRib3gvc2FuZHBhY2tcIikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXNhbmRwYWNrXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDUuIFVJVyBNYXJrZG93biBcdTdGMTZcdThGOTFcdTU2NjhcdUZGMDhcdTUyQThcdTYwMDFcdTVCRkNcdTUxNjVcdUZGMDlcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIkB1aXcvcmVhY3QtbWQtZWRpdG9yXCIpIHx8IGlkLmluY2x1ZGVzKFwiQHVpdy9yZWFjdC1tYXJrZG93blwiKSkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItdWl3XCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDYuIEFudFYgXHU0RkUxXHU2MDZGXHU1NkZFXHVGRjA4XHU1MkE4XHU2MDAxXHU1QkZDXHU1MTY1XHVGRjA5XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAYW50di9cIikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWFudHZcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gNy4gTWFudGluZSBVSVx1RkYwOEJsb2NrTm90ZSBcdTc2ODQgVUkgXHU1QzQyXHU0RjlEXHU4RDU2XHVGRjA5XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAbWFudGluZS9cIikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW1hbnRpbmVcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gOC4gU1NFIFx1OTAxQVx1NEZFMVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQG1pY3Jvc29mdC9mZXRjaC1ldmVudC1zb3VyY2VcIikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWZldGNoXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFx1MjUwMFx1MjUwMCBcdTVCODhcdTUzNkJcdUZGMUFcdTk2MzJcdTZCNjIgQHNjb3BlL3JlYWN0IFx1N0M3Qlx1NTMwNVx1ODhBQlx1NTQwRVx1N0VFRCAvcmVhY3QvIFx1ODlDNFx1NTIxOVx1OEJFRlx1NjM1NVx1ODNCNyBcdTI1MDBcdTI1MDBcblxuICAgICAgICAgICAgLy8gXHU4REVGXHU1Rjg0XHU1NDJCIC9yZWFjdC8gXHU2MjE2IC9yZWFjdC1kb20vIFx1NzY4NFx1NEY1Q1x1NzUyOFx1NTdERlx1NTMwNVx1RkYwOFx1NTk4MiBAZmxvYXRpbmctdWkvcmVhY3QtZG9tXHUzMDAxXG4gICAgICAgICAgICAvLyBAZW1vdGlvbi9yZWFjdFx1RkYwOVx1NEUwRFx1NjYyRiBSZWFjdCBcdTY4MzhcdTVGQzNcdUZGMENcdTVFOTRcdTVGNTJcdTUxNjUgdmVuZG9yLWxpYiBcdTgwMENcdTk3NUUgdmVuZG9yLXJlYWN0XHUzMDAyXG4gICAgICAgICAgICAvLyBcdTkwMUFcdThGQzcgL0BcdUZGMDhwbnBtIFx1OERFRlx1NUY4NFx1NzI3OVx1NUY4MVx1RkYwOVx1OEJDNlx1NTIyQlx1NEY1Q1x1NzUyOFx1NTdERlx1NTMwNVx1MzAwMlxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL0BcIikgJiYgKGlkLmluY2x1ZGVzKFwiL3JlYWN0L1wiKSB8fCBpZC5pbmNsdWRlcyhcIi9yZWFjdC1kb20vXCIpKSkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItbGliXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFx1MjUwMFx1MjUwMCBcdTdCMkNcdTRFOENcdTY4QUZcdTk2MUZcdUZGMUFcdTkwMUFcdTc1MjhcdThERUZcdTVGODRcdTUzMzlcdTkxNEQgXHUyNTAwXHUyNTAwXG5cbiAgICAgICAgICAgIC8vIDguIFJlYWN0IFx1NjgzOFx1NUZDMyArIFx1N0QyN1x1NUJDNlx1NTE4NVx1OTBFOFx1NEY5RFx1OEQ1NlxuICAgICAgICAgICAgLy8gICAgXHU1MzA1XHU1NDJCIGxvb3NlLWVudmlmeSAvIGpzLXRva2Vuc1x1RkYwOHJlYWN0LWRvbVx1MzAwMXNjaGVkdWxlciBcdTUxNjVcdTUzRTNcdTY1ODdcdTRFRjZcdTc2ODRcbiAgICAgICAgICAgIC8vICAgIFx1OTc1OVx1NjAwMVx1NEY5RFx1OEQ1Nlx1RkYwOVx1RkYwQ1x1OTA3Rlx1NTE0RFx1NUI4M1x1NEVFQ1x1ODQzRFx1NTE2NSB2ZW5kb3ItbGliIFx1NEVBN1x1NzUxRlx1NjcwMFx1NTQwRVx1NEUwMFx1Njc2MVx1NUZBQVx1NzNBRlx1NUYxNVx1NzUyOFxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3QtZG9tL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9zY2hlZHVsZXIvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3JlYWN0LWlzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi91c2Utc3luYy1leHRlcm5hbC1zdG9yZS9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvbG9vc2UtZW52aWZ5L1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9qcy10b2tlbnMvXCIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXJlYWN0XCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDkuIFJlYWN0IFJvdXRlclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwicmVhY3Qtcm91dGVyXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1yb3V0ZXJcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gXHUyNTAwXHUyNTAwIFx1N0IyQ1x1NEUwOVx1NjhBRlx1OTYxRlx1RkYxQVx1NjJDNlx1NTIwNiB2ZW5kb3ItbGliIFx1NEUyRFx1NzY4NFx1NTkyN1x1NTc4Qlx1NTMwNVx1NjVDRiBcdTI1MDBcdTI1MDBcbiAgICAgICAgICAgIC8vIFx1OEZEOVx1NEU5Qlx1NTMwNVx1NEY1M1x1NzlFRlx1NTkyN1x1MzAwMVx1NjZGNFx1NjVCMFx1OTg5MVx1NzM4N1x1NzJFQ1x1N0FDQlx1RkYwQ1x1NjJDNlx1NTFGQVx1NTQwRSBDRE4gXHU3RjEzXHU1QjU4XHU3QzkyXHU1RUE2XHU2NkY0XHU3RUM2XHVGRjFBXG4gICAgICAgICAgICAvLyBcdTY2RjRcdTY1QjAgYmxvY2tub3RlIFx1NEUwRFx1NEYxQVx1NEY3RiBkMyBcdTdGMTNcdTVCNThcdTU5MzFcdTY1NDhcdUZGMENcdTUzQ0RcdTRFNEJcdTRFQTZcdTcxMzZcblxuICAgICAgICAgICAgLy8gMTAuIFByb3NlTWlycm9yICsgVGlwVGFwXHVGRjA4QmxvY2tOb3RlIFx1NzY4NFx1N0YxNlx1OEY5MVx1NTY2OFx1NTE4NVx1NjgzOFx1RkYwQ34xTUJcdUZGMDlcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInByb3NlbWlycm9yLVwiKSB8fCBpZC5pbmNsdWRlcyhcIkB0aXB0YXAvXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1wcm9zZW1pcnJvclwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAxMS4gQ29kZU1pcnJvciArIExlemVyXHVGRjA4U2FuZHBhY2sgXHU0RUUzXHU3ODAxXHU3RjE2XHU4RjkxXHU1NjY4XHU1MTg1XHU2ODM4XHVGRjBDfjcwMEtCXHVGRjA5XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAY29kZW1pcnJvci9cIikgfHwgaWQuaW5jbHVkZXMoXCJAbGV6ZXIvXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1jb2RlbWlycm9yXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDEyLiBEMyBcdTUzRUZcdTg5QzZcdTUzMTZcdTdDRkJcdTUyMTdcdUZGMDhNZXJtYWlkICsgQW50ViBcdTc2ODRcdTUxNzFcdTRFQUJcdTVFOTVcdTVDNDJcdUZGMEN+NTAwS0JcdUZGMDlcbiAgICAgICAgICAgIC8vICAgICBcdTUzMDVcdTU0MkIgZDMgXHU3Njg0XHU1QzBGXHU1NzhCXHU1REU1XHU1MTc3XHU0RjlEXHU4RDU2XHVGRjBDXHU5MDdGXHU1MTREXHU4NDNEXHU1MTY1IHZlbmRvci1saWIgXHU0RUE3XHU3NTFGXHU1RkFBXHU3M0FGXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2QzLVwiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9kMy9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvaW50ZXJubWFwL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9kZWxhdW5hdG9yL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yb2J1c3QtcHJlZGljYXRlcy9cIilcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItZDNcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gMTMuIE1lcm1haWQgXHU1NkZFXHU4ODY4ICsgXHU1QjUwXHU0RjlEXHU4RDU2XHVGRjA4XHU1MkE4XHU2MDAxXHU1QkZDXHU1MTY1XHVGRjA5XG4gICAgICAgICAgICAvLyAgICAgXHU1MzA1XHU1NDJCIG1lcm1haWQgXHU3Njg0XHU1REU1XHU1MTc3XHU0RjlEXHU4RDU2XHVGRjBDXHU5MDdGXHU1MTREXHU4NDNEXHU1MTY1IHZlbmRvci1saWIgXHU0RUE3XHU3NTFGXHU1RkFBXHU3M0FGXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL21lcm1haWQvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2xhbmdpdW0vXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2NoZXZyb3RhaW4vXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL0BjaGV2cm90YWluL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9kYWdyZS1kMy1lcy9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJAbWVybWFpZC1qcy9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvY3Vsb3JpL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9raHJvbWEvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2Vsa2pzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9jeXRvc2NhcGVcIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvZG9tcHVyaWZ5L1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9rYXRleC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvbWFya2VkL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yb3VnaGpzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9zdHlsaXMvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3RzLWRlZGVudC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvQGJyYWludHJlZS9zYW5pdGl6ZS11cmwvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2Nvc2UtYmFzZS9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvbGF5b3V0LWJhc2UvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3ZzY29kZS1sYW5ndWFnZXNlcnZlclwiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi92c2NvZGUtdXJpL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9jaGV2cm90YWluLWFsbHN0YXIvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL0BpY29uaWZ5L3V0aWxzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9oYWNodXJlLWZpbGwvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3BhdGgtZGF0YS1wYXJzZXIvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3BvaW50cy1vbi1jdXJ2ZS9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcG9pbnRzLW9uLXBhdGgvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2NvbW1hbmRlci9cIilcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItbWVybWFpZFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAxMy41IFx1OEJFRFx1NkNENVx1OUFEOFx1NEVBRVx1RkYwOFx1NEVFM1x1NzgwMVx1NTc1N1x1NkUzMlx1NjdEM1x1RkYwOVxuICAgICAgICAgICAgLy8gICAgIHJlaHlwZS1wcmlzbS1wbHVzIFx1NUZDNVx1OTg3Qlx1NTcyOFx1NkI2NFx1NTMzOVx1OTE0RFx1RkYwQ1x1NTQyNlx1NTIxOVx1NEYxQVx1ODhBQlx1NTQwRVx1OTc2Mlx1NzY4NCAvcmVoeXBlIFx1ODlDNFx1NTIxOVx1NjM1NVx1ODNCN1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWZyYWN0b3IvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3JlYWN0LXN5bnRheC1oaWdobGlnaHRlci9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVoeXBlLXByaXNtLXBsdXMvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2hpZ2hsaWdodC5qcy9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvbG93bGlnaHQvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3ByaXNtanMvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2ZhdWx0L1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9mb3JtYXQvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2hpZ2hsaWdodGpzLXZ1ZS9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcGFyc2UtbnVtZXJpYy1yYW5nZS9cIilcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3Itc3ludGF4LWhpZ2hsaWdodFwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAxMy42IE1hcmtkb3duL0hUTUwgQVNUIFx1ODlFM1x1Njc5MFxuICAgICAgICAgICAgLy8gICAgIFx1NTMwNVx1NTQyQiByZWh5cGUtKi9yZW1hcmstKi91bmlmaWVkIFx1NzUxRlx1NjAwMVx1NTNDQVx1NTE3Nlx1NUMwRlx1NTc4Qlx1NURFNVx1NTE3N1x1NEY5RFx1OEQ1Nlx1RkYwQ1xuICAgICAgICAgICAgLy8gICAgIFx1OTA3Rlx1NTE0RFx1NURFNVx1NTE3N1x1NUU5M1x1ODQzRFx1NTE2NSB2ZW5kb3ItbGliIFx1NEVBN1x1NzUxRlx1NUZBQVx1NzNBRlx1NUYxNVx1NzUyOFxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9tZGFzdC1cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvaGFzdC1cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvbWljcm9tYXJrXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3VuaXN0LVwiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi92ZmlsZVwiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9jaGFyYWN0ZXItZW50aXRpZXNcIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvc3RyaW5naWZ5LWVudGl0aWVzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9wcm9wZXJ0eS1pbmZvcm1hdGlvbi9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcGFyc2U1L1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9oYXN0c2NyaXB0L1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9odG1sLXJlYWN0LXBhcnNlci9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvaHRtbC1kb20tcGFyc2VyL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWh5cGVcIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVtYXJrXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3VuaWZpZWQvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3JlYWN0LW1hcmtkb3duL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9kZXZsb3AvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2NvbW1hLXNlcGFyYXRlZC10b2tlbnMvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3NwYWNlLXNlcGFyYXRlZC10b2tlbnMvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3dlYi1uYW1lc3BhY2VzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi96d2l0Y2gvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2Njb3VudC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvZGVjb2RlLW5hbWVkLWNoYXJhY3Rlci1yZWZlcmVuY2UvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3BhcnNlLWVudGl0aWVzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9iYWlsL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9pcy1wbGFpbi1vYmovXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3Ryb3VnaC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvdHJpbS1saW5lcy9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvbWFya2Rvd24tdGFibGUvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2xvbmdlc3Qtc3RyZWFrL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9AdHlwZXMvaGFzdC9cIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvQHR5cGVzL21kYXN0L1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9AdHlwZXMvdW5pc3QvXCIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW1hcmtkb3duXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDE0LiBcdTgxN0VcdThCQUZcdTRFOTEgQ09TIFNES1x1RkYwOFx1NTJBOFx1NjAwMVx1NUJGQ1x1NTE2NVx1RkYwOVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiY29zLWpzLXNkay12NVwiKSkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItY29zXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDE1LiBET0NYIFx1NUJGQ1x1NTFGQVx1RkYwOFx1NTJBOFx1NjAwMVx1NUJGQ1x1NTE2NVx1RkYwQ1x1NEVDNVx1NUJGQ1x1NTFGQVx1NjVGNlx1NTJBMFx1OEY3RFx1RkYwOVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL2RvY3gvXCIpIHx8IGlkLmluY2x1ZGVzKFwiL2ZpbGUtc2F2ZXIvXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1kb2N4XCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDE2LiBcdTVFMzhcdTc1MjhcdTVERTVcdTUxNzdcdTVFOTNcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvYXhpb3MvXCIpIHx8XG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2RheWpzL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi96dXN0YW5kL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi91dWlkL1wiKSB8fFxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9sb2Rhc2hcIikgfHxcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvY2xhc3NuYW1lcy9cIilcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItdXRpbHNcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gXHUyNTAwXHUyNTAwIFx1NTE1Q1x1NUU5NSBcdTI1MDBcdTI1MDBcblxuICAgICAgICAgICAgLy8gMTcuIFx1NTI2OVx1NEY1OSBub2RlX21vZHVsZXMgXHU3RURGXHU0RTAwXHU1RjUyXHU1MTY1IHZlbmRvci1saWJcbiAgICAgICAgICAgIC8vICAgICBcdTk2MzJcdTZCNjIgUm9sbHVwIFx1NUMwNlx1NjcyQVx1NTMzOVx1OTE0RFx1NzY4NFx1NEUyRFx1OTVGNFx1NEY5RFx1OEQ1Nlx1OTY4Rlx1NjEwRlx1NjUzRVx1NTE2NVx1NEUwQVx1OEZGMCBjaHVuayBcdTVCRkNcdTgxRjRcdTVGQUFcdTczQUZcdTVGMTVcdTc1MjhcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1saWJcIjtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGVzYnVpbGQ6IHtcbiAgICAgIGRyb3A6IGlzUHJvZHVjdGlvbiA/IFtcImNvbnNvbGVcIiwgXCJkZWJ1Z2dlclwiXSA6IFtdLFxuICAgICAgbGVnYWxDb21tZW50czogXCJub25lXCIsXG4gICAgICB0YXJnZXQ6IFwiZXMyMDIwXCIsXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzVCxTQUFTLGNBQWMsZUFBZTtBQUM1VixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsV0FBVyxxQkFBcUI7QUFDekMsU0FBUyxrQkFBa0I7QUFDM0IsU0FBUyxtQkFBbUI7QUFDNUIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sU0FBUztBQUNoQixPQUFPLGNBQWM7QUFUckIsSUFBTSxtQ0FBbUM7QUFXekMsTUFBTSxPQUFPLEdBQUc7QUFDaEIsTUFBTSxPQUFPLFFBQVE7QUFHckIsSUFBTSxXQUFXLE1BQU07QUFDckIsTUFBSTtBQUNGLFdBQU8sU0FBUyw4QkFBOEIsRUFBRSxVQUFVLE9BQU8sQ0FBQyxFQUFFLEtBQUs7QUFBQSxFQUMzRSxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRixHQUFHO0FBS0gsSUFBTSxnQkFBZ0IsTUFBTTtBQUMxQixTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixtQkFBbUIsTUFBYztBQUMvQixVQUFJO0FBRUYsY0FBTSxTQUFTLFNBQVMsOEJBQThCO0FBQUEsVUFDcEQsVUFBVTtBQUFBLFFBQ1osQ0FBQyxFQUFFLEtBQUs7QUFDUixjQUFNLFlB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
