## Purpose

Short, actionable guidance for AI coding agents working on this Next.js + TypeScript portfolio site.
Reference files below when making edits and preserve existing patterns (App Router, client/server component boundaries, Tailwind styling).

## Big-picture architecture

- App Router (Next.js) under `src/app/` — `src/app/layout.tsx` is the RootLayout; `src/app/page.tsx` composes the site using component sections.
- UI is composed of client components (many files start with `"use client"`) for interactivity (framer-motion, state). Example: `src/app/components/Projects/ProjectsSection.tsx`.
- Static assets live in `public/images/` and are imported via `next/image` in components like `src/app/components/Utilities/EmailSection.tsx`.
- Simple server-side API route for email sending: `src/app/api/send/route.tsx` uses `resend` and `NextResponse` — environment variables control behaviour (see Environment section).
- Project data (projects list) is stored as a plain TS array at `src/app/components/Projects/projectsData.ts` and is read directly by `ProjectsSection`.

Why this matters: keep interactive logic in client components (preserve `"use client"`). Put network/email code into the API route to avoid exposing secrets to the client.

## Developer workflows & commands

- Package manager: pnpm (pinned in `package.json` as `packageManager: pnpm@8.8.0`). Common commands:
  - Install: `pnpm install` (or `npm install` if pnpm not available)
  - Dev server: `pnpm run dev` -> serves at http://localhost:3000
  - Build: `pnpm run build` then `pnpm start`
  - Lint: `pnpm run lint`

- Note: `sharp` is a native dependency (in package.json). On Windows CI/dev machines it may require native build tools; if CI errors reference `sharp`, install recommended platform prerequisites.

## Environment & secrets

- Do NOT commit secrets. Use `.env.local` in project root for:
  - RESEND_API_KEY — required for `src/app/api/send/route.tsx` to send emails via Resend
  - FROM_EMAIL — the sender/recipient used in the email route

- The API route will instantiate `new Resend(process.env.RESEND_API_KEY)`; if empty it will behave as configured by the SDK. Tests and development should mock or stub network calls where possible.

## Project-specific conventions & patterns

- "use client" prefix: many components are client-only and must keep the directive at the top (example: `ProjectsSection.tsx`, `Navbar.tsx`, `EmailSection.tsx`). Do not remove unless migrating to a server component.
- Styling is Tailwind CSS utility classes inline in JSX — prefer editing classes rather than introducing global CSS unless necessary. Global styles are in `src/app/globals.css`.
- Project list shape: `projectsData.ts` uses numeric `id`, `title`, `description`, `image`, `tag` (array), `gitUrl`, `previewUrl`. Keep types compatible when adding entries.
- Component exports: most components use default exports (e.g., `export default Navbar`) — preserve exported names and file paths to avoid breaking imports.
- Small, explicit client/server contract: `EmailSection` posts JSON to `/api/send` with `{ email, subject, message }`. If you change the route signature, update client code accordingly.

## Editing rules for AI agents

- Do not add or commit any secrets or `.env.local` content.
- Preserve `"use client"` in files that currently have it. If you convert to server components, update imports/usages and run the dev server to verify behaviour.
- When adding images, put them under `public/images/` and reference with static imports or `/images/...` paths used by `next/image`.
- When modifying API routes, include a small, local test example (e.g., a fetch to `/api/send` or unit test) because the route interacts with an external service.
- Keep changes minimal and incremental. Many components are small and visually sensitive; prefer small CSS/class edits over wholesale rewrites.

## Quick reference (files to inspect for examples)

- Root layout: `src/app/layout.tsx`
- Home composition: `src/app/page.tsx`
- Email API: `src/app/api/send/route.tsx`
- Contact form: `src/app/components/Utilities/EmailSection.tsx`
- Projects data: `src/app/components/Projects/projectsData.ts`
- Projects UI: `src/app/components/Projects/ProjectsSection.tsx`
- Navigation: `src/app/components/Navigation/Navbar.tsx`

## Testing & debugging tips

- Dev hot-reload: `pnpm run dev` and watch console for client/server logs. The API route logs incoming payloads via `console.log` — use that to validate form submissions.
- If email sending fails locally, stub the `resend` client or set a dummy `RESEND_API_KEY` and capture the returned error in the API route response (it returns JSON with `{ error }`).

## When to ask for human help

- Any change that requires adding or exposing secrets, configuring third‑party accounts (Resend), or changing CI/infra (Dockerfile, amplify.yml) — stop and request credentials/infra context.

---

If anything in these notes is unclear or you need additional specific examples (tests, typical payloads, or CI steps), tell me which area to expand and I'll iterate.

## CI / Deployment notes

- This repo includes a `Dockerfile` and an `amplify.yml` used by AWS Amplify. Both expect pnpm and the following steps:
  - enable corepack and prepare pnpm (the Dockerfile and `amplify.yml` run `corepack enable && corepack prepare pnpm@8.8.0 --activate`).
  - install with `pnpm install --frozen-lockfile` and build with `pnpm run build`.

- Dockerfile specifics (see `Dockerfile`):
  - Base image: Node (alpine). It installs pnpm via corepack, copies lockfile and package.json, installs deps, copies the workspace, then runs `pnpm run build` and exposes port 3000.
  - Runs the app as an unprivileged user (`nextjs` / uid 1001) — keep runtime files world-readable where necessary.
  - Command: `CMD ["pnpm", "start"]`.

- Amplify specifics (see `amplify.yml`):
  - PreBuild: enable corepack and `pnpm install --frozen-lockfile`.
  - Build: `pnpm run build`.
  - Artifacts: `baseDirectory: .next` and upload `**/*` (Next.js build output lives in `.next`; Amplify may expect a static directory for simple SSG sites).

- Common gotchas for CI:
  - Native dependency `sharp` may fail on minimal CI images (Windows runners or Alpine musl builds). If CI fails with `sharp` errors, either install platform prerequisites or switch to a Debian-based Node image in CI.
  - Amplify `baseDirectory: .next` contains both static and server artifacts. If your site uses Next.js App Router server features (SSR, server components, Edge runtime), verify Amplify's SSR support for your chosen configuration. When Amplify static hosting cannot meet server requirements, prefer deploying the Docker image (see `Dockerfile`) or use an SSR-enabled Amplify workflow.
  - Ensure environment variables (e.g., `RESEND_API_KEY`, `FROM_EMAIL`) are added to the CI/CD environment variables — do not store them in the repo.

- When modifying build steps or container image:
  - Update both `Dockerfile` and `amplify.yml` where appropriate to keep parity for local and cloud builds.
  - Include a brief local test in the PR that runs `pnpm run build` and starts the app (`pnpm start`) for a smoke test.

