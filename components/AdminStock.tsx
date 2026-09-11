"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ZoneTags } from "./AdminChrome";
import { IconClose, IconSearch } from "./Icons";
import type { StockRow } from "@/lib/admin";

/**
 * Stock control: every app in the catalogue, filtered as you type.
 *
 * The whole index is 33 apps and it is already in the HTML, so this filters in
 * the browser rather than asking the store again - a curator who knows the app
 * name is inside the record in two presses. The field is the scanner bar, the
 * same object it is on the public pages, pointed at a different rack.
 */
export function StockList({ rows }: { rows: StockRow[] }) {
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.slug, row.vendorName, ...row.aliases].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  }, [q, rows]);

  return (
    <>
      <div className="scan__bar scan__bar--bench">
        <IconSearch size={20} />
        <label htmlFor="adm-filter" className="sr">
          Filter the catalogue
        </label>
        <input
          id="adm-filter"
          type="search"
          className="scan__input"
          value={q}
          autoComplete="off"
          spellCheck={false}
          placeholder="Filter by app, alias, slug or vendor…"
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="scan__clear"
            onClick={() => setQ("")}
            aria-label="Clear the filter"
          >
            <IconClose size={17} />
          </button>
        )}
        <span className="scan__hint tag mono">
          {shown.length === rows.length
            ? `${String(rows.length).padStart(3, "0")} apps`
            : `${String(shown.length).padStart(3, "0")} of ${rows.length}`}
        </span>
      </div>

      {shown.length ? (
        <div className="admStock">
          {shown.map((row) => (
            <Link
              key={row.id}
              className="admStock__row"
              href={`/admin/v/${row.vendorId}/a/${row.id}`}
            >
              <span className="admStock__name">{row.name}</span>
              <span className="tag mono admStock__vendor">{row.vendorName}</span>
              <span className="mono admStock__slug">{row.slug}</span>
              <ZoneTags platforms={row.platforms} />
              <span className="tag mono admStock__count">
                {String(row.logPathCount).padStart(2, "0")} paths
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="void">
          <h2 className="void__h">Nothing matches “{q.trim()}”</h2>
          <p className="void__p">
            No app, alias, slug or vendor matches that. Clear the filter to see the whole
            catalogue, or add the application from its vendor's page.
          </p>
        </div>
      )}
    </>
  );
}
