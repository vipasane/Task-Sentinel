# Memory Sync Quick Reference

## 🚀 Quick Start

```typescript
import { MemorySyncManager } from './src/distributed/memory-sync';

const memorySync = new MemorySyncManager({
  workerId: 'worker-1',
  batchInterval: 100,
  heartbeatInterval: 5000
});
```

## 📋 Common Operations

### Task Management

```typescript
// Sync task state
await memorySync.syncTaskState('task-123', {
  status: 'processing',
  progress: 50
});

// Get task state
const state = await memorySync.getTaskState('task-123');

// Update progress
await memorySync.syncTaskProgress('task-123', 75, 'processing');

// Lock task
const acquired = await memorySync.acquireTaskLock('task-123', 30000);
if (acquired) {
  try {
    // Do work
  } finally {
    await memorySync.releaseTaskLock('task-123');
  }
}
```

### Worker Coordination

```typescript
// Register worker
await memorySync.syncWorkerStatus('worker-1', {
  state: 'active',
  tasks: ['task-1'],
  capacity: 5
});

// Update capacity
await memorySync.syncWorkerCapacity('worker-1', 3);

// Get active workers
const workers = await memorySync.getActiveWorkers();
```

### Agent Coordination

```typescript
// Sync agent data
await memorySync.syncAgentCoordination('task-123', 'agent-1', {
  phase: 'implementation',
  progress: 50
});

// Get agent data
const agentData = await memorySync.getAgentCoordination('task-123', 'agent-1');

// List task agents
const agents = await memorySync.getTaskAgents('task-123');
```

### Queue Management

```typescript
// Sync queue
await memorySync.syncQueue({
  pending: ['task-1', 'task-2'],
  processing: ['task-3']
});

// Get queue
const queue = await memorySync.getQueue();

// Sync metrics
await memorySync.syncMetrics({
  totalTasks: 100,
  completed: 80
});
```

## 🔔 Subscriptions

```typescript
// Subscribe to changes
const subId = memorySync.subscribe('task-sentinel/tasks/*/state', {
  onChange: (key, value) => {
    console.log('Task changed:', key, value);
  }
});

// Unsubscribe
memorySync.unsubscribe(subId);
```

## ⚡ Performance Tips

```typescript
// Batch operations
await Promise.all([
  memorySync.syncTaskState('t1', state1),
  memorySync.syncTaskState('t2', state2),
  memorySync.syncTaskState('t3', state3)
]);

// Force immediate flush
await memorySync.forceSync();

// Clear cache
memorySync.clearCache();
```

## 📊 Metrics

```typescript
const metrics = memorySync.getMetrics();

console.log({
  reads: metrics.reads,
  writes: metrics.writes,
  cacheHitRate: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses),
  conflicts: metrics.conflicts
});
```

## 🎨 Conflict Resolution

```typescript
// Custom resolver
const resolver: ConflictResolver = (entries) => {
  // Your logic here
  return {
    resolved: winningValue,
    strategy: 'custom',
    discarded: losers
  };
};

const manager = new MemorySyncManager({
  workerId: 'worker-1',
  conflictResolver: resolver
});
```

## 🛑 Cleanup

```typescript
// Graceful shutdown
await memorySync.shutdown();
```

## 🔧 Configuration Options

```typescript
interface MemorySyncConfig {
  workerId: string;              // Required
  defaultTTL?: number;           // Default: 3600s
  cacheSize?: number;            // Default: 1000
  batchInterval?: number;        // Default: 100ms
  heartbeatInterval?: number;    // Default: 5000ms
  conflictResolver?: ConflictResolver;
}
```

## 📍 Memory Namespaces

```
task-sentinel/
├── tasks/[task-id]/
│   ├── state
│   ├── lock
│   ├── progress
│   └── agents/[agent-id]
│
├── workers/[worker-id]/
│   ├── status
│   ├── heartbeat
│   └── capacity
│
└── coordination/
    ├── queue
    ├── assignments
    └── metrics
```

## ⚠️ Common Patterns

### Lock Pattern
```typescript
const acquired = await memorySync.acquireTaskLock(taskId);
if (acquired) {
  try {
    // Critical section
  } finally {
    await memorySync.releaseTaskLock(taskId);
  }
}
```

### Retry Pattern
```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}
```

### Subscribe Pattern
```typescript
memorySync.subscribe('pattern/*', {
  onChange: (key, value) => {
    // Handle change
  },
  onInvalidate: (key) => {
    // Handle invalidation
  }
});
```

## 🐛 Debugging

```typescript
// Enable logging
memorySync.on('write', ({ key, value }) => {
  console.log('Write:', key, value);
});

memorySync.on('conflict-resolved', ({ strategy, entries }) => {
  console.log('Conflict:', strategy, entries);
});

memorySync.on('batch-flushed', ({ count }) => {
  console.log('Flushed:', count, 'writes');
});
```

## 📚 Full Documentation

- [Architecture Guide](./memory-sync-architecture.md)
- [Integration Guide](./memory-sync-integration.md)
- [Phase 3 Summary](./phase3-memory-sync-summary.md)
- [Examples](../examples/memory-sync-example.ts)
