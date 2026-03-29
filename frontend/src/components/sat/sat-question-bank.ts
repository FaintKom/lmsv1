export type SATDomain = "algebra" | "advanced_math" | "problem_solving" | "geometry_trig";
export type SATDifficulty = 1 | 2 | 3;

export interface SATQuestion {
  id: string;
  domain: SATDomain;
  difficulty: SATDifficulty;
  template_type: "multiple_choice_math" | "numeric_input";
  config: Record<string, unknown>;
}

export interface SATTestConfig {
  name: string;
  questions_per_module: number;
  time_per_module_minutes: number;
  modules: number;
}

export const SAT_MATH_CONFIG: SATTestConfig = {
  name: "SAT Math Practice",
  questions_per_module: 22,
  time_per_module_minutes: 35,
  modules: 2,
};

export const SAT_MINI_CONFIG: SATTestConfig = {
  name: "SAT Math Mini (10 min)",
  questions_per_module: 10,
  time_per_module_minutes: 10,
  modules: 1,
};

export const DOMAIN_LABELS: Record<SATDomain, string> = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  problem_solving: "Problem Solving & Data Analysis",
  geometry_trig: "Geometry & Trigonometry",
};

export const DOMAIN_COLORS: Record<SATDomain, string> = {
  algebra: "#4C97FF",
  advanced_math: "#9966FF",
  problem_solving: "#FF8C1A",
  geometry_trig: "#40BF4A",
};

// ─── Question Bank ──────────────────────────────────────────────────

export const QUESTION_BANK: SATQuestion[] = [
  // ═══ ALGEBRA (13-15 questions on real SAT) ═══

  // Linear equations
  { id: "alg-01", domain: "algebra", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "If 3x + 7 = 22, what is the value of x?",
    choices: [{ text: "3", correct: false }, { text: "5", correct: true }, { text: "7", correct: false }, { text: "15", correct: false }],
    explanation: "3x + 7 = 22 → 3x = 15 → x = 5", standard: "SAT.Algebra",
  }},
  { id: "alg-02", domain: "algebra", difficulty: 1, template_type: "numeric_input", config: {
    question: "If 2x - 8 = 12, what is the value of x?",
    correct_answers: [10], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "2x - 8 = 12 → 2x = 20 → x = 10", standard: "SAT.Algebra",
  }},
  { id: "alg-03", domain: "algebra", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "What is the slope of the line 4x - 2y = 10?",
    choices: [{ text: "2", correct: true }, { text: "-2", correct: false }, { text: "4", correct: false }, { text: "5", correct: false }],
    explanation: "4x - 2y = 10 → -2y = -4x + 10 → y = 2x - 5. Slope = 2.", standard: "SAT.Algebra",
  }},
  { id: "alg-04", domain: "algebra", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "A line passes through (2, 5) and (6, 13). What is the y-intercept?",
    choices: [{ text: "1", correct: true }, { text: "-1", correct: false }, { text: "3", correct: false }, { text: "5", correct: false }],
    explanation: "Slope = (13-5)/(6-2) = 8/4 = 2. y = 2x + b → 5 = 2(2) + b → b = 1.", standard: "SAT.Algebra",
  }},
  { id: "alg-05", domain: "algebra", difficulty: 2, template_type: "numeric_input", config: {
    question: "Solve the system: x + y = 10 and 2x - y = 5. What is x?",
    correct_answers: [5], tolerance: 0.01, allow_fraction: true, allow_decimal: true,
    explanation: "Add: 3x = 15 → x = 5.", standard: "SAT.Algebra",
  }},
  { id: "alg-06", domain: "algebra", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "If 3(2x - 4) = 5x + 2, what is x?",
    choices: [{ text: "14", correct: true }, { text: "10", correct: false }, { text: "2", correct: false }, { text: "-2", correct: false }],
    explanation: "6x - 12 = 5x + 2 → x = 14.", standard: "SAT.Algebra",
  }},
  { id: "alg-07", domain: "algebra", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "Which inequality represents 'x is at least 5'?",
    choices: [{ text: "x ≥ 5", correct: true }, { text: "x > 5", correct: false }, { text: "x ≤ 5", correct: false }, { text: "x < 5", correct: false }],
    explanation: "'At least' means greater than or equal to: x ≥ 5.", standard: "SAT.Algebra",
  }},
  { id: "alg-08", domain: "algebra", difficulty: 3, template_type: "numeric_input", config: {
    question: "The sum of 3 consecutive even integers is 72. What is the largest?",
    correct_answers: [26], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "Let them be x, x+2, x+4. 3x + 6 = 72 → x = 22. Largest = 26.", standard: "SAT.Algebra",
  }},
  { id: "alg-09", domain: "algebra", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "Line p has slope 3. Line q is perpendicular to p. What is the slope of q?",
    choices: [{ text: "-1/3", correct: true }, { text: "1/3", correct: false }, { text: "-3", correct: false }, { text: "3", correct: false }],
    explanation: "Perpendicular slopes: m₁ × m₂ = -1. So m₂ = -1/3.", standard: "SAT.Algebra",
  }},

  // ═══ ADVANCED MATH (13-15 questions on real SAT) ═══

  { id: "adv-01", domain: "advanced_math", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "What are the solutions to x² - 9 = 0?",
    choices: [{ text: "x = 3 and x = -3", correct: true }, { text: "x = 9 and x = -9", correct: false }, { text: "x = 3 only", correct: false }, { text: "x = 9 only", correct: false }],
    explanation: "x² = 9 → x = ±3.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-02", domain: "advanced_math", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "Factor: x² + 5x + 6",
    choices: [{ text: "(x + 2)(x + 3)", correct: true }, { text: "(x + 1)(x + 6)", correct: false }, { text: "(x - 2)(x - 3)", correct: false }, { text: "(x + 5)(x + 1)", correct: false }],
    explanation: "Find two numbers that multiply to 6 and add to 5: 2 and 3. So (x+2)(x+3).", standard: "SAT.Advanced Math",
  }},
  { id: "adv-03", domain: "advanced_math", difficulty: 2, template_type: "numeric_input", config: {
    question: "If f(x) = 2x² - 3x + 1, what is f(3)?",
    correct_answers: [10], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "f(3) = 2(9) - 3(3) + 1 = 18 - 9 + 1 = 10.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-04", domain: "advanced_math", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "The vertex of y = (x - 3)² + 2 is at which point?",
    choices: [{ text: "(3, 2)", correct: true }, { text: "(-3, 2)", correct: false }, { text: "(3, -2)", correct: false }, { text: "(-3, -2)", correct: false }],
    explanation: "Vertex form y = a(x-h)² + k → vertex at (h, k) = (3, 2).", standard: "SAT.Advanced Math",
  }},
  { id: "adv-05", domain: "advanced_math", difficulty: 2, template_type: "numeric_input", config: {
    question: "Simplify: (3x²)(4x³)",
    correct_answers: [12], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "3 × 4 = 12, x² × x³ = x⁵. Answer: 12x⁵. The coefficient is 12.", hint: "Multiply coefficients, add exponents.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-06", domain: "advanced_math", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "If g(x) = x² - 4x + 3, for what value of x does g(x) reach its minimum?",
    choices: [{ text: "2", correct: true }, { text: "-2", correct: false }, { text: "3", correct: false }, { text: "1", correct: false }],
    explanation: "Min of ax² + bx + c is at x = -b/(2a) = 4/2 = 2.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-07", domain: "advanced_math", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "Which expression is equivalent to (x + 4)²?",
    choices: [{ text: "x² + 8x + 16", correct: true }, { text: "x² + 16", correct: false }, { text: "x² + 4x + 16", correct: false }, { text: "2x + 8", correct: false }],
    explanation: "(x+4)² = x² + 2(4)(x) + 16 = x² + 8x + 16.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-08", domain: "advanced_math", difficulty: 3, template_type: "numeric_input", config: {
    question: "A population doubles every 5 years. Starting at 100, what is the population after 15 years?",
    correct_answers: [800], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "15 years = 3 doublings. 100 × 2³ = 100 × 8 = 800.", standard: "SAT.Advanced Math",
  }},

  // ═══ PROBLEM SOLVING & DATA ANALYSIS (5-7 on real SAT) ═══

  { id: "ps-01", domain: "problem_solving", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "A shirt originally costs $40. It's on sale for 25% off. What is the sale price?",
    choices: [{ text: "$30", correct: true }, { text: "$25", correct: false }, { text: "$35", correct: false }, { text: "$15", correct: false }],
    explanation: "25% of $40 = $10. Sale price = $40 - $10 = $30.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-02", domain: "problem_solving", difficulty: 2, template_type: "numeric_input", config: {
    question: "The ratio of boys to girls is 3:5. If there are 40 students total, how many are girls?",
    correct_answers: [25], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "3 + 5 = 8 parts. Each part = 40/8 = 5. Girls = 5 × 5 = 25.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-03", domain: "problem_solving", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "Data set: 3, 5, 7, 8, 12. What is the median?",
    choices: [{ text: "7", correct: true }, { text: "5", correct: false }, { text: "8", correct: false }, { text: "7.5", correct: false }],
    explanation: "The middle value of the sorted set is 7.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-04", domain: "problem_solving", difficulty: 3, template_type: "numeric_input", config: {
    question: "A car travels 180 miles in 3 hours. At the same rate, how far will it travel in 5 hours?",
    correct_answers: [300], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "Rate = 180/3 = 60 mph. Distance = 60 × 5 = 300 miles.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-05", domain: "problem_solving", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "A bag has 3 red, 5 blue, and 2 green marbles. What is the probability of drawing a blue marble?",
    choices: [{ text: "1/2", correct: true }, { text: "1/3", correct: false }, { text: "5/8", correct: false }, { text: "2/5", correct: false }],
    explanation: "P(blue) = 5/(3+5+2) = 5/10 = 1/2.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-06", domain: "problem_solving", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "A scatter plot shows a positive linear trend. Which correlation coefficient is most likely?",
    choices: [{ text: "r = 0.85", correct: true }, { text: "r = -0.85", correct: false }, { text: "r = 0.10", correct: false }, { text: "r = -0.10", correct: false }],
    explanation: "Positive linear trend = positive r close to 1. r = 0.85.", standard: "SAT.Problem Solving",
  }},

  // ═══ GEOMETRY & TRIG (5-7 on real SAT) ═══

  { id: "geo-01", domain: "geometry_trig", difficulty: 1, template_type: "numeric_input", config: {
    question: "What is the area of a triangle with base 10 and height 6?",
    correct_answers: [30], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "A = ½ × base × height = ½ × 10 × 6 = 30.", standard: "SAT.Geometry",
  }},
  { id: "geo-02", domain: "geometry_trig", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "A circle has radius 5. What is its area?",
    choices: [{ text: "25π", correct: true }, { text: "10π", correct: false }, { text: "5π", correct: false }, { text: "50π", correct: false }],
    explanation: "A = πr² = π(5²) = 25π.", standard: "SAT.Geometry",
  }},
  { id: "geo-03", domain: "geometry_trig", difficulty: 2, template_type: "numeric_input", config: {
    question: "In a right triangle, one leg is 6 and the hypotenuse is 10. What is the other leg?",
    correct_answers: [8], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "a² + b² = c². 6² + b² = 10². 36 + b² = 100. b² = 64. b = 8.", standard: "SAT.Geometry",
  }},
  { id: "geo-04", domain: "geometry_trig", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "In a 30-60-90 triangle, the side opposite 30° is 5. What is the hypotenuse?",
    choices: [{ text: "10", correct: true }, { text: "5√3", correct: false }, { text: "5√2", correct: false }, { text: "15", correct: false }],
    explanation: "30-60-90 ratio: x, x√3, 2x. If x = 5, hypotenuse = 2x = 10.", standard: "SAT.Geometry",
  }},
  { id: "geo-05", domain: "geometry_trig", difficulty: 1, template_type: "numeric_input", config: {
    question: "A rectangular prism has length 4, width 3, and height 5. What is its volume?",
    correct_answers: [60], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "V = l × w × h = 4 × 3 × 5 = 60.", standard: "SAT.Geometry",
  }},
  { id: "geo-06", domain: "geometry_trig", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "What is sin(30°)?",
    choices: [{ text: "1/2", correct: true }, { text: "√3/2", correct: false }, { text: "√2/2", correct: false }, { text: "1", correct: false }],
    explanation: "sin(30°) = 1/2 (from 30-60-90 triangle or unit circle).", standard: "SAT.Geometry",
  }},
  { id: "geo-07", domain: "geometry_trig", difficulty: 2, template_type: "numeric_input", config: {
    question: "An arc of a circle has central angle 90° and radius 8. What is the arc length? (Use π ≈ 3.14)",
    correct_answers: [12.56, 12.57, 4*3.14159], tolerance: 0.1, allow_fraction: true, allow_decimal: true,
    explanation: "Arc = (θ/360) × 2πr = (90/360) × 2π(8) = (1/4)(16π) = 4π ≈ 12.57.", standard: "SAT.Geometry",
  }},

  // ═══ ADDITIONAL ALGEBRA ═══
  { id: "alg-10", domain: "algebra", difficulty: 1, template_type: "numeric_input", config: {
    question: "Solve: 5x = 35", correct_answers: [7], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "x = 35/5 = 7.", standard: "SAT.Algebra",
  }},
  { id: "alg-11", domain: "algebra", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "If y = -2x + 8, what is y when x = 3?",
    choices: [{ text: "2", correct: true }, { text: "14", correct: false }, { text: "-2", correct: false }, { text: "8", correct: false }],
    explanation: "y = -2(3) + 8 = -6 + 8 = 2.", standard: "SAT.Algebra",
  }},
  { id: "alg-12", domain: "algebra", difficulty: 2, template_type: "numeric_input", config: {
    question: "Solve the system: 2x + y = 8 and x - y = 1. What is y?",
    correct_answers: [2], tolerance: 0.01, allow_fraction: true, allow_decimal: true,
    explanation: "Add: 3x = 9 → x = 3. y = 8 - 2(3) = 2.", standard: "SAT.Algebra",
  }},
  { id: "alg-13", domain: "algebra", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "A taxi charges $3.50 plus $0.75 per mile. Which represents the cost C for m miles?",
    choices: [{ text: "C = 0.75m + 3.50", correct: true }, { text: "C = 3.50m + 0.75", correct: false }, { text: "C = 4.25m", correct: false }, { text: "C = 0.75m - 3.50", correct: false }],
    explanation: "Fixed cost $3.50 + $0.75 per mile → C = 0.75m + 3.50.", standard: "SAT.Algebra",
  }},
  { id: "alg-14", domain: "algebra", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "What is the slope of y = 7?",
    choices: [{ text: "0", correct: true }, { text: "7", correct: false }, { text: "1", correct: false }, { text: "Undefined", correct: false }],
    explanation: "y = 7 is a horizontal line. Slope = 0.", standard: "SAT.Algebra",
  }},
  { id: "alg-15", domain: "algebra", difficulty: 2, template_type: "numeric_input", config: {
    question: "If |x - 4| = 7, what is the positive value of x?",
    correct_answers: [11], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "x - 4 = 7 → x = 11, or x - 4 = -7 → x = -3. Positive: 11.", standard: "SAT.Algebra",
  }},
  { id: "alg-16", domain: "algebra", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "Which system has no solution?",
    choices: [
      { text: "y = 2x + 1 and y = 2x - 3", correct: true },
      { text: "y = 2x + 1 and y = -2x + 1", correct: false },
      { text: "y = x and y = 2x", correct: false },
      { text: "y = 3x and y = 3x", correct: false },
    ],
    explanation: "Parallel lines (same slope, different intercept) have no solution. Both have slope 2.", standard: "SAT.Algebra",
  }},
  { id: "alg-17", domain: "algebra", difficulty: 1, template_type: "numeric_input", config: {
    question: "If 4(x + 2) = 24, what is x?",
    correct_answers: [4], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "4x + 8 = 24 → 4x = 16 → x = 4.", standard: "SAT.Algebra",
  }},

  // ═══ ADDITIONAL ADVANCED MATH ═══
  { id: "adv-09", domain: "advanced_math", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "Simplify: x³ · x⁴",
    choices: [{ text: "x⁷", correct: true }, { text: "x¹²", correct: false }, { text: "x¹", correct: false }, { text: "2x⁷", correct: false }],
    explanation: "When multiplying like bases, add exponents: x³⁺⁴ = x⁷.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-10", domain: "advanced_math", difficulty: 2, template_type: "numeric_input", config: {
    question: "If f(x) = x² - 4, what is f(-3)?",
    correct_answers: [5], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "f(-3) = (-3)² - 4 = 9 - 4 = 5.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-11", domain: "advanced_math", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "What are the zeros of f(x) = x² - 7x + 12?",
    choices: [{ text: "3 and 4", correct: true }, { text: "2 and 6", correct: false }, { text: "-3 and -4", correct: false }, { text: "1 and 12", correct: false }],
    explanation: "x² - 7x + 12 = (x-3)(x-4) = 0. Zeros: x = 3 and x = 4.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-12", domain: "advanced_math", difficulty: 3, template_type: "numeric_input", config: {
    question: "Use the quadratic formula: x² + 2x - 8 = 0. What is the positive root?",
    correct_answers: [2], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "x = (-2 ± √(4+32))/2 = (-2 ± 6)/2. Positive: (-2+6)/2 = 2.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-13", domain: "advanced_math", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "What is √144?",
    choices: [{ text: "12", correct: true }, { text: "14", correct: false }, { text: "72", correct: false }, { text: "11", correct: false }],
    explanation: "12 × 12 = 144, so √144 = 12.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-14", domain: "advanced_math", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "The function f(x) = -2(x+1)² + 5 has a maximum value of:",
    choices: [{ text: "5", correct: true }, { text: "-2", correct: false }, { text: "1", correct: false }, { text: "-1", correct: false }],
    explanation: "Vertex form: max/min at k. Since a=-2<0, it's a max at y=5.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-15", domain: "advanced_math", difficulty: 2, template_type: "numeric_input", config: {
    question: "If f(x) = 3x + 1 and g(x) = x², what is g(f(2))?",
    correct_answers: [49], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "f(2) = 3(2)+1 = 7. g(7) = 7² = 49.", standard: "SAT.Advanced Math",
  }},
  { id: "adv-16", domain: "advanced_math", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "Which expression equals (x²-9)/(x-3) for x ≠ 3?",
    choices: [{ text: "x + 3", correct: true }, { text: "x - 3", correct: false }, { text: "x² - 3", correct: false }, { text: "3x", correct: false }],
    explanation: "x² - 9 = (x+3)(x-3). Divide by (x-3): x+3.", standard: "SAT.Advanced Math",
  }},

  // ═══ ADDITIONAL PROBLEM SOLVING ═══
  { id: "ps-07", domain: "problem_solving", difficulty: 1, template_type: "numeric_input", config: {
    question: "A store marks up items 40%. If the wholesale price is $50, what is the retail price?",
    correct_answers: [70], tolerance: 0.01, allow_fraction: false, allow_decimal: true,
    explanation: "Markup: 50 × 0.40 = 20. Retail: 50 + 20 = $70.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-08", domain: "problem_solving", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "The mean of 5 numbers is 20. If one number is removed and the mean becomes 18, what was the removed number?",
    choices: [{ text: "28", correct: true }, { text: "20", correct: false }, { text: "24", correct: false }, { text: "10", correct: false }],
    explanation: "Sum = 5×20 = 100. New sum = 4×18 = 72. Removed = 100-72 = 28.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-09", domain: "problem_solving", difficulty: 3, template_type: "numeric_input", config: {
    question: "A survey shows 60% prefer A and 25% prefer B. Of 200 people, how many prefer neither?",
    correct_answers: [30], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "A+B = 60%+25% = 85%. Neither = 15%. 200×0.15 = 30.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-10", domain: "problem_solving", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "Convert 3/8 to a percentage.",
    choices: [{ text: "37.5%", correct: true }, { text: "38%", correct: false }, { text: "33.3%", correct: false }, { text: "30%", correct: false }],
    explanation: "3 ÷ 8 = 0.375 = 37.5%.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-11", domain: "problem_solving", difficulty: 2, template_type: "numeric_input", config: {
    question: "A recipe for 4 servings needs 3 cups of flour. How many cups for 10 servings?",
    correct_answers: [7.5], tolerance: 0.01, allow_fraction: true, allow_decimal: true,
    explanation: "3/4 = x/10 → x = 30/4 = 7.5 cups.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-12", domain: "problem_solving", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "Two dice are rolled. What is the probability the sum is 7?",
    choices: [{ text: "1/6", correct: true }, { text: "1/12", correct: false }, { text: "7/36", correct: false }, { text: "1/7", correct: false }],
    explanation: "6 ways to get 7 (1+6,2+5,3+4,4+3,5+2,6+1) out of 36 total = 6/36 = 1/6.", standard: "SAT.Problem Solving",
  }},
  { id: "ps-13", domain: "problem_solving", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "A data set has Q1=25, median=35, Q3=50. What is the IQR?",
    choices: [{ text: "25", correct: true }, { text: "10", correct: false }, { text: "35", correct: false }, { text: "15", correct: false }],
    explanation: "IQR = Q3 - Q1 = 50 - 25 = 25.", standard: "SAT.Problem Solving",
  }},

  // ═══ ADDITIONAL GEOMETRY & TRIG ═══
  { id: "geo-08", domain: "geometry_trig", difficulty: 1, template_type: "numeric_input", config: {
    question: "What is the perimeter of a square with side length 9?",
    correct_answers: [36], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "P = 4s = 4(9) = 36.", standard: "SAT.Geometry",
  }},
  { id: "geo-09", domain: "geometry_trig", difficulty: 2, template_type: "multiple_choice_math", config: {
    question: "Two angles are supplementary. One is 65°. What is the other?",
    choices: [{ text: "115°", correct: true }, { text: "25°", correct: false }, { text: "295°", correct: false }, { text: "65°", correct: false }],
    explanation: "Supplementary angles sum to 180°. 180 - 65 = 115°.", standard: "SAT.Geometry",
  }},
  { id: "geo-10", domain: "geometry_trig", difficulty: 2, template_type: "numeric_input", config: {
    question: "A cylinder has radius 3 and height 7. What is its volume? (Use π ≈ 3.14)",
    correct_answers: [197.82, 197.92, 63*3.14159], tolerance: 0.5, allow_fraction: false, allow_decimal: true,
    explanation: "V = πr²h = π(9)(7) = 63π ≈ 197.92.", standard: "SAT.Geometry",
  }},
  { id: "geo-11", domain: "geometry_trig", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "What is cos(60°)?",
    choices: [{ text: "1/2", correct: true }, { text: "√3/2", correct: false }, { text: "√2/2", correct: false }, { text: "0", correct: false }],
    explanation: "cos(60°) = 1/2 (from 30-60-90 triangle).", standard: "SAT.Geometry",
  }},
  { id: "geo-12", domain: "geometry_trig", difficulty: 1, template_type: "multiple_choice_math", config: {
    question: "The angles of a triangle sum to:",
    choices: [{ text: "180°", correct: true }, { text: "360°", correct: false }, { text: "90°", correct: false }, { text: "270°", correct: false }],
    explanation: "The sum of angles in any triangle is 180°.", standard: "SAT.Geometry",
  }},
  { id: "geo-13", domain: "geometry_trig", difficulty: 2, template_type: "numeric_input", config: {
    question: "Similar triangles have sides 3,4,5 and 6,8,x. What is x?",
    correct_answers: [10], tolerance: 0.01, allow_fraction: false, allow_decimal: false,
    explanation: "Scale factor = 6/3 = 2. x = 5 × 2 = 10.", standard: "SAT.Geometry",
  }},
  { id: "geo-14", domain: "geometry_trig", difficulty: 3, template_type: "multiple_choice_math", config: {
    question: "A sector of a circle has radius 6 and central angle 120°. What is its area?",
    choices: [{ text: "12π", correct: true }, { text: "36π", correct: false }, { text: "6π", correct: false }, { text: "24π", correct: false }],
    explanation: "Area = (120/360)πr² = (1/3)π(36) = 12π.", standard: "SAT.Geometry",
  }},
  { id: "geo-15", domain: "geometry_trig", difficulty: 3, template_type: "numeric_input", config: {
    question: "In a 45-45-90 triangle, the legs are each 5. What is the hypotenuse? (Round to 2 decimals)",
    correct_answers: [7.07, 5*1.41421], tolerance: 0.05, allow_fraction: false, allow_decimal: true,
    explanation: "Hypotenuse = leg × √2 = 5√2 ≈ 7.07.", standard: "SAT.Geometry",
  }},
];

/** Generate a test with balanced domain distribution */
export function generateTest(questionCount: number, difficulty?: SATDifficulty): SATQuestion[] {
  let pool = [...QUESTION_BANK];
  if (difficulty) pool = pool.filter((q) => q.difficulty === difficulty);

  // Shuffle
  pool.sort(() => Math.random() - 0.5);

  // Balance domains
  const domains: SATDomain[] = ["algebra", "advanced_math", "problem_solving", "geometry_trig"];
  const perDomain = Math.ceil(questionCount / domains.length);
  const selected: SATQuestion[] = [];

  for (const domain of domains) {
    const domainQs = pool.filter((q) => q.domain === domain);
    selected.push(...domainQs.slice(0, perDomain));
  }

  // Trim to exact count and shuffle
  return selected.slice(0, questionCount).sort(() => Math.random() - 0.5);
}
