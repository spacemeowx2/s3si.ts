import { CookieJar, wrapFetch } from "../deps.ts";
import { io } from "../deps.ts";

const stdinLines = io.readLines(Deno.stdin);
export async function readline(
  { skipEmpty = true }: { skipEmpty?: boolean } = {},
) {
  for await (const line of stdinLines) {
    if (!skipEmpty || line !== "") {
      return line;
    }
  }
  throw new Error("EOF");
}

export type Fetcher = {
  get(opts: { url: string; headers?: HeadersInit }): Promise<Response>;
  post(
    opts: { url: string; body?: BodyInit; headers?: HeadersInit },
  ): Promise<Response>;
};

export type Logger = {
  debug: (...msg: unknown[]) => void;
  log: (...msg: unknown[]) => void;
  warn: (...msg: unknown[]) => void;
  error: (...msg: unknown[]) => void;
};

export type Env = {
  logger: Logger;
  readline: () => Promise<string>;
  newFetcher: () => Fetcher;
};

export const DEFAULT_ENV: Env = {
  logger: {
    debug: console.debug,
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
  readline,
  newFetcher: () => {
    const cookieJar = new CookieJar();
    const fetch = wrapFetch({ cookieJar });

    return {
      async get({ url, headers }) {
        return await fetch(url, {
          method: "GET",
          headers,
        });
      },
      async post({ url, body, headers }) {
        return await fetch(url, {
          method: "POST",
          headers,
          body,
        });
      },
    };
  },
};
