import { Mutex } from "../deps.ts";
import { State } from "./state.ts";
import {
  getBankaraBattleHistories,
  getBattleDetail,
  getCoopDetail,
  getCoopHistories,
} from "./splatnet3.ts";
import {
  BattleListNode,
  ChallengeProgress,
  CoopInfo,
  CoopListNode,
  Game,
  HistoryGroups,
  VsInfo,
} from "./types.ts";
import { Cache, MemoryCache } from "./cache.ts";
import { gameId } from "./utils.ts";

/**
 * Fetch game and cache it. It also fetches bankara match challenge info.
 */
export class GameFetcher {
  state: State;
  cache: Cache;
  lock: Record<string, Mutex | undefined> = {};
  bankaraLock = new Mutex();
  bankaraHistory?: HistoryGroups<BattleListNode>["nodes"];
  coopLock = new Mutex();
  coopHistory?: HistoryGroups<CoopListNode>["nodes"];

  constructor(
    { cache = new MemoryCache(), state }: { state: State; cache?: Cache },
  ) {
    this.state = state;
    this.cache = cache;
  }
  private getLock(id: string): Mutex {
    let cur = this.lock[id];

    if (!cur) {
      cur = new Mutex();
      this.lock[id] = cur;
    }

    return cur;
  }

  getBankaraHistory() {
    return this.bankaraLock.use(async () => {
      if (this.bankaraHistory) {
        return this.bankaraHistory;
      }

      const { bankaraBattleHistories: { historyGroups } } =
        await getBankaraBattleHistories(
          this.state,
        );

      this.bankaraHistory = historyGroups.nodes;

      return this.bankaraHistory;
    });
  }
  getCoopHistory() {
    return this.coopLock.use(async () => {
      if (this.coopHistory) {
        return this.coopHistory;
      }

      const { coopResult: { historyGroups } } = await getCoopHistories(
        this.state,
      );

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
      };
    }

    const listNode = group.historyDetails.nodes.find((i) => i.id === id) ??
      null;

    return {
      type: "CoopInfo",
      listNode,
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

    return {
      type: "VsInfo",
      bankaraMatchChallenge,
      listNode,
      challengeProgress,
    };
  }
  cacheDetail<T>(
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
  async fetchBattle(id: string): Promise<VsInfo> {
    const detail = await this.cacheDetail(
      id,
      () => getBattleDetail(this.state, id).then((r) => r.vsHistoryDetail),
    );
    const metadata = await this.getBattleMetaById(id);

    const game: VsInfo = {
      ...metadata,
      detail,
    };

    return game;
  }
  async fetchCoop(id: string): Promise<CoopInfo> {
    const detail = await this.cacheDetail(
      id,
      () => getCoopDetail(this.state, id).then((r) => r.coopHistoryDetail),
    );
    const metadata = await this.getCoopMetaById(id);

    const game: CoopInfo = {
      ...metadata,
      detail,
    };

    return game;
  }
}
