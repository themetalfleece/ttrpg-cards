import { once } from "node:events";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";

/** What each kind of file the export holds is served as. */
const CONTENT_TYPES = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

/** What anything else is served as, which a browser then sniffs or downloads. */
const UNKNOWN_CONTENT_TYPE = "application/octet-stream";

/** The file a directory is served from, which is what a static export writes. */
const DIRECTORY_INDEX = "index.html";

/**
 * The built export served over loopback, so a browser sees it as a site.
 *
 * The app has no server and never will, which is exactly why this exists: the
 * export's HTML asks for `/_next/...` by absolute path, so opening the files
 * off disk gives a page with no styles and no script. This is a harness that
 * hands those same files back over a socket nothing outside the machine can
 * reach, and it lives under `scripts/` because it is never shipped.
 *
 * Written out rather than taken off the shelf, which is a question worth
 * answering once. `serve` is a CLI made for a person: it draws a box, colours
 * its output, copies the URL to the clipboard, and asks the registry whether a
 * newer version exists. Driving it means spawning a process and reading a port
 * back off stdout, or pinning one and losing the collision-free runs an
 * ephemeral port gives. A library like `sirv` is the right shape and would take
 * the content types, the traversal check and the index lookup, but not the
 * start, the stop or the port, so it trades about half this file for a handful
 * of packages. What is left here is a read-only file server on loopback, which
 * is small enough to read in one sitting and has no reason to change.
 *
 * @example
 * ```ts
 * const site = new StaticSite({ root: "out" });
 * const origin = await site.start(); // "http://127.0.0.1:51234"
 * await site.stop();
 * ```
 */
export class StaticSite {
  readonly #root: string;
  #server: Server | undefined;

  constructor(options: { root: string }) {
    this.#root = resolve(options.root);
  }

  /**
   * Starts listening on a port the operating system picks, and hands back the
   * origin to point a browser at.
   *
   * Loopback only, and a port of zero, so two runs at once cannot collide and
   * nothing off the machine can reach the files.
   */
  async start(): Promise<string> {
    const server = createServer(
      (request: IncomingMessage, response: ServerResponse) => {
        void this.#serve(request, response);
      },
    );

    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    this.#server = server;

    const address = server.address();

    if (address === null || typeof address === "string") {
      throw new Error(
        "The static site is listening on a pipe rather than a port, so it has no origin.",
      );
    }

    return `http://127.0.0.1:${address.port}`;
  }

  /** Stops listening, and waits for the sockets already open to close. */
  async stop(): Promise<void> {
    const server = this.#server;

    if (server === undefined) {
      return;
    }

    this.#server = undefined;
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }

  /** Answers one request with the file it names, or with why there is none. */
  async #serve(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const file = this.#fileFor(request.url ?? "/");

    if (file === undefined) {
      response.writeHead(403).end();
      return;
    }

    try {
      const found = await stat(file);

      if (!found.isFile()) {
        response.writeHead(404).end();
        return;
      }
    } catch {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, {
      "content-type": StaticSite.#contentTypeOf(file),
    });
    createReadStream(file).pipe(response);
  }

  /**
   * The file a request path names, or `undefined` for one that climbs out of
   * the served directory.
   *
   * A path is untrusted input even from our own browser, so the answer is
   * checked against the root rather than assumed from the shape of the path.
   */
  #fileFor(url: string): string | undefined {
    const path = StaticSite.#pathOf(url);

    if (path === undefined) {
      return undefined;
    }

    const file = join(this.#root, path);

    if (file !== this.#root && !file.startsWith(this.#root + sep)) {
      return undefined;
    }

    return extname(file) === "" ? join(file, DIRECTORY_INDEX) : file;
  }

  /**
   * The decoded path part of a request, with a trailing slash resolved to the
   * directory itself. `undefined` for anything that will not decode.
   */
  static #pathOf(url: string): string | undefined {
    try {
      const { pathname } = new URL(url, "http://127.0.0.1");

      return decodeURIComponent(pathname);
    } catch {
      return undefined;
    }
  }

  /** What a file is served as, by its extension. */
  static #contentTypeOf(file: string): string {
    return (
      CONTENT_TYPES.get(extname(file).toLowerCase()) ??
      UNKNOWN_CONTENT_TYPE
    );
  }
}
