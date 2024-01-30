import { invoke } from "@tauri-apps/api";
import { JSONRPCClient, S3SIService, StdioTransport } from "jsonrpc";
import { ExportOpts, Log, LoggerLevel, State } from "jsonrpc/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const client = new JSONRPCClient<S3SIService>({
  transport: new StdioTransport()
}).getProxy();
const LOG_SUB = new Set<(logs: Log[]) => void>();

async function getLogs() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await client.getLogs()

    if (r.error) {
      throw new Error(r.error.message);
    }

    for (const { level, msg } of r.result) {
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
      cb(r.result);
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

function renderMsg(i: unknown) {
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
  const value = useMemo(() => {
    const renderedLogs = logs.map(renderLog)
    return {
      logs,
      renderedLogs,
    }
  }, [logs])

  return <LOG_CONTEXT.Provider value={value}>
    {children}
  </LOG_CONTEXT.Provider>
}

export const useLogin = () => {
  const login = useCallback(async () => {
    const result = await client.loginSteps();
    if (result.error) {
      throw new Error(result.error.message);
    }

    const login: string | null = await invoke('open_login_window', {
      url: result.result.url
    })
    if (login === null || login === '') {
      console.log('user cancel login');
      return;
    }
    const loginResult: { url: string } = JSON.parse(login);
    const sessionToken = await client.loginSteps({
      authCodeVerifier: result.result.authCodeVerifier,
      login: loginResult.url,
    })
    if (sessionToken.error) {
      throw new Error(sessionToken.error.message);
    }
    return sessionToken.result;
  }, [])

  return {
    login
  }
}

export async function run(state: State, opts: ExportOpts) {
  const r = await client.run(state, opts);
  if (r.error) {
    throw new Error(r.error.message);
  }
  return r.result;
}

export async function ensureTokenValid(state: State) {
  const r = await client.ensureTokenValid(state);
  if (r.error) {
    throw new Error(r.error.message);
  }
  return r.result;
}
