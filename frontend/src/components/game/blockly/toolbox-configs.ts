import { getCategoryName } from "./block-translations";

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

// Scratch color palette
const MOTION = "#4C97FF";
const ITEM = "#FF8C1A";
const LOOP = "#FFAB19";
const SENSE = "#5CB1D6";
const MATH = "#59C059";
const ACTION = "#9966FF";

function makeCategory(id: string, colour: string, contents: { kind: "block"; type: string; [key: string]: unknown }[]): ToolboxCategory {
 return { kind: "category", name: getCategoryName(id), colour, contents };
}

function movementCategory(): ToolboxCategory {
 return makeCategory("movement", MOTION, [
 { kind: "block", type: "move_up" },
 { kind: "block", type: "move_down" },
 { kind: "block", type: "move_left" },
 { kind: "block", type: "move_right" },
 ]);
}

function itemsCategory(): ToolboxCategory {
 return makeCategory("items", ITEM, [
 { kind: "block", type: "pick_up" },
 { kind: "block", type: "place_item" },
 ]);
}

function loopsCategory(): ToolboxCategory {
 return makeCategory("loops", LOOP, [
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
 ]);
}

function conditionsCategory(): ToolboxCategory {
 return makeCategory("conditions", SENSE, [
 { kind: "block", type: "controls_if" },
 { kind: "block", type: "if_wall_ahead" },
 { kind: "block", type: "if_item_here" },
 { kind: "block", type: "logic_negate" },
 ]);
}

function mathCategory(): ToolboxCategory {
 return makeCategory("numbers", MATH, [
 { kind: "block", type: "math_number" },
 ]);
}

function world3dCategory(): ToolboxCategory {
 return makeCategory("actions3d", ACTION, [
 { kind: "block", type: "jump" },
 { kind: "block", type: "interact" },
 { kind: "block", type: "if_near_object" },
 ]);
}

// ─── Preset toolboxes ───────────────────────────────────────────────

export const DIFFICULTY_TOOLBOXES: Record<Difficulty, ToolboxDef> = {
 beginner: {
 kind: "categoryToolbox",
 contents: [movementCategory()],
 },
 intermediate: {
 kind: "categoryToolbox",
 contents: [movementCategory(), itemsCategory(), loopsCategory(), mathCategory()],
 },
 advanced: {
 kind: "categoryToolbox",
 contents: [
 movementCategory(),
 itemsCategory(),
 loopsCategory(),
 conditionsCategory(),
 mathCategory(),
 ],
 },
};

export const DIFFICULTY_3D_TOOLBOXES: Record<Difficulty, ToolboxDef> = {
 beginner: {
 kind: "categoryToolbox",
 contents: [movementCategory()],
 },
 intermediate: {
 kind: "categoryToolbox",
 contents: [movementCategory(), world3dCategory(), loopsCategory(), mathCategory()],
 },
 advanced: {
 kind: "categoryToolbox",
 contents: [
 movementCategory(),
 world3dCategory(),
 itemsCategory(),
 loopsCategory(),
 conditionsCategory(),
 mathCategory(),
 ],
 },
};

/**
 * Build a Robot 2D toolbox from the commands a level offers.
 *
 * Block ids equal command names, so this is a plain filter — the level's one
 * list drives the palette, and it cannot offer a command whose block is absent.
 *
 * Control flow is not filtered. `for`, `while` and `if` are Python, not
 * commands the world grants: a level withholds `paint`, never `if`.
 */
export function buildToolboxFromBlocks(commands: string[]): ToolboxDef {
 const offered = new Set(commands);
 const has = (...names: string[]) => names.some((n) => offered.has(n));
 const only = (...names: string[]) =>
 names.filter((n) => offered.has(n)).map((type) => ({ kind: "block" as const, type }));

 const contents: ToolboxCategory[] = [];

 const moves = only(
 "move_up",
 "move_down",
 "move_left",
 "move_right",
 "move_forward",
 "turn_left",
 "turn_right",
 );
 if (moves.length > 0) contents.push(makeCategory("movement", MOTION, moves));

 const handling = only("take", "drop", "paint");
 if (handling.length > 0) contents.push(makeCategory("items", ITEM, handling));

 if (has("read", "write")) {
 contents.push(
 makeCategory("numbers", MATH, [
 ...only("read"),
 ...(offered.has("write")
 ? [
 {
 kind: "block" as const,
 type: "write",
 inputs: { N: { shadow: { type: "math_number", fields: { NUM: 1 } } } },
 },
 ]
 : []),
 { kind: "block" as const, type: "math_number" },
 ]),
 );
 }

 const sensing = only("wall_ahead", "item_here", "at_goal", "painted", "value_here");
 contents.push(
 makeCategory("conditions", SENSE, [
 { kind: "block", type: "controls_if" },
 ...sensing,
 ...(sensing.length > 0 ? [{ kind: "block" as const, type: "logic_negate" }] : []),
 ]),
 );

 // Always present: this is the language, not the level's gift.
 contents.push(
 makeCategory("loops", LOOP, [
 {
 kind: "block",
 type: "repeat_times",
 inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 3 } } } },
 },
 ...(offered.has("at_goal") ? [{ kind: "block" as const, type: "while_not_at_goal" }] : []),
 ]),
 );

 if (!has("read", "write")) contents.push(mathCategory());

 return { kind: "categoryToolbox", contents };
}

export const DIFFICULTY_BLOCKS: Record<Difficulty, string[]> = {
 beginner: ["move_up", "move_down", "move_left", "move_right"],
 intermediate: [
 "move_up", "move_down", "move_left", "move_right",
 "pick_up", "place_item", "repeat_times", "math_number",
 ],
 advanced: [
 "move_up", "move_down", "move_left", "move_right",
 "pick_up", "place_item", "repeat_times",
 "while_not_at_goal", "controls_if", "if_wall_ahead",
 "if_item_here", "logic_negate", "math_number",
 ],
};
