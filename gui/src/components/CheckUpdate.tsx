import { ReactNode } from "react";
import { checkUpdate } from '@tauri-apps/api/updater'

export const CheckUpdate: React.FC<{ className?: string, children?: ReactNode }> = ({ className, children }) => {
  const onClick = async () => {
    try {
      await checkUpdate()
    } catch (error) {
      console.log(error)
    }
  }

  return <>
    <button className={className} onClick={onClick}>{children}</button>
  </>;
}
