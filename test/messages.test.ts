import { describe, expect, it, vi } from "vitest";
import { defineMessages, frTypo, mapStrings, plural, translate } from "../src/index.js";

const en = {
  title: "Your report",
  cta: "Start now",
  steps: ["Scan", "Review", "Remove"],
  found: (n: number) => `${String(n)} ${plural("en-CA", n, { one: "result", other: "results" })}`,
  nested: { deep: { label: "Note: ok" } },
} as const;

describe("defineMessages", () => {
  const m = defineMessages(
    "en",
    en,
    {
      fr: {
        title: "Votre rapport",
        cta: "Commencer !",
        steps: ["Analyse", "Révision", "Retrait"],
        found: (n) => `${String(n)} ${plural("fr-CA", n, { one: "résultat", other: "résultats" })} ?`,
        nested: { deep: { label: "Note : ok" } },
      },
      de: {
        title: "Ihr Bericht",
        cta: "Jetzt starten",
        steps: ["Scan", "Prüfen", "Entfernen"],
        found: (n) => `${String(n)} Ergebnis${n === 1 ? "" : "se"}`,
        nested: { deep: { label: "Hinweis: ok" } },
      },
    },
    { transforms: { fr: frTypo } },
  );

  it("keys the result by every locale", () => {
    expect(Object.keys(m).sort()).toEqual(["de", "en", "fr"]);
  });

  it("returns the source untouched", () => {
    expect(m.en).toBe(en);
  });

  it("applies the transform to strings, arrays, nested objects and function results", () => {
    expect(m.fr.cta).toBe("Commencer\u202f!");
    expect(m.fr.nested.deep.label).toBe("Note\u00a0: ok");
    expect(m.fr.found(0)).toBe("0 résultat\u202f?");
    expect(m.fr.found(2)).toBe("2 résultats\u202f?");
    expect(m.fr.steps).toEqual(["Analyse", "Révision", "Retrait"]);
  });

  it("leaves locales without a transform as written", () => {
    expect(m.de.nested.deep.label).toBe("Hinweis: ok");
    expect(m.de.found(1)).toBe("1 Ergebnis");
  });

  it("works with no translations", () => {
    expect(defineMessages("en", { a: "b" }, {})).toEqual({ en: { a: "b" } });
  });
});

describe("translate", () => {
  it("checks one translation against a source and can transform it", () => {
    const fr = translate(en.nested, { deep: { label: "Note : ok" } }, frTypo);
    expect(fr.deep.label).toBe("Note\u00a0: ok");
    expect(translate({ a: "x" }, { a: "y" })).toEqual({ a: "y" });
  });
});

describe("mapStrings", () => {
  it("passes non-string leaves through", () => {
    const value = { n: 1, b: true, z: null, s: "a", list: [1, "b"] };
    expect(mapStrings(value, (s) => s.toUpperCase())).toEqual({ n: 1, b: true, z: null, s: "A", list: [1, "B"] });
  });

  it("forwards every argument to wrapped functions", () => {
    const fn = vi.fn((a: string, b: number) => `${a}-${String(b)}`);
    const wrapped = mapStrings(fn, (s) => `[${s}]`);
    expect(wrapped("x", 2)).toBe("[x-2]");
    expect(fn).toHaveBeenCalledWith("x", 2);
  });

  it("does not mutate the input", () => {
    const input = { a: "x", list: ["y"] };
    mapStrings(input, (s) => s.toUpperCase());
    expect(input).toEqual({ a: "x", list: ["y"] });
  });
});

describe("plural", () => {
  it("follows CLDR: French 0 and 1 are singular, English only 1", () => {
    const fr = { one: "courtier", other: "courtiers" };
    const enForms = { one: "broker", other: "brokers" };
    expect([0, 1, 2].map((n) => plural("fr-CA", n, fr))).toEqual(["courtier", "courtier", "courtiers"]);
    expect([0, 1, 2].map((n) => plural("en-CA", n, enForms))).toEqual(["brokers", "broker", "brokers"]);
  });

  it("supports richer categories and falls back to other", () => {
    const ar = { zero: "z", one: "o", two: "t", few: "f", many: "m", other: "x" };
    expect([0, 1, 2, 3, 11, 100].map((n) => plural("ar", n, ar))).toEqual(["z", "o", "t", "f", "m", "x"]);
    expect(plural("ar", 2, { other: "fallback" })).toBe("fallback");
  });
});
