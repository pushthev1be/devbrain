"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const octokit_1 = require("octokit");
class GitHubService {
    octokit;
    constructor(token) {
        this.octokit = new octokit_1.Octokit({ auth: token });
    }
    async monitorRepo(owner, repo) {
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
    async getRecentErrorsInIssues(owner, repo) {
        const { data: issues } = await this.octokit.rest.issues.listForRepo({
            owner,
            repo,
            labels: 'bug',
            state: 'closed'
        });
        return issues;
    }
}
exports.GitHubService = GitHubService;
