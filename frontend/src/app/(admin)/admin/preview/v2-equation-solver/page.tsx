"use client";

/** Demo route — /admin/preview/v2-equation-solver */

import { EquationSolverV2 } from "@/components/exercises/v2/equation-solver-v2";

export default function V2EquationSolverPreview() {
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
        <EquationSolverV2
          initial={{ left: "2x + 5", right: "17" }}
          steps={[
            {
              label: "What gets rid of the +5?",
              options: [
                { id: "sub5", label: "subtract 5", ok: true, after: { left: "2x", right: "12" } },
                { id: "add5", label: "add 5" },
                { id: "div2", label: "divide by 2" },
              ],
            },
            {
              label: "Now isolate x.",
              options: [
                { id: "div2", label: "divide by 2", ok: true, after: { left: "x", right: "6" } },
                { id: "mul2", label: "multiply by 2" },
                { id: "sub2", label: "subtract 2" },
              ],
            },
          ]}
          eyebrow="PREVIEW · V2 · EQUATION SOLVER"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · wrongAttempts=${r.wrongAttempts} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}
