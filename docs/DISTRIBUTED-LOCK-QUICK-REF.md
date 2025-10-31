# Distributed Lock Manager - Quick Reference

## 🚀 Quick Start

```typescript
import { LockManager, ConflictStrategy } from './src/distributed';

const lockManager = new LockManager({
  githubRepo: 'owner/repo',
  maxRetries: 5,
  initialBackoffMs: 1000,
  maxBackoffMs: 16000
});

// Acquire → Execute → Release
const result = await lockManager.acquireLock(issueNumber, {
  workerId: 'worker-1',
  nodeId: 'node-abc',
  taskInfo: { complexity: 5, estimated_duration: '30min' }
});

if (result.success) {
  try {
    await doWork();
  } finally {
    await lockManager.releaseLock(issueNumber, 'worker-1');
  }
}
```

## 📋 Core API

### LockManager Constructor

```typescript
new LockManager({
  githubRepo: string;           // Required: 'owner/repo'
  maxRetries: number;           // Default: 5
  initialBackoffMs: number;     // Default: 1000
  maxBackoffMs: number;         // Default: 16000
  heartbeatIntervalMs: number;  // Default: 30000
  lockTimeoutMs: number;        // Default: 300000 (5 min)
})
```

### acquireLock()

```typescript
await lockManager.acquireLock(issueNumber, {
  workerId: string;             // Required: Worker ID
  nodeId: string;               // Required: Node ID
  taskInfo: {                   // Required: Task metadata
    complexity: number;
    estimated_duration: string;
    task_type?: string;
    priority?: string;
  };
  conflictStrategy?: ConflictStrategy;  // Optional
  maxRetries?: number;          // Optional: Override default
})

// Returns: LockResult
{
  success: boolean;
  lockId: string;
  metadata?: LockMetadata;
  error?: string;
  retries?: number;
}
```

### releaseLock()

```typescript
await lockManager.releaseLock(
  issueNumber: number,
  workerId: string
)

// Returns: ReleaseResult
{
  success: boolean;
  lockId: string;
  releasedAt: string;
  error?: string;
}
```

### getLockStatus()

```typescript
const status = await lockManager.getLockStatus(issueNumber);

// Returns: LockStatus
{
  isLocked: boolean;
  assignee?: string;
  metadata?: LockMetadata;
  issueNumber: number;
  createdAt: string;
  updatedAt: string;
}
```

### getMetrics()

```typescript
const metrics = lockManager.getMetrics();

// Returns: LockMetrics
{
  totalAcquisitions: number;
  totalReleases: number;
  totalConflicts: number;
  totalRetries: number;
  averageAcquisitionTimeMs: number;
  failedAcquisitions: number;
  staleLocksClaimed: number;
}
```

## 🎯 Conflict Resolution Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **RETRY** (default) | Exponential backoff, max retries | Temporary conflicts |
| **FAIL_FAST** | Immediate failure if locked | Optional tasks |
| **STEAL_STALE** | Force release if stale (>5min) | Crash recovery |
| **FORCE_ACQUIRE** | Always acquire (dangerous!) | Admin operations only |

### Example: FAIL_FAST

```typescript
const result = await lockManager.acquireLock(123, {
  workerId: 'worker-1',
  nodeId: 'node-abc',
  taskInfo: { complexity: 3, estimated_duration: '15min' },
  conflictStrategy: ConflictStrategy.FAIL_FAST
});

if (!result.success) {
  console.log('Task already being processed, skipping');
  return;
}
```

### Example: STEAL_STALE

```typescript
const result = await lockManager.acquireLock(456, {
  workerId: 'recovery-worker',
  nodeId: 'node-recovery',
  taskInfo: { complexity: 5, estimated_duration: '30min' },
  conflictStrategy: ConflictStrategy.STEAL_STALE
});

if (result.success) {
  console.log('Recovered stale lock from crashed worker');
}
```

## ⚡ Common Patterns

### Pattern 1: Worker with Automatic Release

```typescript
async function processTask(issueNumber: number) {
  const lock = await lockManager.acquireLock(issueNumber, {
    workerId: 'worker-1',
    nodeId: 'node-abc',
    taskInfo: { complexity: 5, estimated_duration: '30min' }
  });

  if (!lock.success) return false;

  try {
    await executeTask(issueNumber);
    return true;
  } finally {
    await lockManager.releaseLock(issueNumber, 'worker-1');
  }
}
```

### Pattern 2: Check Status Before Acquire

```typescript
const status = await lockManager.getLockStatus(issueNumber);

if (status.isLocked) {
  console.log(`Locked by ${status.assignee} since ${status.metadata?.lock.claimed_at}`);
  return;
}

const result = await lockManager.acquireLock(issueNumber, options);
```

### Pattern 3: Multi-Worker with Priorities

```typescript
// High-priority worker with STEAL_STALE
const highPriWorker = new LockManager({
  githubRepo: 'owner/repo',
  lockTimeoutMs: 180000  // 3 minutes
});

const result = await highPriWorker.acquireLock(issueNumber, {
  workerId: 'high-pri-worker',
  nodeId: 'node-high',
  taskInfo: { complexity: 8, estimated_duration: '1hour', priority: 'critical' },
  conflictStrategy: ConflictStrategy.STEAL_STALE
});
```

### Pattern 4: Monitor Metrics

```typescript
setInterval(() => {
  const metrics = lockManager.getMetrics();
  console.log(`
    Acquisitions: ${metrics.totalAcquisitions}
    Conflicts: ${metrics.totalConflicts}
    Avg Time: ${metrics.averageAcquisitionTimeMs}ms
    Failures: ${metrics.failedAcquisitions}
  `);
}, 60000);  // Every minute
```

## 🔧 Configuration Examples

### Development (Fast Retries)

```typescript
new LockManager({
  githubRepo: 'owner/repo',
  maxRetries: 3,
  initialBackoffMs: 500,
  maxBackoffMs: 4000,
  heartbeatIntervalMs: 15000,
  lockTimeoutMs: 120000  // 2 minutes
})
```

### Production (Conservative)

```typescript
new LockManager({
  githubRepo: 'owner/repo',
  maxRetries: 5,
  initialBackoffMs: 1000,
  maxBackoffMs: 16000,
  heartbeatIntervalMs: 30000,
  lockTimeoutMs: 300000  // 5 minutes
})
```

### Aggressive Stale Recovery

```typescript
new LockManager({
  githubRepo: 'owner/repo',
  maxRetries: 8,
  initialBackoffMs: 500,
  maxBackoffMs: 32000,
  heartbeatIntervalMs: 20000,
  lockTimeoutMs: 180000  // 3 minutes
})
```

## 📊 Lock Metadata Format

```json
{
  "lock": {
    "worker_id": "worker-local-1",
    "node_id": "node-abc123",
    "claimed_at": "2025-10-30T21:30:00Z",
    "heartbeat_last": "2025-10-30T21:35:00Z",
    "task_info": {
      "complexity": 5,
      "estimated_duration": "45min",
      "task_type": "bug-fix",
      "priority": "high"
    }
  }
}
```

## ⚠️ Common Errors

### 1. Lock Acquisition Failed

```typescript
{
  success: false,
  error: "Failed to acquire lock after 5 retries"
}
```

**Solution**: Increase `maxRetries` or use `STEAL_STALE` strategy

### 2. Not Lock Owner

```typescript
{
  success: false,
  error: "Lock is owned by worker-2, not worker-1"
}
```

**Solution**: Verify worker ID matches

### 3. GitHub Rate Limit

```typescript
{
  success: false,
  error: "API rate limit exceeded"
}
```

**Solution**: Wait for rate limit reset, increase backoff intervals

### 4. Stale Lock

```typescript
{
  success: false,
  error: "Issue already locked by stale-worker"
}
```

**Solution**: Use `ConflictStrategy.STEAL_STALE`

## 🎯 Performance Benchmarks

| Metric | Value |
|--------|-------|
| Lock acquisition (no conflicts) | 200-500ms |
| Lock acquisition (with 1 retry) | 1.5-2.5s |
| Lock acquisition (with 3 retries) | 7-10s |
| Lock release | 200-300ms |
| Heartbeat overhead | ~100ms/30s |
| Max throughput | ~5000 ops/hour (GitHub limit) |

## 🧪 Testing

### Unit Tests

```bash
npm test tests/distributed/lock-manager.test.ts
```

### Integration Tests (Manual)

```bash
# Set test repo
export GITHUB_REPO="your-org/test-repo"

# Create test issue
gh issue create --title "Test Lock" --body "Testing distributed lock"

# Run test
node src/distributed/examples/basic-usage.ts
```

## 🔗 Resources

- **Full Documentation**: [docs/distributed-locking.md](./distributed-locking.md)
- **Architecture Decision**: [docs/architecture/distributed-lock-design.md](./architecture/distributed-lock-design.md)
- **Examples**: [src/distributed/examples/basic-usage.ts](../src/distributed/examples/basic-usage.ts)
- **Tests**: [tests/distributed/lock-manager.test.ts](../tests/distributed/lock-manager.test.ts)

## 🚨 Best Practices

1. ✅ **Always release locks** in `finally` block
2. ✅ **Use FAIL_FAST** for optional tasks
3. ✅ **Use STEAL_STALE** for recovery scenarios
4. ✅ **Monitor metrics** for bottleneck detection
5. ✅ **Configure timeouts** based on task duration
6. ❌ **Never use FORCE_ACQUIRE** in production
7. ❌ **Don't store sensitive data** in lock metadata
8. ❌ **Don't skip error handling**

## 📞 Support

- 📖 [Full Documentation](./distributed-locking.md)
- 🐛 [Report Issues](https://github.com/yourusername/Task-Sentinel/issues)
- 💬 [Discussions](https://github.com/yourusername/Task-Sentinel/discussions)

---

**Quick Start**: Import → Configure → Acquire → Execute → Release → Monitor
