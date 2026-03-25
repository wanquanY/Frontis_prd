import type { SVGProps } from "react";

/** 顶部返回箭头（24px，描边圆角） */
export const ArrowLeftIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14 6L8 12L14 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 编辑名称图标（14px） */
export const PencilIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 20h4l11-11a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 16v4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

/** 布局/网格图标（24px） */
export const LayoutIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <line x1="10" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/** 下拉箭头（14px） */
export const ChevronDownIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 14 14"
    width="14"
    height="14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3.5 5.25L7 8.75L10.5 5.25"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

/** 分类描边图标（14px） */
export const CategoryOutlineIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 14 14"
    width="14"
    height="14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.4 3.3h9.2c.6 0 1.1.5 1.1 1.1v.9c0 .6-.5 1.1-1.1 1.1H2.4c-.6 0-1.1-.5-1.1-1.1v-.9c0-.6.5-1.1 1.1-1.1z"
      stroke="currentColor"
      strokeWidth="1.17"
      strokeLinejoin="round"
    />
    <path
      d="M2.4 7.7h9.2c.6 0 1.1.5 1.1 1.1v.9c0 .6-.5 1.1-1.1 1.1H2.4c-.6 0-1.1-.5-1.1-1.1v-.9c0-.6.5-1.1 1.1-1.1z"
      stroke="currentColor"
      strokeWidth="1.17"
      strokeLinejoin="round"
    />
    <path d="M4 4.9h.9" stroke="currentColor" strokeWidth="1.17" strokeLinecap="round" />
    <path d="M4 9.3h.9" stroke="currentColor" strokeWidth="1.17" strokeLinecap="round" />
  </svg>
);

/** 列表更多操作（16px） */
export const EllipsisHorizontalIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <rect y="16" width="16" height="16" rx="4" transform="rotate(-90 0 16)" fillOpacity="0.1" />
    <path
      d="M6.93359 7.9998C6.93359 8.58647 7.41359 9.06647 8.00026 9.06647C8.58693 9.06647 9.06693 8.58647 9.06693 7.9998C9.06693 7.41314 8.58693 6.93314 8.00026 6.93314C7.41359 6.93314 6.93359 7.41314 6.93359 7.9998ZM6.93359 11.7331C6.93359 12.3198 7.41359 12.7998 8.00026 12.7998C8.58693 12.7998 9.06693 12.3198 9.06693 11.7331C9.06693 11.1465 8.58693 10.6665 8.00026 10.6665C7.41359 10.6665 6.93359 11.1465 6.93359 11.7331ZM6.93359 4.26647C6.93359 4.85314 7.41359 5.33314 8.00026 5.33314C8.58693 5.33314 9.06693 4.85314 9.06693 4.26647C9.06693 3.6798 8.58693 3.1998 8.00026 3.1998C7.41359 3.1998 6.93359 3.6798 6.93359 4.26647Z"
      fill="#86909C"
    />
  </svg>
);

/** 助理头像占位（24px） */
export const AssistantIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8 9a4 4 0 0 1 8 0v5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="10.25" cy="12" r="0.9" fill="currentColor" />
    <circle cx="13.75" cy="12" r="0.9" fill="currentColor" />
    <path d="M10 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 6v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** 工作区上传大图标（36px） */
export const WorkspaceUploadIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18 22V11"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 16.5L18 11l5.5 5.5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 25h14"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 附件图标（16px） */
export const PaperclipIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M6.2 8.7l4.2-4.2a2.3 2.3 0 1 1 3.3 3.3L7.7 13.8a3.4 3.4 0 0 1-4.8-4.8L8.7 3.2"
      stroke="currentColor"
      strokeWidth="1.33"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 发送图标（16px） */
export const SendIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3 8L13 3L10 13L8.2 8.8L3 8z"
      stroke="currentColor"
      strokeWidth="1.33"
      strokeLinejoin="round"
    />
  </svg>
);

/** 知识库 Tab 图标（16px） */
export const KnowledgeIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8 9a4 4 0 0 1 8 0v5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="10.25" cy="12" r="0.9" fill="currentColor" />
    <circle cx="13.75" cy="12" r="0.9" fill="currentColor" />
    <path d="M10 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** 知识库上传描边图标（20px） */
export const UploadOutlineIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10 12V5"
      stroke="currentColor"
      strokeWidth="1.66"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 8.5L10 5l3.5 3.5"
      stroke="currentColor"
      strokeWidth="1.66"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.5 14.5h9"
      stroke="currentColor"
      strokeWidth="1.66"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Plus 按钮（16px） */
export const PlusIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M8 3v10" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" />
    <path d="M3 8h10" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" />
  </svg>
);

/** 空态文件夹（32px） */
export const FolderOutlineIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 32 32"
    width="32"
    height="32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4.5 10.5h8l2-2h13c1.1 0 2 .9 2 2v13c0 1.1-.9 2-2 2h-23c-1.1 0-2-.9-2-2v-13c0-1.1.9-2 2-2z"
      stroke="currentColor"
      strokeWidth="2.66"
      strokeLinejoin="round"
    />
  </svg>
);

/** 文档状态：待分析（16px） */
export const StatusPendingIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="2.5" y="2.5" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="1.33" />
    <path d="M8 5.5v5" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" />
    <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" />
  </svg>
);

/** 文档状态：分析中（16px），旋转由 CSS 控制 */
export const StatusSpinnerIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="8" cy="8" r="6" stroke="#F2F3F5" strokeWidth="1.33" />
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="#00C1D4"
      strokeWidth="1.33"
      strokeLinecap="round"
      strokeDasharray="12 26"
      transform="rotate(-90 8 8)"
    />
  </svg>
);

/** 文档状态：失败可重试（16px） */
export const StatusRetryIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M12.2426 12.2426C11.1569 13.3284 9.65687 14 8 14C4.6863 14 2 11.3137 2 8C2 4.6863 4.6863 2 8 2C9.65687 2 11.1569 2.67157 12.2426 3.75737C12.7953 4.31003 14 5.66667 14 5.66667"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2.6665V5.6665H11"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 成果下载描边（12px） */
export const DownloadOutlineIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M6 1.8v5.1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path
      d="M4.2 5.7L6 7.5l1.8-1.8"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2.5 9.5h7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/** 成果加入知识库（12px） */
export const KnowledgePlusIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.6 2.4h4.7c.6 0 1 .4 1 1v5.2c0 .6-.4 1-1 1H2.6c-.6 0-1-.4-1-1V3.4c0-.6.4-1 1-1z"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <path d="M8.2 3.8h1.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M9.05 3v1.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/** 侧边栏新增图标（20px） */
export const AddIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <path
      d="M10 4V16"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 10H16"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 工作空间多边体图标（20px，可调宽高） */
export const WorkspaceIcon = ({
  width = 20,
  height = 20,
  ...props
}: SVGProps<SVGSVGElement> & { width?: number; height?: number }): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <path
      d="M17.0832 6.97708C17.0832 6.26834 16.7081 5.61253 16.0972 5.2532L11.0139 2.26309C10.388 1.89493 9.61171 1.89493 8.98582 2.26309L3.90249 5.25319C3.2916 5.61253 2.9165 6.26834 2.9165 6.97708V13.0227C2.9165 13.7314 3.29158 14.3872 3.90245 14.7465L8.98578 17.7368C9.61169 18.105 10.388 18.105 11.0139 17.7368L16.0972 14.7465C16.7081 14.3872 17.0832 13.7314 17.0832 13.0227V6.97708Z"
      stroke="currentColor"
      strokeLinejoin="round"
    />
    <path
      d="M6.6665 7.91565L8.93654 9.33637C9.58528 9.74239 10.4089 9.74259 11.0578 9.33689L13.3311 7.91565"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 10V13.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 历史会话气泡（16px） */
export const HistoryChatIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M14.6668 11.3333C14.6668 11.687 14.5264 12.0261 14.2763 12.2761C14.0263 12.5262 13.6871 12.6667 13.3335 12.6667H4.55216C4.19857 12.6667 3.85949 12.8073 3.6095 13.0573L2.1415 14.5253C2.0753 14.5915 1.99097 14.6366 1.89916 14.6548C1.80735 14.6731 1.71218 14.6637 1.6257 14.6279C1.53922 14.5921 1.4653 14.5314 1.41329 14.4536C1.36128 14.3758 1.33351 14.2843 1.3335 14.1907V3.33333C1.3335 2.97971 1.47397 2.64057 1.72402 2.39052C1.97407 2.14048 2.31321 2 2.66683 2H13.3335C13.6871 2 14.0263 2.14048 14.2763 2.39052C14.5264 2.64057 14.6668 2.97971 14.6668 3.33333V11.3333Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 侧边栏折叠箭头（16px） */
export const Arrow = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M3.99862 5.99792L7.9972 9.9965L11.9958 5.99792"
      stroke="#999999"
      strokeWidth="1.33286"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 侧边栏删除图标（12px） */
export const DeleteIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    {...props}
  >
    <g clipPath="url(#clip0_sidebar_delete)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 3.75H10L9.25 11H2.75L2 3.75Z"
        stroke="#6A7282"
        strokeLinejoin="round"
      />
      <path d="M5.00049 6.25049V8.75054" stroke="#6A7282" strokeLinecap="round" />
      <path d="M7.00061 6.25V8.74942" stroke="#6A7282" strokeLinecap="round" />
      <path
        d="M3 3.74997L7.08105 0.75L9 3.75"
        stroke="#6A7282"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_sidebar_delete">
        <rect width="12" height="12" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

/** 历史工作空间图标（12px） */
export const HistoryWorkspaceIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    {...props}
  >
    <path
      d="M10.25 4.64383C10.25 3.9351 9.87491 3.27929 9.26402 2.91995L7.01402 1.59646C6.38813 1.2283 5.61187 1.22831 4.98598 1.59646L2.73598 2.91995C2.12509 3.27929 1.75 3.9351 1.75 4.64383V7.35607C1.75 8.06479 2.12508 8.72059 2.73594 9.07993L4.98595 10.4035C5.61185 10.7717 6.38815 10.7717 7.01406 10.4035L9.26406 9.07993C9.87493 8.72059 10.25 8.06479 10.25 7.35607V4.64383Z"
      stroke="#6A7282"
      strokeLinejoin="round"
    />
    <path
      d="M4 4.74951L4.93783 5.33646C5.58658 5.74248 6.41015 5.74268 7.05909 5.33698L7.99878 4.74951"
      stroke="#6A7282"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 6V8.25" stroke="#6A7282" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 管理后台图标（14px） */
export const AdminPanelIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    {...props}
  >
    <rect
      x="1.75"
      y="1.75"
      width="10.5"
      height="10.5"
      rx="2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7 1.75V12.25" stroke="currentColor" strokeLinecap="round" />
    <path d="M1.75 7H12.25" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

/** 退出登录图标（14px） */
export const LogoutIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    {...props}
  >
    <path
      d="M6.99758 1.75H1.75V12.25H7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.625 9.625L12.25 7L9.625 4.375"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.66667 6.99756H12.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Workspace 页面编辑图标（16px） */
export const EditIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M13.3333 11V14C13.3333 14.3682 13.0349 14.6667 12.6667 14.6667H10.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.3334 5.33301V1.99967C13.3334 1.63148 13.0349 1.33301 12.6667 1.33301H3.33341C2.96522 1.33301 2.66675 1.63148 2.66675 1.99967V13.9997C2.66675 14.3679 2.96522 14.6663 3.33341 14.6663H5.33341"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5.33325 5.33301H9.99992" stroke="currentColor" strokeLinecap="round" />
    <path d="M7.66675 14.667L13.3334 7.66699" stroke="currentColor" strokeLinecap="round" />
    <path d="M5.33325 8H7.99992" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

/** Workspace 页面删除图标（16px） */
export const WorkspaceDeleteIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.66675 5H13.3334L12.3334 14.6667H3.66675L2.66675 5Z"
      stroke="#333333"
      strokeLinejoin="round"
    />
    <path d="M6.66724 8.33398V11.6674" stroke="#333333" strokeLinecap="round" />
    <path d="M9.33423 8.33301V11.6656" stroke="#333333" strokeLinecap="round" />
    <path
      d="M4 4.99997L9.4414 1L12 5"
      stroke="#333333"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** HomeChat 上传图标（20px） */
export const UploadIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <path
      d="M10.2951 3.98563L4.10787 10.1728C2.6434 11.6373 2.6434 14.0117 4.10787 15.4761C5.57233 16.9406 7.9467 16.9406 9.41116 15.4761L16.7769 8.11042C17.7532 7.13413 17.7532 5.55121 16.7769 4.57488C15.8006 3.59858 14.2177 3.59858 13.2413 4.57488L5.87566 11.9406C5.38749 12.4288 5.38749 13.2202 5.87566 13.7083C6.36378 14.1965 7.15524 14.1965 7.64341 13.7083L13.8306 7.52117"
      stroke="currentColor"
      strokeWidth="1.12483"
      strokeLinejoin="round"
    />
  </svg>
);

/** HomeChat 发送按钮禁用图标（16px） */
export const SendBtnIconDisabled = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <g clipPath="url(#clip0_send_btn_disabled)">
      <path
        d="M9.68724 14.4523C9.71256 14.5154 9.75658 14.5692 9.81338 14.6066C9.87018 14.644 9.93706 14.6631 10.005 14.6613C10.073 14.6596 10.1388 14.6371 10.1936 14.5969C10.2484 14.5566 10.2896 14.5006 10.3117 14.4363L14.6435 1.77414C14.6648 1.71509 14.6689 1.65119 14.6552 1.58991C14.6416 1.52863 14.6107 1.47251 14.5663 1.42811C14.5219 1.38372 14.4658 1.35289 14.4045 1.33922C14.3433 1.32556 14.2793 1.32963 14.2203 1.35096L1.55813 5.68275C1.49382 5.70481 1.43779 5.74601 1.39757 5.80082C1.35735 5.85564 1.33486 5.92145 1.33312 5.98942C1.33138 6.05738 1.35047 6.12426 1.38783 6.18106C1.42519 6.23786 1.47904 6.28188 1.54214 6.3072L6.82693 8.42644C6.99399 8.49333 7.14578 8.59336 7.27315 8.72049C7.40051 8.84763 7.50081 8.99924 7.568 9.16618L9.68724 14.4523Z"
        stroke="#99A1AF"
        strokeWidth="1.33286"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5642 1.43091L7.27344 8.72098"
        stroke="#99A1AF"
        strokeWidth="1.33286"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_send_btn_disabled">
        <rect width="15.9943" height="15.9943" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

/** HomeChat 发送按钮激活图标（15px） */
export const SendBtnIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    {...props}
  >
    <path
      d="M8.71852 13.0071C8.74131 13.0639 8.78092 13.1124 8.83204 13.146C8.88317 13.1796 8.94335 13.1968 9.00452 13.1953C9.06569 13.1937 9.12492 13.1735 9.17425 13.1373C9.22359 13.1011 9.26067 13.0506 9.28052 12.9927L13.1791 1.5968C13.1983 1.54365 13.202 1.48614 13.1897 1.43099C13.1774 1.37584 13.1496 1.32533 13.1097 1.28538C13.0697 1.24542 13.0192 1.21767 12.9641 1.20537C12.9089 1.19308 12.8514 1.19674 12.7983 1.21593L1.40232 5.11455C1.34444 5.1344 1.29401 5.17148 1.25781 5.22081C1.22161 5.27015 1.20137 5.32938 1.19981 5.39055C1.19824 5.45172 1.21542 5.5119 1.24905 5.56303C1.28267 5.61415 1.33113 5.65376 1.38792 5.67655L6.14423 7.58387C6.29459 7.64407 6.4312 7.73409 6.54583 7.84852C6.66046 7.96294 6.75073 8.09939 6.8112 8.24964L8.71852 13.0071Z"
      stroke="currentColor"
      strokeWidth="1.19957"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.1077 1.2876L6.54602 7.84867"
      stroke="currentColor"
      strokeWidth="1.19957"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 首页文件上传图标（20px） */
export const FileUploadIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <path
      d="M10.2951 3.98575L4.10787 10.173C2.6434 11.6374 2.6434 14.0118 4.10787 15.4762C5.57233 16.9407 7.9467 16.9407 9.41116 15.4762L16.7769 8.11054C17.7532 7.13425 17.7532 5.55133 16.7769 4.575C15.8006 3.5987 14.2177 3.5987 13.2413 4.575L5.87566 11.9407C5.38749 12.4289 5.38749 13.2203 5.87566 13.7085C6.36378 14.1966 7.15524 14.1966 7.64341 13.7085L13.8306 7.52129"
      stroke="currentColor"
      strokeWidth="1.12483"
      strokeLinejoin="round"
    />
  </svg>
);

/** Agent hover 特效图标（首页） */
export const AgentHoverIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="16"
    viewBox="0 0 26 16"
    fill="none"
    {...props}
  >
    <path
      d="M21.1079 10.64C20.9585 10.64 20.8252 10.5813 20.7079 10.464C20.6012 10.336 20.5479 10.1067 20.5479 9.776C20.5479 9.54133 20.5905 9.17333 20.6759 8.672C20.7612 8.17067 20.8785 7.59467 21.0279 6.944C21.1879 6.28267 21.3692 5.59467 21.5719 4.88C21.7745 4.15467 21.9932 3.44533 22.2279 2.752C22.4625 2.048 22.7025 1.41333 22.9479 0.848001C23.0652 0.570667 23.2465 0.362667 23.4919 0.224C23.7479 0.0746667 24.0252 0 24.3239 0C24.6332 0 24.8572 0.144 24.9959 0.432C25.1345 0.72 25.2039 1.03467 25.2039 1.376C25.2039 1.504 25.1399 1.744 25.0119 2.096C24.8945 2.448 24.7345 2.87467 24.5319 3.376C24.3292 3.87733 24.1052 4.42133 23.8599 5.008C23.6252 5.584 23.3852 6.17067 23.1399 6.768C22.9052 7.35467 22.6865 7.91467 22.4839 8.448C22.2812 8.98133 22.1159 9.45067 21.9879 9.856C21.9025 10.144 21.7852 10.3467 21.6359 10.464C21.4972 10.5813 21.3212 10.64 21.1079 10.64ZM20.2759 15.104C20.1479 15.104 19.9985 15.072 19.8279 15.008C19.6572 14.944 19.5079 14.7893 19.3799 14.544C19.2625 14.3093 19.2039 13.9307 19.2039 13.408C19.2039 13.0027 19.3319 12.6933 19.5879 12.48C19.8439 12.2667 20.1852 12.16 20.6119 12.16C20.9745 12.16 21.2519 12.2613 21.4439 12.464C21.6465 12.6667 21.7479 12.9547 21.7479 13.328C21.7479 13.6693 21.6625 13.9733 21.4919 14.24C21.3319 14.5067 21.1345 14.7147 20.8999 14.864C20.6759 15.024 20.4679 15.104 20.2759 15.104Z"
      fill="currentColor"
    />
    <path
      d="M14.9754 14.5283C14.6767 14.5283 14.41 14.427 14.1754 14.2243C13.9514 14.0216 13.8394 13.691 13.8394 13.2323C13.8394 12.987 13.8714 12.6403 13.9354 12.1923C14.01 11.7443 14.106 11.259 14.2234 10.7363C14.3407 10.203 14.4687 9.67496 14.6074 9.1523C14.7567 8.62963 14.9007 8.16563 15.0394 7.7603C15.178 7.3443 15.3007 7.03496 15.4074 6.8323C15.546 6.58696 15.674 6.43763 15.7914 6.3843C15.9194 6.3203 16.042 6.2883 16.1594 6.2883C16.3727 6.2883 16.57 6.3523 16.7514 6.4803C16.9434 6.6083 17.0394 6.89096 17.0394 7.3283C17.0394 7.49896 17.0074 7.7763 16.9434 8.1603C16.8794 8.53363 16.7994 8.97096 16.7034 9.4723C16.6074 9.97363 16.5007 10.491 16.3834 11.0243C16.2767 11.5576 16.17 12.0643 16.0634 12.5443C15.9674 13.0136 15.8874 13.4083 15.8234 13.7283C15.77 13.995 15.658 14.1923 15.4874 14.3203C15.3274 14.459 15.1567 14.5283 14.9754 14.5283ZM16.8154 4.7043C16.4634 4.7043 16.138 4.60296 15.8394 4.4003C15.5407 4.18696 15.3914 3.86163 15.3914 3.4243C15.3914 3.06163 15.482 2.7683 15.6634 2.5443C15.8447 2.3203 16.058 2.1603 16.3034 2.0643C16.5594 1.95763 16.7834 1.9043 16.9754 1.9043C17.1674 1.9043 17.3807 1.94696 17.6154 2.0323C17.85 2.10696 18.0527 2.25096 18.2234 2.4643C18.4047 2.66696 18.4954 2.9603 18.4954 3.3443C18.4954 3.6003 18.4047 3.83496 18.2234 4.0483C18.042 4.25096 17.818 4.41096 17.5514 4.5283C17.2954 4.64563 17.05 4.7043 16.8154 4.7043Z"
      fill="currentColor"
    />
    <path
      d="M1.104 14.0322C1.104 14.0322 1.09867 14.0322 1.088 14.0322C0.917333 14.0322 0.746667 14.0056 0.576 13.9522C0.405333 13.8989 0.266667 13.7442 0.16 13.4882C0.0533333 13.2216 0 12.7736 0 12.1442C0 11.7069 0.0586668 11.1736 0.176 10.5442C0.293333 9.91492 0.442667 9.23758 0.624 8.51225C0.816 7.77625 1.024 7.04558 1.248 6.32025C1.472 5.59491 1.68533 4.91758 1.888 4.28825C2.10133 3.65892 2.288 3.12025 2.448 2.67225C2.61867 2.22425 2.74133 1.92558 2.816 1.77625C2.89067 1.59492 3.01333 1.44025 3.184 1.31225C3.36533 1.17358 3.552 1.10425 3.744 1.10425C4.13867 1.10425 4.39467 1.21092 4.512 1.42425C4.62933 1.62692 4.688 1.85092 4.688 2.09625C4.688 2.30958 4.59733 2.80558 4.416 3.58425C4.23467 4.35225 3.94667 5.48292 3.552 6.97625C4.448 6.91225 5.36533 6.82692 6.304 6.72025C7.25333 6.61358 8.09067 6.51225 8.816 6.41625C8.98667 5.77625 9.152 5.18425 9.312 4.64025C9.472 4.08558 9.61067 3.62158 9.728 3.24825C9.84533 2.86425 9.92533 2.60825 9.968 2.48025C10.1387 2.08558 10.32 1.81358 10.512 1.66425C10.7147 1.51492 10.9227 1.44025 11.136 1.44025C11.4133 1.44025 11.648 1.53092 11.84 1.71225C12.0427 1.88292 12.144 2.17091 12.144 2.57625C12.144 2.83225 12.0747 3.30692 11.936 4.00025C11.7973 4.69358 11.6267 5.47758 11.424 6.35225C11.584 6.45892 11.7227 6.58692 11.84 6.73625C11.968 6.88558 12.032 7.02425 12.032 7.15225C12.032 7.32292 11.9893 7.48825 11.904 7.64825C11.8293 7.79758 11.6587 7.93092 11.392 8.04825C11.3173 8.08025 11.184 8.11758 10.992 8.16025C10.7893 8.98158 10.592 9.77092 10.4 10.5282C10.2187 11.2749 10.064 11.9149 9.936 12.4482C9.808 12.9709 9.73333 13.3069 9.712 13.4562C9.648 13.8509 9.53067 14.1816 9.36 14.4482C9.18933 14.7256 8.928 14.8642 8.576 14.8642C8.30933 14.8642 8.09067 14.7416 7.92 14.4962C7.74933 14.2509 7.664 13.7496 7.664 12.9922C7.664 12.4269 7.72267 11.7709 7.84 11.0242C7.95733 10.2669 8.10133 9.49358 8.272 8.70425C7.472 8.83225 6.608 8.94425 5.68 9.04025C4.752 9.12558 3.84533 9.16292 2.96 9.15225C2.65067 10.3576 2.39467 11.3176 2.192 12.0322C2 12.7469 1.824 13.2589 1.664 13.5682C1.504 13.8776 1.31733 14.0322 1.104 14.0322Z"
      fill="currentColor"
    />
  </svg>
);

/** Agent 激活圆形对勾（20px） */
export const AgentActiveIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    {...props}
  >
    <path
      d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z"
      fill="#00C1D4"
    />
    <path
      d="M7.1875 10.4165L9.0625 12.2915L12.8125 8.5415"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Agent 列表更多（24px 三圆） */
export const AgentListMoreIcon = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <circle cx="7" cy="7" r="3.5" stroke="currentColor" />
    <circle cx="17" cy="7" r="3.5" stroke="currentColor" />
    <path
      d="M7 12.5C8.933 12.5 10.5 14.067 10.5 16V20.5H3.5V16C3.5 14.067 5.067 12.5 7 12.5Z"
      stroke="currentColor"
    />
    <path d="M20.5 13.5V20.5H13.5V13.5H20.5Z" stroke="currentColor" />
  </svg>
);
