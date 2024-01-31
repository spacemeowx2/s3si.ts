/**
 * Export your gear database to json format used in:
 * https://leanny.github.io/splat3seedchecker/#/settings
 *
 * This script get token from `./profile.json` or login interactively.
 * And export geardata to `./geardata_${timestamp}.json`.
 */

import Murmurhash3 from "https://deno.land/x/murmurhash@v1.0.0/mod.ts";
import { base64, flags } from "../deps.ts";
import { DEFAULT_ENV } from "../src/env.ts";
import { loginManually } from "../src/iksm.ts";
import { Splatnet3 } from "../src/splatnet3.ts";
import {
  FileStateBackend,
  InMemoryStateBackend,
  Profile,
} from "../src/state.ts";
import { parseHistoryDetailId } from "../src/utils.ts";

function encryptKey(uid: string) {
  const hasher = new Murmurhash3();
  hasher.hash(uid);
  const hash = hasher.result();
  const key = hash & 0xff;
  const encrypted = base64.encodeBase64(
    new TextEncoder().encode(uid).map((i) => i ^ key),
  );
  return {
    key: encrypted,
    h: hash,
  };
}

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
      --profile-path <path>, -p    Path to config file (default: null, login token will be dropped)
      --help                       Show this help message and exit`,
  );
  Deno.exit(0);
}

const env = DEFAULT_ENV;
const stateBackend = opts.profilePath
  ? new FileStateBackend(opts.profilePath)
  : new InMemoryStateBackend();
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

console.log("Fetching gears...");
const data = await splatnet.getGears();
const timestamp = Math.floor(new Date().getTime() / 1000);
const filename = `./geardata_${timestamp}.json`;

await Deno.writeTextFile(
  filename,
  JSON.stringify({
    ...encryptKey(uid),
    timestamp,
    gear: {
      data,
    },
  }),
);

console.log(`Write file: ${filename}`);
