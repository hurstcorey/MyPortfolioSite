# Portfolio Website

A personal portfolio built with Next.js (App Router) and Tailwind CSS. It showcases skills, projects, and contact functionality (email via Resend if configured).

Short credits: this project was initially developed following a community tutorial — please support the original creator if you found it useful.

## Quick start

1. Clone the repository:

   ```bash
   git clone https://github.com/judygab/portfolio-website.git
   ```

2. Install dependencies (pnpm recommended):

   ```bash
   pnpm install
   ```

   or using npm:

   ```bash
   npm install
   ```

3. Create a .env.local in the project root for any secrets (optional):

   ```bash
   # Example
   RESEND_API_KEY=your_resend_api_key_here
   NEXT_PUBLIC_SOME_KEY=...
   ```

4. Run the development server:

   ```bash
   pnpm run dev
   ```

   or

   ```bash
   npm run dev
   ```

Open http://localhost:3000 to view the site. Edit the main page at `app/page.tsx` (App Router).

## Build and production

Build:

```bash
pnpm run build
```

Start:

```bash
pnpm start
```

(or npm run build && npm run start)

## Notes

- If you integrate Resend or other third-party services, set required API keys in .env.local and do not commit secrets.
- This project uses the Next.js App Router and TypeScript, and is styled with Tailwind CSS.

## Dependencies (high level)

- Next.js
- React
- Tailwind CSS
- TypeScript
- react-icons
- Resend (optional — email API)

## Learn more

- [Next.js docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)


## License

MIT — see LICENSE for details.
