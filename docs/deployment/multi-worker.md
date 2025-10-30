# Multiple Worker Deployment Guide

## Overview

This guide covers deploying Task Sentinel with multiple workers for horizontal scaling, fault tolerance, and high availability.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Coordination                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Locks     │  │  Registry   │  │   Memory    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────┬─────────────┬─────────────┬──────────────────┘
             │             │             │
     ┌───────┴─────┬───────┴─────┬───────┴─────┐
     │             │             │             │
┌────▼───┐    ┌────▼───┐    ┌────▼───┐    ┌────▼───┐
│Worker 1│    │Worker 2│    │Worker 3│    │Worker N│
│        │    │        │    │        │    │        │
│ Max: 10│    │ Max: 10│    │ Max: 5 │    │ Max: 15│
│ Load: 7│    │ Load: 3│    │ Load: 2│    │ Load: 12│
└────────┘    └────────┘    └────────┘    └────────┘
  Region:       Region:       Region:       Region:
  us-east-1     us-west-2     eu-west-1     ap-south-1
```

## Deployment Strategies

### Strategy 1: Homogeneous Workers

**Use Case:** Uniform workload, simple scaling

**Configuration:**
```bash
# Worker 1 (Server 1)
WORKER_ID=worker-001
WORKER_HOSTNAME=server-1.example.com
WORKER_MAX_TASKS=10

# Worker 2 (Server 2)
WORKER_ID=worker-002
WORKER_HOSTNAME=server-2.example.com
WORKER_MAX_TASKS=10

# Worker 3 (Server 3)
WORKER_ID=worker-003
WORKER_HOSTNAME=server-3.example.com
WORKER_MAX_TASKS=10
```

**Pros:** Simple management, predictable behavior
**Cons:** No specialization, potential resource waste

---

### Strategy 2: Heterogeneous Workers

**Use Case:** Varied task types, optimized resource usage

**Configuration:**
```bash
# Build Worker (High CPU)
WORKER_ID=build-worker-001
WORKER_HOSTNAME=build-server-1.example.com
WORKER_MAX_TASKS=20
SUPPORTED_TASK_TYPES=build,compile

# Test Worker (Medium CPU)
WORKER_ID=test-worker-001
WORKER_HOSTNAME=test-server-1.example.com
WORKER_MAX_TASKS=15
SUPPORTED_TASK_TYPES=test,lint

# Deploy Worker (Low CPU, High I/O)
WORKER_ID=deploy-worker-001
WORKER_HOSTNAME=deploy-server-1.example.com
WORKER_MAX_TASKS=5
SUPPORTED_TASK_TYPES=deploy,publish
```

**Pros:** Optimized resource usage, better performance
**Cons:** Complex configuration, requires planning

---

### Strategy 3: Geographic Distribution

**Use Case:** Global availability, low latency

**Configuration:**
```bash
# US East Worker
WORKER_ID=us-east-worker-001
WORKER_HOSTNAME=us-east-1.example.com
WORKER_REGION=us-east-1
WORKER_MAX_TASKS=10

# US West Worker
WORKER_ID=us-west-worker-001
WORKER_HOSTNAME=us-west-2.example.com
WORKER_REGION=us-west-2
WORKER_MAX_TASKS=10

# Europe Worker
WORKER_ID=eu-west-worker-001
WORKER_HOSTNAME=eu-west-1.example.com
WORKER_REGION=eu-west-1
WORKER_MAX_TASKS=10

# Asia Worker
WORKER_ID=ap-south-worker-001
WORKER_HOSTNAME=ap-south-1.example.com
WORKER_REGION=ap-south-1
WORKER_MAX_TASKS=10
```

**Pros:** Low latency, geographic redundancy
**Cons:** Complex coordination, potential consistency issues

---

## Setup Process

### 1. Shared Configuration

Create `config/shared.json`:

```json
{
  "distributed": {
    "enabled": true,

    "locking": {
      "ttlSeconds": 300,
      "retryAttempts": 3,
      "retryDelayMs": 1000
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
      "cacheSize": 1000
    }
  },

  "github": {
    "owner": "${GITHUB_OWNER}",
    "repo": "${GITHUB_REPO}",
    "token": "${GITHUB_TOKEN}"
  }
}
```

### 2. Worker-Specific Configuration

Create per-worker configs:

**Worker 1: `config/worker-001.json`**
```json
{
  "workerId": "worker-001",
  "hostname": "server-1.example.com",
  "capacity": {
    "maxConcurrentTasks": 10,
    "cpuCores": 8,
    "memoryMb": 16384,
    "supportedTaskTypes": ["build", "test", "deploy"]
  },
  "metadata": {
    "region": "us-east-1",
    "environment": "production"
  }
}
```

**Worker 2: `config/worker-002.json`**
```json
{
  "workerId": "worker-002",
  "hostname": "server-2.example.com",
  "capacity": {
    "maxConcurrentTasks": 10,
    "cpuCores": 8,
    "memoryMb": 16384,
    "supportedTaskTypes": ["build", "test", "deploy"]
  },
  "metadata": {
    "region": "us-west-2",
    "environment": "production"
  }
}
```

### 3. Deployment Script

Create `scripts/deploy-workers.sh`:

```bash
#!/bin/bash

# Load shared configuration
export $(cat .env | xargs)

# Worker definitions
declare -a WORKERS=(
  "worker-001:server-1.example.com:10"
  "worker-002:server-2.example.com:10"
  "worker-003:server-3.example.com:10"
)

# Deploy each worker
for worker_spec in "${WORKERS[@]}"; do
  IFS=':' read -r worker_id hostname max_tasks <<< "$worker_spec"

  echo "Deploying $worker_id on $hostname..."

  # SSH to server and start worker
  ssh $hostname << EOF
    cd /opt/task-sentinel

    # Set environment
    export WORKER_ID=$worker_id
    export WORKER_HOSTNAME=$hostname
    export WORKER_MAX_TASKS=$max_tasks
    export GITHUB_TOKEN=$GITHUB_TOKEN

    # Stop existing worker (if any)
    pm2 stop task-sentinel-$worker_id || true

    # Start worker
    pm2 start npm --name "task-sentinel-$worker_id" -- start

    # Save PM2 config
    pm2 save
EOF

  echo "✓ $worker_id deployed"
done

echo "All workers deployed successfully"
```

### 4. Start Workers

```bash
# Make script executable
chmod +x scripts/deploy-workers.sh

# Deploy all workers
./scripts/deploy-workers.sh
```

## Load Balancing Configuration

### Round-Robin Strategy

```json
{
  "loadBalancer": {
    "strategy": "round_robin",
    "options": {
      "startIndex": 0
    }
  }
}
```

**Best for:** Uniform tasks, equal worker capacity
**Behavior:** Rotates through workers sequentially

### Least-Loaded Strategy

```json
{
  "loadBalancer": {
    "strategy": "least_loaded",
    "options": {
      "considerCapacity": true
    }
  }
}
```

**Best for:** Variable task sizes, mixed capacity
**Behavior:** Selects worker with fewest active tasks

### Capacity-Based Strategy

```json
{
  "loadBalancer": {
    "strategy": "capacity_based",
    "options": {
      "weightByCpu": true,
      "weightByMemory": true
    }
  }
}
```

**Best for:** Heterogeneous workers, resource optimization
**Behavior:** Weights selection by available capacity

### Affinity-Based Strategy

```json
{
  "loadBalancer": {
    "strategy": "affinity",
    "options": {
      "affinityKey": "project_id",
      "fallbackStrategy": "least_loaded"
    }
  }
}
```

**Best for:** Long-running tasks, cache optimization
**Behavior:** Prefers workers that handled similar tasks

## Worker Coordination Patterns

### Master-Worker Pattern

```typescript
// Coordinator process
class WorkerCoordinator {
  async assignTask(task: Task): Promise<void> {
    // Select optimal worker
    const worker = await this.loadBalancer.selectWorker(task);

    // Store assignment
    await this.memorySync.set(
      `task-${task.id}-assignment`,
      { workerId: worker.workerId, taskId: task.id },
      'assignments'
    );

    // Workers poll for assignments
  }
}

// Worker process
class Worker {
  async processLoop(): Promise<void> {
    while (this.running) {
      // Check for assigned tasks
      const assignment = await this.memorySync.get(
        `task-${this.workerId}-next`,
        'assignments'
      );

      if (assignment) {
        await this.processTask(assignment.taskId);
      }

      await sleep(1000);
    }
  }
}
```

### Peer-to-Peer Pattern

```typescript
// All workers are equal, compete for tasks
class PeerWorker {
  async processLoop(): Promise<void> {
    while (this.running) {
      // Get pending tasks
      const tasks = await this.taskQueue.getPending();

      // Select best task for this worker
      const task = this.selectTask(tasks);

      if (!task) {
        await sleep(1000);
        continue;
      }

      // Try to acquire lock
      const lock = await this.lockManager.acquireLock(
        task.id,
        this.workerId
      );

      if (lock) {
        await this.processTask(task);
        await this.lockManager.releaseLock(task.id, this.workerId);
      }
    }
  }
}
```

### Hierarchical Pattern

```typescript
// Leader workers coordinate follower workers
class LeaderWorker {
  private followers: Set<string> = new Set();

  async coordinateFollowers(): Promise<void> {
    // Get available followers
    const workers = await this.workerRegistry.listWorkers({
      status: 'active',
      hasCapacity: true
    });

    // Filter to followers
    const followers = workers.filter(w =>
      w.metadata?.role === 'follower'
    );

    // Distribute tasks
    for (const follower of followers) {
      const task = await this.selectTaskForWorker(follower);
      if (task) {
        await this.assignTask(task, follower);
      }
    }
  }
}
```

## High Availability Setup

### Health Monitoring

```typescript
// Monitor all workers
class ClusterHealthMonitor {
  async monitorCluster(): Promise<void> {
    setInterval(async () => {
      const workers = await this.workerRegistry.listWorkers();

      for (const worker of workers) {
        const health = await this.checkWorkerHealth(worker);

        if (!health.healthy) {
          console.warn(`Worker ${worker.workerId} unhealthy`);

          // Recover locks
          await this.recoverWorkerLocks(worker.workerId);

          // Reassign tasks
          await this.reassignWorkerTasks(worker.workerId);

          // Send alert
          await this.sendAlert({
            type: 'worker_failure',
            workerId: worker.workerId,
            lastSeen: worker.lastHeartbeat
          });
        }
      }
    }, 30000); // Every 30s
  }

  private async checkWorkerHealth(worker: WorkerInfo): Promise<HealthStatus> {
    const now = Date.now();
    const lastHeartbeat = new Date(worker.lastHeartbeat).getTime();
    const timeSinceHeartbeat = now - lastHeartbeat;

    return {
      healthy: timeSinceHeartbeat < this.staleThreshold,
      lastHeartbeat: worker.lastHeartbeat,
      timeSinceHeartbeat
    };
  }
}
```

### Automatic Failover

```typescript
// Failover coordinator
class FailoverCoordinator {
  async handleWorkerFailure(workerId: string): Promise<void> {
    console.log(`Handling failure of worker ${workerId}`);

    // 1. Mark worker as offline
    await this.workerRegistry.updateStatus(workerId, 'offline');

    // 2. Release all locks
    const locks = await this.lockManager.listLocks({ workerId });
    for (const lock of locks) {
      await this.lockManager.releaseLock(lock.taskId, workerId);
      console.log(`Released lock for task ${lock.taskId}`);
    }

    // 3. Get active tasks
    const activeTasks = await this.getActiveTasksForWorker(workerId);

    // 4. Reassign tasks to healthy workers
    for (const task of activeTasks) {
      const newWorker = await this.loadBalancer.selectWorker(task);
      if (newWorker) {
        await this.assignTask(task, newWorker);
        console.log(`Reassigned task ${task.id} to ${newWorker.workerId}`);
      } else {
        console.warn(`No workers available for task ${task.id}`);
        await this.taskQueue.requeue(task);
      }
    }

    // 5. Clean up worker data
    await this.cleanupWorkerData(workerId);

    console.log(`Failover complete for worker ${workerId}`);
  }
}
```

### Auto-Scaling

```typescript
// Auto-scaling controller
class AutoScaler {
  async scaleBasedOnLoad(): Promise<void> {
    const metrics = await this.getClusterMetrics();

    // Scale up conditions
    if (metrics.avgUtilization > 0.80 && metrics.queueLength > 50) {
      console.log('High load detected, scaling up...');
      await this.scaleUp();
    }

    // Scale down conditions
    else if (metrics.avgUtilization < 0.20 && metrics.queueLength < 10) {
      console.log('Low load detected, scaling down...');
      await this.scaleDown();
    }
  }

  private async scaleUp(): Promise<void> {
    const currentWorkers = await this.workerRegistry.listWorkers();
    const newWorkerCount = Math.min(
      currentWorkers.length + 2,
      this.maxWorkers
    );

    for (let i = currentWorkers.length; i < newWorkerCount; i++) {
      await this.spawnWorker(`worker-${i+1:03d}`);
    }
  }

  private async scaleDown(): Promise<void> {
    const workers = await this.workerRegistry.listWorkers({
      status: 'active'
    });

    // Sort by utilization (lowest first)
    workers.sort((a, b) =>
      a.capacity.activeTasks - b.capacity.activeTasks
    );

    // Remove least utilized workers
    const toRemove = Math.min(2, workers.length - this.minWorkers);
    for (let i = 0; i < toRemove; i++) {
      await this.drainAndRemoveWorker(workers[i].workerId);
    }
  }
}
```

## Monitoring & Observability

### Centralized Logging

```typescript
// Log aggregator
class LogAggregator {
  async aggregateLogs(): Promise<void> {
    const workers = await this.workerRegistry.listWorkers();

    for (const worker of workers) {
      const logs = await this.fetchWorkerLogs(worker.workerId);

      // Parse and store logs
      for (const log of logs) {
        await this.storeLogs.insert({
          timestamp: log.timestamp,
          workerId: worker.workerId,
          level: log.level,
          message: log.message,
          metadata: log.metadata
        });
      }
    }
  }

  async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    return this.storeLog.query({
      workerId: query.workerId,
      level: query.level,
      timeRange: query.timeRange,
      search: query.search
    });
  }
}
```

### Metrics Dashboard

```typescript
// Metrics collector
class MetricsCollector {
  async collectClusterMetrics(): Promise<ClusterMetrics> {
    const workers = await this.workerRegistry.listWorkers();

    const metrics = {
      timestamp: new Date().toISOString(),
      totalWorkers: workers.length,
      healthyWorkers: workers.filter(w => w.status === 'active').length,
      totalCapacity: workers.reduce((sum, w) => sum + w.capacity.maxTasks, 0),
      utilizedCapacity: workers.reduce((sum, w) => sum + w.capacity.activeTasks, 0),
      avgUtilization: 0,
      taskMetrics: await this.collectTaskMetrics(),
      lockMetrics: await this.collectLockMetrics(),
      workerMetrics: workers.map(w => ({
        workerId: w.workerId,
        status: w.status,
        utilization: w.capacity.activeTasks / w.capacity.maxTasks,
        lastHeartbeat: w.lastHeartbeat
      }))
    };

    metrics.avgUtilization =
      metrics.utilizedCapacity / metrics.totalCapacity;

    return metrics;
  }
}
```

### Alerting

```typescript
// Alert manager
class AlertManager {
  async checkAlertConditions(): Promise<void> {
    const metrics = await this.metricsCollector.collectClusterMetrics();

    // High utilization alert
    if (metrics.avgUtilization > 0.90) {
      await this.sendAlert({
        severity: 'warning',
        title: 'High Cluster Utilization',
        message: `Cluster utilization at ${(metrics.avgUtilization * 100).toFixed(1)}%`,
        metadata: { metrics }
      });
    }

    // Worker failure alert
    if (metrics.healthyWorkers < metrics.totalWorkers * 0.75) {
      await this.sendAlert({
        severity: 'critical',
        title: 'Multiple Worker Failures',
        message: `Only ${metrics.healthyWorkers}/${metrics.totalWorkers} workers healthy`,
        metadata: { metrics }
      });
    }

    // Queue backlog alert
    if (metrics.taskMetrics.queueLength > 100) {
      await this.sendAlert({
        severity: 'warning',
        title: 'Task Queue Backlog',
        message: `${metrics.taskMetrics.queueLength} tasks queued`,
        metadata: { metrics }
      });
    }
  }
}
```

## Troubleshooting Multi-Worker Issues

### Worker Discovery Issues

**Symptom:** Workers can't find each other

**Diagnosis:**
```bash
# Check worker registrations
npm run workers:list

# Verify GitHub connectivity
npm run github:test-connection
```

**Solutions:**
1. Verify all workers use same GitHub repo
2. Check worker IDs are unique
3. Verify GitHub token has correct permissions

### Lock Contention

**Symptom:** High lock conflict rate

**Diagnosis:**
```bash
# View lock conflicts
npm run locks:stats --metric=conflicts

# Check lock distribution
npm run locks:distribution
```

**Solutions:**
1. Increase worker count (more parallelism)
2. Implement task sharding
3. Adjust lock granularity
4. Use affinity-based load balancing

### Load Imbalance

**Symptom:** Some workers overloaded, others idle

**Diagnosis:**
```bash
# View load distribution
npm run cluster:load-distribution

# Check worker capacities
npm run workers:capacity
```

**Solutions:**
1. Switch to `least_loaded` strategy
2. Calibrate worker capacity settings
3. Enable dynamic rebalancing
4. Check for task type mismatches

## Next Steps

- [GitHub Actions Deployment](./github-actions.md)
- [Container Deployment](./docker.md)
- [API Reference](../api/distributed.md)
- [Performance Tuning](../phase3_guide.md#performance-tuning)
