"use client";

/** Demo route — /admin/preview/v2-equation-balance */

import { EquationBalanceV2 } from "@/components/exercises/v2/equation-balance-v2";

export default function V2EquationBalancePreview() {
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
        <EquationBalanceV2
          initial={{ leftX: 3, leftW: 4, rightX: 0, rightW: 10 }}
          target={{ leftX: 1, leftW: 0, rightX: 0, rightW: 2 }}
          explain="3x + 4 = 10  →  3x = 6  →  x = 2"
          eyebrow="PREVIEW · V2 · EQUATION BALANCE"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · moves=[${r.moves.join(", ")}] · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}
