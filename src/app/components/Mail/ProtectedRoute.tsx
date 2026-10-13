"use client";

import React, { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import LoginForm from "./LoginForm";

// Gate: children render only for a signed-in user; everyone else sees the
// login screen. Wrap an entire layout in this to protect a whole app section.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <p className="text-[#ADB7BE]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] px-4">
        <LoginForm />
      </div>
    );
  }

  return <>{children}</>;
}
