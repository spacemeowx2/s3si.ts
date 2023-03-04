import { WebviewWindow } from '@tauri-apps/api/window'
import { Loading } from 'components/Loading'
import React from 'react'

export const Home: React.FC = ({ }) => {
  const onClick = () => {
    const webview = new WebviewWindow('theUniqueLabel', {
      url: 'https://accounts.nintendo.com/',
      resizable: false,
      focus: true,
    })
  };
  return <>
    Hello world!  <Loading />
    <button onClick={onClick}>Open the window!</button>
  </>
}
