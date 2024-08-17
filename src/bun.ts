import * as path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import type { GitHub } from "./github";
import { sh } from "./sh";

const _owner = "oven-sh";
const _repo = "bun";

type OSInfo = {
  platform: string;
  arch: string;
};

export class BunInstaller {
  constructor(private readonly github: GitHub) {}

  async install(version: string): Promise<string> {
    const canonicalVersion = await this._getVersion(version);
    core.debug(`bun ${canonicalVersion} will be installed`);
    core.debug(`Platform: ${process.platform}`);
    core.debug(`Arch: ${process.arch}`);

    const os = this._getOSInfo();

    const cacheDir = tc.find("bun", canonicalVersion, process.arch);
    if (cacheDir) {
      core.debug(`Cached bun ${canonicalVersion} found`);
      core.addPath(path.join(cacheDir, `bun-${os.platform}-${os.arch}`));
      return canonicalVersion;
    }

    const url = this._getDownloadUrl(canonicalVersion);
    core.debug(`Downloading from ${url}`);

    const downloadedPath = await tc.downloadTool(url);
    core.debug(`Downloaded to ${downloadedPath}`);

    const extractedPath = await tc.extractZip(downloadedPath);
    core.debug(`Extracted to ${extractedPath}`);

    const binPath = await tc.cacheDir(extractedPath, "bun", canonicalVersion);
    core.debug(`Cached to ${binPath}`);

    core.addPath(path.join(binPath, `bun-${os.platform}-${os.arch}`));
    await sh(["bun", "--version"]);

    return canonicalVersion;
  }

  async installed(): Promise<boolean> {
    try {
      await sh(["bun", "--version"]);
      return true;
    } catch {
      return false;
    }
  }

  private _getDownloadUrl(version: string): string {
    const { platform, arch } = this._getOSInfo();
    return `https://github.com/${_owner}/${_repo}/releases/download/bun-${version}/bun-${platform}-${arch}.zip`;
  }

  private _getOSInfo(): OSInfo {
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

    return { platform, arch };
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
