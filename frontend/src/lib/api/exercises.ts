import apiClient from "@/lib/api-client";
import {
 ArrowUpDown,
 BookOpenText,
 Bot,
 Box,
 Calculator,
 CircleDot,
 ClipboardList,
 Code,
 FolderOpen,
 Globe,
 Grid3x3,
 Languages,
 Layers,
 MapPin,
 MessageCircle,
 Package,
 PenLine,
 Puzzle,
 Search,
 Sigma,
 Table,
 ToggleLeft,
 Type,
 Upload,
 type LucideIcon,
} from "lucide-react";

export type ExerciseType =
 | "quiz"
 | "code_challenge"
 | "matching"
 | "ordering"
 | "fill_blanks"
 | "true_false"
 | "categorize"
 | "file_upload"
 | "robot_2d"
 | "math_interactive"
 | "world_3d"
 | "translation"
 | "sentence_builder"
 | "dialogue"
 | "conjugation"
 | "reading"
 | "web_editor"
 | "scorm_package"
 | "math_stepwise"
 | "math_system"
 | "stereometry"
 | "srs_flashcard"
 | "crossword"
 | "word_search"
 | "map_pin_drop"
 | "bubble_sheet";

export interface Exercise {
 id: string;
 lesson_id: string;
 org_id: string;
 display_id: string;
 exercise_type: ExerciseType;
 title: string;
 config: Record<string, unknown>;
 sort_order: number;
 created_at: string;
 updated_at: string;
 questions?: ExerciseQuestion[];
 test_cases?: ExerciseTestCase[];
}

export interface ExerciseQuestion {
 id: string;
 question_text: string;
 question_type: string;
 options: Array<{ id?: number; text: string; is_correct?: boolean }> | null;
 correct_answer: string | null;
 points: number;
 sort_order: number;
}

export interface ExerciseTestCase {
 id: string;
 input: string;
 expected_output: string;
 is_hidden: boolean;
 sort_order: number;
}

export interface ExerciseSubmission {
 id: string;
 exercise_id: string;
 student_id: string;
 answers: Record<string, unknown> | null;
 score: number | null;
 passed: boolean | null;
 status: string;
 source_code: string | null;
 language: string | null;
 execution_time_ms: number | null;
 total_passed: number | null;
 total_tests: number | null;
 results: Record<string, unknown> | null;
 original_filename: string | null;
 file_size: number | null;
 mime_type: string | null;
 submitted_at: string;
 graded_at: string | null;
 created_at: string;
 student_name?: string;
 // Phase 1 time-on-task analytics (nullable for legacy rows / clients).
 started_at?: string | null;
 time_spent_seconds?: number | null;
 attempt_number?: number | null;
}

export interface ExerciseListResponse {
 items: Exercise[];
 total: number;
 page: number;
 per_page: number;
}

export interface SubmissionListResponse {
 items: ExerciseSubmission[];
 total: number;
 page: number;
 per_page: number;
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
 quiz: "Quiz",
 code_challenge: "Code Challenge",
 matching: "Matching",
 ordering: "Ordering",
 fill_blanks: "Fill Blanks",
 true_false: "True/False",
 categorize: "Categorize",
 file_upload: "File Upload",
 robot_2d: "2D Robot",
 math_interactive: "Math Interactive",
 world_3d: "3D World",
 translation: "Translation",
 sentence_builder: "Sentence Builder",
 dialogue: "Dialogue",
 conjugation: "Conjugation",
 reading: "Reading",
 web_editor: "Web Editor",
 scorm_package: "SCORM / xAPI",
 math_stepwise: "Math Step-by-Step",
 math_system: "System of Equations",
 stereometry: "Solids",
 srs_flashcard: "Flashcards (SRS)",
 crossword: "Crossword",
 word_search: "Word Search",
 map_pin_drop: "Map Pin Drop",
 bubble_sheet: "Bubble Sheet",
};

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
 quiz: "bg-info-soft text-info-fg ",
 code_challenge: "bg-primary-soft text-success-fg ",
 matching: "bg-primary-soft text-success-fg ",
 ordering: "bg-sun-100 text-warning-fg ",
 fill_blanks: " text-text ",
 true_false: "bg-info-soft text-info-fg ",
 categorize: "bg-clay-300 text-clay-700 ",
 file_upload: "bg-ink-100 text-ink-700 ",
 robot_2d: "bg-primary-soft text-success-fg ",
 math_interactive: "bg-primary-soft text-info-fg ",
 world_3d: "bg-primary-soft text-success-fg ",
 translation: "bg-primary-soft text-info-fg ",
 sentence_builder: "bg-info-soft text-info-fg ",
 dialogue: "bg-lagoon-200 text-lagoon-800 ",
 conjugation: " text-text ",
 reading: "bg-primary-soft text-success-fg ",
 web_editor: "bg-ink-100 text-ink-700 ",
 scorm_package: "bg-info-soft text-info-fg ",
 math_stepwise: "bg-primary-soft text-info-fg ",
 math_system: "bg-primary-soft text-info-fg ",
 stereometry: "bg-lagoon-200 text-lagoon-800 ",
 srs_flashcard: "bg-sun-100 text-warning-fg ",
 crossword: "bg-lagoon-200 text-lagoon-800 ",
 word_search: "bg-info-soft text-info-fg ",
 map_pin_drop: "bg-clay-300 text-clay-700 ",
 bubble_sheet: "bg-ink-100 text-ink-700 ",
};

// Single source of truth for exercise-type menus. UI components (content
// library filter, course-editor "create exercise" picker, lesson WYSIWYG)
// iterate this list. `Icon` is a lucide-react component — render as
// `<meta.Icon className="..." />`. No emoji.
export type ExerciseGroupKey = "basic" | "math" | "languages" | "programming" | "scorm";

export interface ExerciseTypeMeta {
 value: ExerciseType;
 label: string;
 Icon: LucideIcon;
 group: ExerciseGroupKey;
}

export const EXERCISE_TYPES_META: ExerciseTypeMeta[] = [
 { value: "quiz", label: "Quiz", Icon: ClipboardList, group: "basic" },
 { value: "code_challenge", label: "Code Challenge", Icon: Code, group: "programming" },
 { value: "matching", label: "Matching", Icon: Puzzle, group: "basic" },
 { value: "ordering", label: "Ordering", Icon: ArrowUpDown, group: "basic" },
 { value: "fill_blanks", label: "Fill Blanks", Icon: PenLine, group: "basic" },
 { value: "true_false", label: "True/False", Icon: ToggleLeft, group: "basic" },
 { value: "categorize", label: "Categorize", Icon: FolderOpen, group: "basic" },
 { value: "file_upload", label: "File Upload", Icon: Upload, group: "basic" },
 { value: "robot_2d", label: "2D Robot", Icon: Bot, group: "programming" },
 { value: "math_interactive", label: "Math Interactive", Icon: Calculator, group: "math" },
 { value: "math_stepwise", label: "Math Step-by-Step", Icon: Sigma, group: "math" },
 { value: "math_system", label: "System of Equations", Icon: Sigma, group: "math" },
 { value: "stereometry", label: "Solids", Icon: Box, group: "math" },
 { value: "world_3d", label: "3D World", Icon: Box, group: "programming" },
 { value: "translation", label: "Translation", Icon: Languages, group: "languages" },
 { value: "sentence_builder", label: "Sentence Builder", Icon: Type, group: "languages" },
 { value: "dialogue", label: "Dialogue", Icon: MessageCircle, group: "languages" },
 { value: "conjugation", label: "Conjugation", Icon: Table, group: "languages" },
 { value: "reading", label: "Reading", Icon: BookOpenText, group: "languages" },
 { value: "web_editor", label: "Web Editor", Icon: Globe, group: "programming" },
 { value: "scorm_package", label: "SCORM / xAPI", Icon: Package, group: "scorm" },
 { value: "srs_flashcard", label: "Flashcards (SRS)", Icon: Layers, group: "languages" },
 { value: "crossword", label: "Crossword", Icon: Grid3x3, group: "languages" },
 { value: "word_search", label: "Word Search", Icon: Search, group: "languages" },
 { value: "map_pin_drop", label: "Map Pin Drop", Icon: MapPin, group: "basic" },
 { value: "bubble_sheet", label: "Bubble Sheet", Icon: CircleDot, group: "basic" },
];

// Subject groups for pickers/filters, derived from the meta so the two can
// never drift (specs/017 US4). Label text comes from i18n via labelKey.
export interface ExerciseGroup {
 key: ExerciseGroupKey;
 labelKey: string;
 types: ExerciseType[];
}

const GROUP_ORDER: ExerciseGroupKey[] = ["basic", "math", "languages", "programming", "scorm"];

export const EXERCISE_GROUPS: ExerciseGroup[] = GROUP_ORDER.map((key) => ({
 key,
 labelKey: `exerciseGroups.${key}`,
 types: EXERCISE_TYPES_META.filter((m) => m.group === key).map((m) => m.value),
}));

/** Resolve a Lucide icon component for a given exercise type. */
export function getExerciseIcon(type: ExerciseType): LucideIcon {
 return EXERCISE_TYPES_META.find((m) => m.value === type)?.Icon || ClipboardList;
}

export const ALL_EXERCISE_TYPES: ExerciseType[] = EXERCISE_TYPES_META.map((m) => m.value);

/**
 * Time-on-task helper (Phase 1 analytics). Call `startExerciseTimer()` when an
 * exercise mounts/opens for the student; call `.elapsedSeconds()` at submit time
 * and pass the result as `elapsed_seconds` in the submit payload. The backend
 * clamps to [0, 24h], so light tab-switch inflation is tolerable; we don't try
 * to pause on visibility change (deliberately simple — see Phase 1 spec).
 */
export interface ExerciseTimer {
 elapsedSeconds: () => number;
}

export function startExerciseTimer(): ExerciseTimer {
 const start = Date.now();
 return {
  elapsedSeconds: () => Math.max(0, Math.round((Date.now() - start) / 1000)),
 };
}

/**
 * What the server saw when it ran a robot program.
 *
 * Every figure here is the server's own, from its own replay. The client sends
 * a program and is told what happened; it never reports an outcome and is never
 * asked for one.
 */
export interface RobotRunResult {
 frames: RobotFrame[];
 won: boolean;
 steps: number;
 /** Statements in the program that ran — the same rule for blocks and Python. */
 size: number;
 stars: number;
 stopped: "end_of_program" | "steps_exhausted" | "error";
 /** What the pupil printed, apart from what the robot did. */
 output: string;
 output_truncated: boolean;
 error: { type: string; line: number | null; message: string } | null;
}

export interface RobotFrame {
 i: number;
 cmd: string;
 ok: boolean;
 x: number;
 y: number;
 facing: "up" | "right" | "down" | "left";
 carrying: number;
 items_left: number;
 cells: { x: number; y: number; item?: boolean; painted?: boolean; value?: number }[];
 /** A refusal key — `wall`, `edge`, `no_item`. Translated before display. */
 msg: string | null;
}

/** A reason a level is not ready. `code` is a key, rendered in the teacher's language. */
export interface RobotBlocker {
 code: string;
 commands?: string[];
}

/**
 * What the Check button learned.
 *
 * `answer` is the field that matters. A `shortest` count is an optimum; a
 * `reference_only` count is what the teacher's own solution happened to take,
 * and showing the second as the first is the thing the editor must never do.
 */
export interface RobotSolveAnswer {
 answer: "shortest" | "reference_only" | "unsolvable";
 steps: number | null;
 size: number | null;
 /** Why no search was run: `too_many_targets` or `win_uses_values`. */
 reason: string | null;
 blockers: RobotBlocker[];
}

// ─── World 3D ───────────────────────────────────────────────────────
//
// The same shapes as the Robot ones above, because the two exercise types ask
// the server the same two questions. See `specs/012-world-3d-rework/`.

export interface WorldRunResult {
  frames: WorldFrame[];
  won: boolean;
  steps: number;
  /** Statements in the program that ran — the same rule for blocks and Python. */
  size: number;
  stars: number;
  stopped: "end_of_program" | "steps_exhausted" | "error";
  /** What the pupil printed, apart from what the character did. */
  output: string;
  output_truncated: boolean;
  error: { type: string; line: number | null; message: string } | null;
}

export interface WorldFrame {
  i: number;
  cmd: string;
  ok: boolean;
  x: number;
  z: number;
  /** Height — the surface the character now stands on. */
  y: number;
  facing: "north" | "east" | "south" | "west";
  /**
   * What the scene should animate. Recorded rather than inferred: a jump, a
   * climb and a fall all move the character one square, and telling them apart
   * by comparing coordinates is the guesswork this field removes.
   */
  motion: "walk" | "climb" | "jump" | "fall" | "turn" | "none";
  carrying: number;
  items_left: number;
  cells: { x: number; z: number; y: number; item?: boolean; pressed?: boolean; open?: boolean }[];
  /** A refusal key — `wall`, `edge`, `too_high`. Translated before display. */
  msg: string | null;
}

export interface WorldBlocker {
  code: string;
  commands?: string[];
}

/**
 * What the Check button learned.
 *
 * `answer` is the field that matters. A `shortest` count is an optimum; a
 * `reference_only` count is what the teacher's own solution happened to take,
 * and showing the second as the first is the thing the editor must never do.
 */
export interface WorldSolveAnswer {
  answer: "shortest" | "reference_only" | "unsolvable";
  steps: number | null;
  size: number | null;
  /** Why no search was run: `too_many_targets` or `win_uses_steps`. */
  reason: string | null;
  blockers: WorldBlocker[];
}

export const exercisesApi = {
 list: (params?: {
 exercise_type?: ExerciseType;
 lesson_id?: string;
 search?: string;
 page?: number;
 per_page?: number;
 }) => apiClient.get<ExerciseListResponse>("/exercises", { params }),

 get: (id: string) => apiClient.get<Exercise>(`/exercises/${id}`),

 getByLesson: (lessonId: string) =>
 apiClient.get<Exercise[]>(`/exercises/by-lesson/${lessonId}`),

 create: (data: {
 lesson_id: string;
 exercise_type: ExerciseType;
 title: string;
 config?: Record<string, unknown>;
 sort_order?: number;
 }) => apiClient.post<Exercise>("/exercises", data),

 update: (id: string, data: { title?: string; config?: Record<string, unknown>; sort_order?: number }) =>
 apiClient.put<Exercise>(`/exercises/${id}`, data),

 delete: (id: string) => apiClient.delete(`/exercises/${id}`),

 // Robot 2D. Note what goes up: the program, and nothing about how it went.
 // The server runs it and reaches its own verdict — see
 // `specs/005-robot-2d-rework/contracts/api.md`.
 runRobot: (id: string, data: { source: string; mode: "python" | "blocks" }) =>
 apiClient.post<RobotRunResult>(`/exercises/${id}/robot/run`, data),

 /** Playtest a level nobody has saved yet. Staff only. */
 previewRobotLevel: (data: { config: Record<string, unknown>; source: string }) =>
 apiClient.post<RobotRunResult>("/exercises/robot/preview", data),

 /** Can this level be finished, and in how few steps. Staff only. */
 solveRobotLevel: (data: { config: Record<string, unknown> }) =>
 apiClient.post<RobotSolveAnswer>("/exercises/robot/solve", data),

 /**
 * Run a 3D program. Free — it never costs an attempt, because pressing Run is
 * how a child finds out what their program does.
 */
 runWorld: (id: string, data: { source: string; mode: "python" | "blocks" }) =>
 apiClient.post<WorldRunResult>(`/exercises/${id}/world/run`, data),

 /** Playtest a 3D level nobody has saved yet. Staff only. */
 previewWorldLevel: (data: { config: Record<string, unknown>; source: string }) =>
 apiClient.post<WorldRunResult>("/exercises/world/preview", data),

 /** Can this 3D level be finished, and in how few steps. Staff only. */
 solveWorldLevel: (data: { config: Record<string, unknown> }) =>
 apiClient.post<WorldSolveAnswer>("/exercises/world/solve", data),

 // Submissions
 submit: (id: string, data: Record<string, unknown>) =>
 apiClient.post<ExerciseSubmission>(`/exercises/${id}/submit`, data),

 uploadFile: (id: string, file: File) => {
 const formData = new FormData();
 formData.append("file", file);
 return apiClient.post<ExerciseSubmission>(`/exercises/${id}/upload`, formData, {
 headers: { "Content-Type": "multipart/form-data" },
 });
 },

 listSubmissions: (id: string, params?: { page?: number; per_page?: number }) =>
 apiClient.get<SubmissionListResponse>(`/exercises/${id}/submissions`, { params }),

 // Questions (quiz exercises)
 addQuestion: (exerciseId: string, data: Record<string, unknown>) =>
 apiClient.post<ExerciseQuestion>(`/exercises/${exerciseId}/questions`, data),

 updateQuestion: (exerciseId: string, questionId: string, data: Record<string, unknown>) =>
 apiClient.put<ExerciseQuestion>(`/exercises/${exerciseId}/questions/${questionId}`, data),

 deleteQuestion: (exerciseId: string, questionId: string) =>
 apiClient.delete(`/exercises/${exerciseId}/questions/${questionId}`),

 // Test cases (code challenge exercises)
 addTestCase: (exerciseId: string, data: Record<string, unknown>) =>
 apiClient.post<ExerciseTestCase>(`/exercises/${exerciseId}/test-cases`, data),

 updateTestCase: (exerciseId: string, testCaseId: string, data: Record<string, unknown>) =>
 apiClient.patch<ExerciseTestCase>(`/exercises/${exerciseId}/test-cases/${testCaseId}`, data),

 deleteTestCase: (exerciseId: string, testCaseId: string) =>
 apiClient.delete(`/exercises/${exerciseId}/test-cases/${testCaseId}`),
};
