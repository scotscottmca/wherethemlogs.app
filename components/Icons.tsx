/**
 * Authored icon set. One stroke weight (2), butt caps, miter joins - cut vinyl,
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

export function IconSearch({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M14.8 14.8 21 21" strokeWidth={2.5} />
    </svg>
  );
}

export function IconPlus({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4v16M4 12h16" />
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

export function IconChevron({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 9l7 7 7-7" />
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
 * The mark: a rack upright with the picked level pulled out.
 *
 * Two dim shelves and one in signal cyan, extended past the others so the eye
 * lands on it first. That is the product in four rectangles - the log is on a
 * shelf somewhere, and this is the shelf. Kept to four elements because it has
 * to survive a 16px favicon, where the earlier barcode plate turned to mud.
 *
 * The same artwork lives in app/icon.svg. Change one, change both.
 */
export function Mark({ size = 34, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" fill="var(--ink)" />
      <rect x="4" y="3" width="6" height="26" fill="var(--bone)" />
      <rect x="12" y="5" width="14" height="6" fill="var(--bone-dim)" />
      <rect x="12" y="13" width="20" height="7" fill="var(--hivis)" />
      <rect x="12" y="22" width="14" height="6" fill="var(--bone-dim)" />
    </svg>
  );
}
