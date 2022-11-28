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
  withSummary: boolean;
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
  withSummary: false,
  env: DEFAULT_ENV,
};

type Progress = {
  currentUrl?: string;
  current: number;
  total: number;
};

class StepProgress {
  currentUrl?: string;
  total: number;
  exported: number;
  done: number;
  skipped: Record<string, number>;

  constructor() {
    this.total = 1;
    this.exported = 0;
    this.done = 0;
    this.skipped = {};
  }
}

function progress({ total, currentUrl, done }: StepProgress): Progress {
  return {
    total,
    currentUrl,
    current: done,
  };
}

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
          statInkApiKey: this.profile.state.statInkApiKey!,
          uploadMode: this.opts.monitor ? "Monitoring" : "Manual",
          env: this.env,
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
        exporters.map((e) => [e.name, new StepProgress()]),
      );
    let stats = initStats();
    const skipMode = this.getSkipMode();
    const errors: unknown[] = [];

    if (skipMode.includes("vs") || exporters.length === 0) {
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
              stepProgress: stats[e.name],
              onStep: () => {
                redraw(e.name, progress(stats[e.name]));
              },
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

    if (skipMode.includes("coop") || exporters.length === 0) {
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
        exporters.map((e) =>
          showError(
            this.env,
            this.exportGameList({
              type: "CoopInfo",
              fetcher,
              exporter: e,
              gameList: coopBattleList,
              stepProgress: stats[e.name],
              onStep: () => {
                redraw(e.name, progress(stats[e.name]));
              },
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

    const summaryExporters = exporters.filter((e) => e.exportSummary);
    if (!this.opts.withSummary || summaryExporters.length === 0) {
      this.env.logger.log("Skip exporting summary.");
    } else {
      this.env.logger.log("Fetching summary...");
      const summary = await splatnet.getSummary();

      await Promise.all(
        summaryExporters.map((e) =>
          showError(
            this.env,
            e.exportSummary!(summary),
          ).then((result) => {
            if (result.status === "success") {
              this.env.logger.log(`Exported summary to ${result.url}`);
            } else if (result.status === "skip") {
              this.env.logger.log(`Skipped exporting summary to ${e.name}`);
            } else {
              const _never: never = result;
            }
          })
            .catch((err) => {
              errors.push(err);
              this.env.logger.error(`\nFailed to export to ${e.name}:`, err);
            })
        ),
      );

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
    stepProgress,
    onStep,
  }: {
    type: Game["type"];
    exporter: GameExporter;
    fetcher: GameFetcher;
    gameList: string[];
    stepProgress: StepProgress;
    onStep: () => void;
  }): Promise<StepProgress> {
    onStep?.();

    const workQueue = [
      ...await exporter.notExported({
        type,
        list: gameList,
      }),
    ]
      .reverse();

    const step = async (id: string) => {
      const detail = await fetcher.fetch(type, id);
      const result = await exporter.exportGame(detail);

      stepProgress.done += 1;
      stepProgress.currentUrl = undefined;

      if (result.status === "success") {
        stepProgress.exported += 1;
        stepProgress.currentUrl = result.url;
      } else if (result.status === "skip") {
        const { skipped } = stepProgress;
        skipped[result.reason] = (skipped[result.reason] ?? 0) + 1;
      } else {
        const _never: never = result;
      }

      onStep?.();
    };

    if (workQueue.length > 0) {
      stepProgress.total = workQueue.length;
      onStep?.();
      for (const battle of workQueue) {
        await step(battle);
      }
    } else {
      stepProgress.done = 1;
      onStep?.();
    }

    return stepProgress;
  }
  printStats(stats: Record<string, StepProgress>) {
    this.env.logger.log(
      `Exported ${
        Object.entries(stats)
          .map(([name, { exported }]) => `${name}: ${exported}`)
          .join(", ")
      }`,
    );
    if (Object.values(stats).some((i) => Object.keys(i.skipped).length > 0)) {
      this.env.logger.log(
        `Skipped ${
          Object.entries(stats)
            .map(([name, { skipped }]) =>
              Object.entries(skipped).map(([reason, count]) =>
                `${name}: ${reason} (${count})`
              ).join(", ")
            )
        }`,
      );
    }
  }
}
