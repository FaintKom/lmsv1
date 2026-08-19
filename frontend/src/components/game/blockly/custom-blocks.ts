import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";
import { pythonGenerator, Order as PythonOrder } from "blockly/python";
import { getBlockLabel, getBlockTooltip, getRepeatLabels } from "./block-translations";

// ─── Helper to create a simple movement block ─────────────────────────
function defineMovementBlock(id: string, colour: string) {
 Blockly.Blocks[id] = {
 init(this: Blockly.Block) {
 this.appendDummyInput().appendField(getBlockLabel(id));
 this.setPreviousStatement(true, null);
 this.setNextStatement(true, null);
 this.setColour(colour);
 this.setTooltip(getBlockTooltip(id));
 },
 };
}

// ─── Directional Movement Blocks ────────────────────────────────────
// Scratch color palette
const MOTION = "#4C97FF"; // Movement blocks (blue)
const ITEM = "#FF8C1A"; // Item blocks (orange)
const LOOP = "#FFAB19"; // Loop blocks (amber)
const SENSE = "#5CB1D6"; // Condition blocks (cyan)
const ACTION = "#9966FF"; // 3D action blocks (purple)

defineMovementBlock("move_up", MOTION);
javascriptGenerator.forBlock["move_up"] = () => 'robot.moveUp();\n';
pythonGenerator.forBlock["move_up"] = () => "move_up()\n";

defineMovementBlock("move_down", MOTION);
javascriptGenerator.forBlock["move_down"] = () => 'robot.moveDown();\n';
pythonGenerator.forBlock["move_down"] = () => "move_down()\n";

defineMovementBlock("move_left", MOTION);
javascriptGenerator.forBlock["move_left"] = () => 'robot.moveLeft();\n';
pythonGenerator.forBlock["move_left"] = () => "move_left()\n";

defineMovementBlock("move_right", MOTION);
javascriptGenerator.forBlock["move_right"] = () => 'robot.moveRight();\n';
pythonGenerator.forBlock["move_right"] = () => "move_right()\n";

// Legacy block
defineMovementBlock("move_forward", MOTION);
javascriptGenerator.forBlock["move_forward"] = () => 'robot.moveForward();\n';
pythonGenerator.forBlock["move_forward"] = () => "move_forward()\n";

defineMovementBlock("turn_left", MOTION);
javascriptGenerator.forBlock["turn_left"] = () => 'robot.turnLeft();\n';
pythonGenerator.forBlock["turn_left"] = () => "turn_left()\n";

defineMovementBlock("turn_right", MOTION);
javascriptGenerator.forBlock["turn_right"] = () => 'robot.turnRight();\n';
pythonGenerator.forBlock["turn_right"] = () => "turn_right()\n";

// ─── Item Interaction Blocks ────────────────────────────────────────
defineMovementBlock("pick_up", ITEM);
javascriptGenerator.forBlock["pick_up"] = () => 'robot.pickUp();\n';
pythonGenerator.forBlock["pick_up"] = () => "take()\n";

defineMovementBlock("place_item", ITEM);
javascriptGenerator.forBlock["place_item"] = () => 'robot.placeItem();\n';
pythonGenerator.forBlock["place_item"] = () => "drop()\n";

// ─── Loop Blocks ────────────────────────────────────────────────────
Blockly.Blocks["repeat_times"] = {
 init(this: Blockly.Block) {
 const labels = getRepeatLabels();
 this.appendValueInput("TIMES")
 .setCheck("Number")
 .appendField(getBlockLabel("repeat_times"));
 this.appendDummyInput().appendField(labels.times);
 this.appendStatementInput("DO").appendField(labels.do_);
 this.setPreviousStatement(true, null);
 this.setNextStatement(true, null);
 this.setColour(LOOP);
 this.setTooltip(getBlockTooltip("repeat_times"));
 },
};

javascriptGenerator.forBlock["repeat_times"] = function (
 block: Blockly.Block,
 generator: typeof javascriptGenerator
) {
 const times = generator.valueToCode(block, "TIMES", Order.ATOMIC) || "0";
 const branch = generator.statementToCode(block, "DO");
 return `for (var i = 0; i < ${times}; i++) {\n${branch}}\n`;
};

pythonGenerator.forBlock["repeat_times"] = function (
 block: Blockly.Block,
 generator: typeof pythonGenerator
) {
 const times = generator.valueToCode(block, "TIMES", PythonOrder.ATOMIC) || "0";
 const branch = generator.statementToCode(block, "DO") || " pass\n";
 return `for i in range(${times}):\n${branch}`;
};

// ─── Condition Blocks ───────────────────────────────────────────────
Blockly.Blocks["if_wall_ahead"] = {
 init(this: Blockly.Block) {
 this.appendDummyInput().appendField(getBlockLabel("if_wall_ahead"));
 this.setOutput(true, "Boolean");
 this.setColour(SENSE);
 this.setTooltip(getBlockTooltip("if_wall_ahead"));
 },
};
javascriptGenerator.forBlock["if_wall_ahead"] = () => ['robot.isWallAhead()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_wall_ahead"] = () => ["wall_ahead()", PythonOrder.FUNCTION_CALL];

Blockly.Blocks["if_item_here"] = {
 init(this: Blockly.Block) {
 this.appendDummyInput().appendField(getBlockLabel("if_item_here"));
 this.setOutput(true, "Boolean");
 this.setColour(SENSE);
 this.setTooltip(getBlockTooltip("if_item_here"));
 },
};
javascriptGenerator.forBlock["if_item_here"] = () => ['robot.isItemHere()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_item_here"] = () => ["item_here()", PythonOrder.FUNCTION_CALL];

Blockly.Blocks["while_not_at_goal"] = {
 init(this: Blockly.Block) {
 this.appendStatementInput("DO").appendField(getBlockLabel("while_not_at_goal"));
 this.setPreviousStatement(true, null);
 this.setNextStatement(true, null);
 this.setColour(LOOP);
 this.setTooltip(getBlockTooltip("while_not_at_goal"));
 },
};

javascriptGenerator.forBlock["while_not_at_goal"] = function (
 block: Blockly.Block, generator: typeof javascriptGenerator
) {
 const branch = generator.statementToCode(block, "DO");
 return `while (!robot.isAtGoal()) {\n${branch}}\n`;
};

pythonGenerator.forBlock["while_not_at_goal"] = function (
 block: Blockly.Block, generator: typeof pythonGenerator
) {
 const branch = generator.statementToCode(block, "DO") || " pass\n";
 return `while not at_goal():\n${branch}`;
};

// ─── 3D World Extra Blocks ──────────────────────────────────────────
defineMovementBlock("jump", ACTION);
javascriptGenerator.forBlock["jump"] = () => 'robot.jump();\n';
pythonGenerator.forBlock["jump"] = () => "jump()\n";

// ─── World 3D vocabulary ────────────────────────────────────────────
//
// Block id == command name, as in the 2D vocabulary below: the level stores one
// list of commands and the toolbox is filtered by that same list. If the ids
// drifted from the names, a level offering `press` would show no block for it —
// the class of bug this whole feature exists to remove.
//
// `move_forward`, `turn_left`, `turn_right`, `jump`, `take` and `drop` are
// defined elsewhere in this file and shared. What follows is what only 3D has.

defineMovementBlock("press", ACTION);
javascriptGenerator.forBlock["press"] = () => "robot.interact();\n";
pythonGenerator.forBlock["press"] = () => "press()\n";

/** Sensors, one shape: a boolean with no inputs. */
function defineWorldSensor(id: string, python: string) {
  Blockly.Blocks[id] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(getBlockLabel(id));
      this.setOutput(true, "Boolean");
      this.setColour(SENSE);
      this.setTooltip(getBlockTooltip(id));
    },
  };
  pythonGenerator.forBlock[id] = () => [python, PythonOrder.FUNCTION_CALL];
}

defineWorldSensor("gap_ahead", "gap_ahead()");
defineWorldSensor("step_ahead", "step_ahead()");
defineWorldSensor("button_ahead", "button_ahead()");
defineWorldSensor("door_ahead", "door_ahead()");

defineMovementBlock("interact", ACTION);
javascriptGenerator.forBlock["interact"] = () => 'robot.interact();\n';
pythonGenerator.forBlock["interact"] = () => "interact()\n";

Blockly.Blocks["if_near_object"] = {
 init(this: Blockly.Block) {
 this.appendDummyInput().appendField(getBlockLabel("if_near_object"));
 this.setOutput(true, "Boolean");
 this.setColour(SENSE);
 this.setTooltip(getBlockTooltip("if_near_object"));
 },
};
javascriptGenerator.forBlock["if_near_object"] = () => ['robot.isNearObject()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_near_object"] = () => ["is_near_object()", PythonOrder.FUNCTION_CALL];

// ─── Robot 2D vocabulary ────────────────────────────────────────────
//
// Block id == command name, deliberately. The level stores one list of
// commands and the toolbox is filtered by that same list — if the ids drifted
// from the names, a level offering `take` would show no block for it, which is
// the class of bug this feature exists to remove.
//
// The older `pick_up` / `place_item` / `if_*` blocks above stay where they are:
// World 3D's toolboxes name them, and its runner parses their JavaScript.

const VALUE = "#59C059";

defineMovementBlock("take", ITEM);
javascriptGenerator.forBlock["take"] = () => "robot.pickUp();\n";
pythonGenerator.forBlock["take"] = () => "take()\n";

defineMovementBlock("drop", ITEM);
javascriptGenerator.forBlock["drop"] = () => "robot.placeItem();\n";
pythonGenerator.forBlock["drop"] = () => "drop()\n";

defineMovementBlock("paint", ACTION);
javascriptGenerator.forBlock["paint"] = () => "robot.paint();\n";
pythonGenerator.forBlock["paint"] = () => "paint()\n";

/** Returns the number on this floor. */
Blockly.Blocks["read"] = {
 init(this: Blockly.Block) {
 this.appendDummyInput().appendField(getBlockLabel("read"));
 this.setOutput(true, "Number");
 this.setColour(VALUE);
 this.setTooltip(getBlockTooltip("read"));
 },
};
javascriptGenerator.forBlock["read"] = () => ["robot.read()", Order.FUNCTION_CALL];
pythonGenerator.forBlock["read"] = () => ["read()", PythonOrder.FUNCTION_CALL];

/** Puts a number on this floor. */
Blockly.Blocks["write"] = {
 init(this: Blockly.Block) {
 this.appendValueInput("N").setCheck("Number").appendField(getBlockLabel("write"));
 this.setPreviousStatement(true, null);
 this.setNextStatement(true, null);
 this.setColour(VALUE);
 this.setTooltip(getBlockTooltip("write"));
 },
};
javascriptGenerator.forBlock["write"] = function (
 block: Blockly.Block,
 generator: typeof javascriptGenerator
) {
 const n = generator.valueToCode(block, "N", Order.ATOMIC) || "0";
 return `robot.write(${n});\n`;
};
pythonGenerator.forBlock["write"] = function (
 block: Blockly.Block,
 generator: typeof pythonGenerator
) {
 const n = generator.valueToCode(block, "N", PythonOrder.ATOMIC) || "0";
 return `write(${n})\n`;
};

function defineSensor(id: string, jsCall: string, pyCall: string) {
 Blockly.Blocks[id] = {
 init(this: Blockly.Block) {
 this.appendDummyInput().appendField(getBlockLabel(id));
 this.setOutput(true, "Boolean");
 this.setColour(SENSE);
 this.setTooltip(getBlockTooltip(id));
 },
 };
 javascriptGenerator.forBlock[id] = () => [jsCall, Order.FUNCTION_CALL];
 pythonGenerator.forBlock[id] = () => [pyCall, PythonOrder.FUNCTION_CALL];
}

defineSensor("wall_ahead", "robot.isWallAhead()", "wall_ahead()");
defineSensor("item_here", "robot.isItemHere()", "item_here()");
defineSensor("at_goal", "robot.isAtGoal()", "at_goal()");
defineSensor("painted", "robot.isPainted()", "painted()");
defineSensor("value_here", "robot.hasValue()", "value_here()");

/** Every command a Robot 2D level can offer, as block ids. */
export const ALL_ROBOT_COMMANDS = [
 "move_up", "move_down", "move_left", "move_right",
 "move_forward", "turn_left", "turn_right",
 "take", "drop", "paint", "read", "write",
 "wall_ahead", "item_here", "at_goal", "painted", "value_here",
] as const;

// ─── All block types ────────────────────────────────────────────────

export const ALL_ROBOT_BLOCKS = [
 "move_up", "move_down", "move_left", "move_right",
 "move_forward", "turn_left", "turn_right",
 "pick_up", "place_item",
 "repeat_times", "if_wall_ahead", "if_item_here", "while_not_at_goal",
] as const;

export const ALL_3D_BLOCKS = [
 ...ALL_ROBOT_BLOCKS, "jump", "interact", "if_near_object",
] as const;

export type RobotBlockType = (typeof ALL_ROBOT_BLOCKS)[number];
export type Block3DType = (typeof ALL_3D_BLOCKS)[number];
