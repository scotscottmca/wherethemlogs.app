"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_EVENT, CONSENT_KEY, GA_ID } from "@/lib/site";

type Choice = "granted" | "denied";

/**
 * Usage-analytics consent. Both answers are the same button at the same size in
 * the same colour - the decline is not a link hiding under the accept.
 */
export function Consent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      if (stored !== "granted" && stored !== "denied") setOpen(true);
    } catch {
      // Storage blocked: ask, but the answer will not persist, so do not pretend
      // it will - nothing is loaded either way until it is answered.
      setOpen(true);
    }
  }, []);

  const decide = (choice: Choice) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      /* Choice applies to this visit only. */
    }
    setOpen(false);
    // The pressed button is about to unmount; keep focus in the page.
    document.getElementById("main")?.focus({ preventScroll: true });
    // <Analytics /> loads Google Analytics on "granted", and only then.
    window.dispatchEvent(new CustomEvent<Choice>(CONSENT_EVENT, { detail: choice }));
  };

  if (!open) return null;

  return (
    <aside className="consent no-print" aria-label="Cookie consent">
      <div className="edge" role="presentation" />
      <div className="consent__row">
        <div className="consent__copy">
          <h2 className="consent__h">Usage cookies</h2>
          <p className="consent__p">
            We would like to use Google Analytics, which sets first-party cookies, to count
            which applications get looked up so the catalogue gets filled in the right order.
            It records the pages you view - including the search term and platform filter -
            and nothing about the machine you are troubleshooting. Decline and Google is never
            loaded; the site works exactly the same.{" "}
            <Link href="/privacy">Read the detail</Link>.
          </p>
        </div>
        <div className="consent__acts">
          <button type="button" className="consent__btn tag mono" onClick={() => decide("denied")}>
            Decline
          </button>
          <button type="button" className="consent__btn tag mono" onClick={() => decide("granted")}>
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

function loadAnalytics() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag.js reads the Arguments object itself, not an array, so this stays a
  // plain function rather than an arrow with rest parameters.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // No Google signals and no ad personalisation: the privacy page promises the
  // data is not used for advertising.
  window.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

function granted() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

/**
 * Mounted once, in the root layout, so an Accept counts on every page. Google
 * is loaded after an Accept and at no other time: not before the question is
 * answered, and never after a Decline.
 */
export function Analytics() {
  useEffect(() => {
    if (granted()) loadAnalytics();
    const onChoice = (e: Event) => {
      if ((e as CustomEvent<Choice>).detail === "granted") loadAnalytics();
    };
    window.addEventListener(CONSENT_EVENT, onChoice);
    return () => window.removeEventListener(CONSENT_EVENT, onChoice);
  }, []);
  return null;
}

/**
 * Withdrawing has to be as easy as agreeing. Forgets the answer, deletes the
 * Google Analytics cookies and reloads, so the question is asked again with
 * nothing of Google's left running.
 */
export function ConsentReset() {
  const reset = () => {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
    } catch {
      /* Nothing stored to forget. */
    }
    const host = window.location.hostname;
    const site = `.${host.split(".").slice(-2).join(".")}`;
    for (const name of document.cookie.split(";").map((c) => c.split("=")[0]!.trim())) {
      if (!name.startsWith("_ga")) continue;
      for (const domain of ["", `; domain=${host}`, `; domain=${site}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
      }
    }
    window.location.reload();
  };

  return (
    <button type="button" className="btn tag mono" onClick={reset}>
      Change my cookie choice
    </button>
  );
}
