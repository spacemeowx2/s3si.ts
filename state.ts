export type LoginState = {
  sessionToken: string;
};
export type State = {
  loginState?: LoginState;
};

export const DEFAULT_STATE: State = {};
