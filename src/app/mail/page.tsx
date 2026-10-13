"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/app/components/Mail/AuthProvider";
import useMessages from "@/app/components/Mail/useMessages";
import Sidebar from "@/app/components/Mail/Sidebar";
import MessageList from "@/app/components/Mail/MessageList";
import MessageView from "@/app/components/Mail/MessageView";
import ComposeModal from "@/app/components/Mail/ComposeModal";
import type { Folder, Message } from "@/app/components/Mail/types";

export default function MailPage() {
  const { user, signOut } = useAuth();
  const inbox = useMessages("inbound");
  const sent = useMessages("outbound");

  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const active = folder === "inbox" ? inbox : sent;
  const selected = useMemo(
    () => active.messages.find((m) => m.id === selectedId) ?? null,
    [active.messages, selectedId],
  );
  const unreadCount = inbox.messages.filter((m) => !m.read_status).length;

  const handleFolderChange = (next: Folder) => {
    setFolder(next);
    setSelectedId(null);
  };

  const handleSelect = (message: Message) => {
    setSelectedId(message.id);
    if (message.direction === "inbound" && !message.read_status) {
      inbox.markAsRead(message.id);
    }
  };

  return (
    <main className="h-screen flex bg-[#121212] text-white">
      <Sidebar
        folder={folder}
        onFolderChange={handleFolderChange}
        onCompose={() => setComposeOpen(true)}
        unreadCount={unreadCount}
        userEmail={user?.email ?? null}
        onSignOut={signOut}
      />

      <section className="w-80 shrink-0 border-r border-[#33353F] flex flex-col">
        <h1 className="px-4 py-4 text-lg font-semibold border-b border-[#33353F]">
          {folder === "inbox" ? "Inbox" : "Sent"}
        </h1>
        <MessageList
          messages={active.messages}
          loading={active.loading}
          error={active.error}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </section>

      <MessageView message={selected} />

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </main>
  );
}
