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
const ScatterPlot = lazy(() => import("./templates/scatter-plot"));
const TwoWayTable = lazy(() => import("./templates/two-way-table"));
const CardSort = lazy(() => import("./templates/card-sort"));
const TablePattern = lazy(() => import("./templates/table-pattern"));
const InequalityGraph = lazy(() => import("./templates/inequality-graph"));
const GraphTransform = lazy(() => import("./templates/graph-transform"));
const VennDiagram = lazy(() => import("./templates/venn-diagram"));

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
  scatter_plot: {
    type: "scatter_plot",
    label: "Scatter Plot",
    description: "Draw a line of best fit, identify correlation, or read values from a scatter plot",
    icon: "📊",
    component: ScatterPlot,
  },
  two_way_table: {
    type: "two_way_table",
    label: "Two-Way Table",
    description: "Fill in missing values in a frequency table (rows + columns = totals)",
    icon: "📋",
    component: TwoWayTable,
  },
  card_sort: {
    type: "card_sort",
    label: "Card Sort",
    description: "Drag cards into the correct categories (classify expressions, functions, etc.)",
    icon: "🃏",
    component: CardSort,
  },
  table_pattern: {
    type: "table_pattern",
    label: "Table / Pattern",
    description: "Complete a function table and identify the rule",
    icon: "📐",
    component: TablePattern,
  },
  inequality_graph: {
    type: "inequality_graph",
    label: "Inequality Graph",
    description: "Graph a linear inequality and shade the solution region",
    icon: "📐",
    component: InequalityGraph,
  },
  graph_transform: {
    type: "graph_transform",
    label: "Graph Transformations",
    description: "Apply shifts and stretches to match a target function",
    icon: "🔄",
    component: GraphTransform,
  },
  venn_diagram: {
    type: "venn_diagram",
    label: "Venn Diagram",
    description: "Fill in missing values in a Venn diagram (probability/sets)",
    icon: "⭕",
    component: VennDiagram,
  },
  custom_html: {
    type: "custom_html",
    label: "Custom HTML",
    description: "Teacher-defined HTML/JS exercise",
    icon: "🖥️",
    component: null as unknown as ComponentType<MathTemplateProps>,
  },
  // Aliases for backward compatibility with seed data
  function_graphing: {
    type: "function_graphing",
    label: "Function Graph",
    description: "Match a function by adjusting parameters",
    icon: "📈",
    component: FunctionGraph,
  },
  graph_transformation: {
    type: "graph_transformation",
    label: "Graph Transformations",
    description: "Apply shifts and stretches to match a target function",
    icon: "🔄",
    component: GraphTransform,
  },
  inequality_graphing: {
    type: "inequality_graphing",
    label: "Inequality Graph",
    description: "Graph a linear inequality and shade the solution region",
    icon: "📐",
    component: InequalityGraph,
  },
  card_sorting: {
    type: "card_sorting",
    label: "Card Sort",
    description: "Drag cards into the correct categories",
    icon: "🃏",
    component: CardSort,
  },
};

export const TEMPLATE_LIST = Object.values(MATH_TEMPLATES).filter(
  (t) => t.type !== "custom_html"
);
