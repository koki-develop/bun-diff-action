import { execSync } from "node:child_process";
import fs from "node:fs";
import * as core from "@actions/core";
import { context } from "@actions/github";
import { buildDiffComment, hasBun, isBunActionComment } from "./bun-diff";
import { GitHub } from "./github";

const _supportedEvents: string[] = [
  "pull_request",
  // TODO: support `push` event
] as const;

export const main = async () => {
  try {
    const inputs = {
      token: core.getInput("token"),
    } as const;
    const github = new GitHub({
      token: inputs.token,
      repo: context.repo.repo,
      owner: context.repo.owner,
    });

    core.debug(`Event: ${context.eventName}`);
    if (!_supportedEvents.includes(context.eventName)) {
      throw new Error(
        `Unsupported event: ${event}. This action supports only ${_supportedEvents.join(
          ", ",
        )} events.`,
      );
    }

    if (!hasBun()) throw new Error("bun is not installed.");

    // set git config
    fs.writeFileSync(".gitattributes", "bun.lockb diff=lockb");
    execSync("git config core.attributesFile .gitattributes");
    execSync("git config diff.lockb.textconv bun");
    execSync("git config diff.lockb.binary true");
    core.debug(
      `Git config: ${execSync("git config --list", { encoding: "utf-8" })}`,
    );

    if (context.eventName === "pull_request") {
      const pullRequest = context.payload.pull_request;
      if (!pullRequest) {
        throw new Error("Failed to get pull request from context.");
      }
      core.debug(`Pull request: ${JSON.stringify(pullRequest, null, 2)}`);

      // find `bun.lockb` files
      const files = await github.listPullRequestFiles(pullRequest.number);
      const lockbs = files.filter(
        (file) => file.filename.split("/").slice(-1)[0] === "bun.lockb",
      );
      if (lockbs.length === 0) {
        core.info("No `bun.lockb` file found in the diff.");
        return;
      }
      core.debug(
        `found bun.lockb files:\n${lockbs
          .map((lockb) => `* ${lockb.filename}`)
          .join("\n")}`,
      );

      // fetch bun-action comments
      const allComments = await github.listPullRequestComments(
        pullRequest.number,
      );
      const bunActionComments = allComments.filter((comment) =>
        isBunActionComment(comment),
      );
      core.debug(
        `bun-action comments:\n${bunActionComments
          .map((comment) => `* ${comment.id}`)
          .join("\n")}`,
      );

      for (const lockb of lockbs) {
        core.startGroup(lockb.filename);

        // get diff
        const diff = execSync(
          `git diff origin/${pullRequest.base.ref} HEAD -- ${lockb.filename}`,
          { encoding: "utf-8" },
        );
        core.info(diff);

        // find comment for the `bun.lockb` file
        const comment = bunActionComments.find(
          (comment) => comment.path === lockb.filename,
        );

        if (comment) {
          // update comment
          core.debug(`Updating comment ${comment.id}...`);
          await github.updatePullRequestComment({
            num: pullRequest.number,
            commentId: comment.id,
            body: buildDiffComment({ diff }),
          });
          core.debug("Updated.");
        } else {
          // create comment
          core.debug("Creating comment...");
          await github.createPullRequestComment({
            num: pullRequest.number,
            filename: lockb.filename,
            body: buildDiffComment({ diff }),
          });
          core.debug("Created.");
        }

        core.endGroup();
      }

      // delete old comments
      // TODO: implement
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      throw error;
    }
  }
};

await main();
