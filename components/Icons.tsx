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

/** The disclosure mark on a folded list: points right closed, down open. */
export function IconDisclose({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 4l8 8-8 8" />
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

export function IconShare({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 11v10h14V11" />
    </svg>
  );
}

export function IconLink({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
    </svg>
  );
}

export function IconMail({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 5h18v14H3z" />
      <path d="m3 6 9 7 9-7" />
    </svg>
  );
}

/* Third-party marks: filled, not cut vinyl, because they are other people's logos. */
const mark = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
  focusable: false as const,
  className,
});

export function IconLinkedIn({ size = 20, className }: IconProps) {
  return (
    <svg {...mark(size, className)}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

export function IconBluesky({ size = 20, className }: IconProps) {
  return (
    <svg {...mark(size, className)}>
      <path d="M5.2 3.3C7.95 5.4 10.9 9.5 12 11.8c1.1-2.3 4.05-6.4 6.8-8.5 2-1.5 5.2-2.6 5.2 1 0 .7-.4 6.1-.65 6.95-.85 3-3.9 3.75-6.6 3.3 4.75.8 5.95 3.5 3.35 6.2-4.95 5.05-7.1-1.3-7.65-2.95l-.45-1.3-.45 1.3c-.55 1.65-2.7 8-7.65 2.95-2.6-2.7-1.4-5.4 3.35-6.2-2.7.45-5.75-.3-6.6-3.3C.4 10.4 0 5 0 4.3c0-3.6 3.2-2.5 5.2-1Z" />
    </svg>
  );
}

export function IconX({ size = 20, className }: IconProps) {
  return (
    <svg {...mark(size, className)}>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.31L5.47 21H2.4l7.17-8.19L2 3h6.33l4.36 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
    </svg>
  );
}
