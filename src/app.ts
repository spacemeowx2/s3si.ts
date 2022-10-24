import { getBulletToken, getGToken, loginManually } from "./iksm.ts";
import { MultiProgressBar, Mutex } from "../deps.ts";
import {
  DEFAULT_STATE,
  FileStateBackend,
  State,
  StateBackend,
} from "./state.ts";
import {
  getBankaraBattleHistories,
  getBattleDetail,
  getBattleList,
  getCoopDetail,
  getCoopHistories,
  isTokenExpired,
} from "./splatnet3.ts";
import {
  BattleListNode,
  BattleListType,
  ChallengeProgress,
  CoopInfo,
  CoopListNode,
  Game,
  GameExporter,
  HistoryGroups,
  VsInfo,
} from "./types.ts";
import { Cache, FileCache, MemoryCache } from "./cache.ts";
import { StatInkExporter } from "./exporters/stat.ink.ts";
import { FileExporter } from "./exporters/file.ts";
import {
  delay,
  gameId,
  readline,
  RecoverableError,
  retryRecoverableError,
  showError,
} from "./utils.ts";

export type Opts = {
  profilePath: string;
  exporter: string;
  noProgress: boolean;
  monitor: boolean;
  skipMode?: string;
  cache?: Cache;
  stateBackend?: StateBackend;
};

export const DEFAULT_OPTS: Opts = {
  profilePath: "./profile.json",
  exporter: "stat.ink",
  noProgress: false,
  monitor: false,
};

/**
 * Fetch game and cache it.
 */
class GameFetcher {
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
  private async getLock(id: string): Promise<Mutex> {
    const bid = await gameId(id);

    let cur = this.lock[bid];
    if (!cur) {
      cur = new Mutex();
      this.lock[bid] = cur;
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
    const bid = await gameId(id);
    const bankaraHistory = await this.getBankaraHistory();
    const group = bankaraHistory.find((i) =>
      i.historyDetails.nodes.some((i) => i._bid === bid)
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
    const listNode = group.historyDetails.nodes.find((i) => i._bid === bid) ??
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
  async cacheDetail<T>(
    id: string,
    getter: () => Promise<T>,
  ): Promise<T> {
    const lock = await this.getLock(id);

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

type Progress = {
  current: number;
  total: number;
};

export class App {
  state: State = DEFAULT_STATE;
  stateBackend: StateBackend;
  recoveryToken: RecoverableError = {
    name: "Refetch Token",
    is: isTokenExpired,
    recovery: async () => {
      console.log("Token expired, refetch tokens.");

      await this.fetchToken();
    },
  };

  constructor(public opts: Opts) {
    this.stateBackend = opts.stateBackend ??
      new FileStateBackend(opts.profilePath);
  }
  async writeState(newState: State) {
    this.state = newState;
    await this.stateBackend.write(newState);
  }
  async readState() {
    try {
      const json = await this.stateBackend.read();
      this.state = {
        ...DEFAULT_STATE,
        ...json,
      };
    } catch (e) {
      console.warn(
        `Failed to read config file, create new config file. (${e})`,
      );
      await this.writeState(DEFAULT_STATE);
    }
  }
  getSkipMode(): ("vs" | "coop")[] {
    const mode = this.opts.skipMode;
    if (mode === "vs") {
      return ["vs"];
    } else if (mode === "coop") {
      return ["coop"];
    }
    return [];
  }
  async getExporters(): Promise<GameExporter[]> {
    const exporters = this.opts.exporter.split(",");
    const out: GameExporter[] = [];

    if (exporters.includes("stat.ink")) {
      if (!this.state.statInkApiKey) {
        console.log("stat.ink API key is not set. Please enter below.");
        const key = (await readline()).trim();
        if (!key) {
          console.error("API key is required.");
          Deno.exit(1);
        }
        await this.writeState({
          ...this.state,
          statInkApiKey: key,
        });
      }
      out.push(
        new StatInkExporter(
          this.state.statInkApiKey!,
          this.opts.monitor ? "Monitoring" : "Manual",
        ),
      );
    }

    if (exporters.includes("file")) {
      out.push(new FileExporter(this.state.fileExportPath));
    }

    return out;
  }
  exportOnce() {
    return retryRecoverableError(() => this._exportOnce(), this.recoveryToken);
  }
  exporterProgress(title: string) {
    const bar = !this.opts.noProgress
      ? new MultiProgressBar({
        title,
        display: "[:bar] :text :percent :time eta: :eta :completed/:total",
      })
      : undefined;

    const allProgress: Record<string, Progress> = {};
    const redraw = (name: string, progress: Progress) => {
      allProgress[name] = progress;
      bar?.render(
        Object.entries(allProgress).map(([name, progress]) => ({
          completed: progress.current,
          total: progress.total,
          text: name,
        })),
      );
    };
    const endBar = () => {
      bar?.end();
    };

    return { redraw, endBar };
  }
  async _exportOnce() {
    const exporters = await this.getExporters();
    const skipMode = this.getSkipMode();
    const stats: Record<string, number> = Object.fromEntries(
      exporters.map((e) => [e.name, 0]),
    );

    if (skipMode.includes("vs")) {
      console.log("Skip exporting VS games.");
    } else {
      console.log("Fetching battle list...");
      const gameList = await getBattleList(this.state);

      const { redraw, endBar } = this.exporterProgress("Export vs games");
      const fetcher = new GameFetcher({
        cache: this.opts.cache ?? new FileCache(this.state.cacheDir),
        state: this.state,
      });

      await Promise.all(
        exporters.map((e) =>
          showError(
            this.exportGameList({
              type: "VsInfo",
              fetcher,
              exporter: e,
              gameList,
              onStep: (progress) => redraw(e.name, progress),
            })
              .then((count) => {
                stats[e.name] = count;
              }),
          )
            .catch((err) => {
              console.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

      endBar();
    }

    if (skipMode.includes("coop")) {
      console.log("Skip exporting Coop games.");
    } else {
      console.log("Fetching coop battle list...");
      const coopBattleList = await getBattleList(
        this.state,
        BattleListType.Coop,
      );

      const { redraw, endBar } = this.exporterProgress("Export coop games");
      const fetcher = new GameFetcher({
        cache: this.opts.cache ?? new FileCache(this.state.cacheDir),
        state: this.state,
      });

      await Promise.all(
        // TODO: remove this filter when stat.ink support coop export
        exporters.filter((e) => e.name !== "stat.ink").map((e) =>
          showError(
            this.exportGameList({
              type: "CoopInfo",
              fetcher,
              exporter: e,
              gameList: coopBattleList,
              onStep: (progress) => redraw(e.name, progress),
            })
              .then((count) => {
                stats[e.name] = count;
              }),
          )
            .catch((err) => {
              console.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

      endBar();
    }

    console.log(
      `Exported ${
        Object.entries(stats)
          .map(([name, count]) => `${name}: ${count}`)
          .join(", ")
      }`,
    );
  }
  async monitor() {
    while (true) {
      await this.exportOnce();
      await this.countDown(this.state.monitorInterval);
    }
  }
  async countDown(sec: number) {
    const bar = !this.opts.noProgress
      ? new MultiProgressBar({
        title: "Killing time...",
        display: "[:bar] :completed/:total",
      })
      : undefined;
    for (const i of Array(sec).keys()) {
      bar?.render([{
        completed: i,
        total: sec,
      }]);
      await delay(1000);
    }
    bar?.end();
  }
  async fetchToken() {
    const sessionToken = this.state.loginState?.sessionToken;

    if (!sessionToken) {
      throw new Error("Session token is not set.");
    }

    const { webServiceToken, userCountry, userLang } = await getGToken({
      fApi: this.state.fGen,
      sessionToken,
    });

    const bulletToken = await getBulletToken({
      webServiceToken,
      userLang,
      userCountry,
      appUserAgent: this.state.appUserAgent,
    });

    await this.writeState({
      ...this.state,
      loginState: {
        ...this.state.loginState,
        gToken: webServiceToken,
        bulletToken,
      },
      userLang: this.state.userLang ?? userLang,
      userCountry: this.state.userCountry ?? userCountry,
    });
  }
  async run() {
    await this.readState();

    if (!this.state.loginState?.sessionToken) {
      const sessionToken = await loginManually();

      await this.writeState({
        ...this.state,
        loginState: {
          ...this.state.loginState,
          sessionToken,
        },
      });
    }

    if (this.opts.monitor) {
      await this.monitor();
    } else {
      await this.exportOnce();
    }
  }
  /**
   * Export game list.
   *
   * @param fetcher BattleFetcher
   * @param exporter BattleExporter
   * @param gameList ID list of games, sorted by date, newest first
   * @param onStep Callback function called when a game is exported
   */
  async exportGameList({
    type,
    fetcher,
    exporter,
    gameList,
    onStep,
  }: {
    type: Game["type"];
    exporter: GameExporter;
    fetcher: GameFetcher;
    gameList: string[];
    onStep: (progress: Progress) => void;
  }) {
    let exported = 0;

    onStep?.({
      current: 0,
      total: 1,
    });

    const workQueue = [
      ...await exporter.notExported({
        type,
        list: gameList,
      }),
    ]
      .reverse();

    const step = async (id: string) => {
      const detail = await fetcher.fetch(type, id);
      await exporter.exportGame(detail);
      exported += 1;
      onStep?.({
        current: exported,
        total: workQueue.length,
      });
    };

    if (workQueue.length > 0) {
      onStep?.({
        current: exported,
        total: workQueue.length,
      });
      for (const battle of workQueue) {
        await step(battle);
      }
    }

    return exported;
  }
}
