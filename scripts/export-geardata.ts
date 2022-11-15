/**
 * Export your gear database to json format used in:
 * https://leanny.github.io/splat3seedchecker/#/settings
 *
 * This script get token from `./profile.json` or login interactively.
 * And export geardata to `./geardata_${timestamp}.json`.
 */

import Murmurhash3 from "https://deno.land/x/murmurhash@v1.0.0/mod.ts";
import { base64 } from "../deps.ts";
import { getBulletToken, getGToken, loginManually } from "../src/iksm.ts";
import { getGears, getLatestBattleHistoriesQuery } from "../src/splatnet3.ts";
import { DEFAULT_STATE, FileStateBackend, State } from "../src/state.ts";
import { parseHistoryDetailId } from "../src/utils.ts";

const PROFILE_PATH = "./profile.json";

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

// https://stackoverflow.com/questions/56658114/how-can-one-check-if-a-file-or-directory-exists-using-deno
const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

let state: State;

if (await exists(PROFILE_PATH)) {
  state = await new FileStateBackend(PROFILE_PATH).read();
} else {
  const sessionToken = await loginManually();

  const { webServiceToken, userCountry, userLang } = await getGToken({
    fApi: DEFAULT_STATE.fGen,
    sessionToken,
  });

  const bulletToken = await getBulletToken({
    webServiceToken,
    userLang,
    userCountry,
  });

  state = {
    ...DEFAULT_STATE,
    loginState: {
      sessionToken,
      gToken: webServiceToken,
      bulletToken,
    },
  };
}

const [latest, gears] = [getLatestBattleHistoriesQuery(state), getGears(state)];

console.log("Fetching uid...");
const { latestBattleHistories: { historyGroups } } = await latest;

const id = historyGroups.nodes?.[0].historyDetails.nodes?.[0].id;

if (!id) {
  console.log("No battle history found");
  Deno.exit(0);
}

const { uid } = parseHistoryDetailId(id);

console.log("Fetching gears...");
const data = await gears;
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
