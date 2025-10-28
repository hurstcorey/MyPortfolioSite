import React from "react";
import Link from "next/link";
// Tree-shakable import of only the icon we need
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

export interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  iconPosition?: "left" | "right" | "none";
  variant?: "default" | "primary" | "secondary" | "muted";
  ariaLabel?: string;
}

const SIZE_MAP = {
  sm: {
    text: "text-sm",
    px: "px-2 py-1",
    icon: "w-3 h-3",
  },
  md: {
    text: "text-base",
    px: "px-3 py-1.5",
    icon: "w-4 h-4",
  },
  lg: {
    text: "text-lg",
    px: "px-4 py-2",
    icon: "w-5 h-5",
  },
} as const;

const VARIANT_MAP: Record<
  NonNullable<SmartLinkProps["variant"]>,
  string
> = {
  default:
    "text-white hover:text-white/90 focus:ring-white/60 dark:focus:ring-white/40",
  primary:
    "text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500",
  secondary:
    "text-gray-200 hover:text-white/90 focus:ring-gray-300",
  muted: "text-gray-400 hover:text-gray-200 focus:ring-gray-400",
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith("//");
}

/**
 * SmartLink
 * A versatile link component that automatically detects external links
 * and applies best-practice attributes, accessible labels, and iconography.
 */
const SmartLink = React.memo(
  React.forwardRef<HTMLAnchorElement, SmartLinkProps>(
    (
      {
        href,
        children,
        className = "",
        size = "md",
        iconPosition = "right",
        variant = "default",
        ariaLabel,
      },
      ref
    ) => {
      const external = isExternalHref(href);
      const sizeCfg = SIZE_MAP[size] ?? SIZE_MAP.md;
      const variantClasses = VARIANT_MAP[variant] ?? VARIANT_MAP.default;

      // Compose base classes (focus ring, transition, layout)
      const baseClasses = `inline-flex items-center gap-2 rounded focus:outline-none transition-colors duration-150 ${sizeCfg.text} ${sizeCfg.px}`;

      const focusRing =
        "focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent dark:focus:ring-offset-slate-900";

      const combined = `${baseClasses} ${variantClasses} ${focusRing} ${className}`;

      // Accessible label: if external and user provided an ariaLabel, append hint
      const accessibleLabel = external
        ? ariaLabel
          ? `${ariaLabel} (opens in a new tab)`
          : `${typeof children === "string" ? children : "link"} (opens in a new tab)`
        : ariaLabel ?? (typeof children === "string" ? children : undefined);

      // Icon element (only render when iconPosition !== 'none' and external)
      const Icon = (
        <ArrowTopRightOnSquareIcon
          className={`${sizeCfg.icon} ${external ? "opacity-100" : "opacity-80"}`}
          aria-hidden="true"
        />
      );

      // INTERNAL LINK: use Next.js Link for client-side navigation
      if (
        !external
      ) {
        // For mailto or tel we'll still render a normal anchor tag below (treat as external-like behavior)
        return (
          <Link href={href} legacyBehavior passHref>
            <a ref={ref} className={combined} aria-label={accessibleLabel}>
              {iconPosition === "left" && Icon}
              <span>{children}</span>
              {iconPosition === "right" && Icon}
            </a>
          </Link>
        );
      }

      // EXTERNAL or other protocols (mailto, tel): render standard anchor
      return (
        <a
          href={href}
          ref={ref}
          className={combined}
          aria-label={accessibleLabel}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {iconPosition === "left" && Icon}
          <span>{children}</span>
          {iconPosition === "right" && Icon}
          {external && (
            <span className="sr-only">Opens in a new tab</span>
          )}
        </a>
      );
    }
  )
);

SmartLink.displayName = "SmartLink";

export default SmartLink;
