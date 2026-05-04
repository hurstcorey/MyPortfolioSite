// @ts-check
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: '/swu',
        destination: 'https://star-wars-unlimited-app.replit.app',
        permanent: true,
      },
      {
        source: '/diagram',
        destination: 'https://diagrammaster.app/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig