import type {
  CatalogEntry,
  CatalogSource,
} from "../src/catalog/catalog.types.ts";

/** The schools the documents classify an entry under. Anything else is a parse failure. */
const SCHOOLS: readonly string[] = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

/** The plain-text fields every entry carries, checked for emptiness by name. */
const REQUIRED_TEXT_FIELDS = [
  "name",
  "school",
  "castingTime",
  "range",
  "duration",
] as const;

/** Every piece of free text in an entry, labelled for error messages. */
function textsOf(entry: CatalogEntry): [string, string][] {
  const texts: [string, string][] = REQUIRED_TEXT_FIELDS.map(
    (field) => [field, entry[field]],
  );
  if (entry.components.materialText !== undefined) {
    texts.push(["materialText", entry.components.materialText]);
  }
  entry.classes.forEach((className, index) =>
    texts.push([`classes[${index}]`, className]),
  );
  entry.description.forEach((block, blockIndex) => {
    const where = `description[${blockIndex}]`;
    if (block.type === "paragraph") texts.push([where, block.text]);
    else if (block.type === "list") {
      block.items.forEach((item, itemIndex) =>
        texts.push([`${where}.items[${itemIndex}]`, item]),
      );
    } else {
      if (block.caption !== undefined) {
        texts.push([`${where}.caption`, block.caption]);
      }
      block.header.forEach((heading, columnIndex) =>
        texts.push([`${where}.header[${columnIndex}]`, heading]),
      );
      block.rows.forEach((row, rowIndex) =>
        row.forEach((cell, columnIndex) =>
          texts.push([
            `${where}.rows[${rowIndex}][${columnIndex}]`,
            cell,
          ]),
        ),
      );
    }
  });
  if (entry.upgrade !== undefined) {
    texts.push(["upgrade.label", entry.upgrade.label]);
    texts.push(["upgrade.text", entry.upgrade.text]);
  }
  return texts;
}

/**
 * What is wrong with a piece of inline markup, or undefined when it is sound.
 *
 * The parser in `src/catalog/markup.ts` relies on this: it is handed only text whose markers are
 * balanced and correctly placed, so it never has to decide what a stray one meant.
 */
function markupProblem(text: string): string | undefined {
  if (text.includes("System Reference Document"))
    return "page footer text";
  if (text.includes("\u00ad")) return "soft hyphen";
  if (/ {2}/.test(text)) return "doubled space";
  if (text !== text.trim()) return "untrimmed whitespace";
  const withoutBold = text.replace(
    /\*\*(?=\S)(.+?)(?<=\S)\*\*/g,
    "$1",
  );
  if (withoutBold.includes("*")) return "unbalanced ** markers";
  const withoutItalic = withoutBold.replace(
    /(?<![\p{L}\p{N}])_(?=\S)(.+?)(?<=\S)_(?![\p{L}\p{N}])/gu,
    "$1",
  );
  if (withoutItalic.includes("_")) return "unbalanced _ markers";
  return undefined;
}

/** Throws with a list of every problem found; extraction must not emit a suspicious catalog. */
export function validateCatalog(catalog: CatalogSource): void {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const entry of catalog.entries) {
    const where = entry.name || entry.id;
    for (const key of REQUIRED_TEXT_FIELDS) {
      if (entry[key].trim() === "")
        problems.push(`${where}: empty ${key}`);
    }
    if (
      !Number.isInteger(entry.level) ||
      entry.level < 0 ||
      entry.level > 9
    ) {
      problems.push(`${where}: level ${entry.level} out of range`);
    }
    if (!SCHOOLS.includes(entry.school)) {
      problems.push(`${where}: unknown school "${entry.school}"`);
    }
    if (entry.description.length === 0) {
      problems.push(`${where}: empty description`);
    }
    if (entry.classes.length === 0) {
      problems.push(`${where}: no classes`);
    }
    if (!entry.id.startsWith(`${catalog.id}:`)) {
      problems.push(`${where}: id prefix`);
    }
    if (ids.has(entry.id))
      problems.push(`${where}: duplicate id ${entry.id}`);
    ids.add(entry.id);
    for (const block of entry.description) {
      if (block.type === "list" && block.items.length === 0) {
        problems.push(`${where}: empty list`);
      }
      if (block.type === "table") {
        if (block.rows.length === 0) {
          problems.push(`${where}: table without rows`);
        }
        if (
          block.rows.some((row) => row.length !== block.header.length)
        ) {
          problems.push(
            `${where}: table row width differs from header`,
          );
        }
      }
    }
    for (const [field, text] of textsOf(entry)) {
      if (text === "") {
        if (!field.includes("rows"))
          problems.push(`${where}: empty ${field}`);
        continue;
      }
      const problem = markupProblem(text);
      if (problem !== undefined) {
        problems.push(
          `${where}: ${problem} in ${field}: ${JSON.stringify(text)}`,
        );
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `${catalog.id} failed validation:\n  ${problems.join("\n  ")}`,
    );
  }
}
