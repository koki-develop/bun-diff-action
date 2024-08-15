import { getOctokit } from "@actions/github";

export type Config = {
  token: string;
  repo: string;
  owner: string;
};

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
  }): Promise<void> {
    await this.octokit.rest.pulls.createReview({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: params.num,
      event: "COMMENT",
      comments: [
        {
          path: params.filename,
          body: params.body,
        },
      ],
    });
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
}