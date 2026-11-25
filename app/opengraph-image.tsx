import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Where Them Logs App - search for any application's log file locations on Windows, macOS and Linux";

const ink = "#131520";
const text = "#ecebf3";
const muted = "#a3a5bb";
const tab = "#f4c95d";
const tabText = "#231a00";

// The share card, drawn in code so it follows the design instead of going
// stale as a picture: the name as a path, and the search field with its tab.
// It uses the renderer's built-in font - satori cannot read the site's woff2.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          backgroundColor: ink,
          color: text,
        }}
      >
        <div style={{ display: "flex", fontSize: 118, fontWeight: 700, letterSpacing: -4 }}>
          <span>where</span>
          <span style={{ color: tab }}>/</span>
          <span>them</span>
          <span style={{ color: tab }}>/</span>
          <span>logs</span>
          <span style={{ color: tab }}>/</span>
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 36, color: muted }}>
          Log file locations for Windows, macOS and Linux
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 26px 4px",
              backgroundColor: tab,
              color: tabText,
              fontSize: 24,
              fontWeight: 700,
              borderRadius: "16px 16px 0 0",
            }}
          >
            Find an app
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 104,
              padding: "0 14px 0 30px",
              backgroundColor: tab,
              color: "#5c4a12",
              fontSize: 36,
              borderRadius: "0 18px 18px 18px",
            }}
          >
            <span>Search for an app - teams, vscode, nginx</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 76,
                padding: "0 34px",
                backgroundColor: tabText,
                color: tab,
                fontSize: 32,
                fontWeight: 700,
                borderRadius: 12,
              }}
            >
              Search
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
