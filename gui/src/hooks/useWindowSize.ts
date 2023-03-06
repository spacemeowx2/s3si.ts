import { getCurrent, LogicalSize, appWindow } from '@tauri-apps/api/window'
import { useEffect, useRef } from 'react';

/**
 * Sets the window size, and disable resizable, and restores it on unmount.
 */
export const useWindowSize = ({ w, h }: { w: number, h: number }) => {
  const oldSize = useRef<{ w: number, h: number }>();

  useEffect(() => {
    const run = async () => {
      const factor = await appWindow.scaleFactor();
      const outerSize = (await getCurrent().outerSize()).toLogical(factor);
      oldSize.current = {
        w: outerSize.width,
        h: outerSize.height
      };

      await getCurrent().setResizable(false);
      await getCurrent().setSize(new LogicalSize(w, h));
    }
    run();
    return () => {
      const size = oldSize.current;
      if (size) {
        getCurrent().setSize(new LogicalSize(size.w, size.h));
        getCurrent().setResizable(true);
      }
    }
  }, [oldSize, w, h]);
};
