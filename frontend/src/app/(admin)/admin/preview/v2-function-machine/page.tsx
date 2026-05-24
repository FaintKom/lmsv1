"use client";

/** Demo route — /admin/preview/v2-function-machine */

import { FunctionMachineV2 } from "@/components/exercises/v2/function-machine-v2";

export default function V2FunctionMachinePreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 820,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <FunctionMachineV2
          rule={(x) => 3 * x - 2}
          ruleAccepted={["3x-2", "3*x-2", "3x+-2"]}
          ruleDisplay="f(x) = 3x − 2"
          sampleInputs={[1, 2, 5, 10]}
          eyebrow="PREVIEW · V2 · FUNCTION MACHINE"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}
