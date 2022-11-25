import { RankState } from "./state.ts";

export enum Queries {
  HomeQuery = "dba47124d5ec3090c97ba17db5d2f4b3",
  LatestBattleHistoriesQuery = "7d8b560e31617e981cf7c8aa1ca13a00",
  RegularBattleHistoriesQuery = "f6e7e0277e03ff14edfef3b41f70cd33",
  BankaraBattleHistoriesQuery = "c1553ac75de0a3ea497cdbafaa93e95b",
  PrivateBattleHistoriesQuery = "38e0529de8bc77189504d26c7a14e0b8",
  VsHistoryDetailQuery = "2b085984f729cd51938fc069ceef784a",
  CoopHistoryQuery = "817618ce39bcf5570f52a97d73301b30",
  CoopHistoryDetailQuery = "f3799a033f0a7ad4b1b396f9a3bafb1e",
  myOutfitCommonDataFilteringConditionQuery =
    "d02ab22c9dccc440076055c8baa0fa7a",
  myOutfitCommonDataEquipmentsQuery = "d29cd0c2b5e6bac90dd5b817914832f8",
}
export type VarsMap = {
  [Queries.HomeQuery]: [];
  [Queries.LatestBattleHistoriesQuery]: [];
  [Queries.RegularBattleHistoriesQuery]: [];
  [Queries.BankaraBattleHistoriesQuery]: [];
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
};

export type Image = {
  url: string;
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
export type BattleListNode = {
  id: string;
  udemae: string;
  judgement: "LOSE" | "WIN" | "DEEMED_LOSE" | "EXEMPTED_LOSE" | "DRAW";
  bankaraMatch: null | {
    earnedUdemaePoint: null | number;
  };
};
export type CoopListNode = {
  id: string;
};
export type HistoryGroups<T> = {
  nodes: {
    bankaraMatchChallenge: null | BankaraMatchChallenge;

    historyDetails: {
      nodes: T[];
    };
  }[];
};
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
  rule: "REGULAR";

  historyDetails: {
    nodes: CoopListNode[];
  };
};
export type CoopHistoryGroups = {
  nodes: CoopHistoryGroup[];
};
export type PlayerGear = {
  name: string;
  primaryGearPower: {
    name: string;
  };
  additionalGearPowers: {
    name: string;
  }[];
  brand: {
    name: string;
    id: string;
  };
};
export type VsPlayer = {
  id: string;
  nameId: string | null;
  name: string;
  isMyself: boolean;
  byname: string;
  weapon: {
    id: string;
    subWeapon: {
      id: string;
    };
  };
  species: "INKLING" | "OCTOLING";
  result: {
    kill: number;
    death: number;
    assist: number;
    special: number;
  } | null;
  paint: number;

  headGear: PlayerGear;
  clothingGear: PlayerGear;
  shoesGear: PlayerGear;
};
export type VsTeam = {
  players: VsPlayer[];
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
};
export type Game = VsInfo | CoopInfo;
export type VsHistoryDetail = {
  id: string;
  vsRule: {
    name: string;
    id: string;
    rule: VsRule;
  };
  vsMode: {
    id: string;
    mode: "REGULAR" | "BANKARA" | "PRIVATE" | "FEST";
  };
  vsStage: {
    id: string;
    name: string;
    image: Image;
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
    isMyself: boolean;
  };
  weapons: { name: string }[];
  specialWeapon: {
    name: string;
    id: string;
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
  rule: "REGULAR";
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
      id: string;
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

export type GameExporter<
  T extends {
    // type is seful when you implement more than one GameExporter on the same class
    type: string;
  } = Game,
> = {
  name: string;
  notExported: (
    { type, list }: { type: T["type"]; list: string[] },
  ) => Promise<string[]>;
  exportGame: (game: T) => Promise<{ url?: string }>;
};

export type BankaraBattleHistories = {
  bankaraBattleHistories: {
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
  [Queries.PrivateBattleHistoriesQuery]: {
    privateBattleHistories: {
      historyGroups: HistoryGroups<BattleListNode>;
    };
  };
  [Queries.VsHistoryDetailQuery]: {
    vsHistoryDetail: VsHistoryDetail;
  };
  [Queries.CoopHistoryQuery]: {
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
  special?: number;
  gears?: StatInkGears;
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
  uniform?: "orange" | "green" | "yellow" | "pink" | "blue" | "black" | "white";
  special: string;
  weapons: string[];
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
  big_run: "no";
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
    | "splatfest_challenge"
    | "splatfest_open"
    | "private";
  rule: "nawabari" | "area" | "hoko" | "yagura" | "asari";
  stage: string;
  weapon: string;
  result: "win" | "lose" | "draw" | "exempted_lose";
  knockout?: "yes" | "no"; // for TW, set null or not sending
  rank_in_team: number; // position in scoreboard
  kill?: number;
  assist?: number;
  kill_or_assist?: number; // equals to kill + assist if you know them
  death?: number;
  special?: number; // use count
  inked: number; // not including bonus
  medals: string[]; // 0-3 elements
  our_team_inked?: number; // TW, not including bonus
  their_team_inked?: number; // TW, not including bonus
  our_team_percent?: number; // TW
  their_team_percent?: number; // TW
  our_team_count?: number; // Anarchy
  their_team_count?: number; // Anarchy
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
