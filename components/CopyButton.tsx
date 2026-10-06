"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCopy, IconCheck } from "./Icons";

type CopyState = "idle" | "done" | "failed";

/**
 * The row's own copy control. This is the only client-side part of a path
 * row - the label, path and note around it are plain server-rendered markup.
 * A click confirms right here, next to the row it copied, instead of a
 * banner across the whole card.
 */
export function CopyButton({ path, label }: { path: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(path);
      setState("done");
      timer.current = setTimeout(() => setState("idle"), 1800);
    } catch {
      // Clipboard is blocked (insecure origin, denied permission). Say so and
      // leave the path selected so it can be copied by hand.
      setState("failed");
    }
  }, [path]);

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
