import { describe, expect, it } from "vitest";
import { frTypo, NBSP, NNBSP } from "../src/index.js";

/** Makes invisible spaces visible in failure messages. */
const show = (s: string) => s.replaceAll(NNBSP, "⍽").replaceAll(NBSP, "␣");

describe("frTypo", () => {
  it.each([
    ["Prêt ? Allons-y !", "Prêt⍽? Allons-y⍽!"],
    ["Attention ; danger", "Attention⍽; danger"],
    ["Note : lisez ceci", "Note␣: lisez ceci"],
    ["Total :", "Total␣:"],
    ["Il a dit « bonjour ».", "Il a dit «␣bonjour␣»."],
    ["«bonjour»", "«␣bonjour␣»"],
    ["Vraiment ?!", "Vraiment⍽?!"],
    ["Quoi   ?", "Quoi⍽?"],
  ])("%s", (input, expected) => {
    expect(show(frTypo(input))).toBe(expected);
  });

  it.each([
    "https://example.com/a?b=c",
    "Rendez-vous à 9:00",
    "Ratio 16:9",
    "Bonjour!",
    "Smile :)",
    "mailto:hello@example.com",
    "Pas de ponctuation ici",
    "",
  ])("leaves %j alone", (input) => {
    expect(frTypo(input)).toBe(input);
  });

  it("upgrades a typed no-break space before ; ! ? to a narrow one", () => {
    expect(show(frTypo(`Oui${NBSP}!`))).toBe("Oui⍽!");
  });

  it("does not double up spaces the author already typed inside guillemets", () => {
    expect(show(frTypo(`«${NNBSP}a${NNBSP}»`))).toBe("«␣a␣»");
    expect(show(frTypo(`« ${NBSP}a  »`))).toBe("«␣a␣»");
  });

  it("is idempotent", () => {
    const samples = ["Prêt ? Allons-y !", "Note : « citation » ; fin", "Total :", "«x»"];
    for (const s of samples) expect(frTypo(frTypo(s))).toBe(frTypo(s));
  });

  it("only uses no-break characters, so lines never wrap before the punctuation", () => {
    const out = frTypo("Un ; deux : trois ! « quatre » ?");
    expect(out).not.toMatch(/ [;:!?»]/);
    expect(out).not.toMatch(/« /);
  });
});
