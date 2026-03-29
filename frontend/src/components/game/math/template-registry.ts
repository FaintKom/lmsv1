import { lazy, type ComponentType } from "react";

export interface MathTemplateConfig {
  type: string;
  label: string;
  description: string;
  icon: string;
  component: ComponentType<MathTemplateProps>;
}

export interface MathTemplateProps {
  config: Record<string, unknown>;
  onComplete: (success: boolean, score: number) => void;
}

const CoordinatePlane = lazy(() => import("./templates/coordinate-plane"));
const NumberLine = lazy(() => import("./templates/number-line"));
const VisualFractions = lazy(() => import("./templates/visual-fractions"));
const EquationBalance = lazy(() => import("./templates/equation-balance"));
const ArithmeticPuzzle = lazy(() => import("./templates/arithmetic-puzzle"));
const FunctionGraph = lazy(() => import("./templates/function-graph"));
const EquationSolver = lazy(() => import("./templates/equation-solver"));
const MultipleChoiceMath = lazy(() => import("./templates/multiple-choice-math"));
const NumericInput = lazy(() => import("./templates/numeric-input"));

export const MATH_TEMPLATES: Record<string, MathTemplateConfig> = {
  coordinate_plane: {
    type: "coordinate_plane",
    label: "Coordinate Plane",
    description: "Drag points to correct positions on an XY plane",
    icon: "📐",
    component: CoordinatePlane,
  },
  number_line: {
    type: "number_line",
    label: "Number Line",
    description: "Place markers at correct positions on a number line",
    icon: "📏",
    component: NumberLine,
  },
  visual_fractions: {
    type: "visual_fractions",
    label: "Visual Fractions",
    description: "Select the correct fraction by shading parts",
    icon: "🥧",
    component: VisualFractions,
  },
  equation_balance: {
    type: "equation_balance",
    label: "Equation Balance",
    description: "Drag terms to balance both sides of an equation",
    icon: "⚖️",
    component: EquationBalance,
  },
  arithmetic_puzzle: {
    type: "arithmetic_puzzle",
    label: "Arithmetic Puzzle",
    description: "Fill in missing numbers in arithmetic operations",
    icon: "🧩",
    component: ArithmeticPuzzle,
  },
  function_graph: {
    type: "function_graph",
    label: "Function Graph",
    description: "Match a function by adjusting parameters (linear, quadratic, exponential)",
    icon: "📈",
    component: FunctionGraph,
  },
  equation_solver: {
    type: "equation_solver",
    label: "Equation Solver",
    description: "Solve equations step-by-step by choosing the right operations",
    icon: "🔢",
    component: EquationSolver,
  },
  multiple_choice_math: {
    type: "multiple_choice_math",
    label: "Multiple Choice (SAT)",
    description: "SAT-style multiple choice with explanation",
    icon: "📝",
    component: MultipleChoiceMath,
  },
  numeric_input: {
    type: "numeric_input",
    label: "Numeric Input (Grid-in)",
    description: "Enter a numeric answer (SAT grid-in format)",
    icon: "🔣",
    component: NumericInput,
  },
  custom_html: {
    type: "custom_html",
    label: "Custom HTML",
    description: "Teacher-defined HTML/JS exercise",
    icon: "🖥️",
    component: null as unknown as ComponentType<MathTemplateProps>,
  },
};

export const TEMPLATE_LIST = Object.values(MATH_TEMPLATES).filter(
  (t) => t.type !== "custom_html"
);
