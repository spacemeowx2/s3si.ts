# s3si.ts

[![Build status](https://github.com/spacemeowx2/s3si.ts/workflows/Build/badge.svg)](https://github.com/spacemeowx2/s3si.ts/actions/workflows/ci.yaml)
[![Constant check status](https://github.com/spacemeowx2/s3si.ts/workflows/Constant%20Check/badge.svg)](https://github.com/spacemeowx2/s3si.ts/actions/workflows/constant-check.yaml)

Export your battles from SplatNet to stat.ink.

If you have used s3s, please see [here](#migrate-from-s3s).

## Usage

1. Install [deno](https://deno.land/)

2. Run
   `deno run -Ar https://raw.githubusercontent.com/spacemeowx2/s3si.ts/main/s3si.ts [options]`

```
Options:
    --profile-path <path>, -p    Path to config file (default: ./profile.json)
    --exporter <exporter>, -e    Exporter list to use (default: stat.ink)
                                 Multiple exporters can be separated by commas
                                 (e.g. "stat.ink,file")
    --list-method                When set to "latest", the latest 50 matches will be obtained.
                                 When set to "all", matches of all modes will be obtained with a maximum of 250 matches (5 modes x 50 matches).
                                 When set to "auto", the latest 50 matches will be obtained. If 50 matches have not been uploaded yet, matches will be obtained from the list of all modes.
                                 "auto" is the default setting.
    --no-progress, -n            Disable progress bar
    --monitor, -m                Monitor mode
    --skip-mode <mode>, -s       Skip mode (default: null)
                                 ("vs", "coop")
    --with-summary               Include summary in the output
    --help                       Show this help message and exit
```

3. If it's your first time running this, follow the instructions to login to
   Nintendo Account. Your token will be saved to `profile.json` for future use.

- If you want to use a different profile, use `-p` to specify the path to the
  profile file.

### Track your rank

- Run
  `deno run -Ar https://raw.githubusercontent.com/spacemeowx2/s3si.ts/main/initRank.ts`
  to initialize your rank data. (You can also use `-p` to specify the path to
  the profile file.)

- Then enter your current rank and rank point. For example: `S+0,300`. And the
  rank will be saved in the `profile.json`.

- After that, run `s3si.ts`, the rank point will be reported to `stat.ink`.

### profile.json

```js
{
  // cacheDir is the directory to store cache files
  "cacheDir": "./cache",
  // don't change this if you don't know what it is
  "fGen": "https://api.imink.app/f",
  // if you run with -e file, this is the directory to store exported files
  "fileExportPath": "./export",
  // the interval to check for new battles in monitor mode
  "monitorInterval": 500,
  // login token
  "loginState": {
    "sessionToken": "...",
    "gToken": "...",
    "bulletToken": "..."
  },
  // userLang will effect the language of the exported games to stat.ink
  "userLang": "zh-CN",
  "userCountry": "JP",
  "statInkApiKey": "..."
}
```

## Migrate from s3s

If you have used `s3s` before, you can migrate your data to `s3si.ts` by
creating a `profile.json` file with the following contents:

```json
{
  "loginState": {
    "sessionToken": "<session_token in your s3s' config.txt>"
  },
  "statInkApiKey": "<your stat.ink API key>"
}
```

Then run `s3si.ts`, and it will work without login prompt.

## Credits

- https://github.com/frozenpandaman/s3s
- https://github.com/fetus-hina/stat.ink
