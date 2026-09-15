# s3si.ts

[![Build status](https://github.com/spacemeowx2/s3si.ts/workflows/Build/badge.svg)](https://github.com/spacemeowx2/s3si.ts/actions/workflows/ci.yaml)

Export your battles from SplatNet to stat.ink and Splashcat.

If you have used s3s, please see [here](#migrate-from-s3s).

## Usage

1. Install [Deno 2](https://docs.deno.com/runtime/)

2. Run
   `deno run -Ar https://raw.githubusercontent.com/spacemeowx2/s3si.ts/main/s3si.ts [options]`

```
Options:
    --profile-path <path>, -p    Path to config file (default: ./profile.json)
    --exporter <exporter>, -e    Exporter list to use (default: stat.ink)
                                 Multiple exporters can be separated by commas
                                 (e.g. "stat.ink,file,splashcat")
    --list-method                When set to "latest", the latest 50 matches will be obtained.
                                 When set to "all", matches of all modes will be obtained with a maximum of 250 matches (5 modes x 50 matches).
                                 When set to "auto", the latest 50 matches will be obtained. If 50 matches have not been uploaded yet, matches will be obtained from the list of all modes.
                                 "auto" is the default setting.
    --no-progress, -n            Disable progress bar
    --monitor, -m                Monitor mode
    --skip-mode <mode>, -s       Skip mode (default: none)
                                 Multiple modes to skip can be separated by commas
                                 (e.g. "vs,coop,sideorder")
    --with-summary               Include summary in the output
    --login-only                 Verify SplatNet 3 access without exporting
    --help                       Show this help message and exit
    --nxapi-presence             Extends monitoring mode to use Nintendo Switch presence from nxapi
```

3. Set up [authentication](#authentication). Tokens are saved to `profile.json`
   for future use.

- If you want to use a different profile, use `-p` to specify the path to the
  profile file.

### Authentication

s3si.ts now uses the Nintendo Switch app 3.5.0 encrypted login protocol through
[nxapi](https://github.com/samuelthomas2774/nxapi). It runs directly in Deno;
Node.js, the nxapi CLI, Python and an emulator are not required for this flow.
The obsolete `fGen` setting is ignored, including existing imink configurations.

The project includes its registered public nxapi Client ID. No individual
registration or client secret is needed. On first use, s3si.ts explains the data
sent to nxapi and asks for confirmation before starting Nintendo login. This
choice is saved as `nxapiConsent` in your profile; remove that field to ask
again.

Fork maintainers can register their own public client at
[nxapi-auth](https://nxapi-auth.fancy.org.uk/oauth/clients), complete its client
information, enable `ca:gf ca:er ca:dr`, and set `nxapiClientId` in the profile.
See the
[authentication documentation](https://github.com/samuelthomas2774/nxapi-znca-api/blob/docs/docs/api-auth.md).

Then use the usual Nintendo browser login: open the printed URL, sign in, copy
the link behind **Select this account**, and paste it into s3si.ts. Existing
`sessionToken` values are reused. To verify SplatNet 3 access without exporting
any battles, run (valid tokens are reused; expired tokens are refreshed):

```sh
deno run -A s3si.ts --login-only
# Add --profile-path /path/to/profile.json to use another profile.
```

To export locally instead of uploading, run:

```sh
deno run -A s3si.ts --exporter file --no-progress
```

Each record is saved as JSON in `fileExportPath` (`./export` by default).
Existing record files are skipped on subsequent runs.

nxapi receives the Nintendo Account ID and short-lived Nintendo/Coral tokens,
plus encrypted Nintendo responses, to generate and encrypt requests and decrypt
responses. Your Nintendo password and long-lived session token are not sent to
nxapi. Its service token stays in memory for one account's login attempt. Keep
your profile private because it stores Nintendo login credentials.

This flow depends on the public service's supported app version and available
workers. Check [service status](https://nxapi-status.fancy.org.uk/) during
outages. The supported app version and encryption compatibility identifier must
be updated together; changing an `f` URL or version number alone is
insufficient. Failed refreshes do not replace the saved game/bullet token pair.
A rejected nxapi service token is renewed once; rate limits and service outages
are reported without repeated login attempts.

**Optional external tokens:** a current compatible
[nxapi build](https://github.com/samuelthomas2774/nxapi) can write an s3si.ts
profile using `nxapi util update-s3si-token ./tokens.json`. Alternatively,
[STU (splatnet3-token-util)](https://github.com/strohitv/splatnet3-token-util)
extracts tokens from an Android emulator snapshot and writes s3s `config.txt`.
These tools have their own setup requirements. Point `tokenFile` at that output:

```json
{
  "tokenFile": "/absolute/path/to/tokens.json"
}
```

With `tokenFile`, no `nxapiClientId` or `sessionToken` is required. A profile
with an existing `gToken`/`bulletToken` pair also works until those tokens
expire. Relative file paths are resolved from the working directory. Keep the
token file on the same Nintendo Account as the profile. Only tokens and locale
are imported; exporter settings and an explicit `userLang` are preserved.
Invalid or partially written files are rejected. s3si.ts rereads the file when
tokens are missing or rejected and retries once; rerun the external tool when
its tokens expire.

### Splashcat Notes

Due to limitations with SplatNet 3 data, Splashcat requires battles uploaded to
use `en-US` (set with `userLang`). Splashcat will localize most parts of battle
results into the user's language when displayed.

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
  // optional: override the project's public nxapi-auth client ID
  "nxapiClientId": "erdX8zpYJYNSP02ZJisdQQ",
  // optional: credentials generated by nxapi or STU
  // "tokenFile": "/absolute/path/to/tokens.json",
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
  "statInkApiKey": "...",
  "splashcatApiKey": "..."
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

A valid `session_token` can be reused by the new nxapi login flow. On first use,
confirm the [authentication](#authentication) notice; no browser sign-in is
needed while that session token remains valid. If it has expired, remove the old
`loginState` and sign in again. Alternatively, use `tokenFile` with current
s3s/STU game and bullet tokens.

## Library migration: 0.5.x to 0.6.0

Version 0.6.0 changes the authentication API and behavior for library and
JSON-RPC consumers:

| Previous behavior                                                    | Required migration                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getGToken({ fApi, sessionToken, env })`                             | Use `getGToken({ nxapiClientId, sessionToken, env })`. Pass a registered public Client ID; the project default is `DEFAULT_STATE.nxapiClientId` from `src/state.ts`. The return fields are unchanged.                                                                                                                             |
| `State.fGen` in `src/state.ts` or `src/jsonrpc/types.ts`             | Remove this field from typed configuration. Old JSON files may still contain it, but it has no effect. Custom legacy f endpoints are no longer supported.                                                                                                                                                                         |
| Authentication without a third-party confirmation prompt             | Before Nintendo sign-in, disclose the nxapi data transfer described above and obtain explicit consent. CLI-style integrations can use `ensureNxapiConsent(profile, env)` with their `Env.prompts.prompt` implementation. Frontends that collect consent themselves must persist `nxapiConsent: true` only after the user accepts. |
| JSON-RPC login with only a session token                             | The daemon cannot display prompts. Show the disclosure before calling `loginSteps`, then include the accepted `nxapiConsent` in the state passed to `ensureTokenValid` or `run`.                                                                                                                                                  |
| A custom Fetcher that assumes JSON request and response bodies       | Forward binary `Uint8Array` bodies unchanged, return a `Response` supporting `arrayBuffer()`, and handle JSON returned with `text/plain`. Forward the optional `signal` to preserve authentication timeouts.                                                                                                                      |
| Authentication failures exposing `APIError.json`                     | Token exchange/encryption/validation failures now throw plain `Error` without raw response payloads. Catch `Error`; do not depend on authentication response bodies or exact error messages.                                                                                                                                      |
| `checkToken()` returning `false` immediately when tokens are missing | With a session token or `tokenFile`, it can now refresh missing tokens and persist them. Native refresh can require the consent prompt.                                                                                                                                                                                           |

`loginSteps` and `loginManually` remain available with the same signatures. The
callback passed to them must use `npf71b963c1b7b6d119://auth`. These low-level
functions, and direct calls to `getGToken`, do not collect nxapi consent on
behalf of an embedding application; the caller must do so before sign-in and
before contacting nxapi. Existing valid game/bullet token pairs can still be
used without immediate reauthentication. Their field names and the local export
JSON structure are unchanged; new exports report `s3siVersion: "0.6.0"`.

## Credits

- https://github.com/frozenpandaman/s3s
- https://github.com/fetus-hina/stat.ink
