import { RankState } from "./state.ts";

export enum Queries {
  HomeQuery = "22e2fa8294168003c21b00c333c35384",
  LatestBattleHistoriesQuery = "4f5f26e64bca394b45345a65a2f383bd",
  RegularBattleHistoriesQuery = "d5b795d09e67ce153e622a184b7e7dfa",
  BankaraBattleHistoriesQuery = "de4754588109b77dbcb90fbe44b612ee",
  XBattleHistoriesQuery = "45c74fefb45a49073207229ca65f0a62",
  PrivateBattleHistoriesQuery = "1d6ed57dc8b801863126ad4f351dfb9a",
  VsHistoryDetailQuery = "291295ad311b99a6288fc95a5c4cb2d2",
  CoopHistoryQuery = "6ed02537e4a65bbb5e7f4f23092f6154",
  CoopHistoryDetailQuery = "379f0d9b78b531be53044bcac031b34b",
  myOutfitCommonDataFilteringConditionQuery =
    "d02ab22c9dccc440076055c8baa0fa7a",
  myOutfitCommonDataEquipmentsQuery = "d29cd0c2b5e6bac90dd5b817914832f8",
  HistoryRecordQuery = "32b6771f94083d8f04848109b7300af5",
  ConfigureAnalyticsQuery = "f8ae00773cc412a50dd41a6d9a159ddd",
}
export type VarsMap = {
  [Queries.HomeQuery]: [];
  [Queries.LatestBattleHistoriesQuery]: [];
  [Queries.RegularBattleHistoriesQuery]: [];
  [Queries.BankaraBattleHistoriesQuery]: [];
  [Queries.XBattleHistoriesQuery]: [];
  [Queries.PrivateBattleHistoriesQuery]: [];
  [Queries.VsHistoryDetailQuery]: [{
    vsResultId: string;
  }];
  [Queries.CoopHistoryQuery]: [];
  [Queries.CoopHistoryDetailQuery]: [{
    coopHistoryDetailId: string;
  }];
  [Queries.myOutfitCommonDataFilteringConditionQuery]: [];
  [Queries.myOutfitCommonDataEquipmentsQuery]: [];
  [Queries.HistoryRecordQuery]: [];
  [Queries.ConfigureAnalyticsQuery]: [];
};

export type Image = {
  url?: string | { pathname: string };
  width?: number;
  height?: number;
};
export type BankaraMatchChallenge = {
  winCount: number;
  loseCount: number;
  maxWinCount: number;
  maxLoseCount: number;
  state: "FAILED" | "SUCCEEDED" | "INPROGRESS";
  isPromo: boolean;
  isUdemaeUp: boolean | null;
  udemaeAfter: string | null;
  earnedUdemaePoint: number | null;
};
export type XMatchMeasurement = {
  state: "COMPLETED" | "INPROGRESS";
  xPowerAfter: null | number;
  isInitial: boolean;
  winCount: number;
  loseCount: number;
  maxInitialBattleCount: number;
  maxWinCount: number;
  maxLoseCount: number;
  vsRule: {
    name: string;
    rule: string;
    id: string;
  };
};
export type BattleListNode = {
  id: string;
  udemae?: string;
  judgement: "LOSE" | "WIN" | "DEEMED_LOSE" | "EXEMPTED_LOSE" | "DRAW";
  bankaraMatch: null | {
    earnedUdemaePoint: null | number;
  };
};
export type CoopListNode = {
  id: string;
  afterGrade: null | {
    "name": string;
    "id": string;
  };
  afterGradePoint: null | number;
};
export type HistoryGroupItem<T> = {
  bankaraMatchChallenge: null | BankaraMatchChallenge;
  xMatchMeasurement: null | XMatchMeasurement;

  historyDetails: {
    nodes: T[];
  };
};
export type Nodes<T> = {
  nodes: T[];
};
export type HistoryGroups<T> = Nodes<HistoryGroupItem<T>>;
export type CoopHistoryGroup = {
  startTime: null | string;
  endTime: null | string;
  highestResult: null | {
    grade: {
      id: string;
    };
    gradePoint: number;
    jobScore: number;
  };
  mode: "PRIVATE_CUSTOM" | "REGULAR";
  rule: "REGULAR" | "BIG_RUN";

  historyDetails: {
    nodes: CoopListNode[];
  };
};
export type CoopHistoryGroups = {
  nodes: CoopHistoryGroup[];
};
export type PlayerGear = {
  name: string;
  image: Image;
  primaryGearPower: {
    name: string;
    image: Image;
  };
  additionalGearPowers: {
    name: string;
    image: Image;
  }[];
  brand: {
    name: string;
    id: string;
  };
};
export type PlayerWeapon = {
  id: string;
  name: string;
  image: Image;
  subWeapon: {
    id: string;
    name: string;
    image: Image;
  };
};
export type VsPlayer = {
  id: string;
  nameId: string | null;
  name: string;
  isMyself: boolean;
  byname: string;
  weapon: PlayerWeapon;
  species: "INKLING" | "OCTOLING";
  result: {
    kill: number;
    death: number;
    assist: number;
    special: number;
    noroshiTry: null | number;
  } | null;
  paint: number;
  crown: boolean;

  headGear: PlayerGear;
  clothingGear: PlayerGear;
  shoesGear: PlayerGear;
};
export type Color = {
  a: number;
  b: number;
  g: number;
  r: number;
};
export type VsTeam = {
  players: VsPlayer[];
  color: Color;
  tricolorRole: null | "DEFENSE" | "ATTACK1" | "ATTACK2";
  festTeamName: null | string;
  result: null | {
    paintRatio: null | number;
    score: null | number;
  };
};
export type VsRule =
  | "TURF_WAR"
  | "AREA"
  | "LOFT"
  | "GOAL"
  | "CLAM"
  | "TRI_COLOR";

export type ChallengeProgress = {
  index: number;
  winCount: number;
  loseCount: number;
};
// With challenge info
export type VsInfo = {
  type: "VsInfo";
  groupInfo: null | Omit<HistoryGroupItem<BattleListNode>, "historyDetails">;
  listNode: null | BattleListNode;
  bankaraMatchChallenge: null | BankaraMatchChallenge;
  challengeProgress: null | ChallengeProgress;
  rankState: null | RankState;
  rankBeforeState: null | RankState;
  detail: VsHistoryDetail;
};
// Salmon run
export type CoopInfo = {
  type: "CoopInfo";
  listNode: null | CoopListNode;
  groupInfo: null | Omit<CoopHistoryGroup, "historyDetails">;
  detail: CoopHistoryDetail;
  gradeBefore: null | {
    grade: {
      name: string;
      id: string;
    };
    gradePoint: number;
  };
};
export type Game = VsInfo | CoopInfo;
export type VsMode = "REGULAR" | "BANKARA" | "PRIVATE" | "FEST" | "X_MATCH";
export type VsHistoryDetail = {
  id: string;
  vsRule: {
    name: string;
    id: string;
    rule: VsRule;
  };
  vsMode: {
    id: string;
    mode: VsMode;
  };
  vsStage: {
    id: string;
    name: string;
    image: Image;
  };
  xMatch: null | {
    lastXPower: null | number;
  };
  playedTime: string; // 2021-01-01T00:00:00Z

  bankaraMatch: {
    earnedUdemaePoint: null | number;
    mode: "OPEN" | "CHALLENGE";
  } | null;
  festMatch: {
    dragonMatchType: "NORMAL" | "DECUPLE" | "DRAGON" | "DOUBLE_DRAGON";
    contribution: number;
    myFestPower: number | null;
  } | null;

  myTeam: VsTeam;
  otherTeams: VsTeam[];
  judgement: "LOSE" | "WIN" | "DEEMED_LOSE" | "EXEMPTED_LOSE" | "DRAW";
  knockout: null | undefined | "NEITHER" | "WIN" | "LOSE";
  awards: { name: string; rank: string }[];
  duration: number;
};

export type CoopHistoryPlayerResult = {
  player: {
    byname: string | null;
    name: string;
    nameId: string;
    uniform: {
      name: string;
      id: string;
    };
  };
  weapons: { name: string; image: Image | null }[];
  specialWeapon: null | {
    image: Image;
    name: string;
  };
  defeatEnemyCount: number;
  deliverCount: number;
  goldenAssistCount: number;
  goldenDeliverCount: number;
  rescueCount: number;
  rescuedCount: number;
};

export type CoopHistoryDetail = {
  id: string;
  afterGrade: null | {
    name: string;
    id: string;
  };
  rule: "REGULAR" | "BIG_RUN";
  myResult: CoopHistoryPlayerResult;
  memberResults: CoopHistoryPlayerResult[];
  bossResult: null | {
    hasDefeatBoss: boolean;
    boss: {
      name: string;
      id: string;
    };
  };
  enemyResults: {
    defeatCount: number;
    teamDefeatCount: number;
    popCount: number;
    enemy: {
      name: string;
      id: string;
    };
  }[];
  waveResults: {
    waveNumber: number;
    waterLevel: 0 | 1 | 2;
    eventWave: null | {
      name: string;
      id: string;
    };
    deliverNorm: number;
    goldenPopCount: number;
    teamDeliverCount: number;
    specialWeapons: {
      image: Image;
      name: string;
    }[];
  }[];
  resultWave: number;
  playedTime: string;
  coopStage: {
    name: string;
    id: string;
  };
  dangerRate: number;
  scenarioCode: null;
  smellMeter: null | number;
  weapons: { name: string }[];
  afterGradePoint: null | number;
  scale: null | {
    gold: number;
    silver: number;
    bronze: number;
  };
  jobPoint: null | number;
  jobScore: null | number;
  jobRate: null | number;
  jobBonus: null | number;
};

export type ExportResult = {
  status: "success";
  url?: string;
} | {
  status: "skip";
  reason: string;
};

export type SummaryFetcher = {
  fetchSummary<T extends (typeof Queries)[keyof typeof SummaryEnum]>(
    type: T,
  ): Promise<RespMap[T]>;
};

export type Summary = {
  uid: string;
  ConfigureAnalyticsQuery: RespMap[Queries.ConfigureAnalyticsQuery];
  HistoryRecordQuery: RespMap[Queries.HistoryRecordQuery];
  CoopHistoryQuery: RespMap[Queries.CoopHistoryQuery];
};

export type GameExporter = {
  name: string;
  notExported: (
    { type, list }: { type: Game["type"]; list: string[] },
  ) => Promise<string[]>;
  exportGame: (game: Game) => Promise<ExportResult>;
  exportSummary?: (summary: Summary) => Promise<ExportResult>;
};

export type BankaraBattleHistories = {
  bankaraBattleHistories: {
    historyGroups: HistoryGroups<BattleListNode>;
  };
};

export type XBattleHistories = {
  xBattleHistories: {
    historyGroups: HistoryGroups<BattleListNode>;
  };
};

export type RespMap = {
  [Queries.HomeQuery]: {
    currentPlayer: {
      weapon: {
        image: Image;
        id: string;
      };
    };
    banners: { image: Image; message: string; jumpTo: string }[];
    friends: {
      nodes: {
        id: number;
        nickname: string;
        userIcon: Image;
      }[];
      totalCount: number;
    };
    footerMessages: unknown[];
  };
  [Queries.LatestBattleHistoriesQuery]: {
    latestBattleHistories: {
      historyGroups: HistoryGroups<BattleListNode>;
    };
  };
  [Queries.RegularBattleHistoriesQuery]: {
    regularBattleHistories: {
      historyGroups: HistoryGroups<BattleListNode>;
    };
  };
  [Queries.BankaraBattleHistoriesQuery]: BankaraBattleHistories;
  [Queries.XBattleHistoriesQuery]: XBattleHistories;
  [Queries.PrivateBattleHistoriesQuery]: {
    privateBattleHistories: {
      historyGroups: HistoryGroups<BattleListNode>;
    };
  };
  [Queries.VsHistoryDetailQuery]: {
    vsHistoryDetail: VsHistoryDetail;
  };
  [Queries.CoopHistoryQuery]: {
    regularAverageClearWave: number | null;
    regularGrade: {
      id: string;
      name: string;
    } | null;
    regularGradePoint: number | null;
    monthlyGear: {
      __typename: string;
      name: string;
      image: Image;
    } | null;
    scale: {
      gold: number;
      silver: number;
      bronze: number;
    } | null;
    pointCard: {
      defeatBossCount: number;
      deliverCount: number;
      goldenDeliverCount: number;
      playCount: number;
      rescueCount: number;
      regularPoint: number;
      totalPoint: number;
    } | null;
    coopResult: {
      historyGroups: CoopHistoryGroups;
    };
  };
  [Queries.CoopHistoryDetailQuery]: {
    coopHistoryDetail: CoopHistoryDetail;
  };
  [Queries.myOutfitCommonDataFilteringConditionQuery]: {
    gearPowers: {
      nodes: {
        name: string;
      }[];
    };
  };
  [Queries.myOutfitCommonDataEquipmentsQuery]: {
    weapons: unknown[];
    headGears: unknown[];
    clothingGears: unknown[];
    shoesGears: unknown[];
  };
  [Queries.HistoryRecordQuery]: {
    currentPlayer: {
      name: string | null;
      byname: string | null;
      nameId: string | null;
      nameplate: Nameplate;
      weapon: {
        id: string;
        name: string;
        subWeapon: {
          id: string;
          name: string;
          image: Image;
        };
        specialWeapon: {
          id: string;
          name: string;
          image: Image;
        };
      };
      headGear: PlayerGear;
      clothingGear: PlayerGear;
      shoesGear: PlayerGear;
      userIcon: Image;
    };
    playHistory: {
      currentTime: string;
      gameStartTime: string;
      rank: number;
      udemae: string;
      udemaeMax: string;
      winCountTotal: number;
      paintPointTotal: number;

      xMatchMaxAr: XRank;
      xMatchMaxCl: XRank;
      xMatchMaxGl: XRank;
      xMatchMaxLf: XRank;
      frequentlyUsedWeapons: Pick<PlayerWeapon, "id" | "name" | "image">[];
      badges: { id: string }[];
      recentBadges: Badge[];
      allBadges: Badge[];
      weaponHistory: {
        nodes: {
          seasonName: string;
          isMonthly: boolean;
          startTime: string;
          endTime: string;
          weaponCategories: {
            weaponCategory: {
              id: string;
              name: string;
              category: string;
            };
            utilRatio: number;
            weapons: (WeaponWithRatio & {
              weaponCategory: {
                category: string;
                id: string;
              };
            })[];
          }[];
          weapons: WeaponWithRatio[];
        }[];
      };
    } | null;
  };
  [Queries.ConfigureAnalyticsQuery]: {
    playHistory: {
      udemaeMax: string;
      paintPointTotal: number;
      gameStartTime: string;
      battleNumTotal: number;

      xMatchMaxAr: SimpleXRank;
      xMatchMaxCl: SimpleXRank;
      xMatchMaxGl: SimpleXRank;
      xMatchMaxLf: SimpleXRank;
    } | null;
  };
};
export type WeaponWithRatio = {
  weapon: {
    name: string;
    image: Image;
    weaponId: number;
    id: string;
  };
  utilRatio: number;
};
export type Badge = {
  id: string;
  description: string;
  image: Image;
};
export type HistoryGear = Pick<
  PlayerGear,
  "name" | "primaryGearPower" | "additionalGearPowers" | "image"
>;

export type Nameplate = {
  badges: {
    id: string;
    image: Image;
  }[];
  background: {
    textColor: { r: number; g: number; b: number; a: number };
    image: Image;
    id: string;
  };
};
export type SimpleXRank = {
  rank: null;
};
export type XRank = {
  power: null;
  rank: null;
  rankUpdateSeasonName: null;
  powerUpdateTime: null;
};
export type GraphQLResponse<T> = {
  data: T;
} | {
  errors: {
    message: string;
  }[];
};

export enum BattleListType {
  Latest,
  Regular,
  Bankara,
  Private,
  Coop,
}

export type StatInkUuidList = {
  status: number;
  code: number;
  name: string;
  message: string;
} | string[];

export type StatInkAbility = {
  key: string;
  name: Record<string, string>;
  primary_only: boolean;
}[];

export type StatInkWeapon = {
  key: string;
  name: Record<string, string>;
}[];

export type StatInkGear = {
  primary_ability: string;
  secondary_abilities: (string | null)[];
};

export type StatInkGears = {
  headgear: StatInkGear;
  clothing: StatInkGear;
  shoes: StatInkGear;
};

export type StatInkPlayer = {
  me: "yes" | "no";
  rank_in_team: number;
  name: string;
  number: string | undefined;
  splashtag_title: string;
  weapon: string;
  inked: number;
  kill?: number;
  assist?: number;
  kill_or_assist?: number;
  death?: number;
  signal?: number;
  special?: number;
  gears?: StatInkGears;
  crown?: "yes" | "no";
  disconnected: "yes" | "no";
};

export type StatInkStage = {
  key: string;
  aliases: string[];
  name: Record<string, string>;
  short_name: Record<string, string>;
  area: number;
  release_at: {
    time: number;
    iso8601: string;
  };
}[];

export type StatInkCoopWave = {
  tide: "low" | "normal" | "high";
  // https://stat.ink/api-info/salmon-event3
  event?: string;
  golden_quota: number;
  golden_delivered: number;
  golden_appearances: number;
  special_uses?: Record<string, number>;
};

export type StatInkCoopPlayer = {
  me: "yes" | "no";
  name: string;
  number: string;
  splashtag_title: string | null;
  uniform?:
    | string
    | "orange"
    | "green"
    | "yellow"
    | "pink"
    | "blue"
    | "black"
    | "white";
  special?: string;
  weapons: (string | null)[];
  golden_eggs: number;
  golden_assist: number;
  power_eggs: number;
  rescue: number;
  rescued: number;
  defeat_boss: number;
  disconnected: "yes" | "no";
};

export type StatInkCoopBoss = {
  appearances: number;
  defeated: number;
  defeated_by_me: number;
};

export type StatInkCoopPostBody = {
  test?: "yes" | "no";
  uuid: string;
  private: "yes" | "no";
  big_run: "yes" | "no";
  stage: string;
  // [0, 333]
  danger_rate: number;
  // [0, 3]
  clear_waves: number;
  fail_reason?: null | "wipe_out" | "time_limit";
  king_smell?: number | null;
  king_salmonid?: string;
  clear_extra: "yes" | "no";
  title_before?: string;
  // [0, 999]
  title_exp_before?: number;
  title_after?: string;
  // [0, 999]
  title_exp_after: null | number;
  golden_eggs: number;
  power_eggs: number;
  gold_scale?: null | number;
  silver_scale?: null | number;
  bronze_scale?: null | number;
  job_point: null | number;
  job_score: null | number;
  job_rate: null | number;
  job_bonus: null | number;
  waves: StatInkCoopWave[];
  players: StatInkCoopPlayer[];
  bosses: Record<string, StatInkCoopBoss>;
  note?: string;
  private_note?: string;
  link_url?: string;
  agent: string;
  agent_version: string;
  agent_variables: Record<string, string>;
  automated: "yes";
  start_at: number;
  end_at?: number;
};

export type StatInkPostBody = {
  test?: "yes" | "no";
  uuid: string;
  lobby:
    | "regular"
    | "bankara_challenge"
    | "bankara_open"
    | "xmatch"
    | "splatfest_challenge"
    | "splatfest_open"
    | "private";
  rule: "nawabari" | "area" | "hoko" | "yagura" | "asari" | "tricolor";
  stage: string;
  weapon: string;
  result: "win" | "lose" | "draw" | "exempted_lose";
  knockout?: "yes" | "no"; // for TW, set null or not sending
  rank_in_team: number; // position in scoreboard
  kill?: number;
  assist?: number;
  kill_or_assist?: number; // equals to kill + assist if you know them
  death?: number;
  signal?: number;
  special?: number; // use count
  inked: number; // not including bonus
  medals: string[]; // 0-3 elements
  our_team_inked?: number; // TW, not including bonus
  their_team_inked?: number; // TW, not including bonus
  third_team_inked?: number; // Tricolor Turf War
  our_team_percent?: number; // TW
  their_team_percent?: number; // TW
  third_team_percent?: number; // Tricolor Turf War
  our_team_count?: number; // Anarchy
  their_team_count?: number; // Anarchy
  our_team_color?: string;
  their_team_color?: string;
  third_team_color?: string;
  our_team_role?: "attacker" | "defender";
  their_team_role?: "attacker" | "defender";
  third_team_role?: "attacker" | "defender";
  our_team_theme?: string;
  their_team_theme?: string;
  third_team_theme?: string;
  level_before?: number;
  level_after?: number;
  rank_before?: string; // one of c- ... s+, lowercase only /^[abcs][+-]?$/ except s-
  rank_before_s_plus?: number;
  rank_before_exp?: number;
  rank_after?: string;
  rank_after_s_plus?: number;
  rank_after_exp?: number;
  rank_exp_change?: number; // Set rank_after_exp - rank_before_exp. It can be negative. Set only this value if you don't know their exact values.
  rank_up_battle?: "yes" | "no"; // Set "yes" if now "Rank-up Battle" mode.
  challenge_win?: number; // Win count for Anarchy (Series) If rank_up_battle is truthy("yes"), the value range is limited to [0, 3].
  challenge_lose?: number;
  x_power_before?: number | null;
  x_power_after?: number | null;
  fest_power?: number; // Splatfest Power (Pro)
  fest_dragon?:
    | "10x"
    | "decuple"
    | "100x"
    | "dragon"
    | "333x"
    | "double_dragon";
  clout_before?: number; // Splatfest Clout, before the battle
  clout_after?: number; // Splatfest Clout, after the battle
  clout_change?: number; // Splatfest Clout, equals to clout_after - clout_before if you know them
  cash_before?: number;
  cash_after?: number;
  our_team_players: StatInkPlayer[];
  their_team_players: StatInkPlayer[];
  third_team_players?: StatInkPlayer[]; // Tricolor Turf War

  agent: string;
  agent_version: string;
  agent_variables?: Record<string, string>;
  automated: "yes";
  start_at: number; // the battle starts at e.g. 1599577200
  end_at: number;
};

export type StatInkPostResponse = {
  error?: unknown;
} & {
  id: string;
  url: string;
};

export type RankParam = {
  rank: string;
  pointRange: [number, number];
  charge: number;
  promotion?: boolean;
};

export enum SummaryEnum {
  ConfigureAnalyticsQuery = Queries.ConfigureAnalyticsQuery,
  HistoryRecordQuery = Queries.HistoryRecordQuery,
  CoopHistoryQuery = Queries.CoopHistoryQuery,
}
