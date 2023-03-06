import { invoke } from "@tauri-apps/api";
import { JSONRPCClient, S3SIService, StdioTransport } from "jsonrpc";
import { useCallback } from "react";

const client = new JSONRPCClient<S3SIService>({
  transport: new StdioTransport()
}).getProxy();

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
