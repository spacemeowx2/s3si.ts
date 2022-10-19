export type LoginState = {
  sessionToken?: string;
  gToken?: string;
  bulletToken?: string;
};
export type State = {
  loginState?: LoginState;
  fGen: string;
  appUserAgent?: string;
};

export const DEFAULT_STATE: State = {
  fGen: "https://api.imink.app/f",
};
