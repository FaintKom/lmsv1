# Contract: токены v3

## Не меняется

Вся палитра `tokens.json` 2.2.0: `green`, `sun`, `clay`, `lagoon`, `ink`,
`paper`, их семантические имена (`--color-primary`, `--color-text-muted` и
остальные) и тёмные значения.

## Меняется значение

| Токен | Было | Станет |
|---|---|---|
| `--font-sans` | Manrope | Onest |
| `--font-display` (новый) | нет | Geologica |
| `--radius-xs / sm / md / lg / xl` | 6 / 10 / 14 / 18 / 24 | 6 / 10 / 14 / 14 / 14 |
| `--radius-pill` | 999px | 999px, теперь у всех кнопок |
| `--shadow-pop*` | сплошная тень 4px | удаляются вместе с `.btn-pop` |
| `--shadow-md / lg` | мягкие | только у всплывающих слоёв: меню, диалог, тост |

## Новое

`--subject-lang`, `--subject-math`, `--subject-code`, `--subject-other`,
`--subject-ink`, в светлой и тёмной теме. Предмета `web` нет: такой категории
на проде нет (data-model.md).

## Правила храповика: цвет, форма, текст

| RuleId | Что считается |
|---|---|
| `raw-hex` | `#rgb` и `#rrggbb` в TSX и в CSS вне блоков токенов |
| `raw-palette` | `(bg\|text\|border\|ring\|fill\|stroke)-(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose)-\d+` |
| `gradient` | `bg-gradient-to`, `bg-linear-to`, `linear-gradient(`, `radial-gradient(` |
| `mono-eyebrow` | `font-mono` и `uppercase` в одном `className` |
| `tiny-text` | `text-[10px]`, `text-[11px]` |
| `btn-pop` | класс `btn-pop` |
| `glass` | `backdrop-blur` вместе с полупрозрачным фоном |
| `radius-over-cap` | `rounded-2xl` и крупнее, `rounded-[Npx]`: потолок — `--radius-xl`, 14px (добавлено в PR 6) |
| `emoji` | эмодзи вместо иконки, примета 2 из spec.md. Галочки, крестики, стрелки и © — типографика, их правило пропускает (добавлено в PR 6) |

С PR 6 это уже не храповик, а страж: базы нет, и любое нарушение вне исключений
роняет тест.

Исключения перечисляются в самом тесте поимённо и с причиной: графики аналитики
(цвет несёт данные), `components/room/*` и аватар, контент уроков, печатные формы.
