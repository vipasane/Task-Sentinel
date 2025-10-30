# Memory Synchronization Architecture

## Overview

The Memory Synchronization Manager provides distributed state management across Task Sentinel workers with conflict resolution, cache coherence, and real-time coordination.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Memory Sync Manager                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Vector Clock │  │Cache Manager │  │ Subscriptions│     │
│  │   Manager    │  │              │  │   System     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Conflict    │  │    Batch     │  │   MCP        │     │
│  │  Resolution  │  │  Processor   │  │ Integration  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  MCP Memory   │
                    │   Storage     │
                    └───────────────┘
```

## Memory Namespace Organization

```
task-sentinel/
├── tasks/[task-id]/
│   ├── state              # Current task state
│   ├── lock               # Distributed lock
│   ├── progress           # Progress tracking
│   └── agents/[agent-id]  # Agent coordination
│
├── workers/[worker-id]/
│   ├── status             # Worker state
│   ├── heartbeat          # Liveness check
│   └── capacity           # Available resources
│
└── coordination/
    ├── queue              # Task queue state
    ├── assignments        # Worker assignments
    └── metrics            # Shared metrics
```

## Key Components

### 1. Vector Clock Manager

Tracks causality and detects concurrent operations:

```typescript
// Initialize for worker
const clock = new VectorClockManager('worker-1');

// Increment on local operation
const version = clock.increment();

// Update with remote clock
const merged = clock.update(receivedClock);

// Compare for causality
const relation = clock.compare(clockA, clockB);
// Returns: 'before' | 'after' | 'concurrent'
```

**How it works:**
- Each worker maintains a vector of logical timestamps
- Local operations increment the worker's own clock
- Remote updates merge timestamps (max of each component)
- Concurrent operations are detected when neither clock dominates

### 2. Conflict Resolution

Multiple strategies for resolving concurrent writes:

```typescript
// Last-write-wins (default)
const resolved = ConflictResolvers.lastWriteWins(entries);

// Array union merge
const merged = ConflictResolvers.mergeArrays(entries);

// Object deep merge
const combined = ConflictResolvers.mergeObjects(entries);

// Max value selection
const max = ConflictResolvers.maxValue(entries);

// Custom resolver
const custom: ConflictResolver = (entries) => {
  // Application-specific logic
  return { resolved: value, strategy: 'custom', discarded: [] };
};
```

**Resolution Process:**
1. Detect concurrent writes using vector clocks
2. Apply configured resolution strategy
3. Emit conflict metrics for monitoring
4. Return winning value and discarded entries

### 3. Cache Manager

LRU cache with invalidation support:

```typescript
// Automatic caching on reads
const value = await manager.read('key');  // Cache miss
const cached = await manager.read('key'); // Cache hit

// Invalidation on writes
await manager.write('key', newValue);  // Invalidates cache

// Pattern-based invalidation
cache.invalidatePattern('tasks/*/state');

// Clear all cache
manager.clearCache();
```

**Cache Coherence Protocol:**
1. **Read**: Check cache → MCP if miss → Update cache
2. **Write**: Invalidate cache → Queue write → Notify subscribers
3. **Eviction**: LRU policy when cache full
4. **TTL**: Automatic expiration for stale entries

### 4. Batch Processor

Batches writes for performance:

```typescript
// Writes are automatically batched
await manager.write('key1', 'value1');
await manager.write('key2', 'value2');
await manager.write('key3', 'value3');

// Flushed after batchInterval (default 100ms)
// Or force immediate flush:
await manager.forceSync();
```

**Benefits:**
- Reduces MCP tool calls by 10-50x
- Amortizes network overhead
- Improves write throughput
- Configurable batch interval

## Usage Examples

### Task Coordination

```typescript
import { MemorySyncManager } from './distributed/memory-sync';

// Initialize
const manager = new MemorySyncManager({
  workerId: 'worker-1',
  batchInterval: 100,
  heartbeatInterval: 5000
});

// Sync task state
await manager.syncTaskState('task-123', {
  status: 'processing',
  progress: 50,
  assignedWorker: 'worker-1'
});

// Acquire distributed lock
const acquired = await manager.acquireTaskLock('task-123', 30000);
if (acquired) {
  try {
    // Do exclusive work
    await processTask();
  } finally {
    await manager.releaseTaskLock('task-123');
  }
}

// Update progress
await manager.syncTaskProgress('task-123', 75, 'processing');
```

### Worker Coordination

```typescript
// Register worker
await manager.syncWorkerStatus('worker-1', {
  state: 'active',
  tasks: ['task-1', 'task-2'],
  capacity: 5
});

// Heartbeat (automatic)
// Sends heartbeat every heartbeatInterval

// Get active workers
const workers = await manager.getActiveWorkers();
console.log('Active workers:', workers);

// Update capacity
await manager.syncWorkerCapacity('worker-1', 3);
```

### Agent Coordination

```typescript
// Sync agent state
await manager.syncAgentCoordination('task-123', 'agent-coder', {
  phase: 'implementation',
  filesModified: ['src/app.ts'],
  linesChanged: 150
});

// Get agent data
const agentData = await manager.getAgentCoordination('task-123', 'agent-coder');

// List all agents for task
const agents = await manager.getTaskAgents('task-123');
```

### Queue Management

```typescript
// Sync queue state
await manager.syncQueue({
  pending: ['task-1', 'task-2', 'task-3'],
  processing: ['task-4', 'task-5']
});

// Get queue
const queue = await manager.getQueue();

// Sync assignments
await manager.syncAssignments({
  'worker-1': ['task-1', 'task-2'],
  'worker-2': ['task-3']
});

// Sync metrics
await manager.syncMetrics({
  totalTasks: 100,
  completed: 80,
  failed: 5,
  avgDuration: 45.2
});
```

### Subscriptions

```typescript
// Subscribe to task state changes
const subId = manager.subscribe('task-sentinel/tasks/*/state', {
  onChange: (key, value) => {
    console.log(`Task state changed: ${key}`, value);
  }
});

// Subscribe to worker status
manager.subscribe('task-sentinel/workers/*/status', {
  onChange: (key, value) => {
    console.log(`Worker status updated: ${key}`, value);
  }
});

// Unsubscribe
manager.unsubscribe(subId);
```

### Custom Conflict Resolution

```typescript
// Custom resolver for specific data type
const customResolver: ConflictResolver = (entries) => {
  // Merge task queues by union
  const allTasks = new Set<string>();

  for (const entry of entries) {
    for (const task of entry.value as string[]) {
      allTasks.add(task);
    }
  }

  return {
    resolved: Array.from(allTasks),
    strategy: 'custom',
    discarded: []
  };
};

const manager = new MemorySyncManager({
  workerId: 'worker-1',
  conflictResolver: customResolver
});
```

## Performance Characteristics

| Operation | Latency | Throughput | Notes |
|-----------|---------|------------|-------|
| Read (cached) | <1ms | >100k ops/s | LRU cache |
| Read (miss) | 10-50ms | 1k ops/s | MCP roundtrip |
| Write (batched) | <1ms | >50k ops/s | Queued |
| Write (flushed) | 10-50ms | 1k ops/s | MCP roundtrip |
| Lock acquire | 10-50ms | 100 ops/s | Distributed lock |
| Conflict resolution | <1ms | >10k ops/s | In-memory |

## Best Practices

### 1. Namespace Organization

```typescript
// Use consistent namespace structure
const taskKey = `task-sentinel/tasks/${taskId}/state`;
const workerKey = `task-sentinel/workers/${workerId}/status`;
const coordKey = `task-sentinel/coordination/queue`;
```

### 2. Lock Management

```typescript
// Always use try-finally for locks
const acquired = await manager.acquireTaskLock(taskId, 30000);
if (acquired) {
  try {
    await doWork();
  } finally {
    await manager.releaseTaskLock(taskId);
  }
}
```

### 3. Batch Operations

```typescript
// Batch related writes
await Promise.all([
  manager.syncTaskState(taskId, state),
  manager.syncTaskProgress(taskId, progress, status),
  manager.syncAgentCoordination(taskId, agentId, data)
]);

// Force flush if time-sensitive
await manager.forceSync();
```

### 4. Subscription Patterns

```typescript
// Use specific patterns to reduce noise
manager.subscribe('task-sentinel/tasks/high-priority-*/state');

// Unsubscribe when done
const cleanup = () => {
  manager.unsubscribe(subId);
};
```

### 5. Error Handling

```typescript
try {
  await manager.syncTaskState(taskId, state);
} catch (error) {
  // Handle MCP errors
  console.error('Sync failed:', error);
  // Retry logic
}
```

## Monitoring & Metrics

```typescript
// Get metrics
const metrics = manager.getMetrics();

console.log({
  reads: metrics.reads,              // Total reads
  writes: metrics.writes,            // Total writes
  conflicts: metrics.conflicts,      // Conflicts resolved
  cacheHits: metrics.cacheHits,      // Cache hits
  cacheMisses: metrics.cacheMisses,  // Cache misses
  syncs: metrics.syncs,              // Batch flushes
  cache: {
    size: metrics.cache.size,        // Current cache size
    maxSize: metrics.cache.maxSize,  // Cache capacity
    invalidated: metrics.cache.invalidated
  },
  pendingWrites: metrics.pendingWrites,
  subscriptions: metrics.subscriptions,
  vectorClock: metrics.vectorClock   // Current vector clock
});
```

## Integration with Task Sentinel

```typescript
// In WorkerCoordinator
class WorkerCoordinator {
  private memorySync: MemorySyncManager;

  async initialize() {
    this.memorySync = new MemorySyncManager({
      workerId: this.workerId,
      batchInterval: 100,
      heartbeatInterval: 5000
    });

    // Subscribe to task updates
    this.memorySync.subscribe('task-sentinel/tasks/*/state', {
      onChange: (key, value) => this.handleTaskUpdate(key, value)
    });
  }

  async assignTask(taskId: string, workerId: string) {
    // Acquire lock
    const acquired = await this.memorySync.acquireTaskLock(taskId);
    if (!acquired) {
      throw new Error('Task already locked');
    }

    try {
      // Update state
      await this.memorySync.syncTaskState(taskId, {
        status: 'assigned',
        workerId,
        assignedAt: Date.now()
      });

      // Update worker
      await this.memorySync.syncWorkerStatus(workerId, {
        state: 'busy',
        tasks: [taskId],
        capacity: this.getWorkerCapacity(workerId) - 1
      });
    } finally {
      await this.memorySync.releaseTaskLock(taskId);
    }
  }
}
```

## Shutdown & Cleanup

```typescript
// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');

  // Flush pending writes
  await manager.forceSync();

  // Cleanup
  await manager.shutdown();

  process.exit(0);
});
```

## Future Enhancements

1. **Optimistic Locking**: Use version numbers for lock-free updates
2. **CRDT Support**: Conflict-free replicated data types
3. **Eventual Consistency**: Tunable consistency levels
4. **Compression**: Compress large values before storage
5. **Encryption**: End-to-end encryption for sensitive data
6. **Replication**: Multi-region memory replication
7. **Snapshot/Restore**: Save and restore entire state

## References

- Vector Clocks: Lamport timestamps for distributed systems
- CRDT: Conflict-free Replicated Data Types
- CAP Theorem: Consistency, Availability, Partition tolerance
- Cache Coherence: MESI protocol inspiration
