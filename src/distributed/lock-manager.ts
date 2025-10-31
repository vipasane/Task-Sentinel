/**
 * Distributed Lock Manager
 *
 * Implements distributed locking using GitHub Issues as the coordination mechanism.
 * Provides atomic lock acquisition, conflict resolution, and automatic heartbeat.
 */

import { GitHubClient } from './github-client.js';
import {
  LockConfig,
  LockResult,
  ReleaseResult,
  AcquireOptions,
  LockMetadata,
  LockStatus,
  ConflictStrategy,
  LockMetrics
} from './types.js';

/**
 * Default lock configuration
 */
const DEFAULT_CONFIG: LockConfig = {
  maxRetries: 5,
  initialBackoffMs: 1000,
  maxBackoffMs: 16000,
  heartbeatIntervalMs: 30000, // 30 seconds
  lockTimeoutMs: 300000, // 5 minutes
  githubRepo: '' // Must be set by user
};

/**
 * LockManager - Distributed locking coordinator
 */
export class LockManager {
  private config: LockConfig;
  private githubClient: GitHubClient;
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private metrics: LockMetrics = {
    totalAcquisitions: 0,
    totalReleases: 0,
    totalConflicts: 0,
    totalRetries: 0,
    averageAcquisitionTimeMs: 0,
    failedAcquisitions: 0,
    staleLocksClaimed: 0
  };
  private acquisitionTimes: number[] = [];

  constructor(config: Partial<LockConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.githubRepo) {
      throw new Error('GitHub repository must be specified in config');
    }

    this.githubClient = new GitHubClient(this.config.githubRepo);
  }

  /**
   * Acquire lock on a GitHub Issue
   *
   * @param issueNumber - Issue number to lock
   * @param options - Lock acquisition options
   * @returns Lock acquisition result
   */
  async acquireLock(
    issueNumber: number,
    options: AcquireOptions
  ): Promise<LockResult> {
    const startTime = Date.now();
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const strategy = options.conflictStrategy ?? ConflictStrategy.RETRY;

    let retries = 0;
    let backoffMs = this.config.initialBackoffMs;

    while (retries <= maxRetries) {
      try {
        // Check current lock status
        const status = await this.getLockStatus(issueNumber);

        // If locked, check if we can steal it (stale lock)
        if (status.isLocked) {
          if (strategy === ConflictStrategy.STEAL_STALE) {
            const canSteal = await this.isLockStale(status);
            if (canSteal) {
              console.log(`Stealing stale lock on issue #${issueNumber}`);
              await this.forceRelease(issueNumber, status.assignee!);
              this.metrics.staleLocksClaimed++;
            } else {
              throw new Error(`Issue #${issueNumber} is locked by ${status.assignee}`);
            }
          } else if (strategy === ConflictStrategy.FAIL_FAST) {
            return {
              success: false,
              lockId: issueNumber.toString(),
              error: `Issue already locked by ${status.assignee}`,
              retries
            };
          } else {
            // RETRY strategy
            if (retries === maxRetries) {
              this.metrics.failedAcquisitions++;
              return {
                success: false,
                lockId: issueNumber.toString(),
                error: `Failed to acquire lock after ${maxRetries} retries`,
                retries
              };
            }

            this.metrics.totalConflicts++;
            console.log(`Conflict on issue #${issueNumber}, retry ${retries + 1}/${maxRetries}`);
            await this.sleep(backoffMs);
            backoffMs = Math.min(backoffMs * 2, this.config.maxBackoffMs);
            retries++;
            this.metrics.totalRetries++;
            continue;
          }
        }

        // Attempt to acquire lock
        const username = await this.githubClient.getUsername();
        const assigned = await this.githubClient.assignIssue(issueNumber, username);

        if (!assigned) {
          // Race condition - someone else got it
          if (retries === maxRetries) {
            this.metrics.failedAcquisitions++;
            return {
              success: false,
              lockId: issueNumber.toString(),
              error: 'Failed to acquire lock due to race condition',
              retries
            };
          }

          this.metrics.totalConflicts++;
          console.log(`Race condition on issue #${issueNumber}, retry ${retries + 1}/${maxRetries}`);
          await this.sleep(backoffMs);
          backoffMs = Math.min(backoffMs * 2, this.config.maxBackoffMs);
          retries++;
          this.metrics.totalRetries++;
          continue;
        }

        // Successfully acquired lock - post metadata
        const metadata: LockMetadata = {
          lock: {
            worker_id: options.workerId,
            node_id: options.nodeId,
            claimed_at: new Date().toISOString(),
            heartbeat_last: new Date().toISOString(),
            task_info: options.taskInfo
          }
        };

        await this.postLockMetadata(issueNumber, metadata);
        await this.storeLockInMemory(issueNumber, metadata);

        // Start heartbeat
        this.startHeartbeat(issueNumber, options.workerId);

        // Update metrics
        this.metrics.totalAcquisitions++;
        const acquisitionTime = Date.now() - startTime;
        this.acquisitionTimes.push(acquisitionTime);
        this.updateAverageAcquisitionTime();

        console.log(`✓ Lock acquired on issue #${issueNumber} by ${options.workerId} (${acquisitionTime}ms, ${retries} retries)`);

        return {
          success: true,
          lockId: issueNumber.toString(),
          metadata,
          retries
        };

      } catch (error) {
        console.error(`Error acquiring lock on issue #${issueNumber}:`, error);

        if (retries === maxRetries) {
          this.metrics.failedAcquisitions++;
          return {
            success: false,
            lockId: issueNumber.toString(),
            error: error instanceof Error ? error.message : String(error),
            retries
          };
        }

        await this.sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, this.config.maxBackoffMs);
        retries++;
        this.metrics.totalRetries++;
      }
    }

    this.metrics.failedAcquisitions++;
    return {
      success: false,
      lockId: issueNumber.toString(),
      error: 'Max retries exceeded',
      retries
    };
  }

  /**
   * Release lock on a GitHub Issue
   *
   * @param issueNumber - Issue number to unlock
   * @param workerId - Worker ID that owns the lock
   * @returns Release result
   */
  async releaseLock(
    issueNumber: number,
    workerId: string
  ): Promise<ReleaseResult> {
    try {
      // Stop heartbeat
      this.stopHeartbeat(issueNumber.toString());

      // Get current status
      const status = await this.getLockStatus(issueNumber);

      if (!status.isLocked) {
        return {
          success: false,
          lockId: issueNumber.toString(),
          releasedAt: new Date().toISOString(),
          error: 'Issue is not locked'
        };
      }

      // Verify we own the lock
      if (status.metadata?.lock.worker_id !== workerId) {
        return {
          success: false,
          lockId: issueNumber.toString(),
          releasedAt: new Date().toISOString(),
          error: `Lock is owned by ${status.metadata?.lock.worker_id}, not ${workerId}`
        };
      }

      // Post completion comment
      const completionComment = `🔓 **Lock Released**\n\n` +
        `Worker: \`${workerId}\`\n` +
        `Released: ${new Date().toISOString()}\n` +
        `Duration: ${this.calculateLockDuration(status.metadata!)}\n`;

      await this.githubClient.addComment(issueNumber, completionComment);

      // Remove assignment
      const username = await this.githubClient.getUsername();
      await this.githubClient.unassignIssue(issueNumber, username);

      // Clean up memory
      await this.removeLockFromMemory(issueNumber);

      // Update metrics
      this.metrics.totalReleases++;

      console.log(`✓ Lock released on issue #${issueNumber} by ${workerId}`);

      return {
        success: true,
        lockId: issueNumber.toString(),
        releasedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error releasing lock on issue #${issueNumber}:`, error);
      return {
        success: false,
        lockId: issueNumber.toString(),
        releasedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get current lock status of an issue
   */
  async getLockStatus(issueNumber: number): Promise<LockStatus> {
    try {
      const issue = await this.githubClient.getIssue(issueNumber);

      const isLocked = issue.assignees.length > 0;
      const assignee = isLocked ? issue.assignees[0] : undefined;

      // Parse lock metadata from comments
      let metadata: LockMetadata | undefined;
      for (const comment of issue.comments.reverse()) {
        if (comment.body.includes('"lock"') && comment.body.includes('worker_id')) {
          try {
            // Extract JSON from markdown code block or plain text
            const jsonMatch = comment.body.match(/```json\n([\s\S]*?)\n```/) ||
                            comment.body.match(/({[\s\S]*})/);
            if (jsonMatch) {
              metadata = JSON.parse(jsonMatch[1]);
              break;
            }
          } catch (e) {
            // Invalid JSON, continue
          }
        }
      }

      return {
        isLocked,
        assignee,
        metadata,
        issueNumber: issue.number,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get lock status for issue ${issueNumber}: ${error}`);
    }
  }

  /**
   * Check if a lock is stale (no heartbeat for lockTimeoutMs)
   */
  private async isLockStale(status: LockStatus): Promise<boolean> {
    if (!status.metadata) {
      return true; // No metadata means likely stale
    }

    const lastHeartbeat = new Date(status.metadata.lock.heartbeat_last).getTime();
    const now = Date.now();
    const timeSinceHeartbeat = now - lastHeartbeat;

    return timeSinceHeartbeat > this.config.lockTimeoutMs;
  }

  /**
   * Force release a lock (for stale lock recovery)
   */
  private async forceRelease(issueNumber: number, assignee: string): Promise<void> {
    await this.githubClient.unassignIssue(issueNumber, assignee);
    await this.githubClient.addComment(
      issueNumber,
      `⚠️ **Stale Lock Recovered**\n\nForced release due to timeout.`
    );
  }

  /**
   * Post lock metadata as GitHub comment
   */
  private async postLockMetadata(
    issueNumber: number,
    metadata: LockMetadata
  ): Promise<void> {
    const comment = `🔒 **Lock Acquired**\n\n` +
      `\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\``;

    await this.githubClient.addComment(issueNumber, comment);
  }

  /**
   * Start heartbeat for a lock
   */
  private startHeartbeat(issueNumber: number, workerId: string): void {
    const lockId = issueNumber.toString();

    // Clear existing heartbeat if any
    this.stopHeartbeat(lockId);

    const interval = setInterval(async () => {
      try {
        const heartbeatComment = `💓 **Heartbeat**\n\n` +
          `Worker: \`${workerId}\`\n` +
          `Time: ${new Date().toISOString()}`;

        await this.githubClient.addComment(issueNumber, heartbeatComment);

        // Update memory
        await this.updateHeartbeatInMemory(issueNumber);
      } catch (error) {
        console.error(`Heartbeat failed for issue #${issueNumber}:`, error);
      }
    }, this.config.heartbeatIntervalMs);

    this.heartbeatIntervals.set(lockId, interval);
  }

  /**
   * Stop heartbeat for a lock
   */
  private stopHeartbeat(lockId: string): void {
    const interval = this.heartbeatIntervals.get(lockId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(lockId);
    }
  }

  /**
   * Store lock in MCP memory
   */
  private async storeLockInMemory(
    issueNumber: number,
    metadata: LockMetadata
  ): Promise<void> {
    // MCP memory integration would go here
    // For now, just log
    console.log(`Storing lock in memory: issue #${issueNumber}`);
  }

  /**
   * Update heartbeat in MCP memory
   */
  private async updateHeartbeatInMemory(issueNumber: number): Promise<void> {
    // MCP memory integration would go here
    console.log(`Updating heartbeat in memory: issue #${issueNumber}`);
  }

  /**
   * Remove lock from MCP memory
   */
  private async removeLockFromMemory(issueNumber: number): Promise<void> {
    // MCP memory integration would go here
    console.log(`Removing lock from memory: issue #${issueNumber}`);
  }

  /**
   * Calculate lock duration
   */
  private calculateLockDuration(metadata: LockMetadata): string {
    const claimedAt = new Date(metadata.lock.claimed_at).getTime();
    const now = Date.now();
    const durationMs = now - claimedAt;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Update average acquisition time metric
   */
  private updateAverageAcquisitionTime(): void {
    if (this.acquisitionTimes.length === 0) {
      this.metrics.averageAcquisitionTimeMs = 0;
      return;
    }

    const sum = this.acquisitionTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageAcquisitionTimeMs = Math.round(sum / this.acquisitionTimes.length);

    // Keep only last 100 measurements
    if (this.acquisitionTimes.length > 100) {
      this.acquisitionTimes = this.acquisitionTimes.slice(-100);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current metrics
   */
  getMetrics(): LockMetrics {
    return { ...this.metrics };
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Stop all heartbeats
    for (const [lockId, interval] of this.heartbeatIntervals.entries()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();
  }
}
