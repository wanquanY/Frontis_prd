# AGENTS.md

**（Vite + React + TypeScript Web 项目 · Codex 工程规范）**

> 本文件定义本仓库中 **AI 编码代理（Codex）必须遵守的最高优先级工程规范**。若无法遵守，必须暂停并说明原因。

---

## 一、项目技术背景

- 技术栈：**React 18 + TypeScript 5（strict）+ Vite 5（SWC）+ React Router v6 + Less(CSS Modules)**
- UI：**Ant Design 6 + @ant-design/x**（AI/Chat 组件），CSS 类名工具 `classnames`
- 状态：**Zustand 4**（`src/store` 仅存状态模型）
- 网络：**Axios 封装 httpClient**，SSE 复用 `openSSEStream` 或 `fetchEventSource`
- 工具：`dayjs`，包管理器 **pnpm**
- 约定：路径别名 `@/` → `./src/`；环境变量前缀 `VITE_`（`import.meta.env` 访问）；生产构建移除 `console` 与 `debugger`；页面默认使用 `React.lazy()` 懒加载
- 目录结构（保持各司其职）：
  - `src/pages/**` 路由入口页面
  - `src/feature/<domain>/components|hooks|types` 业务域内实现
  - `src/components/**` 全局可复用 UI（无业务副作用）
  - `src/layouts/**` 布局组件
  - `src/router/**` 路由配置与守卫
  - `src/hooks/**` 全局 hooks
  - `src/services/**` 服务模块（系统事件等）
  - `src/store/**` Zustand 状态与动作
  - `src/apis/**` 接口模块
  - `src/utils/**` 纯工具函数；`src/constants/**` 常量；`src/types/**` 全局类型
  - `src/styles/**` 全局样式与 CSS 变量；`src/assets/**` 资产

---

## 二、任务流程（每次回复需体现）

### 0.1 变更前自检

- **目标**：本次要实现什么
- **影响面**：计划改动的文件（最小化）
- **复用点**：可直接复用的模块/文件路径
- **不确定项**：需先确认的问题（如有必须先问）

### 0.2 实现原则

- 严格遵守本文件、局部 `AGENTS.md` 与 `.claude/rules/` 目录下规范
- 优先复用现有实现，不重复造轮子
- 导出的公共函数 / hooks / 组件需有明确类型与中文 JSDoc
- 保持改动最小，避免顺手重构
- 已有桶文件（`index.ts`）需同步维护公共导出（不新增 barrel exports）

### 0.3 变更后验收

- 自测方式（入口页面/操作路径）
- 可运行命令（必须来自 `package.json`）
- 风险点与回滚说明（如涉及 auth/请求/主题）

---

## 三、通用强制原则

1️⃣ **工程安全**：禁止虚构不存在的文件/目录/类型/依赖；禁止新增 `package.json` 外的依赖；业务不明确必须先问，禁止猜测业务逻辑。

2️⃣ **最小改动**：仅做完成目标所需的修改，避免顺手优化/统一风格。

3️⃣ **TypeScript 严格**：禁止 `any` / `as any` / 无依据断言 / 绕过类型系统；所有导出必须声明参数与返回类型。

---

## 四、目录与职责边界

- `src/pages/**`：页面组装与布局，调度 hooks/store 与 UI 组件，不写通用工具。
- `src/feature/<domain>/components/**`：域内 UI，**只做样式/交互壳**，不写业务副作用。
- `src/feature/<domain>/hooks/**`：域内副作用/业务逻辑（请求、路由、定时器等），输出给页面/组件使用。
- `src/feature/<domain>/types.ts`：域内类型定义。
- `src/components/**`：全局可复用 UI（无业务副作用、无网络请求）。
- `src/layouts/**`：布局组件。
- `src/router/**`：路由配置与守卫。
- `src/hooks/**`：全局 hooks。
- `src/services/**`：服务模块（系统事件等）。
- `src/store/**`：Zustand store **仅存状态/动作**，不直接请求接口；副作用放对应 hook。
- `src/utils/**`：纯函数工具，零副作用。
- `src/constants/**`：常量、枚举、主题映射等。
- `src/types/**`：全局共享类型。
- 样式：页面/组件对应 `.module.less`，禁止内联全局样式。

---

## 五、强制复用

- 实现前先搜索可复用点：`feature/`、`components/`、`store/`、`utils/`、`apis/`。
- 禁止在页面/组件内临时实现工具函数或复制粘贴已有逻辑。

---

## 六、命名与新增文件

### 文件命名

| 类型        | 命名方式                    | 示例                                        |
| ----------- | --------------------------- | ------------------------------------------- |
| 页面组件    | PascalCase + `Page` 后缀    | `HomePage.tsx`, `ChatPage.tsx`              |
| React 组件  | PascalCase                  | `HomeChat.tsx`, `ChatInput.tsx`             |
| 自定义 Hook | `use` 前缀 + camelCase      | `useBlocks.ts`, `useComposerAttachments.ts` |
| 工具函数    | camelCase                   | `http.ts`, `logger.ts`                      |
| 样式文件    | 与组件同名 + `.module.less` | `HomeChat.module.less`                      |
| Store 文件  | camelCase                   | `auth.ts`, `chat.ts`                        |
| API 模块    | PascalCase + `Api` 后缀     | `LoginApi.ts`, `SessionApi.ts`              |
| 类型文件    | camelCase                   | `chat.ts`, `block.ts`                       |
| 常量文件    | camelCase                   | `const.ts`                                  |

### 代码命名

| 类型            | 命名方式                      | 示例                                   |
| --------------- | ----------------------------- | -------------------------------------- |
| 组件名          | PascalCase                    | `HomeChat`, `ChatInput`                |
| 函数/变量       | camelCase                     | `handleSend`, `currentSession`         |
| 常量            | UPPER_SNAKE_CASE 或 camelCase | `MAX_RETRY_COUNT`, `defaultModel`      |
| 接口/类型       | PascalCase                    | `LoginParams`, `UserInfo`, `BlockKind` |
| 枚举            | PascalCase（枚举名和值）      | `SessionStatus.Active`                 |
| CSS Module 类名 | camelCase                     | `styles.chatContainer`                 |
| 事件处理函数    | `handle` 前缀                 | `handleSend`, `handleClick`            |
| 布尔变量        | `is/has/should` 前缀          | `isStreaming`, `hasError`              |

### 目录命名

- 组件目录：PascalCase（如 `HomeChat/`）。
- 功能模块目录：kebab-case 或 camelCase（如 `chat/`, `workspace/`）。
- 其他目录：camelCase（如 `hooks/`, `utils/`, `store/`）。

### 新增文件落点

- 页面：`src/pages/<name>/<Name>Page.tsx`（或沿用现有 `Index.tsx`，需保持一致）。
- 组件：`PascalCase.tsx`。
- Hook：`use-xxx.ts[x]` 放在对应 `feature/<domain>/hooks/` 或 `src/hooks/`（全局）。
- 类型：`types.ts` 放在域下，或 `src/types/`（全局）。

---

## 七、导入与模块规范

- 导入顺序：1) React 核心；2) 第三方库；3) 项目内部 `@/` 模块；4) 相对路径（同模块内）；各组之间空一行。
- 路径：跨模块必须用 `@/` 别名；同模块用相对路径；样式文件始终相对导入；避免超过两层的 `../../..`，改用别名。
- 导出：组件/hooks/工具函数/类型使用命名导出；项目默认**不新增 barrel exports（index.ts 聚合导出）**，如历史存在桶文件，必须同步维护已暴露内容，新增模块直接从具体文件导入。

---

## 八、TypeScript 规范

- 项目开启 `strict: true`，必须通过严格类型检查；目标 `ESNext`，模块解析 `bundler`。
- 使用 `interface` 描述可扩展对象结构，`type` 描述联合/交叉/工具类型。
- 组件 Props 使用 `interface`，命名 `[ComponentName]Props`。
- 请求/响应类型命名：`[Action][Domain]Params`、`[Domain]Info` 或 `[Domain]Response`。
- 导入类型使用 `import type`，避免运行时代码膨胀。
- 禁止 `any` / `as any` / `@ts-ignore`；不确定类型用 `unknown` 并做类型守卫。
- 泛型命名具语义，如 `<TItem>`；枚举使用 `const enum` 或字面量联合。
- 全局类型放 `src/types/`，业务专属类型放对应 `feature/<domain>/types/`。

---

## 九、Web/React 与组件编写规范

- 仅使用函数式组件，优先命名导出；所有 props 必须有 TS 类型。
- 组件结构建议顺序：store hooks → 本地 state → `useEffect` 副作用 → 事件处理（`useCallback` 包裹）→ 渲染。
- 禁止在 render 中产生副作用；订阅/事件需在 `useEffect` 中成对清理。
- 传递给子组件的回调使用 `useCallback`；昂贵计算用 `useMemo`；Zustand 订阅使用选择器 `useStore(s => s.field)`。
- 条件渲染：简单用 `&&`，二选一用三元；复杂逻辑提取为函数/变量。
- 列表渲染提供稳定唯一 `key`，避免使用 `index`（静态列表除外）。
- 禁止在组件内直接调用接口，需通过 hooks/store 封装；禁止在 JSX 中写复杂逻辑或硬编码样式；保持可访问性（键盘可达、aria）。

---

## 十、路由与页面规范

- 路由集中在 `src/router/AppRoutes.tsx`，使用 `RouteGuard` 做鉴权。
- 所有页面组件使用 `React.lazy()` 懒加载。
- 页面目录：`src/pages/[pageName]/[Name]Page.tsx`；页面负责布局与数据编排，UI 下沉到 feature 组件。
- 组件归属：多处复用→`src/components/`；仅属单个 feature→`src/feature/<name>/components/`；仅属单页且简单→可放页面目录。

---

## 十一、状态管理规范（Zustand）

- 使用 Zustand 作为唯一全局状态方案，禁止用 React Context 做全局状态。
- 每个业务域一个独立 store（文件放 `src/store/`），命名 `use[Domain]Store`（文件名 camelCase）。
- Store 仅存状态/动作，不直接请求接口；异步逻辑可封装在 store 方法或专属 hooks。
- 组件订阅使用选择器，避免订阅整个 store。
- 持久化仅对需跨会话字段使用 `persist`，配合 `partialize` 精准选择；合理实现 `reset`。

---

## 十二、API 与网络/鉴权规范

- API 模块集中在 `src/apis/`，按业务域拆分，命名 `[Domain]Api.ts`，统一使用命名导出。
- 统一使用 `src/utils/http.ts` 中的 `httpClient`；禁止直接 `axios`/`fetch`（SSE 场景除外）。
- SSE：简单场景用 `openSSEStream`，复杂场景用 `fetchEventSource`；组件卸载必须关闭连接。
- 响应格式约定 `{ code, data, message }`；错误提示由调用方负责，httpClient 已处理 401 刷新与错误上报。
- 请求取消使用 `AbortController`；GET 可启用 httpClient 缓存（TTL）。
- 网络请求必须通过对应 `apis` 封装，页面/组件不直接发请求；鉴权沿用现有 store/hook，禁止自建 token 维护。

---

## 十三、样式编写规范

- 必须使用 CSS Modules + Less：`import styles from "./Component.module.less"`;less必须使用结构嵌套语法;禁止在组件中引入全局样式。
- 必须使用 CSS 变量，禁止硬编码颜色；类名使用 camelCase，语义化命名；禁止 `!important`；嵌套不超过 3 层。
- 禁止内联样式（除非动态计算的值）。
- 文件命名：组件 `ComponentName.module.less`；页面 `PageName.module.less`；布局 `LayoutName.module.less`。文件与组件同目录存放。
- 可用 CSS 变量：
  - 颜色：`--app-bg`, `--surface`, `--text`, `--text-secondary`, `--text-muted`, `--primary`, `--border`
  - 阴影：`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`
  - 圆角：`--radius-lg`
- 推荐：使用 `classNames` 组合状态类；属性顺序遵循定位→盒模型→排版→视觉→其他；提供 hover/disabled 等状态类。
- 禁止：全局类名、深层嵌套、`!important`、硬编码颜色、在组件中导入全局样式。
- 样式审查清单：已用 CSS Modules；使用 `var(--xxx)`；类名驼峰且语义化；嵌套≤3；无 `!important` 与硬编码颜色；未引入全局样式。

---

## 十四、代码格式化规范

- Prettier 配置：`singleQuote: false`，`semi: true`，`trailingComma: "all"`，`tabWidth: 2`，`printWidth: 100`，`arrowParens: "avoid"`。
- 关键要求：使用双引号；语句末尾加分号；所有场景加尾逗号；缩进 2 空格；单参数箭头函数不加括号。
- ESLint 关键规则：`@typescript-eslint/no-explicit-any` warn；`react-hooks/exhaustive-deps` warn；`react/react-in-jsx-scope` off；`react/prop-types` off。

---

## 十五、性能与最佳实践

- 组件性能：纯展示组件可用 `React.memo`；回调用 `useCallback`，昂贵计算用 `useMemo`；Zustand 订阅使用选择器；列表 `key` 稳定唯一。
- 代码分割：页面使用 `React.lazy()` + `Suspense`；大型三方库可动态导入；Vite 已有 vendor 分包策略。
- 资源：图片用 `scripts/compress-images.js` 压缩；大图使用 `LazyImage` 懒加载；静态资源放 `public/` 或 `src/assets/`。
- 网络：避免组件挂载重复请求；SSE 在卸载时关闭；需要时使用缓存与请求取消。
- 安全：禁止硬编码密钥/token；敏感变量放 `.env.*` 且不入库；用户输入需防 XSS（复用 AntD 组件转义）。

---

## 十六、需事先确认的场景

- 引入任何新依赖。
- 调整公共 API（hooks/components/utils/store）。
- 涉及登录态/权限/全局主题。
- 需求不明确或数据模型不清晰。
- 需要修改路由配置。
- 需要修改构建配置（如 `vite.config.ts`）。
- 需要修改环境变量或 `.env.*`。

---

## 十七、输出与交付

- 按文件路径逐项说明变更，提供完整文件或清晰 diff。
- 说明新增封装/公共接口修改及取舍理由。
- 新增公共模块需添加中文 JSDoc；复杂业务逻辑需添加注释说明。

---

## 十八、详细规范文档

本文件是总纲，详细规范请参考 `.claude/rules/` 目录：

1. **01-project-overview.md** - 技术栈与目录结构
2. **02-naming-conventions.md** - 文件与代码命名规范
3. **03-component-patterns.md** - 组件编写模式
4. **04-state-management.md** - Zustand 状态管理规范
5. **05-api-conventions.md** - API 接口编写规范
6. **06-typescript.md** - TypeScript 类型规范
7. **07-imports.md** - 导入与模块规范
8. **08-formatting.md** - 代码格式化规范
9. **09-routing-pages.md** - 路由与页面规范
10. **10-performance.md** - 性能与最佳实践
11. **11-styles.md** - 样式编写规范（CSS Modules + Less）

---

## 十九、最终裁决

- 规范优先于个人偏好；不确定时先问。
- 若无法遵守规范，必须说明并暂停实施。

---

> 本文件即为本项目的 **AI 工程宪法**，默认对 Codex 永久生效。
