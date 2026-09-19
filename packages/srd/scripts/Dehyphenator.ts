/**
 * Decides whether a hyphen at the end of a line is a typesetter's word break (to be removed) or
 * part of a compound word, using the words that occur elsewhere in the document as evidence.
 *
 * Only the 5.2.1 document needs this. The 5.1 document marks every typesetter break with a soft
 * hyphen, so its profile turns the guessing off and the answer is always "keep the hyphen".
 */
export class Dehyphenator {
  readonly #words = new Set<string>();

  readonly #enabled: boolean;

  constructor(enabled: boolean) {
    this.#enabled = enabled;
  }

  /** Records the words of a line so later decisions can consult them. */
  learn(text: string): void {
    // The final token may itself be a broken word, so it is not evidence.
    const tokens = text.split(" ");
    if (/-$/.test(tokens.at(-1) ?? "")) tokens.pop();
    for (const token of tokens) {
      const word = token
        .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "")
        .toLowerCase();
      if (word !== "") this.#words.add(word);
    }
  }

  /** True if the trailing hyphen of `left` should be dropped when joining with `right`. */
  shouldJoin(left: string, right: string): boolean {
    if (!this.#enabled) return false;
    const leftMatch = /(\p{L}+)-$/u.exec(left);
    const rightMatch = /^(\p{Ll}+)/u.exec(right);
    if (leftMatch === null || rightMatch === null) return false;
    const head = leftMatch[1]!.toLowerCase();
    const tail = rightMatch[1]!;
    const joined = head + tail;
    const compound = `${head}-${tail}`;
    if (this.#words.has(joined)) return true;
    if (this.#words.has(compound)) return false;
    // "10-foot-" + "radius": the token already contains a hyphen, so this is a compound.
    const leftToken = left.split(" ").at(-1) ?? "";
    if (/-.*-$/.test(leftToken)) return false;
    return true;
  }
}
