import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";
import { pythonGenerator, Order as PythonOrder } from "blockly/python";

// ─── Robot Movement Blocks ──────────────────────────────────────────

Blockly.Blocks["move_forward"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("move forward");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setTooltip("Move the robot one step forward");
  },
};

javascriptGenerator.forBlock["move_forward"] = function () {
  return 'robot.moveForward();\n';
};

pythonGenerator.forBlock["move_forward"] = function () {
  return "robot.move_forward()\n";
};

Blockly.Blocks["turn_left"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("turn left");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setTooltip("Turn the robot 90 degrees to the left");
  },
};

javascriptGenerator.forBlock["turn_left"] = function () {
  return 'robot.turnLeft();\n';
};

pythonGenerator.forBlock["turn_left"] = function () {
  return "robot.turn_left()\n";
};

Blockly.Blocks["turn_right"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("turn right");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setTooltip("Turn the robot 90 degrees to the right");
  },
};

javascriptGenerator.forBlock["turn_right"] = function () {
  return 'robot.turnRight();\n';
};

pythonGenerator.forBlock["turn_right"] = function () {
  return "robot.turn_right()\n";
};

// ─── Item Interaction Blocks ────────────────────────────────────────

Blockly.Blocks["pick_up"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("pick up item");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("Pick up an item at the current position");
  },
};

javascriptGenerator.forBlock["pick_up"] = function () {
  return 'robot.pickUp();\n';
};

pythonGenerator.forBlock["pick_up"] = function () {
  return "robot.pick_up()\n";
};

Blockly.Blocks["place_item"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("place item");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("Place an item at the current position");
  },
};

javascriptGenerator.forBlock["place_item"] = function () {
  return 'robot.placeItem();\n';
};

pythonGenerator.forBlock["place_item"] = function () {
  return "robot.place_item()\n";
};

// ─── Loop Blocks ────────────────────────────────────────────────────

Blockly.Blocks["repeat_times"] = {
  init(this: Blockly.Block) {
    this.appendValueInput("TIMES")
      .setCheck("Number")
      .appendField("repeat");
    this.appendDummyInput().appendField("times");
    this.appendStatementInput("DO").appendField("do");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Repeat commands a specific number of times");
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
    this.appendDummyInput().appendField("wall ahead?");
    this.setOutput(true, "Boolean");
    this.setColour(330);
    this.setTooltip("Check if there is a wall in front of the robot");
  },
};

javascriptGenerator.forBlock["if_wall_ahead"] = function () {
  return ['robot.isWallAhead()', Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["if_wall_ahead"] = function () {
  return ["robot.is_wall_ahead()", PythonOrder.FUNCTION_CALL];
};

Blockly.Blocks["if_item_here"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("item here?");
    this.setOutput(true, "Boolean");
    this.setColour(330);
    this.setTooltip("Check if there is an item at the current position");
  },
};

javascriptGenerator.forBlock["if_item_here"] = function () {
  return ['robot.isItemHere()', Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["if_item_here"] = function () {
  return ["robot.is_item_here()", PythonOrder.FUNCTION_CALL];
};

Blockly.Blocks["while_not_at_goal"] = {
  init(this: Blockly.Block) {
    this.appendStatementInput("DO").appendField("while not at goal, do");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Repeat until the robot reaches the goal");
  },
};

javascriptGenerator.forBlock["while_not_at_goal"] = function (
  block: Blockly.Block,
  generator: typeof javascriptGenerator
) {
  const branch = generator.statementToCode(block, "DO");
  return `while (!robot.isAtGoal()) {\n${branch}}\n`;
};

pythonGenerator.forBlock["while_not_at_goal"] = function (
  block: Blockly.Block,
  generator: typeof pythonGenerator
) {
  const branch = generator.statementToCode(block, "DO") || "  pass\n";
  return `while not robot.is_at_goal():\n${branch}`;
};

// ─── 3D World Extra Blocks ──────────────────────────────────────────

Blockly.Blocks["jump"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("jump");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(260);
    this.setTooltip("Make the character jump");
  },
};

javascriptGenerator.forBlock["jump"] = function () {
  return 'robot.jump();\n';
};

pythonGenerator.forBlock["jump"] = function () {
  return "robot.jump()\n";
};

Blockly.Blocks["interact"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("interact");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(260);
    this.setTooltip("Interact with nearby object (press button, open door)");
  },
};

javascriptGenerator.forBlock["interact"] = function () {
  return 'robot.interact();\n';
};

pythonGenerator.forBlock["interact"] = function () {
  return "robot.interact()\n";
};

Blockly.Blocks["if_near_object"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("near object?");
    this.setOutput(true, "Boolean");
    this.setColour(330);
    this.setTooltip("Check if the character is near an interactable object");
  },
};

javascriptGenerator.forBlock["if_near_object"] = function () {
  return ['robot.isNearObject()', Order.FUNCTION_CALL];
};

pythonGenerator.forBlock["if_near_object"] = function () {
  return ["robot.is_near_object()", PythonOrder.FUNCTION_CALL];
};

// ─── All block types ────────────────────────────────────────────────

export const ALL_ROBOT_BLOCKS = [
  "move_forward",
  "turn_left",
  "turn_right",
  "pick_up",
  "place_item",
  "repeat_times",
  "if_wall_ahead",
  "if_item_here",
  "while_not_at_goal",
] as const;

export const ALL_3D_BLOCKS = [
  ...ALL_ROBOT_BLOCKS,
  "jump",
  "interact",
  "if_near_object",
] as const;

export type RobotBlockType = (typeof ALL_ROBOT_BLOCKS)[number];
export type Block3DType = (typeof ALL_3D_BLOCKS)[number];
