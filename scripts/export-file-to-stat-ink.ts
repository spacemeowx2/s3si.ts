/**
 * Upload file exporter battles to stat.ink.
 * Make sure you have already logged in.
 */
import { flags } from "../deps.ts";
import { DEFAULT_ENV } from "../src/env.ts";
import { FileExporter } from "../src/exporters/file.ts";
import { StatInkExporter } from "../src/exporters/stat.ink.ts";
import { loginManually } from "../src/iksm.ts";
import { Splatnet3 } from "../src/splatnet3.ts";
import { FileStateBackend, Profile } from "../src/state.ts";
import { Game } from "../src/types.ts";
import { parseHistoryDetailId } from "../src/utils.ts";

async function exportType(
  { statInkExporter, fileExporter, type }: {
    statInkExporter: StatInkExporter;
    fileExporter: FileExporter;
    type: Game["type"];
  },
) {
  const gameList = await fileExporter.exportedGames({ uid, type });

  const workQueue = [
    ...await statInkExporter.notExported({
      type,
      list: gameList.map((i) => i.id),
    }),
  ]
    .reverse().map((id) => gameList.find((i) => i.id === id)!);

  console.log(`Exporting ${workQueue.length} ${type} games`);

  let exported = 0;
  for (const { getContent } of workQueue) {
    const detail = await getContent();
    const { url } = await statInkExporter.exportGame(detail);
    exported += 1;
    if (url) {
      console.log(`Exported ${url} (${exported}/${workQueue.length})`);
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
      --type                       Type of game to export. Can be vs, coop, or all. (default: coop)
      --profile-path <path>, -p    Path to config file (default: ./profile.json)
      --help                       Show this help message and exit`,
  );
  Deno.exit(0);
}

const env = DEFAULT_ENV;
const stateBackend = new FileStateBackend(opts.profilePath ?? "./profile.json");
const profile = new Profile({ stateBackend, env });
await profile.readState();

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
const type = (opts.type ?? "coop").replace("all", "vs,coop");

if (type.includes("vs")) {
  await exportType({ type: "VsInfo", fileExporter, statInkExporter });
}

if (type.includes("coop")) {
  await exportType({ type: "CoopInfo", fileExporter, statInkExporter });
}
