# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. Features project showcase, contact form with Resend email integration, and responsive design with Framer Motion animations.

## Commands

```bash
pnpm install          # Install dependencies (pnpm@8.8.0 required)
pnpm run dev          # Start dev server at http://localhost:3000
pnpm run build        # Production build
pnpm start            # Start production server
pnpm run lint         # Run ESLint
```

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/app/components/` - React components organized by feature (Navigation/, Projects/, AboutMe/, Utilities/)
- `src/app/api/send/route.tsx` - Email API endpoint using Resend
- `public/images/` - Static assets (project images, icons)

### Key Files
- `src/app/page.tsx` - Home page composing all sections
- `src/app/layout.tsx` - Root layout with metadata and fonts
- `src/app/components/Projects/projectsData.ts` - Project data array
- `src/app/components/Utilities/EmailSection.tsx` - Contact form (posts to `/api/send`)
- `src/lib/archidekt.ts` - Archidekt folder fetch + snapshot fallback for the deck grid
- `src/app/components/Mtg/MtgSection.tsx` - "Commander Decks" section (`#gamer` on the home page)
- `src/app/components/Tavern/TavernSection.tsx` - TableTopTavern store inventory (`#tavern` on the home page)
- `data/tavern-inventory.json` - Hand-maintained list of store listings; `pnpm snapshot:tavern` resolves it against Scryfall and SWU-DB into `data/tavern-snapshot.json`, which the section reads
- `scripts/check-tavern-prices.mjs` - Daily market-price check that emails an alert on big moves (run by `.github/workflows/tavern-price-check.yml`)

### Client/Server Boundaries
Most components are client components (`"use client"` directive) for interactivity. The API route (`src/app/api/send/route.tsx`) handles server-side email sending.

**Do not remove `"use client"` directives** without migrating the entire component chain to server components.

## Environment Variables

Create `.env.local` (never commit):
```
RESEND_API_KEY=your_key
FROM_EMAIL=your_email@example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ARCHIDEKT_FOLDER_ID=1708348
```

`NEXT_PUBLIC_ARCHIDEKT_FOLDER_ID` is optional (defaults to `1708348`); the
Archidekt API needs no key, and the deck grid falls back to
`data/decks-snapshot.json` when the request fails.

The `NEXT_PUBLIC_SUPABASE_*` vars power the `/mail` email client (Supabase
Auth + database). When absent, the app still builds and `/mail` shows a
"not configured" notice.

### Tavern price alerts

TCGplayer has no public API, so the store inventory is edited by hand in
`data/tavern-inventory.json` (run `pnpm snapshot:tavern` afterwards). The
price-check workflow reads its settings from GitHub Actions secrets:
`RESEND_API_KEY`, `FROM_EMAIL` and `TAVERN_ALERT_TO` (the address alerts go
to; keep it out of the repo). Price history is kept in the Actions cache, not
in git. Thresholds live in `scripts/lib/tavern-alerts.mjs`. To try it locally
without sending anything: `TAVERN_DRY_RUN=true pnpm tavern:prices`.

## Conventions

- **Styling**: Tailwind CSS utility classes inline in JSX. Custom colors: `primary: teal`, `secondary: green`
- **Exports**: Default exports for all components
- **Path alias**: `@/*` maps to `./src/*`
- **Images**: Use `next/image` with static imports or `/images/...` paths
- **Project data shape**: `{ id, title, description, image, tag[], gitUrl, previewUrl }`

## CI/Deployment

- **Docker**: Alpine-based image, runs as unprivileged user (uid 1001)
- **AWS Amplify**: Uses `amplify.yml`, outputs from `.next/`
- Both require corepack for pnpm: `corepack enable && corepack prepare pnpm@8.8.0 --activate`
- `sharp` native dependency may need platform prerequisites on minimal CI images

## When to Ask for Help

Stop and request human input for:
- Adding/exposing secrets or API keys
- Configuring third-party services (Resend)
- CI/infrastructure changes (Dockerfile, amplify.yml)
