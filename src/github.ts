import { getOctokit } from "@actions/github";

export type Config = {
  token: string;
  repo: string;
  owner: string;
};

export interface PullRequest {
  number: number;
  base: {
    ref: string;
  };
  head: {
    sha: string;
  };
}

export class GitHub {
  private readonly octokit: ReturnType<typeof getOctokit>;

  constructor(private readonly config: Config) {
    this.octokit = getOctokit(config.token);
  }

  /** @see https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests-files */
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

  /** @see https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#list-review-comments-in-a-repository */
  async listReviewComments(num: number) {
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

  /** @see https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request */
  async createReviewComment(params: {
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

  /** @see https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#update-a-review-comment-for-a-pull-request */
  async updateReviewComment(params: {
    num: number;
    commentId: number;
    body: string;
  }): Promise<void> {
    await this.octokit.request(
      "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        comment_id: params.commentId,
        body: params.body,
      },
    );
  }

  /** @see https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#delete-a-review-comment-for-a-pull-request */
  async deleteReviewComment(params: {
    num: number;
    commentId: number;
  }): Promise<void> {
    await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        comment_id: params.commentId,
      },
    );
  }

  /** @see https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit */
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

  /** @see https://docs.github.com/en/rest/commits/comments?apiVersion=2022-11-28#list-commit-comments */
  async listCommitComments(sha: string) {
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

  /** @see https://docs.github.com/en/rest/commits/comments?apiVersion=2022-11-28#create-a-commit-comment */
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

  /** @see https://docs.github.com/en/rest/commits/comments?apiVersion=2022-11-28#update-a-commit-comment */
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

  /** @see https://docs.github.com/en/rest/commits/comments?apiVersion=2022-11-28#delete-a-commit-comment */
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
