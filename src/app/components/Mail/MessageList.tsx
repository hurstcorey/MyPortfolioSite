"use client";

import React from "react";
import type { Message } from "./types";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (message: Message) => void;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessageList({
  messages,
  loading,
  error,
  selectedId,
  onSelect,
}: MessageListProps) {
  if (loading) {
    return <p className="p-4 text-sm text-[#ADB7BE]">Loading…</p>;
  }
  if (error) {
    return <p className="p-4 text-sm text-red-400">{error}</p>;
  }
  if (messages.length === 0) {
    return <p className="p-4 text-sm text-[#ADB7BE]">No messages.</p>;
  }

  return (
    <ul className="overflow-y-auto divide-y divide-[#33353F]">
      {messages.map((message) => {
        const unread =
          message.direction === "inbound" && !message.read_status;
        return (
          <li key={message.id}>
            <button
              onClick={() => onSelect(message)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                message.id === selectedId
                  ? "bg-primary-500/10"
                  : "hover:bg-[#181818]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate text-sm ${
                    unread ? "text-white font-semibold" : "text-[#ADB7BE]"
                  }`}
                >
                  {message.direction === "inbound"
                    ? message.from_email
                    : message.to_email}
                </span>
                <span className="text-xs text-[#ADB7BE] shrink-0">
                  {formatTimestamp(message.created_at)}
                </span>
              </div>
              <p
                className={`truncate text-sm mt-0.5 ${
                  unread ? "text-white" : "text-[#ADB7BE]"
                }`}
              >
                {message.subject || "(no subject)"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
