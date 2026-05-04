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
const MOTION = "#4C97FF";    // Movement blocks (blue)
const ITEM = "#FF8C1A";      // Item blocks (orange)
const LOOP = "#FFAB19";      // Loop blocks (amber)
const SENSE = "#5CB1D6";     // Condition blocks (cyan)
const ACTION = "#9966FF";    // 3D action blocks (purple)

defineMovementBlock("move_up", MOTION);
javascriptGenerator.forBlock["move_up"] = () => 'robot.moveUp();\n';
pythonGenerator.forBlock["move_up"] = () => "robot.move_up()\n";

defineMovementBlock("move_down", MOTION);
javascriptGenerator.forBlock["move_down"] = () => 'robot.moveDown();\n';
pythonGenerator.forBlock["move_down"] = () => "robot.move_down()\n";

defineMovementBlock("move_left", MOTION);
javascriptGenerator.forBlock["move_left"] = () => 'robot.moveLeft();\n';
pythonGenerator.forBlock["move_left"] = () => "robot.move_left()\n";

defineMovementBlock("move_right", MOTION);
javascriptGenerator.forBlock["move_right"] = () => 'robot.moveRight();\n';
pythonGenerator.forBlock["move_right"] = () => "robot.move_right()\n";

// Legacy block
defineMovementBlock("move_forward", MOTION);
javascriptGenerator.forBlock["move_forward"] = () => 'robot.moveForward();\n';
pythonGenerator.forBlock["move_forward"] = () => "robot.move_forward()\n";

defineMovementBlock("turn_left", MOTION);
javascriptGenerator.forBlock["turn_left"] = () => 'robot.turnLeft();\n';
pythonGenerator.forBlock["turn_left"] = () => "robot.turn_left()\n";

defineMovementBlock("turn_right", MOTION);
javascriptGenerator.forBlock["turn_right"] = () => 'robot.turnRight();\n';
pythonGenerator.forBlock["turn_right"] = () => "robot.turn_right()\n";

// ─── Item Interaction Blocks ────────────────────────────────────────
defineMovementBlock("pick_up", ITEM);
javascriptGenerator.forBlock["pick_up"] = () => 'robot.pickUp();\n';
pythonGenerator.forBlock["pick_up"] = () => "robot.pick_up()\n";

defineMovementBlock("place_item", ITEM);
javascriptGenerator.forBlock["place_item"] = () => 'robot.placeItem();\n';
pythonGenerator.forBlock["place_item"] = () => "robot.place_item()\n";

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
  const branch = generator.statementToCode(block, "DO") || "  pass\n";
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
pythonGenerator.forBlock["if_wall_ahead"] = () => ["robot.is_wall_ahead()", PythonOrder.FUNCTION_CALL];

Blockly.Blocks["if_item_here"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField(getBlockLabel("if_item_here"));
    this.setOutput(true, "Boolean");
    this.setColour(SENSE);
    this.setTooltip(getBlockTooltip("if_item_here"));
  },
};
javascriptGenerator.forBlock["if_item_here"] = () => ['robot.isItemHere()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_item_here"] = () => ["robot.is_item_here()", PythonOrder.FUNCTION_CALL];

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
  const branch = generator.statementToCode(block, "DO") || "  pass\n";
  return `while not robot.is_at_goal():\n${branch}`;
};

// ─── 3D World Extra Blocks ──────────────────────────────────────────
defineMovementBlock("jump", ACTION);
javascriptGenerator.forBlock["jump"] = () => 'robot.jump();\n';
pythonGenerator.forBlock["jump"] = () => "robot.jump()\n";

defineMovementBlock("interact", ACTION);
javascriptGenerator.forBlock["interact"] = () => 'robot.interact();\n';
pythonGenerator.forBlock["interact"] = () => "robot.interact()\n";

Blockly.Blocks["if_near_object"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField(getBlockLabel("if_near_object"));
    this.setOutput(true, "Boolean");
    this.setColour(SENSE);
    this.setTooltip(getBlockTooltip("if_near_object"));
  },
};
javascriptGenerator.forBlock["if_near_object"] = () => ['robot.isNearObject()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_near_object"] = () => ["robot.is_near_object()", PythonOrder.FUNCTION_CALL];

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
