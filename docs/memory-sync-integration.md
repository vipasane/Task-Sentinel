# Memory Sync Integration Guide

## Quick Start

```typescript
import { MemorySyncManager } from './distributed/memory-sync';

// Initialize for your worker
const memorySync = new MemorySyncManager({
  workerId: 'worker-1',
  batchInterval: 100,      // Batch writes every 100ms
  heartbeatInterval: 5000, // Heartbeat every 5 seconds
  cacheSize: 1000          // Cache up to 1000 entries
});

// Start coordinating
await memorySync.syncWorkerStatus('worker-1', {
  state: 'active',
  tasks: [],
  capacity: 10
});
```

## Integration with MCP Tools

### Setting Up MCP Memory

The MemorySyncManager uses the MCP `memory_usage` tool under the hood. Here's how it maps:

```typescript
// High-level API
await memorySync.syncTaskState('task-123', { status: 'running' });

// Translates to MCP call
mcp__claude-flow__memory_usage({
  action: 'store',
  key: 'task-sentinel/tasks/task-123/state',
  value: JSON.stringify({
    value: { status: 'running' },
    version: { 'worker-1': 5 },
    timestamp: 1234567890,
    workerId: 'worker-1'
  }),
  namespace: 'task-sentinel',
  ttl: 3600
});
```

### Enabling MCP Integration

Update your implementation to call actual MCP tools:

```typescript
// In memory-sync.ts, replace the simulated methods:

private async mcpRead<T>(key: string): Promise<T | null> {
  try {
    const result = await mcp__claude-flow__memory_usage({
      action: 'retrieve',
      key,
      namespace: 'task-sentinel'
    });

    if (!result || !result.value) return null;

    const entry: MemoryEntry<T> = JSON.parse(result.value);
    return entry.value;
  } catch (error) {
    console.error('MCP read failed:', error);
    return null;
  }
}

private async mcpWrite(key: string, entry: MemoryEntry): Promise<void> {
  try {
    await mcp__claude-flow__memory_usage({
      action: 'store',
      key,
      value: JSON.stringify(entry),
      namespace: 'task-sentinel',
      ttl: entry.ttl
    });
  } catch (error) {
    console.error('MCP write failed:', error);
    throw error;
  }
}

private async mcpDelete(key: string): Promise<void> {
  try {
    await mcp__claude-flow__memory_usage({
      action: 'delete',
      key,
      namespace: 'task-sentinel'
    });
  } catch (error) {
    console.error('MCP delete failed:', error);
    throw error;
  }
}

private async mcpSearch(pattern: string): Promise<string[]> {
  try {
    const result = await mcp__claude-flow__memory_usage({
      action: 'search',
      pattern,
      namespace: 'task-sentinel'
    });

    return result.keys || [];
  } catch (error) {
    console.error('MCP search failed:', error);
    return [];
  }
}
```

## Worker Lifecycle Integration

### 1. Worker Initialization

```typescript
class Worker {
  private memorySync: MemorySyncManager;
  private workerId: string;

  async initialize() {
    this.workerId = `worker-${Date.now()}-${Math.random()}`;

    // Initialize memory sync
    this.memorySync = new MemorySyncManager({
      workerId: this.workerId,
      batchInterval: 100,
      heartbeatInterval: 5000
    });

    // Register worker
    await this.memorySync.syncWorkerStatus(this.workerId, {
      state: 'active',
      tasks: [],
      capacity: this.maxCapacity
    });

    // Subscribe to task assignments
    this.memorySync.subscribe('task-sentinel/coordination/assignments', {
      onChange: (key, value) => this.handleAssignment(value)
    });

    console.log(`Worker ${this.workerId} initialized`);
  }

  async shutdown() {
    // Update status
    await this.memorySync.syncWorkerStatus(this.workerId, {
      state: 'offline',
      tasks: [],
      capacity: 0
    });

    // Graceful shutdown
    await this.memorySync.shutdown();
  }
}
```

### 2. Task Execution

```typescript
class TaskExecutor {
  constructor(private memorySync: MemorySyncManager) {}

  async executeTask(taskId: string) {
    // Acquire lock
    const acquired = await this.memorySync.acquireTaskLock(taskId, 30000);
    if (!acquired) {
      throw new Error(`Cannot acquire lock for task ${taskId}`);
    }

    try {
      // Update state
      await this.memorySync.syncTaskState(taskId, {
        status: 'processing',
        startedAt: Date.now(),
        workerId: this.memorySync['config'].workerId
      });

      // Execute with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await this.doWork();
        await this.memorySync.syncTaskProgress(taskId, i, 'processing');
      }

      // Complete
      await this.memorySync.syncTaskState(taskId, {
        status: 'completed',
        completedAt: Date.now()
      });
    } catch (error) {
      // Error handling
      await this.memorySync.syncTaskState(taskId, {
        status: 'failed',
        error: error.message,
        failedAt: Date.now()
      });
      throw error;
    } finally {
      // Always release lock
      await this.memorySync.releaseTaskLock(taskId);
    }
  }
}
```

### 3. Agent Coordination

```typescript
class AgentCoordinator {
  constructor(private memorySync: MemorySyncManager) {}

  async coordinateAgents(taskId: string, agents: string[]) {
    // Share task context with all agents
    const context = {
      taskId,
      agents,
      sharedState: {},
      startedAt: Date.now()
    };

    for (const agentId of agents) {
      await this.memorySync.syncAgentCoordination(taskId, agentId, {
        role: this.getAgentRole(agentId),
        context,
        status: 'ready'
      });
    }

    // Subscribe to agent updates
    const subId = this.memorySync.subscribe(
      `task-sentinel/tasks/${taskId}/agents/*`,
      {
        onChange: (key, value) => {
          console.log(`Agent update: ${key}`, value);
        }
      }
    );

    // Wait for all agents to complete
    await this.waitForCompletion(taskId, agents);

    // Cleanup
    this.memorySync.unsubscribe(subId);
  }

  private async waitForCompletion(taskId: string, agents: string[]) {
    while (true) {
      const statuses = await Promise.all(
        agents.map(agentId =>
          this.memorySync.getAgentCoordination(taskId, agentId)
        )
      );

      const allComplete = statuses.every(
        status => status?.status === 'completed'
      );

      if (allComplete) break;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 4. Queue Management

```typescript
class QueueManager {
  constructor(private memorySync: MemorySyncManager) {}

  async enqueue(taskId: string) {
    const queue = await this.memorySync.getQueue() || {
      pending: [],
      processing: []
    };

    queue.pending.push(taskId);

    await this.memorySync.syncQueue(queue);
  }

  async dequeue(): Promise<string | null> {
    const queue = await this.memorySync.getQueue();
    if (!queue || queue.pending.length === 0) {
      return null;
    }

    const taskId = queue.pending.shift()!;
    queue.processing.push(taskId);

    await this.memorySync.syncQueue(queue);

    return taskId;
  }

  async complete(taskId: string) {
    const queue = await this.memorySync.getQueue();
    if (!queue) return;

    queue.processing = queue.processing.filter(id => id !== taskId);

    await this.memorySync.syncQueue(queue);
  }
}
```

## Real-Time Monitoring

### Dashboard Integration

```typescript
class MonitoringDashboard {
  constructor(private memorySync: MemorySyncManager) {}

  async startMonitoring() {
    // Subscribe to all state changes
    this.memorySync.subscribe('task-sentinel/tasks/*/state', {
      onChange: (key, value) => {
        this.updateTaskDisplay(key, value);
      }
    });

    this.memorySync.subscribe('task-sentinel/workers/*/status', {
      onChange: (key, value) => {
        this.updateWorkerDisplay(key, value);
      }
    });

    // Periodic metrics update
    setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  private updateMetrics() {
    const metrics = this.memorySync.getMetrics();

    console.log('Memory Sync Metrics:', {
      operations: {
        reads: metrics.reads,
        writes: metrics.writes,
        syncs: metrics.syncs
      },
      cache: {
        hits: metrics.cacheHits,
        misses: metrics.cacheMisses,
        hitRate: (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
      },
      conflicts: metrics.conflicts,
      pending: metrics.pendingWrites,
      subscriptions: metrics.subscriptions
    });
  }
}
```

## Performance Optimization

### 1. Batch Operations

```typescript
// Bad: Sequential writes
for (const task of tasks) {
  await memorySync.syncTaskState(task.id, task.state);
}

// Good: Batch writes
await Promise.all(
  tasks.map(task => memorySync.syncTaskState(task.id, task.state))
);

// Even better: Force sync after batch
await Promise.all(
  tasks.map(task => memorySync.syncTaskState(task.id, task.state))
);
await memorySync.forceSync();
```

### 2. Cache Warming

```typescript
class CacheWarmer {
  constructor(private memorySync: MemorySyncManager) {}

  async warmCache(taskIds: string[]) {
    // Preload frequently accessed data
    await Promise.all(
      taskIds.map(taskId => memorySync.getTaskState(taskId))
    );

    console.log('Cache warmed with', taskIds.length, 'tasks');
  }
}
```

### 3. Smart Subscriptions

```typescript
// Bad: Subscribe to everything
memorySync.subscribe('task-sentinel/*');

// Good: Subscribe to specific patterns
memorySync.subscribe('task-sentinel/tasks/high-priority-*/state');
memorySync.subscribe('task-sentinel/workers/primary-*/status');
```

## Error Handling

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

// Usage
await withRetry(() =>
  memorySync.syncTaskState(taskId, state)
);
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > 30000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= 5) {
      this.state = 'open';
    }
  }
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySyncManager } from './memory-sync';

describe('MemorySyncManager Integration', () => {
  let manager: MemorySyncManager;

  beforeEach(() => {
    manager = new MemorySyncManager({
      workerId: 'test-worker',
      batchInterval: 50
    });
  });

  it('should coordinate task execution', async () => {
    const taskId = 'test-task';

    // Acquire lock
    const acquired = await manager.acquireTaskLock(taskId);
    expect(acquired).toBe(true);

    // Sync state
    await manager.syncTaskState(taskId, {
      status: 'running'
    });

    // Release
    await manager.releaseTaskLock(taskId);
  });

  it('should handle concurrent writes', async () => {
    const key = 'test-key';

    // Simulate concurrent writes
    await Promise.all([
      manager.write(key, 'value1'),
      manager.write(key, 'value2'),
      manager.write(key, 'value3')
    ]);

    await manager.forceSync();

    const metrics = manager.getMetrics();
    expect(metrics.writes).toBe(3);
  });
});
```

## Deployment Checklist

- [ ] Configure appropriate `batchInterval` for your workload
- [ ] Set `cacheSize` based on available memory
- [ ] Implement custom `conflictResolver` if needed
- [ ] Set up monitoring for metrics
- [ ] Configure heartbeat interval for liveness checks
- [ ] Implement graceful shutdown handlers
- [ ] Test conflict resolution scenarios
- [ ] Validate lock timeouts
- [ ] Monitor cache hit rates
- [ ] Set up alerting for sync failures

## Troubleshooting

### High Conflict Rate

```typescript
// Check conflict metrics
const metrics = manager.getMetrics();
console.log('Conflict rate:', metrics.conflicts / metrics.writes);

// Consider:
// 1. Increasing batch interval
// 2. Using custom conflict resolver
// 3. Partitioning data by worker
```

### Low Cache Hit Rate

```typescript
// Check cache effectiveness
const metrics = manager.getMetrics();
const hitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
console.log('Cache hit rate:', hitRate);

// Consider:
// 1. Increasing cache size
// 2. Preloading frequently accessed data
// 3. Adjusting TTL values
```

### Lock Contention

```typescript
// Monitor lock acquisition failures
let lockFailures = 0;

const acquired = await manager.acquireTaskLock(taskId);
if (!acquired) {
  lockFailures++;
  console.warn('Lock contention detected:', lockFailures);
}

// Consider:
// 1. Shorter lock timeouts
// 2. Task partitioning
// 3. Lock-free algorithms
```

## Next Steps

1. **Implement MCP Integration**: Replace simulated methods with actual MCP calls
2. **Add Monitoring**: Set up metrics collection and dashboards
3. **Test Under Load**: Stress test with concurrent workers
4. **Optimize Configuration**: Tune batch intervals and cache sizes
5. **Document Patterns**: Create runbooks for common scenarios
