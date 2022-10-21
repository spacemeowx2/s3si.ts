# s3si.ts

Export your battles from SplatNet to stat.ink

## Usage

1. Install [deno](https://deno.land/)

2. Run
   `deno run -Ar https://raw.githubusercontent.com/spacemeowx2/s3si.ts/main/s3si.ts`

```
Options:
    --profile-path <path>, -p    Path to config file (default: ./profile.json)
    --exporter <exporter>, -e    Exporter list to use (default: stat.ink)
                                 Multiple exporters can be separated by commas
                                 (e.g. "stat.ink,file")
    --no-progress, -n            Disable progress bar
    --help                       Show this help message and exit
```

## Credits

- https://github.com/frozenpandaman/s3s
