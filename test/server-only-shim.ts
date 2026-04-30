// Empty shim — `server-only` is a Next.js build-time guard that throws
// when imported into a client bundle. Vitest runs in Node, so we replace
// it with this empty module to satisfy the import.
export {};
