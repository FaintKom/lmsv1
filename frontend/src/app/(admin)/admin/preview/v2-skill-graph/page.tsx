"use client";

/** Demo route — /admin/preview/v2-skill-graph */

import {
  SkillGraphV2,
  type SkillNode,
  type SkillEdge,
} from "@/components/skills/skill-graph-v2";

const NODES: SkillNode[] = [
  // Programming track — top
  { id: "vars", label: "Variables", x: 5, y: 12, status: "mastered", category: "programming", sub: "L5" },
  { id: "control", label: "If / Loop", x: 28, y: 12, status: "mastered", category: "programming", sub: "L4" },
  { id: "funcs", label: "Functions", x: 50, y: 12, status: "in-progress", mastery: 0.65, category: "programming", sub: "L2 · 65%" },
  { id: "lists", label: "Lists", x: 72, y: 12, status: "available", category: "programming" },
  { id: "classes", label: "Classes", x: 92, y: 12, status: "locked", category: "programming" },
  // Math track — middle
  { id: "arith", label: "Arithmetic", x: 5, y: 50, status: "mastered", category: "math", sub: "L6" },
  { id: "frac", label: "Fractions", x: 28, y: 50, status: "mastered", category: "math", sub: "L3" },
  { id: "algebra", label: "Algebra", x: 50, y: 50, status: "available", category: "math" },
  { id: "geom", label: "Geometry", x: 72, y: 50, status: "locked", category: "math" },
  // Language track — bottom
  { id: "vocab", label: "Vocab 100", x: 5, y: 85, status: "mastered", category: "language", sub: "L7" },
  { id: "greet", label: "Greetings", x: 28, y: 85, status: "in-progress", mastery: 0.4, category: "language", sub: "L1 · 40%" },
  { id: "tense", label: "Tenses", x: 50, y: 85, status: "locked", category: "language" },
];

const EDGES: SkillEdge[] = [
  { from: "vars", to: "control" },
  { from: "control", to: "funcs" },
  { from: "funcs", to: "lists" },
  { from: "lists", to: "classes" },
  { from: "arith", to: "frac" },
  { from: "frac", to: "algebra" },
  { from: "algebra", to: "geom" },
  { from: "vocab", to: "greet" },
  { from: "greet", to: "tense" },
  // cross-track: math needed for some programming
  { from: "frac", to: "funcs" },
];

export default function V2SkillGraphPreview() {
  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "var(--paper)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: 24,
            color: "var(--ink-900)",
            margin: "0 0 16px",
          }}
        >
          PREVIEW · V2 · SKILL GRAPH
        </h1>
        <SkillGraphV2
          nodes={NODES}
          edges={EDGES}
          title="Your learning path"
          onNodeClick={(n) => {
            // eslint-disable-next-line no-alert
            alert(
              `Open skill: ${n.label} (${n.id}) · ${n.status}${
                n.mastery !== undefined ? ` · ${Math.round(n.mastery * 100)}%` : ""
              }`
            );
          }}
        />
      </div>
    </div>
  );
}
