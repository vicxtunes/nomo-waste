"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type SeededUser = Database["public"]["Tables"]["users"]["Row"];

interface ActingUserContextValue {
  users: SeededUser[];
  actingUser: SeededUser | null;
  setActingUserId: (id: string) => void;
  loading: boolean;
}

const STORAGE_KEY = "nomo-waste.acting-user-id";

const ActingUserContext = createContext<ActingUserContextValue | undefined>(
  undefined,
);

export function ActingUserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<SeededUser[]>([]);
  const [actingUserId, setActingUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("role", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load seeded users", error);
        setLoading(false);
        return;
      }
      setUsers(data ?? []);
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      const initial =
        (stored && data?.some((u) => u.id === stored) && stored) ||
        data?.find((u) => u.role === "household")?.id ||
        data?.[0]?.id ||
        null;
      setActingUserIdState(initial);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActingUserId = useCallback((id: string) => {
    setActingUserIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore private-mode / disabled storage */
    }
  }, []);

  const value = useMemo<ActingUserContextValue>(
    () => ({
      users,
      actingUser: users.find((u) => u.id === actingUserId) ?? null,
      setActingUserId,
      loading,
    }),
    [users, actingUserId, setActingUserId, loading],
  );

  return (
    <ActingUserContext.Provider value={value}>
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser(): ActingUserContextValue {
  const ctx = useContext(ActingUserContext);
  if (!ctx) {
    throw new Error("useActingUser must be used within ActingUserProvider");
  }
  return ctx;
}
