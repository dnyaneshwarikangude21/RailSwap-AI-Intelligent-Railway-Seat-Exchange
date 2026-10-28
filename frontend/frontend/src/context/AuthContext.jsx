import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authApi, clearToken, getToken, setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    authApi
      .me()
      .then((payload) => {
        if (active) setUser(payload.user);
      })
      .catch(() => {
        if (active) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener("railswap:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("railswap:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const payload = await authApi.login({ email, password });
    setToken(payload.access_token);
    setUser(payload.user);
    return payload.user;
  }, []);

  const register = useCallback(async (values) => {
    const payload = await authApi.register(values);
    setToken(payload.access_token);
    setUser(payload.user);
    return payload.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (values) => {
    const payload = await authApi.updateMe(values);
    setUser(payload.user);
    return payload.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const payload = await authApi.me();
    setUser(payload.user);
    return payload.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
