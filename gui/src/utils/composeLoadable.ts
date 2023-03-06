export type Loadable<T> = {
  loading: boolean;
  result?: T;
  error?: any;
  retry?: () => void;
}

export function composeLoadable<T extends Record<string, Loadable<any>>>(map: T): Loadable<{
  [P in keyof T]: T[P] extends Loadable<infer R> ? R : never
}> {
  const values = Object.values(map)

  const loading = values.some(v => v.loading);
  const error = values.find(v => v.error)?.error;
  const result = loading || error ? undefined : Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.result])) as any;
  const retry = values.some(i => !!i.retry) ? () => Object.values(map).forEach(v => v.retry?.()) : undefined;

  return { loading, result, error, retry };
}
