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
