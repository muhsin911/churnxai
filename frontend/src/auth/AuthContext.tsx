import axios from 'axios';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../services/api';
import type { AuthUser } from '../types';
import { AuthContext, type AuthContextValue } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) {
          console.error('Unable to restore the ChurnXAI login session.', error);
        }
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    async signIn(username, password) {
      const authenticatedUser = await loginRequest(username, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    async signOut() {
      await logoutRequest();
      setUser(null);
    },
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
