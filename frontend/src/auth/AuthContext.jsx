
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiRequest } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiRequest("/auth/me");

      if (!result.success || !result.data) {
        setUser(null);
        return null;
      }

      setUser(result.data);
      return result.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  async function login(email, password) {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!result.success || !result.data) {
      throw new Error("Login response did not contain user details.");
    }

    setUser(result.data);
    return result.data;
  }

  async function logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
