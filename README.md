# parity-i18n

[![CI](https://github.com/frameprivacy/parity-i18n/actions/workflows/ci.yml/badge.svg)](https://github.com/frameprivacy/parity-i18n/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Type-safe translations where the compiler forces every locale to match the source's exact shape, plus correct
French typography applied for you.**

Zero dependencies. No runtime, no loader, no build plugin: plain TypeScript objects and two functions.

## Why this exists

Most i18n bugs are not translation bugs; they are shape bugs:

- a key added in English and forgotten in French, so the page renders `undefined` or the raw key;
- a list of three steps translated as two;
- an interpolation function that takes `(count)` in English and `(name, count)` in the translation.

String-keyed dictionaries (`t("checkout.pay")`) can't catch these without code generation. `parity-i18n` makes the
**source-language object the type** and checks every translation against it, so all three are compile errors, with
autocomplete on every key.

And French has typography rules nobody wants to type by hand: a narrow no-break space before `; ! ?`, a no-break
space before `:`, and inside `« guillemets »`. Without them, browsers happily wrap a lone `?` onto the next line.
`frTypo` inserts them at definition time, and is careful not to touch URLs, times or ratios.

## Install

```sh
npm install parity-i18n
```

ESM only. Works in any runtime (Node, browsers, edge, React Native). TypeScript 5.4+ (uses `NoInfer`).

## Usage

```ts
import { defineMessages, frTypo, plural } from "parity-i18n";

export const checkout = defineMessages(
  "en",
  {
    title: "Checkout",
    steps: ["Cart", "Details", "Pay"],
    items: (n: number) => `${n} ${plural("en-CA", n, { one: "item", other: "items" })}`,
    total: "Total:",
  },
  {
    fr: {
      title: "Paiement",
      steps: ["Panier", "Coordonnées", "Payer"],
      items: (n) => `${n} ${plural("fr-CA", n, { one: "article", other: "articles" })}`,
      total: "Total :", // becomes "Total\u00a0:" so it never wraps
    },
  },
  { transforms: { fr: frTypo } },
);

const t = checkout[locale]; // locale: "en" | "fr"
t.items(0); // "0 items" / "0 article"
```

The compiler rejects every one of these (real `tsc` output):

```ts
defineMessages("en", { title: "Hi", body: "Text" }, { fr: { body: "Texte" } });
// TS2741: Property 'title' is missing in type '{ body: string; }'

defineMessages("en", { title: "Hi" }, { fr: { title: "Salut", extra: "?" } });
// TS2353: Object literal may only specify known properties, and 'extra' does not exist

defineMessages("en", { steps: ["One", "Two"] }, { fr: { steps: ["Un"] } });
// TS2322: Type '[string]' is not assignable to type 'readonly [string, string]'

defineMessages("en", { n: (count: number) => String(count) }, { fr: { n: (name: string) => name } });
// TS2322: Type '(name: string) => string' is not assignable to type '(count: number) => string'
```

(These exact cases are covered by the type tests in [`test/types.test-d.ts`](test/types.test-d.ts).)

### One module per locale

```ts
// messages/en.ts
export const en = { greeting: (name: string) => `Hello, ${name}!` } as const;

// messages/fr.ts
import { frTypo, translate } from "parity-i18n";
import { en } from "./en.js";
export const fr = translate(en, { greeting: (name) => `Bonjour, ${name} !` }, frTypo);
```

### Typography on its own

```ts
import { frTypo } from "parity-i18n";

frTypo("Prêt ? On y va !"); // "Prêt\u202f? On y va\u202f!"
frTypo("Il a dit « oui »."); // "Il a dit «\u00a0oui\u00a0»."
frTypo("https://example.com/?q=1 à 9:00"); // unchanged
```

## API

| Export                                                         | Description                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineMessages(sourceLocale, source, translations, options?)` | Returns `{ [locale]: messages }` for the source and every translation. Each translation must have exactly `source`'s shape. `options.transforms` maps a locale to a string transform applied once, at definition time. |
| `translate(source, translation, transform?)`                   | Checks a single translation against `source` (which is used only for its type) and optionally transforms it.                                                                                                           |
| `Translation<T>`                                               | The type a translation of `T` must have: same keys, same tuple lengths, same function parameters, any `string` in place of each literal.                                                                               |
| `frTypo(text)`                                                 | French typography: U+202F before `; ! ?`, U+00A0 before `:` and inside `« »`. Only converts a space the author typed. Idempotent.                                                                                      |
| `plural(locale, n, forms)`                                     | Picks a CLDR plural form via `Intl.PluralRules` (`zero`, `one`, `two`, `few`, `many`, `other`), falling back to `other`.                                                                                               |
| `mapStrings(value, transform)`                                 | Deeply applies a string transform to strings, arrays, objects and function results.                                                                                                                                    |
| `NBSP`, `NNBSP`                                                | The two no-break space characters.                                                                                                                                                                                     |

Message values can be strings, string arrays (tuples, so lengths are checked), nested objects, and functions that
return strings.

## Limitations

- **Not a full i18n framework.** No locale negotiation, lazy loading, ICU MessageFormat parsing, or React bindings.
  It is the typed-catalog layer; pair it with whatever picks the locale.
- **Translations live in TypeScript**, not JSON or PO files, so translators work in code (or you generate the
  modules). That is the trade-off that makes the shape checking free.
- **`frTypo` follows the common French convention** (narrow no-break space before `; ! ?`). Some style guides,
  including some Quebec ones, prefer no space before `; ! ?`: pass your own transform if so.
- **Function messages are wrapped** when a transform is applied, so a transformed function is a new function
  (identity comparisons against the original will not hold).
- Excess-key errors rely on TypeScript's excess-property checks, which apply to object literals; a translation built
  in a variable elsewhere and passed in is still checked for missing keys and wrong types, but not extra keys.

## Development

```sh
npm ci
npm run lint && npm run typecheck && npm test   # includes compile-time type tests
```

## License

[MIT](LICENSE) © 2026 Frame
