/**
 * Upload file exporter battles to stat.ink.
 * Make sure you have already logged in.
 */
import { flags } from "../deps.ts";
import { FileCache } from "../src/cache.ts";
import { DEFAULT_ENV } from "../src/env.ts";
import { FileExporter } from "../src/exporters/file.ts";
import { StatInkExporter } from "../src/exporters/stat.ink.ts";
import { GameFetcher } from "../src/GameFetcher.ts";
import { loginManually } from "../src/iksm.ts";
import { Splatnet3 } from "../src/splatnet3.ts";
import { FileStateBackend, Profile } from "../src/state.ts";
import { Game } from "../src/types.ts";
import { parseHistoryDetailId } from "../src/utils.ts";

async function exportType(
  { statInkExporter, fileExporter, type, gameFetcher, filter }: {
    statInkExporter: StatInkExporter;
    fileExporter: FileExporter;
    gameFetcher: GameFetcher;
    type: Game["type"];
    filter?: (game: Game) => boolean;
  },
) {
  const gameList = await fileExporter.exportedGames({ uid, type, filter });

  const workQueue = [
    ...await statInkExporter.notExported({
      type,
      list: gameList.map((i) => i.id),
    }),
  ]
    .reverse().map((id) => gameList.find((i) => i.id === id)!);

  console.log(
    `Exporting ${workQueue.length} ${type} games` +
      (filter ? " (filtered)" : ""),
  );

  let exported = 0;
  for (const { getContent } of workQueue) {
    const detail = await getContent();
    let resultUrl: string | undefined;
    try {
      const result = await statInkExporter.exportGame(detail);
      resultUrl = result.status === "success" ? result.url : undefined;
    } catch (e) {
      console.log("Failed to export game", e);
      // try to re-export using cached data
      const cachedDetail =
        (await gameFetcher.fetch(type, detail.detail.id)).detail;
      const { detail: _, ...rest } = detail;
      // @ts-ignore the type must be the same
      const { url } = await statInkExporter.exportGame({
        ...rest,
        detail: cachedDetail,
      });
      resultUrl = url;
    }
    exported += 1;
    if (resultUrl) {
      console.log(`Exported ${resultUrl} (${exported}/${workQueue.length})`);
    }
  }
}

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["profilePath", "type"],
    alias: {
      "help": "h",
      "profilePath": ["p", "profile-path"],
    },
  });

  return parsed;
};

const opts = parseArgs(Deno.args);
if (opts.help) {
  console.log(
    `Usage: deno run -A ${Deno.mainModule} [options]
  
  Options:
      --type                       Type of game to export. Can be vs, tri-color, coop, or all. (default: coop)
      --profile-path <path>, -p    Path to config file (default: ./profile.json)
      --help                       Show this help message and exit`,
  );
  Deno.exit(0);
}

const env = DEFAULT_ENV;
const stateBackend = new FileStateBackend(opts.profilePath ?? "./profile.json");
const profile = new Profile({ stateBackend, env });
await profile.readState();

// for cache
const gameFetcher = new GameFetcher({
  cache: new FileCache(profile.state.cacheDir),
  state: profile.state,
});

if (!profile.state.loginState?.sessionToken) {
  const sessionToken = await loginManually(env);

  await profile.writeState({
    ...profile.state,
    loginState: {
      ...profile.state.loginState,
      sessionToken,
    },
  });
}

const splatnet = new Splatnet3({ profile, env });

console.log("Fetching uid...");
const { latestBattleHistories: { historyGroups } } = await splatnet
  .getLatestBattleHistoriesQuery();

const id = historyGroups.nodes?.[0].historyDetails.nodes?.[0].id;

if (!id) {
  console.log("No battle history found");
  Deno.exit(0);
}

const { uid } = parseHistoryDetailId(id);

const fileExporter = new FileExporter(profile.state.fileExportPath);
const statInkExporter = new StatInkExporter({
  statInkApiKey: profile.state.statInkApiKey!,
  uploadMode: "Manual",
  env,
});
const type = (opts.type ?? "coop").replace("all", "vs,coop,tri-color");

if (type.includes("tri-color")) {
  [
    await exportType({
      type: "VsInfo",
      fileExporter,
      statInkExporter,
      gameFetcher,
      filter: (game) => {
        if (game.type === "CoopInfo") {
          return false;
        }
        return game.detail.vsRule.rule === "TRI_COLOR";
      },
    }),
  ];
}

if (type.includes("vs")) {
  await exportType({
    type: "VsInfo",
    fileExporter,
    statInkExporter,
    gameFetcher,
  });
}

if (type.includes("coop")) {
  await exportType({
    type: "CoopInfo",
    fileExporter,
    statInkExporter,
    gameFetcher,
  });
}
