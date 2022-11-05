/**
 * Generate gear name -> id map, saved it to `gear-map.json`
 *
 * This script get token from `./profile.json`, and replace `userLang` with each language to get the full map
 * Make sure to update token before running this script.
 */
import { getGearPower } from "../src/splatnet3.ts";
import { FileStateBackend } from "../src/state.ts";
import { StatInkAbility } from "../src/types.ts";

console.log("Getting keys from stat.ink");
const abilityResponse = await fetch("https://stat.ink/api/v3/ability");
const abilityKeys: StatInkAbility = await abilityResponse.json();

const state = await new FileStateBackend("./profile.json").read();
const LANGS = [
  "de-DE",
  "en-GB",
  "en-US",
  "es-ES",
  "es-MX",
  "fr-CA",
  "fr-FR",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "nl-NL",
  "ru-RU",
  "zh-CN",
  "zh-TW",
];

const langsResult: Record<
  string,
  Awaited<ReturnType<typeof getGearPower>>["gearPowers"]["nodes"]
> = {};
for (const lang of LANGS) {
  const langState = {
    ...state,
    userLang: lang,
  };
  console.log(`Getting ${lang}...`);
  langsResult[lang] = (await getGearPower(langState)).gearPowers.nodes;
}

const result: StatInkAbility = abilityKeys.map((i, idx) => ({
  ...i,
  name: Object.fromEntries(LANGS.map((l) => [l, langsResult[l][idx].name])),
}));

console.log("Writing to file...");

await Deno.writeTextFile("gear-map.json", JSON.stringify(result, null, 2));
