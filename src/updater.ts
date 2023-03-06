import { Aria2 } from "./aria2";
import { Github } from "./github";
import { gt } from "semver";
import { CURRENT_YAAGL_VERSION } from "./constants";
import { forceMove, log, resolve } from "./utils";
import { CommonUpdateProgram } from "./common-update-ui";

const owner = "3shain";
const repo = "yet-another-anime-game-launcher";

export interface GithubReleaseInfo {
  url: string;
  html_url: string;
  assets_url: string;
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  author: {};
  assets: GithubReleaseAssetsInfo[];
}

export interface GithubReleaseAssetsInfo {
  url: string;
  browser_download_url: string;
  id: number;
  name: string;
  content_type: string;
}

export async function createUpdater(deps: { github: Github; aria2: Aria2 }) {
  if (CURRENT_YAAGL_VERSION === "development") {
    return {
      latest: true,
    } as const;
  }
  const latest: GithubReleaseInfo = await deps.github.api(
    `/repos/${owner}/${repo}/releases/latest`
  );
  const neu = latest.assets.find((x) => x.name == "resources.neu");
  if (gt(latest.tag_name, CURRENT_YAAGL_VERSION) && neu !== undefined) {
    return {
      latest: false,
      downloadUrl: neu.browser_download_url,
    } as const;
  }
  return {
    latest: true,
  } as const;
}

export type Updater = ReturnType<typeof createUpdater> extends Promise<infer T>
  ? T
  : never;

export async function* downloadProgram(
  aria2: Aria2,
  url: string
): CommonUpdateProgram {
  yield ["setStateText", "DOWNLOADING_FILE"];
  for await (const progress of aria2.doStreamingDownload({
    uri: url,
    absDst: await resolve("./resources.neu.update"),
  })) {
    yield [
      "setProgress",
      Number((progress.completedLength * BigInt(100)) / progress.totalLength),
    ];
  }
  yield ["setUndeterminedProgress"];
  await forceMove("./resources.neu.update", "./resources.neu");
}
