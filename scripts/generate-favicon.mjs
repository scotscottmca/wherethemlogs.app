// One-time generator for app/favicon.ico.
//
// Next.js does not support a dynamic .tsx route for /favicon.ico - it must
// be a real static .ico file. This renders the same brand mark as
// app/apple-icon.tsx (see that file for the rectangle layout, copied from
// app/icon.svg) at 48x48 using next/og's ImageResponse, then wraps the
// resulting PNG in a minimal "PNG-in-ICO" container (supported by Windows
// Vista+ and every modern browser - no BMP conversion needed).
//
// Run with: node scripts/generate-favicon.mjs
// Safe to re-run any time the mark changes; not part of the build.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { ImageResponse } from "next/dist/server/og/image-response.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 48;

function mark() {
  return React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#111311",
      },
    },
    React.createElement("div", {
      style: {
        position: "absolute",
        left: "12.5%",
        top: "9.375%",
        width: "18.75%",
        height: "81.25%",
        backgroundColor: "#E8E4DA",
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        left: "37.5%",
        top: "15.625%",
        width: "43.75%",
        height: "18.75%",
        backgroundColor: "#A8A496",
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        left: "37.5%",
        top: "40.625%",
        width: "62.5%",
        height: "21.875%",
        backgroundColor: "#22D3EE",
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        left: "37.5%",
        top: "68.75%",
        width: "43.75%",
        height: "18.75%",
        backgroundColor: "#A8A496",
      },
    }),
  );
}

async function main() {
  const res = new ImageResponse(mark(), { width: SIZE, height: SIZE });
  const png = Buffer.from(await res.arrayBuffer());

  // ICONDIR (6 bytes) + one ICONDIRENTRY (16 bytes), then the raw PNG.
  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // image count

  header.writeUInt8(SIZE, 6); // width (48 fits in a byte)
  header.writeUInt8(SIZE, 7); // height
  header.writeUInt8(0, 8); // color count (0 = not a palette image)
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // size of PNG data
  header.writeUInt32LE(6 + 16, 18); // offset to PNG data

  const ico = Buffer.concat([header, png]);
  const outPath = path.join(__dirname, "..", "app", "favicon.ico");
  await writeFile(outPath, ico);
  console.log(`Wrote ${outPath} (${ico.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
