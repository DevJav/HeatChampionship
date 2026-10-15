import * as FlagSvgs from "country-flag-icons/string/3x2";

// Building blocks for next/og images (Satori): inline styles only, flex layout.

const RED = "#d10500";
const BAR = "linear-gradient(180deg, #2c2d32 0%, #111214 55%, #000 100%)";

/** The flag as an <img> data URI, or null for unknown codes. */
export function flagDataUri(code: string | null | undefined) {
  const svg = code ? (FlagSvgs as Record<string, string>)[code.replace("-", "_")] : undefined;
  return svg ? `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` : null;
}

/** Slanted tag, like the site's badges. */
export function OgTag({ children, background = RED, color = "#fff" }: { children: React.ReactNode; background?: string; color?: string }) {
  return (
    <div style={{ display: "flex", background, color, padding: "6px 22px", transform: "skewX(-12deg)", fontSize: 26, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function Chequered() {
  const squares = Array.from({ length: 100 }, (_, i) => i);
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 0, right: 0, bottom: 0 }}>
      {[0, 1].map((row) => (
        <div key={row} style={{ display: "flex" }}>
          {squares.map((i) => (
            <div key={i} style={{ width: 12, height: 12, background: (i + row) % 2 ? "#e9eaed" : "#000" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 42, background: RED, transform: "skewX(-12deg)" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "skewX(12deg)" }}>
          <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
        </svg>
      </div>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", color: "#fff" }}>
        Heat Championship
      </div>
    </div>
  );
}

/**
 * Dark broadcast panel with the red edge, brand and chequered strip. Behind the
 * text: a full-bleed cover photo, or a flag on the right.
 */
export function OgFrame({ flag, cover, children }: { flag?: string | null; cover?: string | null; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: BAR, position: "relative", fontFamily: "Titillium" }}>
      {cover ? (
        <div style={{ display: "flex", position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={cover} width={1200} height={630} style={{ objectFit: "cover" }} alt="" />
          {/* Darken the left and bottom, where the title and brand sit */}
          <div style={{ display: "flex", position: "absolute", top: 0, left: 0, bottom: 0, right: 0, background: "linear-gradient(90deg, rgba(17,18,20,0.92) 0%, rgba(17,18,20,0.7) 45%, rgba(17,18,20,0.15) 100%)" }} />
          <div style={{ display: "flex", position: "absolute", left: 0, bottom: 0, right: 0, height: 260, background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)" }} />
        </div>
      ) : flag && (
        <div style={{ display: "flex", position: "absolute", top: 0, right: 0, bottom: 0, width: 720 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={flag} width={720} height={630} style={{ objectFit: "cover", opacity: 0.6 }} alt="" />
          {/* Fade the flag in from the left so the text stays readable (Satori has no "inset" shorthand) */}
          <div style={{ display: "flex", position: "absolute", top: 0, left: 0, bottom: 0, right: 0, background: "linear-gradient(90deg, #111214 0%, rgba(17,18,20,0.55) 40%, rgba(17,18,20,0) 80%)" }} />
        </div>
      )}
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: RED }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 72px 72px", width: "100%", position: "relative" }}>
        {children}
        <Brand />
      </div>
      <Chequered />
    </div>
  );
}
