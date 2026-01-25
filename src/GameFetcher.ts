import { Mutex } from "../deps.ts";
import { RankState, State } from "./state.ts";
import { Splatnet3 } from "./splatnet3.ts";
import {
  BattleListNode,
  ChallengeProgress,
  CoopHistoryGroups,
  CoopInfo,
  Game,
  HistoryGroupItem,
  SideOrderInfo,
  SideOrderTryResult,
  SideOrderTryResultPointPage,
  VsInfo,
  VsMode,
} from "./types.ts";
import { Cache, MemoryCache } from "./cache.ts";
import { gameId } from "./utils.ts";
import { RankTracker } from "./RankTracker.ts";

/**
 * Fetch game and cache it. It also fetches bankara match challenge info.
 * if splatnet is not given, it will use cache only
 */
export class GameFetcher {
  private _splatnet?: Splatnet3;
  private cache: Cache;
  private rankTracker: RankTracker;

  private lock: Record<string, Mutex | undefined> = {};
  private bankaraLock = new Mutex();
  private bankaraHistory?: HistoryGroupItem<BattleListNode>[];
  private coopLock = new Mutex();
  private coopHistory?: CoopHistoryGroups["nodes"];
  private xMatchLock = new Mutex();
  private xMatchHistory?: HistoryGroupItem<BattleListNode>[];

  constructor(
    { cache = new MemoryCache(), splatnet, state }: {
      splatnet?: Splatnet3;
      state: State;
      cache?: Cache;
    },
  ) {
    this._splatnet = splatnet;
    this.cache = cache;
    this.rankTracker = new RankTracker(state.rankState);
  }
  private get splatnet() {
    if (!this._splatnet) {
      throw new Error("splatnet is not set");
    }
    return this._splatnet;
  }
  private getLock(id: string): Mutex {
    let cur = this.lock[id];

    if (!cur) {
      cur = new Mutex();
      this.lock[id] = cur;
    }

    return cur;
  }

  setRankState(state: RankState | undefined) {
    this.rankTracker.setState(state);
  }

  async updateRank(): Promise<RankState | undefined> {
    const finalState = await this.rankTracker.updateState(
      await this.getBankaraHistory(),
    );
    return finalState;
  }

  getRankStateById(id: string) {
    return this.rankTracker.getRankStateById(id);
  }

  getXMatchHistory() {
    if (!this._splatnet) {
      return [];
    }
    return this.xMatchLock.use(async () => {
      if (this.xMatchHistory) {
        return this.xMatchHistory;
      }

      const { xBattleHistories: { historyGroups } } = await this.splatnet
        .getXBattleHistories();

      this.xMatchHistory = historyGroups.nodes;

      return this.xMatchHistory;
    });
  }
  getBankaraHistory() {
    if (!this._splatnet) {
      return [];
    }
    return this.bankaraLock.use(async () => {
      if (this.bankaraHistory) {
        return this.bankaraHistory;
      }

      const { bankaraBattleHistories: { historyGroups } } = await this.splatnet
        .getBankaraBattleHistories();

      this.bankaraHistory = historyGroups.nodes;

      return this.bankaraHistory;
    });
  }
  getCoopHistory() {
    if (!this._splatnet) {
      return [];
    }
    return this.coopLock.use(async () => {
      if (this.coopHistory) {
        return this.coopHistory;
      }

      const { coopResult: { historyGroups } } = await this.splatnet
        .getCoopHistories();

      this.coopHistory = historyGroups.nodes;

      return this.coopHistory;
    });
  }
  async getCoopMetaById(id: string): Promise<Omit<CoopInfo, "detail">> {
    const coopHistory = this._splatnet ? await this.getCoopHistory() : [];
    const group = coopHistory.find((i) =>
      i.historyDetails.nodes.some((i) => i.id === id)
    );

    if (!group) {
      return {
        type: "CoopInfo",
        listNode: null,
        groupInfo: null,
        gradeBefore: null,
      };
    }

    const { historyDetails, ...groupInfo } = group;
    const listNodeIdx = historyDetails.nodes.findIndex((i) => i.id === id) ??
      null;
    const listNode = listNodeIdx !== null
      ? historyDetails.nodes[listNodeIdx]
      : null;
    const listNodeBefore = listNodeIdx !== null
      ? (historyDetails.nodes[listNodeIdx + 1] ?? null)
      : null;

    return {
      type: "CoopInfo",
      listNode,
      groupInfo,
      gradeBefore: listNodeBefore?.afterGrade && listNodeBefore.afterGradePoint
        ? {
          grade: listNodeBefore.afterGrade,
          gradePoint: listNodeBefore.afterGradePoint,
        }
        : null,
    };
  }
  async getBattleMetaById(
    id: string,
    vsMode: VsMode,
  ): Promise<Omit<VsInfo, "detail">> {
    const gid = await gameId(id);

    const gameIdMap = new Map<BattleListNode, string>();
    let group: HistoryGroupItem<BattleListNode> | null = null;
    let listNode: BattleListNode | null = null;

    if (vsMode === "BANKARA" || vsMode === "X_MATCH") {
      const bankaraHistory = vsMode === "BANKARA"
        ? await this.getBankaraHistory()
        : await this.getXMatchHistory();

      for (const i of bankaraHistory) {
        for (const j of i.historyDetails.nodes) {
          gameIdMap.set(j, await gameId(j.id));
        }
      }

      group = bankaraHistory.find((i) =>
        i.historyDetails.nodes.some((i) =>
          gameIdMap.get(i) === gid
        )
      ) ?? null;
    }

    if (!group) {
      return {
        type: "VsInfo",
        challengeProgress: null,
        bankaraMatchChallenge: null,
        listNode: null,
        rankState: null,
        rankBeforeState: null,
        groupInfo: null,
      };
    }

    const { bankaraMatchChallenge, xMatchMeasurement } = group;
    const { historyDetails, ...groupInfo } = group;
    listNode = historyDetails.nodes.find((i) => gameIdMap.get(i) === gid) ??
      null;
    const index = historyDetails.nodes.indexOf(listNode!);

    let challengeProgress: null | ChallengeProgress = null;
    const challengeOrMeasurement = bankaraMatchChallenge || xMatchMeasurement;
    if (challengeOrMeasurement) {
      const pastBattles = historyDetails.nodes.slice(0, index);
      const { winCount, loseCount } = challengeOrMeasurement;
      challengeProgress = {
        index,
        winCount: winCount -
          pastBattles.filter((i) => i.judgement == "WIN").length,
        loseCount: loseCount -
          pastBattles.filter((i) =>
            ["LOSE", "DEEMED_LOSE"].includes(i.judgement)
          ).length,
      };
    }

    const { before, after } = await this.rankTracker.getRankStateById(id) ??
      {};

    return {
      type: "VsInfo",
      bankaraMatchChallenge,
      listNode,
      challengeProgress,
      rankState: after ?? null,
      rankBeforeState: before ?? null,
      groupInfo,
    };
  }
  private cacheDetail<T>(
    id: string,
    getter: () => Promise<T>,
  ): Promise<T> {
    const lock = this.getLock(id);

    return lock.use(async () => {
      const cached = await this.cache.read<T>(id);
      if (cached) {
        return cached;
      }

      const detail = await getter();

      await this.cache.write(id, detail);

      return detail;
    });
  }
  fetch(type: Game["type"], id: string): Promise<Game> {
    switch (type) {
      case "VsInfo":
        return this.fetchBattle(id);
      case "CoopInfo":
        return this.fetchCoop(id);
      case "SideOrderInfo":
        return this.fetchSideOrder(id);
      default:
        throw new Error(`Unknown game type: ${type}`);
    }
  }
  private async fetchBattle(id: string): Promise<VsInfo> {
    const detail = await this.cacheDetail(
      id,
      () => this.splatnet.getBattleDetail(id).then((r) => r.vsHistoryDetail),
    );
    const metadata = await this.getBattleMetaById(id, detail.vsMode.mode);

    const game: VsInfo = {
      ...metadata,
      detail,
    };

    return game;
  }
  private async fetchCoop(id: string): Promise<CoopInfo> {
    const detail = await this.cacheDetail(
      id,
      () => this.splatnet.getCoopDetail(id).then((r) => r.coopHistoryDetail),
    );
    const metadata = await this.getCoopMetaById(id);

    const game: CoopInfo = {
      ...metadata,
      detail,
    };

    return game;
  }
  private async fetchSideOrder(id: string): Promise<SideOrderInfo> {
    const detail = await this.cacheDetail(
      id,
      () => this.splatnet.getSideOrderDetail(id).then((r) => r.node),
    );

    const clonedDetail: SideOrderTryResult = {
      ...detail,
      points: {
        ...detail.points,
        edges: [...detail.points.edges],
      },
    };

    let cursor: string | null = null;

    do {
      const page = await this.splatnet.getSideOrderPointPage(id, cursor);

      clonedDetail.points.edges.push(...page.node.points.edges);
      clonedDetail.points.pageInfo = page.node.points.pageInfo;

      cursor = page.node.points.pageInfo.endCursor;
    } while (clonedDetail.points.pageInfo.hasNextPage);

    const game: SideOrderInfo = {
      type: "SideOrderInfo",
      detail: clonedDetail,
    };

    return game;
  }
}
