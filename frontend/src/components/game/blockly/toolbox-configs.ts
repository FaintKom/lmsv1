export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface ToolboxCategory {
  kind: "category";
  name: string;
  colour: string;
  contents: { kind: "block"; type: string; [key: string]: unknown }[];
}

export interface ToolboxDef {
  kind: "categoryToolbox";
  contents: ToolboxCategory[];
}

const MOVEMENT_CATEGORY: ToolboxCategory = {
  kind: "category",
  name: "Movement",
  colour: "210",
  contents: [
    { kind: "block", type: "move_forward" },
    { kind: "block", type: "turn_left" },
    { kind: "block", type: "turn_right" },
  ],
};

const ITEMS_CATEGORY: ToolboxCategory = {
  kind: "category",
  name: "Items",
  colour: "160",
  contents: [
    { kind: "block", type: "pick_up" },
    { kind: "block", type: "place_item" },
  ],
};

const LOOPS_CATEGORY: ToolboxCategory = {
  kind: "category",
  name: "Loops",
  colour: "120",
  contents: [
    {
      kind: "block",
      type: "repeat_times",
      inputs: {
        TIMES: {
          shadow: { type: "math_number", fields: { NUM: 3 } },
        },
      },
    },
    { kind: "block", type: "while_not_at_goal" },
  ],
};

const CONDITIONS_CATEGORY: ToolboxCategory = {
  kind: "category",
  name: "Conditions",
  colour: "330",
  contents: [
    { kind: "block", type: "controls_if" },
    { kind: "block", type: "if_wall_ahead" },
    { kind: "block", type: "if_item_here" },
    { kind: "block", type: "logic_negate" },
  ],
};

const MATH_CATEGORY: ToolboxCategory = {
  kind: "category",
  name: "Math",
  colour: "230",
  contents: [
    { kind: "block", type: "math_number" },
  ],
};

const WORLD_3D_CATEGORY: ToolboxCategory = {
  kind: "category",
  name: "3D Actions",
  colour: "260",
  contents: [
    { kind: "block", type: "jump" },
    { kind: "block", type: "interact" },
    { kind: "block", type: "if_near_object" },
  ],
};

// ─── Preset toolboxes ───────────────────────────────────────────────

export const DIFFICULTY_TOOLBOXES: Record<Difficulty, ToolboxDef> = {
  beginner: {
    kind: "categoryToolbox",
    contents: [MOVEMENT_CATEGORY],
  },
  intermediate: {
    kind: "categoryToolbox",
    contents: [MOVEMENT_CATEGORY, ITEMS_CATEGORY, LOOPS_CATEGORY, MATH_CATEGORY],
  },
  advanced: {
    kind: "categoryToolbox",
    contents: [
      MOVEMENT_CATEGORY,
      ITEMS_CATEGORY,
      LOOPS_CATEGORY,
      CONDITIONS_CATEGORY,
      MATH_CATEGORY,
    ],
  },
};

export const DIFFICULTY_3D_TOOLBOXES: Record<Difficulty, ToolboxDef> = {
  beginner: {
    kind: "categoryToolbox",
    contents: [MOVEMENT_CATEGORY],
  },
  intermediate: {
    kind: "categoryToolbox",
    contents: [MOVEMENT_CATEGORY, WORLD_3D_CATEGORY, LOOPS_CATEGORY, MATH_CATEGORY],
  },
  advanced: {
    kind: "categoryToolbox",
    contents: [
      MOVEMENT_CATEGORY,
      WORLD_3D_CATEGORY,
      ITEMS_CATEGORY,
      LOOPS_CATEGORY,
      CONDITIONS_CATEGORY,
      MATH_CATEGORY,
    ],
  },
};

/** Build a toolbox from an explicit list of available block types. */
export function buildToolboxFromBlocks(blocks: string[]): ToolboxDef {
  const allCategories = [
    MOVEMENT_CATEGORY,
    ITEMS_CATEGORY,
    LOOPS_CATEGORY,
    CONDITIONS_CATEGORY,
    MATH_CATEGORY,
    WORLD_3D_CATEGORY,
  ];

  const filtered = allCategories
    .map((cat) => ({
      ...cat,
      contents: cat.contents.filter((b) => blocks.includes(b.type)),
    }))
    .filter((cat) => cat.contents.length > 0);

  return { kind: "categoryToolbox", contents: filtered };
}

export const DIFFICULTY_BLOCKS: Record<Difficulty, string[]> = {
  beginner: ["move_forward", "turn_left", "turn_right"],
  intermediate: [
    "move_forward", "turn_left", "turn_right",
    "pick_up", "place_item", "repeat_times", "math_number",
  ],
  advanced: [
    "move_forward", "turn_left", "turn_right",
    "pick_up", "place_item", "repeat_times",
    "while_not_at_goal", "controls_if", "if_wall_ahead",
    "if_item_here", "logic_negate", "math_number",
  ],
};
