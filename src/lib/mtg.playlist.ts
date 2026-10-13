import type { MtgDeck } from "./archidekt.types";
import type { MtgListItem } from "./playlists.types";

/** Adapts an Archidekt deck to the shape the /lists grid renders. */
export function toMtgListItem(deck: MtgDeck): MtgListItem {
  return {
    source: "mtg",
    id: `mtg-${deck.id}`,
    title: deck.name,
    description: "",
    thumbnailUrl: deck.artCropUrl || deck.cardImageUrl,
    cardCount: deck.size,
    publicUrl: deck.deckUrl,
    publishedAt: deck.updatedAt,
  };
}
