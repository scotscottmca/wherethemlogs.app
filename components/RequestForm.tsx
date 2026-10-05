"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Field, Fields, Toggles } from "./AdminField";
import { IconArrow, IconChevron } from "./Icons";
import {
  ARCHITECTURES,
  CORRECTION_KINDS,
  LIMITS,
  PLATFORM_FIELDS,
  PLATFORM_NAMES,
  REDACTION_PLEDGE,
  SCOPES,
  type PlatformId,
} from "@/lib/requests";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare's human check, rendered explicitly so it lives exactly where the
 * form puts it. The script is fetched only on the request pages.
 */
function useTurnstile(siteKey: string, onToken: (token: string) => void) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    if (window.turnstile) mount();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      cancelled = true;
    };
    // onToken is a state setter, stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return { box, reset: () => window.turnstile?.reset(widget.current) };
}

function Area({
  label,
  value,
  onChange,
  hint,
  max,
  rows = 3,
  mono = false,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: React.ReactNode;
  max: number;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <Field label={required ? `${label} *` : label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        className={`frow__in${mono ? " mono" : ""}`}
        value={value}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        spellCheck={!mono}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function Line({
  label,
  value,
  onChange,
  hint,
  max,
  mono = false,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: React.ReactNode;
  max: number;
  mono?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <Field label={required ? `${label} *` : label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        className={`frow__in${mono ? " mono" : ""}`}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={!mono}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/**
 * One block of the form. A collapsible one is a native <details>, closed by
 * default: the platforms an app does not run on stay out of the way.
 */
function Section({
  title,
  note,
  collapsible = false,
  children,
}: {
  title: string;
  note?: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const head = (
    <>
      <span className="tag mono">{title}</span>
      {note && <span className="reqSection__note mono">{note}</span>}
    </>
  );
  return collapsible ? (
    <details className="reqSection">
      <summary className="reqSection__h">
        {head}
        <IconChevron size={16} className="reqSection__chev" />
      </summary>
      {children}
    </details>
  ) : (
    <section className="reqSection">
      <h2 className="reqSection__h">{head}</h2>
      {children}
    </section>
  );
}

type Sent = { number: number; url: string };

/**
 * The request form, in both of its shapes. What a visitor types here becomes
 * a public GitHub issue, so the copy says so at every step that matters.
 */
export function RequestForm({
  kind,
  siteKey,
  initial,
  fallbackUrl,
}: {
  kind: "add" | "correction";
  siteKey: string;
  initial: { app?: string; platform?: string };
  fallbackUrl: string;
}) {
  const [app, setApp] = useState(initial.app ?? "");
  const [vendor, setVendor] = useState("");
  const [aliases, setAliases] = useState("");
  const [variant, setVariant] = useState("");
  const [paths, setPaths] = useState<Record<PlatformId, string>>({ windows: "", macos: "", linux: "" });
  const [installers, setInstallers] = useState<Record<PlatformId, string[]>>({ windows: [], macos: [], linux: [] });
  const [architectures, setArchitectures] = useState<string[]>([]);
  const [scope, setScope] = useState<string | undefined>();
  const [platform, setPlatform] = useState<string | undefined>(
    PLATFORM_NAMES.includes(initial.platform as never) ? initial.platform : undefined,
  );
  const [listed, setListed] = useState("");
  const [problem, setProblem] = useState<string | undefined>();
  const [correct, setCorrect] = useState("");
  const [verification, setVerification] = useState("");
  const [notes, setNotes] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [social, setSocial] = useState("");
  const [pledge, setPledge] = useState(false);
  const [website, setWebsite] = useState("");

  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const turnstile = useTurnstile(siteKey, setToken);

  const missing =
    kind === "add"
      ? [
          !app.trim() && "the application",
          !vendor.trim() && "the vendor",
          !Object.values(paths).some((p) => p.trim()) && "at least one log path",
          !verification.trim() && "how you verified it",
        ]
      : [
          !app.trim() && "the application",
          !platform && "the platform",
          !listed.trim() && "what the index says",
          !problem && "what is wrong",
          !correct.trim() && "what it should say",
          !verification.trim() && "how you verified it",
        ];
  const gaps = missing.filter(Boolean) as string[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (gaps.length) return setError(`Still needed: ${gaps.join(", ")}.`);
    if (!pledge) return setError("Tick the box to confirm you have redacted anything identifying.");
    if (!token) return setError("Complete the human check first.");

    const credit = { github, linkedin, social };
    const body =
      kind === "add"
        ? { kind, app, vendor, aliases, variant, paths, installers, architectures, scope, verification, notes, credit }
        : { kind, app, platform, listed, problem, correct, verification, credit };

    setBusy(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, turnstile: token, website }),
      });
      const out = (await res.json().catch(() => ({}))) as Partial<Sent> & { message?: string };
      if (res.ok && out.number && out.url) {
        setSent({ number: out.number, url: out.url });
        return;
      }
      setError(out.message ?? "The request did not go through. Try again.");
    } catch {
      setError("The request did not go through. Check your connection and try again.");
    } finally {
      setBusy(false);
      // A token is single use: whatever happened, the next attempt needs a new one.
      setToken("");
      turnstile.reset();
    }
  }

  if (sent) {
    return (
      <section className="appPanel" aria-live="polite">
        <h2 className="tag mono appPanel__h">Request received</h2>
        <p>
          It is now issue <strong>#{sent.number}</strong> on GitHub. Anyone can follow it there,
          and it closes when the catalogue is updated.
        </p>
        <p>
          <a href={sent.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--hivis)" }}>
            Open issue #{sent.number}
          </a>
        </p>
      </section>
    );
  }

  const verify = (
    <Section title="How did you verify this?">
      <Fields>
        <Area label="Verified by" value={verification} onChange={setVerification} max={LIMITS.prose} required hint="Your own machine is a fine answer. A vendor documentation link is better." />
      </Fields>
    </Section>
  );

  const about = (
    <Section title="About the submitter" note="Optional. For credit; published on the issue.">
      <Fields>
        <Line label="GitHub username" value={github} onChange={setGithub} max={LIMITS.github} mono placeholder="octocat" hint="Shown as a link to your GitHub profile." />
        <Line label="LinkedIn" value={linkedin} onChange={setLinkedin} max={LIMITS.linkedin} mono placeholder="https://www.linkedin.com/in/your-name" />
        <Line label="X or Bluesky" value={social} onChange={setSocial} max={LIMITS.social} mono placeholder="@name or name.bsky.social" />
      </Fields>
    </Section>
  );

  return (
    <form onSubmit={submit} noValidate>
      {kind === "add" ? (
        <>
          <Section title="The application">
            <Fields>
              <Line label="Application" value={app} onChange={setApp} max={LIMITS.name} required placeholder="Visual Studio Code" hint="The name people would search for." />
              <Line label="Vendor" value={vendor} onChange={setVendor} max={LIMITS.name} required placeholder="Microsoft" />
              <Line label="Also known as" value={aliases} onChange={setAliases} max={LIMITS.aliases} placeholder="vscode, code" hint="Optional. Comma separated." />
              <Line label="Variant" value={variant} onChange={setVariant} max={LIMITS.variant} placeholder="Classic (v1)" hint="Optional. Only if the app ships in flavours that log to different places." />
              <Toggles
                label="Architecture"
                multi
                options={ARCHITECTURES.map((a) => ({ id: a, label: a }))}
                value={architectures}
                onChange={setArchitectures}
                hint="Optional. Leave all off if you are not sure."
              />
              <Toggles
                label="Scope"
                options={SCOPES.map((s) => ({ id: s, label: s }))}
                value={scope ? [scope] : []}
                onChange={(next) => setScope(next[0] === scope ? undefined : next[0])}
                hint="Optional. Press again to clear."
              />
            </Fields>
          </Section>

          <p className="reqLead">
            Log paths: open each platform the app runs on. At least one path is needed.
          </p>
          {PLATFORM_FIELDS.map((p) => {
            const count = paths[p.id].split("\n").filter((l) => l.trim()).length;
            return (
              <Section
                key={p.id}
                title={p.name}
                collapsible
                note={count ? `${count} path${count === 1 ? "" : "s"}` : undefined}
              >
                <Fields>
                  <Area
                    label="Log paths"
                    value={paths[p.id]}
                    onChange={(v) => setPaths((all) => ({ ...all, [p.id]: v }))}
                    max={LIMITS.paths}
                    mono
                    placeholder={p.id === "windows" ? "%APPDATA%\\Code\\logs\\ | Session logs" : p.id === "macos" ? "~/Library/Application Support/Code/logs/ | Session logs" : "~/.config/Code/logs/ | Session logs"}
                    hint="One path per line, exactly as written, environment variables unexpanded. Add ` | ` and a few words to say what it holds."
                  />
                  <Toggles
                    label="Installer"
                    multi
                    options={p.installers.map((t) => ({ id: t, label: t }))}
                    value={installers[p.id]}
                    onChange={(next) => setInstallers((all) => ({ ...all, [p.id]: next }))}
                    hint="Optional. Which installer types these paths hold true for."
                  />
                </Fields>
              </Section>
            );
          })}

          {verify}

          <Section title="Anything else">
            <Fields>
              <Area label="Notes" value={notes} onChange={setNotes} max={LIMITS.prose} hint="Optional. A flag that has to be set, a version it changed in, a folder that only appears after a crash." />
            </Fields>
          </Section>
        </>
      ) : (
        <>
          <Section title="The path">
            <Fields>
              <Line label="Application" value={app} onChange={setApp} max={LIMITS.name} required placeholder="Microsoft Teams" />
              <Toggles
                label="Platform *"
                options={PLATFORM_NAMES.map((p) => ({ id: p, label: p }))}
                value={platform ? [platform] : []}
                onChange={(next) => setPlatform(next[0])}
              />
              <Area label="What the index says" value={listed} onChange={setListed} max={LIMITS.paths} mono required rows={2} />
              <Toggles
                label="What is wrong *"
                options={CORRECTION_KINDS.map((k) => ({ id: k, label: k }))}
                value={problem ? [problem] : []}
                onChange={(next) => setProblem(next[0])}
              />
              <Area label="What it should say" value={correct} onChange={setCorrect} max={LIMITS.paths} mono required rows={2} hint="Exactly as written, environment variables unexpanded." />
            </Fields>
          </Section>
          {verify}
        </>
      )}

      {about}

      {/* People never see this field; a bot filling in every input does. */}
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <Section title="Before you submit">
      <Fields>
        <Field label="Redaction">
          <label className="reqPledge">
            <input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} />
            <span>{REDACTION_PLEDGE} This becomes a public GitHub issue.</span>
          </label>
        </Field>
        <Field label="Human check">
          <div ref={turnstile.box} />
        </Field>
      </Fields>
      </Section>

      <div className="reqActs">
        <button type="submit" className="btn tag mono" disabled={busy}>
          {busy ? "Sending" : "Send request"}
          <IconArrow size={15} />
        </button>
        {error && (
          <p className="frow__bad mono" role="alert">
            {error}{" "}
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
              Or file it on GitHub.
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
