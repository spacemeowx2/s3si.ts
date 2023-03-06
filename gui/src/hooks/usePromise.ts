import { useState } from "react";

/**
 * A hook that returns a promise and its state.
 *
 * @param factory A function that returns a promise.
 * @returns An object containing the promise's state and result.
 * @example
 * const { loading, result, error } = usePromise(() => fetch('https://example.com')
 *  .then(response => response.text())
 * );
 * if (loading) {
 *   return <p>Loading...</p>;
 * }
 * if (error) {
 *   return <p>Error: {error.message}</p>;
 * }
 * return <p>Result: {result}</p>;
 */
export function usePromise<T>(factory: () => Promise<T>) {
  const init = () => {
    const promise = factory();
    if (!promise || typeof promise.then !== "function") {
      throw new Error("The factory function must return a promise.");
    }
    return promise
      .then(r => {
        setResult(r);
        setLoading(false);
        return r;
      })
      .catch(e => {
        setError(e);
        setLoading(false);
        throw e;
      });
  }
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<any | undefined>(undefined);
  const [promise, setPromise] = useState(init);
  const retry = () => {
    setLoading(true);
    setResult(undefined);
    setError(undefined);
    setPromise(init);
  }

  return { loading, result, error, promise, retry };
}

/**
 * A hook that returns a promise and its state.
 */
export function usePromiseLazy<T, Args extends any[]>(factory: (...args: Args) => Promise<T>) {
  const init = (promise: Promise<T>) => {
    if (!promise || typeof promise.then !== "function") {
      throw new Error("The factory function must return a promise.");
    }
    return promise
      .then(r => {
        setResult(r);
        setLoading(false);
        return r;
      })
      .catch(e => {
        setError(e);
        setLoading(false);
        throw e;
      });
  }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<any | undefined>(undefined);
  const [promise, setPromise] = useState<Promise<T> | undefined>(undefined);
  const execute = (...args: Args) => {
    setLoading(true);
    setResult(undefined);
    setError(undefined);
    setPromise(init(factory(...args)));
  }

  return [execute, { loading, result, error, promise }] as const;
}
