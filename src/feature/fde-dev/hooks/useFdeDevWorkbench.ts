import { useMemo } from "react";

import { useFdeWorkbench } from "@/feature/fde/hooks/useFdeWorkbench";
import type { UseFdeWorkbenchResult } from "@/feature/fde/types";
import { FDE_DEVELOPMENT_TAB_KEYS } from "@/feature/fde/utils";

/**
 * FDE 开发管理工作台数据。
 * 基于现有 FDE 工作台状态收口出开发管理所需的导航与成员信息。
 */
export const useFdeDevWorkbench = (currentUserId?: string): UseFdeWorkbenchResult => {
  const workbench = useFdeWorkbench(currentUserId);
  const developmentTabKeys = useMemo(
    () => new Set(FDE_DEVELOPMENT_TAB_KEYS),
    [],
  );

  return useMemo<UseFdeWorkbenchResult>(
    () => ({
      ...workbench,
      tabs: workbench.tabs.filter(item => developmentTabKeys.has(item.key)),
      navGroups: workbench.navGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => developmentTabKeys.has(item.key)),
          subGroups: group.subGroups
            ?.map(sub => ({
              ...sub,
              items: sub.items.filter(item => developmentTabKeys.has(item.key)),
            }))
            .filter(sub => sub.items.length),
        }))
        .filter(group => group.items.length || group.subGroups?.length),
    }),
    [developmentTabKeys, workbench],
  );
};
