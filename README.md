# Portfolio Website

A personal portfolio built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. Showcases projects, a YouTube playlist browser, and contact functionality.

Short credits: this project was initially developed following a community tutorial — please support the original creator if you found it useful.

## Features

- **Projects** — filterable project cards with live preview and GitHub links
- **My Playlists** — horizontal-scroll carousel on the home page; full browsable grid at `/lists` with search, inline video player, and deep-link navigation
- **Contact** — email form powered by Resend (optional)
- **Responsive** — mobile-first layout with Framer Motion animations

## Quick start

1. Clone the repository and install dependencies (pnpm required):

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Required | Purpose |
   |---|---|---|
   | `YOUTUBE_API_KEY` | For live data | YouTube Data API v3 key (server-only) |
   | `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` | Yes | Your YouTube channel ID |
   | `RESEND_API_KEY` | For contact form | Resend email API key |
   | `FROM_EMAIL` | For contact form | Sender address for contact emails |

   If `YOUTUBE_API_KEY` is not set, the site falls back to the bundled snapshot at `data/playlists-snapshot.json`.

3. Run the development server:

   ```bash
   pnpm run dev
   ```

   Open http://localhost:3000.

## Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Start dev server at http://localhost:3000 |
| `pnpm run build` | Production build |
| `pnpm start` | Start production server |
| `pnpm run lint` | Run ESLint |
| `pnpm run test` | Run Vitest test suite |
| `pnpm run snapshot:youtube` | Refresh `data/playlists-snapshot.json` from the YouTube API |
| `pnpm run docker:local` | Build and run the production Docker image locally on port 3000 |

## YouTube playlist data

The `/lists` page and home-page carousel are powered by the YouTube Data API v3. At build time (and on each ISR revalidation) the server fetches your channel's playlists. If the API key is absent or the request fails, it falls back to `data/playlists-snapshot.json`.

To refresh the snapshot manually:

```bash
# Requires YOUTUBE_API_KEY and NEXT_PUBLIC_YOUTUBE_CHANNEL_ID in .env.local
pnpm run snapshot:youtube
```

Commit the updated `data/playlists-snapshot.json` to keep the fallback current.

## Local Docker preview

To test the production build locally (mirrors the deployed environment):

```bash
pnpm run docker:local
```

This builds the Alpine-based Docker image and runs it on http://localhost:3000. Requires `.env.local` to be present. `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` is baked in at build time; all other secrets are injected at runtime.

## Dependencies (high level)

- Next.js 14
- React 18
- Tailwind CSS
- TypeScript
- Framer Motion
- Resend (optional — email API)
- Heroicons

## License

MIT — see LICENSE for details.
