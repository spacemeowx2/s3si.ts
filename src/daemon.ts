import {
  JSONRPCServer,
  RPCResult,
  S3SIService,
  Service,
} from "./jsonrpc/mod.ts";
import { DenoIO } from "./jsonrpc/deno.ts";
import { loginSteps } from "./iksm.ts";
import { DEFAULT_ENV, Env } from "./env.ts";
import { Queue } from "./jsonrpc/channel.ts";
import { ExportOpts, Log } from "./jsonrpc/types.ts";
import { App } from "./app.ts";
import { InMemoryStateBackend, State } from "./state.ts";
import { MemoryCache } from "./cache.ts";

class S3SIServiceImplement implements S3SIService, Service {
  loginMap: Map<string, {
    step1: (url: string) => void;
    promise: Promise<string>;
  }> = new Map();
  loggerQueue: Queue<Log> = new Queue();
  env: Env = {
    prompts: {
      promptLogin: () => {
        return Promise.reject("Not implemented");
      },
      prompt: () => {
        return Promise.reject("Not implemented");
      },
    },
    logger: {
      debug: (...msg) => this.loggerQueue.push({ level: "debug", msg }),
      log: (...msg) => this.loggerQueue.push({ level: "log", msg }),
      warn: (...msg) => this.loggerQueue.push({ level: "warn", msg }),
      error: (...msg) => this.loggerQueue.push({ level: "error", msg }),
    },
    newFetcher: DEFAULT_ENV.newFetcher,
  };

  loginSteps(): Promise<
    RPCResult<{
      authCodeVerifier: string;
      url: string;
    }>
  >;
  loginSteps(step2: {
    authCodeVerifier: string;
    login: string;
  }): Promise<
    RPCResult<{ sessionToken: string }>
  >;
  async loginSteps(step2?: {
    authCodeVerifier: string;
    login: string;
  }): Promise<
    RPCResult<
      {
        authCodeVerifier: string;
        url: string;
      } | {
        sessionToken: string;
      }
    >
  > {
    if (!step2) {
      return {
        result: await loginSteps(this.env),
      };
    }
    return {
      result: await loginSteps(this.env, step2),
    };
  }
  async getLogs(): Promise<RPCResult<Log[]>> {
    const log = await this.loggerQueue.pop();
    return {
      result: log ? [log] : [],
    };
  }
  async run(state: State, opts: ExportOpts): Promise<RPCResult<State>> {
    const stateBackend = new InMemoryStateBackend(state);
    const app = new App({
      ...opts,
      noProgress: true,
      env: this.env,
      profilePath: "",
      stateBackend,
      cache: new MemoryCache(),
    });
    await app.run();

    return {
      result: stateBackend.state,
    };
  }
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

if (import.meta.main) {
  const service = new S3SIServiceImplement();
  const server = new JSONRPCServer({
    transport: new DenoIO({
      reader: Deno.stdin,
      writer: Deno.stdout,
    }),
    service,
  });

  await server.serve();
}
