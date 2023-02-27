import { RankState } from "./state.ts";
import {
  BankaraMatchChallenge,
  BattleListNode,
  HistoryGroups,
  RankParam,
} from "./types.ts";
import { gameId, parseHistoryDetailId } from "./utils.ts";
import { getSeason } from "./VersionData.ts";

const splusParams = () => {
  const out: RankParam[] = [];

  for (let i = 0; i < 50; i++) {
    const level = i % 10;
    const item: RankParam = {
      rank: `S+${i}`,
      pointRange: [300 + level * 350, 300 + (level + 1) * 350],
      charge: 180,
    };
    if (level === 9) {
      item.promotion = true;
    }
    out.push(item);
  }

  out.push({
    rank: "S+50",
    pointRange: [0, 9999],
    charge: 180,
  });

  return out;
};

export const RANK_PARAMS: RankParam[] = [{
  rank: "C-",
  pointRange: [0, 200],
  charge: 0,
}, {
  rank: "C",
  pointRange: [200, 400],
  charge: 20,
}, {
  rank: "C+",
  pointRange: [400, 600],
  charge: 40,
  promotion: true,
}, {
  rank: "B-",
  pointRange: [100, 350],
  charge: 55,
}, {
  rank: "B",
  pointRange: [350, 600],
  charge: 70,
}, {
  rank: "B+",
  pointRange: [600, 850],
  charge: 85,
  promotion: true,
}, {
  rank: "A-",
  pointRange: [200, 500],
  charge: 110,
}, {
  rank: "A",
  pointRange: [500, 800],
  charge: 120,
}, {
  rank: "A+",
  pointRange: [800, 1100],
  charge: 130,
  promotion: true,
}, {
  rank: "S",
  pointRange: [300, 1000],
  charge: 170,
  promotion: true,
}, ...splusParams()];

type Delta = {
  before: {
    gameId: string;
    timestamp: number;
  };
  gameId: string;
  timestamp: number;
  rank?: string;
  rankAfter?: string;
  rankPoint: number;
  isPromotion: boolean;
  isRankUp: boolean;
  isChallengeFirst: boolean;
};

// delta's beforeGameId must be state's gameId
function addRank(
  state: RankState | undefined,
  delta: Delta,
): { before: RankState; after: RankState } | undefined {
  if (!state) {
    // is rank up, generate state here
    if (delta.isPromotion && delta.isRankUp) {
      state = getRankStateByDelta(delta);
    } else {
      return;
    }
  }

  if (state.gameId !== delta.before.gameId) {
    throw new Error("Invalid state");
  }

  const { rank, rankPoint } = state;
  const {
    gameId,
    timestamp,
    rankAfter,
    isPromotion,
    isRankUp,
    isChallengeFirst,
  } = delta;

  if (state.timestamp) {
    const oldSeason = getSeason(new Date(state.timestamp * 1000));
    if (oldSeason) {
      const newSeason = getSeason(new Date(timestamp * 1000));
      if (newSeason?.id !== oldSeason.id) {
        return;
      }
    }
  }

  const rankIndex = RANK_PARAMS.findIndex((r) => r.rank === rank);

  if (rankIndex === -1) {
    throw new Error(`Rank not found: ${rank}`);
  }

  const rankParam = RANK_PARAMS[rankIndex];

  if (isChallengeFirst) {
    return {
      before: state,
      after: {
        gameId,
        timestamp,
        rank,
        rankPoint: rankPoint - rankParam.charge,
      },
    };
  }

  // S+50 is the highest rank
  if (rankIndex === RANK_PARAMS.length - 1) {
    return {
      before: state,
      after: {
        timestamp,
        gameId,
        rank,
        rankPoint: Math.min(
          rankPoint + delta.rankPoint,
          rankParam.pointRange[1],
        ),
      },
    };
  }

  if (isPromotion && isRankUp) {
    const nextRankParam = RANK_PARAMS[rankIndex + 1];

    return {
      before: state,
      after: {
        gameId,
        timestamp,
        rank: nextRankParam.rank,
        rankPoint: nextRankParam.pointRange[0],
      },
    };
  }

  return {
    before: state,
    after: {
      gameId,
      timestamp,
      rank: rankAfter ?? rank,
      rankPoint: rankPoint + delta.rankPoint,
    },
  };
}

const battleTime = (id: string) => {
  const { timestamp } = parseHistoryDetailId(id);

  const dateStr = timestamp.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    "$1-$2-$3T$4:$5:$6Z",
  );

  return new Date(dateStr);
};

type FlattenItem = {
  id: string;
  gameId: string;
  time: Date;
  bankaraMatchChallenge: BankaraMatchChallenge | null;
  index: number;
  groupLength: number;
  detail: BattleListNode;
};

function beginPoint(
  state: RankState | undefined,
  flatten: FlattenItem[],
): [firstItem: FlattenItem, unProcessed: FlattenItem[]] {
  if (state) {
    const index = flatten.findIndex((i) => i.gameId === state.gameId);

    if (index !== -1) {
      return [flatten[index], flatten.slice(index)];
    }
  }

  if (flatten.length === 0) {
    throw new Error("flatten must not be empty");
  }
  return [flatten[0], flatten];
}

function getTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function generateDeltaList(
  state: RankState | undefined,
  flatten: FlattenItem[],
) {
  const [firstItem, unProcessed] = beginPoint(state, flatten);

  const deltaList: Delta[] = [];
  let before = {
    gameId: firstItem.gameId,
    timestamp: getTimestamp(firstItem.time),
  };

  for (const i of unProcessed.slice(1)) {
    if (!i.detail.bankaraMatch) {
      throw new TypeError("bankaraMatch must be defined");
    }

    let delta: Delta = {
      before,
      gameId: i.gameId,
      timestamp: getTimestamp(i.time),
      rankPoint: 0,
      isPromotion: false,
      isRankUp: false,
      isChallengeFirst: false,
    };
    before = {
      gameId: i.gameId,
      timestamp: Math.floor(i.time.getTime() / 1000),
    };
    if (i.bankaraMatchChallenge) {
      // challenge
      if (i.index === 0 && i.bankaraMatchChallenge.state !== "INPROGRESS") {
        // last battle in challenge
        delta = {
          ...delta,
          rank: i.detail.udemae,
          rankAfter: i.bankaraMatchChallenge.udemaeAfter ?? undefined,
          rankPoint: i.bankaraMatchChallenge.earnedUdemaePoint ?? 0,
          isPromotion: i.bankaraMatchChallenge.isPromo ?? false,
          isRankUp: i.bankaraMatchChallenge.isUdemaeUp ?? false,
          isChallengeFirst: false,
        };
      } else if (i.index === i.groupLength - 1) {
        // first battle in challenge
        delta = {
          ...delta,
          isChallengeFirst: true,
        };
      }
    } else {
      // open
      delta = {
        ...delta,
        // TODO: rankAfter should be undefined in open battle
        rankAfter: i.detail.udemae,
        rankPoint: i.detail.bankaraMatch?.earnedUdemaePoint ?? 0,
      };
    }

    deltaList.push(delta);
  }

  return {
    firstItem,
    deltaList,
  };
}

function getRankStateByDelta(i: Delta): RankState {
  const rank = i.rank;
  const nextRank = i.rankAfter;
  const earnedUdemaePoint = i.rankPoint;
  if (!rank || !nextRank) {
    throw new Error("rank and nextRank must be defined");
  }

  const param = RANK_PARAMS.find((i) => i.rank === rank);
  const nextParam = RANK_PARAMS.find((i) => i.rank === nextRank);

  if (!param || !nextParam) {
    throw new Error(`Rank or nextRank not found: ${rank} ${nextRank}`);
  }

  const oldRankPoint = nextParam.pointRange[0] -
    earnedUdemaePoint;

  return {
    gameId: i.before.gameId,
    timestamp: i.before.timestamp,
    rank,
    rankPoint: oldRankPoint,
  };
}

/**
 * if state is empty, it will not track rank.
 */
export class RankTracker {
  // key: privous game id
  protected deltaMap: Map<string, Delta> = new Map();
  // key: after game id
  protected stateMap: Map<string, { before: RankState; after: RankState }> =
    new Map();

  constructor(protected state: RankState | undefined) {}

  async getRankStateById(
    id: string,
  ): Promise<{ before: RankState; after: RankState } | undefined> {
    const gid = await gameId(id);

    return this.stateMap.get(gid);
  }

  setState(state: RankState | undefined) {
    this.state = state;
  }

  async updateState(
    history: HistoryGroups<BattleListNode>["nodes"],
  ) {
    // history order by time. 0 is the oldest.
    const flatten: FlattenItem[] = await Promise.all(
      history
        .flatMap(
          ({ historyDetails, bankaraMatchChallenge }) => {
            return historyDetails.nodes.map((j, index) => ({
              id: j.id,
              time: battleTime(j.id),
              gameId: gameId(j.id),
              bankaraMatchChallenge,
              index,
              groupLength: historyDetails.nodes.length,
              detail: j,
            }));
          },
        )
        .sort((a, b) => a.time.getTime() - b.time.getTime())
        .map((i) => i.gameId.then((gameId) => ({ ...i, gameId }))),
    );

    let curState: RankState | undefined = this.state;

    const { firstItem, deltaList } = generateDeltaList(curState, flatten);

    // history don't contain current state, so skip update
    if (curState && firstItem.gameId !== curState.gameId) {
      return;
    }

    for (const delta of deltaList) {
      this.deltaMap.set(delta.before.gameId, delta);
      const result = addRank(curState, delta);
      curState = result?.after;
      if (result) {
        this.stateMap.set(result.after.gameId, result);
      }
    }

    return curState;
  }
}
