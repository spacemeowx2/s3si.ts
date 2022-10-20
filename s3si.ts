import { getBulletToken, getGToken, loginManually } from "./iksm.ts";
import { APIError } from "./APIError.ts";
import { flags, MultiProgressBar, Mutex } from "./deps.ts";
import { DEFAULT_STATE, State } from "./state.ts";
import { checkToken, getBattleDetail, getBattleList } from "./splatnet3.ts";
import { BattleExporter, VsHistoryDetail } from "./types.ts";
import { Cache, FileCache, MemoryCache } from "./cache.ts";
import { StatInkExporter } from "./exporter/stat.ink.ts";
import { readline } from "./utils.ts";
import { FileExporter } from "./exporter/file.ts";

type Opts = {
  profilePath: string;
  exporter: string;
  noProgress: boolean;
  help?: boolean;
};

const DEFAULT_OPTS: Opts = {
  profilePath: "./profile.json",
  exporter: "stat.ink",
  noProgress: false,
  help: false,
};

/**
 * Fetch battle and cache it.
 */
class BattleFetcher {
  state: State;
  cache: Cache;
  lock: Record<string, Mutex | undefined> = {};

  constructor(
    { cache = new MemoryCache(), state }: { state: State; cache?: Cache },
  ) {
    this.state = state;
    this.cache = cache;
  }
  getLock(id: string): Mutex {
    let cur = this.lock[id];
    if (!cur) {
      cur = new Mutex();
      this.lock[id] = cur;
    }
    return cur;
  }
  fetchBattle(id: string): Promise<VsHistoryDetail> {
    const lock = this.getLock(id);

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
}

type Progress = {
  current: number;
  total: number;
};

class App {
  state: State = DEFAULT_STATE;

  constructor(public opts: Opts) {
    if (this.opts.help) {
      console.log(
        `Usage: deno run --allow-net --allow-read --allow-write ${Deno.mainModule} [options]

Options:
    --profile-path <path>, -p    Path to config file (default: ./profile.json)
    --exporter <exporter>, -e    Exporter list to use (default: stat.ink)
                                 Multiple exporters can be separated by commas
                                 (e.g. "stat.ink,file")
    --no-progress, -n            Disable progress bar
    --help                       Show this help message and exit`,
      );
      Deno.exit(0);
    }
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
  async getExporters(): Promise<BattleExporter<VsHistoryDetail>[]> {
    const exporters = this.opts.exporter.split(",");
    const out: BattleExporter<VsHistoryDetail>[] = [];

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
      out.push(new StatInkExporter(this.state.statInkApiKey!));
    }

    if (exporters.includes("file")) {
      out.push(new FileExporter(this.state.fileExportPath));
    }

    return out;
  }
  async run() {
    await this.readState();

    const bar = !this.opts.noProgress
      ? new MultiProgressBar({
        title: "Export battles",
        display: "[:bar] :text :percent :time eta: :eta :completed/:total",
      })
      : undefined;
    const exporters = await this.getExporters();

    try {
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

      const fetcher = new BattleFetcher({
        cache: new FileCache(this.state.cacheDir),
        state: this.state,
      });
      console.log("Fetching battle list...");
      const battleList = await getBattleList(this.state);

      await this.prepareBattles({
        bar,
        battleList,
        fetcher,
        exporters,
      });

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
          this.exportBattleList({
            fetcher,
            exporter: e,
            battleList,
            onStep: (progress) => redraw(e.name, progress),
          })
            .then((count) => {
              stats[e.name] = count;
            })
            .catch((err) => {
              console.error(`\nFailed to export ${e.name}:`, err);
            })
        ),
      );

      console.log("\nDone.", stats);
    } catch (e) {
      if (e instanceof APIError) {
        console.error(`APIError: ${e.message}`, e.response, e.json);
      } else {
        console.error(e);
      }
    }
  }
  async prepareBattles({
    bar,
    exporters,
    battleList,
    fetcher,
  }: {
    bar?: MultiProgressBar;
    exporters: BattleExporter<VsHistoryDetail>[];
    battleList: string[];
    fetcher: BattleFetcher;
  }) {
    let prepared = 0;
    bar?.render([{
      text: "preparing",
      completed: prepared,
      total: battleList.length,
    }]);

    const latestBattleTimes = await Promise.all(
      exporters.map((e) => e.getLatestBattleTime()),
    );
    const latestBattleTime = latestBattleTimes.reduce(
      (a, b) => a > b ? b : a,
      new Date(0),
    );

    for (const battleId of battleList) {
      const battle = await fetcher.fetchBattle(battleId);
      const playedTime = new Date(battle.playedTime);

      prepared += 1;
      bar?.render([{
        text: "preparing",
        completed: prepared,
        total: battleList.length,
      }]);

      // if battle is older than latest battle, break
      if (playedTime <= latestBattleTime) {
        break;
      }
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
      exporter: BattleExporter<VsHistoryDetail>;
      battleList: string[];
      onStep?: (progress: Progress) => void;
    },
  ): Promise<number> {
    const latestBattleTime = await exporter.getLatestBattleTime();
    let toUpload = 0;
    let exported = 0;

    for (const battleId of battleList) {
      const battle = await fetcher.fetchBattle(battleId);
      const playedTime = new Date(battle.playedTime);

      // if battle is older than latest battle, break
      if (playedTime <= latestBattleTime) {
        break;
      }

      toUpload += 1;
    }

    const workQueue = battleList.slice(0, toUpload).reverse();

    if (workQueue.length === 0) {
      return 0;
    }

    const step = async (battle: string) => {
      const detail = await fetcher.fetchBattle(battle);
      await exporter.exportBattle(detail);
      exported += 1;
      onStep?.({
        current: exported,
        total: workQueue.length,
      });
    };

    onStep?.({
      current: exported,
      total: workQueue.length,
    });
    for (const battle of workQueue) {
      await step(battle);
    }

    return exported;
  }
}

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["profilePath", "exporter"],
    boolean: ["help", "noProgress"],
    alias: {
      "help": "h",
      "profilePath": ["p", "profile-path"],
      "exporter": ["e"],
      "noProgress": ["n", "no-progress"],
    },
    default: {
      progress: true,
    },
  });
  return parsed;
};

const app = new App({
  ...DEFAULT_OPTS,
  ...parseArgs(Deno.args),
});
await app.run();
