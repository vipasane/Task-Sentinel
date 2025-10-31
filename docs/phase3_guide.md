# Task Sentinel Phase 3: Distributed Execution Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Configuration](#configuration)
5. [Deployment Patterns](#deployment-patterns)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)
8. [Performance Tuning](#performance-tuning)
9. [Security Considerations](#security-considerations)

---

## Overview

Task Sentinel Phase 3 introduces distributed execution capabilities, enabling multiple workers to coordinate task processing across different machines, containers, or processes. This phase builds upon Phase 1 (Core) and Phase 2 (GitHub Integration) to provide scalable, fault-tolerant task orchestration.

### Key Features

- **Distributed Locking**: Prevents concurrent execution of the same task across workers
- **Worker Coordination**: Automatic discovery and health monitoring of workers
- **Memory Synchronization**: Consistent state across distributed workers
- **Load Balancing**: Intelligent task distribution based on worker capacity
- **Heartbeat Monitoring**: Automatic detection and recovery from worker failures

### Use Cases

- **High-Volume Processing**: Scale horizontally to handle thousands of tasks
- **Fault Tolerance**: Continue operations when individual workers fail
- **Geographic Distribution**: Deploy workers across regions for low-latency processing
- **Resource Isolation**: Separate task processing by environment or security domain

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Task Sentinel Cluster                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Worker 1   │      │   Worker 2   │      │   Worker 3   │  │
│  │              │      │              │      │              │  │
│  │ ┌──────────┐ │      │ ┌──────────┐ │      │ ┌──────────┐ │  │
│  │ │ Executor │ │      │ │ Executor │ │      │ │ Executor │ │  │
│  │ └──────────┘ │      │ └──────────┘ │      │ └──────────┘ │  │
│  │              │      │              │      │              │  │
│  │ ┌──────────┐ │      │ ┌──────────┐ │      │ ┌──────────┐ │  │
│  │ │Heartbeat │ │      │ │Heartbeat │ │      │ │Heartbeat │ │  │
│  │ └──────────┘ │      │ └──────────┘ │      │ └──────────┘ │  │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘  │
│         │                     │                     │           │
│         └─────────────────────┼─────────────────────┘           │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │     Coordination Layer (GitHub)           │
        ├───────────────────────────────────────────┤
        │                                           │
        │  ┌─────────────┐    ┌─────────────────┐  │
        │  │ Lock Store  │    │ Worker Registry │  │
        │  │ (Comments)  │    │  (Comments)     │  │
        │  └─────────────┘    └─────────────────┘  │
        │                                           │
        │  ┌─────────────┐    ┌─────────────────┐  │
        │  │ Memory Sync │    │  Task Queue     │  │
        │  │ (Comments)  │    │  (Issues)       │  │
        │  └─────────────┘    └─────────────────┘  │
        │                                           │
        └───────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌──────────┐
│  Worker  │
│ Startup  │
└────┬─────┘
     │
     ├─► 1. Register with WorkerRegistry
     │   └─► Creates worker metadata comment
     │
     ├─► 2. Start HeartbeatMonitor
     │   └─► Periodic updates to worker status
     │
     ├─► 3. Subscribe to MemorySyncManager
     │   └─► Listen for memory updates
     │
     ▼
┌────────────┐
│ Task Loop  │
└────┬───────┘
     │
     ├─► 4. LoadBalancer.getNextTask()
     │   └─► Selects task based on worker capacity
     │
     ├─► 5. LockManager.acquireLock()
     │   └─► Attempts distributed lock
     │   │
     │   ├─► Success: Proceed to execution
     │   └─► Failure: Skip to next task
     │
     ├─► 6. Execute Task
     │   └─► Run task logic
     │
     ├─► 7. MemorySyncManager.set()
     │   └─► Update shared state
     │
     └─► 8. LockManager.releaseLock()
         └─► Release distributed lock
```

### Lock Acquisition Sequence

```
Worker A                  GitHub                 Worker B
   │                        │                       │
   ├──► acquireLock ────────┤                       │
   │    (task-123)          │                       │
   │                        │                       │
   │    ◄──── Lock Not ─────┤                       │
   │          Found         │                       │
   │                        │                       │
   ├──► createLock ─────────┤                       │
   │    (metadata)          │                       │
   │                        │                       │
   │    ◄──── Lock ─────────┤                       │
   │        Created         │                       │
   │                        │                       │
   │    [Execute Task]      │                       │
   │                        │                       │
   │                        │◄──── acquireLock ─────┤
   │                        │     (task-123)        │
   │                        │                       │
   │                        ├────► Lock Exists ────►│
   │                        │     (Worker A)        │
   │                        │                       │
   │                        │     [Skip Task] ◄─────┤
   │                        │                       │
   ├──► releaseLock ────────┤                       │
   │    (task-123)          │                       │
   │                        │                       │
   │    ◄──── Lock ─────────┤                       │
   │       Deleted          │                       │
   │                        │                       │
```

---

## Core Components

### 1. LockManager

Manages distributed locks to prevent concurrent execution of the same task.

**Key Responsibilities:**
- Lock acquisition with conflict detection
- Automatic lock expiration (TTL)
- Stale lock cleanup
- Lock metadata tracking

**Storage Mechanism:**
Locks are stored as GitHub issue comments with the format:
```json
{
  "type": "DISTRIBUTED_LOCK",
  "task_id": "task-123",
  "worker_id": "worker-abc",
  "acquired_at": "2025-10-30T10:00:00Z",
  "expires_at": "2025-10-30T10:05:00Z",
  "metadata": {
    "hostname": "worker-1.example.com",
    "pid": 12345
  }
}
```

**Lock Lifecycle:**
1. **Acquisition**: Worker attempts to create lock comment
2. **Validation**: Checks for existing locks, validates expiration
3. **Execution**: Task runs while lock is held
4. **Release**: Lock comment deleted upon completion
5. **Expiration**: Automatic cleanup after TTL

### 2. WorkerRegistry

Tracks active workers and their capabilities.

**Key Responsibilities:**
- Worker registration and deregistration
- Health status tracking
- Capacity management
- Worker discovery

**Worker Metadata:**
```json
{
  "type": "WORKER_REGISTRATION",
  "worker_id": "worker-abc",
  "hostname": "worker-1.example.com",
  "registered_at": "2025-10-30T10:00:00Z",
  "last_heartbeat": "2025-10-30T10:05:00Z",
  "status": "active",
  "capacity": {
    "max_tasks": 10,
    "active_tasks": 3,
    "available_slots": 7
  },
  "capabilities": {
    "cpu_cores": 4,
    "memory_mb": 8192,
    "supported_task_types": ["build", "test", "deploy"]
  }
}
```

### 3. MemorySyncManager

Provides consistent shared state across workers.

**Key Responsibilities:**
- Memory namespace isolation
- Conflict resolution (last-write-wins)
- Cache coherence
- Cross-worker state synchronization

**Memory Namespaces:**
- `swarm/*` - Swarm coordination data
- `tasks/*` - Task-specific state
- `workers/*` - Worker-specific data
- `global/*` - Global shared state

**Synchronization Strategy:**
```
Local Cache ──► Check GitHub ──► Merge Strategy ──► Update Local
     │               │                  │                │
     │               │                  │                │
     └───────────────┴──────────────────┴────────────────┘
                    Conflict Resolution
              (Last-Write-Wins + Timestamps)
```

### 4. LoadBalancer

Distributes tasks across workers based on capacity and affinity.

**Balancing Strategies:**

1. **Round-Robin**: Simple rotation through workers
2. **Least-Loaded**: Select worker with lowest active task count
3. **Capacity-Based**: Weight by available capacity
4. **Affinity-Based**: Prefer workers that previously handled similar tasks

**Selection Algorithm:**
```
FOR each available task:
  1. Filter workers by capability
  2. Exclude unhealthy workers
  3. Apply affinity rules (if configured)
  4. Score workers by strategy
  5. Select highest-scoring worker
  6. Update worker capacity
```

### 5. HeartbeatMonitor

Monitors worker health and handles failure detection.

**Key Responsibilities:**
- Periodic heartbeat updates
- Stale worker detection
- Automatic lock recovery
- Failure notifications

**Heartbeat Protocol:**
```
┌─────────────┐
│   Worker    │
└──────┬──────┘
       │
       ├─► Heartbeat (every 30s)
       │   └─► Update last_heartbeat timestamp
       │
       ├─► Check Staleness (every 60s)
       │   └─► Detect workers with old heartbeats
       │
       └─► Cleanup Stale Locks
           └─► Release locks from failed workers
```

**Failure Detection:**
- **Stale Threshold**: 2x heartbeat interval (default: 120s)
- **Recovery Actions**:
  1. Mark worker as unhealthy
  2. Release all locks held by worker
  3. Reassign active tasks
  4. Log failure event

---

## Configuration

### Environment Variables

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo

# Worker Configuration
WORKER_ID=worker-001
WORKER_HOSTNAME=worker-1.example.com
WORKER_MAX_TASKS=10

# Distributed Locking
LOCK_TTL_SECONDS=300
LOCK_RETRY_ATTEMPTS=3
LOCK_RETRY_DELAY_MS=1000

# Heartbeat Configuration
HEARTBEAT_INTERVAL_MS=30000
STALE_WORKER_THRESHOLD_MS=120000

# Load Balancing
LOAD_BALANCE_STRATEGY=least_loaded
TASK_AFFINITY_ENABLED=true

# Memory Synchronization
MEMORY_SYNC_INTERVAL_MS=5000
MEMORY_CACHE_SIZE=1000
```

### Configuration File (task-sentinel.config.json)

```json
{
  "distributed": {
    "enabled": true,
    "workerId": "${WORKER_ID}",
    "hostname": "${WORKER_HOSTNAME}",

    "locking": {
      "ttlSeconds": 300,
      "retryAttempts": 3,
      "retryDelayMs": 1000,
      "cleanupIntervalMs": 60000
    },

    "registry": {
      "maxWorkers": 100,
      "healthCheckIntervalMs": 30000,
      "staleThresholdMs": 120000
    },

    "heartbeat": {
      "intervalMs": 30000,
      "staleThresholdMs": 120000,
      "recoveryEnabled": true
    },

    "loadBalancer": {
      "strategy": "least_loaded",
      "affinityEnabled": true,
      "rebalanceIntervalMs": 60000
    },

    "memorySync": {
      "intervalMs": 5000,
      "conflictResolution": "last_write_wins",
      "cacheSize": 1000,
      "namespaces": ["swarm", "tasks", "workers", "global"]
    }
  },

  "capacity": {
    "maxConcurrentTasks": 10,
    "cpuCores": 4,
    "memoryMb": 8192,
    "supportedTaskTypes": ["build", "test", "deploy"]
  }
}
```

---

## Deployment Patterns

### Pattern 1: Single Worker (Development)

**Use Case**: Local development and testing

```bash
# Simple single-worker deployment
npm run dev

# Worker automatically:
# - Registers itself
# - Starts heartbeat
# - Processes tasks
```

**Pros**: Simple setup, easy debugging
**Cons**: No fault tolerance, limited scalability

### Pattern 2: Multiple Workers (Production)

**Use Case**: Production workload distribution

```bash
# Start multiple workers on different machines
# Worker 1
WORKER_ID=worker-001 npm start

# Worker 2
WORKER_ID=worker-002 npm start

# Worker 3
WORKER_ID=worker-003 npm start
```

**Pros**: Horizontal scaling, fault tolerance
**Cons**: Requires coordination, monitoring

### Pattern 3: Container Orchestration (Kubernetes)

**Use Case**: Cloud-native deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-sentinel-workers
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-sentinel
  template:
    metadata:
      labels:
        app: task-sentinel
    spec:
      containers:
      - name: worker
        image: task-sentinel:latest
        env:
        - name: WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

**Pros**: Auto-scaling, self-healing, declarative
**Cons**: Complex setup, requires Kubernetes knowledge

### Pattern 4: GitHub Actions (CI/CD)

**Use Case**: Serverless execution on GitHub infrastructure

```yaml
name: Task Sentinel Worker
on:
  workflow_dispatch:
  schedule:
    - cron: '*/5 * * * *'

jobs:
  process-tasks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        worker_id: [worker-001, worker-002, worker-003]
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Run Worker
        env:
          WORKER_ID: ${{ matrix.worker_id }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm start
```

**Pros**: No infrastructure management, free for public repos
**Cons**: Limited to GitHub Actions runtime limits

---

## Monitoring & Observability

### Metrics to Track

**Worker Metrics:**
- Active workers count
- Worker health status
- Tasks per worker
- Worker capacity utilization

**Task Metrics:**
- Tasks queued
- Tasks in progress
- Tasks completed
- Task failure rate
- Average task duration

**Lock Metrics:**
- Active locks count
- Lock acquisition rate
- Lock conflict rate
- Stale locks detected

**System Metrics:**
- Memory sync operations
- Heartbeat success rate
- Load balancer decisions
- Network latency

### Logging Strategy

```typescript
// Structured logging format
{
  "timestamp": "2025-10-30T10:00:00Z",
  "level": "info",
  "component": "LockManager",
  "worker_id": "worker-001",
  "action": "acquire_lock",
  "task_id": "task-123",
  "result": "success",
  "duration_ms": 45,
  "metadata": {
    "retry_count": 0,
    "conflict_detected": false
  }
}
```

### Health Check Endpoints

```typescript
// Worker health endpoint
GET /health
Response:
{
  "status": "healthy",
  "worker_id": "worker-001",
  "uptime_seconds": 3600,
  "active_tasks": 3,
  "capacity": {
    "max": 10,
    "available": 7
  },
  "last_heartbeat": "2025-10-30T10:05:00Z"
}

// Cluster health endpoint
GET /cluster/health
Response:
{
  "status": "healthy",
  "total_workers": 3,
  "healthy_workers": 3,
  "total_capacity": 30,
  "utilized_capacity": 12,
  "tasks_queued": 5,
  "tasks_in_progress": 12
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Lock Acquisition Failures

**Symptoms:**
- Workers repeatedly fail to acquire locks
- Tasks remain in pending state
- High lock conflict rate

**Diagnosis:**
```bash
# Check for existing locks
npm run debug:locks

# Verify worker registration
npm run debug:workers

# Check GitHub API rate limits
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

**Solutions:**
1. Increase lock TTL if tasks take longer than default
2. Reduce worker count if conflicts are high
3. Implement task sharding by type
4. Check GitHub API rate limits

#### Issue 2: Stale Workers

**Symptoms:**
- Workers show as active but not processing
- Heartbeats not updating
- Tasks stuck on inactive workers

**Diagnosis:**
```bash
# Check worker heartbeats
npm run debug:heartbeats

# List stale workers
npm run debug:stale-workers

# View worker logs
docker logs <worker-container-id>
```

**Solutions:**
1. Verify network connectivity to GitHub
2. Check worker process is running
3. Increase heartbeat interval if network is slow
4. Manually deregister stale workers
5. Implement automatic worker restart

#### Issue 3: Memory Sync Conflicts

**Symptoms:**
- Inconsistent state across workers
- Data loss between syncs
- Conflict warnings in logs

**Diagnosis:**
```bash
# Check memory sync status
npm run debug:memory-sync

# View memory namespaces
npm run debug:memory-namespaces

# Trace sync operations
DEBUG=memory-sync npm start
```

**Solutions:**
1. Reduce sync interval for critical data
2. Use immutable data patterns
3. Implement versioning for state
4. Use dedicated namespaces per worker
5. Enable conflict resolution logging

#### Issue 4: Load Imbalance

**Symptoms:**
- Some workers overloaded, others idle
- Uneven task distribution
- Poor resource utilization

**Diagnosis:**
```bash
# View load distribution
npm run debug:load-balance

# Check worker capacities
npm run debug:capacities

# Analyze task assignments
npm run debug:assignments
```

**Solutions:**
1. Adjust load balancing strategy
2. Calibrate worker capacity settings
3. Enable task affinity for long-running tasks
4. Implement dynamic rebalancing
5. Add more workers for high-load periods

---

## Performance Tuning

### Lock Optimization

**Reduce Lock Contention:**
```typescript
// Configure fine-grained locking
const lockManager = new LockManager(config, {
  lockGranularity: 'task', // vs 'workflow'
  conflictRetryStrategy: 'exponential_backoff',
  maxRetryAttempts: 5
});
```

**Lock TTL Tuning:**
```typescript
// Short TTL for fast tasks
lockTTL: 60 // 1 minute

// Long TTL for slow tasks
lockTTL: 600 // 10 minutes

// Dynamic TTL based on task type
lockTTL: task.estimatedDuration * 1.5
```

### Memory Sync Optimization

**Selective Synchronization:**
```typescript
// Only sync critical namespaces
memorySyncManager.configure({
  namespaces: ['swarm', 'tasks'], // Exclude 'workers', 'global'
  syncInterval: 10000, // 10s for non-critical
  priorityNamespaces: {
    'tasks': 1000 // 1s for critical
  }
});
```

**Cache Strategy:**
```typescript
// Implement tiered caching
const cacheConfig = {
  l1: { size: 100, ttl: 5000 },   // Hot data
  l2: { size: 1000, ttl: 30000 }, // Warm data
  l3: { size: 10000, ttl: 300000 } // Cold data
};
```

### Load Balancing Optimization

**Strategy Selection:**
```typescript
// High-throughput: Round-robin
strategy: 'round_robin'

// Variable task sizes: Least-loaded
strategy: 'least_loaded'

// Long-running tasks: Affinity-based
strategy: 'affinity'

// Hybrid approach
strategy: 'adaptive' // Switches based on conditions
```

**Capacity Planning:**
```typescript
// Conservative (prevent overload)
maxConcurrentTasks: cpuCores * 1

// Balanced
maxConcurrentTasks: cpuCores * 2

// Aggressive (I/O bound tasks)
maxConcurrentTasks: cpuCores * 4
```

### Heartbeat Optimization

**Interval Tuning:**
```typescript
// Fast failure detection (high overhead)
heartbeatInterval: 10000, // 10s
staleThreshold: 30000      // 30s

// Balanced
heartbeatInterval: 30000,  // 30s
staleThreshold: 120000     // 2 minutes

// Slow (low overhead, delayed detection)
heartbeatInterval: 60000,  // 1 minute
staleThreshold: 300000     // 5 minutes
```

---

## Security Considerations

### GitHub Token Security

**Minimum Required Permissions:**
```yaml
permissions:
  issues: write        # For lock/worker comments
  contents: read       # For repository access
  pull_requests: read  # If processing PRs
```

**Token Rotation:**
```bash
# Rotate tokens regularly (every 90 days)
# Use GitHub Apps for better security
# Implement token encryption at rest
```

### Worker Authentication

**Verify Worker Identity:**
```typescript
// Sign worker registration with secret
const workerSignature = hmac(workerMetadata, WORKER_SECRET);

// Verify on coordination layer
if (!verifySignature(metadata, signature)) {
  throw new Error('Invalid worker signature');
}
```

### Lock Security

**Prevent Lock Hijacking:**
```typescript
// Include worker signature in lock metadata
lock.metadata.signature = signLockData(lockData, workerSecret);

// Verify before accepting lock release
if (!verifyLockOwnership(lock, workerId)) {
  throw new Error('Worker does not own this lock');
}
```

### Network Security

**GitHub Communication:**
- Always use HTTPS for GitHub API
- Implement request signing
- Rate limit protection
- IP allowlisting (if possible)

**Inter-Worker Communication:**
- No direct worker-to-worker communication (by design)
- All coordination through GitHub
- Reduces attack surface

---

## Next Steps

1. [Review API Documentation](./api/distributed.md)
2. [Deploy Single Worker](./deployment/single-worker.md)
3. [Scale to Multiple Workers](./deployment/multi-worker.md)
4. [Set up CI/CD](./deployment/github-actions.md)
5. [Container Deployment](./deployment/docker.md)

---

## Additional Resources

- [Phase 1 Core Documentation](./phase1_core.md)
- [Phase 2 GitHub Integration](./phase2_github.md)
- [API Reference](./api/)
- [Deployment Guides](./deployment/)
- [GitHub Repository](https://github.com/your-org/task-sentinel)
