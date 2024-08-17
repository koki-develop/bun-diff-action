import type { GitHub, PullRequest } from "./github";
import { sh } from "./sh";

export interface Comment {
  id: number;
  body: string;
  path: string | null;
}

export interface File {
  filename: string;
  previousFilename?: string;
}

const _metadataPrefix = "<!-- bun-diff-action: ";
const _metadataSuffix = " -->";

export type Metadata = {
  path: string;
};

export const extractMetadata = (comment: Comment): Metadata => {
  const lastLine = comment.body.trim().split("\n").slice(-1)[0];
  const metadata = JSON.parse(
    lastLine.slice(_metadataPrefix.length, -_metadataSuffix.length),
  ) as Metadata;

  return {
    ...metadata,
    path: comment.path ?? metadata.path,
  };
};

export type CreateCommentParams = {
  diff: string;
  filename: string;
};

export type UpdateCommentParams = {
  comment: Comment;
  diff: string;
  filename: string;
};

export interface Action {
  listLockbFiles: () => Promise<File[]>;
  listComments: () => Promise<Comment[]>;
  createComment: (params: CreateCommentParams) => Promise<void>;
  updateComment: (params: UpdateCommentParams) => Promise<void>;
  deleteComment: (comment: Comment) => Promise<void>;
  getDiff: (file: File) => Promise<string>;
}

export class PullRequestAction implements Action {
  private readonly github: GitHub;
  private readonly pullRequest: PullRequest;

  constructor(config: { github: GitHub; pullRequest: PullRequest }) {
    this.github = config.github;
    this.pullRequest = config.pullRequest;
  }

  async listLockbFiles(): Promise<File[]> {
    const files = await this.github.listPullRequestFiles(
      this.pullRequest.number,
    );
    return files
      .filter((file) => {
        if (!_isLockbFile(file.filename)) return false;
        return true;
      })
      .map((file) => ({
        filename: file.filename,
        previousFilename: file.previous_filename,
      }));
  }

  async listComments(): Promise<Comment[]> {
    const comments = await this.github.listReviewComments(
      this.pullRequest.number,
    );
    return comments.filter(_isBunActionComment).map((comment) => ({
      id: comment.id,
      body: comment.body,
      path: comment.path,
    }));
  }

  async createComment({ diff, filename }: CreateCommentParams): Promise<void> {
    await this.github.createReviewComment({
      num: this.pullRequest.number,
      filename,
      body: _buildDiffComment({
        diff,
        metadata: { path: filename },
      }),
      sha: this.pullRequest.head.sha,
    });
  }

  async updateComment({
    comment,
    diff,
    filename,
  }: UpdateCommentParams): Promise<void> {
    await this.github.updateReviewComment({
      num: this.pullRequest.number,
      commentId: comment.id,
      body: _buildDiffComment({
        diff,
        metadata: { path: filename },
      }),
    });
  }

  async deleteComment(comment: Comment): Promise<void> {
    await this.github.deleteReviewComment({
      num: this.pullRequest.number,
      commentId: comment.id,
    });
  }

  async getDiff(file: File): Promise<string> {
    await sh(["git", "fetch", "origin", this.pullRequest.base.ref]);

    const paths = [file.filename];
    if (file.previousFilename) {
      paths.unshift(file.previousFilename);
    }

    const stdout = await sh([
      "git",
      "diff",
      `origin/${this.pullRequest.base.ref}`,
      "HEAD",
      "--",
      ...paths,
    ]);
    return stdout;
  }
}

export class CommitAction implements Action {
  private readonly github: GitHub;
  private readonly sha: string;

  constructor(config: { github: GitHub; sha: string }) {
    this.github = config.github;
    this.sha = config.sha;
  }

  async listLockbFiles(): Promise<File[]> {
    const files = await this.github.listCommitFiles(this.sha);
    return files
      .filter((file) => {
        if (!_isLockbFile(file.filename)) return false;
        return true;
      })
      .map((file) => ({
        filename: file.filename,
        previousFilename: file.previous_filename,
      }));
  }

  async listComments(): Promise<Comment[]> {
    const comments = await this.github.listCommitComments(this.sha);
    return comments.filter(_isBunActionComment).map((comment) => ({
      id: comment.id,
      body: comment.body,
      path: comment.path,
    }));
  }

  async createComment({ diff, filename }: CreateCommentParams): Promise<void> {
    await this.github.createCommitComment({
      sha: this.sha,
      body: _buildDiffComment({
        header: `\`${filename}\``,
        diff,
        metadata: { path: filename },
      }),
    });
  }

  async updateComment({
    comment,
    diff,
    filename,
  }: UpdateCommentParams): Promise<void> {
    const metadata = extractMetadata(comment);
    await this.github.updateCommitComment({
      sha: this.sha,
      commentId: comment.id,
      body: _buildDiffComment({
        header: `\`${filename}\``,
        diff,
        metadata,
      }),
    });
  }

  async deleteComment(comment: Comment): Promise<void> {
    await this.github.deleteCommitComment({
      sha: this.sha,
      commentId: comment.id,
    });
  }

  async getDiff(file: File): Promise<string> {
    await sh(["git", "fetch", "--depth=2", "origin", this.sha]);
    const paths = [file.filename];
    if (file.previousFilename) {
      paths.unshift(file.previousFilename);
    }
    const stdout = await sh(["git", "diff", "HEAD^", "HEAD", "--", ...paths]);
    return stdout;
  }
}

export const _isBunActionComment = (comment: Comment) => {
  const lastLine = comment.body.trim().split("\n").slice(-1)[0];
  if (!lastLine.startsWith(`${_metadataPrefix}{`)) return false;
  if (!lastLine.endsWith(`}${_metadataSuffix}`)) return false;
  return true;
};

export const _buildDiffComment = (params: {
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

export const _isLockbFile = (filename: string): boolean => {
  return filename.split("/").slice(-1)[0] === "bun.lockb";
};
