/**
 * LockManager Test Suite
 *
 * Tests for distributed locking system with GitHub Issues
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LockManager } from '../../src/distributed/lock-manager.js';
import { GitHubClient } from '../../src/distributed/github-client.js';
import { ConflictStrategy } from '../../src/distributed/types.js';

// Mock GitHubClient
vi.mock('../../src/distributed/github-client.js');

describe('LockManager', () => {
  let lockManager: LockManager;
  let mockGithubClient: any;

  beforeEach(() => {
    mockGithubClient = {
      getIssue: vi.fn(),
      assignIssue: vi.fn(),
      unassignIssue: vi.fn(),
      addComment: vi.fn(),
      getUsername: vi.fn().mockResolvedValue('test-worker')
    };

    vi.mocked(GitHubClient).mockImplementation(() => mockGithubClient);

    lockManager = new LockManager({
      githubRepo: 'owner/repo',
      maxRetries: 3,
      initialBackoffMs: 100,
      maxBackoffMs: 1000
    });
  });

  afterEach(() => {
    lockManager.destroy();
    vi.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should successfully acquire an unlocked issue', async () => {
      // Mock unlocked issue
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: [],
        comments: []
      });
      mockGithubClient.assignIssue.mockResolvedValue(true);

      const result = await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        }
      });

      expect(result.success).toBe(true);
      expect(result.lockId).toBe('123');
      expect(result.retries).toBe(0);
      expect(mockGithubClient.assignIssue).toHaveBeenCalledWith(123, 'test-worker');
      expect(mockGithubClient.addComment).toHaveBeenCalled();
    });

    it('should retry on conflict and eventually succeed', async () => {
      // First attempt: locked
      mockGithubClient.getIssue
        .mockResolvedValueOnce({
          number: 123,
          assignees: ['other-worker'],
          comments: []
        })
        // Second attempt: unlocked
        .mockResolvedValueOnce({
          number: 123,
          assignees: [],
          comments: []
        });

      mockGithubClient.assignIssue.mockResolvedValue(true);

      const result = await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        },
        conflictStrategy: ConflictStrategy.RETRY
      });

      expect(result.success).toBe(true);
      expect(result.retries).toBeGreaterThan(0);
    });

    it('should fail fast on conflict when strategy is FAIL_FAST', async () => {
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: ['other-worker'],
        comments: []
      });

      const result = await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        },
        conflictStrategy: ConflictStrategy.FAIL_FAST
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already locked');
      expect(mockGithubClient.assignIssue).not.toHaveBeenCalled();
    });

    it('should handle race condition when assignment fails', async () => {
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: [],
        comments: []
      });

      // First attempt: assignment fails (race condition)
      mockGithubClient.assignIssue
        .mockResolvedValueOnce(false)
        // Second attempt: succeeds
        .mockResolvedValueOnce(true);

      const result = await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        }
      });

      expect(result.success).toBe(true);
      expect(result.retries).toBeGreaterThan(0);
    });

    it('should fail after max retries', async () => {
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: ['other-worker'],
        comments: []
      });

      const result = await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        },
        maxRetries: 2
      });

      expect(result.success).toBe(false);
      expect(result.retries).toBe(2);
    });

    it('should steal stale lock when strategy is STEAL_STALE', async () => {
      const staleTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago

      mockGithubClient.getIssue
        .mockResolvedValueOnce({
          number: 123,
          assignees: ['stale-worker'],
          comments: [
            {
              body: `\`\`\`json\n${JSON.stringify({
                lock: {
                  worker_id: 'stale-worker',
                  node_id: 'stale-node',
                  claimed_at: staleTime,
                  heartbeat_last: staleTime,
                  task_info: { complexity: 5, estimated_duration: '30min' }
                }
              })}\n\`\`\``
            }
          ]
        })
        .mockResolvedValueOnce({
          number: 123,
          assignees: [],
          comments: []
        });

      mockGithubClient.assignIssue.mockResolvedValue(true);

      const result = await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        },
        conflictStrategy: ConflictStrategy.STEAL_STALE
      });

      expect(result.success).toBe(true);
      expect(mockGithubClient.unassignIssue).toHaveBeenCalledWith(123, 'stale-worker');
    });
  });

  describe('releaseLock', () => {
    it('should successfully release a lock', async () => {
      const metadata = {
        lock: {
          worker_id: 'worker-1',
          node_id: 'node-abc',
          claimed_at: new Date().toISOString(),
          heartbeat_last: new Date().toISOString(),
          task_info: { complexity: 5, estimated_duration: '30min' }
        }
      };

      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: ['test-worker'],
        comments: [
          {
            body: `\`\`\`json\n${JSON.stringify(metadata)}\n\`\`\``
          }
        ]
      });

      const result = await lockManager.releaseLock(123, 'worker-1');

      expect(result.success).toBe(true);
      expect(mockGithubClient.unassignIssue).toHaveBeenCalledWith(123, 'test-worker');
      expect(mockGithubClient.addComment).toHaveBeenCalled();
    });

    it('should fail to release if not locked', async () => {
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: [],
        comments: []
      });

      const result = await lockManager.releaseLock(123, 'worker-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not locked');
    });

    it('should fail to release if owned by different worker', async () => {
      const metadata = {
        lock: {
          worker_id: 'worker-2',
          node_id: 'node-xyz',
          claimed_at: new Date().toISOString(),
          heartbeat_last: new Date().toISOString(),
          task_info: { complexity: 5, estimated_duration: '30min' }
        }
      };

      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: ['test-worker'],
        comments: [
          {
            body: `\`\`\`json\n${JSON.stringify(metadata)}\n\`\`\``
          }
        ]
      });

      const result = await lockManager.releaseLock(123, 'worker-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('owned by');
    });
  });

  describe('getLockStatus', () => {
    it('should return unlocked status for unassigned issue', async () => {
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: [],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const status = await lockManager.getLockStatus(123);

      expect(status.isLocked).toBe(false);
      expect(status.assignee).toBeUndefined();
      expect(status.metadata).toBeUndefined();
    });

    it('should return locked status with metadata', async () => {
      const metadata = {
        lock: {
          worker_id: 'worker-1',
          node_id: 'node-abc',
          claimed_at: new Date().toISOString(),
          heartbeat_last: new Date().toISOString(),
          task_info: { complexity: 5, estimated_duration: '30min' }
        }
      };

      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: ['test-worker'],
        comments: [
          {
            body: `\`\`\`json\n${JSON.stringify(metadata)}\n\`\`\``
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const status = await lockManager.getLockStatus(123);

      expect(status.isLocked).toBe(true);
      expect(status.assignee).toBe('test-worker');
      expect(status.metadata).toEqual(metadata);
    });
  });

  describe('metrics', () => {
    it('should track acquisition metrics', async () => {
      mockGithubClient.getIssue.mockResolvedValue({
        number: 123,
        assignees: [],
        comments: []
      });
      mockGithubClient.assignIssue.mockResolvedValue(true);

      await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        }
      });

      const metrics = lockManager.getMetrics();

      expect(metrics.totalAcquisitions).toBe(1);
      expect(metrics.averageAcquisitionTimeMs).toBeGreaterThan(0);
    });

    it('should track conflict metrics', async () => {
      mockGithubClient.getIssue
        .mockResolvedValueOnce({
          number: 123,
          assignees: ['other-worker'],
          comments: []
        })
        .mockResolvedValueOnce({
          number: 123,
          assignees: [],
          comments: []
        });

      mockGithubClient.assignIssue.mockResolvedValue(true);

      await lockManager.acquireLock(123, {
        workerId: 'worker-1',
        nodeId: 'node-abc',
        taskInfo: {
          complexity: 5,
          estimated_duration: '30min'
        }
      });

      const metrics = lockManager.getMetrics();

      expect(metrics.totalConflicts).toBeGreaterThan(0);
      expect(metrics.totalRetries).toBeGreaterThan(0);
    });
  });
});
