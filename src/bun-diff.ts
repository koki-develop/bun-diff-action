import { execSync } from "node:child_process";

export interface Comment {
  body: string;
}

const _metadataPrefix = "<!-- bun-diff-action: ";
const _metadataSuffix = " -->";

export type Metadata = {
  path: string;
};

export const isBunActionComment = (comment: Comment) => {
  const lastLine = comment.body.trim().split("\n").slice(-1)[0];
  if (!lastLine.startsWith(`${_metadataPrefix}{`)) return false;
  if (!lastLine.endsWith(`}${_metadataSuffix}`)) return false;
  return true;
};

export const extractMetadata = (comment: Comment): Metadata => {
  const lastLine = comment.body.trim().split("\n").slice(-1)[0];
  return JSON.parse(
    lastLine.slice(_metadataPrefix.length, -_metadataSuffix.length),
  ) as Metadata;
};

export const buildDiffComment = (params: {
  title?: string;
  diff: string;
  metadata: Metadata;
}) => {
  const base = `\`\`\`diff
${params.diff}
\`\`\`

${_metadataPrefix}{${JSON.stringify(params.metadata)}}${_metadataSuffix}`;

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
