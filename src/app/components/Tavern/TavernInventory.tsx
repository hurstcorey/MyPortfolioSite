"use client";
import React, { useState } from "react";
import TavernCard from "./TavernCard";
import { GAME_LABELS } from "@/lib/tavern";
import type { TavernGame, TavernItem } from "@/lib/tavern.types";

type Filter = "all" | TavernGame;

// Enough for two full rows on the widest grid before "Show all".
const INITIAL_COUNT = 12;

const TavernInventory = ({ items }: { items: TavernItem[] }) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);

  const games = (Object.keys(GAME_LABELS) as TavernGame[]).filter((game) =>
    items.some((item) => item.game === game),
  );
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...games.map((game) => ({ value: game, label: GAME_LABELS[game] })),
  ];

  const filtered =
    filter === "all" ? items : items.filter((item) => item.game === filter);
  const visible = expanded ? filtered : filtered.slice(0, INITIAL_COUNT);

  return (
    <div>
      {games.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`${
                filter === value
                  ? "text-white border-primary-500"
                  : "text-[#ADB7BE] border-slate-600 hover:border-white"
              } rounded-full border-2 px-4 py-2 text-sm md:text-base cursor-pointer`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
        {visible.map((item) => (
          <li key={item.key}>
            <TavernCard item={item} />
          </li>
        ))}
      </ul>

      {filtered.length > INITIAL_COUNT && (
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-full border-2 border-slate-600 px-6 py-2 text-white hover:border-white cursor-pointer"
          >
            {expanded ? "Show fewer" : `Show all ${filtered.length} cards`}
          </button>
        </div>
      )}
    </div>
  );
};

export default TavernInventory;
