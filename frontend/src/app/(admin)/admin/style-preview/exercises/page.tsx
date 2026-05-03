"use client";

import { useMemo, useState } from "react";
import TrueFalseExercise from "@/components/submissions/exercises/true-false";
import MatchingExercise from "@/components/submissions/exercises/matching";
import OrderingExercise from "@/components/submissions/exercises/ordering";
import FillBlanksExercise from "@/components/submissions/exercises/fill-blanks";
import CategorizeExercise from "@/components/submissions/exercises/categorize";
import SrsFlashcardExercise from "@/components/submissions/exercises/srs-flashcard";

type ExerciseType =
  | "true_false"
  | "matching"
  | "ordering"
  | "fill_blanks"
  | "categorize"
  | "translation"
  | "sentence_builder"
  | "dialogue"
  | "conjugation"
  | "reading"
  | "code_challenge"
  | "math_interactive"
  | "file_upload"
  | "quiz"
  | "web_editor"
  | "srs_flashcard"
  | "crossword"
  | "word_search"
  | "map_pin_drop"
  | "bubble_sheet";

const SAMPLE_CONFIGS: Record<ExerciseType, object> = {
  true_false: {
    statement: "GrassLMS primary action color is green-600 (#0a8754).",
    correct_answer: true,
  },
  matching: {
    pairs: [
      { left: "France", right: "Paris" },
      { left: "Italy", right: "Rome" },
      { left: "Germany", right: "Berlin" },
    ],
    shuffle: true,
  },
  ordering: {
    items: ["5", "1", "3", "7"],
    correct_order: ["1", "3", "5", "7"],
  },
  fill_blanks: {
    text: "The {{blank}} fox jumps over the {{blank}}.",
    blanks: ["quick", "lazy dog"],
    word_bank: ["quick", "slow", "lazy dog", "fox"],
  },
  categorize: {
    categories: [
      { name: "Mammals", items: ["Dog", "Cat"] },
      { name: "Birds", items: ["Eagle", "Owl"] },
    ],
  },
  translation: {
    source_text: "Hello, world!",
    source_language: "en",
    target_language: "es",
    accepted_answers: ["Hola, mundo!", "¡Hola, mundo!"],
    case_sensitive: false,
    hints: ["greeting", "casual"],
  },
  sentence_builder: {
    words: ["The", "cat", "sat", "on", "the", "mat"],
    correct_order: ["The", "cat", "sat", "on", "the", "mat"],
    distractors: ["dog", "ran"],
    instructions: "Build the sentence",
  },
  dialogue: {
    context: "Meeting a friend on the street",
    messages: [
      { speaker: "A", text: "Hi! How are you?" },
      { speaker: "B", text: "______" },
    ],
  },
  conjugation: {
    verb: "to be",
    tense: "present",
    language: "en",
    table: [
      { pronoun: "I", correct: "am" },
      { pronoun: "you", correct: "are" },
      { pronoun: "he/she/it", correct: "is" },
    ],
  },
  reading: {
    passage: "The fox is quick. It jumps over the lazy dog.",
    questions: [
      { question: "What is the fox?", type: "multiple_choice", options: ["quick", "slow"], correct_answer: "quick" },
    ],
  },
  code_challenge: {
    language: "python",
    starter_code: "def add(a, b):\n    pass\n",
    solution_code: "def add(a, b):\n    return a + b\n",
    time_limit_seconds: 10,
    memory_limit_mb: 256,
  },
  math_interactive: {
    template_type: "coordinate_plane",
    template_config: {},
    instructions: "Drag each point to its target",
    difficulty: "beginner",
  },
  file_upload: {
    allowed_types: [".pdf", ".png", ".jpg"],
    max_file_mb: 10,
  },
  quiz: { passing_score: 70, time_limit_minutes: null },
  web_editor: {
    description: "Build a card",
    starter_html: "<div class=\"card\">...</div>",
    starter_css: ".card { padding: 20px; }",
    starter_js: "",
    requirements: ["Use flexbox"],
  },
  srs_flashcard: {
    cards: [
      { front: "Hola", back: "Hello" },
      { front: "Adiós", back: "Goodbye" },
      { front: "Gracias", back: "Thank you" },
      { front: "Por favor", back: "Please" },
    ],
    instructions: "Spanish basics",
    daily_new_cards: 4,
    daily_review_cap: 100,
    show_audio: false,
  },
  crossword: {
    rows: 5,
    cols: 5,
    grid: [],
    clues: [],
    title: "Demo crossword (UI not yet implemented)",
  },
  word_search: {
    rows: 8,
    cols: 8,
    words: ["CAT", "DOG", "BIRD"],
    grid: [],
    diagonals: true,
    backwards: true,
  },
  map_pin_drop: {
    targets: [
      { label: "Paris", lat: 48.8566, lng: 2.3522, tolerance_km: 50 },
    ],
    initial_center: [48.8566, 2.3522],
    initial_zoom: 4,
    show_labels: true,
  },
  bubble_sheet: {
    title: "Sample test",
    questions: [
      { number: 1, options: ["A", "B", "C", "D"], correct: "B" },
      { number: 2, options: ["A", "B", "C", "D"], correct: "A" },
    ],
  },
};

const TYPE_LABELS: Record<ExerciseType, string> = {
  true_false: "True / False",
  matching: "Matching",
  ordering: "Ordering",
  fill_blanks: "Fill blanks",
  categorize: "Categorize",
  translation: "Translation",
  sentence_builder: "Sentence Builder",
  dialogue: "Dialogue",
  conjugation: "Conjugation",
  reading: "Reading",
  code_challenge: "Code Challenge",
  math_interactive: "Math Interactive",
  file_upload: "File Upload",
  quiz: "Quiz",
  web_editor: "Web Editor",
  srs_flashcard: "SRS Flashcard",
  crossword: "Crossword (scaffold)",
  word_search: "Word Search (scaffold)",
  map_pin_drop: "Map Pin-Drop (scaffold)",
  bubble_sheet: "Bubble Sheet (scaffold)",
};

const ALL_TYPES = Object.keys(SAMPLE_CONFIGS) as ExerciseType[];

export default function ExercisePreviewPage() {
  const [type, setType] = useState<ExerciseType>("srs_flashcard");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [text, setText] = useState<string>(JSON.stringify(SAMPLE_CONFIGS["srs_flashcard"], null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      const obj = JSON.parse(text);
      setParseError(null);
      return obj;
    } catch (e) {
      setParseError(String((e as Error).message));
      return null;
    }
  }, [text]);

  const switchType = (t: ExerciseType) => {
    setType(t);
    setText(JSON.stringify(SAMPLE_CONFIGS[t], null, 2));
    setTab("edit");
  };

  const onSubmit = (answers: unknown) => {
    // eslint-disable-next-line no-console
    console.log("[preview] submit", answers);
    alert("Submitted (preview mode):\n\n" + JSON.stringify(answers, null, 2));
  };

  const renderExercise = () => {
    if (!parsed) return <div className="text-center text-ink-500">Fix JSON errors first.</div>;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const cfg = parsed as any;
    switch (type) {
      case "true_false":
        return <TrueFalseExercise statement={cfg.statement || ""} onSubmit={onSubmit} />;
      case "matching":
        return <MatchingExercise pairs={cfg.pairs || []} onSubmit={onSubmit} />;
      case "ordering":
        return <OrderingExercise items={cfg.items || []} onSubmit={onSubmit} />;
      case "fill_blanks": {
        const text = cfg.text || "";
        const words = cfg.word_bank || cfg.blanks || [];
        const blankCount = (text.match(/\{\{blank\}\}/g) || []).length;
        return (
          <FillBlanksExercise
            textTemplate={text}
            blankCount={blankCount}
            words={words}
            onSubmit={onSubmit}
          />
        );
      }
      case "categorize": {
        const cats = cfg.categories || [];
        const allItems = cats.flatMap((c: { items: string[] }) => c.items);
        return <CategorizeExercise categories={cats} allItems={allItems} onSubmit={onSubmit} />;
      }
      case "srs_flashcard":
        return (
          <SrsFlashcardExercise
            exerciseId="preview"
            cards={cfg.cards || []}
            instructions={cfg.instructions}
            dailyNewCards={cfg.daily_new_cards}
            dailyReviewCap={cfg.daily_review_cap}
            onSubmit={onSubmit}
          />
        );
      case "crossword":
      case "word_search":
      case "map_pin_drop":
      case "bubble_sheet":
        return (
          <div className="rounded-lg border border-sun-300 bg-sun-50 p-6 text-sm text-sun-700">
            <strong>{TYPE_LABELS[type]}</strong> — UI-renderer ещё не реализован.
            Backend Pydantic-схема + MCP tool готовы; визуальный рендерер
            будет добавлен в отдельном спринте.
          </div>
        );
      default:
        return (
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-6 text-sm text-ink-600">
            Этот тип уже работает в полном lesson-player. Используй
            существующий курс &quot;DS Showcase Course&quot; для проверки в боевом
            окружении.
          </div>
        );
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
          Exercise <span className="gl-highlight">preview</span>
        </h1>
        <p className="mt-2 text-base text-ink-500">
          Pick a type, edit the config JSON in the left tab, switch to Preview to see how a student renders it.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-ink-700 mb-2">Exercise type</label>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === t
                  ? "bg-green-600 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-ink-200">
        <button
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "edit" ? "border-b-2 border-green-600 text-green-700" : "text-ink-500 hover:text-ink-700"
          }`}
          onClick={() => setTab("edit")}
        >
          1. Fill / Edit
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "preview" ? "border-b-2 border-green-600 text-green-700" : "text-ink-500 hover:text-ink-700"
          }`}
          onClick={() => setTab("preview")}
        >
          2. Preview
        </button>
      </div>

      {tab === "edit" ? (
        <div>
          {parseError && (
            <div className="mb-3 rounded-lg border border-coral-300 bg-coral-50 px-4 py-2 text-sm text-coral-700">
              JSON parse error: {parseError}
            </div>
          )}
          <textarea
            className="w-full h-[600px] rounded-xl border border-ink-200 bg-paper-2 p-4 font-mono text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-ink-400 font-mono">
            Schema reference:{" "}
            <a href="/api/v1/exercises/config-schemas" target="_blank" className="text-green-700 underline">
              GET /api/v1/exercises/config-schemas
            </a>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-ink-200 bg-paper-2 p-6">
          {renderExercise()}
        </div>
      )}
    </div>
  );
}
