"use client";

import { useState } from "react";

import { useTranslation } from "@/lib/i18n/context";
import { parseList, sameList } from "./comma-list";

/**
 * Поле для списка через запятую.
 *
 * До него каждое такое поле показывало не набранный текст, а результат его
 * разбора: массив разбирался из строки и тут же собирался обратно. Разбор
 * выбрасывает пустые куски, а кусок после только что нажатой запятой всегда
 * пустой — запятая исчезала раньше, чем учитель успевал нажать следующую
 * клавишу, и `x, y` превращалось в `xy`. Вставка из буфера проходила, потому
 * что это одно событие; поэтому дефект и дожил до прода.
 *
 * Здесь наоборот: на экране остаётся набранное, наверх уходит разобранное.
 * Показываемое значение — производная, а не второе состояние: пока текст
 * ОЗНАЧАЕТ пришедший список, показываем текст. `x,` означает `["x"]`, ровно
 * то, что вернёт родитель, — значит запятая остаётся на месте.
 *
 * Собираем из списка только когда список означает не то, что показано: так
 * поле подхватывает открытое заново задание и не трогает набор в процессе.
 * Оттуда же и неподвижный курсор — React переставляет его, когда меняет
 * `value`, а `value` здесь меняется только вместе со смыслом.
 */
interface CommaListInputProps<T> {
  /** Список, каким его держит задание. */
  value: T[];
  /** Разобранный список, без пустых элементов и пробелов по краям. */
  onChange: (next: T[]) => void;
  /**
   * Как читать набранное. По умолчанию — список строк; редакторы, где список
   * числовой, передают `parseNumberList`. Незаконченное число (`-`, `3.`)
   * в задание не попадает, но с экрана не пропадает — как и незаконченная
   * запятая.
   */
  parse?: (text: string) => T[];
  /** Ключ перевода для подсказки: подсказку читает человек. */
  placeholderKey?: string;
  className?: string;
}

export function CommaListInput<T = string>({
  value,
  onChange,
  parse,
  placeholderKey,
  className,
}: CommaListInputProps<T>) {
  const { t } = useTranslation();
  const read = (parse ?? (parseList as unknown as (text: string) => T[]));
  const [text, setText] = useState(() => value.join(", "));

  const shown = sameList(read(text), value) ? text : value.join(", ");

  return (
    <input
      type="text"
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        onChange(read(e.target.value));
      }}
      placeholder={placeholderKey ? t(placeholderKey) : undefined}
      className={className}
    />
  );
}
