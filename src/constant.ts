import type { StatInkPostBody, VsHistoryDetail } from "./types.ts";

export const AGENT_NAME = "s3si.ts";
export const S3SI_VERSION = "0.1.34";
export const NSOAPP_VERSION = "2.3.1";
export const WEB_VIEW_VERSION = "1.0.0-433ec0e8";
export const S3SI_LINK = "https://github.com/spacemeowx2/s3si.ts";

export const USERAGENT = `${AGENT_NAME}/${S3SI_VERSION} (${S3SI_LINK})`;
export const DEFAULT_APP_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/94.0.4606.61 Mobile Safari/537.36";
export const SPLATNET3_URL = "https://api.lp1.av5ja.srv.nintendo.net";
export const SPLATNET3_ENDPOINT =
  "https://api.lp1.av5ja.srv.nintendo.net/api/graphql";
export const BATTLE_NAMESPACE = "b3a2dbf5-2c09-4792-b78c-00b548b70aeb";
export const COOP_NAMESPACE = "f1911910-605e-11ed-a622-7085c2057a9d";
export const S3SI_NAMESPACE = "63941e1c-e32e-4b56-9a1d-f6fbe19ef6e1";

export const SPLATNET3_STATINK_MAP: {
  RULE: Record<VsHistoryDetail["vsRule"]["rule"], StatInkPostBody["rule"]>;
  RESULT: Record<VsHistoryDetail["judgement"], StatInkPostBody["result"]>;
  DRAGON: Record<
    NonNullable<VsHistoryDetail["festMatch"]>["dragonMatchType"],
    StatInkPostBody["fest_dragon"]
  >;
  COOP_EVENT_MAP: Record<number, string | undefined>;
  COOP_UNIFORM_MAP: Record<
    number,
    | "orange"
    | "green"
    | "yellow"
    | "pink"
    | "blue"
    | "black"
    | "white"
    | undefined
  >;
  COOP_SPECIAL_MAP: Record<number, string>;
  WATER_LEVEL_MAP: Record<0 | 1 | 2, "low" | "normal" | "high">;
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
    DRAW: "draw",
  },
  DRAGON: {
    NORMAL: undefined,
    DECUPLE: "10x",
    DRAGON: "100x",
    DOUBLE_DRAGON: "333x",
  },
  COOP_EVENT_MAP: {
    1: "rush",
    2: "goldie_seeking",
    3: "griller",
    4: "mothership",
    5: "fog",
    6: "cohock_charge",
    7: "giant_tornado",
    8: "mudmouth_eruption",
  },
  COOP_UNIFORM_MAP: {
    1: "orange",
    2: "green",
    3: "yellow",
    4: "pink",
    5: "blue",
    6: "black",
    7: "white",
  },
  COOP_SPECIAL_MAP: {
    20006: "nicedama",
    20007: "hopsonar",
    20009: "megaphone51",
    20010: "jetpack",
    20012: "kanitank",
    20013: "sameride",
    20014: "tripletornado",
  },
  WATER_LEVEL_MAP: {
    0: "low",
    1: "normal",
    2: "high",
  },
};
