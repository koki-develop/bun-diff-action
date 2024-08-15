import { execSync } from "node:child_process";
import * as core from "@actions/core";

export const sh = (command: string) => {
  core.debug(`$ ${command}`);
  const stdout = execSync(command, {
    encoding: "utf-8",
  });
  core.debug(`${stdout}`);
  return stdout;
};
