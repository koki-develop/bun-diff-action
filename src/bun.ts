import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import type { GitHub } from "./github";

const _owner = "oven-sh";
const _repo = "bun";

export class BunInstaller {
  constructor(private readonly github: GitHub) {}

  async install(version: string): Promise<string> {
    const canonicalVersion = await this._getVersion(version);
    core.debug(`bun ${canonicalVersion} will be installed`);
    core.debug(`Platform: ${process.platform}`);
    core.debug(`Arch: ${process.arch}`);

    const cacheDir = tc.find("bun", canonicalVersion, process.arch);
    if (cacheDir) {
      core.debug(`Cached bun ${canonicalVersion} found`);
      core.addPath(cacheDir);
      return canonicalVersion;
    }

    const url = this._getDownloadUrl(canonicalVersion);
    core.debug(`Downloading from ${url}`);

    const path = await tc.downloadTool(url);
    core.debug(`Downloaded to ${path}`);

    const extractedPath = await tc.extractZip(path);
    core.debug(`Extracted to ${extractedPath}`);

    const binPath = await tc.cacheDir(extractedPath, "bun", canonicalVersion);
    core.debug(`Cached to ${binPath}`);

    core.addPath(binPath);

    return canonicalVersion;
  }

  private _getDownloadUrl(version: string): string {
    // https://github.com/oven-sh/bun/releases/download/bun-<VERSION>/bun-<PLATFORM>-<ARCH>.zip

    const platform = (() => {
      switch (process.platform) {
        case "darwin":
          return "darwin";
        case "linux":
          return "linux";
        case "win32":
          return "windows";
        default:
          return "linux";
      }
    })();

    const arch = (() => {
      switch (process.arch) {
        case "x64":
          return "x64";
        case "arm64":
          return "aarch64";
        default:
          return "x64";
      }
    })();

    return `https://github.com/${_owner}/${_repo}/releases/download/bun-${version}/bun-${platform}-${arch}.zip`;
  }

  private async _getVersion(version: string): Promise<string> {
    if (version === "latest") {
      const latestRelease = await this.github.fetchLatestRelease({
        owner: _owner,
        repo: _repo,
      });
      return latestRelease.tag_name.replace(/^bun-/, "");
    }

    if (!version.startsWith("v")) {
      return `v${version}`;
    }

    return version;
  }
}
