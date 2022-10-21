import type { StatInkPostBody, VsHistoryDetail } from "./types.ts";

export const AGENT_NAME = "s3si.ts";
export const S3SI_VERSION = "0.1.3";
export const NSOAPP_VERSION = "2.3.1";
export const WEB_VIEW_VERSION = "1.0.0-216d0219";

export const USERAGENT = `${AGENT_NAME}/${S3SI_VERSION}`;
export const DEFAULT_APP_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/94.0.4606.61 Mobile Safari/537.36";
export const SPLATNET3_URL = "https://api.lp1.av5ja.srv.nintendo.net";
export const SPLATNET3_ENDPOINT =
  "https://api.lp1.av5ja.srv.nintendo.net/api/graphql";
export const S3SI_NAMESPACE = "63941e1c-e32e-4b56-9a1d-f6fbe19ef6e1";

export const SPLATNET3_STATINK_MAP: {
  RULE: Record<VsHistoryDetail["vsRule"]["rule"], StatInkPostBody["rule"]>;
  RESULT: Record<VsHistoryDetail["judgement"], StatInkPostBody["result"]>;
  DRAGON: Record<
    NonNullable<VsHistoryDetail["festMatch"]>["dragonMatchType"],
    StatInkPostBody["fest_dragon"]
  >;
} = {
  RULE: {
    TURF_WAR: "nawabari",
    AREA: "area",
    LOFT: "yagura",
    GOAL: "hoko",
    CLAM: "asari",
    // TODO: support tri-color
    TRI_COLOR: "nawabari",
  },
  RESULT: {
    WIN: "win",
    LOSE: "lose",
    DEEMED_LOSE: "lose",
    EXEMPTED_LOSE: "exempted_lose",
  },
  DRAGON: {
    NORMAL: undefined,
    DECUPLE: "10x",
    DRAGON: "100x",
    DOUBLE_DRAGON: "333x",
  },
};
