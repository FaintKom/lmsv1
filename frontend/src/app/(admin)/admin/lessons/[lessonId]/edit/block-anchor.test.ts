import { describe, expect, it } from "vitest";

import { anchoredBlockId } from "./block-anchor";

/**
 * К какому блоку прокрутиться, когда редактор открыт по ссылке из списка
 * урока на странице курса.
 *
 * Хэш здесь не годится: блоки рисуются из состояния, и в момент, когда
 * браузер разбирает адрес, ни одного из них на странице ещё нет — промах
 * вышел бы молчаливым. Поэтому обычный параметр, разобранный кодом.
 */

describe("якорь на блок", () => {
  it("параметр block даёт идентификатор", () => {
    expect(anchoredBlockId(new URLSearchParams("courseId=c1&moduleId=m1&block=block_42"))).toBe(
      "block_42",
    );
  });

  it("без параметра прокручивать некуда", () => {
    expect(anchoredBlockId(new URLSearchParams("courseId=c1&moduleId=m1"))).toBeNull();
  });

  it("пустой параметр — то же самое, что его отсутствие", () => {
    expect(anchoredBlockId(new URLSearchParams("block="))).toBeNull();
    expect(anchoredBlockId(new URLSearchParams("block=%20%20"))).toBeNull();
  });

  it("пробелы по краям не мешают", () => {
    expect(anchoredBlockId(new URLSearchParams("block=%20block_7%20"))).toBe("block_7");
  });

  it("адреса может не быть вовсе", () => {
    expect(anchoredBlockId(null)).toBeNull();
  });
});
