import React from "react";
import Navbar from "../components/Navigation/Navbar";
import Footer from "../components/Footer";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-[#121212]">
      <Navbar />
      <div className="container mt-24 mx-auto px-12 py-4">
        <h2 className="text-center text-4xl font-bold text-white mt-4 mb-12">
          My Playlists
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#181818] animate-pulse"
              style={{ aspectRatio: "16 / 13" }}
            />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
