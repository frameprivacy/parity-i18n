import { describe, expectTypeOf, it } from "vitest";
import { defineMessages, translate, type Translation } from "../src/index.js";

const en = {
  title: "Hello",
  list: ["One", "Two"],
  count: (n: number) => `${String(n)} items`,
  greet: (name: string, formal: boolean) => (formal ? `Dear ${name}` : `Hi ${name}`),
  nested: { a: "A", b: { c: "C" } },
} as const;

const fr = {
  title: "Bonjour",
  list: ["Un", "Deux"],
  count: (n: number) => `${String(n)} éléments`,
  greet: (name: string, formal: boolean) => (formal ? `Cher ${name}` : `Salut ${name}`),
  nested: { a: "A", b: { c: "C" } },
} as const;

describe("Translation<T>", () => {
  it("widens string literals but keeps structure", () => {
    expectTypeOf<Translation<typeof en>["title"]>().toEqualTypeOf<string>();
    expectTypeOf<Translation<typeof en>["list"]>().toEqualTypeOf<readonly [string, string]>();
    expectTypeOf<Translation<typeof en>["count"]>().toEqualTypeOf<(n: number) => string>();
    expectTypeOf<Translation<typeof en>["nested"]["b"]["c"]>().toEqualTypeOf<string>();
  });

  it("accepts a correctly shaped translation", () => {
    expectTypeOf(fr).toExtend<Translation<typeof en>>();
  });
});

describe("defineMessages enforces the source shape", () => {
  it("types every locale", () => {
    const m = defineMessages("en", en, { fr });
    expectTypeOf(m).toEqualTypeOf<Readonly<Record<"en" | "fr", Translation<typeof en>>>>();
    expectTypeOf(m.fr.greet).parameters.toEqualTypeOf<[name: string, formal: boolean]>();
  });

  it("rejects a missing key", () => {
    // @ts-expect-error -- `title` is missing
    defineMessages("en", { title: "Hi", body: "Text" }, { fr: { body: "Texte" } });
  });

  it("rejects an extra key", () => {
    // @ts-expect-error -- `extra` does not exist in the source
    defineMessages("en", { title: "Hi" }, { fr: { title: "Salut", extra: "?" } });
  });

  it("rejects a nested shape mismatch", () => {
    // @ts-expect-error -- nested.b.c is missing
    defineMessages("en", { nested: { b: { c: "C" } } }, { fr: { nested: { b: {} } } });
  });

  it("rejects a list of the wrong length", () => {
    // @ts-expect-error -- the source has two items
    defineMessages("en", { list: ["One", "Two"] }, { fr: { list: ["Un"] } });
  });

  it("rejects a function with a different signature", () => {
    defineMessages(
      "en",
      { count: (n: number) => String(n) },
      // @ts-expect-error -- parameter must be a number
      { fr: { count: (n: string) => n } },
    );
  });

  it("rejects a non-string where the source has a string", () => {
    // @ts-expect-error -- title must be a string
    defineMessages("en", { title: "Hi" }, { fr: { title: 42 } });
  });

  it("only allows transforms for declared locales", () => {
    defineMessages(
      "en",
      { a: "b" },
      { fr: { a: "c" } },
      // @ts-expect-error -- `de` is not one of the translations
      { transforms: { de: (s: string) => s } },
    );
  });
});

describe("translate", () => {
  it("enforces the shape for a single locale", () => {
    expectTypeOf(translate(en.nested, { a: "x", b: { c: "y" } })).toEqualTypeOf<Translation<typeof en.nested>>();
    // @ts-expect-error -- `b` is missing
    translate(en.nested, { a: "x" });
  });
});
