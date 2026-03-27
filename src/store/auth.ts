import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MockAuthSession } from "@/feature/auth/types";

interface AuthState {
  session: MockAuthSession | null;
  setSession: (session: MockAuthSession | null) => void;
  clearSession: () => void;
}

/**
 * 模拟登录状态仓库。
 */
export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      session: null,
      setSession: session => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "frontis-mock-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        session: state.session,
      }),
    },
  ),
);
