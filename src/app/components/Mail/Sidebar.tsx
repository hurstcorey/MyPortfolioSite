"use client";

import React from "react";
import { InboxIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { Folder } from "./types";

interface SidebarProps {
  folder: Folder;
  onFolderChange: (folder: Folder) => void;
  onCompose: () => void;
  unreadCount: number;
  userEmail: string | null;
  onSignOut: () => void;
}

export default function Sidebar({
  folder,
  onFolderChange,
  onCompose,
  unreadCount,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      active
        ? "bg-primary-500/10 text-primary-400"
        : "text-[#ADB7BE] hover:bg-[#181818] hover:text-white"
    }`;

  return (
    <aside className="w-56 shrink-0 border-r border-[#33353F] flex flex-col p-4 gap-2">
      <button
        onClick={onCompose}
        className="bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg py-2.5 mb-4"
      >
        Compose
      </button>

      <button
        onClick={() => onFolderChange("inbox")}
        className={itemClass(folder === "inbox")}
      >
        <InboxIcon className="h-5 w-5" />
        <span className="flex-1 text-left">Inbox</span>
        {unreadCount > 0 && (
          <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onFolderChange("sent")}
        className={itemClass(folder === "sent")}
      >
        <PaperAirplaneIcon className="h-5 w-5" />
        <span className="flex-1 text-left">Sent</span>
      </button>

      <div className="mt-auto pt-4 border-t border-[#33353F] flex flex-col gap-2">
        {userEmail && (
          <p className="text-xs text-[#ADB7BE] truncate" title={userEmail}>
            {userEmail}
          </p>
        )}
        <button
          onClick={onSignOut}
          className="text-left text-sm text-[#ADB7BE] hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
