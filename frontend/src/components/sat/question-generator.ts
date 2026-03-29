import type { SATQuestion, SATDomain, SATDifficulty } from "./sat-question-bank";

// ─── Utilities ──────────────────────────────────────────────────────

/** Random integer in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random non-zero integer in [-max, -1] ∪ [1, max] */
function randNonZero(max: number): number {
  const v = randInt(1, max);
  return Math.random() < 0.5 ? -v : v;
}

/** Random from array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Shuffle array */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Format number nicely */
function fmt(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
}

/** Generate 3 plausible wrong MC answers near the correct one */
function distractors(correct: number, style: "near" | "mistakes" = "near"): string[] {
  const set = new Set<number>();
  if (style === "near") {
    set.add(correct + randInt(1, 3));
    set.add(correct - randInt(1, 3));
    set.add(correct * 2);
    set.add(Math.abs(correct) + randInt(1, 5));
    set.add(-correct);
  } else {
    set.add(correct + 1);
    set.add(correct - 1);
    set.add(correct * 2);
    set.add(correct + randInt(2, 6));
    set.add(correct - randInt(2, 6));
  }
  set.delete(correct);
  const arr = [...set].filter((n) => isFinite(n)).map((n) => fmt(n));
  while (arr.length < 3) arr.push(fmt(correct + arr.length + 2));
  return shuffle(arr).slice(0, 3);
}

/** Build MC question from correct answer + distractors */
function mc(id: string, domain: SATDomain, diff: SATDifficulty, question: string, correct: number | string, explanation: string, wrongAnswers?: string[]): SATQuestion {
  const correctStr = typeof correct === "number" ? fmt(correct) : correct;
  const wrongs = wrongAnswers || (typeof correct === "number" ? distractors(correct) : []);
  const choices = shuffle([
    { text: correctStr, correct: true },
    ...wrongs.slice(0, 3).map((w) => ({ text: w, correct: false })),
  ]);
  return {
    id, domain, difficulty: diff, template_type: "multiple_choice_math",
    config: { question, choices, explanation, standard: `SAT.${domain === "algebra" ? "Algebra" : domain === "advanced_math" ? "Advanced Math" : domain === "problem_solving" ? "Problem Solving" : "Geometry"}` },
  };
}

/** Build numeric input question */
function num(id: string, domain: SATDomain, diff: SATDifficulty, question: string, correct: number, explanation: string, tol = 0.01): SATQuestion {
  return {
    id, domain, difficulty: diff, template_type: "numeric_input",
    config: { question, correct_answers: [correct], tolerance: tol, allow_fraction: true, allow_decimal: true, explanation, standard: `SAT.${domain === "algebra" ? "Algebra" : domain === "advanced_math" ? "Advanced Math" : domain === "problem_solving" ? "Problem Solving" : "Geometry"}` },
  };
}

type Gen = () => SATQuestion;
let _counter = 0;
function uid(): string { return `gen-${++_counter}-${Date.now().toString(36)}`; }

// ═══════════════════════════════════════════════════════════════════
// ALGEBRA GENERATORS
// ═══════════════════════════════════════════════════════════════════

const algebraGenerators: Gen[] = [
  // 1. Linear equation: ax + b = c
  () => {
    const a = randNonZero(8); const x = randInt(-10, 10); const b = randInt(-15, 15); const c = a * x + b;
    return pick([true, false])
      ? mc(uid(), "algebra", 1, `Solve: ${a}x + ${b} = ${c}`, x, `${a}x = ${c} - ${b} = ${c - b}. x = ${c - b}/${a} = ${x}.`)
      : num(uid(), "algebra", 1, `If ${a}x + ${b} = ${c}, what is x?`, x, `${a}x = ${c - b}, x = ${x}.`);
  },

  // 2. Distribution: a(bx + c) = d
  () => {
    const a = randNonZero(4); const b = randNonZero(3); const x = randInt(-5, 5); const c = randInt(-8, 8);
    const d = a * (b * x + c);
    return num(uid(), "algebra", 2, `Solve: ${a}(${b}x + ${c}) = ${d}`, x, `${a * b}x + ${a * c} = ${d}. ${a * b}x = ${d - a * c}. x = ${x}.`);
  },

  // 3. Slope from two points
  () => {
    const x1 = randInt(-5, 5); const x2 = x1 + randInt(1, 6);
    const m = pick([1, 2, 3, -1, -2, -3, 0.5, -0.5]);
    const y1 = randInt(-5, 5); const y2 = y1 + m * (x2 - x1);
    return mc(uid(), "algebra", 2, `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${fmt(y2)})?`, m,
      `Slope = (${fmt(y2)} - ${y1}) / (${x2} - ${x1}) = ${fmt(y2 - y1)} / ${x2 - x1} = ${fmt(m)}.`);
  },

  // 4. Slope-intercept from standard form
  () => {
    const A = randNonZero(6); const B = pick([-4, -3, -2, -1, 1, 2, 3, 4].filter(b => b !== 0));
    const C = randInt(-10, 10);
    const slope = -A / B; const intercept = C / B;
    return mc(uid(), "algebra", 2, `What is the slope of ${A}x + ${B}y = ${C}?`, slope,
      `${B}y = -${A}x + ${C}. y = ${fmt(-A / B)}x + ${fmt(C / B)}. Slope = ${fmt(slope)}.`);
  },

  // 5. Y-intercept
  () => {
    const m = randNonZero(5); const b = randInt(-10, 10);
    return mc(uid(), "algebra", 1, `What is the y-intercept of y = ${m}x + ${b}?`, b,
      `In y = mx + b form, the y-intercept is b = ${b}.`, distractors(b));
  },

  // 6. System of equations (elimination)
  () => {
    const x = randInt(-5, 5); const y = randInt(-5, 5);
    const a1 = randNonZero(3); const b1 = randNonZero(3);
    const a2 = randNonZero(3); const b2 = randNonZero(3);
    const c1 = a1 * x + b1 * y; const c2 = a2 * x + b2 * y;
    return num(uid(), "algebra", 2, `Solve: ${a1}x + ${b1}y = ${c1} and ${a2}x + ${b2}y = ${c2}. What is x?`, x,
      `Using elimination or substitution: x = ${x}, y = ${y}.`);
  },

  // 7. Perpendicular slope
  () => {
    const m = pick([2, 3, 4, -2, -3, 1, -1, 0.5, -0.5]);
    const perpM = -1 / m;
    return mc(uid(), "algebra", 2, `A line has slope ${fmt(m)}. What is the slope of a perpendicular line?`, perpM,
      `Perpendicular slopes: m₁ × m₂ = -1. So m₂ = ${fmt(perpM)}.`);
  },

  // 8. Absolute value
  () => {
    const a = randInt(1, 8); const b = randInt(1, 12);
    const x1 = a + b; const x2 = a - b;
    return num(uid(), "algebra", 2, `If |x - ${a}| = ${b}, what is the positive value of x?`, Math.max(x1, x2),
      `x - ${a} = ${b} → x = ${x1}, or x - ${a} = -${b} → x = ${x2}. Positive: ${Math.max(x1, x2)}.`);
  },

  // 9. Linear inequality
  () => {
    const a = randInt(2, 6); const b = randInt(1, 20);
    const c = randInt(10, 50);
    const ans = Math.floor((c - b) / a);
    return mc(uid(), "algebra", 1, `Which is the solution to ${a}x + ${b} ≤ ${c}?`,
      `x ≤ ${ans}`, `${a}x ≤ ${c - b}. x ≤ ${ans}.`,
      [`x ≥ ${ans}`, `x ≤ ${ans + 2}`, `x ≥ ${ans - 1}`]);
  },

  // 10. Parallel lines (no solution)
  () => {
    const m = randInt(1, 5); const b1 = randInt(-5, 5); const b2 = b1 + randNonZero(4);
    return mc(uid(), "algebra", 3, `The system y = ${m}x + ${b1} and y = ${m}x + ${b2} has:`,
      "No solution", `Same slope (${m}), different intercepts → parallel lines → no solution.`,
      ["One solution", "Infinitely many solutions", "Two solutions"]);
  },

  // 11. Word problem: taxi/service cost
  () => {
    const base = pick([2, 3, 4, 5]); const rate = pick([0.5, 0.75, 1, 1.5, 2]);
    const miles = randInt(5, 20); const cost = base + rate * miles;
    return num(uid(), "algebra", 2, `A taxi charges $${base} plus $${fmt(rate)} per mile. How much for ${miles} miles?`, cost,
      `Cost = ${base} + ${fmt(rate)} × ${miles} = $${fmt(cost)}.`);
  },
];

// ═══════════════════════════════════════════════════════════════════
// ADVANCED MATH GENERATORS
// ═══════════════════════════════════════════════════════════════════

const advancedMathGenerators: Gen[] = [
  // 1. Factor quadratic x² + bx + c
  () => {
    const r1 = randInt(-8, 8); const r2 = randInt(-8, 8);
    const b = -(r1 + r2); const c = r1 * r2;
    return mc(uid(), "advanced_math", 2, `Factor: $x^2 ${b >= 0 ? "+" : ""}${b}x ${c >= 0 ? "+" : ""}${c}$`,
      `(x ${r1 >= 0 ? "-" : "+"}${Math.abs(r1)})(x ${r2 >= 0 ? "-" : "+"}${Math.abs(r2)})`,
      `Zeros at x = ${r1} and x = ${r2}. So (x - ${r1})(x - ${r2}).`,
      [`(x + ${r1})(x + ${r2})`, `(x - ${r1 + 1})(x - ${r2 - 1})`, `(x + ${Math.abs(r1)})(x - ${Math.abs(r2)})`]);
  },

  // 2. Evaluate function
  () => {
    const a = randNonZero(3); const b = randInt(-5, 5); const c = randInt(-5, 5);
    const x = randInt(-4, 4);
    const result = a * x * x + b * x + c;
    return num(uid(), "advanced_math", 1, `If $f(x) = ${a}x^2 ${b >= 0 ? "+" : ""}${b}x ${c >= 0 ? "+" : ""}${c}$, what is $f(${x})$?`, result,
      `f(${x}) = ${a}(${x})² + ${b}(${x}) + ${c} = ${a * x * x} + ${b * x} + ${c} = ${result}.`);
  },

  // 3. Vertex of parabola
  () => {
    const h = randInt(-5, 5); const k = randInt(-5, 5);
    const a = pick([1, -1, 2, -2]);
    return mc(uid(), "advanced_math", 2, `The vertex of y = ${a}(x ${h >= 0 ? "-" : "+"}${Math.abs(h)})² + ${k} is:`,
      `(${h}, ${k})`, `Vertex form y = a(x-h)² + k → vertex at (h,k) = (${h}, ${k}).`,
      [`(${-h}, ${k})`, `(${h}, ${-k})`, `(${-h}, ${-k})`]);
  },

  // 4. Exponent rules
  () => {
    const a = randInt(2, 6); const b = randInt(2, 6);
    return mc(uid(), "advanced_math", 1, `Simplify: $x^{${a}} \\cdot x^{${b}}$`,
      `$x^{${a + b}}$`, `When multiplying like bases, add exponents: $x^{${a}+${b}} = x^{${a + b}}$.`,
      [`$x^{${a * b}}$`, `${a + b}x`, `$x^{${Math.abs(a - b)}}$`]);
  },

  // 5. Expand (x + a)²
  () => {
    const a = randInt(1, 8);
    return mc(uid(), "advanced_math", 1, `Expand: $(x + ${a})^2$`,
      `$x^2 + ${2 * a}x + ${a * a}$`, `$(x + ${a})^2 = x^2 + 2(${a})x + ${a}^2 = x^2 + ${2 * a}x + ${a * a}$.`,
      [`$x^2 + ${a * a}$`, `$x^2 + ${a}x + ${a * a}$`, `$2x + ${2 * a}$`]);
  },

  // 6. Quadratic formula
  () => {
    const r1 = randInt(1, 7); const r2 = randInt(-7, -1);
    const b = -(r1 + r2); const c = r1 * r2;
    return num(uid(), "advanced_math", 3, `Solve x² ${b >= 0 ? "+" : ""}${b}x ${c >= 0 ? "+" : ""}${c} = 0. What is the positive root?`, r1,
      `Factors: (x - ${r1})(x + ${Math.abs(r2)}) = 0. Positive root: x = ${r1}.`);
  },

  // 7. Function composition
  () => {
    const a = randInt(2, 4); const b = randInt(1, 5); const x = randInt(1, 5);
    const fx = a * x + b; const gfx = fx * fx;
    return num(uid(), "advanced_math", 2, `If f(x) = ${a}x + ${b} and g(x) = x², what is g(f(${x}))?`, gfx,
      `f(${x}) = ${a}(${x}) + ${b} = ${fx}. g(${fx}) = ${fx}² = ${gfx}.`);
  },

  // 8. Exponential growth
  () => {
    const initial = pick([100, 200, 500, 1000]);
    const rate = pick([2, 3]);
    const periods = randInt(2, 4);
    const result = initial * Math.pow(rate, periods);
    return num(uid(), "advanced_math", 2, `A population starts at ${initial} and ${rate === 2 ? "doubles" : "triples"} every year. What is it after ${periods} years?`, result,
      `${initial} × ${rate}${superscript(periods)} = ${initial} × ${Math.pow(rate, periods)} = ${result}.`);
  },

  // 9. Max/min of quadratic
  () => {
    const a = pick([-2, -1, 1, 2]); const b = pick([2, 4, 6, -2, -4, -6]);
    const vertex_x = -b / (2 * a);
    const isMax = a < 0;
    return mc(uid(), "advanced_math", 2,
      `For f(x) = ${a}x² ${b >= 0 ? "+" : ""}${b}x, the x-value of the ${isMax ? "maximum" : "minimum"} is:`,
      vertex_x, `x = -b/(2a) = ${-b}/${2 * a} = ${fmt(vertex_x)}.`);
  },
];

// ═══════════════════════════════════════════════════════════════════
// PROBLEM SOLVING GENERATORS
// ═══════════════════════════════════════════════════════════════════

const problemSolvingGenerators: Gen[] = [
  // 1. Percentage
  () => {
    const price = pick([20, 30, 40, 50, 60, 80, 100, 120]);
    const pct = pick([10, 15, 20, 25, 30, 40, 50]);
    const discount = price * pct / 100;
    return num(uid(), "problem_solving", 1, `A $${price} item is ${pct}% off. What is the sale price?`, price - discount,
      `Discount: ${price} × ${pct}/100 = $${discount}. Sale: $${price} - $${discount} = $${price - discount}.`);
  },

  // 2. Ratio
  () => {
    const a = randInt(2, 7); const b = randInt(2, 7);
    const total = (a + b) * randInt(3, 8);
    const answer = (b * total) / (a + b);
    return num(uid(), "problem_solving", 2, `The ratio of A to B is ${a}:${b}. If total is ${total}, how many are B?`, answer,
      `Each part = ${total}/${a + b} = ${total / (a + b)}. B = ${b} × ${total / (a + b)} = ${answer}.`);
  },

  // 3. Mean
  () => {
    const n = randInt(4, 6);
    const vals = Array.from({ length: n }, () => randInt(10, 50));
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    return num(uid(), "problem_solving", 1, `What is the mean of: ${vals.join(", ")}?`, mean,
      `Sum = ${sum}. Mean = ${sum}/${n} = ${fmt(mean)}.`, 0.1);
  },

  // 4. Probability
  () => {
    const r = randInt(2, 6); const b = randInt(2, 6); const g = randInt(1, 4);
    const total = r + b + g;
    const target = pick(["red", "blue", "green"]);
    const count = target === "red" ? r : target === "blue" ? b : g;
    return mc(uid(), "problem_solving", 1,
      `A bag has ${r} red, ${b} blue, and ${g} green marbles. P(${target})?`,
      `${count}/${total}`, `P = ${count}/${total}.`,
      [`${count + 1}/${total}`, `${count}/${total - 1}`, `${total - count}/${total}`]);
  },

  // 5. Speed/distance
  () => {
    const speed = pick([30, 40, 50, 60, 65, 70]); const time = pick([2, 3, 4, 5]);
    return num(uid(), "problem_solving", 1, `A car travels at ${speed} mph for ${time} hours. How far?`, speed * time,
      `Distance = speed × time = ${speed} × ${time} = ${speed * time} miles.`);
  },

  // 6. Markup
  () => {
    const cost = pick([20, 30, 40, 50, 75, 100]); const markup = pick([20, 25, 30, 40, 50]);
    const retail = cost * (1 + markup / 100);
    return num(uid(), "problem_solving", 1, `Wholesale: $${cost}. Markup: ${markup}%. Retail price?`, retail,
      `Retail = ${cost} × ${fmt(1 + markup / 100)} = $${fmt(retail)}.`);
  },

  // 7. Median
  () => {
    const vals = Array.from({ length: 5 }, () => randInt(1, 20)).sort((a, b) => a - b);
    return num(uid(), "problem_solving", 1, `What is the median of: ${vals.join(", ")}?`, vals[2],
      `Sorted: ${vals.join(", ")}. Middle value = ${vals[2]}.`);
  },

  // 8. Percent increase
  () => {
    const original = pick([50, 80, 100, 120, 200]); const pctInc = pick([10, 20, 25, 50]);
    const newVal = original * (1 + pctInc / 100);
    return num(uid(), "problem_solving", 2, `${original} increased by ${pctInc}% equals:`, newVal,
      `${original} × ${fmt(1 + pctInc / 100)} = ${fmt(newVal)}.`);
  },
];

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY & TRIG GENERATORS
// ═══════════════════════════════════════════════════════════════════

const geometryGenerators: Gen[] = [
  // 1. Triangle area
  () => {
    const base = randInt(4, 15); const height = randInt(3, 12);
    return num(uid(), "geometry_trig", 1, `Triangle with base ${base} and height ${height}. Area?`, base * height / 2,
      `A = ½ × ${base} × ${height} = ${base * height / 2}.`);
  },

  // 2. Circle area
  () => {
    const r = randInt(2, 10);
    return mc(uid(), "geometry_trig", 1, `Circle with radius ${r}. Area?`, `${r * r}π`,
      `A = πr² = π(${r}²) = ${r * r}π.`, [`${2 * r}π`, `${r}π`, `${r * r * 2}π`]);
  },

  // 3. Pythagorean theorem
  () => {
    const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15]];
    const [a, b, c] = pick(triples);
    const askFor = pick(["leg", "hyp"]);
    if (askFor === "hyp") {
      return num(uid(), "geometry_trig", 2, `Right triangle with legs ${a} and ${b}. Hypotenuse?`, c,
        `c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}. c = ${c}.`);
    }
    return num(uid(), "geometry_trig", 2, `Right triangle: one leg is ${a}, hypotenuse is ${c}. Other leg?`, b,
      `b² = ${c}² - ${a}² = ${c * c} - ${a * a} = ${b * b}. b = ${b}.`);
  },

  // 4. Volume rectangular prism
  () => {
    const l = randInt(2, 8); const w = randInt(2, 8); const h = randInt(2, 8);
    return num(uid(), "geometry_trig", 1, `Rectangular prism: ${l} × ${w} × ${h}. Volume?`, l * w * h,
      `V = lwh = ${l} × ${w} × ${h} = ${l * w * h}.`);
  },

  // 5. Supplementary angles
  () => {
    const a = randInt(20, 160);
    return num(uid(), "geometry_trig", 1, `Two angles are supplementary. One is ${a}°. The other?`, 180 - a,
      `Supplementary = 180°. ${180} - ${a} = ${180 - a}°.`);
  },

  // 6. Similar triangles
  () => {
    const scale = pick([2, 3, 4, 0.5]);
    const a = randInt(3, 8); const b = randInt(3, 8); const c = randInt(3, 8);
    const missing = Math.round(c * scale);
    return num(uid(), "geometry_trig", 2,
      `Similar triangles: sides ${a}, ${b}, ${c} and ${Math.round(a * scale)}, ${Math.round(b * scale)}, x. What is x?`, missing,
      `Scale factor = ${Math.round(a * scale)}/${a} = ${fmt(scale)}. x = ${c} × ${fmt(scale)} = ${missing}.`);
  },

  // 7. Special triangle 30-60-90
  () => {
    const x = randInt(2, 8);
    const which = pick(["hyp", "long"]);
    if (which === "hyp") {
      return num(uid(), "geometry_trig", 2, `30-60-90 triangle: short leg = ${x}. Hypotenuse?`, 2 * x,
        `Ratio x, x√3, 2x. Hypotenuse = 2(${x}) = ${2 * x}.`);
    }
    const longLeg = x * Math.sqrt(3);
    return num(uid(), "geometry_trig", 3, `30-60-90 triangle: short leg = ${x}. Long leg? (round to 2 dec)`, longLeg,
      `Long leg = ${x}√3 ≈ ${fmt(longLeg)}.`, 0.05);
  },

  // 8. Sector area
  () => {
    const r = randInt(3, 10); const angle = pick([60, 90, 120, 180]);
    const area = (angle / 360) * r * r;
    return mc(uid(), "geometry_trig", 3, `Sector: radius ${r}, angle ${angle}°. Area?`, `${fmt(area)}π`,
      `A = (${angle}/360)πr² = (${angle / 360})π(${r * r}) = ${fmt(area)}π.`,
      [`${fmt(area * 2)}π`, `${r * r}π`, `${fmt(angle / 360 * r)}π`]);
  },

  // 9. Trig ratio
  () => {
    const triples: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17]];
    const [a, b, c] = pick(triples);
    const fn = pick(["sin", "cos", "tan"]);
    let ans: string;
    if (fn === "sin") ans = `${a}/${c}`;
    else if (fn === "cos") ans = `${b}/${c}`;
    else ans = `${a}/${b}`;
    return mc(uid(), "geometry_trig", 2,
      `Right triangle: opposite = ${a}, adjacent = ${b}, hypotenuse = ${c}. What is ${fn}(θ)?`,
      ans, `${fn}(θ) = ${fn === "sin" ? "opp/hyp" : fn === "cos" ? "adj/hyp" : "opp/adj"} = ${ans}.`,
      [`${b}/${c}`, `${a}/${b}`, `${c}/${a}`].filter(d => d !== ans).slice(0, 3));
  },
];

function superscript(n: number): string {
  const map: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return n.toString().split("").map((c) => map[c] || c).join("");
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export const ALL_GENERATORS: Record<SATDomain, Gen[]> = {
  algebra: algebraGenerators,
  advanced_math: advancedMathGenerators,
  problem_solving: problemSolvingGenerators,
  geometry_trig: geometryGenerators,
};

/** Generate N questions with balanced domain distribution */
export function generateQuestions(count: number): SATQuestion[] {
  _counter = 0;
  const domains: SATDomain[] = ["algebra", "advanced_math", "problem_solving", "geometry_trig"];
  // SAT distribution: 35%, 35%, 15%, 15%
  const distribution = [
    Math.round(count * 0.35),
    Math.round(count * 0.35),
    Math.round(count * 0.15),
    count - Math.round(count * 0.35) - Math.round(count * 0.35) - Math.round(count * 0.15),
  ];

  const questions: SATQuestion[] = [];
  for (let d = 0; d < domains.length; d++) {
    const gens = ALL_GENERATORS[domains[d]];
    for (let i = 0; i < distribution[d]; i++) {
      const gen = gens[i % gens.length];
      questions.push(gen());
    }
  }

  // Shuffle
  return questions.sort(() => Math.random() - 0.5);
}
