/**
 * =========================================
 * 全局滚动条显隐控制（精准局部容器 + 渐隐）
 * =========================================
 *
 * 1. 只在「真正发生滚动的那个容器」上显示滚动条
 * 2. 滚动开始立刻显示（wheel / touchmove）
 */

type Timer = ReturnType<typeof setTimeout>;

/**
 * 停止滚动后，保持滚动条可见的时间
 */
const KEEP_VISIBLE = 220;

/**
 * - key：滚动容器
 * - value：该容器对应的“隐藏定时器”
 * - DOM 节点销毁后可被 GC
 */
const timers = new WeakMap<HTMLElement, Timer>();

/**
 * 设置滚动条透明度变量
 * 这里只操作 style，不依赖 class
 */
const setAlpha = (el: HTMLElement, alpha: 0 | 1) => {
  el.style.setProperty("--sb-alpha", String(alpha));
};

/**
 * 核心方法：标记某个元素“正在滚动”
 * 1. 打上 data-scrolling="true"
 * 2. 立即显示滚动条
 */
const markScrolling = (el: HTMLElement) => {
  // 标记为“滚动中”（CSS 依赖这个状态）
  el.setAttribute("data-scrolling", "true");

  // 立即显示滚动条
  setAlpha(el, 1);

  // 如果之前已经有隐藏定时器，先清除
  const oldTimer = timers.get(el);
  if (oldTimer) clearTimeout(oldTimer);

  const timer = setTimeout(() => {
    // 移除“滚动中”标记
    el.removeAttribute("data-scrolling");

    setAlpha(el, 0);

    timers.delete(el);
  }, KEEP_VISIBLE);

  timers.set(el, timer);
};

/**
 * 判断某个元素在指定轴向上
 * CSS 层面是否允许滚动
 */
const isScrollableStyle = (el: HTMLElement, axis: "y" | "x"): boolean => {
  const style = getComputedStyle(el);
  const overflow = axis === "y" ? style.overflowY : style.overflowX;

  return overflow === "auto" || overflow === "scroll";
};

/**
 * 判断某个元素在某个方向上
 * 是否“真的还能滚动”
 */
const canScroll = (el: HTMLElement, axis: "y" | "x"): boolean => {
  if (!isScrollableStyle(el, axis)) return false;

  if (axis === "y") {
    return el.scrollHeight > el.clientHeight + 1;
  }

  return el.scrollWidth > el.clientWidth + 1;
};

/**
 * 从事件起点向上查找：
 * 最近的、并且在当前滚动方向上还能滚动的容器
 */
const findNearestScrollable = (start: HTMLElement, deltaX: number, deltaY: number): HTMLElement => {
  // 滚动方向：1 表示正向，-1 表示反向
  const dirY = deltaY === 0 ? 0 : deltaY > 0 ? 1 : -1;
  const dirX = deltaX === 0 ? 0 : deltaX > 0 ? 1 : -1;

  let el: HTMLElement | null = start;

  while (el && el !== document.body && el !== document.documentElement) {
    // 优先处理纵向滚动
    if (dirY !== 0 && canScroll(el, "y")) {
      const maxTop = el.scrollHeight - el.clientHeight;

      if ((dirY > 0 && el.scrollTop < maxTop) || (dirY < 0 && el.scrollTop > 0)) {
        return el;
      }
    }

    // 横向滚动兜底
    if (dirX !== 0 && canScroll(el, "x")) {
      const maxLeft = el.scrollWidth - el.clientWidth;

      if ((dirX > 0 && el.scrollLeft < maxLeft) || (dirX < 0 && el.scrollLeft > 0)) {
        return el;
      }
    }

    el = el.parentElement;
  }

  // 如果没命中任何局部滚动容器，退回页面滚动
  return document.documentElement;
};

/**
 * 从事件 target 中提取 HTMLElement
 */
const getEventStartEl = (target: EventTarget | null): HTMLElement | null => {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target instanceof Document) return document.documentElement;
  return null;
};

/**
 * 对外暴露的初始化函数
 */
export const installScrollBarRuntime = () => {
  /**
   * scroll 事件（捕获阶段）
   * - 精准命中真正发生滚动的元素
   * - 包含惯性滚动
   */
  window.addEventListener(
    "scroll",
    e => {
      const t = e.target;

      const host =
        t instanceof Document ? document.documentElement : t instanceof HTMLElement ? t : null;

      if (host) markScrolling(host);
    },
    { capture: true, passive: true },
  );

  /**
   * wheel 事件
   * - scroll 之前触发
   * - 用于“滚动刚开始就显示滚动条”
   */
  window.addEventListener(
    "wheel",
    e => {
      const start = getEventStartEl(e.target);
      if (!start) return;

      const host = findNearestScrollable(start, e.deltaX, e.deltaY);

      if (host) markScrolling(host);
    },
    { capture: true, passive: true },
  );

  /**
   * touch 事件（触控板）
   */
  let lastTouch: { x: number; y: number } | null = null;

  window.addEventListener(
    "touchstart",
    e => {
      const t = e.touches[0];
      if (!t) return;

      lastTouch = { x: t.clientX, y: t.clientY };
    },
    { capture: true, passive: true },
  );

  window.addEventListener(
    "touchmove",
    e => {
      const t = e.touches[0];
      if (!t || !lastTouch) return;

      // 手指移动方向 ≠ 实际滚动方向（需要反过来）
      const deltaX = lastTouch.x - t.clientX;
      const deltaY = lastTouch.y - t.clientY;

      lastTouch = { x: t.clientX, y: t.clientY };

      const start = getEventStartEl(e.target);
      if (!start) return;

      const host = findNearestScrollable(start, deltaX, deltaY);

      if (host) markScrolling(host);
    },
    { capture: true, passive: true },
  );
};
