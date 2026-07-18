// Aggregator for ALL locale dictionaries. Import this ONLY from Node-side
// code (tests, scripts) — importing it from a component defeats the per-locale
// code split and ships every locale to the client again. Components take
// types/constants from ./meta and strings via useTranslation() (./context).
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import ru from "./locales/ru";
import tr from "./locales/tr";
import uk from "./locales/uk";
import { type Locale, type TranslationMap } from "./meta";

export { DEFAULT_LOCALE, LOCALES, type Locale, type TranslationMap } from "./meta";

export const translations: Record<Locale, TranslationMap> = { en, es, ru, tr, de, uk };
