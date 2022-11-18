import { loginManually } from "./iksm.ts";
import { MultiProgressBar } from "../deps.ts";
import { FileStateBackend, Profile, StateBackend } from "./state.ts";
import { Splatnet3 } from "./splatnet3.ts";
import { BattleListType, Game, GameExporter } from "./types.ts";
import { Cache, FileCache } from "./cache.ts";
import { StatInkExporter } from "./exporters/stat.ink.ts";
import { FileExporter } from "./exporters/file.ts";
import { delay, showError } from "./utils.ts";
import { GameFetcher } from "./GameFetcher.ts";
import { DEFAULT_ENV, Env } from "./env.ts";

export type Opts = {
  profilePath: string;
  exporter: string;
  noProgress: boolean;
  monitor: boolean;
  skipMode?: string;
  cache?: Cache;
  stateBackend?: StateBackend;
  env: Env;
};

export const DEFAULT_OPTS: Opts = {
  profilePath: "./profile.json",
  exporter: "stat.ink",
  noProgress: false,
  monitor: false,
  env: DEFAULT_ENV,
};

type Progress = {
  currentUrl?: string;
  current: number;
  total: number;
};

export class App {
  profile: Profile;
  env: Env;

  constructor(public opts: Opts) {
    const stateBackend = opts.stateBackend ??
      new FileStateBackend(opts.profilePath);
    this.profile = new Profile({
      stateBackend,
      env: opts.env,
    });
    this.env = opts.env;
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
    const state = this.profile.state;
    const exporters = this.opts.exporter.split(",");
    const out: GameExporter[] = [];

    if (exporters.includes("stat.ink")) {
      if (!state.statInkApiKey) {
        const key = (await this.env.prompts.prompt(
          "stat.ink API key is not set. Please enter below.",
        )).trim();
        if (!key) {
          this.env.logger.error("API key is required.");
          Deno.exit(1);
        }
        await this.profile.writeState({
          ...state,
          statInkApiKey: key,
        });
      }
      out.push(
        new StatInkExporter({
          statInkApiKey: state.statInkApiKey!,
          uploadMode: this.opts.monitor ? "Monitoring" : "Manual",
        }),
      );
    }

    if (exporters.includes("file")) {
      out.push(new FileExporter(state.fileExportPath));
    }

    return out;
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
        this.env.logger.log(
          `Battle exported to ${progress.currentUrl} (${progress.current}/${progress.total})`,
        );
      }
    };
    const endBar = () => {
      bar?.end();
    };

    return { redraw, endBar };
  }
  private async exportOnce() {
    const splatnet = new Splatnet3({ profile: this.profile, env: this.env });
    const exporters = await this.getExporters();
    const initStats = () =>
      Object.fromEntries(
        exporters.map((e) => [e.name, 0]),
      );
    let stats = initStats();
    const skipMode = this.getSkipMode();
    const errors: unknown[] = [];

    if (skipMode.includes("vs")) {
      this.env.logger.log("Skip exporting VS games.");
    } else {
      this.env.logger.log("Fetching battle list...");
      const gameList = await splatnet.getBattleList();

      const { redraw, endBar } = this.exporterProgress("Export vs games");
      const fetcher = new GameFetcher({
        cache: this.opts.cache ?? new FileCache(this.profile.state.cacheDir),
        state: this.profile.state,
        splatnet,
      });

      const finalRankState = await fetcher.updateRank();

      await Promise.all(
        exporters.map((e) =>
          showError(
            this.env,
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
              this.env.logger.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

      endBar();

      this.printStats(stats);
      if (errors.length > 0) {
        throw errors[0];
      }

      // save rankState only if all exporters succeeded
      fetcher.setRankState(finalRankState);
      await this.profile.writeState({
        ...this.profile.state,
        rankState: finalRankState,
      });
    }

    stats = initStats();

    // TODO: remove this filter when stat.ink support coop export
    const coopExporter = exporters.filter((e) => e.name !== "stat.ink");
    if (skipMode.includes("coop") || coopExporter.length === 0) {
      this.env.logger.log("Skip exporting coop games.");
    } else {
      this.env.logger.log("Fetching coop battle list...");
      const coopBattleList = await splatnet.getBattleList(
        BattleListType.Coop,
      );

      const { redraw, endBar } = this.exporterProgress("Export coop games");
      const fetcher = new GameFetcher({
        cache: this.opts.cache ?? new FileCache(this.profile.state.cacheDir),
        state: this.profile.state,
        splatnet,
      });

      await Promise.all(
        coopExporter.map((e) =>
          showError(
            this.env,
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
              this.env.logger.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

      endBar();

      this.printStats(stats);
      if (errors.length > 0) {
        throw errors[0];
      }
    }
  }
  async monitor() {
    while (true) {
      await this.exportOnce();
      await this.countDown(this.profile.state.monitorInterval);
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
    await this.profile.readState();

    if (!this.profile.state.loginState?.sessionToken) {
      const sessionToken = await loginManually(this.env);

      await this.profile.writeState({
        ...this.profile.state,
        loginState: {
          ...this.profile.state.loginState,
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
  printStats(stats: Record<string, number>) {
    this.env.logger.log(
      `Exported ${
        Object.entries(stats)
          .map(([name, count]) => `${name}: ${count}`)
          .join(", ")
      }`,
    );
  }
}
