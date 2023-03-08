type Maybe<T> = T | null | undefined;
type KeyOf<T extends Record<string, any>, K = keyof T> = K extends string ? (T[K] extends Function ? never : K) : never;
type DotField<T extends Maybe<Record<string, any>>, K = KeyOf<NonNullable<T>>> = K extends string
  ? K | `${K}.${DotField<NonNullable<T>[K]>}`
  : never;
type ValueOf<T extends Record<string, any>, K> = K extends `${infer I}.${infer R}`
  ? ValueOf<NonNullable<T>[I], R>
  : K extends string
  ? NonNullable<T>[K]
  : never;
export type FormProps<T> = {
  value: T;
  onChange: (value: T) => void;
};

const pick = <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const ret = {} as Pick<T, K>;
  keys.forEach((key) => {
    ret[key] = obj[key];
  });
  return ret;
};

export const mapFormProps = <T, U>(
  formProps: FormProps<T>,
  { mapValue, mapOnChange }: {
    mapValue: (v: T) => U;
    mapOnChange: (v: U) => T;
  },
): FormProps<U> => {
  const { value, onChange } = formProps;
  return {
    value: mapValue(value),
    onChange: (value: U) => onChange(mapOnChange(value)),
  };
};

export const useSubField = <T extends Record<string, any>>({
  value,
  onChange,
}: {
  value: T;
  onChange?: (cb: (value: T) => T) => void;
}) => {
  const subField = <K extends DotField<T>>(key: K): FormProps<ValueOf<T, K>> => {
    const v = key.split('.').reduce((o, x) => (o ?? {})[x], value) as ValueOf<T, K>;
    return {
      value: v,
      onChange: (v: ValueOf<T, K>) => {
        const setInner = <O extends Record<string, any>>(o: O, k: string[], v: any): O => {
          const [head, ...tail] = k;
          let out;
          if (tail.length === 0) {
            out = {
              ...o,
              [head]: v,
            };
          } else {
            out = {
              ...o,
              [head]: setInner(o[head], tail, v),
            };
          }
          return out;
        };
        onChange?.((old) => setInner(old, key.split('.'), v));
      },
    };
  };
  const subKeys = <K extends keyof T>(keys: K[]) => {
    return {
      value: pick(value, keys),
      onChange: (v: Pick<T, K>) => {
        onChange?.((old) => ({
          ...old,
          v,
        }));
      },
    };
  };

  return {
    subField,
    subKeys,
  };
};
