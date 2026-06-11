/**
 * fb-motion — imperative motion helpers from the feedback-grammar handoff
 * (design package 2026-06). DOM-only, no React state: they spawn a fixed
 * positioned clone, transition it, then remove it. Safe to call on missing
 * elements (no-op + callback).
 *
 * flyClone — "word flies into the slot" (fill-blanks place/unplace).
 * flyXP    — "+N XP" pill flies to the header counter. Requires an element
 *            with id="xp-anchor" in the page chrome; no-ops gracefully
 *            until that lands.
 */

/** Clone `fromEl`, fly it to `toEl`'s center, then call `done`. */
export function flyClone(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  done?: () => void
): void {
  if (!fromEl || !toEl) {
    done?.();
    return;
  }
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const el = fromEl.cloneNode(true) as HTMLElement;
  el.classList.add("fb-flyer");
  el.style.left = a.left + "px";
  el.style.top = a.top + "px";
  el.style.width = a.width + "px";
  el.style.height = a.height + "px";
  el.style.margin = "0";
  el.style.transition =
    "transform .32s cubic-bezier(.3,.9,.4,1.1), opacity .32s";
  document.body.appendChild(el);
  // force layout so the transition starts from the source position
  el.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const sc = Math.min(1, (b.width - 8) / a.width);
  el.style.transform = `translate(${dx}px,${dy}px) scale(${sc})`;
  window.setTimeout(() => {
    el.remove();
    done?.();
  }, 330);
}

/** Fly a "+N XP" pill from `fromEl` to the #xp-anchor element. */
export function flyXP(
  fromEl: HTMLElement | null,
  amount: number,
  onArrive?: () => void
): void {
  const target = document.getElementById("xp-anchor");
  if (!fromEl || !target) {
    onArrive?.();
    return;
  }
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "fb-xp-flyer";
  el.textContent = `+${amount} XP`;
  el.style.left = a.left + a.width / 2 - 34 + "px";
  el.style.top = a.top - 16 + "px";
  document.body.appendChild(el);
  el.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top - 16 + el.offsetHeight / 2);
  el.style.transform = `translate(${dx}px,${dy}px) scale(0.55)`;
  el.style.opacity = "0";
  window.setTimeout(() => {
    el.remove();
    onArrive?.();
  }, 760);
}
