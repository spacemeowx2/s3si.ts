import React from 'react'
import { WebviewWindow } from '@tauri-apps/api/window'
import { Loading } from 'components/Loading'
import { IPC, Command } from 'ipc';

const ipc = new IPC<Command>();

export const Home: React.FC = ({ }) => {
  const onClick = () => {
    const webview = new WebviewWindow('theUniqueLabel', {
      url: 'https://accounts.nintendo.com/',
      resizable: false,
      focus: true,
    })
  };
  const onHello = async () => {
    await ipc.send({ type: 'hello', data: '1234' });
    const data = await ipc.recvType('hello');
    console.log(`hello`, data)
  }
  return <>
    Hello world!  <Loading />
    <button onClick={onClick}>Open the window!</button>
    <button onClick={onHello}>Hello</button>
  </>
}
