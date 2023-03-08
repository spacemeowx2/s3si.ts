import { invoke } from "@tauri-apps/api";
import { JSONRPCClient, S3SIService, StdioTransport } from "jsonrpc";
import { ExportOpts, State } from "jsonrpc/types";
import { useCallback } from "react";

const client = new JSONRPCClient<S3SIService>({
  transport: new StdioTransport()
}).getProxy();

async function getLogs() {
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
  }
}
getLogs()

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
