/**
 * If rankState in profile.json is not defined, it will be initialized.
 */
import { flags } from "./deps.ts";
import { Splatnet3 } from "./src/splatnet3.ts";
import { gameId } from "./src/utils.ts";
import { FileStateBackend, Profile } from "./src/state.ts";
import { BattleListType } from "./src/types.ts";
import { RANK_PARAMS } from "./src/RankTracker.ts";
import { DEFAULT_ENV } from "./src/env.ts";

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["profilePath"],
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
      --profile-path <path>, -p    Path to config file (default: ./profile.json)
      --help                       Show this help message and exit`,
  );
  Deno.exit(0);
}

const env = DEFAULT_ENV;
const stateBackend = new FileStateBackend(opts.profilePath ?? "./profile.json");
const profile = new Profile({ stateBackend, env });
await profile.readState();

if (profile.state.rankState) {
  console.log("rankState is already initialized.");
  Deno.exit(0);
}

const splatnet = new Splatnet3({ profile, env });

const battleList = await splatnet.getBattleList(BattleListType.Bankara);
if (battleList.length === 0) {
  console.log("No anarchy battle found. Did you play anarchy?");
  Deno.exit(0);
}
const { vsHistoryDetail: detail } = await splatnet.getBattleDetail(
  battleList[0],
);

console.log(
  `Your latest anarchy battle is played at ${
    new Date(detail.playedTime).toLocaleString()
  }. Please enter your rank after this battle(format: RANK,POINT. S+0,300):`,
);

while (true) {
  const userInput = await env.readline();
  const [rank, point] = userInput.split(",");
  const pointNumber = parseInt(point);

  if (!RANK_PARAMS.find((i) => i.rank === rank)) {
    console.log("Invalid rank. Please enter again:");
  } else if (isNaN(pointNumber)) {
    console.log("Invalid point. Please enter again:");
  } else {
    profile.writeState({
      ...profile.state,
      rankState: {
        gameId: await gameId(detail.id),
        rank,
        rankPoint: pointNumber,
      },
    });

    break;
  }
}

console.log("rankState is initialized.");
