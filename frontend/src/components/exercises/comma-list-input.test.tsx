import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CommaListInput } from "./comma-list-input";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

/**
 * Поле списка через запятую.
 *
 * Дефект, ради которого написан этот файл, живёт только в посимвольном
 * наборе: поле пересобирало себя из разобранного списка, разбор выбрасывал
 * пустой кусок после только что нажатой запятой, и запятая исчезала раньше,
 * чем учитель успевал нажать следующую клавишу. `x, y` превращалось в `xy`.
 *
 * Поэтому набор здесь идёт по одному символу и каждый раз дописывается
 * к тому, что поле показывает СЕЙЧАС. Браузер делает так же. Событие
 * с целой строкой — это вставка из буфера, и она проходила и на сломанном
 * поле; такой тест не поймал бы ничего.
 */

/** Набор с клавиатуры: символ за символом, поверх показанного. */
function typeInto(input: HTMLInputElement, text: string) {
  for (const ch of text) {
    fireEvent.change(input, { target: { value: input.value + ch } });
  }
}

/** Родитель, как в редакторах: держит список и отдаёт новый массив назад. */
function Harness({
  initial = [],
  onList,
}: {
  initial?: string[];
  onList?: (v: string[]) => void;
}) {
  const [list, setList] = useState(initial);
  return (
    <>
      <CommaListInput
        value={list}
        onChange={(next) => {
          setList(next);
          onList?.(next);
        }}
        placeholderKey="admin.commaList.variables"
      />
      <button onClick={() => setList(["a", "b"])}>external</button>
    </>
  );
}

function field() {
  return screen.getByRole("textbox") as HTMLInputElement;
}

describe("CommaListInput", () => {
  it("набранное с клавиатуры остаётся на экране", () => {
    const seen: string[][] = [];
    render(<Harness onList={(v) => seen.push(v)} />);

    typeInto(field(), "x, y");

    expect(field().value).toBe("x, y");
    expect(seen.at(-1)).toEqual(["x", "y"]);
  });

  it("запятая доживает до следующего символа", () => {
    const seen: string[][] = [];
    render(<Harness onList={(v) => seen.push(v)} />);

    typeInto(field(), "x,");

    // Поле показывает незаконченный ввод, задание получает то, что уже названо.
    expect(field().value).toBe("x,");
    expect(seen.at(-1)).toEqual(["x"]);
  });

  it("правка в середине не переставляет текст", () => {
    const seen: string[][] = [];
    render(<Harness initial={["a", "b"]} onList={(v) => seen.push(v)} />);
    expect(field().value).toBe("a, b");

    // Курсор после «a», дописан символ. Положение курсора в jsdom не то же,
    // что в браузере, поэтому проверяется причина: поле не переписывает текст.
    fireEvent.change(field(), { target: { value: "ab, b" } });

    expect(field().value).toBe("ab, b");
    expect(seen.at(-1)).toEqual(["ab", "b"]);
  });

  it("пустой кусок виден в поле и не уходит в задание", () => {
    const seen: string[][] = [];
    render(<Harness onList={(v) => seen.push(v)} />);

    typeInto(field(), "x, , y");

    expect(field().value).toBe("x, , y");
    expect(seen.at(-1)).toEqual(["x", "y"]);
  });

  it("вставка из буфера по-прежнему работает", () => {
    // Проходил и на сломанном поле — стоит здесь как защита от поломки
    // при починке, а не как ловушка на дефект.
    const seen: string[][] = [];
    render(<Harness onList={(v) => seen.push(v)} />);

    fireEvent.change(field(), { target: { value: ".pdf,.png,.jpg" } });

    expect(seen.at(-1)).toEqual([".pdf", ".png", ".jpg"]);
  });

  it("список, пришедший извне, вытесняет показанное", () => {
    render(<Harness />);
    typeInto(field(), "x, y");
    expect(field().value).toBe("x, y");

    fireEvent.click(screen.getByText("external"));

    expect(field().value).toBe("a, b");
  });
});
