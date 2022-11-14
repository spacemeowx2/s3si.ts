/**
 * Export your gear database to json format used in:
 * https://leanny.github.io/splat3seedchecker/#/settings
 *
 * This script get token from `./profile.json`. And export geardata
 * to `./geardata_${timestamp}.json`.
 * Make sure to update token before running this script.
 */

import Murmurhash3 from "https://deno.land/x/murmurhash@v1.0.0/mod.ts";
import { base64 } from "../deps.ts";
import { getGears, getLatestBattleHistoriesQuery } from "../src/splatnet3.ts";
import { FileStateBackend } from "../src/state.ts";
import { parseHistoryDetailId } from "../src/utils.ts";

function encryptKey(uid: string) {
  const hasher = new Murmurhash3();
  hasher.hash(uid);
  const hash = hasher.result();
  const key = hash & 0xff;
  const encrypted = base64.encode(
    new TextEncoder().encode(uid).map((i) => i ^ key),
  );
  return {
    key: encrypted,
    h: hash,
  };
}

const state = await new FileStateBackend("./profile.json").read();

console.log("Fetching uid...");
const { latestBattleHistories: { historyGroups } } =
  await getLatestBattleHistoriesQuery(state);

const id = historyGroups.nodes?.[0].historyDetails.nodes?.[0].id;

if (!id) {
  console.log("No battle history found");
  Deno.exit(0);
}

const { uid } = parseHistoryDetailId(id);

console.log("Fetching gears...");
const data = await getGears(state);
const timestamp = Math.floor(new Date().getTime() / 1000);

await Deno.writeTextFile(
  `./geardata_${timestamp}.json`,
  JSON.stringify({
    ...encryptKey(uid),
    timestamp,
    gear: {
      data,
    },
  }),
);

console.log("Done");
