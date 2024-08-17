import * as core from "@actions/core";
import * as exec from "@actions/exec";

export const sh = async (commands: string[]) => {
  let stdout = "";
  let stderr = "";

  const code = await exec.exec(commands[0], commands.slice(1), {
    ignoreReturnCode: true,
    silent: !core.isDebug(),
    listeners: {
      stdout: (data) => {
        stdout += data.toString();
      },
      stderr: (data) => {
        stderr += data.toString();
      },
    },
  });
  if (code !== 0) {
    throw new Error(stderr);
  }

  return stdout;
};
