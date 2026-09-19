/**
 * Rebuilds the bundled catalogs from the licensor's own published documents.
 *
 * Run with `pnpm --filter @ttrpg-cards/srd extract`. The documents themselves are not
 * redistributed here: put each one in `.sources/` under the file name the manifest gives, and
 * every byte is checked against a pinned SHA-256 before it is read.
 *
 * This script never downloads. The catalog drift job in CI fetches the documents itself and then
 * runs this, so the one thing that reaches the network is a workflow step rather than anything in
 * the source tree. CONTENT-LICENSE.md records where each document is published and what its
 * checksum is.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CatalogEntry,
  CatalogSource,
} from "../src/catalog/catalog.types.ts";
import {
  classesBySlug,
  parseClassLists51,
  parseClassLists521,
  type ClassListEntry,
} from "./class-lists.ts";
import { buildEntry, type BuiltEntry } from "./entry-builder.ts";
import {
  assignRoles,
  sliceChapter,
  splitEntries,
  type RoledLine,
} from "./entries.ts";
import { Dehyphenator } from "./Dehyphenator.ts";
import { columnLeftEdges, pageLines, type Line } from "./layout.ts";
import { openPdf } from "./pdf-text.ts";
import { SRD_SOURCES, type SrdSource } from "./sources.ts";
import { slugify } from "./text.ts";
import { validateCatalog } from "./validate.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, ".sources");
const OUTPUT_DIR = join(ROOT, "src", "catalog", "data");
const DESCRIPTIONS_CHAPTER = "Spell Descriptions";

/** Reads a source document from disk, refusing any bytes but the pinned ones. */
async function loadVerifiedDocument(
  source: SrdSource,
): Promise<Uint8Array> {
  const path = join(SOURCE_DIR, source.fileName);
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}\n  Download it from ${source.url} and put it there, then run this again.\n` +
        "  Nothing in this workspace fetches, so the download is yours to make and to check.",
    );
  }
  const data = new Uint8Array(await readFile(path));
  const actual = createHash("sha256").update(data).digest("hex");
  if (actual !== source.sha256) {
    throw new Error(
      `SHA-256 mismatch for ${path}\n  expected ${source.sha256}\n  actual   ${actual}\n` +
        "  The document has been re-issued, or this is not the file we pinned. Stop and have the\n" +
        "  new bytes reviewed; do not update the pinned hash to make this pass.",
    );
  }
  return data;
}

/** Reads pages in order until the chapter after the entry descriptions begins. */
async function readThroughDescriptions(
  data: Uint8Array,
  source: SrdSource,
): Promise<RoledLine[]> {
  const pdf = await openPdf(data);
  const lines: Line[] = [];
  let inChapter = false;
  for (let page = 1; page <= pdf.pageCount; page++) {
    const [pdfPage] = await pdf.readPages(page, page);
    const pageLineList = pageLines(pdfPage!);
    lines.push(...pageLineList);
    const headings = assignRoles(pageLineList, source.profile).filter(
      (line) => line.role === "chapter-heading",
    );
    if (
      headings.some(
        (heading) => heading.text === DESCRIPTIONS_CHAPTER,
      )
    )
      inChapter = true;
    else if (inChapter && headings.length > 0) break;
  }
  return assignRoles(lines, source.profile);
}

interface ExtractionReport {
  readonly catalog: CatalogSource;
  readonly anomalies: readonly string[];
  readonly notes: readonly string[];
}

async function extract(source: SrdSource): Promise<ExtractionReport> {
  const { profile } = source;
  const anomalies: string[] = [];
  const notes: string[] = [];
  const allLines = await readThroughDescriptions(
    await loadVerifiedDocument(source),
    source,
  );
  const chapterLines = sliceChapter(allLines, DESCRIPTIONS_CHAPTER);
  const columnLeft = columnLeftEdges(
    chapterLines.filter((line) => line.role === "body"),
  );

  const dehyphenator = new Dehyphenator(profile.dehyphenate);
  for (const line of allLines) dehyphenator.learn(line.text);

  const classList: ClassListEntry[] =
    profile.edition === "5.1"
      ? parseClassLists51(allLines)
      : parseClassLists521(allLines);

  const sourceEntries = splitEntries(
    { lines: chapterLines, columnLeft },
    profile,
    anomalies,
  );
  const built = sourceEntries.map((sourceEntry) =>
    buildEntry(sourceEntry, {
      catalogId: source.catalogId,
      source: source.title,
      profile,
      columnLeft,
      dehyphenator,
      anomalies,
      classesBySlug: classesBySlug(classList),
    }),
  );

  const entries = attachStatBlocks(built, notes, anomalies).toSorted(
    (first, second) =>
      first.name.localeCompare(second.name, "en") ||
      first.id.localeCompare(second.id, "en"),
  );
  crossCheckClassLists(
    entries,
    classList,
    profile.edition,
    anomalies,
  );

  const catalog: CatalogSource = {
    id: source.catalogId,
    title: source.title,
    entries,
  };
  validateCatalog(catalog);
  return { catalog, anomalies, notes };
}

/**
 * Stat blocks float in the page layout, so the one found in an entry's reading flow may belong
 * to a neighbour. Each is attached to the entry whose description refers to it by its bold name.
 */
function attachStatBlocks(
  built: readonly BuiltEntry[],
  notes: string[],
  anomalies: string[],
): CatalogEntry[] {
  const descriptions = new Map(
    built.map(({ entry }) => [entry.id, [...entry.description]]),
  );
  for (const { entry, statBlocks } of built) {
    for (const statBlock of statBlocks) {
      const reference = `**${statBlock.name}**`;
      const owner = built.find(({ entry: candidate }) =>
        candidate.description.some(
          (block) =>
            block.type === "paragraph" &&
            block.text.includes(reference),
        ),
      )?.entry;
      if (owner === undefined) {
        anomalies.push(
          `Stat block "${statBlock.name}" is referenced by no entry; kept in ${entry.name}`,
        );
      }
      const target = owner ?? entry;
      descriptions.get(target.id)!.push(...statBlock.blocks);
      notes.push(
        `Stat block "${statBlock.name}" appended to ${target.name}`,
      );
    }
  }
  return built.map(({ entry }) => ({
    ...entry,
    description: descriptions.get(entry.id)!,
  }));
}

/** Cross-checks the extracted entries against the class lists printed elsewhere in the document. */
function crossCheckClassLists(
  entries: readonly CatalogEntry[],
  classList: readonly ClassListEntry[],
  edition: SrdSource["profile"]["edition"],
  anomalies: string[],
): void {
  const bySlug = new Map(
    entries.map((entry) => [slugify(entry.name), entry]),
  );
  const listed = new Set(
    classList.map((listEntry) => listEntry.slug),
  );
  for (const listEntry of classList) {
    const entry = bySlug.get(listEntry.slug);
    if (entry === undefined) {
      anomalies.push(
        `Class list "${listEntry.className}" names unknown entry "${listEntry.name}"`,
      );
      continue;
    }
    if (entry.level !== listEntry.level) {
      anomalies.push(
        `${entry.name}: level ${entry.level} but ${listEntry.className} list says ${listEntry.level}`,
      );
    }
    if (!entry.classes.includes(listEntry.className)) {
      anomalies.push(
        `${entry.name}: not tagged ${listEntry.className} although that class list includes it`,
      );
    }
    if (edition === "5.2.1") {
      if (listEntry.school !== entry.school) {
        anomalies.push(
          `${entry.name}: school ${entry.school} but ${listEntry.className} list says ${listEntry.school}`,
        );
      }
      const special = listEntry.special ?? "";
      if (special.includes("C") !== entry.concentration) {
        anomalies.push(
          `${entry.name}: concentration mismatch with ${listEntry.className} list ("${special}")`,
        );
      }
      if (special.includes("R") !== entry.ritual) {
        anomalies.push(
          `${entry.name}: ritual mismatch with ${listEntry.className} list ("${special}")`,
        );
      }
    }
  }
  for (const entry of entries) {
    if (!listed.has(slugify(entry.name))) {
      anomalies.push(`${entry.name}: on no class list`);
    }
    for (const className of entry.classes) {
      if (
        !classList.some(
          (listEntry) =>
            listEntry.slug === slugify(entry.name) &&
            listEntry.className === className,
        )
      ) {
        anomalies.push(
          `${entry.name}: tagged ${className} but missing from that class list`,
        );
      }
    }
  }
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const source of SRD_SOURCES) {
    // `extract` validates before it returns, so nothing unsound reaches a file.
    const { catalog, anomalies, notes } = await extract(source);
    const outputPath = join(OUTPUT_DIR, `${source.catalogId}.json`);
    await writeFile(
      outputPath,
      `${JSON.stringify(catalog, null, 2)}\n`,
    );

    const tables = catalog.entries.filter((entry) =>
      entry.description.some((block) => block.type === "table"),
    );
    console.log(
      `\n${source.title}: ${catalog.entries.length} entries -> ${outputPath}`,
    );
    console.log(
      `  entries with tables: ${tables.map((entry) => entry.name).join(", ") || "none"}`,
    );
    for (const note of notes) console.log(`  note: ${note}`);
    for (const anomaly of anomalies)
      console.log(`  ANOMALY: ${anomaly}`);
  }
}

await main();
