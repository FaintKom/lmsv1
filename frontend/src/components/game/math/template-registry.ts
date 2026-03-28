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
