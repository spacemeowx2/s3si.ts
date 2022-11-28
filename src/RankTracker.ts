import { RankState } from "./state.ts";
import {
  BankaraMatchChallenge,
  BattleListNode,
  HistoryGroups,
  RankParam,
} from "./types.ts";
import { gameId, parseHistoryDetailId } from "./utils.ts";

const splusParams = () => {
  const out: RankParam[] = [];

  for (let i = 0; i < 50; i++) {
    const level = i % 10;
    const item: RankParam = {
      rank: `S+${i}`,
      pointRange: [300 + level * 350, 300 + (level + 1) * 350],
      charge: 160,
    };
    if (level === 9) {
      item.promotion = true;
    }
    out.push(item);
  }

  out.push({
    rank: "S+50",
    pointRange: [0, 9999],
    charge: 160,
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
  charge: 100,
}, {
  rank: "A",
  pointRange: [500, 800],
  charge: 110,
}, {
  rank: "A+",
  pointRange: [800, 1100],
  charge: 120,
  promotion: true,
}, {
  rank: "S",
  pointRange: [300, 1000],
  charge: 150,
  promotion: true,
}, ...splusParams()];

type Delta = {
  beforeGameId: string;
  gameId: string;
  rankAfter?: string;
  rankPoint: number;
  isPromotion: boolean;
  isRankUp: boolean;
  isChallengeFirst: boolean;
};

// TODO: auto rank up using rank params and delta.
function addRank(state: RankState, delta: Delta): RankState {
  const { rank, rankPoint } = state;
  const { gameId, rankAfter, isPromotion, isRankUp, isChallengeFirst } = delta;

  const rankIndex = RANK_PARAMS.findIndex((r) => r.rank === rank);

  if (rankIndex === -1) {
    throw new Error(`Rank not found: ${rank}`);
  }

  const rankParam = RANK_PARAMS[rankIndex];

  if (isChallengeFirst) {
    return {
      gameId,
      rank,
      rankPoint: rankPoint - rankParam.charge,
    };
  }

  // S+50 is the highest rank
  if (rankIndex === RANK_PARAMS.length - 1) {
    return {
      gameId,
      rank,
      rankPoint: Math.min(rankPoint + delta.rankPoint, rankParam.pointRange[1]),
    };
  }

  if (isPromotion && isRankUp) {
    const nextRankParam = RANK_PARAMS[rankIndex + 1];

    return {
      gameId,
      rank: nextRankParam.rank,
      rankPoint: nextRankParam.pointRange[0],
    };
  }

  return {
    gameId,
    rank: rankAfter ?? rank,
    rankPoint: rankPoint + delta.rankPoint,
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
  gameId: string;
  time: Date;
  bankaraMatchChallenge: BankaraMatchChallenge | null;
  index: number;
  groupLength: number;
  detail: BattleListNode;
};

function generateDeltaList(
  state: RankState,
  flatten: FlattenItem[],
) {
  const index = flatten.findIndex((i) => i.gameId === state.gameId);

  if (index === -1) {
    return;
  }

  const unProcessed = flatten.slice(index);
  const deltaList: Delta[] = [];
  let beforeGameId = state.gameId;

  for (const i of unProcessed.slice(1)) {
    if (!i.detail.bankaraMatch) {
      throw new TypeError("bankaraMatch must be defined");
    }

    let delta: Delta = {
      beforeGameId,
      gameId: i.gameId,
      rankPoint: 0,
      isPromotion: false,
      isRankUp: false,
      isChallengeFirst: false,
    };
    beforeGameId = i.gameId;
    if (i.bankaraMatchChallenge) {
      // challenge
      if (i.index === 0 && i.bankaraMatchChallenge.state !== "INPROGRESS") {
        // last battle in challenge
        delta = {
          ...delta,
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

  return deltaList;
}

function getRankState(i: FlattenItem): RankState {
  const rank = i.detail.udemae;
  const param = RANK_PARAMS.find((i) => i.rank === rank);

  if (!param) {
    throw new Error(`Rank not found: ${rank}`);
  }
  return {
    gameId: i.gameId,
    rank,
    rankPoint: -1,
  };
}

/**
 * if state is empty, it will not track rank.
 */
export class RankTracker {
  // key: privous game id
  protected deltaMap: Map<string, Delta> = new Map();

  constructor(protected state: RankState | undefined) {}

  async getRankStateById(
    id: string,
  ): Promise<{ before: RankState; after: RankState } | undefined> {
    if (!this.state) {
      return;
    }
    const gid = await gameId(id);

    let cur = this.state;
    let before = cur;
    while (cur.gameId !== gid) {
      const delta = this.deltaMap.get(cur.gameId);
      if (!delta) {
        return;
      }
      before = cur;
      cur = addRank(cur, delta);
    }

    return {
      before,
      after: cur,
    };
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

    const gameIdTime = new Map<string | undefined, Date>(
      flatten.map((i) => [i.gameId, i.time]),
    );

    let curState: RankState | undefined;
    const oldestPromotion = flatten.find((i) =>
      i.bankaraMatchChallenge?.isPromo && i.bankaraMatchChallenge.isUdemaeUp
    );

    /*
     * There are 4 cases:
     * 1. state === undefined, oldestPromotion === undefined
     * 2. state === undefined, oldestPromotion !== undefined
     * 3. state !== undefined, oldestPromotion === undefined
     * 4. state !== undefined, oldestPromotion !== undefined
     *
     * In case 1, we can't track rank. So we do nothing.
     * In case 2, 3, we track rank by the non-undefined state.
     * In case 4, we can track by the elder game.
     */
    const thisStateTime = gameIdTime.get(this.state?.gameId);
    if (!thisStateTime && !oldestPromotion) {
      return;
    } else if (thisStateTime && !oldestPromotion) {
      curState = this.state;
    } else if (!thisStateTime && oldestPromotion) {
      curState = getRankState(oldestPromotion);
    } else if (thisStateTime && oldestPromotion) {
      if (thisStateTime <= oldestPromotion.time) {
        curState = this.state;
      } else {
        curState = getRankState(oldestPromotion);
      }
    }

    if (!curState) {
      return;
    }

    this.state = curState;
    const deltaList = generateDeltaList(curState, flatten);

    if (!deltaList) {
      return;
    }

    for (const delta of deltaList) {
      this.deltaMap.set(delta.beforeGameId, delta);
      curState = addRank(curState, delta);
    }

    return curState;
  }
}
