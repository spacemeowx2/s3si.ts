import { getBulletToken, getGToken, loginManually } from "./iksm.ts";
import { MultiProgressBar, Mutex } from "../deps.ts";
import { DEFAULT_STATE, State } from "./state.ts";
import {
  checkToken,
  getBankaraBattleHistories,
  getBattleDetail,
  getBattleList,
} from "./splatnet3.ts";
import {
  BattleExporter,
  ChallengeProgress,
  HistoryGroups,
  VsBattle,
  VsHistoryDetail,
} from "./types.ts";
import { Cache, FileCache, MemoryCache } from "./cache.ts";
import { StatInkExporter } from "./exporters/stat.ink.ts";
import { FileExporter } from "./exporters/file.ts";
import { battleId, delay, readline, showError } from "./utils.ts";

export type Opts = {
  profilePath: string;
  exporter: string;
  noProgress: boolean;
  monitor: boolean;
  cache?: Cache;
};

export const DEFAULT_OPTS: Opts = {
  profilePath: "./profile.json",
  exporter: "stat.ink",
  noProgress: false,
  monitor: false,
};

/**
 * Fetch battle and cache it.
 */
class BattleFetcher {
  state: State;
  cache: Cache;
  lock: Record<string, Mutex | undefined> = {};
  bankaraLock = new Mutex();
  bankaraHistory?: HistoryGroups["nodes"];

  constructor(
    { cache = new MemoryCache(), state }: { state: State; cache?: Cache },
  ) {
    this.state = state;
    this.cache = cache;
  }
  private async getLock(id: string): Promise<Mutex> {
    const bid = await battleId(id);

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
  async getBattleMetaById(id: string): Promise<Omit<VsBattle, "detail">> {
    const bid = await battleId(id);
    const bankaraHistory = await this.getBankaraHistory();
    const group = bankaraHistory.find((i) =>
      i.historyDetails.nodes.some((i) => i._bid === bid)
    );

    if (!group) {
      return {
        type: "VsBattle",
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
      type: "VsBattle",
      bankaraMatchChallenge,
      listNode,
      challengeProgress,
    };
  }
  async getBattleDetail(id: string): Promise<VsHistoryDetail> {
    const lock = await this.getLock(id);

    return lock.use(async () => {
      const cached = await this.cache.read<VsHistoryDetail>(id);
      if (cached) {
        return cached;
      }

      const detail = (await getBattleDetail(this.state, id))
        .vsHistoryDetail;

      await this.cache.write(id, detail);

      return detail;
    });
  }
  async fetchBattle(id: string): Promise<VsBattle> {
    const detail = await this.getBattleDetail(id);
    const metadata = await this.getBattleMetaById(id);

    const battle: VsBattle = {
      ...metadata,
      detail,
    };

    return battle;
  }
}

type Progress = {
  current: number;
  total: number;
};

export class App {
  state: State = DEFAULT_STATE;

  constructor(public opts: Opts) {
  }
  async writeState(newState: State) {
    this.state = newState;
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(this.state, undefined, 2));
    const swapPath = `${this.opts.profilePath}.swap`;
    await Deno.writeFile(swapPath, data);
    await Deno.rename(swapPath, this.opts.profilePath);
  }
  async readState() {
    const decoder = new TextDecoder();
    try {
      const data = await Deno.readFile(this.opts.profilePath);
      const json = JSON.parse(decoder.decode(data));
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
  async getExporters(): Promise<BattleExporter<VsBattle>[]> {
    const exporters = this.opts.exporter.split(",");
    const out: BattleExporter<VsBattle>[] = [];

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
  async exportOnce() {
    const bar = !this.opts.noProgress
      ? new MultiProgressBar({
        title: "Export battles",
        display: "[:bar] :text :percent :time eta: :eta :completed/:total",
      })
      : undefined;

    const exporters = await this.getExporters();

    const fetcher = new BattleFetcher({
      cache: this.opts.cache ?? new FileCache(this.state.cacheDir),
      state: this.state,
    });
    console.log("Fetching battle list...");
    const battleList = await getBattleList(this.state);

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
    const stats: Record<string, number> = Object.fromEntries(
      exporters.map((e) => [e.name, 0]),
    );

    await Promise.all(
      exporters.map((e) =>
        showError(
          this.exportBattleList({
            fetcher,
            exporter: e,
            battleList,
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

    bar?.end();

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
    const sessionToken = this.state.loginState!.sessionToken!;

    console.log("Checking token...");
    if (!await checkToken(this.state)) {
      console.log("Token expired, refetch tokens.");

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

    if (this.opts.monitor) {
      await this.monitor();
    } else {
      await this.exportOnce();
    }
  }
  /**
   * Export battle list.
   *
   * @param fetcher BattleFetcher
   * @param exporter BattleExporter
   * @param battleList ID list of battles, sorted by date, newest first
   * @param onStep Callback function called when a battle is exported
   */
  async exportBattleList(
    {
      fetcher,
      exporter,
      battleList,
      onStep,
    }: {
      fetcher: BattleFetcher;
      exporter: BattleExporter<VsBattle>;
      battleList: string[];
      onStep?: (progress: Progress) => void;
    },
  ): Promise<number> {
    let exported = 0;

    onStep?.({
      current: 0,
      total: 1,
    });

    const workQueue = [...await exporter.notExported(battleList)].reverse();

    const step = async (battle: string) => {
      const detail = await fetcher.fetchBattle(battle);
      await exporter.exportBattle(detail);
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
