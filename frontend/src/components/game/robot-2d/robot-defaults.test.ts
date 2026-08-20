import { describe, expect, it } from "vitest";

import { robotDefaultsApplied, withRobotDefaults } from "./robot-defaults";

/**
 * Обход авторства 2026-08-21, находка 14: «Check this level» отвечал
 * «No path to the goal.» на уровень со стартом (0,4), целью (4,2) и без
 * стен. Путь — два вверх и четыре вправо; отказ был не про путь.
 *
 * В конфиге не было `win`, а `evaluate()` для уровня без условия победы
 * возвращает false всегда: поиск обходил уровень, который выиграть нельзя.
 * Условие «дойти до цели» рисовалось в форме, но никуда не записывалось.
 */

describe("умолчания уровня робота", () => {
  it("пустой уровень получает условие победы — иначе его нельзя пройти", () => {
    expect(withRobotDefaults({}).win).toEqual({ cond: "at_goal" });
  });

  it("старт записывается, а не только рисуется на сетке", () => {
    expect(withRobotDefaults({}).start).toEqual({ x: 0, y: 0, facing: "right" });
  });

  it("размер поля записывается тем же, что показывают поля формы", () => {
    const filled = withRobotDefaults({});
    expect(filled.grid_width).toBe(5);
    expect(filled.grid_height).toBe(5);
    expect(filled.max_steps).toBe(500);
  });

  it("заданное учителем не переписывается", () => {
    const authored = {
      grid_width: 8,
      grid_height: 6,
      start: { x: 0, y: 4, facing: "right" },
      win: { op: "and", of: [{ cond: "at_goal" }, { cond: "all_items_taken" }] },
      max_steps: 12,
      cells: [{ x: 4, y: 2, type: "goal" }],
    };
    expect(withRobotDefaults(authored)).toEqual(authored);
  });

  it("остальные поля конфига не теряются", () => {
    const cells = [{ x: 4, y: 2, type: "goal" }];
    expect(withRobotDefaults({ cells, commands: ["move_up"] })).toMatchObject({
      cells,
      commands: ["move_up"],
    });
  });

  it("видно, надо ли вообще что-то дописывать", () => {
    expect(robotDefaultsApplied({})).toBe(false);
    expect(robotDefaultsApplied({ cells: [] })).toBe(false);
    expect(robotDefaultsApplied(withRobotDefaults({}))).toBe(true);
  });
});
