/**
 * The shape a translation of `T` must have: the same keys, the same array lengths and the same function signatures,
 * with any string allowed wherever the source has a string literal.
 *
 * @example
 * const en = { title: "Hello", items: (n: number) => `${n} items`, tabs: ["One", "Two"] } as const;
 * const fr: Translation<typeof en> = { title: "Bonjour", items: (n) => `${n} éléments`, tabs: ["Un", "Deux"] };
 */
export type Translation<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : T extends object
      ? { readonly [K in keyof T]: Translation<T[K]> } // homomorphic: tuples stay tuples, so lists keep their length
      : T;

/** A string transform applied to every string (and every function result) in a translation. */
export type StringTransform = (value: string) => string;

/** Options for {@link defineMessages}. */
export interface DefineOptions<L extends string> {
  /** Per-locale transforms, e.g. `{ fr: frTypo }`, applied once at definition time. */
  readonly transforms?: Readonly<Partial<Record<L, StringTransform>>>;
}

/**
 * Applies `transform` to every string in `value`, recursing into arrays and objects, and wrapping functions so their
 * return value is transformed too. Non-string leaves (numbers, booleans, null) are returned as is.
 */
export function mapStrings<T>(value: T, transform: StringTransform): T {
  if (typeof value === "string") return transform(value) as T;
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => transform(String(fn(...args)))) as T;
  }
  if (Array.isArray(value)) return value.map((v: unknown) => mapStrings(v, transform)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, transform)])) as T;
  }
  return value;
}

/**
 * Type-checks one translation against its source. Useful when each locale lives in its own module.
 *
 * @param _source - The source-language messages. Used only for its type.
 * @param translation - Must match `source`'s shape exactly (missing or extra keys, wrong tuple lengths and wrong
 *   function parameters are compile errors).
 * @param transform - Optional string transform, e.g. {@link frTypo}.
 */
export function translate<const T>(
  _source: T,
  translation: Translation<NoInfer<T>>,
  transform?: StringTransform,
): Translation<T> {
  return transform ? mapStrings(translation, transform) : translation;
}

/**
 * Defines one message namespace in a source language plus any number of translations that TypeScript forces to have
 * exactly the source's shape.
 *
 * @param sourceLocale - Locale key for the source messages, e.g. `"en"`.
 * @param source - The source messages: strings, string arrays, nested objects, and functions returning strings.
 * @param translations - One entry per other locale.
 * @param options - Per-locale string transforms.
 * @returns An object keyed by every locale.
 *
 * @example
 * export const checkout = defineMessages(
 *   "en",
 *   { pay: "Pay now", items: (n: number) => `${n} items` },
 *   { fr: { pay: "Payer maintenant", items: (n) => `${n} articles` } },
 *   { transforms: { fr: frTypo } },
 * );
 * checkout.fr.items(3); // "3 articles"
 */
export function defineMessages<const S extends string, const T, const L extends string>(
  sourceLocale: S,
  source: T,
  translations: Readonly<Record<L, Translation<NoInfer<T>>>>,
  options: DefineOptions<NoInfer<L>> = {},
): Readonly<Record<S | L, Translation<T>>> {
  const out: Record<string, unknown> = { [sourceLocale]: source };
  for (const locale of Object.keys(translations) as L[]) {
    const transform = options.transforms?.[locale];
    out[locale] = transform ? mapStrings(translations[locale], transform) : translations[locale];
  }
  return out as Readonly<Record<S | L, Translation<T>>>;
}

/** The plural forms a language may use (CLDR categories). `other` is always required. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { readonly other: string };

const rulesCache = new Map<string, Intl.PluralRules>();

/**
 * Picks the right plural form for `n` using CLDR rules via `Intl.PluralRules`, falling back to `other`.
 *
 * French treats 0 and 1 as singular; English only 1; other languages have more categories.
 *
 * @example
 * plural("fr-CA", 0, { one: "courtier", other: "courtiers" }); // "courtier"
 * plural("en-CA", 0, { one: "broker", other: "brokers" });     // "brokers"
 */
export function plural(locale: string, n: number, forms: PluralForms): string {
  let rules = rulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    rulesCache.set(locale, rules);
  }
  return forms[rules.select(n)] ?? forms.other;
}
