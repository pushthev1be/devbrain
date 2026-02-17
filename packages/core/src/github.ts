import { Octokit } from 'octokit';

export class GitHubService {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    async monitorRepo(owner: string, repo: string) {
        // Example: Watch for recent commits
        const { data: commits } = await this.octokit.rest.repos.listCommits({
            owner,
            repo,
            per_page: 10
        });

        return commits.map(c => ({
            message: c.commit.message,
            author: c.commit.author?.name,
            date: c.commit.author?.date,
            sha: c.sha
        }));
    }

    async getRecentErrorsInIssues(owner: string, repo: string) {
        const { data: issues } = await this.octokit.rest.issues.listForRepo({
            owner,
            repo,
            labels: 'bug',
            state: 'closed'
        });

        return issues;
    }
}
