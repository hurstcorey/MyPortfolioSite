# Gemini.md

This file serves as a context and guide for Gemini when working on this repository.

## Project Overview
Personal portfolio website built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. The site features a project showcase, a contact form integrated with Resend, and responsive design utilizing Framer Motion for animations.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Email**: Resend
- **Package Manager**: pnpm (version 8.8.0)

## Commands
```bash
pnpm install          # Install dependencies
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm start            # Start production server
pnpm run lint         # Run linting
```

## Architecture & Structure
- `src/app/`: Next.js App Router pages and layouts.
- `src/app/components/`: React components grouped by feature (e.g., `AboutMe`, `Projects`, `Navigation`).
- `src/app/api/send/route.tsx`: Server-side API route for handling email via Resend.
- `public/`: Static assets (images, icons).

### Key Files
- `src/app/page.tsx`: Main entry point composing sections.
- `src/app/layout.tsx`: Root layout (metadata, fonts).
- `src/app/components/Projects/projectsData.ts`: Data source for the projects section.
- `src/app/components/Utilities/EmailSection.tsx`: Contact form component.

## Guidelines & Conventions

### Coding Style
- **Styling**: Use Tailwind CSS utility classes directly in JSX.
- **Imports**: Use path aliases (`@/*` maps to `./src/*`).
- **Components**: Prefer default exports.
- **Client/Server**: Most UI components require `"use client"` due to interactivity/animations. Do not remove this directive without refactoring.

### Data
- Project data follows the shape: `{ id, title, description, image, tag[], gitUrl, previewUrl }`.

### Environment Variables
Required in `.env.local` (do not commit):
- `RESEND_API_KEY`
- `FROM_EMAIL`

## Deployment
- **Docker**: Alpine-based image running as non-privileged user.
- **AWS Amplify**: Configured via `amplify.yml`.
