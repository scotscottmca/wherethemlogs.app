"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCopy, IconCheck } from "./Icons";

export type CopyState = "idle" | "done" | "failed";

/**
 * Copy one string to the clipboard and say how it went, right where it was
 * asked. "done" clears itself; "failed" stays, because the fix is manual.
 */
export function useCopy(text: string): { state: CopyState; copy: () => void } {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void navigator.clipboard.writeText(text).then(
      () => {
        setState("done");
        timer.current = setTimeout(() => setState("idle"), 1800);
      },
      () => {
        // Clipboard is blocked (insecure origin, denied permission). Say so and
        // leave the text selectable so it can be copied by hand.
        setState("failed");
      },
    );
  }, [text]);

  return { state, copy };
}

/**
 * The row's own copy control. This is the only client-side part of a path
 * row - the label, path and note around it are plain server-rendered markup.
 * A click confirms right here, next to the row it copied, instead of a
 * banner across the whole card.
 */
export function CopyButton({ path, label }: { path: string; label: string }) {
  const { state, copy } = useCopy(path);

  return (
    <span className="prow__copyWrap">
      <span className="prow__copyStatus" role="status">
        {state === "done" && (
          <span className="plate__confirm mono">
            <IconCheck size={14} />
            Copied
          </span>
        )}
        {state === "failed" && (
          <span className="prow__note prow__note--copy">
            Clipboard unavailable. Select the path and copy it by hand.
          </span>
        )}
      </span>
      <button
        type="button"
        className="prow__copy tag mono"
        onClick={copy}
        aria-label={`Copy the ${label} path`}
      >
        <IconCopy size={13} />
        Copy
      </button>
    </span>
  );
}
