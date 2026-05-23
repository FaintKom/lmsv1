"use client";

/** Demo route — /admin/preview/v2-map-pin */

import { MapPinDropV2 } from "@/components/exercises/v2/map-pin-v2";

const HINT_CITIES = [
  { x: 48, y: 22, label: "London" },
  { x: 60, y: 42, label: "" },
  { x: 80, y: 48, label: "Berlin" },
  { x: 82, y: 70, label: "Rome" },
  { x: 38, y: 64, label: "Madrid" },
];

function EuropeMap() {
  return (
    <>
      <svg
        viewBox="0 0 140 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <pattern id="waves-eu" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 5 Q 2.5 3, 5 5 T 10 5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="140" height="100" fill="url(#waves-eu)" />
        <path d="M30 70 Q 25 60, 30 50 L 45 48 L 50 60 L 48 72 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M50 60 L 48 48 L 55 38 L 65 42 L 68 55 L 62 65 L 52 65 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M44 30 L 48 20 L 56 18 L 58 30 L 50 38 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6" />
        <ellipse cx="38" cy="28" rx="4" ry="3" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M72 56 L 78 48 L 82 60 L 84 75 L 86 80 L 80 80 L 76 70 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M68 38 L 80 36 L 86 48 L 78 50 L 70 50 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M86 38 L 110 32 L 120 50 L 100 58 L 88 50 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M70 8 L 90 4 L 95 28 L 80 36 L 70 22 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6" />
        <path d="M90 70 L 102 68 L 105 78 L 95 80 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6" />
      </svg>
      {HINT_CITIES.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <div style={{ width: 4, height: 4, background: "var(--ink-700)", borderRadius: 999, margin: "0 auto" }} />
          {c.label && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-700)",
                marginTop: 2,
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function V2MapPinPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <MapPinDropV2
          target={{ x: 41, y: 50 }}
          tolerance={6}
          mapContent={<EuropeMap />}
          correctHint="Paris is in northern France"
          eyebrow="PREVIEW · V2 · MAP PIN DROP"
          title={
            <>
              Drop a pin on <span className="gp-mark">Paris</span>
            </>
          }
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · pin=(${r.pin ? Math.round(r.pin.x) + "," + Math.round(r.pin.y) : "—"}) · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}
