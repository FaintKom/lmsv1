import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";
import { pythonGenerator, Order as PythonOrder } from "blockly/python";

// ─── Directional Movement Blocks ────────────────────────────────────

Blockly.Blocks["move_up"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("⬆️  вверх");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Повернуться вверх и сделать шаг");
  },
};
javascriptGenerator.forBlock["move_up"] = () => 'robot.moveUp();\n';
pythonGenerator.forBlock["move_up"] = () => "robot.move_up()\n";

Blockly.Blocks["move_down"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("⬇️  вниз");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Повернуться вниз и сделать шаг");
  },
};
javascriptGenerator.forBlock["move_down"] = () => 'robot.moveDown();\n';
pythonGenerator.forBlock["move_down"] = () => "robot.move_down()\n";

Blockly.Blocks["move_left"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("⬅️  влево");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Повернуться влево и сделать шаг");
  },
};
javascriptGenerator.forBlock["move_left"] = () => 'robot.moveLeft();\n';
pythonGenerator.forBlock["move_left"] = () => "robot.move_left()\n";

Blockly.Blocks["move_right"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("➡️  вправо");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Повернуться вправо и сделать шаг");
  },
};
javascriptGenerator.forBlock["move_right"] = () => 'robot.moveRight();\n';
pythonGenerator.forBlock["move_right"] = () => "robot.move_right()\n";

// Keep legacy blocks for backward compat (old levels)
Blockly.Blocks["move_forward"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("⬆️  вперёд");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Двигаться на одну клетку вперёд");
  },
};
javascriptGenerator.forBlock["move_forward"] = () => 'robot.moveForward();\n';
pythonGenerator.forBlock["move_forward"] = () => "robot.move_forward()\n";

Blockly.Blocks["turn_left"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("↩️  повернуть влево");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Повернуть налево на 90°");
  },
};
javascriptGenerator.forBlock["turn_left"] = () => 'robot.turnLeft();\n';
pythonGenerator.forBlock["turn_left"] = () => "robot.turn_left()\n";

Blockly.Blocks["turn_right"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("↪️  повернуть вправо");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#4C97FF");
    this.setTooltip("Повернуть направо на 90°");
  },
};
javascriptGenerator.forBlock["turn_right"] = () => 'robot.turnRight();\n';
pythonGenerator.forBlock["turn_right"] = () => "robot.turn_right()\n";

// ─── Item Interaction Blocks ────────────────────────────────────────

Blockly.Blocks["pick_up"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("⭐  подобрать");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#FF8C1A");
    this.setTooltip("Подобрать предмет на текущей клетке");
  },
};
javascriptGenerator.forBlock["pick_up"] = () => 'robot.pickUp();\n';
pythonGenerator.forBlock["pick_up"] = () => "robot.pick_up()\n";

Blockly.Blocks["place_item"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("📦  положить");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#FF8C1A");
    this.setTooltip("Положить предмет на текущую клетку");
  },
};
javascriptGenerator.forBlock["place_item"] = () => 'robot.placeItem();\n';
pythonGenerator.forBlock["place_item"] = () => "robot.place_item()\n";

// ─── Loop Blocks ────────────────────────────────────────────────────

Blockly.Blocks["repeat_times"] = {
  init(this: Blockly.Block) {
    this.appendValueInput("TIMES")
      .setCheck("Number")
      .appendField("🔄  повтори");
    this.appendDummyInput().appendField("раз");
    this.appendStatementInput("DO").appendField("делай");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#40BF4A");
    this.setTooltip("Повторить команды указанное число раз");
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
    this.appendDummyInput().appendField("🧱  стена впереди?");
    this.setOutput(true, "Boolean");
    this.setColour("#FF6680");
    this.setTooltip("Проверить, есть ли стена впереди");
  },
};
javascriptGenerator.forBlock["if_wall_ahead"] = () => ['robot.isWallAhead()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_wall_ahead"] = () => ["robot.is_wall_ahead()", PythonOrder.FUNCTION_CALL];

Blockly.Blocks["if_item_here"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("⭐  предмет здесь?");
    this.setOutput(true, "Boolean");
    this.setColour("#FF6680");
    this.setTooltip("Проверить, есть ли предмет на текущей клетке");
  },
};
javascriptGenerator.forBlock["if_item_here"] = () => ['robot.isItemHere()', Order.FUNCTION_CALL];
pythonGenerator.forBlock["if_item_here"] = () => ["robot.is_item_here()", PythonOrder.FUNCTION_CALL];

Blockly.Blocks["while_not_at_goal"] = {
  init(this: Blockly.Block) {
    this.appendStatementInput("DO").appendField("🏁  пока не на цели, делай");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#40BF4A");
    this.setTooltip("Повторять, пока робот не достигнет цели");
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

Blockly.Blocks["jump"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("🦘  прыжок");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#9966FF");
    this.setTooltip("Прыгнуть вперёд");
  },
};
javascriptGenerator.forBlock["jump"] = () => 'robot.jump();\n';
pythonGenerator.forBlock["jump"] = () => "robot.jump()\n";

Blockly.Blocks["interact"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("👆  нажать");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#9966FF");
    this.setTooltip("Нажать кнопку или открыть дверь");
  },
};
javascriptGenerator.forBlock["interact"] = () => 'robot.interact();\n';
pythonGenerator.forBlock["interact"] = () => "robot.interact()\n";

Blockly.Blocks["if_near_object"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("🔍  объект рядом?");
    this.setOutput(true, "Boolean");
    this.setColour("#FF6680");
    this.setTooltip("Проверить, есть ли кнопка или дверь впереди");
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
