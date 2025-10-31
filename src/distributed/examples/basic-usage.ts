/**
 * Distributed Lock Manager - Basic Usage Examples
 *
 * Demonstrates common patterns for using the distributed locking system
 */

import { LockManager, ConflictStrategy } from '../index.js';

/**
 * Example 1: Basic lock acquisition and release
 */
async function basicLockExample() {
  const lockManager = new LockManager({
    githubRepo: 'your-org/your-repo',
    maxRetries: 5,
    initialBackoffMs: 1000,
    maxBackoffMs: 16000
  });

  const issueNumber = 123;

  try {
    // Acquire lock
    const result = await lockManager.acquireLock(issueNumber, {
      workerId: 'worker-local-1',
      nodeId: 'node-abc123',
      taskInfo: {
        complexity: 5,
        estimated_duration: '30min',
        task_type: 'bug-fix',
        priority: 'high'
      }
    });

    if (!result.success) {
      console.error(`Failed to acquire lock: ${result.error}`);
      return;
    }

    console.log(`✓ Lock acquired on issue #${result.lockId}`);
    console.log(`  Retries: ${result.retries}`);

    // Execute task here
    await executeTask(issueNumber);

    // Release lock
    const releaseResult = await lockManager.releaseLock(
      issueNumber,
      'worker-local-1'
    );

    if (releaseResult.success) {
      console.log(`✓ Lock released on issue #${releaseResult.lockId}`);
    }

  } finally {
    lockManager.destroy();
  }
}

/**
 * Example 2: Fail-fast strategy for optional tasks
 */
async function failFastExample() {
  const lockManager = new LockManager({
    githubRepo: 'your-org/your-repo'
  });

  const result = await lockManager.acquireLock(456, {
    workerId: 'worker-2',
    nodeId: 'node-xyz789',
    taskInfo: {
      complexity: 3,
      estimated_duration: '15min'
    },
    conflictStrategy: ConflictStrategy.FAIL_FAST
  });

  if (!result.success) {
    console.log('Task already being processed, skipping');
    return;
  }

  // Process task...

  lockManager.destroy();
}

/**
 * Example 3: Steal stale locks for crash recovery
 */
async function stealStaleLockExample() {
  const lockManager = new LockManager({
    githubRepo: 'your-org/your-repo',
    lockTimeoutMs: 300000 // 5 minutes
  });

  const result = await lockManager.acquireLock(789, {
    workerId: 'recovery-worker',
    nodeId: 'node-recovery-1',
    taskInfo: {
      complexity: 4,
      estimated_duration: '20min',
      task_type: 'recovery'
    },
    conflictStrategy: ConflictStrategy.STEAL_STALE
  });

  if (result.success) {
    console.log('Successfully recovered stale lock');
  }

  lockManager.destroy();
}

/**
 * Example 4: Check lock status before attempting acquisition
 */
async function checkStatusExample() {
  const lockManager = new LockManager({
    githubRepo: 'your-org/your-repo'
  });

  const issueNumber = 101;

  // Check current status
  const status = await lockManager.getLockStatus(issueNumber);

  if (status.isLocked) {
    console.log(`Issue #${issueNumber} is locked by ${status.assignee}`);
    console.log(`Worker: ${status.metadata?.lock.worker_id}`);
    console.log(`Since: ${status.metadata?.lock.claimed_at}`);
    console.log(`Last heartbeat: ${status.metadata?.lock.heartbeat_last}`);
  } else {
    console.log(`Issue #${issueNumber} is available`);

    // Attempt to acquire
    const result = await lockManager.acquireLock(issueNumber, {
      workerId: 'worker-check',
      nodeId: 'node-check-1',
      taskInfo: {
        complexity: 2,
        estimated_duration: '10min'
      }
    });

    if (result.success) {
      console.log('Lock acquired!');
    }
  }

  lockManager.destroy();
}

/**
 * Example 5: Monitor metrics
 */
async function metricsExample() {
  const lockManager = new LockManager({
    githubRepo: 'your-org/your-repo'
  });

  // Perform multiple lock operations...

  for (let i = 0; i < 5; i++) {
    await lockManager.acquireLock(100 + i, {
      workerId: `worker-${i}`,
      nodeId: 'node-metrics',
      taskInfo: {
        complexity: Math.floor(Math.random() * 10),
        estimated_duration: '5min'
      }
    });
  }

  // Get metrics
  const metrics = lockManager.getMetrics();

  console.log('\n📊 Lock Manager Metrics:');
  console.log(`  Total acquisitions: ${metrics.totalAcquisitions}`);
  console.log(`  Total releases: ${metrics.totalReleases}`);
  console.log(`  Total conflicts: ${metrics.totalConflicts}`);
  console.log(`  Total retries: ${metrics.totalRetries}`);
  console.log(`  Average acquisition time: ${metrics.averageAcquisitionTimeMs}ms`);
  console.log(`  Failed acquisitions: ${metrics.failedAcquisitions}`);
  console.log(`  Stale locks claimed: ${metrics.staleLocksClaimed}`);

  lockManager.destroy();
}

/**
 * Example 6: Worker pattern with automatic retry
 */
async function workerPatternExample() {
  const lockManager = new LockManager({
    githubRepo: 'your-org/your-repo',
    maxRetries: 5,
    initialBackoffMs: 1000
  });

  const workerId = 'worker-main';
  const nodeId = 'node-main-1';

  async function processIssue(issueNumber: number): Promise<boolean> {
    // Try to acquire lock
    const lock = await lockManager.acquireLock(issueNumber, {
      workerId,
      nodeId,
      taskInfo: {
        complexity: 5,
        estimated_duration: '30min'
      },
      conflictStrategy: ConflictStrategy.RETRY
    });

    if (!lock.success) {
      console.log(`Cannot acquire lock on #${issueNumber}: ${lock.error}`);
      return false;
    }

    try {
      // Execute task
      console.log(`Processing issue #${issueNumber}...`);
      await executeTask(issueNumber);
      console.log(`✓ Completed issue #${issueNumber}`);
      return true;

    } catch (error) {
      console.error(`Error processing #${issueNumber}:`, error);
      return false;

    } finally {
      // Always release lock
      await lockManager.releaseLock(issueNumber, workerId);
    }
  }

  // Process queue of issues
  const issueQueue = [201, 202, 203, 204, 205];

  for (const issueNumber of issueQueue) {
    const success = await processIssue(issueNumber);
    if (!success) {
      console.log(`Skipping issue #${issueNumber}`);
    }
  }

  lockManager.destroy();
}

/**
 * Example 7: Multiple workers with different strategies
 */
async function multiWorkerExample() {
  // High-priority worker with STEAL_STALE
  const highPriorityWorker = new LockManager({
    githubRepo: 'your-org/your-repo',
    lockTimeoutMs: 180000 // 3 minutes for aggressive stealing
  });

  // Normal worker with RETRY
  const normalWorker = new LockManager({
    githubRepo: 'your-org/your-repo',
    maxRetries: 3
  });

  // Low-priority worker with FAIL_FAST
  const lowPriorityWorker = new LockManager({
    githubRepo: 'your-org/your-repo'
  });

  const issueNumber = 301;

  // High-priority worker tries first (can steal stale)
  const highPriResult = await highPriorityWorker.acquireLock(issueNumber, {
    workerId: 'worker-high-pri',
    nodeId: 'node-high',
    taskInfo: {
      complexity: 8,
      estimated_duration: '1hour',
      priority: 'critical'
    },
    conflictStrategy: ConflictStrategy.STEAL_STALE
  });

  if (highPriResult.success) {
    console.log('High-priority worker acquired lock');
  }

  // Normal worker tries with retry
  const normalResult = await normalWorker.acquireLock(issueNumber + 1, {
    workerId: 'worker-normal',
    nodeId: 'node-normal',
    taskInfo: {
      complexity: 5,
      estimated_duration: '30min',
      priority: 'medium'
    },
    conflictStrategy: ConflictStrategy.RETRY
  });

  // Low-priority worker tries with fail-fast
  const lowPriResult = await lowPriorityWorker.acquireLock(issueNumber + 2, {
    workerId: 'worker-low-pri',
    nodeId: 'node-low',
    taskInfo: {
      complexity: 2,
      estimated_duration: '10min',
      priority: 'low'
    },
    conflictStrategy: ConflictStrategy.FAIL_FAST
  });

  // Cleanup
  highPriorityWorker.destroy();
  normalWorker.destroy();
  lowPriorityWorker.destroy();
}

/**
 * Mock task execution
 */
async function executeTask(issueNumber: number): Promise<void> {
  console.log(`  Executing task for issue #${issueNumber}...`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`  Task completed for issue #${issueNumber}`);
}

/**
 * Run examples
 */
async function main() {
  console.log('=== Distributed Lock Manager Examples ===\n');

  try {
    console.log('Example 1: Basic lock acquisition');
    await basicLockExample();

    console.log('\nExample 4: Check lock status');
    await checkStatusExample();

    console.log('\nExample 5: Monitor metrics');
    await metricsExample();

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  basicLockExample,
  failFastExample,
  stealStaleLockExample,
  checkStatusExample,
  metricsExample,
  workerPatternExample,
  multiWorkerExample
};
