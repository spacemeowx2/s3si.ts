import { getBulletToken, getGToken, loginManually } from "./iksm.ts";
import { MultiProgressBar } from "../deps.ts";
import {
  DEFAULT_STATE,
  FileStateBackend,
  State,
  StateBackend,
} from "./state.ts";
import { getBattleList, getGearPower, isTokenExpired } from "./splatnet3.ts";
import { BattleListType, Game, GameExporter } from "./types.ts";
import { Cache, FileCache } from "./cache.ts";
import { StatInkExporter } from "./exporters/stat.ink.ts";
import { FileExporter } from "./exporters/file.ts";
import {
  delay,
  readline,
  RecoverableError,
  retryRecoverableError,
  showError,
} from "./utils.ts";
import { GameFetcher } from "./GameFetcher.ts";

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

type Progress = {
  currentUrl?: string;
  current: number;
  total: number;
};

function printStats(stats: Record<string, number>) {
  console.log(
    `Exported ${
      Object.entries(stats)
        .map(([name, count]) => `${name}: ${count}`)
        .join(", ")
    }`,
  );
}

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
  gearMap: Record<string, number> | null = null;

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
  async getGearMap() {
    if (this.gearMap) {
      return this.gearMap;
    }
    const { gearPowers } = await getGearPower(this.state);
    this.gearMap = Object.fromEntries(
      gearPowers.nodes.map((i, id) => [i.name, id]),
    );
    return this.gearMap;
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
        new StatInkExporter({
          statInkApiKey: this.state.statInkApiKey!,
          uploadMode: this.opts.monitor ? "Monitoring" : "Manual",
          nameDict: {
            gearPower: await this.getGearMap(),
          },
        }),
      );
    }

    if (exporters.includes("file")) {
      out.push(new FileExporter(this.state.fileExportPath));
    }

    return out;
  }
  async exportOnce() {
    await retryRecoverableError(() => this._exportOnce(), this.recoveryToken);
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
      if (bar) {
        bar.render(
          Object.entries(allProgress).map(([name, progress]) => ({
            completed: progress.current,
            total: progress.total,
            text: name,
          })),
        );
      } else if (progress.currentUrl) {
        console.log(
          `Battle exported to ${progress.currentUrl} (${progress.current}/${progress.total})`,
        );
      }
    };
    const endBar = () => {
      bar?.end();
    };

    return { redraw, endBar };
  }
  private async _exportOnce() {
    const exporters = await this.getExporters();
    const initStats = () =>
      Object.fromEntries(
        exporters.map((e) => [e.name, 0]),
      );
    let stats = initStats();
    const skipMode = this.getSkipMode();
    const errors: unknown[] = [];

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

      const finalRankState = await fetcher.updateRank();

      await Promise.all(
        exporters.map((e) =>
          showError(
            this.exportGameList({
              type: "VsInfo",
              fetcher,
              exporter: e,
              gameList,
              onStep: (progress) => {
                redraw(e.name, progress);
                stats[e.name] = progress.current;
              },
            })
              .then((count) => {
                stats[e.name] = count;
              }),
          )
            .catch((err) => {
              errors.push(err);
              console.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

      endBar();

      printStats(stats);
      if (errors.length > 0) {
        throw errors[0];
      }

      // save rankState only if all exporters succeeded
      fetcher.setRankState(finalRankState);
      await this.writeState({
        ...this.state,
        rankState: finalRankState,
      });
    }

    stats = initStats();

    // TODO: remove this filter when stat.ink support coop export
    const coopExporter = exporters.filter((e) => e.name !== "stat.ink");
    if (skipMode.includes("coop") || coopExporter.length === 0) {
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
        coopExporter.map((e) =>
          showError(
            this.exportGameList({
              type: "CoopInfo",
              fetcher,
              exporter: e,
              gameList: coopBattleList,
              onStep: (progress) => {
                stats[e.name] = progress.current;
                redraw(e.name, progress);
              },
            })
              .then((count) => {
                stats[e.name] = count;
              }),
          )
            .catch((err) => {
              errors.push(err);
              console.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

      endBar();

      printStats(stats);
      if (errors.length > 0) {
        throw errors[0];
      }
    }
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
      const { url } = await exporter.exportGame(detail);
      exported += 1;
      onStep?.({
        currentUrl: url,
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
    } else {
      onStep?.({
        current: 1,
        total: 1,
      });
    }

    return exported;
  }
}
