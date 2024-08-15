import * as core from "@actions/core";

export const main = async () => {
  try {
    const inputs = {
      message: core.getInput("message"),
    } as const;

    core.info(inputs.message);
    core.setOutput("message", inputs.message);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      throw error;
    }
  }
};

await main();
