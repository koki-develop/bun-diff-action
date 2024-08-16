import { sh } from "./sh";

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
  header?: string;
  diff: string;
  metadata: Metadata;
}) => {
  const base = `\`\`\`diff
${params.diff}
\`\`\`

${_metadataPrefix}${JSON.stringify(params.metadata)}${_metadataSuffix}`;

  return params.header ? `${params.header}\n\n${base}` : base;
};

export const hasBun = () => {
  try {
    sh(["bun", "--version"]);
    return true;
  } catch {
    return false;
  }
};
