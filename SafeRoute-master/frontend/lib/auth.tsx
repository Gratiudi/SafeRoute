import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "@/lib/api";
import { onAuthExpired } from "@/lib/authEvents";
import { clearToken, getToken, setToken } from "@/lib/authStorage";

type AuthUser = {
  user_id: string;
  full_name?: string;
  email: string;
};

type AuthState = {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
    phoneNumber?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const stored = await getToken();
      if (stored) {
        setTokenState(stored);
        try {
          const profile = await apiFetch("/api/profile", {
            headers: { Authorization: `Bearer ${stored}` },
          });
          setUser({
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
          });
        } catch {
          // token is expired or invalid, clear it
          await clearToken();
          setTokenState(null);
        }
      }

      setLoading(false);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    return onAuthExpired(() => {
      void clearToken().then(() => {
        setTokenState(null);
        setUser(null);
      });
    });
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      loading,
      token,
      user,
      signIn: async (email: string, password: string) => {
        const result = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        await setToken(result.token);
        setTokenState(result.token);
        setUser(result.user);
      },
      signUp: async (
        fullName: string,
        email: string,
        password: string,
        phoneNumber?: string,
      ) => {
        await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone_number: phoneNumber,
            password,
          }),
        });

        // After register, immediately login for convenience.
        const result = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        await setToken(result.token);
        setTokenState(result.token);
        setUser(result.user);
      },
      signOut: async () => {
        await clearToken();
        setTokenState(null);
        setUser(null);
      },
    };
  }, [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
