"use client";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  duration?: number; // ms
  locale?: string;
  useSeparator?: boolean;
  className?: string;
};

function formatNumber(value: number, locale = "en-US", useSeparator = true) {
  if (!useSeparator) return String(value);
  return value.toLocaleString(locale);
}

const AnimatedNumber: React.FC<Props> = ({
  value,
  duration = 700,
  locale = "en-US",
  useSeparator = true,
  className,
}) => {
  const [display, setDisplay] = useState<string>(formatNumber(0, locale, useSeparator));
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    const start = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - (startRef.current || 0);
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const progress = 1 - Math.pow(1 - t, 3);
      const current = Math.round(fromRef.current + (value - fromRef.current) * progress);
      setDisplay(formatNumber(current, locale, useSeparator));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(start);
      } else {
        fromRef.current = value;
        startRef.current = null;
        rafRef.current = null;
      }
    };

    // cancel previous
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    rafRef.current = requestAnimationFrame(start);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
    };
  }, [value, duration, locale, useSeparator]);

  return <span className={className}>{display}</span>;
};

export default AnimatedNumber;
