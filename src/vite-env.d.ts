/// <reference types="vite/client" />

declare const __APP_ENV__: string;
declare const __APP_VERSION__: string;

declare module "*.module.less" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.less" {
  const source: string;
  export default source;
}

declare module "*.png" {
  const source: string;
  export default source;
}

declare module "*.svg" {
  const source: string;
  export default source;
}

declare module "*.jpg" {
  const source: string;
  export default source;
}

declare module "*.jpeg" {
  const source: string;
  export default source;
}

declare module "*.gif" {
  const source: string;
  export default source;
}

declare module "*.webp" {
  const source: string;
  export default source;
}
