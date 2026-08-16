"use client";

import React, { FormEvent, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "./AuthProvider";

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ComposeModal({ open, onClose }: ComposeModalProps) {
  const { supabase } = useAuth();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSending(true);
    setError(null);

    // The Edge Function sends via Resend and records the outbound row; the
    // Sent folder picks it up through the Realtime subscription.
    const { data, error: invokeError } = await supabase.functions.invoke(
      "send-email",
      { body: { to, subject, text: body } },
    );

    if (invokeError) {
      setError(invokeError.message || "Failed to send email.");
      setSending(false);
      return;
    }
    if (data?.stored === false) {
      setError(
        "The email was sent, but recording it in the database failed.",
      );
      setSending(false);
      return;
    }

    setTo("");
    setSubject("");
    setBody("");
    setSending(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#181818] border border-[#33353F] rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-[#33353F]">
          <h2 className="text-white font-semibold">New message</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#ADB7BE] hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSend} className="p-5 flex flex-col gap-3">
          <input
            type="email"
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            className="bg-[#121212] border border-[#33353F] text-white text-sm rounded-lg p-2.5"
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="bg-[#121212] border border-[#33353F] text-white text-sm rounded-lg p-2.5"
          />
          <textarea
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            className="bg-[#121212] border border-[#33353F] text-white text-sm rounded-lg p-2.5 resize-y"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#ADB7BE] hover:text-white px-4 py-2"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={sending}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
