"use client";

import React, { FormEvent, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!supabase) {
    return (
      <p className="text-center text-[#ADB7BE]">
        Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </p>
    );
  }

  const handlePasswordSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    setPending(false);
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email first, then request a magic link.");
      return;
    }
    setPending(true);
    setError(null);
    setNotice(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Single-user app: never create accounts from the login screen.
        shouldCreateUser: false,
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
    if (otpError) {
      setError(otpError.message);
    } else {
      setNotice("Magic link sent — check your inbox.");
    }
    setPending(false);
  };

  return (
    <form
      onSubmit={handlePasswordSignIn}
      className="w-full max-w-sm flex flex-col gap-4"
    >
      <h1 className="text-2xl font-bold text-white text-center">Sign in</h1>
      <label className="flex flex-col gap-1 text-sm text-[#ADB7BE]">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="bg-[#18191E] border border-[#33353F] text-white rounded-lg p-2.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[#ADB7BE]">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="bg-[#18191E] border border-[#33353F] text-white rounded-lg p-2.5"
        />
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {notice && <p className="text-primary-400 text-sm">{notice}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5"
      >
        {pending ? "Working..." : "Sign in with password"}
      </button>
      <button
        type="button"
        onClick={handleMagicLink}
        disabled={pending}
        className="border border-primary-500 text-primary-400 hover:bg-[#18191E] disabled:opacity-50 font-medium rounded-lg py-2.5"
      >
        Email me a magic link
      </button>
    </form>
  );
}
