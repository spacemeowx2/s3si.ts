import { CookieJar, CookieOptions, wrapFetch } from "../deps.ts";

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
  newFetcher: (opts?: { cookies?: CookieOptions[] }) => Fetcher;
};

export const DEFAULT_ENV: Env = {
  logger: {
    debug: console.debug,
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
  newFetcher: ({ cookies } = {}) => {
    const cookieJar = new CookieJar(cookies);
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

export type { CookieOptions };
