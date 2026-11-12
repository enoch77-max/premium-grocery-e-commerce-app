import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function PinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 6.5h10v10h-10z" />
      <path d="M12.5 10h4l3 3v3.5h-7z" />
      <circle cx="6.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20c0-8 5-14 16-15 1 10-4 15-11 15H4Z" />
      <path d="M4 20c3-5 7-8 12-10" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 5 6v6c0 4.4 3 7.5 7 8.5 4-1 7-4.1 7-8.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 2 5 13.2h5.2L9.8 22 19 10.4h-5.4z" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5c.6 4.6 2 6.3 6.8 7-4.8.7-6.2 2.4-6.8 7-.6-4.6-2-6.3-6.8-7 4.8-.7 6.2-2.4 6.8-7Z" />
      <path d="M18.4 14.2c.3 2.3 1 3.1 3.4 3.5-2.4.4-3.1 1.2-3.4 3.5-.3-2.3-1-3.1-3.4-3.5 2.4-.4 3.1-1.2 3.4-3.5Z" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

/* ── Custom grocery signal icons ───────────────────────────────────────────
   Drawn for Fresco: single-weight strokes, rounded joins, readable at 12px. */

export function SproutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3.5-2.6-6-6.5-6 0 3.6 2.7 6 6.5 6Z" />
      <path d="M12 11c0-3 2.2-5 5.8-5 0 3.1-2.4 5-5.8 5Z" />
      <path d="M8.5 20h7" />
    </svg>
  );
}

export function DewIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4s5 5.2 5 8.6a5 5 0 0 1-10 0C7 9.2 12 4 12 4Z" />
      <path d="M10 12.5a2.2 2.2 0 0 0 2 2.4" />
    </svg>
  );
}

export function HeartLeafIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.7 12 20 12 20Z" />
      <path d="M12 8V5.5" />
      <path d="M12 5.5c0-1.6 1.2-2.5 3-2.5 0 1.7-1.2 2.5-3 2.5Z" />
    </svg>
  );
}

export function WheatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21V9" />
      <path d="M12 9c-2.4 0-3.6-1.4-3.6-3.6C10.8 5.4 12 6.8 12 9Z" />
      <path d="M12 9c2.4 0 3.6-1.4 3.6-3.6C13.2 5.4 12 6.8 12 9Z" />
      <path d="M12 13.5c-2.4 0-3.6-1.4-3.6-3.6 2.4 0 3.6 1.4 3.6 3.6Z" />
      <path d="M12 13.5c2.4 0 3.6-1.4 3.6-3.6-2.4 0-3.6 1.4-3.6 3.6Z" />
      <path d="M12 18c-2.4 0-3.6-1.4-3.6-3.6 2.4 0 3.6 1.4 3.6 3.6Z" />
      <path d="M12 18c2.4 0 3.6-1.4 3.6-3.6-2.4 0-3.6 1.4-3.6 3.6Z" />
    </svg>
  );
}

export function FishIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z" />
      <path d="M4 12 2.5 9.5M4 12l-1.5 2.5" />
      <circle cx="15.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function JarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3.5h6" />
      <path d="M9.5 3.5v2M14.5 3.5v2" />
      <path d="M8 7.5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-10Z" />
      <path d="M8 11h8" />
    </svg>
  );
}

export function MilkDropIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3.5h6v2.2l1.5 2.8v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-10L9 5.7V3.5Z" />
      <path d="M7.5 12.5c1.5 1 3 1 4.5 0s3-1 4.5 0" />
    </svg>
  );
}

export function SnowIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M5 6.5l14 11M19 6.5l-14 11" />
      <path d="M12 3l-1.8 1.8M12 3l1.8 1.8M12 21l-1.8-1.8M12 21l1.8-1.8" />
    </svg>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v16M8 20h8" />
      <path d="M12 6 5 8m7-2 7 2" />
      <path d="M5 8l-2 4.5a3 3 0 0 0 6 0L7 8" />
      <path d="M19 8l-2 4.5a3 3 0 0 0 6 0L21 8" />
    </svg>
  );
}

export function SunRiseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 9.5a3.5 3.5 0 0 1 3.5 3.5h-7A3.5 3.5 0 0 1 12 9.5Z" />
      <path d="M12 4v2M5.6 6.6l1.4 1.4M18.4 6.6 17 8M3 13h2M19 13h2M5 17h14" />
    </svg>
  );
}
