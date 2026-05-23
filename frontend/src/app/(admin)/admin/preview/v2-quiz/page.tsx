"use client";

/**
 * Demo route — preview of the V2 LessonShell + QuizV2.
 *
 * Sits under /admin/preview/v2-quiz so the team can poke the new
 * Duolingo-style chrome with a hard-coded sample quiz. NOT linked from
 * the public UI. Will retire once V2 is the default renderer.
 */

import { QuizV2 } from "@/components/exercises/v2/quiz-v2";

const SAMPLE_QUESTIONS = [
  {
    question_text: "Which keyword defines a function in Python?",
    options: [
      { text: "function", is_correct: false },
      { text: "def", is_correct: true },
      { text: "fn", is_correct: false },
      { text: "func", is_correct: false },
    ],
  },
  {
    question_text: "Which of these is a mutable type in Python?",
    options: [
      { text: "tuple", is_correct: false },
      { text: "str", is_correct: false },
      { text: "list", is_correct: true },
      { text: "frozenset", is_correct: false },
    ],
  },
  {
    question_text: 'What does the operator `//` mean?',
    options: [
      { text: "Comment marker", is_correct: false },
      { text: "Integer division", is_correct: true },
      { text: "Exponent", is_correct: false },
      { text: "Logical or", is_correct: false },
    ],
  },
];

export default function V2QuizPreviewPage() {
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
        <QuizV2
          questions={SAMPLE_QUESTIONS}
          eyebrow="PREVIEW · V2 CHROME · 3 questions · 3 attempts each"
          maxAttemptsPerTask={3}
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `Finished: ${r.correctEventually}/${r.total} correct (${r.correctOnFirstTry} first-try) · streak ended at ${r.finalStreak}`
            );
          }}
        />
      </div>
    </div>
  );
}
