import { describe, expect, it } from "vitest";

import { withWorldDefaults, worldDefaultsApplied } from "./world-defaults";

/**
 * Тот же дефект, что у двумерного близнеца, — найден проверкой прода
 * 2026-08-21. У задания «Cross the platforms to the flag» в сохранённом
 * конфиге нет `win`: условие победы рисовалось в форме и не записывалось.
 *
 * `evaluate()` для уровня без условия победы возвращает false всегда, то
 * есть уровень не может пройти никто — ни ученик, ни проверка.
 */

describe("умолчания трёхмерного уровня", () => {
  it("пустой уровень получает условие победы", () => {
    expect(withWorldDefaults({}).win).toEqual({ cond: "at_goal" });
  });

  it("старт записывается вместе с направлением взгляда", () => {
    expect(withWorldDefaults({}).start).toEqual({ x: 0, y: 0, z: 0, facing: "north" });
  });

  it("размер поля — тот же, что показывает форма", () => {
    const filled = withWorldDefaults({});
    expect(filled.grid_width).toBe(6);
    expect(filled.grid_depth).toBe(6);
    expect(filled.max_steps).toBe(500);
  });

  it("заданное учителем не переписывается", () => {
    const authored = {
      grid_width: 8,
      grid_depth: 10,
      start: { x: 1, y: 2, z: 3, facing: "south" },
      win: { op: "and", of: [{ cond: "at_goal" }, { cond: "all_items_taken" }] },
      max_steps: 30,
      cells: [{ x: 4, y: 0, z: 2, type: "goal" }],
    };
    expect(withWorldDefaults(authored)).toEqual(authored);
  });

  it("остальные поля конфига не теряются", () => {
    const cells = [{ x: 4, y: 0, z: 2, type: "goal" }];
    expect(withWorldDefaults({ cells, commands: ["move_forward"] })).toMatchObject({
      cells,
      commands: ["move_forward"],
    });
  });

  it("видно, надо ли дописывать", () => {
    expect(worldDefaultsApplied({})).toBe(false);
    expect(worldDefaultsApplied(withWorldDefaults({}))).toBe(true);
  });
});
