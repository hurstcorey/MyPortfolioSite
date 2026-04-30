"use client";
import React, { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface PlaylistSearchBarProps {
  value: string;
  onChange: (next: string) => void;
  debounceMs?: number;
}

const PlaylistSearchBar: React.FC<PlaylistSearchBarProps> = ({
  value,
  onChange,
  debounceMs = 150,
}) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [local, value, debounceMs, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative max-w-md w-full">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ADB7BE] pointer-events-none" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search playlists…"
        className="w-full bg-[#181818] border border-[#33353F] rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        aria-label="Search playlists"
      />
    </div>
  );
};

export default PlaylistSearchBar;
