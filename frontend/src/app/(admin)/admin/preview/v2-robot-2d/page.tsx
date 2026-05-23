"use client";

/** Demo route — /admin/preview/v2-robot-2d */

import { Robot2DV2 } from "@/components/exercises/v2/robot-2d-v2";

export default function V2Robot2DPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 980,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <Robot2DV2
          size={6}
          start={{ r: 5, c: 0, dir: 1 }}
          goal={{ r: 0, c: 5 }}
          coins={[
            { r: 3, c: 2 },
            { r: 1, c: 4 },
          ]}
          starter={[
            { id: 1, type: "forward", n: 3 },
            { id: 2, type: "turn-right" },
            { id: 3, type: "forward", n: 5 },
          ]}
          eyebrow="PREVIEW · V2 · ROBOT 2D · LEVEL 4"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · reached=${r.reachedGoal} · coins=${r.coinsCollected}/${r.total} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}
