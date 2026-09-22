"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { UserPublic } from "./types";

const TOKEN_STORAGE_KEY = "mytabletop_token";

interface AuthContextValue {
  token: string | null;
  user: UserPublic | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(() => token !== null);

  const loadUser = async (tok: string) => {
    const me = await api.get<UserPublic>("/users/me", tok);
    setUser(me);
  };

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    api.get<UserPublic>("/users/me", token).then(
      (me) => {
        if (!ignore) {
          setUser(me);
          setLoading(false);
        }
      },
      () => {
        if (!ignore) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setLoading(false);
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [token]);

  const applyToken = async (newToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    await loadUser(newToken);
  };

  const login = async (usernameOrEmail: string, password: string) => {
    const { access_token } = await api.post<{ access_token: string }>("/auth/login", {
      username_or_email: usernameOrEmail,
      password,
    });
    await applyToken(access_token);
  };

  const register = async (username: string, email: string, password: string) => {
    const { access_token } = await api.post<{ access_token: string }>("/auth/register", {
      username,
      email,
      password,
    });
    await applyToken(access_token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) await loadUser(token);
  };

  return (
    <AuthContext.Provider
      value={{ token, user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
