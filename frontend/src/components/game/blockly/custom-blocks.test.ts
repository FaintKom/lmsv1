import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { afterEach, describe, expect, it } from "vitest";

import { ALL_ROBOT_COMMANDS } from "./custom-blocks";

let workspace: Blockly.Workspace | null = null;

afterEach(() => {
  workspace?.dispose();
  workspace = null;
});

/** The Python a workspace holding exactly these blocks generates. */
function pythonFor(...types: string[]): string {
  workspace = new Blockly.Workspace();
  let previous: Blockly.Block | null = null;

  for (const type of types) {
    const block = workspace.newBlock(type);
    if (previous?.nextConnection && block.previousConnection) {
      previous.nextConnection.connect(block.previousConnection);
    }
    previous = block;
  }

  return pythonGenerator.workspaceToCode(workspace);
}

describe("the Python a block writes", () => {
  it("writes the command a child would type, with no object prefix", () => {
    // The defect: these emitted `robot.move_up()`, which the runner does not
    // know. Block mode produced a program the server rejected, while the same
    // solution typed by hand ran fine — the two editors were not speaking the
    // same language.
    expect(pythonFor("move_up")).toBe("move_up()\n");
    expect(pythonFor("move_forward")).toBe("move_forward()\n");
    expect(pythonFor("turn_left")).toBe("turn_left()\n");
  });

  it("writes take and drop, not pick_up and place_item", () => {
    expect(pythonFor("take")).toBe("take()\n");
    expect(pythonFor("drop")).toBe("drop()\n");
  });

  it("writes paint", () => {
    expect(pythonFor("paint")).toBe("paint()\n");
  });

  it("writes a sequence in the order the blocks are stacked", () => {
    expect(pythonFor("move_forward", "turn_right", "move_forward")).toBe(
      "move_forward()\nturn_right()\nmove_forward()\n",
    );
  });

  it("writes a loop a pupil could have typed", () => {
    const python = pythonFor("while_not_at_goal");

    expect(python).toContain("while not at_goal():");
    expect(python).not.toContain("robot.");
  });

  it("registers a block for every command a level can offer", () => {
    for (const command of ALL_ROBOT_COMMANDS) {
      expect(Blockly.Blocks[command], `no block registered for ${command}`).toBeDefined();
    }
  });

  it("keeps every command name inside fourteen characters", () => {
    // The same contract the simulator asserts, held on this side too — a block
    // added here without a command is a command the runner will refuse.
    expect(ALL_ROBOT_COMMANDS.filter((c) => c.length > 14)).toEqual([]);
  });
});
