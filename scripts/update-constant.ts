/**
 * This script tries to update constant automatically
 */
import { path } from "../deps.ts";

const ROOT_DIR = path.resolve(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "..",
);
const CONSTANT_PATH = path.join(ROOT_DIR, "./src/constant.ts");
const STORE_URL =
  "https://apps.apple.com/us/app/nintendo-switch-online/id1234806557";
const SPLATNET3_URL = "https://api.lp1.av5ja.srv.nintendo.net";

function replaceConst(content: string, name: string, value: string): string {
  const regex = new RegExp(`export const ${name} = ".*?";\n`);

  return content.replace(regex, `export const ${name} = "${value}";\n`);
}

function getConst(content: string, name: string): string {
  const regex = new RegExp(`export const ${name} = (".*?");\n`);

  const match = regex.exec(content);

  if (!match) {
    throw new Error(`Cannot find ${name}`);
  }

  return JSON.parse(match[1]);
}

async function printError<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

async function getWebViewVer(): Promise<string> {
  const splatnet3Home = await (await fetch(SPLATNET3_URL)).text();

  const mainJS = /src="(\/.*?\.js)"/.exec(splatnet3Home)?.[1];

  if (!mainJS) {
    throw new Error("No main.js found");
  }

  const mainJSBody = await (await fetch(SPLATNET3_URL + mainJS)).text();

  const revision = /"([0-9a-f]{40})"/.exec(mainJSBody)?.[1];
  const version = /revision_info_not_set.*?=("|`)(\d+\.\d+\.\d+)-/.exec(
    mainJSBody,
  )
    ?.[2];

  if (!version || !revision) {
    throw new Error("No version and revision found");
  }

  const ver = `${version}-${revision.substring(0, 8)}`;

  return ver;
}

async function getNSOVer(): Promise<string> {
  const main = await (await fetch(STORE_URL)).text();
  const ver = />Version (.*?)</.exec(main)?.[1];

  if (!ver) {
    throw new Error("No version found");
  }

  return ver;
}

let content = await Deno.readTextFile(CONSTANT_PATH);
const oldValues = {
  WEB_VIEW_VERSION: getConst(content, "WEB_VIEW_VERSION"),
  NSOAPP_VERSION: getConst(content, "NSOAPP_VERSION"),
};
const newValues: Record<string, string | undefined> = {};

newValues.WEB_VIEW_VERSION = await printError(getWebViewVer());
newValues.NSOAPP_VERSION = await printError(getNSOVer());

for (const [key, value] of Object.entries(newValues)) {
  if (value) {
    content = replaceConst(content, key, value);
  }
}
await Deno.writeTextFile(CONSTANT_PATH, content);

console.log("Done");
console.log("Old:", oldValues);
console.log("New:", newValues);
