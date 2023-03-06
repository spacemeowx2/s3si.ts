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

const defaultConfig: Config = {
}

export async function initFiles() {
  await fs.createDir(await profileDir, { recursive: true });
  await configFile;
}
initFiles().catch(console.error);

export async function getConfig(): Promise<Config> {
  const config = await fs.readTextFile(await configFile);
  try {
    return JSON.parse(config);
  } catch (e) {
    return defaultConfig;
  }
}

export async function setConfig(config: Config) {
  await fs.writeTextFile(await configFile, JSON.stringify(config));
}
