"use client";

import { Fragment } from "react";
import { useCopy } from "./CopyButton";
import { IconCheck, IconDisclose } from "./Icons";
import { joinFile } from "@/lib/model";

/**
 * The files under a folder path, printed beneath it.
 *
 * A plain disclosure: folded on a result card, where the count says there is
 * more and the card stays one path tall; open on the app page, which is for
 * reading. Each name copies as the full path - folder and file together, the
 * string someone pastes into a ticket - and confirms beside the name it
 * copied, the way the path row's own control does.
 */
export function FileManifest({ path, files, open = false }: { path: string; files: string[]; open?: boolean }) {
  return (
    <details className="prow__files" open={open || undefined}>
      <summary className="tag mono">
        <IconDisclose size={11} />
        {files.length} {files.length === 1 ? "file" : "files"} in this folder
      </summary>
      {/* The longest name sets the column width, in the names' own mono face,
          so no name has to break: see .manifest in app/components.css. */}
      <ul
        className="manifest"
        style={{ ["--manifest-col" as string]: `${Math.max(...files.map((f) => f.length))}ch` } as React.CSSProperties}
      >
        {files.map((name) => (
          <FileName key={name} name={name} full={joinFile(path, name)} />
        ))}
      </ul>
    </details>
  );
}

function FileName({ name, full }: { name: string; full: string }) {
  const { state, copy } = useCopy(full);
  return (
    <li>
      <button type="button" className="manifest__file" onClick={copy} aria-label={`Copy the full path of ${name}`}>
        <span className="manifest__name">
          {/* A name may only break at a space it holds, never after a hyphen:
              each run between spaces is set as one unbreakable word. */}
          {name.split(" ").map((word, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span className="manifest__word">{word}</span>
            </Fragment>
          ))}
        </span>
        <span className="manifest__status" role="status">
          {state === "done" && (
            <span className="plate__confirm mono">
              <IconCheck size={11} />
              Copied
            </span>
          )}
          {state === "failed" && <span className="prow__note">Clipboard unavailable.</span>}
        </span>
      </button>
    </li>
  );
}
