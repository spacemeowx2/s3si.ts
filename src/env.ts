import { CookieJar, CookieOptions, wrapFetch } from "../deps.ts";
import { readline } from "./utils.ts";

export type Prompts = {
  /**
   * Prompt the user to enter the npf url.
   */
  promptLogin: (url: string) => Promise<string>;
  /**
   * Prompt the user to enter the string.
   */
  prompt: (tips: string) => Promise<string>;
};

export type Fetcher = {
  get(opts: { url: string; headers?: HeadersInit }): Promise<Response>;
  post(
    opts: { url: string; body?: RequestBody; headers?: HeadersInit },
  ): Promise<Response>;
};

export type RequestBody = BodyInit | Uint8Array;

export type Logger = {
  debug: (...msg: unknown[]) => void;
  log: (...msg: unknown[]) => void;
  warn: (...msg: unknown[]) => void;
  error: (...msg: unknown[]) => void;
};

export type Env = {
  prompts: Prompts;
  logger: Logger;
  newFetcher: (opts?: { cookies?: CookieOptions[] }) => Fetcher;
};

export const DEFAULT_ENV: Env = {
  prompts: {
    promptLogin: async (url: string) => {
      console.log("Navigate to this URL in your browser:");
      console.log(url);
      console.log(
        'Log in, right click the "Select this account" button, copy the link address, and paste it below:',
      );
      return await readline();
    },
    prompt: async (tips: string) => {
      console.log(tips);
      return await readline();
    },
  },
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
          body: body as BodyInit,
        });
      },
    };
  },
};

export type { CookieOptions };
