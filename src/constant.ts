import type { StatInkPostBody, VsHistoryDetail } from "./types.ts";

export const AGENT_NAME = "s3si.ts";
export const S3SI_VERSION = "0.2.4";
export const NSOAPP_VERSION = "2.4.0";
export const WEB_VIEW_VERSION = "2.0.0-bd36a652";
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
  COOP_SPECIAL_MAP: Record<string, string | undefined>;
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
    "bd327d1b64372dedefd32adb28bea62a5b6152d93aada5d9fc4f669a1955d6d4":
      "nicedama",
    "463eedc60013608666b260c79ac8c352f9795c3d0cce074d3fbbdbd2c054a56d":
      "hopsonar",
    "fa8d49e8c850ee69f0231976208a913384e73dc0a39e6fb00806f6aa3da8a1ee":
      "megaphone51",
    "252059408283fbcb69ca9c18b98effd3b8653ab73b7349c42472281e5a1c38f9":
      "jetpack",
    "680379f8b83e5f9e033b828360827bc2f0e08c34df1abcc23de3d059fe2ac435":
      "kanitank",
    "0785cb4979024a83aaa2196e287e232d5d7e4ac959895a650c30ed00fedbc714":
      "sameride",
    "380e541b5bc5e49d77ff1a616f1343aeba01d500fee36aaddf8f09d74bd3d3bc":
      "tripletornado",
  },
  WATER_LEVEL_MAP: {
    0: "low",
    1: "normal",
    2: "high",
  },
};
