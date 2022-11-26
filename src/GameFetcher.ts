import { Mutex } from "../deps.ts";
import { RankState, State } from "./state.ts";
import { Splatnet3 } from "./splatnet3.ts";
import {
  BattleListNode,
  ChallengeProgress,
  CoopHistoryGroups,
  CoopInfo,
  Game,
  HistoryGroups,
  VsInfo,
} from "./types.ts";
import { Cache, MemoryCache } from "./cache.ts";
import { gameId } from "./utils.ts";
import { RankTracker } from "./RankTracker.ts";

/**
 * Fetch game and cache it. It also fetches bankara match challenge info.
 */
export class GameFetcher {
  private splatnet: Splatnet3;
  private cache: Cache;
  private rankTracker: RankTracker;

  private lock: Record<string, Mutex | undefined> = {};
  private bankaraLock = new Mutex();
  private bankaraHistory?: HistoryGroups<BattleListNode>["nodes"];
  private coopLock = new Mutex();
  private coopHistory?: CoopHistoryGroups["nodes"];

  constructor(
    { cache = new MemoryCache(), splatnet, state }: {
      splatnet: Splatnet3;
      state: State;
      cache?: Cache;
    },
  ) {
    this.splatnet = splatnet;
    this.cache = cache;
    this.rankTracker = new RankTracker(state.rankState);
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

  getBankaraHistory() {
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
    const coopHistory = await this.getCoopHistory();
    const group = coopHistory.find((i) =>
      i.historyDetails.nodes.some((i) => i.id === id)
    );

    if (!group) {
      return {
        type: "CoopInfo",
        listNode: null,
        groupInfo: null,
      };
    }

    const { historyDetails, ...groupInfo } = group;
    const listNode = historyDetails.nodes.find((i) => i.id === id) ??
      null;

    return {
      type: "CoopInfo",
      listNode,
      groupInfo,
    };
  }
  async getBattleMetaById(id: string): Promise<Omit<VsInfo, "detail">> {
    const gid = await gameId(id);
    const bankaraHistory = await this.getBankaraHistory();
    const gameIdMap = new Map<BattleListNode, string>();

    for (const i of bankaraHistory) {
      for (const j of i.historyDetails.nodes) {
        gameIdMap.set(j, await gameId(j.id));
      }
    }

    const group = bankaraHistory.find((i) =>
      i.historyDetails.nodes.some((i) => gameIdMap.get(i) === gid)
    );

    if (!group) {
      return {
        type: "VsInfo",
        challengeProgress: null,
        bankaraMatchChallenge: null,
        listNode: null,
        rankState: null,
        rankBeforeState: null,
      };
    }

    const { bankaraMatchChallenge } = group;
    const listNode =
      group.historyDetails.nodes.find((i) => gameIdMap.get(i) === gid) ??
        null;
    const index = group.historyDetails.nodes.indexOf(listNode!);

    let challengeProgress: null | ChallengeProgress = null;
    if (bankaraMatchChallenge) {
      const pastBattles = group.historyDetails.nodes.slice(0, index);
      const { winCount, loseCount } = bankaraMatchChallenge;
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

    const { before, after } = await this.rankTracker.getRankStateById(id) ?? {};

    return {
      type: "VsInfo",
      bankaraMatchChallenge,
      listNode,
      challengeProgress,
      rankState: after ?? null,
      rankBeforeState: before ?? null,
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
      default:
        throw new Error(`Unknown game type: ${type}`);
    }
  }
  private async fetchBattle(id: string): Promise<VsInfo> {
    const detail = await this.cacheDetail(
      id,
      () => this.splatnet.getBattleDetail(id).then((r) => r.vsHistoryDetail),
    );
    const metadata = await this.getBattleMetaById(id);

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
}
