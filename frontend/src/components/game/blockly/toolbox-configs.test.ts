import { describe, expect, it } from "vitest";

import { buildToolboxFromBlocks } from "./toolbox-configs";

/** Every block type the toolbox offers, across all its categories. */
function offered(commands: string[]): string[] {
  return buildToolboxFromBlocks(commands)
    .contents.flatMap((category) => category.contents)
    .map((block) => block.type);
}

describe("buildToolboxFromBlocks", () => {
  it("offers a palette for the default command set", () => {
    // The regression: this returned nothing at all. No category contained
    // `move_forward`, so a level built on the defaults showed an empty toolbox
    // and a pupil had no blocks to drag.
    const blocks = offered(["move_forward", "turn_left", "turn_right", "at_goal"]);

    expect(blocks).toContain("move_forward");
    expect(blocks).toContain("turn_left");
    expect(blocks).toContain("turn_right");
  });

  it("offers exactly the movement commands a level chose", () => {
    const blocks = offered(["move_up", "move_down", "move_left", "move_right"]);

    expect(blocks).toContain("move_up");
    expect(blocks).not.toContain("move_forward");
    expect(blocks).not.toContain("turn_left");
  });

  it("withholds a command the level did not offer", () => {
    const blocks = offered(["move_forward"]);

    expect(blocks).not.toContain("take");
    expect(blocks).not.toContain("paint");
    expect(blocks).not.toContain("wall_ahead");
  });

  it("offers items and paint only when they are granted", () => {
    expect(offered(["move_forward", "take"])).toContain("take");
    expect(offered(["move_forward", "take"])).not.toContain("drop");
    expect(offered(["move_forward", "paint"])).toContain("paint");
  });

  it("offers the number blocks with read and write", () => {
    const blocks = offered(["move_forward", "read", "write"]);

    expect(blocks).toContain("read");
    expect(blocks).toContain("write");
    expect(blocks).toContain("math_number");
  });

  it("offers the sensors a level granted, and negation with them", () => {
    const blocks = offered(["move_forward", "wall_ahead"]);

    expect(blocks).toContain("wall_ahead");
    expect(blocks).toContain("logic_negate");
    expect(blocks).not.toContain("item_here");
  });

  it("always offers control flow, because it is the language and not a gift", () => {
    // A level withholds `paint`. It does not withhold `if`.
    const bare = offered(["move_forward"]);

    expect(bare).toContain("repeat_times");
    expect(bare).toContain("controls_if");
  });

  it("offers the goal loop only where the goal can be sensed", () => {
    expect(offered(["move_forward", "at_goal"])).toContain("while_not_at_goal");
    expect(offered(["move_forward"])).not.toContain("while_not_at_goal");
  });

  it("still yields a usable workspace for an empty command list", () => {
    const toolbox = buildToolboxFromBlocks([]);

    expect(toolbox.kind).toBe("categoryToolbox");
    expect(toolbox.contents.length).toBeGreaterThan(0);
    expect(toolbox.contents.every((c) => c.contents.length > 0)).toBe(true);
  });

  it("offers every command when a level grants every command", () => {
    const all = [
      "move_up",
      "move_down",
      "move_left",
      "move_right",
      "move_forward",
      "turn_left",
      "turn_right",
      "take",
      "drop",
      "paint",
      "read",
      "write",
      "wall_ahead",
      "item_here",
      "at_goal",
      "painted",
      "value_here",
    ];
    const blocks = offered(all);

    for (const command of all) {
      expect(blocks, `missing block for ${command}`).toContain(command);
    }
  });
});
