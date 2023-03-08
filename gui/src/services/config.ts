import { fs } from "@tauri-apps/api"
import { appConfigDir, join } from '@tauri-apps/api/path'
import { State } from '../../../src/state';

const configFile = appConfigDir().then(c => join(c, 'config.json'));
const profileDir = appConfigDir().then(c => join(c, 'profile'));

export type Profile = {
  state: State,
}

export type Config = {
}

// TODO: import from state.ts.
const DEFAULT_STATE: State = {
  cacheDir: "./cache",
  fGen: "https://api.imink.app/f",
  fileExportPath: "./export",
  monitorInterval: 500,
};

const defaultProfile: Profile = {
  state: DEFAULT_STATE,
}

const defaultConfig: Config = {
}

export async function initFiles() {
  await fs.createDir(await profileDir, { recursive: true });
  await configFile;
}
initFiles().catch(console.error);

export async function getConfig(): Promise<Config> {
  try {
    const config = await fs.readTextFile(await configFile);
    return JSON.parse(config);
  } catch (e) {
    return defaultConfig;
  }
}

export async function setConfig(config: Config) {
  await fs.writeTextFile(await configFile, JSON.stringify(config));
}

export async function getProfile(index: number): Promise<Profile> {
  try {
    const profile = await fs.readTextFile(await profileDir.then(c => join(c, `${index}.json`)));
    return JSON.parse(profile);
  } catch (e) {
    return defaultProfile;
  }
}

export async function setProfile(index: number, profile: Profile) {
  await fs.writeTextFile(await profileDir.then(c => join(c, `${index}.json`)), JSON.stringify(profile));
}

export function canExport(profile: Profile): boolean {
  return !!(profile.state.loginState?.sessionToken && profile.state.statInkApiKey)
}
