import { fs } from "@tauri-apps/api"
import { appConfigDir, join } from '@tauri-apps/api/path'

const configDir = appConfigDir().then(c => join(c, 'config.json'));

export const useConfig = () => {

}
