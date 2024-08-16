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
import { sh } from "./sh";

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

    if (!hasBun()) throw new Error("bun is not installed.");

    // set git config
    fs.writeFileSync(".gitattributes", "bun.lockb diff=lockb");
    sh(["git", "config", "core.attributesFile", ".gitattributes"]);
    sh(["git", "config", "diff.lockb.textconv", "bun"]);
    sh(["git", "config", "diff.lockb.binary", "true"]);
    sh(["git", "config", "--list"]);

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
      core.debug(
        `found bun.lockb files:\n${lockbs
          .map((lockb) => `* ${lockb.filename}`)
          .join("\n")}`,
      );
      if (lockbs.length === 0) {
        core.info("No bun.lockb files found in changes.");
        // NOTE: To delete old comments, do not return here
      }

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
        // fetch base branch
        sh(["git", "fetch", "origin", pullRequest.base.ref]);

        // get diff
        const { stdout: diff } = sh([
          "git",
          "diff",
          `origin/${pullRequest.base.ref}`,
          "HEAD",
          "--",
          lockb.filename,
        ]);
        core.startGroup(lockb.filename);
        core.info(diff);
        core.endGroup();

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
    } else {
      // find `bun.lockb` files
      const files = await github.listCommitFiles(context.sha);
      const lockbs = files.filter(
        (file) => file.filename.split("/").slice(-1)[0] === "bun.lockb",
      );
      core.debug(
        `found bun.lockb files:\n${lockbs
          .map((lockb) => `* ${lockb.filename}`)
          .join("\n")}`,
      );
      if (lockbs.length === 0) {
        core.info("No bun.lockb files found in changes.");
        // NOTE: To delete old comments, do not return here
      }

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
        // fetch before commit
        sh(["git", "fetch", "--depth=2", "origin", context.sha]);

        // get diff
        const { stdout: diff } = sh([
          "git",
          "diff",
          "HEAD^",
          "HEAD",
          "--",
          lockb.filename,
        ]);
        core.startGroup(lockb.filename);
        core.info(diff);
        core.endGroup();

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
            body: buildDiffComment({
              header: `\`${lockb.filename}\``,
              diff,
              metadata,
            }),
          });
          core.debug("Updated.");
        } else {
          // create comment
          core.debug("Creating comment...");
          await github.createCommitComment({
            sha: context.sha,
            body: buildDiffComment({
              header: `\`${lockb.filename}\``,
              diff,
              metadata: { path: lockb.filename },
            }),
          });
          core.debug("Created.");
        }
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
