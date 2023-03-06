import { useState } from "react";

/**
 * A hook that returns a promise and its state.
 * 
 * The promise is only created once, and the state is updated when the promise resolves or rejects.
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
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<any | undefined>(undefined);
  const [promise] = useState(() => {
    const promise = factory();
    if (!promise || typeof promise.then !== "function") {
      throw new Error("The factory function must return a promise.");
    }
    return promise
      .then(setResult)
      .catch(setError)
      .finally(() => {
        setLoading(false);
      });
  });

  return { loading, result, error, promise };
}
