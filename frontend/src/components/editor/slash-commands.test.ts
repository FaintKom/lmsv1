import { describe, expect, it } from "vitest";

import ru from "@/lib/i18n/locales/ru";
import en from "@/lib/i18n/locales/en";
import { slashItems } from "./slash-commands";

const tr = (map: Record<string, string>) => (key: string) => map[key] ?? key;

describe("slashItems", () => {
  it("names every command in the reader's language and fills the heading level", () => {
    const titles = slashItems(tr(ru), "").map((i) => i.title);
    expect(titles).toContain("Заголовок 2");
    expect(titles.every((t) => !t.startsWith("be."))).toBe(true);
  });

  it("filters by the translated name, not the English one", () => {
    expect(slashItems(tr(ru), "заг").map((i) => i.title)).toEqual([
      "Заголовок 1",
      "Заголовок 2",
      "Заголовок 3",
    ]);
    expect(slashItems(tr(ru), "heading")).toEqual([]);
    expect(slashItems(tr(en), "heading")).toHaveLength(3);
  });
});
