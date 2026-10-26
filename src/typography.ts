/** U+202F NARROW NO-BREAK SPACE. */
export const NNBSP = "\u202f";
/** U+00A0 NO-BREAK SPACE. */
export const NBSP = "\u00a0";

/**
 * French typography, applied so nobody has to type invisible characters:
 *
 * - `; ! ?` preceded by a space get a narrow no-break space (U+202F) instead;
 * - `:` preceded by a space (and followed by a space or the end) gets a no-break space (U+00A0);
 * - « guillemets » get no-break spaces inside, whether or not the author typed them.
 *
 * Only a space the author typed before `; ! ? :` is converted, so URLs (`https://`), times (`9:00`), ratios, query
 * strings and emoticons are left alone. Runs of spaces collapse to one. The function is idempotent.
 *
 * @example
 * frTypo("Prêt ? Allons-y !");     // "Prêt\u202f? Allons-y\u202f!"
 * frTypo("Il a dit « bonjour ».");  // "Il a dit «\u00a0bonjour\u00a0»."
 */
export function frTypo(s: string): string {
  return s
    .replace(/[ \u00a0\u202f]+([;!?])/g, `${NNBSP}$1`)
    .replace(/[ \u00a0\u202f]+:(?=\s|$)/g, `${NBSP}:`)
    .replace(/«[ \u00a0\u202f]*/g, `«${NBSP}`)
    .replace(/[ \u00a0\u202f]*»/g, `${NBSP}»`);
}
