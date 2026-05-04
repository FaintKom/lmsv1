/** Translations for Blockly robot blocks. Reads locale from localStorage. */

type BlockTranslations = Record<string, { label: string; tooltip: string }>;
type CategoryTranslations = Record<string, string>;

const BLOCK_TRANSLATIONS: Record<string, BlockTranslations> = {
 en: {
 move_up: { label: "⬆️ up", tooltip: "Face up and move one step" },
 move_down: { label: "⬇️ down", tooltip: "Face down and move one step" },
 move_left: { label: "⬅️ left", tooltip: "Face left and move one step" },
 move_right: { label: "➡️ right", tooltip: "Face right and move one step" },
 move_forward: { label: "⬆️ forward", tooltip: "Move one step forward" },
 turn_left: { label: "↩️ turn left", tooltip: "Turn left 90°" },
 turn_right: { label: "↪️ turn right", tooltip: "Turn right 90°" },
 pick_up: { label: "⭐ pick up", tooltip: "Pick up item on current cell" },
 place_item: { label: "📦 place", tooltip: "Place item on current cell" },
 repeat_times: { label: "🔄 repeat", tooltip: "Repeat commands a number of times" },
 if_wall_ahead: { label: "🧱 wall ahead?", tooltip: "Check if there is a wall ahead" },
 if_item_here: { label: "⭐ item here?", tooltip: "Check if there is an item on current cell" },
 while_not_at_goal: { label: "🏁 while not at goal, do", tooltip: "Repeat until robot reaches the goal" },
 jump: { label: "🦘 jump", tooltip: "Jump forward" },
 interact: { label: "👆 press", tooltip: "Press a button or open a door" },
 if_near_object: { label: "🔍 object nearby?", tooltip: "Check if there is a button or door ahead" },
 },
 ru: {
 move_up: { label: "⬆️ вверх", tooltip: "Повернуться вверх и сделать шаг" },
 move_down: { label: "⬇️ вниз", tooltip: "Повернуться вниз и сделать шаг" },
 move_left: { label: "⬅️ влево", tooltip: "Повернуться влево и сделать шаг" },
 move_right: { label: "➡️ вправо", tooltip: "Повернуться вправо и сделать шаг" },
 move_forward: { label: "⬆️ вперёд", tooltip: "Двигаться на одну клетку вперёд" },
 turn_left: { label: "↩️ повернуть влево", tooltip: "Повернуть налево на 90°" },
 turn_right: { label: "↪️ повернуть вправо", tooltip: "Повернуть направо на 90°" },
 pick_up: { label: "⭐ подобрать", tooltip: "Подобрать предмет на текущей клетке" },
 place_item: { label: "📦 положить", tooltip: "Положить предмет на текущую клетку" },
 repeat_times: { label: "🔄 повтори", tooltip: "Повторить команды указанное число раз" },
 if_wall_ahead: { label: "🧱 стена впереди?", tooltip: "Проверить, есть ли стена впереди" },
 if_item_here: { label: "⭐ предмет здесь?", tooltip: "Проверить, есть ли предмет на текущей клетке" },
 while_not_at_goal: { label: "🏁 пока не на цели, делай", tooltip: "Повторять, пока робот не достигнет цели" },
 jump: { label: "🦘 прыжок", tooltip: "Прыгнуть вперёд" },
 interact: { label: "👆 нажать", tooltip: "Нажать кнопку или открыть дверь" },
 if_near_object: { label: "🔍 объект рядом?", tooltip: "Проверить, есть ли кнопка или дверь впереди" },
 },
 es: {
 move_up: { label: "⬆️ arriba", tooltip: "Girar hacia arriba y avanzar un paso" },
 move_down: { label: "⬇️ abajo", tooltip: "Girar hacia abajo y avanzar un paso" },
 move_left: { label: "⬅️ izquierda", tooltip: "Girar a la izquierda y avanzar un paso" },
 move_right: { label: "➡️ derecha", tooltip: "Girar a la derecha y avanzar un paso" },
 move_forward: { label: "⬆️ adelante", tooltip: "Avanzar una casilla hacia adelante" },
 turn_left: { label: "↩️ girar izquierda", tooltip: "Girar a la izquierda 90°" },
 turn_right: { label: "↪️ girar derecha", tooltip: "Girar a la derecha 90°" },
 pick_up: { label: "⭐ recoger", tooltip: "Recoger objeto en la casilla actual" },
 place_item: { label: "📦 colocar", tooltip: "Colocar objeto en la casilla actual" },
 repeat_times: { label: "🔄 repetir", tooltip: "Repetir comandos un número de veces" },
 if_wall_ahead: { label: "🧱 ¿muro adelante?", tooltip: "Verificar si hay un muro adelante" },
 if_item_here: { label: "⭐ ¿objeto aquí?", tooltip: "Verificar si hay un objeto en la casilla actual" },
 while_not_at_goal: { label: "🏁 mientras no en meta, hacer", tooltip: "Repetir hasta llegar a la meta" },
 jump: { label: "🦘 saltar", tooltip: "Saltar hacia adelante" },
 interact: { label: "👆 presionar", tooltip: "Presionar un botón o abrir una puerta" },
 if_near_object: { label: "🔍 ¿objeto cerca?", tooltip: "Verificar si hay un botón o puerta adelante" },
 },
 tr: {
 move_up: { label: "⬆️ yukarı", tooltip: "Yukarı dön ve bir adım at" },
 move_down: { label: "⬇️ aşağı", tooltip: "Aşağı dön ve bir adım at" },
 move_left: { label: "⬅️ sol", tooltip: "Sola dön ve bir adım at" },
 move_right: { label: "➡️ sağ", tooltip: "Sağa dön ve bir adım at" },
 move_forward: { label: "⬆️ ileri", tooltip: "Bir kare ileri git" },
 turn_left: { label: "↩️ sola dön", tooltip: "Sola 90° dön" },
 turn_right: { label: "↪️ sağa dön", tooltip: "Sağa 90° dön" },
 pick_up: { label: "⭐ topla", tooltip: "Mevcut karedeki nesneyi topla" },
 place_item: { label: "📦 koy", tooltip: "Nesneyi mevcut kareye koy" },
 repeat_times: { label: "🔄 tekrarla", tooltip: "Komutları belirtilen sayıda tekrarla" },
 if_wall_ahead: { label: "🧱 ileride duvar var mı?", tooltip: "İleride duvar olup olmadığını kontrol et" },
 if_item_here: { label: "⭐ burada nesne var mı?", tooltip: "Mevcut karede nesne olup olmadığını kontrol et" },
 while_not_at_goal: { label: "🏁 hedefe ulaşana kadar, yap", tooltip: "Robot hedefe ulaşana kadar tekrarla" },
 jump: { label: "🦘 zıpla", tooltip: "İleri zıpla" },
 interact: { label: "👆 bas", tooltip: "Bir düğmeye bas veya bir kapı aç" },
 if_near_object: { label: "🔍 yakında nesne var mı?", tooltip: "İleride düğme veya kapı olup olmadığını kontrol et" },
 },
};

const CATEGORY_TRANSLATIONS: Record<string, CategoryTranslations> = {
 en: { movement: "🚶 Movement", items: "⭐ Items", loops: "🔄 Loops", conditions: "❓ Conditions", numbers: "🔢 Numbers", actions3d: "🎮 Actions" },
 ru: { movement: "🚶 Движение", items: "⭐ Предметы", loops: "🔄 Циклы", conditions: "❓ Условия", numbers: "🔢 Числа", actions3d: "🎮 Действия" },
 es: { movement: "🚶 Movimiento", items: "⭐ Objetos", loops: "🔄 Bucles", conditions: "❓ Condiciones", numbers: "🔢 Números", actions3d: "🎮 Acciones" },
 tr: { movement: "🚶 Hareket", items: "⭐ Nesneler", loops: "🔄 Döngüler", conditions: "❓ Koşullar", numbers: "🔢 Sayılar", actions3d: "🎮 Eylemler" },
};

const REPEAT_TRANSLATIONS: Record<string, { times: string; do_: string }> = {
 en: { times: "times", do_: "do" },
 ru: { times: "раз", do_: "делай" },
 es: { times: "veces", do_: "hacer" },
 tr: { times: "kez", do_: "yap" },
};

function getLocale(): string {
 if (typeof window === "undefined") return "en";
 return localStorage.getItem("locale") || "en";
}

export function getBlockLabel(blockId: string): string {
 const locale = getLocale();
 return BLOCK_TRANSLATIONS[locale]?.[blockId]?.label ?? BLOCK_TRANSLATIONS.en[blockId]?.label ?? blockId;
}

export function getBlockTooltip(blockId: string): string {
 const locale = getLocale();
 return BLOCK_TRANSLATIONS[locale]?.[blockId]?.tooltip ?? BLOCK_TRANSLATIONS.en[blockId]?.tooltip ?? "";
}

export function getCategoryName(categoryId: string): string {
 const locale = getLocale();
 return CATEGORY_TRANSLATIONS[locale]?.[categoryId] ?? CATEGORY_TRANSLATIONS.en[categoryId] ?? categoryId;
}

export function getRepeatLabels(): { times: string; do_: string } {
 const locale = getLocale();
 return REPEAT_TRANSLATIONS[locale] ?? REPEAT_TRANSLATIONS.en;
}
