/**
 * Distributed Locking System - Type Definitions
 *
 * Types for GitHub Issue-based distributed locking mechanism
 */

/**
 * Lock metadata stored in GitHub comments
 */
export interface LockMetadata {
  lock: {
    worker_id: string;
    node_id: string;
    claimed_at: string; // ISO8601 timestamp
    heartbeat_last: string; // ISO8601 timestamp
    task_info: {
      complexity: number;
      estimated_duration: string;
      task_type?: string;
      priority?: string;
    };
  };
}

/**
 * Lock acquisition result
 */
export interface LockResult {
  success: boolean;
  lockId: string; // Issue number
  metadata?: LockMetadata;
  error?: string;
  retries?: number;
}

/**
 * Lock release result
 */
export interface ReleaseResult {
  success: boolean;
  lockId: string;
  releasedAt: string;
  error?: string;
}

/**
 * Lock configuration options
 */
export interface LockConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  heartbeatIntervalMs: number;
  lockTimeoutMs: number;
  githubRepo: string; // owner/repo format
}

/**
 * Lock status from GitHub Issue
 */
export interface LockStatus {
  isLocked: boolean;
  assignee?: string;
  metadata?: LockMetadata;
  issueNumber: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictStrategy {
  RETRY = 'retry',
  FAIL_FAST = 'fail_fast',
  FORCE_ACQUIRE = 'force_acquire',
  STEAL_STALE = 'steal_stale'
}

/**
 * Lock acquisition options
 */
export interface AcquireOptions {
  workerId: string;
  nodeId: string;
  taskInfo: {
    complexity: number;
    estimated_duration: string;
    task_type?: string;
    priority?: string;
  };
  conflictStrategy?: ConflictStrategy;
  maxRetries?: number;
}

/**
 * Lock metrics for monitoring
 */
export interface LockMetrics {
  totalAcquisitions: number;
  totalReleases: number;
  totalConflicts: number;
  totalRetries: number;
  averageAcquisitionTimeMs: number;
  failedAcquisitions: number;
  staleLocksClaimed: number;
}
