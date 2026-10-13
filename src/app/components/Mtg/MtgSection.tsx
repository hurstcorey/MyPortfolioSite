import React from "react";
import { fetchFolderDecksWithFallback, folderUrl } from "@/lib/archidekt";
import DeckCard from "./DeckCard";
import type { MtgDeck } from "@/lib/archidekt.types";

const MtgSection = async () => {
  let decks: MtgDeck[] = [];
  try {
    decks = await fetchFolderDecksWithFallback();
  } catch {
    return null;
  }

  if (decks.length === 0) return null;

  return (
    <section id="gamer" className="my-12">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-2">
        My Commander Decks
      </h2>
      <p className="text-center text-[#ADB7BE] mb-8 md:mb-12">
        {decks.length} Magic: The Gathering decks I brew and play. Click any commander to open the list on Archidekt.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {decks.map((deck) => (
          <DeckCard key={deck.id} deck={deck} />
        ))}
      </div>

      <div className="text-center mt-8">
        <a
          href={folderUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary-500 hover:underline font-semibold"
        >
          View the full folder on Archidekt →
        </a>
      </div>
    </section>
  );
};

export default MtgSection;
