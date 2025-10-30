/**
 * Memory Synchronization Usage Examples
 *
 * Demonstrates common patterns for cross-worker coordination
 */

import {
  MemorySyncManager,
  ConflictResolvers,
  type MemorySyncConfig
} from '../src/distributed/memory-sync';

// ============================================================================
// Example 1: Basic Worker Coordination
// ============================================================================

async function basicWorkerCoordination() {
  console.log('\n=== Basic Worker Coordination ===\n');

  // Initialize memory sync for this worker
  const config: MemorySyncConfig = {
    workerId: 'worker-1',
    batchInterval: 100,
    heartbeatInterval: 5000,
    cacheSize: 500
  };

  const memorySync = new MemorySyncManager(config);

  // Register worker as active
  await memorySync.syncWorkerStatus('worker-1', {
    state: 'active',
    tasks: [],
    capacity: 10
  });

  console.log('Worker registered successfully');

  // Subscribe to queue updates
  const subId = memorySync.subscribe('task-sentinel/coordination/queue', {
    onChange: (key, value) => {
      console.log('Queue updated:', value);
    }
  });

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Cleanup
  memorySync.unsubscribe(subId);
  await memorySync.shutdown();

  console.log('Worker shutdown complete');
}

// ============================================================================
// Example 2: Task Execution with Locking
// ============================================================================

async function taskExecutionWithLocking() {
  console.log('\n=== Task Execution with Locking ===\n');

  const memorySync = new MemorySyncManager({
    workerId: 'worker-2'
  });

  const taskId = 'task-123';

  // Try to acquire lock
  console.log('Acquiring lock for task', taskId);
  const acquired = await memorySync.acquireTaskLock(taskId, 30000);

  if (!acquired) {
    console.log('Failed to acquire lock - task already locked');
    await memorySync.shutdown();
    return;
  }

  console.log('Lock acquired successfully');

  try {
    // Update task state
    await memorySync.syncTaskState(taskId, {
      status: 'processing',
      startedAt: Date.now(),
      workerId: 'worker-2'
    });

    console.log('Task state updated to processing');

    // Simulate work with progress updates
    for (let progress = 0; progress <= 100; progress += 25) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await memorySync.syncTaskProgress(taskId, progress, 'processing');
      console.log(`Progress: ${progress}%`);
    }

    // Mark as complete
    await memorySync.syncTaskState(taskId, {
      status: 'completed',
      completedAt: Date.now()
    });

    console.log('Task completed successfully');
  } catch (error) {
    console.error('Task failed:', error);

    // Update state to failed
    await memorySync.syncTaskState(taskId, {
      status: 'failed',
      error: error.message,
      failedAt: Date.now()
    });
  } finally {
    // Always release lock
    await memorySync.releaseTaskLock(taskId);
    console.log('Lock released');
  }

  await memorySync.shutdown();
}

// ============================================================================
// Example 3: Multi-Agent Coordination
// ============================================================================

async function multiAgentCoordination() {
  console.log('\n=== Multi-Agent Coordination ===\n');

  const memorySync = new MemorySyncManager({
    workerId: 'coordinator'
  });

  const taskId = 'task-456';
  const agents = ['agent-researcher', 'agent-coder', 'agent-tester'];

  // Initialize coordination for each agent
  for (const agentId of agents) {
    await memorySync.syncAgentCoordination(taskId, agentId, {
      role: agentId.split('-')[1],
      status: 'initialized',
      timestamp: Date.now()
    });

    console.log(`Agent ${agentId} initialized`);
  }

  // Subscribe to agent updates
  const subId = memorySync.subscribe(
    `task-sentinel/tasks/${taskId}/agents/*`,
    {
      onChange: (key, value) => {
        console.log('Agent update:', key, value);
      }
    }
  );

  // Simulate agent work
  for (const agentId of agents) {
    await new Promise(resolve => setTimeout(resolve, 500));

    await memorySync.syncAgentCoordination(taskId, agentId, {
      role: agentId.split('-')[1],
      status: 'working',
      progress: 50,
      timestamp: Date.now()
    });
  }

  // Complete agents
  for (const agentId of agents) {
    await new Promise(resolve => setTimeout(resolve, 500));

    await memorySync.syncAgentCoordination(taskId, agentId, {
      role: agentId.split('-')[1],
      status: 'completed',
      progress: 100,
      timestamp: Date.now()
    });

    console.log(`Agent ${agentId} completed`);
  }

  // Cleanup
  memorySync.unsubscribe(subId);
  await memorySync.shutdown();

  console.log('Coordination complete');
}

// ============================================================================
// Example 4: Queue Management
// ============================================================================

async function queueManagement() {
  console.log('\n=== Queue Management ===\n');

  const memorySync = new MemorySyncManager({
    workerId: 'queue-manager'
  });

  // Initialize queue
  await memorySync.syncQueue({
    pending: ['task-1', 'task-2', 'task-3'],
    processing: []
  });

  console.log('Queue initialized with 3 pending tasks');

  // Dequeue and process tasks
  const queue = await memorySync.getQueue();
  if (queue) {
    while (queue.pending.length > 0) {
      const taskId = queue.pending.shift()!;
      queue.processing.push(taskId);

      await memorySync.syncQueue(queue);
      console.log(`Dequeued ${taskId}, processing...`);

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Complete
      queue.processing = queue.processing.filter(id => id !== taskId);
      await memorySync.syncQueue(queue);

      console.log(`Completed ${taskId}`);
    }
  }

  console.log('All tasks processed');

  await memorySync.shutdown();
}

// ============================================================================
// Example 5: Conflict Resolution
// ============================================================================

async function conflictResolution() {
  console.log('\n=== Conflict Resolution ===\n');

  // Custom conflict resolver for task priorities
  const customResolver = (entries) => {
    // Find entry with highest priority
    const sorted = [...entries].sort((a, b) => {
      const priorityA = a.value.priority || 0;
      const priorityB = b.value.priority || 0;
      return priorityB - priorityA;
    });

    return {
      resolved: sorted[0].value,
      strategy: 'custom',
      discarded: sorted.slice(1)
    };
  };

  const memorySync = new MemorySyncManager({
    workerId: 'resolver',
    conflictResolver: customResolver
  });

  // Simulate concurrent writes
  console.log('Simulating concurrent writes...');

  const entries = [
    {
      value: { task: 'A', priority: 5 },
      version: { 'w1': 1 },
      timestamp: Date.now(),
      workerId: 'w1'
    },
    {
      value: { task: 'B', priority: 10 },
      version: { 'w2': 1 },
      timestamp: Date.now(),
      workerId: 'w2'
    },
    {
      value: { task: 'C', priority: 3 },
      version: { 'w3': 1 },
      timestamp: Date.now(),
      workerId: 'w3'
    }
  ];

  const resolution = memorySync.resolveConflict(entries);

  console.log('Conflict resolved:');
  console.log('Winner:', resolution.resolved);
  console.log('Strategy:', resolution.strategy);
  console.log('Discarded:', resolution.discarded.length, 'entries');

  await memorySync.shutdown();
}

// ============================================================================
// Example 6: Real-Time Monitoring
// ============================================================================

async function realTimeMonitoring() {
  console.log('\n=== Real-Time Monitoring ===\n');

  const memorySync = new MemorySyncManager({
    workerId: 'monitor'
  });

  // Subscribe to all state changes
  memorySync.subscribe('task-sentinel/tasks/*/state', {
    onChange: (key, value) => {
      console.log(`[STATE CHANGE] ${key}:`, value);
    }
  });

  memorySync.subscribe('task-sentinel/workers/*/status', {
    onChange: (key, value) => {
      console.log(`[WORKER UPDATE] ${key}:`, value);
    }
  });

  // Start periodic metrics reporting
  const metricsInterval = setInterval(() => {
    const metrics = memorySync.getMetrics();

    console.log('\n--- Metrics ---');
    console.log('Reads:', metrics.reads);
    console.log('Writes:', metrics.writes);
    console.log('Conflicts:', metrics.conflicts);
    console.log('Cache Hit Rate:',
      ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2) + '%'
    );
    console.log('Pending Writes:', metrics.pendingWrites);
    console.log('Subscriptions:', metrics.subscriptions);
    console.log('---------------\n');
  }, 2000);

  // Simulate activity
  await memorySync.syncTaskState('task-999', {
    status: 'running',
    timestamp: Date.now()
  });

  await memorySync.syncWorkerStatus('worker-999', {
    state: 'active',
    tasks: ['task-999'],
    capacity: 5
  });

  // Run for 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Cleanup
  clearInterval(metricsInterval);
  await memorySync.shutdown();

  console.log('Monitoring complete');
}

// ============================================================================
// Example 7: Batch Operations
// ============================================================================

async function batchOperations() {
  console.log('\n=== Batch Operations ===\n');

  const memorySync = new MemorySyncManager({
    workerId: 'batch-worker',
    batchInterval: 500 // Batch every 500ms
  });

  console.log('Performing 100 writes...');

  const startTime = Date.now();

  // Batch 100 writes
  const writes = [];
  for (let i = 0; i < 100; i++) {
    writes.push(
      memorySync.write(`task-${i}`, {
        id: i,
        status: 'pending',
        timestamp: Date.now()
      })
    );
  }

  await Promise.all(writes);
  console.log('All writes queued');

  // Force flush
  await memorySync.forceSync();
  const duration = Date.now() - startTime;

  console.log(`Completed in ${duration}ms`);

  const metrics = memorySync.getMetrics();
  console.log('Total writes:', metrics.writes);
  console.log('Syncs:', metrics.syncs);
  console.log('Writes per sync:', (metrics.writes / metrics.syncs).toFixed(2));

  await memorySync.shutdown();
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  try {
    await basicWorkerCoordination();
    await taskExecutionWithLocking();
    await multiAgentCoordination();
    await queueManagement();
    await conflictResolution();
    await realTimeMonitoring();
    await batchOperations();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

export {
  basicWorkerCoordination,
  taskExecutionWithLocking,
  multiAgentCoordination,
  queueManagement,
  conflictResolution,
  realTimeMonitoring,
  batchOperations
};
