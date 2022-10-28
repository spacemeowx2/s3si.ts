/**
 * If rankState in profile.json is not defined, it will be initialized.
 */
import { flags } from "./deps.ts";
import { getBulletToken, getGToken } from "./src/iksm.ts";
import { checkToken, getBattleDetail, getBattleList } from "./src/splatnet3.ts";
import { gameId, readline } from "./src/utils.ts";
import { FileStateBackend } from "./src/state.ts";
import { BattleListType } from "./src/types.ts";
import { RANK_PARAMS } from "./src/RankTracker.ts";

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

const stateBackend = new FileStateBackend(opts.profilePath ?? "./profile.json");
let state = await stateBackend.read();

if (state.rankState) {
  console.log("rankState is already initialized.");
  Deno.exit(0);
}

if (!await checkToken(state)) {
  const sessionToken = state.loginState?.sessionToken;

  if (!sessionToken) {
    throw new Error("Session token is not set.");
  }

  const { webServiceToken, userCountry, userLang } = await getGToken({
    fApi: state.fGen,
    sessionToken,
  });

  const bulletToken = await getBulletToken({
    webServiceToken,
    userLang,
    userCountry,
    appUserAgent: state.appUserAgent,
  });

  state = {
    ...state,
    loginState: {
      ...state.loginState,
      gToken: webServiceToken,
      bulletToken,
    },
    userLang: state.userLang ?? userLang,
    userCountry: state.userCountry ?? userCountry,
  };
  await stateBackend.write(state);
}

const battleList = await getBattleList(state, BattleListType.Bankara);
if (battleList.length === 0) {
  console.log("No anarchy battle found. Did you play anarchy?");
  Deno.exit(0);
}
const { vsHistoryDetail: detail } = await getBattleDetail(state, battleList[0]);

console.log(
  `Your latest battle is played at ${
    new Date(detail.playedTime).toLocaleString()
  }. Please enter your rank after this battle(format: RANK,POINT. S+0,300):`,
);

while (true) {
  const userInput = await readline();
  const [rank, point] = userInput.split(",");
  const pointNumber = parseInt(point);

  if (!RANK_PARAMS.find((i) => i.rank === rank)) {
    console.log("Invalid rank. Please enter again:");
  } else if (isNaN(pointNumber)) {
    console.log("Invalid point. Please enter again:");
  } else {
    state = {
      ...state,
      rankState: {
        gameId: await gameId(detail.id),
        rank,
        rankPoint: pointNumber,
      },
    };

    break;
  }
}

await stateBackend.write(state);
console.log("rankState is initialized.");
