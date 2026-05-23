"use client";

/** Demo route — /admin/preview/v2-two-way-table */

import { TwoWayTableV2 } from "@/components/exercises/v2/two-way-table-v2";

export default function V2TwoWayTablePreview() {
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
        <TwoWayTableV2
          rowLabels={["Boys", "Girls", "Total"]}
          colLabels={["Soccer", "Basketball", "Total"]}
          cells={[
            [12, null, 25],
            [null, 10, 23],
            [20, null, 48],
          ]}
          answers={{ "0,1": 13, "1,0": 13, "2,1": 23 }}
          eyebrow="PREVIEW · V2 · TWO-WAY TABLE"
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
