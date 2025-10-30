/**
 * GitHub CLI Client for Distributed Locking
 *
 * Wraps GitHub CLI commands for atomic operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  assignees: string[];
  body: string;
  createdAt: string;
  updatedAt: string;
  comments: GitHubComment[];
}

export interface GitHubComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
}

/**
 * GitHub CLI client for lock operations
 */
export class GitHubClient {
  constructor(private repo: string) {}

  /**
   * Get issue details including assignees and comments
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    try {
      // Get issue data
      const { stdout: issueData } = await execAsync(
        `gh issue view ${issueNumber} --repo ${this.repo} --json number,title,state,assignees,body,createdAt,updatedAt`
      );

      const issue = JSON.parse(issueData);

      // Get comments separately
      const { stdout: commentsData } = await execAsync(
        `gh issue view ${issueNumber} --repo ${this.repo} --comments --json comments`
      );

      const commentsObj = JSON.parse(commentsData);

      return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        assignees: issue.assignees.map((a: any) => a.login),
        body: issue.body,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        comments: commentsObj.comments || []
      };
    } catch (error) {
      throw new Error(`Failed to get issue ${issueNumber}: ${error}`);
    }
  }

  /**
   * Atomically assign issue to worker
   * Returns true if assignment succeeded, false if already assigned
   */
  async assignIssue(issueNumber: number, assignee: string): Promise<boolean> {
    try {
      // First check current state
      const issue = await this.getIssue(issueNumber);

      if (issue.assignees.length > 0) {
        return false; // Already assigned
      }

      // Attempt assignment
      await execAsync(
        `gh issue edit ${issueNumber} --repo ${this.repo} --add-assignee ${assignee}`
      );

      // Verify assignment succeeded (race condition check)
      const updatedIssue = await this.getIssue(issueNumber);
      return updatedIssue.assignees.includes(assignee);
    } catch (error) {
      throw new Error(`Failed to assign issue ${issueNumber}: ${error}`);
    }
  }

  /**
   * Remove assignee from issue
   */
  async unassignIssue(issueNumber: number, assignee: string): Promise<void> {
    try {
      await execAsync(
        `gh issue edit ${issueNumber} --repo ${this.repo} --remove-assignee ${assignee}`
      );
    } catch (error) {
      throw new Error(`Failed to unassign issue ${issueNumber}: ${error}`);
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueNumber: number, body: string): Promise<void> {
    try {
      // Escape quotes and newlines for shell
      const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      await execAsync(
        `gh issue comment ${issueNumber} --repo ${this.repo} --body "${escapedBody}"`
      );
    } catch (error) {
      throw new Error(`Failed to add comment to issue ${issueNumber}: ${error}`);
    }
  }

  /**
   * List issues with specific labels
   */
  async listIssues(labels: string[]): Promise<GitHubIssue[]> {
    try {
      const labelFilter = labels.map(l => `--label "${l}"`).join(' ');
      const { stdout } = await execAsync(
        `gh issue list --repo ${this.repo} ${labelFilter} --json number,title,state,assignees,createdAt,updatedAt --limit 100`
      );

      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Failed to list issues: ${error}`);
    }
  }

  /**
   * Close issue
   */
  async closeIssue(issueNumber: number, comment?: string): Promise<void> {
    try {
      if (comment) {
        await this.addComment(issueNumber, comment);
      }

      await execAsync(
        `gh issue close ${issueNumber} --repo ${this.repo}`
      );
    } catch (error) {
      throw new Error(`Failed to close issue ${issueNumber}: ${error}`);
    }
  }

  /**
   * Get authenticated GitHub username
   */
  async getUsername(): Promise<string> {
    try {
      const { stdout } = await execAsync('gh api user --jq .login');
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get GitHub username: ${error}`);
    }
  }
}
