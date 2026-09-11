import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Recreates the mark from app/icon.svg (32x32 viewBox) as plain flexbox
// divs, since satori (the renderer behind ImageResponse) does not support
// embedding arbitrary SVG markup. Positions below are the same rectangles
// from icon.svg, expressed as percentages of the 32-unit viewBox so the
// same layout scales to any output size.
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#111311",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "12.5%",
            top: "9.375%",
            width: "18.75%",
            height: "81.25%",
            backgroundColor: "#E8E4DA",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "37.5%",
            top: "15.625%",
            width: "43.75%",
            height: "18.75%",
            backgroundColor: "#A8A496",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "37.5%",
            top: "40.625%",
            width: "62.5%",
            height: "21.875%",
            backgroundColor: "#22D3EE",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "37.5%",
            top: "68.75%",
            width: "43.75%",
            height: "18.75%",
            backgroundColor: "#A8A496",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
