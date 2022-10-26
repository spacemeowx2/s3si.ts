export enum Queries {
  HomeQuery = "dba47124d5ec3090c97ba17db5d2f4b3",
  LatestBattleHistoriesQuery = "7d8b560e31617e981cf7c8aa1ca13a00",
  RegularBattleHistoriesQuery = "f6e7e0277e03ff14edfef3b41f70cd33",
  BankaraBattleHistoriesQuery = "c1553ac75de0a3ea497cdbafaa93e95b",
  PrivateBattleHistoriesQuery = "38e0529de8bc77189504d26c7a14e0b8",
  VsHistoryDetailQuery = "2b085984f729cd51938fc069ceef784a",
  CoopHistoryQuery = "817618ce39bcf5570f52a97d73301b30",
  CoopHistoryDetailQuery = "f3799a033f0a7ad4b1b396f9a3bafb1e",
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
  // battle id added after fetch
  _bid: string;
  id: string;
  udemae: string;
  judgement: "LOSE" | "WIN" | "DEEMED_LOSE" | "EXEMPTED_LOSE" | "DRAW";
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
  detail: VsHistoryDetail;
};
// Salmon run
export type CoopInfo = {
  type: "CoopInfo";
  listNode: null | CoopListNode;
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
    earnedUdemaePoint: number;
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
export type CoopHistoryDetail = {
  id: string;
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
  exportGame: (game: T) => Promise<void>;
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
  [Queries.BankaraBattleHistoriesQuery]: {
    bankaraBattleHistories: {
      historyGroups: HistoryGroups<BattleListNode>;
    };
  };
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
      historyGroups: HistoryGroups<CoopListNode>;
    };
  };
  [Queries.CoopHistoryDetailQuery]: {
    coopHistoryDetail: CoopHistoryDetail;
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
