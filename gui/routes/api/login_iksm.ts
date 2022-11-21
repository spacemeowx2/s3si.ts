import { HandlerContext, Handlers } from "$fresh/server.ts";
import { DEFAULT_ENV } from "../../../src/env.ts";
import { loginManually } from "../../../src/iksm.ts";

export let waiting: Awaited<ReturnType<typeof login>> | undefined;

function login() {
  const result: {
    token?: Promise<string>;
    res?: (url: string) => void;
    rej?: (e: unknown) => void;
    url?: string;
  } = {};

  return new Promise<Required<typeof result>>((resResult, rejResult) => {
    result.token = loginManually({
      ...DEFAULT_ENV,
      prompts: {
        ...DEFAULT_ENV.prompts,
        promptLogin: (url) => {
          return new Promise((res, rej) => {
            result.url = url;
            result.res = res;
            result.rej = rej;

            resResult(result as Required<typeof result>);
          });
        },
      },
    }).catch((e) => {
      rejResult(e);
      throw e;
    });
  });
}

export const handler: Handlers = {
  async GET(_req: Request, _ctx: HandlerContext) {
    waiting = await login();
    return new Response(JSON.stringify({ url: waiting.url }));
  },
  async POST(req: Request, _ctx: HandlerContext) {
    const url = (await req.json()).url;
    waiting?.res(url);
    return new Response(JSON.stringify({ token: await waiting?.token }));
  },
};
