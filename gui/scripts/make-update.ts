import { Octokit } from "npm:@octokit/rest@19.0.7";

const TAG_PREFIX = "gui-";

type Platform =
  | "darwin-x86_64"
  | "darwin-aarch64"
  | "linux-x86_64"
  | "windows-x86_64";
const PLATFORMS: Platform[] = [
  "darwin-x86_64",
  "darwin-aarch64",
  "linux-x86_64",
  "windows-x86_64",
];

const PlatformSuffix: Record<Platform, string> = {
  "darwin-x86_64": ".app.tar.gz",
  "darwin-aarch64": ".app.tar.gz",
  "linux-x86_64": ".AppImage.tar.gz",
  "windows-x86_64": ".msi.zip",
};

type File = {
  signature: string;
  url: string;
};

type UpdateJson = {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<Platform, File>;
};

const REPO = {
  owner: "spacemeowx2",
  repo: "s3si.ts",
};

const octokit = new Octokit({
  auth: Deno.env.get("GITHUB_TOKEN"),
});

async function findFirstGuiRelease() {
  let page = 1;
  while (true) {
    const { data: list } = await octokit.repos.listReleases({
      ...REPO,
      page,
    });

    if (list.length === 0) {
      return undefined;
    }

    for (const release of list) {
      if (release.tag_name.startsWith(TAG_PREFIX)) {
        return release;
      }
    }

    page += 1;
  }
}

const release = await findFirstGuiRelease();

const version = release?.tag_name.slice(TAG_PREFIX.length) ?? "unknown";
const notes = release?.body ?? "unknown";
const pub_date = release?.published_at ?? "unknown";

async function makePlatforms(r: typeof release) {
  const assets = r?.assets ?? [];
  const platforms = Object.fromEntries(PLATFORMS.map((p) => {
    const asset = assets.find((i) => i.name.endsWith(PlatformSuffix[p]));

    if (!asset) {
      throw new Error(`Asset not found for ${p}`);
    }

    return [p, {
      signature: asset.browser_download_url + ".sig",
      url: asset.browser_download_url,
    }];
  })) as Record<Platform, File>;

  return platforms;
}

const updateJson: UpdateJson = {
  version,
  notes,
  pub_date,
  platforms: await makePlatforms(release),
};

// fetch signatures
for (const platform of PLATFORMS) {
  const file = updateJson.platforms[platform];
  const res = await fetch(file.signature);
  file.signature = await res.text();
}

console.log(JSON.stringify(updateJson, null, 2));
