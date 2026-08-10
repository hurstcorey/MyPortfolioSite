"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/components/Mail/AuthProvider";

interface MessageRow {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string | null;
  read_status: boolean;
}

export default function MailPage() {
  const { supabase, user, signOut } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("messages")
      .select(
        "id, created_at, direction, from_email, to_email, subject, read_status",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setMessages((data as MessageRow[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <div className="flex items-center gap-4 text-sm text-[#ADB7BE]">
            <span>{user?.email}</span>
            <button
              onClick={signOut}
              className="border border-[#33353F] hover:border-primary-500 rounded-lg px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && <p className="text-red-400 mb-4">{error}</p>}
        {loading && <p className="text-[#ADB7BE]">Loading messages…</p>}
        {!loading && messages.length === 0 && !error && (
          <p className="text-[#ADB7BE]">No messages yet.</p>
        )}

        <ul className="flex flex-col gap-2">
          {messages.map((message) => (
            <li
              key={message.id}
              className="bg-[#181818] border border-[#33353F] rounded-lg p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    message.read_status || message.direction === "outbound"
                      ? "text-[#ADB7BE]"
                      : "text-white font-semibold"
                  }
                >
                  {message.direction === "inbound"
                    ? message.from_email
                    : `To: ${message.to_email}`}
                </span>
                <span className="text-xs text-[#ADB7BE] shrink-0">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {message.subject || "(no subject)"}
              </p>
              <span
                className={`inline-block mt-2 text-xs rounded px-1.5 py-0.5 ${
                  message.direction === "inbound"
                    ? "bg-primary-900 text-primary-300"
                    : "bg-secondary-900 text-secondary-300"
                }`}
              >
                {message.direction}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
