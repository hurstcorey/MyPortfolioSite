import type { Playlist as YouTubePlaylist } from "./youtube.types";
import type { SpotifyPlaylist } from "./spotify.types";

/** An Archidekt Commander deck, shaped like a playlist so it can share the /lists grid. */
export interface MtgListItem {
  source: "mtg";
  /** Prefixed (`mtg-<archidekt id>`) so it can't collide with YouTube/Spotify ids in URL hashes. */
  id: string;
  title: string;
  description: string;
  /** Landscape art crop, so it fits the same aspect-video card as the other sources. */
  thumbnailUrl: string;
  /** Number of cards in the deck. */
  cardCount: number;
  /** Public deck page on Archidekt. */
  publicUrl: string;
  /** Last time the deck was edited on Archidekt. */
  publishedAt: string;
}

export type Playlist = YouTubePlaylist | SpotifyPlaylist | MtgListItem;
export type PlaylistSource = Playlist["source"];

/** Sources that expand inline into a player; MTG decks link out to Archidekt instead. */
export type ExpandablePlaylist = Exclude<Playlist, MtgListItem>;
