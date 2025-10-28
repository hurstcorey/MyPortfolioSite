# SmartLink

Usage examples, installation, and notes for the `SmartLink` component.

## Installation

Install dependencies:

```bash
pnpm add @heroicons/react
# or
npm install @heroicons/react
```

This project already uses Tailwind CSS and Next.js. Heroicons is used with a single tree-shaken import for the external-link icon.

## Basic usage

```tsx
import SmartLink from "./Utilities/SmartLink";

<SmartLink href="/about">About page</SmartLink>

<SmartLink href="https://example.com" ariaLabel="Example site">Visit example</SmartLink>
```

## Variants, sizes and iconPosition

```tsx
// small, no icon
<SmartLink href="/docs" size="sm" iconPosition="none">Docs (small)</SmartLink>

// medium (default), icon on right
<SmartLink href="https://credly.example" size="md" variant="primary">View Certificate</SmartLink>

// large, icon on left
<SmartLink href="https://credly.example" size="lg" iconPosition="left" variant="secondary">Open Certificate</SmartLink>
```

## Notes

- External links open in a new tab and include `rel="noopener noreferrer"` for security.
- The component includes an `sr-only` announcement for external links.
- Sizes map to Tailwind classes for both text and icon sizing.

## Accessibility & Performance

See the inline comments in `SmartLink.tsx` for a short list of accessibility and performance considerations implemented.
