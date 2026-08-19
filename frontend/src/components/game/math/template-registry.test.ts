import { describe, expect, it } from "vitest";

import { MATH_TEMPLATES, TEMPLATE_LIST } from "./template-registry";

// specs/016-authoring-quick-fixes US4: the picker showed four templates twice
// because legacy alias entries passed the TEMPLATE_LIST filter.
const ALIASES: Record<string, string> = {
  function_graphing: "function_graph",
  graph_transformation: "graph_transform",
  inequality_graphing: "inequality_graph",
  card_sorting: "card_sort",
};

describe("math template registry", () => {
  it("lists each template exactly once in the picker", () => {
    const labels = TEMPLATE_LIST.map((t) => t.label);
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    expect(dupes).toEqual([]);
  });

  it("keeps legacy alias names resolving to their canonical components", () => {
    for (const [alias, canonical] of Object.entries(ALIASES)) {
      expect(MATH_TEMPLATES[alias], alias).toBeDefined();
      expect(MATH_TEMPLATES[alias].component, alias).toBe(
        MATH_TEMPLATES[canonical].component
      );
    }
  });
});
