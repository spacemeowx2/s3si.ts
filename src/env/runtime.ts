import { wrapFetch } from "../../deps.ts";
import { readline } from "../utils.ts";
import type { Env } from "./mod.ts";

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
  newFetcher: ({ cookiesJar = false } = {}) => {
    let fetch = self.fetch;
    if (cookiesJar) {
      fetch = wrapFetch();
    }

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
