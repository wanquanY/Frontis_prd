import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from "react";

import {
  ARTIFACTS_PANEL_DEFAULT_WIDTH,
  ARTIFACTS_PANEL_MAX_WIDTH,
  ARTIFACTS_PANEL_MIN_WIDTH,
  ARTIFACTS_PANEL_PREVIEW_WIDTH,
  buildArtifactsPanelOpenStorageKey,
  buildArtifactsPanelWidthStorageKey,
} from "@/feature/synclaw/utils/pageHelpers";

interface UseSynClawArtifactsPanelStateParams {
  activeChannelId?: string;
}

interface UseSynClawArtifactsPanelStateResult {
  isArtifactsPanelOpen: boolean;
  isArtifactsPreviewing: boolean;
  resolvedArtifactsPanelWidth: number;
  artifactsColumnRef: MutableRefObject<HTMLElement | null>;
  handleOpenArtifactsPanel: () => void;
  handleCloseArtifactsPanel: () => void;
  handleArtifactsResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handleArtifactsPreviewStateChange: (previewing: boolean) => void;
}

/**
 * 管理 SynClaw 成果面板的展示、宽度拖拽和本地持久化状态。
 */
export const useSynClawArtifactsPanelState = ({
  activeChannelId,
}: UseSynClawArtifactsPanelStateParams): UseSynClawArtifactsPanelStateResult => {
  const [isArtifactsPanelOpen, setIsArtifactsPanelOpen] = useState(false);
  const [isArtifactsPreviewing, setIsArtifactsPreviewing] = useState(false);
  const [artifactsListWidth, setArtifactsListWidth] = useState(ARTIFACTS_PANEL_DEFAULT_WIDTH);

  const artifactsColumnRef = useRef<HTMLElement | null>(null);
  const artifactsResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const artifactsPendingWidthRef = useRef<number>(ARTIFACTS_PANEL_DEFAULT_WIDTH);

  const clampArtifactsPanelWidth = useCallback((width: number): number => {
    if (!Number.isFinite(width)) return ARTIFACTS_PANEL_DEFAULT_WIDTH;
    const viewportLimitedMax =
      typeof window === "undefined"
        ? ARTIFACTS_PANEL_MAX_WIDTH
        : Math.min(
            ARTIFACTS_PANEL_MAX_WIDTH,
            Math.max(ARTIFACTS_PANEL_MIN_WIDTH, window.innerWidth - 420),
          );
    return Math.min(viewportLimitedMax, Math.max(ARTIFACTS_PANEL_MIN_WIDTH, width));
  }, []);

  const resolvedArtifactsListWidth = useMemo(
    () => clampArtifactsPanelWidth(artifactsListWidth),
    [artifactsListWidth, clampArtifactsPanelWidth],
  );

  const resolvedArtifactsPanelWidth = useMemo(() => {
    if (!isArtifactsPreviewing) return resolvedArtifactsListWidth;
    return clampArtifactsPanelWidth(
      Math.max(resolvedArtifactsListWidth, ARTIFACTS_PANEL_PREVIEW_WIDTH),
    );
  }, [clampArtifactsPanelWidth, isArtifactsPreviewing, resolvedArtifactsListWidth]);

  const handleOpenArtifactsPanel = useCallback(() => {
    setIsArtifactsPanelOpen(true);
  }, []);

  const handleCloseArtifactsPanel = useCallback(() => {
    setIsArtifactsPreviewing(false);
    setIsArtifactsPanelOpen(false);
  }, []);

  const handleArtifactsResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      if (!isArtifactsPanelOpen || isArtifactsPreviewing) return;
      event.preventDefault();
      artifactsResizeStateRef.current = {
        startX: event.clientX,
        startWidth: resolvedArtifactsListWidth,
      };
      artifactsPendingWidthRef.current = resolvedArtifactsListWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [isArtifactsPanelOpen, isArtifactsPreviewing, resolvedArtifactsListWidth],
  );

  const handleArtifactsPreviewStateChange = useCallback((previewing: boolean): void => {
    setIsArtifactsPreviewing(previewing);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const current = artifactsResizeStateRef.current;
      if (!current) return;
      const deltaX = current.startX - event.clientX;
      const nextWidth = clampArtifactsPanelWidth(current.startWidth + deltaX);
      artifactsPendingWidthRef.current = nextWidth;
      if (artifactsColumnRef.current) {
        artifactsColumnRef.current.style.width = `${nextWidth}px`;
        artifactsColumnRef.current.style.minWidth = `${nextWidth}px`;
      }
    };

    const handlePointerUp = () => {
      if (!artifactsResizeStateRef.current) return;
      setArtifactsListWidth(artifactsPendingWidthRef.current);
      artifactsResizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [clampArtifactsPanelWidth]);

  useEffect(() => {
    if (!activeChannelId) {
      setIsArtifactsPreviewing(false);
      setIsArtifactsPanelOpen(false);
      setArtifactsListWidth(ARTIFACTS_PANEL_DEFAULT_WIDTH);
      artifactsPendingWidthRef.current = ARTIFACTS_PANEL_DEFAULT_WIDTH;
      return;
    }

    if (typeof window === "undefined") return;
    const savedOpen = window.localStorage.getItem(
      buildArtifactsPanelOpenStorageKey(activeChannelId),
    );
    const savedWidth = window.localStorage.getItem(
      buildArtifactsPanelWidthStorageKey(activeChannelId),
    );
    const nextWidth = clampArtifactsPanelWidth(
      savedWidth ? Number.parseFloat(savedWidth) : ARTIFACTS_PANEL_DEFAULT_WIDTH,
    );
    const nextOpen = savedOpen === "1";

    setIsArtifactsPreviewing(false);
    setIsArtifactsPanelOpen(nextOpen);
    setArtifactsListWidth(nextWidth);
    artifactsPendingWidthRef.current = nextWidth;
  }, [activeChannelId, clampArtifactsPanelWidth]);

  useEffect(() => {
    if (!activeChannelId || typeof window === "undefined") return;
    window.localStorage.setItem(
      buildArtifactsPanelOpenStorageKey(activeChannelId),
      isArtifactsPanelOpen ? "1" : "0",
    );
  }, [activeChannelId, isArtifactsPanelOpen]);

  useEffect(() => {
    if (!activeChannelId || typeof window === "undefined") return;
    window.localStorage.setItem(
      buildArtifactsPanelWidthStorageKey(activeChannelId),
      String(resolvedArtifactsListWidth),
    );
  }, [activeChannelId, resolvedArtifactsListWidth]);

  useEffect(() => {
    const target = artifactsColumnRef.current;
    if (!target) return;
    if (!isArtifactsPanelOpen) {
      target.style.width = "0px";
      target.style.minWidth = "0px";
      return;
    }
    target.style.width = `${resolvedArtifactsPanelWidth}px`;
    target.style.minWidth = `${resolvedArtifactsPanelWidth}px`;
  }, [isArtifactsPanelOpen, resolvedArtifactsPanelWidth]);

  return {
    isArtifactsPanelOpen,
    isArtifactsPreviewing,
    resolvedArtifactsPanelWidth,
    artifactsColumnRef,
    handleOpenArtifactsPanel,
    handleCloseArtifactsPanel,
    handleArtifactsResizeStart,
    handleArtifactsPreviewStateChange,
  };
};
