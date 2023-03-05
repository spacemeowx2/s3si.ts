import React from 'react'
import { WebviewWindow } from '@tauri-apps/api/window'
import { Loading } from 'components/Loading'
import { JSONRPCClient, S3SIService, StdioTransport } from 'jsonrpc';

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
    const webview = new WebviewWindow('login', {
      url: 'https://accounts.nintendo.com/',
      resizable: true,
      focus: true,
    });

  }
  return <>
    Hello world!  <Loading />
    <button onClick={onHello}>Hello</button>

  </>
}
