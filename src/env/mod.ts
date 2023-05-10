export { DEFAULT_ENV } from "./runtime.ts";

// Copy from CookieJar
export type CookieOptions = {
  name?: string;
  value?: string;
  path?: string;
  domain?: string;
  /** in milliseconds */
  expires?: number;
  /** in seconds */
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  /** used for checking against maxAge */
  creationDate?: number;
};

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
  prompts: Prompts;
  logger: Logger;
  newFetcher: (opts?: { cookiesJar?: boolean }) => Fetcher;
};
