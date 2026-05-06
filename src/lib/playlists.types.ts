import type { Playlist as YouTubePlaylist } from "./youtube.types";
import type { SpotifyPlaylist } from "./spotify.types";

export type Playlist = YouTubePlaylist | SpotifyPlaylist;
export type PlaylistSource = Playlist["source"];
