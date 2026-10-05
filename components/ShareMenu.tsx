"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconBluesky, IconCheck, IconLink, IconLinkedIn, IconMail, IconShare, IconX } from "./Icons";

/** The page being shared: its address without any #fragment, and its title. */
function current() {
  const url = new URL(window.location.href);
  url.hash = "";
  return { url: url.toString(), title: document.title };
}

const enc = encodeURIComponent;

const TARGETS = [
  {
    label: "Send as email",
    icon: IconMail,
    href: ({ url, title }: { url: string; title: string }) => `mailto:?subject=${enc(title)}&body=${enc(url)}`,
  },
  {
    label: "Share to LinkedIn",
    icon: IconLinkedIn,
    href: ({ url }: { url: string }) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  },
  {
    label: "Share to Bluesky",
    icon: IconBluesky,
    href: ({ url, title }: { url: string; title: string }) => `https://bsky.app/intent/compose?text=${enc(`${title}\n${url}`)}`,
  },
  {
    label: "Share to X",
    icon: IconX,
    href: ({ url, title }: { url: string; title: string }) => `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`,
  },
];

/**
 * The header's share control: copy the link, email it, or post it. The menu
 * reads the page's address when it opens, so it always shares the page the
 * visitor is on, search terms and filters included.
 */
export function ShareMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [page, setPage] = useState({ url: "", title: "" });
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const firstItem = wrap.current?.querySelector<HTMLElement>("[role=menuitem]");
    firstItem?.focus();

    const close = (focusButton: boolean) => {
      setOpen(false);
      if (focusButton) button.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...(wrap.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = (at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setPage(current());
      setCopied("idle");
    }
    setOpen(!open);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(page.url);
      setCopied("done");
      setTimeout(() => setOpen(false), 900);
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div className="share" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="hdr__link share__btn"
        aria-label="Share this page"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <IconShare size={17} />
      </button>
      {open && (
        <div className="share__menu" id={menuId} role="menu" aria-label="Share this page">
          <button type="button" role="menuitem" className="share__item" onClick={copy}>
            {copied === "done" ? <IconCheck size={17} /> : <IconLink size={17} />}
            <span>{copied === "done" ? "Link copied" : copied === "failed" ? "Copy failed - select the address bar" : "Copy link"}</span>
          </button>
          <div className="share__rule" role="separator" />
          {TARGETS.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              role="menuitem"
              className="share__item"
              href={href(page)}
              target={label === "Send as email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
