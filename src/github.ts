import { getOctokit } from "@actions/github";

export type Config = {
  token: string;
  repo: string;
  owner: string;
};

export interface Comment {
  body: string;
}

export class GitHub {
  private readonly octokit: ReturnType<typeof getOctokit>;

  constructor(private readonly config: Config) {
    this.octokit = getOctokit(config.token);
  }

  async listPullRequestFiles(num: number) {
    const data = await this.octokit.paginate(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: num,
      },
    );

    return data;
  }

  async listPullRequestComments(num: number) {
    const data = await this.octokit.paginate(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: num,
      },
    );

    return data;
  }

  async createPullRequestComment(params: {
    num: number;
    filename: string;
    body: string;
    sha: string;
  }): Promise<void> {
    await this.octokit.request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: params.num,
        body: params.body,
        path: params.filename,
        commit_id: params.sha,
        subject_type: "file",
      },
    );
  }

  async updatePullRequestComment(params: {
    num: number;
    commentId: number;
    body: string;
  }): Promise<void> {
    await this.octokit.rest.pulls.updateReviewComment({
      owner: this.config.owner,
      repo: this.config.repo,
      comment_id: params.commentId,
      body: params.body,
    });
  }

  async deletePullRequestComment(params: {
    num: number;
    commentId: number;
  }): Promise<void> {
    await this.octokit.rest.pulls.deleteReviewComment({
      owner: this.config.owner,
      repo: this.config.repo,
      comment_id: params.commentId,
    });
  }

  async listCommitFiles(sha: string) {
    const { data } = await this.octokit.request(
      "GET /repos/{owner}/{repo}/commits/{ref}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        ref: sha,
      },
    );

    return data.files ?? [];
  }

  async listCommitComments(sha: string): Promise<Comment[]> {
    const { data } = await this.octokit.request(
      "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        commit_sha: sha,
      },
    );

    return data;
  }

  async createCommitComment(params: {
    sha: string;
    body: string;
  }): Promise<void> {
    await this.octokit.request(
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        commit_sha: params.sha,
        body: params.body,
      },
    );
  }

  async updateCommitComment(params: {
    sha: string;
    commentId: number;
    body: string;
  }): Promise<void> {
    await this.octokit.request(
      "PATCH /repos/{owner}/{repo}/comments/{comment_id}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        commit_sha: params.sha,
        comment_id: params.commentId,
        body: params.body,
      },
    );
  }

  async deleteCommitComment(params: {
    sha: string;
    commentId: number;
  }): Promise<void> {
    await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/comments/{comment_id}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        comment_id: params.commentId,
      },
    );
  }
}
