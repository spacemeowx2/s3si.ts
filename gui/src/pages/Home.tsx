import React from 'react'
import { WebviewWindow } from '@tauri-apps/api/window'
import { Loading } from 'components/Loading'
import { JSONRPCClient, S3SIService, StdioTransport } from 'jsonrpc';
import { invoke } from '@tauri-apps/api';
import { emit } from '@tauri-apps/api/event';

const client = new JSONRPCClient<S3SIService>({
  transport: new StdioTransport()
}).getProxy();

export const Home: React.FC = ({ }) => {
  const onHello = async () => {
    const result = await client.loginSteps();
    console.log(result)
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
    console.log('sessionToken', sessionToken.result);
  }
  return <>
    Hello world!  <Loading />
    <button onClick={onHello}>Hello</button>

  </>
}
