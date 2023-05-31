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

function replaceEnum(
  content: string,
  name: string,
  pairs: Record<string, string>,
): string {
  const regex = new RegExp(`export enum ${name} {([\\s\\S^}]+?)}`);

  const body = Object.entries(pairs).map(([key, value]) =>
    `  ${key} = "${value}"`
  ).join(",\n");

  return content.replace(regex, `export enum ${name} {\n${body}\n}`);
}

function getEnumKeys(content: string, name: string): string[] {
  const regex = new RegExp(`export enum ${name} {([\\s\\S^}]+?)}`);

  const match = regex.exec(content);

  if (!match) {
    throw new Error(`Cannot find ${name}`);
  }

  const body = match[1];

  // extract keys from `key = "value"`
  const keys: string[] = [];
  const keyRE = /\s*(\w+)\s*=/g;
  while (true) {
    const match = keyRE.exec(body);
    if (!match) {
      break;
    }
    keys.push(match[1]);
  }

  return keys;
}

function getQueryHash(js: string, query: string): string {
  const regex = new RegExp(
    `params:\\{id:"([^"]*?)",metadata:{},name:"${query}"`,
  );

  const match = regex.exec(js);

  if (!match) {
    throw new Error(`Cannot find ${query}`);
  }
  if (match[0].length > 500) {
    throw new Error(`Match too large ${match[0].length}`);
  }

  return match[1];
}

async function printError<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

async function getMainJSBody(): Promise<string> {
  const splatnet3Home = await (await fetch(SPLATNET3_URL)).text();

  const mainJS = /src="(\/.*?\.js)"/.exec(splatnet3Home)?.[1];

  if (!mainJS) {
    throw new Error("No main.js found");
  }

  const mainJSBody = await (await fetch(SPLATNET3_URL + mainJS)).text();

  return mainJSBody;
}

const mainJSBody = await getMainJSBody();

// deno-lint-ignore require-await
async function getWebViewVer(js: string): Promise<string> {
  const revision = /"([0-9a-f]{40})"/.exec(js)?.[1];
  const version = /revision_info_not_set.*?=("|`)(\d+\.\d+\.\d+)-/.exec(
    js,
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

  return ver.trim();
}

let content = await Deno.readTextFile(CONSTANT_PATH);
const oldValues = {
  WEB_VIEW_VERSION: getConst(content, "WEB_VIEW_VERSION"),
  NSOAPP_VERSION: getConst(content, "NSOAPP_VERSION"),
};
const newValues: Record<string, string | undefined> = {};

newValues.WEB_VIEW_VERSION = await printError(getWebViewVer(mainJSBody));
newValues.NSOAPP_VERSION = await printError(getNSOVer());

for (const [key, value] of Object.entries(newValues)) {
  if (value) {
    content = replaceConst(content, key, value);
  }
}

console.log("const updated");
console.log("Old:", oldValues);
console.log("New:", newValues);

const keys = getEnumKeys(content, "Queries");
const pairs = Object.fromEntries(
  keys.map((key) => [key, getQueryHash(mainJSBody, key)]),
);
content = replaceEnum(content, "Queries", pairs);
console.log("query updated");

await Deno.writeTextFile(CONSTANT_PATH, content);

const command = new Deno.Command(Deno.execPath(), {
  args: ["fmt", "./src/constant.ts"],
  cwd: ROOT_DIR,
  stdin: "inherit",
  stdout: "inherit",
});
const { code } = command.outputSync();
if (code !== 0) {
  Deno.exit(code);
}
