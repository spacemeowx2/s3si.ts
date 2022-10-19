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
  [Queries.HomeQuery]: Record<never, never>;
  [Queries.LatestBattleHistoriesQuery]: Record<never, never>;
  [Queries.RegularBattleHistoriesQuery]: Record<never, never>;
  [Queries.BankaraBattleHistoriesQuery]: Record<never, never>;
  [Queries.PrivateBattleHistoriesQuery]: Record<never, never>;
  [Queries.VsHistoryDetailQuery]: {
    vsResultId: string;
  };
  [Queries.CoopHistoryQuery]: Record<never, never>;
  [Queries.CoopHistoryDetailQuery]: {
    coopHistoryDetailId: string;
  };
};

export type Image = {
  url: string;
  width?: number;
  height?: number;
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
  [Queries.LatestBattleHistoriesQuery]: Record<never, never>;
  [Queries.RegularBattleHistoriesQuery]: Record<never, never>;
  [Queries.BankaraBattleHistoriesQuery]: {
    bankaraBattleHistories: {
      summary: {
        assistAverage: number;
        deathAverage: number;
        killAverage: number;
        lose: number;
        perUnitTimeMinute: number;
        specialAverage: number;
        win: number;
      };
      historyGroups: {
        nodes: {
          bankaraMatchChallenge: null | {
            winCount: number;
            loseCount: number;
            maxWinCount: number;
            maxLoseCount: number;
            state: "Failed";
            isPromo: boolean;
            isUdemaeUp: boolean;
            udemaeAfter: string;
            earnedUdemaePoint: number;
          };
          historyDetails: {
            nodes: {
              id: string;
              vsMode: {
                mode: "BANKARA";
                id: string;
              };
              vsRule: {
                name: string;
                id: string;
              };
              vsStage: {
                name: string;
                id: string;
                image: Image;
              };
              judgement: "LOSE";
              player: unknown;
            }[];
          };
        }[];
      };
    };
  };
  [Queries.PrivateBattleHistoriesQuery]: Record<never, never>;
  [Queries.VsHistoryDetailQuery]: Record<never, never>;
  [Queries.CoopHistoryQuery]: Record<never, never>;
  [Queries.CoopHistoryDetailQuery]: Record<never, never>;
};
export type GraphQLResponse<T> = {
  data: T;
} | {
  errors: {
    message: string;
  }[];
};

export enum BattleType {
  Regular,
  Bankara,
  Private,
}

export const BATTLE_QUERY_MAP: Record<BattleType, Queries> = {
  [BattleType.Regular]: Queries.RegularBattleHistoriesQuery,
  [BattleType.Bankara]: Queries.BankaraBattleHistoriesQuery,
  [BattleType.Private]: Queries.PrivateBattleHistoriesQuery,
};
