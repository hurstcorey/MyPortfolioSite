// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/swu',
        destination: 'https://star-wars-unlimited-app.replit.app',
        permanent: true,
      },
    ]
  },
}

export default nextConfig