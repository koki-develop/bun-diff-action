import { execSync } from "node:child_process";

const _commentSuffix = "<!-- bun-diff-action -->";

export const isBunActionComment = (comment: { body: string }) => {
  return comment.body.trim().endsWith(_commentSuffix);
};

export const buildDiffComment = (params: { title?: string; diff: string }) => {
  const base = `\`\`\`diff
${params.diff}
\`\`\`

${_commentSuffix}`;

  return params.title ? `## ${params.title}\n\n${base}` : base;
};

export const hasBun = () => {
  try {
    execSync("bun --version", { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
};
