"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import type { Message } from "./types";

// Fetches messages for one direction (newest first) and keeps the list live
// via a Realtime subscription: rows inserted by the receive-email/send-email
// Edge Functions appear instantly, and updates (e.g. read status) sync in.
export default function useMessages(direction: "inbound" | "outbound") {
  const { supabase } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from("messages")
      .select("*")
      .eq("direction", direction)
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
        } else {
          setError(null);
          setMessages((data as Message[]) ?? []);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`messages-${direction}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `direction=eq.${direction}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [row, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `direction=eq.${direction}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === row.id ? row : m)),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, direction]);

  // Optimistic local update plus DB write, so read state is correct even if
  // Realtime is unavailable.
  const markAsRead = useCallback(
    async (id: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_status: true } : m)),
      );
      await supabase
        ?.from("messages")
        .update({ read_status: true })
        .eq("id", id);
    },
    [supabase],
  );

  return { messages, loading, error, markAsRead };
}
