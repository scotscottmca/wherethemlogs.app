"use client";

import { useEffect, useId, useState } from "react";
import { Field, Fields } from "./AdminField";

type Target = { label: string; href: (text: string) => string };

const SHORT_TARGETS: Target[] = [
  { label: "Post on X", href: (t) => `https://x.com/intent/post?text=${encodeURIComponent(t)}` },
  { label: "Post on Bluesky", href: (t) => `https://bsky.app/intent/compose?text=${encodeURIComponent(t)}` },
];

const LONG_TARGETS: Target[] = [
  {
    label: "Post on LinkedIn",
    href: (t) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(t)}`,
  },
];

/**
 * The post, editable before it goes. Copy covers anywhere; Share hands the text
 * to the operating system's share sheet where the browser has one; the links
 * open each network's compose box already filled in.
 */
export function SharePost({ short, long, url }: { short: string; long: string; url: string }) {
  const [mastodon, setMastodon] = useState("mastodon.social");
  const mastodonId = useId();

  return (
    <>
      <Draft label="Short post" hint="Fits X and Bluesky." initial={short} url={url} targets={SHORT_TARGETS} />
      <Draft
        label="Long post"
        hint="For LinkedIn and Mastodon."
        initial={long}
        url={url}
        targets={[
          ...LONG_TARGETS,
          {
            label: "Post on Mastodon",
            href: (t) => `https://${mastodon.trim() || "mastodon.social"}/share?text=${encodeURIComponent(t)}`,
          },
        ]}
      />
      <Fields>
        <Field label="Mastodon server" htmlFor={mastodonId} hint="The server your account is on.">
          <input
            id={mastodonId}
            className="frow__in mono"
            value={mastodon}
            onChange={(e) => setMastodon(e.target.value.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      </Fields>
    </>
  );
}

function Draft({
  label,
  hint,
  initial,
  url,
  targets,
}: {
  label: string;
  hint: string;
  initial: string;
  url: string;
  targets: Target[];
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState("");
  // Known only after hydration, so the button never renders on the server.
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setText(initial), [initial]);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Clipboard unavailable. Select the text and copy it by hand.");
    }
  };

  const share = async () => {
    try {
      // The URL stays in the text, not a separate field: several share targets
      // drop the text when given both.
      await navigator.share({ text });
      setStatus("Shared");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("Share failed. Copy the text instead.");
    }
  };

  return (
    <Fields>
      <Field
        label={label}
        htmlFor={id}
        hint={
          <>
            {hint} {text.length} characters. Links to {url}
          </>
        }
      >
        <textarea
          id={id}
          className="frow__in mono"
          value={text}
          rows={text.split("\n").length + 1}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="share__acts">
          <button type="button" className="btn tag mono" onClick={copy}>
            Copy
          </button>
          {canShare && (
            <button type="button" className="btn tag mono" onClick={share}>
              Share
            </button>
          )}
          {targets.map((t) => (
            <a
              key={t.label}
              className="btn btn--ghost tag mono"
              href={t.href(text)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.label}
            <span className="visually-hidden"> (opens in a new tab)</span></a>
          ))}
          {status && (
            <span className="frow__hint mono" role="status">
              {status}
            </span>
          )}
        </div>
      </Field>
    </Fields>
  );
}
