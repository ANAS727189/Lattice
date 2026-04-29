"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthState = {
  token: string;
  setToken: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: "",
      setToken: (token: string) => set({ token }),
      logout: () => set({ token: "" }),
    }),
    {
      name: "lattice_auth",
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ token: state.token }),
      version: 1,
    },
  ),
);
