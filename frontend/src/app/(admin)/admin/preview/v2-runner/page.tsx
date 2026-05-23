"use client";

/** Demo route — /admin/preview/v2-runner */

import { V2LessonRunner, type V2Step } from "@/components/lesson/v2-runner";

const LESSON: V2Step[] = [
  {
    type: "quiz",
    props: {
      questions: [
        {
          q: "Which keyword declares a constant in JavaScript?",
          options: ["var", "let", "const", "static"],
          answer: 2,
          explain: "`const` binds an identifier to an immutable reference.",
        },
      ],
      eyebrow: "DEMO · JAVASCRIPT BASICS",
    },
  },
  {
    type: "true-false",
    props: {
      statement: "JavaScript is the same language as Java.",
      correctAnswer: false,
      explain:
        "Different languages — JavaScript was named to ride Java's buzz in 1995.",
      eyebrow: "DEMO · WEB HISTORY",
    },
  },
  {
    type: "ordering",
    props: {
      items: ["Plan", "Build", "Test", "Ship"],
      eyebrow: "DEMO · DEV CYCLE",
      hint: "Generic feature lifecycle.",
    },
  },
  {
    type: "categorize",
    props: {
      categories: [
        { name: "Frontend", items: ["React", "Tailwind"] },
        { name: "Backend", items: ["FastAPI", "PostgreSQL"] },
      ],
      eyebrow: "DEMO · STACK",
    },
  },
];

export default function V2RunnerPreview() {
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
        <V2LessonRunner
          steps={LESSON}
          onComplete={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `Lesson done — ${r.correctCount}/${r.totalSteps} correct · streak=${r.streak}`
            );
          }}
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
        />
      </div>
    </div>
  );
}
