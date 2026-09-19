/**
 * Prints the source manifest as tab-separated `url`, `fileName`, `sha256` lines.
 *
 * The drift job in CI fetches each document from its URL and checks it against its hash on the
 * way in, before handing the lot to the extraction, which checks them again. Verifying at the
 * download is what keeps a truncated transfer reported as a failed fetch rather than resurfacing
 * later as an alarm about the document having been re-issued.
 *
 * Reading both from here keeps `sources.ts` the one place a pin is written down: a workflow that
 * hard-coded them would be a second copy to keep in step, and the copy that went stale would be
 * the one deciding whether the bytes are the ones we pinned.
 */
import { SRD_SOURCES } from "./sources.ts";

for (const source of SRD_SOURCES) {
  console.log(
    [source.url, source.fileName, source.sha256].join("\t"),
  );
}
