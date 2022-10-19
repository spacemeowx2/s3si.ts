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
export type HistoryGroups = {
  nodes: {
    historyDetails: {
      nodes: {
        id: string;
      }[];
    };
  }[];
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
  [Queries.RegularBattleHistoriesQuery]: {
    regularBattleHistories: {
      historyGroups: HistoryGroups;
    };
  };
  [Queries.BankaraBattleHistoriesQuery]: {
    bankaraBattleHistories: {
      historyGroups: HistoryGroups;
    };
  };
  [Queries.PrivateBattleHistoriesQuery]: {
    privateBattleHistories: {
      historyGroups: HistoryGroups;
    };
  };
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
