import { ReactNode, createContext, useContext } from 'react'
import { canExport } from 'services/config';
import { addLog, run } from 'services/s3si';
import { useService, useServiceMutation } from 'services/useService';
import useSWRMutation from 'swr/mutation';

export type ExportArgs = {
  exportBattle: boolean,
  exportCoop: boolean,
}

const APP_CONTEXT = createContext<{
  exports?: {
    isExporting: boolean
    trigger: (args: ExportArgs) => Promise<void>
  }
}>({})

export const useAppContext = () => {
  return useContext(APP_CONTEXT)
}

export const AppContextProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { data: result } = useService('profile', 0)
  const { trigger: setProfile } = useServiceMutation('profile', 0)
  const { trigger: doExport, isMutating } = useSWRMutation<
    unknown,
    Error,
    string,
    {
      exportBattle: boolean,
      exportCoop: boolean,
    }
  >('export', async (_, { arg: {
    exportBattle, exportCoop,
  } }) => {
    try {
      if (!result) {
        return
      }
      addLog({
        level: 'log',
        msg: ['Export started at', new Date().toLocaleString()],
      })
      const { state } = result;
      const newState = await run(state, {
        exporter: "stat.ink",
        monitor: false,
        withSummary: false,
        skipMode: exportBattle === false ? 'vs' : exportCoop === false ? 'coop' : undefined,
      });
      await setProfile({
        ...result,
        state: newState,
      })
    } catch (e) {
      console.error(e)
      addLog({
        level: 'error',
        msg: [e],
      })
    } finally {
      addLog({
        level: 'log',
        msg: ['Export ended at', new Date().toLocaleString()],
      })
    }
  })


  return <APP_CONTEXT.Provider value={{
    exports: result && canExport(result) ? {
      isExporting: isMutating,
      trigger: async (args: ExportArgs) => {
        await doExport(args)
      },
    } : undefined,
  }}>
    {children}
  </APP_CONTEXT.Provider>
}
