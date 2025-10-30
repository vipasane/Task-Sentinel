# Heartbeat Protocol - Task Sentinel Phase 3

## Overview

The Heartbeat Protocol ensures worker liveness and enables automatic detection and recovery of stale task locks. Workers send periodic heartbeats to prove they're alive and actively working on claimed tasks.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Heartbeat Monitor                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐        ┌────────────────┐                 │
│  │   Heartbeat  │        │  Stale Lock    │                 │
│  │   Sender     │        │  Detector      │                 │
│  │  (5 min)     │        │  (1 min)       │                 │
│  └──────┬───────┘        └───────┬────────┘                 │
│         │                        │                           │
│         ▼                        ▼                           │
│  ┌─────────────────────────────────────┐                    │
│  │      Destination Manager            │                    │
│  ├─────────────────────────────────────┤                    │
│  │ • MCP Memory Storage                │                    │
│  │ • GitHub Issue Comments             │                    │
│  │ • Metrics Collection                │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Heartbeat Data Structure

### Heartbeat Message

```typescript
interface HeartbeatData {
  worker_id: string;              // Unique worker identifier
  timestamp: number;              // Unix timestamp (ms)
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  current_tasks: string[];        // Task IDs currently being worked on
  capacity_available: number;     // Number of additional tasks worker can handle
  metrics: WorkerMetrics;
}

interface WorkerMetrics {
  cpu_usage: number;              // CPU usage percentage
  memory_usage: number;           // Memory usage in MB
  tasks_completed: number;        // Total tasks completed
  tasks_failed: number;           // Total tasks failed
  uptime: number;                 // Worker uptime in seconds
}
```

### Example Heartbeat

```json
{
  "worker_id": "worker-local-1",
  "timestamp": 1704067200000,
  "health_status": "healthy",
  "current_tasks": ["task-123", "task-456"],
  "capacity_available": 3,
  "metrics": {
    "cpu_usage": 45.2,
    "memory_usage": 2048,
    "tasks_completed": 42,
    "tasks_failed": 2,
    "uptime": 7200
  }
}
```

## Heartbeat Intervals

### Timing Configuration

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `heartbeat_interval` | 5 minutes | How often to send heartbeats |
| `stale_threshold` | 10 minutes | Time before lock is considered stale |
| `detection_interval` | 1 minute | How often to check for stale locks |
| `retry_attempts` | 3 | Number of retry attempts on failure |
| `retry_delay` | 5 seconds | Delay between retry attempts |

### Timeline Example

```
Time    Event
─────   ─────────────────────────────────────────────────
0:00    Worker claims task
0:00    Initial heartbeat sent
0:05    Regular heartbeat sent
0:10    Regular heartbeat sent
0:15    Worker crashes (no heartbeat)
0:16    Stale detection runs (no action - not stale yet)
0:17    Stale detection runs (no action)
...
0:25    Stale detection runs (STALE - 10 min since last heartbeat)
0:25    Lock recovery initiated
0:25    Task returned to queue
```

## Heartbeat Destinations

### 1. MCP Memory Storage

**Purpose:** Persistent storage for heartbeat data and worker state

**Key Pattern:** `task-sentinel/workers/[worker-id]/heartbeat`

**Storage:**
```bash
npx @modelcontextprotocol/server-memory store \
  "task-sentinel/workers/worker-local-1/heartbeat" \
  '{"worker_id":"worker-local-1","timestamp":1704067200000,...}'
```

**Retrieval:**
```bash
npx @modelcontextprotocol/server-memory retrieve \
  "task-sentinel/workers/worker-local-1/heartbeat"
```

### 2. GitHub Issue Comments

**Purpose:** Visible proof of worker activity on claimed tasks

**Format:**
```markdown
💓 **Worker Heartbeat**

Worker: `worker-local-1`
Status: ✅ healthy
Timestamp: 2024-01-01T00:00:00.000Z
Active Tasks: 2
Available Capacity: 3

**Metrics:**
- CPU: 45.2%
- Memory: 2048.0 MB
- Uptime: 2h 0m
- Completed: 42
```

**Command:**
```bash
gh issue comment 123 \
  --repo org/repo \
  --body "💓 **Worker Heartbeat**..."
```

### 3. Metrics Collection

**Purpose:** Time-series data for monitoring and analysis

**Key Pattern:** `task-sentinel/metrics/heartbeats/[worker-id]/[timestamp]`

**Data:**
```json
{
  "timestamp": 1704067200000,
  "health_status": "healthy",
  "task_count": 2,
  "capacity_available": 3,
  "metrics": {
    "cpu_usage": 45.2,
    "memory_usage": 2048,
    "tasks_completed": 42,
    "tasks_failed": 2,
    "uptime": 7200
  }
}
```

## Stale Lock Detection

### Detection Algorithm

```typescript
async detectStaleLocks() {
  // 1. Get all claimed tasks
  const claimed_tasks = await getClaimedTasks();

  // 2. Check each task
  for (const lock of claimed_tasks) {
    const last_heartbeat = await getLastHeartbeat(lock.worker_id);

    // 3. Calculate staleness
    const stale_duration = Date.now() - last_heartbeat;

    // 4. Check threshold
    if (stale_duration > stale_threshold) {
      console.log(`Stale lock detected: ${lock.task_id}`);
      await recoverStaleLock(lock);
    }
  }
}
```

### Stale Lock Criteria

A lock is considered **stale** if:

1. ✅ Task has `status:in-progress` label
2. ✅ Task has assignee
3. ✅ Last heartbeat > 10 minutes ago
4. ✅ No heartbeat data found in memory

## Lock Recovery Protocol

### Recovery Steps

```typescript
async recoverStaleLock(lock: TaskLock) {
  // 1. Verify staleness (double-check)
  const last_heartbeat = await getLastHeartbeat(lock.worker_id);
  const stale_duration = Date.now() - last_heartbeat;

  if (stale_duration <= stale_threshold) {
    return; // No longer stale
  }

  // 2. Remove assignment
  await gh.issue.removeAssignee(lock.issue_number, lock.worker_id);

  // 3. Add recovery comment
  await gh.issue.comment(lock.issue_number, `
    ⚠️ **Stale Lock Detected**

    Worker \`${lock.worker_id}\` last seen ${formatDuration(stale_duration)} ago.

    **Actions Taken:**
    - ✅ Assignment removed
    - ✅ Lock released
    - ✅ Task returned to queue

    Task is now available for other workers to claim.
  `);

  // 4. Update labels
  await gh.issue.addLabel(lock.issue_number, 'status:queued');
  await gh.issue.removeLabel(lock.issue_number, 'status:in-progress');

  // 5. Clean up memory
  await memory.delete(`task-sentinel/tasks/${lock.task_id}/lock`);

  // 6. Record metrics
  await recordLockRecovery(lock, stale_duration);
}
```

### Recovery Comment Format

```markdown
⚠️ **Stale Lock Detected**

Worker `worker-local-1` last seen 15m 32s ago.

**Actions Taken:**
- ✅ Assignment removed
- ✅ Lock released
- ✅ Task returned to queue

Task is now available for other workers to claim.
```

## Health Status Determination

### Health Levels

| Status | Criteria | Description |
|--------|----------|-------------|
| `healthy` | CPU < 70%, Memory < 4GB | Normal operation |
| `degraded` | CPU 70-90%, Memory 4-8GB | Reduced capacity |
| `unhealthy` | CPU > 90%, Memory > 8GB | Critical state |

### Status Calculation

```typescript
function determineHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
  const { cpu_usage, memory_usage } = metrics;

  if (cpu_usage > 90 || memory_usage > 8192) {
    return 'unhealthy';
  } else if (cpu_usage > 70 || memory_usage > 4096) {
    return 'degraded';
  }

  return 'healthy';
}
```

## Failure Handling

### Heartbeat Send Failures

**Retry Logic:**
```typescript
async sendHeartbeat() {
  for (let attempt = 1; attempt <= retry_attempts; attempt++) {
    try {
      await sendHeartbeatToDestinations(heartbeat);
      return; // Success
    } catch (error) {
      if (attempt < retry_attempts) {
        await sleep(retry_delay);
      } else {
        // Log failure and continue
        await handleHeartbeatFailure(error);
      }
    }
  }
}
```

**Failure Tracking:**
```typescript
interface HeartbeatFailure {
  timestamp: number;
  error: string;
  consecutive_failures: number;
}
```

**Alert Threshold:** 3 consecutive failures

### Graceful Degradation

When heartbeats fail:

1. ✅ Worker continues processing tasks
2. ✅ Failures logged to memory
3. ✅ Alerts triggered after 3 failures
4. ⚠️ Risk of stale lock if failures persist > 10 minutes

## API Reference

### HeartbeatMonitor Class

#### Constructor

```typescript
new HeartbeatMonitor(
  worker_id: string,
  github_repo: string,
  config?: Partial<HeartbeatConfig>
)
```

#### Methods

| Method | Description |
|--------|-------------|
| `start()` | Start heartbeat monitoring |
| `stop()` | Stop heartbeat monitoring |
| `addTask(task_id)` | Register task as being worked on |
| `removeTask(task_id)` | Remove task from active list |
| `recordTaskCompletion()` | Increment completion counter |
| `recordTaskFailure()` | Increment failure counter |
| `getMetrics()` | Get current worker metrics |
| `getHealthStatus()` | Get current health status |

#### Example Usage

```typescript
import { HeartbeatMonitor } from './heartbeat-monitor';

// Create monitor
const monitor = new HeartbeatMonitor(
  'worker-local-1',
  'org/repo',
  {
    heartbeat_interval: 5 * 60 * 1000,    // 5 minutes
    stale_threshold: 10 * 60 * 1000,      // 10 minutes
    detection_interval: 1 * 60 * 1000,    // 1 minute
  }
);

// Start monitoring
await monitor.start();

// Register task
monitor.addTask('task-123');

// ... work on task ...

// Complete task
monitor.removeTask('task-123');
monitor.recordTaskCompletion();

// Stop monitoring
await monitor.stop();
```

## Monitoring and Debugging

### View Worker Heartbeats

```bash
# Get latest heartbeat for worker
npx @modelcontextprotocol/server-memory retrieve \
  "task-sentinel/workers/worker-local-1/heartbeat"

# List all workers
npx @modelcontextprotocol/server-memory list-keys \
  "task-sentinel/workers/*/heartbeat"
```

### View Lock Recovery History

```bash
# List all lock recoveries
npx @modelcontextprotocol/server-memory list-keys \
  "task-sentinel/metrics/lock-recoveries/*"

# Get specific recovery
npx @modelcontextprotocol/server-memory retrieve \
  "task-sentinel/metrics/lock-recoveries/1704067200000"
```

### View Heartbeat Failures

```bash
# Get failure log for worker
npx @modelcontextprotocol/server-memory retrieve \
  "task-sentinel/workers/worker-local-1/heartbeat-failures"
```

## Best Practices

### For Workers

1. ✅ Start heartbeat monitor before claiming tasks
2. ✅ Register tasks immediately after claiming
3. ✅ Update task status regularly
4. ✅ Remove tasks when completed or failed
5. ✅ Stop monitor gracefully on shutdown

### For System Operators

1. ✅ Monitor heartbeat failure rates
2. ✅ Track lock recovery frequency
3. ✅ Adjust thresholds based on workload
4. ✅ Set up alerts for high failure rates
5. ✅ Review stale lock patterns

### Configuration Tuning

**For fast-changing tasks:**
```typescript
{
  heartbeat_interval: 2 * 60 * 1000,   // 2 minutes
  stale_threshold: 5 * 60 * 1000,      // 5 minutes
  detection_interval: 30 * 1000,       // 30 seconds
}
```

**For long-running tasks:**
```typescript
{
  heartbeat_interval: 10 * 60 * 1000,  // 10 minutes
  stale_threshold: 30 * 60 * 1000,     // 30 minutes
  detection_interval: 5 * 60 * 1000,   // 5 minutes
}
```

## Troubleshooting

### Issue: Heartbeats not being received

**Symptoms:**
- No heartbeat data in memory
- No GitHub comments appearing

**Possible Causes:**
1. MCP Memory server not running
2. GitHub CLI not authenticated
3. Network connectivity issues

**Solutions:**
```bash
# Check MCP Memory
npx @modelcontextprotocol/server-memory list-keys "task-sentinel/*"

# Check GitHub CLI
gh auth status

# Test heartbeat manually
npx @modelcontextprotocol/server-memory store \
  "test-heartbeat" \
  '{"test": true}'
```

### Issue: False stale lock detections

**Symptoms:**
- Locks recovered even though worker is active
- Tasks repeatedly returned to queue

**Possible Causes:**
1. Stale threshold too low
2. Heartbeat interval too long
3. Clock skew between systems

**Solutions:**
```typescript
// Increase stale threshold
{
  stale_threshold: 15 * 60 * 1000,  // 15 minutes instead of 10
}

// Decrease heartbeat interval
{
  heartbeat_interval: 3 * 60 * 1000,  // 3 minutes instead of 5
}
```

### Issue: Heartbeat failures persisting

**Symptoms:**
- Multiple consecutive failures logged
- Alerts triggering frequently

**Possible Causes:**
1. Rate limiting from GitHub API
2. Memory storage issues
3. Resource constraints

**Solutions:**
```bash
# Check rate limits
gh api rate_limit

# Check system resources
free -h
top -bn1 | head -20

# Increase retry delay
{
  retry_delay: 10000,  // 10 seconds
}
```

## Security Considerations

### Heartbeat Data Privacy

- ✅ Worker IDs should be anonymized in public repos
- ✅ Metrics should not contain sensitive information
- ✅ Heartbeat comments should be concise and professional

### Rate Limiting

- ⚠️ GitHub API has rate limits (5000/hour authenticated)
- ✅ Heartbeat comments count against this limit
- ✅ Consider reducing comment frequency for high worker counts

### Authentication

- ✅ GitHub CLI must be authenticated with proper scopes
- ✅ MCP Memory should be secured if exposed
- ✅ Worker IDs should be validated and sanitized

## Performance Characteristics

### Resource Usage

**Per Worker:**
- Memory: ~10-20 MB
- CPU: <1% (mostly idle)
- Network: ~1 KB/heartbeat

**At Scale (100 workers):**
- Memory: ~1-2 GB
- Network: ~100 KB/5min
- GitHub API calls: ~100/5min

### Scalability

**Tested Configurations:**
- ✅ 10 workers: Excellent performance
- ✅ 50 workers: Good performance
- ⚠️ 100+ workers: Consider batching GitHub comments

## Future Enhancements

### Planned Features

1. **Adaptive Intervals:** Adjust heartbeat frequency based on worker health
2. **Heartbeat Aggregation:** Batch GitHub comments for multiple workers
3. **Distributed Detection:** Run stale detection across multiple monitors
4. **Health Prediction:** ML-based prediction of worker failures
5. **Auto-Rebalancing:** Move tasks from unhealthy to healthy workers

### Experimental Features

1. **P2P Heartbeats:** Workers send heartbeats directly to each other
2. **Blockchain Verification:** Cryptographic proof of work via heartbeats
3. **Gossip Protocol:** Distributed heartbeat propagation
4. **Smart Contracts:** Automated lock recovery via smart contracts

## References

- [Task Sentinel Architecture](./architecture.md)
- [Distributed Locking Protocol](./locking-protocol.md)
- [Worker Implementation Guide](./worker-guide.md)
- [MCP Memory Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- [GitHub CLI Documentation](https://cli.github.com/)
