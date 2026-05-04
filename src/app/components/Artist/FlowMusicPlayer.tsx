"use client";
import React, { useState } from "react";
import Visualizer from "./Visualizer";

const SONGS = [
  { id: "cf8232d4-266a-4511-bfe2-fd6459bdb1ec", title: "Hold The Space (Focus Mix)" },
  { id: "476f9218-03a7-41c2-980b-8d7fd6c1d9d7", title: "FastLofi" },
  { id: "40548315-18f9-4c83-ba1a-c56169b25ccd", title: "Leave The Heavy Behind (Pop-Remix)" },
];

export default function FlowMusicPlayer() {
  const [selectedId, setSelectedId] = useState(SONGS[0].id);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<"player" | "visualizer">("player");
  const audioUrl = `https://storage.googleapis.com/producer-app-public/clips/${selectedId}.m4a`;

  const handleSync = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <div className="relative w-full flex items-center justify-center bg-black p-4 font-mono text-cyan-400 overflow-hidden rounded-2xl border border-cyan-500/20">
      <style>{`
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }
        @keyframes glitch-skew {
          0% { transform: skew(0deg) }
          10% { transform: skew(3deg); opacity: 0.8; }
          20% { transform: skew(-3deg); opacity: 1; }
          30% { transform: skew(1deg) }
          100% { transform: skew(0deg) }
        }
        @keyframes view-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes view-zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-glitch {
          animation: glitch 0.3s cubic-bezier(.25,.46,.45,.94) both infinite;
        }
        .view-player-enter {
          animation: view-fade-in 500ms ease-out both;
        }
        .view-visualizer-enter {
          animation: view-zoom-in 500ms ease-out both;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #ff00c1;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-skew 2s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 #00fff9, 2px 2px #ff00c1;
          animation: glitch-skew 3s infinite linear alternate-reverse;
          clip: rect(10px, 450px, 30px, 0);
        }
      `}</style>

      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative w-full max-w-lg group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 rounded-2xl blur opacity-20" />

        <div className="relative flex flex-col items-center bg-zinc-950 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(6,182,212,0.4)] backdrop-blur-xl overflow-hidden">

          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

          <div className="w-full mb-8 relative flex justify-between items-end">
            <h1
              className="glitch-text text-3xl font-black italic tracking-tighter uppercase text-white"
              data-text="NEURAL LINK"
            >
              Neural Link
            </h1>
            <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/50 px-2 py-0.5 rounded animate-pulse text-cyan-300">
              LOCKED // 0xFA42
            </span>
          </div>

          <div className="w-full space-y-6 relative z-10">
            {/* Unified Audio Controller — always mounted so playback survives view toggles */}
            <div className="w-full p-4 bg-black/60 border border-white/10 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center px-1">
                <div className="text-[10px] uppercase tracking-widest opacity-80 text-cyan-200">
                  System Audio Feed
                </div>
                <div className="text-[10px] tabular-nums text-fuchsia-300 italic">
                  ID_{selectedId.slice(0, 8)}
                </div>
              </div>
              <audio
                key={selectedId}
                controls
                className="w-full h-10 [filter:invert(1)_hue-rotate(180deg)_brightness(1.5)_contrast(1.2)]"
                crossOrigin="anonymous"
              >
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            </div>

            {/* Viewport Area */}
            <div className="min-h-[300px]">
              {viewMode === "player" ? (
                <div key="player" className="space-y-6 view-player-enter">
                  <div className="flex flex-col space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-300 flex items-center">
                      <span className="w-1 h-1 bg-cyan-400 mr-2 animate-ping" />
                      Select Data Stream
                    </label>
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      aria-label="Select track"
                      className="w-full bg-black border border-cyan-500/30 rounded px-4 py-4 text-sm focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer hover:bg-zinc-900 transition-all"
                    >
                      {SONGS.map((song) => (
                        <option key={song.id} value={song.id} className="bg-zinc-900">
                          {song.title.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                    <div className="text-xs text-white/40 uppercase tracking-[0.5em]">
                      Standard Interface Active
                    </div>
                  </div>
                </div>
              ) : (
                <div key="visualizer" className="view-visualizer-enter">
                  <Visualizer />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setViewMode(viewMode === "player" ? "visualizer" : "player")}
              className="group/btn relative px-6 py-2 border border-fuchsia-500/50 rounded-sm overflow-hidden transition-all hover:bg-fuchsia-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
            >
              <span className="relative z-10 text-[10px] font-black tracking-[0.3em] uppercase text-fuchsia-400">
                {viewMode === "player" ? "OPEN_3D_SCAPE" : "CLOSE_3D_SCAPE"}
              </span>
            </button>

            <button
              onClick={handleSync}
              className={`group/btn relative px-6 py-2 border border-fuchsia-500/50 rounded-sm overflow-hidden transition-all hover:bg-fuchsia-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)] ${
                isScanning ? "animate-glitch" : ""
              }`}
            >
              <span
                className={`relative z-10 text-[10px] font-black tracking-[0.3em] uppercase ${
                  isScanning ? "text-white" : "text-fuchsia-400"
                }`}
              >
                {isScanning ? "SCANNING..." : "SYNC_NEURAL_DATA"}
              </span>
              {isScanning && <div className="absolute inset-0 bg-fuchsia-500/20 animate-pulse" />}
            </button>
          </div>

          <div className="mt-6 text-[9px] opacity-80 uppercase tracking-[0.4em] text-fuchsia-400 font-black">
            DATA_LINK_SYNCHRONIZED_BY_PRODUCER_AI
          </div>
        </div>
      </div>
    </div>
  );
}
