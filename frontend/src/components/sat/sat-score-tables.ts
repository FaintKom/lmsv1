/**
 * SAT Math Score Conversion Tables
 *
 * Piecewise linear tables modeled on published College Board practice tests.
 * Two curves: one for students routed to Hard Module 2, one for Easy.
 * Mini/practice tests use a "none" route that averages the two curves.
 */

// anchor points: [rawCorrect, scaledScore]
const HARD_ROUTE: [number, number][] = [
 [0, 200],
 [4, 250],
 [8, 310],
 [12, 380],
 [16, 450],
 [20, 510],
 [24, 560],
 [28, 620],
 [32, 670],
 [36, 720],
 [40, 760],
 [44, 800],
];

const EASY_ROUTE: [number, number][] = [
 [0, 200],
 [4, 230],
 [8, 270],
 [12, 320],
 [16, 370],
 [20, 420],
 [24, 470],
 [28, 510],
 [32, 550],
 [36, 590],
 [40, 620],
 [44, 650],
];

function interpolate(table: [number, number][], raw: number): number {
 if (raw <= table[0][0]) return table[0][1];
 if (raw >= table[table.length - 1][0]) return table[table.length - 1][1];

 for (let i = 0; i < table.length - 1; i++) {
 const [r0, s0] = table[i];
 const [r1, s1] = table[i + 1];
 if (raw >= r0 && raw <= r1) {
 const t = (raw - r0) / (r1 - r0);
 return Math.round(s0 + t * (s1 - s0));
 }
 }
 return 200; // fallback
}

/**
 * Convert raw correct count to estimated SAT Math scaled score (200-800).
 *
 * @param rawCorrect Number of correct answers
 * @param totalQuestions Total questions in the test
 * @param module2Route "hard" | "easy" | "none" (none = average for mini/practice)
 */
export function convertRawToScaled(
 rawCorrect: number,
 totalQuestions: number,
 module2Route: "hard" | "easy" | "none"
): number {
 // Normalize to 44-question scale if the test has fewer questions
 const normalized = totalQuestions === 44
 ? rawCorrect
 : Math.round((rawCorrect / totalQuestions) * 44);

 const clamped = Math.max(0, Math.min(44, normalized));

 if (module2Route === "hard") return interpolate(HARD_ROUTE, clamped);
 if (module2Route === "easy") return interpolate(EASY_ROUTE, clamped);

 // "none" — average both tables (for mini tests / domain practice)
 const h = interpolate(HARD_ROUTE, clamped);
 const e = interpolate(EASY_ROUTE, clamped);
 return Math.round((h + e) / 2);
}

/**
 * Get the maximum possible score for a given route.
 */
export function getMaxScore(module2Route: "hard" | "easy" | "none"): number {
 if (module2Route === "hard") return 800;
 if (module2Route === "easy") return 650;
 return 725; // average
}
