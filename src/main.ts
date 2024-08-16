import fs from "node:fs";
import * as core from "@actions/core";
import { context } from "@actions/github";
import {
  type Action,
  CommitAction,
  PullRequestAction,
  extractMetadata,
  hasBun,
} from "./action";
import { GitHub, type PullRequest } from "./github";
import { sh } from "./sh";

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

    const action: Action = (() => {
      if (context.eventName === "pull_request") {
        const pullRequest = context.payload.pull_request as PullRequest;
        if (!pullRequest) {
          throw new Error("Failed to get pull request from context.");
        }
        core.debug(`Pull request: ${JSON.stringify(pullRequest, null, 2)}`);
        return new PullRequestAction({ github, pullRequest });
      }

      return new CommitAction({ github, sha: context.sha });
    })();

    const lockbs = await action.listLockbFiles();
    core.debug(
      `Found bun.lockb files:\n${lockbs
        .map((lockb) => `* ${lockb}`)
        .join("\n")}`,
    );
    if (lockbs.length === 0) {
      core.info("No bun.lockb files found in changes.");
      // NOTE: To delete old comments, do not return here
    }

    const comments = await action.listComments();
    core.debug(
      `Existing comments:\n${comments
        .map((comment) => `* ${comment.id}`)
        .join("\n")}`,
    );

    for (const lockb of lockbs) {
      const diff = await action.getDiff(lockb);
      core.startGroup(lockb);
      core.info(diff);
      core.endGroup();

      const comment = comments.find((comment) => {
        const metadata = extractMetadata(comment);
        return metadata.path === lockb;
      });
      if (comment) {
        core.debug(`Updating comment ${comment.id}...`);
        await action.updateComment({ comment, diff, filename: lockb });
        core.debug("Updated.");
      } else {
        core.debug("Creating comment...");
        await action.createComment({ diff, filename: lockb });
        core.debug("Created.");
      }
    }

    for (const comment of comments) {
      const metadata = extractMetadata(comment);
      if (!lockbs.some((lockb) => metadata.path === lockb)) {
        core.debug(`Deleting comment ${comment.id}...`);
        await action.deleteComment(comment);
        core.debug("Deleted.");
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
