import type { StatInkPostBody, VsHistoryDetail } from "./types.ts";

export const AGENT_NAME = "s3si.ts";
export const S3SI_VERSION = "0.4.15";
export const NSOAPP_VERSION = "2.9.0";
export const WEB_VIEW_VERSION = "6.0.0-eb33aadc";
export enum Queries {
  HomeQuery =
    "51fc56bbf006caf37728914aa8bc0e2c86a80cf195b4d4027d6822a3623098a8",
  LatestBattleHistoriesQuery =
    "b24d22fd6cb251c515c2b90044039698aa27bc1fab15801d83014d919cd45780",
  RegularBattleHistoriesQuery =
    "2fe6ea7a2de1d6a888b7bd3dbeb6acc8e3246f055ca39b80c4531bbcd0727bba",
  BankaraBattleHistoriesQuery =
    "9863ea4744730743268e2940396e21b891104ed40e2286789f05100b45a0b0fd",
  XBattleHistoriesQuery =
    "eb5996a12705c2e94813a62e05c0dc419aad2811b8d49d53e5732290105559cb",
  EventBattleHistoriesQuery =
    "e47f9aac5599f75c842335ef0ab8f4c640e8bf2afe588a3b1d4b480ee79198ac",
  PrivateBattleHistoriesQuery =
    "fef94f39b9eeac6b2fac4de43bc0442c16a9f2df95f4d367dd8a79d7c5ed5ce7",
  VsHistoryDetailQuery =
    "f893e1ddcfb8a4fd645fd75ced173f18b2750e5cfba41d2669b9814f6ceaec46",
  CoopHistoryQuery =
    "0f8c33970a425683bb1bdecca50a0ca4fb3c3641c0b2a1237aedfde9c0cb2b8f",
  CoopHistoryDetailQuery =
    "42262d241291d7324649e21413b29da88c0314387d8fdf5f6637a2d9d29954ae",
  myOutfitCommonDataFilteringConditionQuery =
    "ac20c44a952131cb0c9d00eda7bc1a84c1a99546f0f1fc170212d5a6bb51a426",
  myOutfitCommonDataEquipmentsQuery =
    "45a4c343d973864f7bb9e9efac404182be1d48cf2181619505e9b7cd3b56a6e8",
  HistoryRecordQuery =
    "0a62c0152f27c4218cf6c87523377521c2cff76a4ef0373f2da3300079bf0388",
  ConfigureAnalyticsQuery =
    "2a9302bdd09a13f8b344642d4ed483b9464f20889ac17401e993dfa5c2bb3607",
}
export const S3SI_LINK = "https://github.com/spacemeowx2/s3si.ts";

export const USERAGENT = `${AGENT_NAME}/${S3SI_VERSION} (${S3SI_LINK})`;
export const DEFAULT_APP_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7a) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.6099.230 Mobile Safari/537.36";
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
  COOP_SPECIAL_MAP: Record<string, string | undefined>;
  WATER_LEVEL_MAP: Record<0 | 1 | 2, "low" | "normal" | "high">;
} = {
  RULE: {
    TURF_WAR: "nawabari",
    AREA: "area",
    LOFT: "yagura",
    GOAL: "hoko",
    CLAM: "asari",
    TRI_COLOR: "tricolor",
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
    "8a7ee88a06407f4be1595ef8af4d2d2ac22bbf213a622cd19bbfaf4d0f36bcd7":
      "teioika",
    "a75eac34675bc0d4bd9ca9977cf22472848f89e28e08ee986b4461a3f2af28fc":
      "ultra_chakuchi",
  },
  WATER_LEVEL_MAP: {
    0: "low",
    1: "normal",
    2: "high",
  },
};

export const SPLATOON3_TITLE_ID = "0100c2500fc20000";
