"use client";

/**
 * V2LessonRunner — chains V2 exercises with persistent streak.
 *
 * Phase 7 of the V2 lesson redesign. Methodist (or the student lesson
 * page) supplies an ordered list of steps; each step declares its
 * exercise `type` + the props for the matching V2 component. The
 * runner mounts one V2 component at a time, listens for its
 * `onFinish`, advances on Continue, and threads the rolling streak
 * back into the next step's `streak` prop so HP/streak chrome stays
 * consistent across the lesson.
 *
 * Final step → `onComplete` with `{correctCount, totalSteps, streak}`.
 *
 * This is a thin runner — it doesn't replace the existing student
 * lesson page; it's opt-in (preview route now; ?v2=1 flag later).
 */

import { useMemo, useState } from "react";

import { QuizV2 } from "@/components/exercises/v2/quiz-v2";
import { TrueFalseV2 } from "@/components/exercises/v2/true-false-v2";
import { FillBlanksV2 } from "@/components/exercises/v2/fill-blanks-v2";
import { MatchingV2 } from "@/components/exercises/v2/matching-v2";
import { OrderingV2 } from "@/components/exercises/v2/ordering-v2";
import { CategorizeV2 } from "@/components/exercises/v2/categorize-v2";
import { BubbleSheetV2 } from "@/components/exercises/v2/bubble-sheet-v2";
import { TranslationV2 } from "@/components/exercises/v2/translation-v2";
import { SentenceBuilderV2 } from "@/components/exercises/v2/sentence-builder-v2";
import { DialogueV2 } from "@/components/exercises/v2/dialogue-v2";
import { ConjugationV2 } from "@/components/exercises/v2/conjugation-v2";
import { ReadingV2 } from "@/components/exercises/v2/reading-v2";
import { CrosswordV2 } from "@/components/exercises/v2/crossword-v2";
import { WordSearchV2 } from "@/components/exercises/v2/word-search-v2";
import { SRSFlashcardV2 } from "@/components/exercises/v2/srs-flashcard-v2";
import { CodeChallengeV2 } from "@/components/exercises/v2/code-challenge-v2";
import { WebEditorV2 } from "@/components/exercises/v2/web-editor-v2";
import { Robot2DV2 } from "@/components/exercises/v2/robot-2d-v2";
import { World3DV2 } from "@/components/exercises/v2/world-3d-v2";
import { MathStepwiseV2 } from "@/components/exercises/v2/math-stepwise-v2";
import { NumericInputV2 } from "@/components/exercises/v2/numeric-input-v2";
import { EquationBalanceV2 } from "@/components/exercises/v2/equation-balance-v2";
import { NumberLineV2 } from "@/components/exercises/v2/number-line-v2";
import { VisualFractionsV2 } from "@/components/exercises/v2/visual-fractions-v2";
import { McMathV2 } from "@/components/exercises/v2/mc-math-v2";
import { ArithmeticPuzzleV2 } from "@/components/exercises/v2/arithmetic-puzzle-v2";
import { CardSortV2 } from "@/components/exercises/v2/card-sort-v2";
import { CoordinatePlaneV2 } from "@/components/exercises/v2/coordinate-plane-v2";
import { EquationSolverV2 } from "@/components/exercises/v2/equation-solver-v2";
import { FunctionGraphV2 } from "@/components/exercises/v2/function-graph-v2";
import { GraphTransformV2 } from "@/components/exercises/v2/graph-transform-v2";
import { InequalityGraphV2 } from "@/components/exercises/v2/inequality-graph-v2";
import { ScatterPlotV2 } from "@/components/exercises/v2/scatter-plot-v2";
import { TablePatternV2 } from "@/components/exercises/v2/table-pattern-v2";
import { TwoWayTableV2 } from "@/components/exercises/v2/two-way-table-v2";
import { VennDiagramV2 } from "@/components/exercises/v2/venn-diagram-v2";
import { VennElementsV2 } from "@/components/exercises/v2/venn-elements-v2";
import { VennTextV2 } from "@/components/exercises/v2/venn-text-v2";
import { MapPinDropV2 } from "@/components/exercises/v2/map-pin-v2";
import { FileUploadV2 } from "@/components/exercises/v2/file-upload-v2";
import { ScormPackageV2 } from "@/components/exercises/v2/scorm-v2";

export type V2ExerciseType =
  | "quiz"
  | "true-false"
  | "fill-blanks"
  | "matching"
  | "ordering"
  | "categorize"
  | "bubble-sheet"
  | "translation"
  | "sentence-builder"
  | "dialogue"
  | "conjugation"
  | "reading"
  | "crossword"
  | "word-search"
  | "srs-flashcard"
  | "code-challenge"
  | "web-editor"
  | "robot-2d"
  | "world-3d"
  | "math-stepwise"
  | "numeric-input"
  | "equation-balance"
  | "number-line"
  | "visual-fractions"
  | "mc-math"
  | "arithmetic-puzzle"
  | "card-sort"
  | "coordinate-plane"
  | "equation-solver"
  | "function-graph"
  | "graph-transform"
  | "inequality-graph"
  | "scatter-plot"
  | "table-pattern"
  | "two-way-table"
  | "venn-diagram"
  | "venn-elements"
  | "venn-text"
  | "map-pin"
  | "file-upload"
  | "scorm";

export interface V2Step {
  type: V2ExerciseType;
  /** Untyped props passed through to the matched V2 component. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
}

export interface V2LessonRunnerProps {
  steps: V2Step[];
  /** Initial streak. Default 0. */
  streak?: number;
  /** Called after the last step's Continue. */
  onComplete?: (r: {
    correctCount: number;
    totalSteps: number;
    streak: number;
  }) => void;
  /** Lessons can quit early. Triggers onComplete with current state. */
  onQuit?: () => void;
}

// Registry: type → component. Loose typing on purpose — each V2 component
// has its own props shape; methodist is responsible for matching them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<V2ExerciseType, React.ComponentType<any>> = {
  "quiz": QuizV2,
  "true-false": TrueFalseV2,
  "fill-blanks": FillBlanksV2,
  "matching": MatchingV2,
  "ordering": OrderingV2,
  "categorize": CategorizeV2,
  "bubble-sheet": BubbleSheetV2,
  "translation": TranslationV2,
  "sentence-builder": SentenceBuilderV2,
  "dialogue": DialogueV2,
  "conjugation": ConjugationV2,
  "reading": ReadingV2,
  "crossword": CrosswordV2,
  "word-search": WordSearchV2,
  "srs-flashcard": SRSFlashcardV2,
  "code-challenge": CodeChallengeV2,
  "web-editor": WebEditorV2,
  "robot-2d": Robot2DV2,
  "world-3d": World3DV2,
  "math-stepwise": MathStepwiseV2,
  "numeric-input": NumericInputV2,
  "equation-balance": EquationBalanceV2,
  "number-line": NumberLineV2,
  "visual-fractions": VisualFractionsV2,
  "mc-math": McMathV2,
  "arithmetic-puzzle": ArithmeticPuzzleV2,
  "card-sort": CardSortV2,
  "coordinate-plane": CoordinatePlaneV2,
  "equation-solver": EquationSolverV2,
  "function-graph": FunctionGraphV2,
  "graph-transform": GraphTransformV2,
  "inequality-graph": InequalityGraphV2,
  "scatter-plot": ScatterPlotV2,
  "table-pattern": TablePatternV2,
  "two-way-table": TwoWayTableV2,
  "venn-diagram": VennDiagramV2,
  "venn-elements": VennElementsV2,
  "venn-text": VennTextV2,
  "map-pin": MapPinDropV2,
  "file-upload": FileUploadV2,
  "scorm": ScormPackageV2,
};

export function V2LessonRunner({
  steps,
  streak: initialStreak = 0,
  onComplete,
  onQuit,
}: V2LessonRunnerProps) {
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(initialStreak);
  const [correctCount, setCorrectCount] = useState(0);

  const total = steps.length;
  const step = steps[idx];

  const handleFinish = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (r: any) => {
      // Every V2 component returns at least `{correct: boolean, streak: number}`.
      const ok = !!r?.correct;
      const nextStreak = typeof r?.streak === "number" ? r.streak : streak;
      setStreak(nextStreak);
      if (ok) setCorrectCount((c) => c + 1);
      if (idx >= total - 1) {
        onComplete?.({
          correctCount: ok ? correctCount + 1 : correctCount,
          totalSteps: total,
          streak: nextStreak,
        });
        return;
      }
      setIdx(idx + 1);
    },
    [idx, total, streak, correctCount, onComplete]
  );

  if (!step) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100%",
          color: "var(--ink-500)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Lesson complete — {correctCount}/{total} correct.
      </div>
    );
  }

  const Component = REGISTRY[step.type];
  if (!Component) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: "var(--font-mono)",
          color: "var(--coral-700)",
        }}
      >
        V2LessonRunner: unknown exercise type &quot;{step.type}&quot;.
      </div>
    );
  }

  return (
    <Component
      key={idx}
      {...step.props}
      streak={streak}
      onFinish={handleFinish}
      onQuit={onQuit}
    />
  );
}
