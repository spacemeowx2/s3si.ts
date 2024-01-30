import useSWR, { Key, SWRResponse } from 'swr'
import useSWRMutation, { SWRMutationResponse } from 'swr/mutation'
import { getConfig, getProfile, setConfig, setProfile } from './config'

const SERVICES = {
  profile: {
    fetcher: getProfile,
    updater: setProfile,
  },
  config: {
    fetcher: getConfig,
    updater: setConfig,
  },
} as const

export type Services = keyof typeof SERVICES

export const useService = <S extends Services>(service: S, ...args: Parameters<(typeof SERVICES)[S]['fetcher']>): SWRResponse<
  Awaited<ReturnType<(typeof SERVICES)[S]['fetcher']>>
> => {
  // @ts-expect-error TypeScript can not infer type here
  return useSWR(['service', service, ...args], () => SERVICES[service].fetcher(...args), { suspense: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RemoveLastParamters<T extends (...args: any) => any> = T extends (...args: [...infer P, any]) => any ? P : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LastParamter<T extends (...args: any) => any> = T extends (...args: [...infer _, infer P]) => any ? P : never;
export const useServiceMutation = <S extends Services>(service: S, ...args: RemoveLastParamters<(typeof SERVICES)[S]['updater']>): SWRMutationResponse<
  Awaited<ReturnType<(typeof SERVICES)[S]['updater']>>,
  Error,
  Key,
  LastParamter<(typeof SERVICES)[S]['updater']>
> => {
  // @ts-expect-error TypeScript can not infer type here
  return useSWRMutation(['service', service, ...args], (_, { arg }) => SERVICES[service].updater(...args, arg))
}
