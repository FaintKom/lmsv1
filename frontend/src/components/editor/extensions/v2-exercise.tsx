"use client";

/**
 * v2-exercise — TipTap Node that embeds any V2 exercise inline.
 *
 * Inspired by LearnHouse's block-based editor (see
 * tasks/research/2026-05-24-v2-architecture-study/02-learnhouse.md):
 * methodist drops an exercise directly between paragraphs of lesson
 * prose. No separate editor for content vs. exercises.
 *
 * Stored shape in TipTap doc JSON:
 *   { type: "v2Exercise",
 *     attrs: { exerciseType: V2ExerciseType, props: any } }
 *
 * Edit mode (admin) → renders header + type picker + JSON props
 * textarea + live preview of the V2 component below.
 * View mode (student) → renders the V2 component full-bleed in a
 * card matching the design system.
 */

import { useMemo, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  V2LessonRunner,
  type V2ExerciseType,
} from "@/components/lesson/v2-runner";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    v2Exercise: {
      setV2Exercise: (attrs?: {
        exerciseType?: V2ExerciseType;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props?: any;
      }) => ReturnType;
    };
  }
}

/** Curated list shown in the type picker. Matches V2LessonRunner registry. */
const TYPES: { type: V2ExerciseType; label: string; group: string }[] = [
  { type: "quiz", label: "Quiz", group: "Quiz family" },
  { type: "true-false", label: "True / False", group: "Quiz family" },
  { type: "fill-blanks", label: "Fill blanks", group: "Quiz family" },
  { type: "matching", label: "Matching", group: "Quiz family" },
  { type: "ordering", label: "Ordering", group: "Quiz family" },
  { type: "categorize", label: "Categorize", group: "Quiz family" },
  { type: "bubble-sheet", label: "Bubble sheet", group: "Quiz family" },
  { type: "translation", label: "Translation", group: "Language" },
  { type: "sentence-builder", label: "Sentence builder", group: "Language" },
  { type: "dialogue", label: "Dialogue", group: "Language" },
  { type: "conjugation", label: "Conjugation", group: "Language" },
  { type: "reading", label: "Reading", group: "Language" },
  { type: "crossword", label: "Crossword", group: "Language" },
  { type: "word-search", label: "Word search", group: "Language" },
  { type: "srs-flashcard", label: "SRS flashcard", group: "Language" },
  { type: "code-challenge", label: "Code challenge", group: "Programming" },
  { type: "web-editor", label: "Web editor", group: "Programming" },
  { type: "robot-2d", label: "Robot 2D", group: "Programming" },
  { type: "world-3d", label: "World 3D", group: "Programming" },
  { type: "math-stepwise", label: "Math stepwise", group: "Math" },
  { type: "numeric-input", label: "Numeric input", group: "Math" },
  { type: "equation-balance", label: "Equation balance", group: "Math" },
  { type: "number-line", label: "Number line", group: "Math" },
  { type: "visual-fractions", label: "Visual fractions", group: "Math" },
  { type: "mc-math", label: "MC math", group: "Math" },
  { type: "arithmetic-puzzle", label: "Arithmetic puzzle", group: "Math" },
  { type: "card-sort", label: "Card sort", group: "Math" },
  { type: "coordinate-plane", label: "Coordinate plane", group: "Math" },
  { type: "equation-solver", label: "Equation solver", group: "Math" },
  { type: "function-graph", label: "Function graph", group: "Math" },
  { type: "graph-transform", label: "Graph transform", group: "Math" },
  { type: "inequality-graph", label: "Inequality graph", group: "Math" },
  { type: "scatter-plot", label: "Scatter plot", group: "Math" },
  { type: "table-pattern", label: "Table pattern", group: "Math" },
  { type: "two-way-table", label: "Two-way table", group: "Math" },
  { type: "venn-diagram", label: "Venn diagram", group: "Math" },
  { type: "venn-elements", label: "Venn elements", group: "Math" },
  { type: "venn-text", label: "Venn text", group: "Math" },
  { type: "probability-wheel", label: "Probability wheel", group: "Math" },
  { type: "area-model", label: "Area model", group: "Math" },
  { type: "function-machine", label: "Function machine", group: "Math" },
  { type: "map-pin", label: "Map pin", group: "Other" },
  { type: "file-upload", label: "File upload", group: "Other" },
  { type: "scorm", label: "SCORM", group: "Other" },
  { type: "whiteboard", label: "Whiteboard", group: "Other" },
];

/** Tiny per-type props starter — methodist edits from here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_PROPS: Partial<Record<V2ExerciseType, any>> = {
  quiz: {
    questions: [
      {
        q: "Sample question?",
        options: ["A", "B", "C", "D"],
        answer: 0,
      },
    ],
  },
  "true-false": {
    statement: "Edit this statement.",
    correctAnswer: true,
  },
  ordering: {
    items: ["First", "Second", "Third"],
  },
  categorize: {
    categories: [
      { name: "Group A", items: ["item-a1", "item-a2"] },
      { name: "Group B", items: ["item-b1"] },
    ],
  },
  "numeric-input": {
    problem: "What is 2 + 2?",
    correct: 4,
  },
  "math-stepwise": {
    problem: "Solve: 2x = 8",
    steps: [{ label: "Step 1", expected: "x = 4" }],
  },
};

interface V2ExerciseAttrs {
  exerciseType: V2ExerciseType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NodeView(p: ReactNodeViewProps<any>) {
  const { node, updateAttributes, deleteNode, editor } = p;
  const attrs = node.attrs as V2ExerciseAttrs;
  const [expanded, setExpanded] = useState(true);
  const [propsText, setPropsText] = useState(() =>
    JSON.stringify(attrs.props ?? {}, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const editable = editor.isEditable;

  const runnerSteps = useMemo(() => {
    if (!attrs.exerciseType) return [];
    return [{ type: attrs.exerciseType, props: attrs.props || {} }];
  }, [attrs.exerciseType, attrs.props]);

  const onTypeChange = (t: V2ExerciseType) => {
    const next = DEFAULT_PROPS[t] ?? {};
    updateAttributes({ exerciseType: t, props: next });
    setPropsText(JSON.stringify(next, null, 2));
    setParseError(null);
  };

  const onPropsBlur = () => {
    try {
      const parsed = JSON.parse(propsText);
      updateAttributes({ props: parsed });
      setParseError(null);
    } catch (e) {
      setParseError(String(e));
    }
  };

  // View mode: full preview, no chrome.
  if (!editable) {
    if (!attrs.exerciseType) return null;
    return (
      <NodeViewWrapper
        as="div"
        data-type="v2-exercise"
        data-exercise-type={attrs.exerciseType}
        contentEditable={false}
        style={{
          margin: "20px 0",
          border: "2px solid var(--ink-100)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--paper)",
        }}
      >
        <div style={{ minHeight: 320 }}>
          <V2LessonRunner steps={runnerSteps} />
        </div>
      </NodeViewWrapper>
    );
  }

  // Edit mode: header chrome + collapsible config + live preview.
  return (
    <NodeViewWrapper
      as="div"
      data-type="v2-exercise"
      data-exercise-type={attrs.exerciseType ?? ""}
      contentEditable={false}
      style={{
        margin: "20px 0",
        border: "2px solid var(--green-300)",
        borderRadius: 14,
        background: "var(--paper-2)",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "10px 14px",
          background: "var(--green-50)",
          borderBottom: "1px solid var(--green-200)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--green-800)",
            fontWeight: 700,
          }}
        >
          V2 Exercise
        </span>
        <select
          value={attrs.exerciseType ?? ""}
          onChange={(e) => onTypeChange(e.target.value as V2ExerciseType)}
          style={{
            background: "var(--paper)",
            border: "1px solid var(--green-300)",
            borderRadius: 8,
            padding: "4px 8px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-900)",
          }}
        >
          <option value="" disabled>
            Pick a type…
          </option>
          {Object.entries(
            TYPES.reduce<Record<string, typeof TYPES>>((acc, t) => {
              (acc[t.group] = acc[t.group] || []).push(t);
              return acc;
            }, {})
          ).map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse config" : "Expand config"}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--green-800)",
            display: "grid",
            placeItems: "center",
            padding: 4,
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          type="button"
          onClick={() => deleteNode()}
          aria-label="Delete exercise"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--coral-500)",
            display: "grid",
            placeItems: "center",
            padding: 4,
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {/* config */}
      {expanded && attrs.exerciseType && (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid var(--ink-100)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-500)",
              fontWeight: 600,
            }}
          >
            Props (JSON)
          </div>
          <textarea
            value={propsText}
            onChange={(e) => setPropsText(e.target.value)}
            onBlur={onPropsBlur}
            spellCheck={false}
            rows={Math.min(14, Math.max(4, propsText.split("\n").length))}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: `1.5px solid ${parseError ? "var(--coral-500)" : "var(--ink-200)"}`,
              background: parseError ? "var(--coral-50)" : "var(--paper)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-900)",
              outline: "none",
              resize: "vertical",
            }}
          />
          {parseError ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--coral-700)",
              }}
            >
              {parseError}
            </div>
          ) : (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-400)",
              }}
            >
              Click outside the box to apply.
            </div>
          )}
        </div>
      )}
      {/* preview */}
      {attrs.exerciseType ? (
        <div
          style={{
            minHeight: 320,
            position: "relative",
            background: "var(--paper)",
          }}
        >
          <V2LessonRunner steps={runnerSteps} />
        </div>
      ) : (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--ink-400)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          Pick an exercise type to see a preview.
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const V2Exercise = Node.create({
  name: "v2Exercise",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      exerciseType: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-exercise-type") || "",
        renderHTML: (attrs) => ({
          "data-exercise-type": attrs.exerciseType,
        }),
      },
      props: {
        default: {},
        parseHTML: (el) => {
          const raw = el.getAttribute("data-props");
          if (!raw) return {};
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        },
        renderHTML: (attrs) => ({
          "data-props": JSON.stringify(attrs.props ?? {}),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="v2-exercise"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "v2-exercise",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NodeView);
  },

  addCommands() {
    return {
      setV2Exercise:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              exerciseType: attrs?.exerciseType ?? "quiz",
              props: attrs?.props ?? DEFAULT_PROPS.quiz,
            },
          });
        },
    };
  },
});
