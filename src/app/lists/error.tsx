"use client";
import React from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#121212] px-6 text-center">
      <h2 className="text-3xl font-bold text-white mb-4">
        Playlists are temporarily unavailable
      </h2>
      <p className="text-[#ADB7BE] mb-6 max-w-md">
        I couldn&apos;t reach YouTube and there&apos;s no local snapshot to show.
        Please try again in a few minutes.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          Try again
        </button>
        <Link
          href="/"
          className="bg-[#33353F] hover:bg-[#444] text-white px-4 py-2 rounded-lg font-medium"
        >
          Back to home
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-8 text-xs text-[#666] max-w-xl overflow-auto">
          {error.message}
        </pre>
      )}
    </main>
  );
}
