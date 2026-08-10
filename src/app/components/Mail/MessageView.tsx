"use client";

import React from "react";
import type { Message } from "./types";

// HTML bodies render in a sandboxed iframe (no scripts, no same-origin
// access) since email HTML is untrusted content.
export default function MessageView({ message }: { message: Message | null }) {
  if (!message) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#ADB7BE]">
        Select a message to read it.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-[#33353F] px-6 py-4">
        <h2 className="text-lg font-semibold text-white">
          {message.subject || "(no subject)"}
        </h2>
        <p className="text-sm text-[#ADB7BE] mt-1">
          {message.direction === "inbound" ? "From" : "To"}:{" "}
          {message.direction === "inbound"
            ? message.from_email
            : message.to_email}
          <span className="mx-2">·</span>
          {new Date(message.created_at).toLocaleString()}
        </p>
      </header>
      <div className="flex-1 p-6 min-h-0">
        {message.html_body ? (
          <iframe
            sandbox=""
            srcDoc={message.html_body}
            title={message.subject || "Email content"}
            className="w-full h-full bg-white rounded-lg"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-[#E5E7EB]">
            {message.text_body || "(empty message)"}
          </pre>
        )}
      </div>
    </div>
  );
}
