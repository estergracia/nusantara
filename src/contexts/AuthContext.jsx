// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "../firebase/firebase.js";
import { supabase } from "../lib/supabase.js";
import Telemetry from "../utils/telemetry.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // =========================
  // AUTH STATE LISTENER (INI YANG HILANG)
  // =========================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      setAuthLoading(false); // 🔥 WAJIB

      // 🔐 SYNC FIREBASE → SUPABASE (INI KUNCINYA)
      if (user) {
        const token = await user.getIdToken(true);
        await supabase.auth.signInWithIdToken({
          provider: "firebase",
          token
        });
      } else {
        await supabase.auth.signOut();
      }
    });

    return () => unsub();
  }, []);

  // =========================
  // AUTH ACTIONS
  // =========================
  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    try {
      await Telemetry.endSession({ reason: "logout" });
    } catch {}
    return signOut(auth);
  };

  const value = useMemo(
    () => ({
      currentUser,
      authLoading,
      isAuthed: !!currentUser,
      login,
      register,
      logout
    }),
    [currentUser, authLoading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
