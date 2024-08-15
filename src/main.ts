import { execSync } from "node:child_process";
import fs from "node:fs";
import * as core from "@actions/core";
import { context } from "@actions/github";
import {
  buildDiffComment,
  extractMetadata,
  hasBun,
  isBunActionComment,
} from "./bun-diff";
import { GitHub } from "./github";

const _supportedEvents: string[] = ["pull_request", "push"] as const;

// TODO: refactor
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
      const allComments = await github.listReviewComments(pullRequest.number);
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
          await github.updateReviewComment({
            num: pullRequest.number,
            commentId: comment.id,
            body: buildDiffComment({
              diff,
              metadata: { path: lockb.filename },
            }),
          });
          core.debug("Updated.");
        } else {
          // create comment
          core.debug("Creating comment...");
          await github.createReviewComment({
            num: pullRequest.number,
            filename: lockb.filename,
            body: buildDiffComment({
              diff,
              metadata: { path: lockb.filename },
            }),
            sha: pullRequest.head.sha,
          });
          core.debug("Created.");
        }

        core.endGroup();
      }

      // delete old comments
      for (const comment of bunActionComments) {
        if (!lockbs.some((lockb) => comment.path === lockb.filename)) {
          core.debug(`Deleting comment ${comment.id}...`);
          await github.deleteReviewComment({
            num: pullRequest.number,
            commentId: comment.id,
          });
          core.debug("Deleted.");
        }
      }
    }

    if (context.eventName === "push") {
      // find `bun.lockb` files
      const files = await github.listCommitFiles(context.sha);
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
      const allComments = await github.listCommitComments(context.sha);
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
          "", // TODO: get diff
          { encoding: "utf-8" },
        );
        core.info(diff);

        // find comment for the `bun.lockb` file
        const comment = bunActionComments.find((comment) => {
          const metadata = extractMetadata(comment);
          return metadata.path === lockb.filename;
        });

        if (comment) {
          // update comment
          core.debug(`Updating comment ${comment.id}...`);
          const metadata = extractMetadata(comment);
          await github.updateCommitComment({
            sha: context.sha,
            commentId: comment.id,
            body: buildDiffComment({ diff, metadata }),
          });
          core.debug("Updated.");
        } else {
          // create comment
          core.debug("Creating comment...");
          await github.createCommitComment({
            sha: context.sha,
            body: buildDiffComment({
              diff,
              metadata: { path: lockb.filename },
            }),
          });
          core.debug("Created.");
        }

        core.endGroup();
      }

      // delete old comments
      for (const comment of bunActionComments) {
        if (
          !lockbs.some((lockb) => {
            const metadata = extractMetadata(comment);
            return metadata.path === lockb.filename;
          })
        ) {
          core.debug(`Deleting comment ${comment.id}...`);
          await github.deleteCommitComment({
            sha: context.sha,
            commentId: comment.id,
          });
          core.debug("Deleted.");
        }
      }
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
