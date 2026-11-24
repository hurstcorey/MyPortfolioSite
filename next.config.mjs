// @ts-check
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// A script-src/style-src CSP needs per-request nonces for Next's inline
// bootstrap scripts, so this policy sticks to directives that don't depend on
// them. The embeds (YouTube, Spotify, SoundCloud) are outbound frames, so
// frame-ancestors only restricts who may frame this site.
const contentSecurityPolicy = [
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
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