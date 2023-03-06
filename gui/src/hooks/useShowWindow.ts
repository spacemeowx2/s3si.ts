import { useCallback, useEffect } from "react";
import { getCurrent } from "@tauri-apps/api/window";

export const useShowWindow = () => {
  const show = useCallback(() => {
    if (window.location.pathname === '/hide') {
      return;
    }
    try {
      getCurrent().show().catch(e => console.error(e))
    } catch (e) {
      console.error(e)
    }
  }, [])
  useEffect(() => {
    show();
  }, [show])

  return show;
}
