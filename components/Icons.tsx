/**
 * Authored icon set. One stroke weight (2), butt caps, miter joins — cut vinyl,
 * not a rounded UI kit. Every icon draws on a 24-unit grid and inherits color.
 */
type IconProps = { size?: number; className?: string };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "butt" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
  focusable: false as const,
  className,
});

export function IconScan({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
      <path d="M2 12h20" strokeWidth={2.5} />
    </svg>
  );
}

export function IconCopy({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 9h11v11H9z" />
      <path d="M15 5H4v11h3" />
    </svg>
  );
}

export function IconCheck({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 12.5 9.5 18 20 6" strokeWidth={2.75} />
    </svg>
  );
}

export function IconArrow({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 12h17M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconCorner({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 4v9H5" />
      <path d="M9 8 4 13l5 5" />
    </svg>
  );
}

export function IconExternal({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M13 4h7v7" />
      <path d="M20 4 10 14" />
      <path d="M18 15v5H4V6h5" />
    </svg>
  );
}

export function IconClose({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 5 19 19M19 5 5 19" />
    </svg>
  );
}

export function IconFlag({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 21V4h13l-3 4.5L18 13H5" />
    </svg>
  );
}

/**
 * The mark: a bin location plate. Black plate, high-vis band, code bars —
 * the thing bolted to the end of a rack upright.
 */
export function Mark({ size = 34, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect x="0" y="0" width="34" height="34" fill="var(--bone)" />
      <rect x="0" y="11" width="34" height="12" fill="var(--hivis)" />
      <g fill="var(--ink)">
        <rect x="3" y="3" width="3" height="6" />
        <rect x="8" y="3" width="2" height="6" />
        <rect x="12" y="3" width="4" height="6" />
        <rect x="18" y="3" width="2" height="6" />
        <rect x="22" y="3" width="3" height="6" />
        <rect x="27" y="3" width="4" height="6" />
        <rect x="3" y="25" width="4" height="6" />
        <rect x="9" y="25" width="2" height="6" />
        <rect x="13" y="25" width="3" height="6" />
        <rect x="18" y="25" width="4" height="6" />
        <rect x="24" y="25" width="2" height="6" />
        <rect x="28" y="25" width="3" height="6" />
      </g>
      <path d="M0 11h34M0 23h34" stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  );
}
