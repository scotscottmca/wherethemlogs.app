"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_KEY } from "@/lib/site";

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
    // Analytics loads here, and only on "granted". Nothing is loaded before the
    // question is answered.
  };

  if (!open) return null;

  return (
    <aside className="consent no-print" aria-label="Cookie consent">
      <div className="hazard" role="presentation" />
      <div className="consent__row">
        <div className="consent__copy">
          <h2 className="consent__h">Usage cookies</h2>
          <p className="consent__p">
            We would like to set one analytics cookie to count which applications get looked
            up, so the catalogue gets filled in the right order. It would record the search
            term and the platform filter, and nothing about the machine you are
            troubleshooting. The analytics provider has not been chosen yet, so nothing is
            loaded either way today and declining costs you nothing.{" "}
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
