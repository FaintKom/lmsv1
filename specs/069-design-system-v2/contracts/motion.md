# Contract: движение

Все значения берутся из токенов `--motion-*` в `MOTION.md`. Под
`prefers-reduced-motion: reduce` всё, что двигает или масштабирует, выключается;
цвет и прозрачность остаются.

| Id | Где | Что | Время, кривая | Тест в `e2e/motion.spec.ts` |
|---|---|---|---|---|
| M2 | полоса прогресса | `scaleX` от 0 до значения при появлении | slow, ease-out-strong | анимация `transform` есть; при reduce её нет |
| M3 | кнопка | нажатие `scale(.96)` | fast, ease | `:active` даёт transform; при reduce `none` |
| M4a | вариант ответа, верно | галочка: opacity, scale .25→1, blur 4→0 | base, ease-out-strong | обе иконки в DOM, меняется видимая |
| M4b | вариант ответа, неверно | одно вздрагивание на ±4px | 300ms, keyframes | одна анимация с `iterations = 1`; подсказка видна и без анимации |
| M4c | XP за верный ответ | «+10 XP» поднимается и гаснет | 700ms, ease-out-strong | анимация есть, счётчик XP обновился |
| M5 | карточка курса, плитка | подъём на 2px при наведении, только при `hover: hover` | fast, ease | при `hover: none` не срабатывает |
| M6 | меню блоков | масштаб .96→1 от своей кнопки | base, ease-out-strong | `transform-origin` со стороны кнопки |
| M7 | новый блок в конструкторе | въезд на 8px, зелёная подложка гаснет | base, ease-out | `@starting-style` срабатывает один раз |
| M8 | тост | выезжает снизу по кривой шторки, уходит быстрее | base / fast | вход длиннее выхода |
| M9 | главная ученика | блоки с шагом 60 мс, не больше пяти, только при первом открытии | base, stagger | повторный заход на экран без анимации |
| M10 | фильтр каталога | View Transition перестраивает сетку | base, ease-out | переход идёт; клик во время него не теряется |

Навигация, смена темы и всё, что делают десятки раз в день, не анимируются
(MOTION.md §1, research R6).

## Правила храповика: движение

| RuleId | Что считается |
|---|---|
| `transition-all` | `transition: all` и класс `transition-all` |
| `ms-literal` | число с `ms` или `s` в `transition`, `animation`, `duration-[…]` вне токенов |
| `bezier-literal` | `cubic-bezier(` вне блока токенов |
| `layout-anim` | `transition` или `@keyframes`, которые двигают `width`, `height`, `top`, `left`, `margin` |
| `scale-zero` | `scale(0)` и `scale-0` |
| `vt-nav` | `startViewTransition` в навигации и переключателе темы |

Полоса прогресса из DESIGN_SPEC §5 перестаёт быть исключением: в PR 2 она
переходит с `width` на `scaleX`.
