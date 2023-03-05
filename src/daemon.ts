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

enum LoggerLevel {
  Debug = "debug",
  Log = "log",
  Warn = "warn",
  Error = "error",
}

class S3SIServiceImplement implements S3SIService, Service {
  loginMap: Map<string, {
    step1: (url: string) => void;
    promise: Promise<string>;
  }> = new Map();
  loggerQueue: Queue<{ level: LoggerLevel; msg: unknown[] }> = new Queue();
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
      debug: (...msg) =>
        this.loggerQueue.push({ level: LoggerLevel.Debug, msg }),
      log: (...msg) => this.loggerQueue.push({ level: LoggerLevel.Log, msg }),
      warn: (...msg) => this.loggerQueue.push({ level: LoggerLevel.Warn, msg }),
      error: (...msg) =>
        this.loggerQueue.push({ level: LoggerLevel.Error, msg }),
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
