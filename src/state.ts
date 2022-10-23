export type LoginState = {
  sessionToken?: string;
  gToken?: string;
  bulletToken?: string;
};
export type State = {
  loginState?: LoginState;
  fGen: string;
  appUserAgent?: string;
  userLang?: string;
  userCountry?: string;

  cacheDir: string;

  // Exporter config
  statInkApiKey?: string;
  fileExportPath: string;
  monitorInterval: number;
};

export const DEFAULT_STATE: State = {
  cacheDir: "./cache",
  fGen: "https://api.imink.app/f",
  fileExportPath: "./export",
  monitorInterval: 500,
};

export type StateBackend = {
  read: () => Promise<State>;
  write: (newState: State) => Promise<void>;
};

export class FileStateBackend implements StateBackend {
  constructor(private path: string) {}

  async read(): Promise<State> {
    const decoder = new TextDecoder();
    const data = await Deno.readFile(this.path);
    const json = JSON.parse(decoder.decode(data));
    return json;
  }

  async write(newState: State): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(newState, undefined, 2));
    const swapPath = `${this.path}.swap`;
    await Deno.writeFile(swapPath, data);
    await Deno.rename(swapPath, this.path);
  }
}
