import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase/client';

export type Role = 'admin' | 'guru' | 'murid';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'ahe-auth-storage',
    }
  )
);
