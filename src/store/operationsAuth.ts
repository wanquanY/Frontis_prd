import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { OperationsSession } from "@/feature/operations/types";

interface OperationsAuthState {
  session: OperationsSession | null;
  setSession: (session: OperationsSession | null) => void;
  clearSession: () => void;
}

/**
 * 运营后台模拟登录状态仓库。
 */
export const useOperationsAuthStore = create<OperationsAuthState>()(
  persist(
    set => ({
      session: null,
      setSession: session => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "frontis-operations-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        session: state.session,
      }),
    },
  ),
);

