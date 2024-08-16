import { spawnSync } from "node:child_process";
import * as core from "@actions/core";

export const sh = (commands: string[]) => {
  core.debug(`$ ${commands.join(" ")}`);
  const result = spawnSync(commands[0], commands.slice(1), {
    shell: true,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }

  core.debug(result.stdout);
  return result;
};
