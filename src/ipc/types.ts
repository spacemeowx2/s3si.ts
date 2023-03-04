export type Command = {
  type: "hello";
  data: string;
};

export type ExtractType<T extends { type: string }, K extends T["type"]> =
  Extract<
    T,
    { type: K }
  >;
