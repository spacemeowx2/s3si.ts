import { invoke } from "@tauri-apps/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { App } from '../../../src/app';
import { Env } from '../../../src/env';
import { Queue } from "../../../src/jsonrpc/channel";
import { loginSteps } from "../../../src/iksm";
import { InMemoryStateBackend, Profile, State } from "../../../src/state";
import { Splatnet3 } from "../../../src/splatnet3";
import { MemoryCache } from "../../../src/cache";

type LoggerLevel = 'debug' | 'log' | 'warn' | 'error';
type Log = {
  level: LoggerLevel;
  msg: unknown[]
}
export type ExportOpts = {
  exporter: string;
  monitor: boolean;
  withSummary: boolean;
  skipMode?: string;
};

class S3SIServiceImplement {
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
    newFetcher: () => {
      throw new Error("Not implemented");
    },
  };

  loginSteps(): Promise<{
    authCodeVerifier: string;
    url: string;
  }>;
  loginSteps(step2: {
    authCodeVerifier: string;
    login: string;
  }): Promise<{ sessionToken: string }>;
  async loginSteps(step2?: {
    authCodeVerifier: string;
    login: string;
  }): Promise<
    {
      authCodeVerifier: string;
      url: string;
    } | {
      sessionToken: string;
    }
  > {
    if (!step2) {
      return await loginSteps(this.env);
    }
    return await loginSteps(this.env, step2);
  }
  async ensureTokenValid(state: State): Promise<State> {
    const stateBackend = new InMemoryStateBackend(state);
    const profile = new Profile({ stateBackend, env: this.env });
    await profile.readState();
    const splatnet3 = new Splatnet3({ profile, env: this.env });
    if (!await splatnet3.checkToken()) {
      throw new Error('SessionToken is invalid')
    }
    return stateBackend.state;
  }
  async getLogs(): Promise<Log[]> {
    const log = await this.loggerQueue.pop();
    return log ? [log] : [];
  }
  async run(state: State, opts: ExportOpts): Promise<State> {
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

    return stateBackend.state;
  }
}

const client = new S3SIServiceImplement();
const LOG_SUB = new Set<(logs: Log[]) => void>();

async function getLogs() {
  while (true) {
    const r = await client.getLogs()

    for (const { level, msg } of r) {
      switch (level) {
        case 'debug':
          console.debug(...msg);
          break;
        case 'log':
          console.log(...msg);
          break;
        case 'warn':
          console.warn(...msg);
          break;
        case 'error':
          console.error(...msg);
          break;
      }
    }
    for (const cb of LOG_SUB) {
      cb(r);
    }
  }
}
getLogs()

export function addLog(...log: Log[]) {
  for (const cb of LOG_SUB) {
    cb(log);
  }
}

const LOG_CONTEXT = createContext<{
  logs: Log[],
  renderedLogs: React.ReactNode[]
}>({
  logs: [],
  renderedLogs: [],
});

export const useLog = () => {
  return useContext(LOG_CONTEXT);
}

function renderMsg(i: any) {
  if (i instanceof Error) {
    return i.message
  }
  return String(i)
}

const DISPLAY_MAP: Record<LoggerLevel, string> = {
  debug: 'DEBUG',
  log: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
}

function renderLevel(log: Log) {
  return `[${DISPLAY_MAP[log.level]}]`.padEnd(7)
}

function renderLog(log: Log) {
  return `${renderLevel(log)} ${log.msg.map(renderMsg).join(' ')}`
}

export const LogProvider: React.FC<{ limit?: number, children?: React.ReactNode }> = ({ children, limit = 10 }) => {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const cb = (logs: Log[]) => {
      setLogs(old => [...old, ...logs].slice(-limit));
    }
    LOG_SUB.add(cb);
    return () => {
      LOG_SUB.delete(cb);
    }
  }, [limit])


  const renderedLogs = useMemo(() => logs.map(renderLog), [logs])

  return <LOG_CONTEXT.Provider value={{
    logs,
    renderedLogs,
  }}>
    {children}
  </LOG_CONTEXT.Provider>
}

export const useLogin = () => {
  const login = useCallback(async () => {
    const result = await client.loginSteps();

    const login: string | null = await invoke('open_login_window', {
      url: result.url
    })
    if (login === null || login === '') {
      console.log('user cancel login');
      return;
    }
    const loginResult: { url: string } = JSON.parse(login);
    const sessionToken = await client.loginSteps({
      authCodeVerifier: result.authCodeVerifier,
      login: loginResult.url,
    })
    return sessionToken;
  }, [])

  return {
    login
  }
}

export async function run(state: State, opts: ExportOpts) {
  return await client.run(state, opts);
}

export async function ensureTokenValid(state: State) {
  return await client.ensureTokenValid(state);
}
