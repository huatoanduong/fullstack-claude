import { create } from 'zustand'
import type { AuthUser } from '@/types'

interface AuthState {
  initialized: boolean
  user: AuthUser | null
  accessToken: string | null
  setInitialized: (initialized: boolean) => void
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  user: null,
  accessToken: null,
  setInitialized: (initialized) => set({ initialized }),
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))
