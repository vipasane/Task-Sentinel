# Worker Registry Usage Guide

## Overview

The Worker Registry provides distributed worker coordination, health tracking, and intelligent load balancing for Task Sentinel Phase 3.

## Features

- **Worker Registration**: Register workers with capabilities and capacity limits
- **Health Monitoring**: Automatic health tracking with heartbeat mechanism
- **Load Balancing**: Intelligent worker selection based on capacity, success rate, and performance
- **Auto-Cleanup**: Automatic removal of unhealthy workers
- **Worker Discovery**: Filter workers by capabilities, health, and capacity

## Basic Usage

### 1. Initialize Worker Registry

```typescript
import { WorkerRegistry } from './src/distributed/worker-registry';
import { ClaudeFlowMemory } from './src/memory/claude-flow-memory';

const memory = new ClaudeFlowMemory();
const registry = new WorkerRegistry({
  memory,
  workerTTL: 15 * 60 * 1000,        // 15 minutes
  healthyThreshold: 10 * 60 * 1000,  // 10 minutes
  degradedThreshold: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 5 * 60 * 1000,    // 5 minutes
});

// Start automatic cleanup
registry.startCleanup();
```

### 2. Register a Worker

```typescript
const worker = await registry.registerWorker({
  nodeId: 'worker-node-1',
  capabilities: ['coder', 'tester', 'reviewer'],
  maxConcurrentTasks: 5,
});

console.log('Worker registered:', worker.id);
// Output: Worker registered: worker-1730345678-abc123xyz
```

### 3. Send Heartbeats

Workers must send heartbeats to maintain healthy status:

```typescript
// Worker sends heartbeat every 5 minutes
setInterval(async () => {
  await registry.heartbeat(worker.id);
  console.log('Heartbeat sent');
}, 5 * 60 * 1000);
```

### 4. Update Task Count

When assigning/completing tasks:

```typescript
// Task assigned
await registry.updateTaskCount(worker.id, 1);

// Task completed
await registry.updateTaskCount(worker.id, -1);
```

### 5. Record Task Completion

Track task metrics:

```typescript
// Successful task completion (5 seconds duration)
await registry.recordTaskCompletion(worker.id, true, 5000);

// Failed task completion (3 seconds duration)
await registry.recordTaskCompletion(worker.id, false, 3000);
```

### 6. Discover Workers

Find workers by capability:

```typescript
// Find all coders with available capacity
const coders = await registry.discoverWorkers({
  capabilities: ['coder'],
  healthStatus: ['healthy'],
  minAvailableCapacity: 2,
});

console.log(`Found ${coders.length} available coders`);
```

### 7. Load Balancing

Get workers sorted by optimal load balancing:

```typescript
// Get best workers for a coding task
const workers = await registry.getWorkersForLoadBalancing({
  capabilities: ['coder'],
  healthStatus: ['healthy', 'degraded'],
  minAvailableCapacity: 1,
});

if (workers.length > 0) {
  const bestWorker = workers[0];
  console.log('Selected worker:', bestWorker.id);
  console.log('Priority score:', bestWorker.priority);
  console.log('Available capacity:', bestWorker.availableCapacity);
  console.log('Success rate:', bestWorker.successRate);
}
```

## Worker Health States

### Healthy
- Heartbeat received within last 10 minutes
- Worker is fully operational
- Accepts new tasks

### Degraded
- Heartbeat between 10-15 minutes old
- Worker may be experiencing issues
- Can still accept tasks but with lower priority

### Unhealthy
- No heartbeat for over 15 minutes
- Worker is considered offline
- Automatically removed by cleanup process

## Load Balancing Algorithm

Workers are prioritized using a weighted scoring system:

```
Priority = (Capacity Score × 0.5) + (Success Rate × 0.3) + (Speed Score × 0.2)

Where:
- Capacity Score = Available Slots / Max Slots
- Success Rate = Completed Tasks / Total Tasks
- Speed Score = 1 / Average Task Duration (normalized)
```

### Example Priority Calculation

```
Worker A:
- Available: 8/10 slots = 0.8
- Success: 45/50 tasks = 0.9
- Speed: 1/5s = 0.2 (normalized to 0.2)
Priority = (0.8 × 0.5) + (0.9 × 0.3) + (0.2 × 0.2) = 0.71

Worker B:
- Available: 4/5 slots = 0.8
- Success: 10/10 tasks = 1.0
- Speed: 1/3s = 0.33 (normalized to 0.33)
Priority = (0.8 × 0.5) + (1.0 × 0.3) + (0.33 × 0.2) = 0.77

Worker B selected (higher priority)
```

## Complete Example

```typescript
import { WorkerRegistry } from './src/distributed/worker-registry';
import { ClaudeFlowMemory } from './src/memory/claude-flow-memory';

async function main() {
  // Initialize
  const memory = new ClaudeFlowMemory();
  const registry = new WorkerRegistry({ memory });
  registry.startCleanup();

  // Register workers
  const worker1 = await registry.registerWorker({
    nodeId: 'coder-1',
    capabilities: ['coder', 'tester'],
    maxConcurrentTasks: 5,
  });

  const worker2 = await registry.registerWorker({
    nodeId: 'reviewer-1',
    capabilities: ['reviewer'],
    maxConcurrentTasks: 3,
  });

  // Simulate task assignment and completion
  console.log('Assigning tasks...');

  // Get best worker for coding task
  const workers = await registry.getWorkersForLoadBalancing({
    capabilities: ['coder'],
    healthStatus: ['healthy'],
    minAvailableCapacity: 1,
  });

  if (workers.length > 0) {
    const selectedWorker = workers[0];
    console.log(`Selected worker: ${selectedWorker.id}`);

    // Assign task
    await registry.updateTaskCount(selectedWorker.id, 1);

    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Complete task successfully
    await registry.recordTaskCompletion(selectedWorker.id, true, 5000);
    console.log('Task completed successfully');
  }

  // Check worker status
  const allWorkers = await registry.discoverWorkers();
  for (const worker of allWorkers) {
    console.log(`
Worker: ${worker.id}
  Node: ${worker.nodeId}
  Capabilities: ${worker.capabilities.join(', ')}
  Health: ${worker.healthStatus}
  Tasks: ${worker.currentTasks}/${worker.maxConcurrentTasks}
  Completed: ${worker.metrics.tasksCompleted}
  Failed: ${worker.metrics.tasksFailedCount}
  Avg Duration: ${worker.metrics.averageTaskDuration}ms
    `);
  }

  // Cleanup
  registry.stopCleanup();
}

main().catch(console.error);
```

## Integration with Task Sentinel

### Worker Node Implementation

```typescript
// worker-node.ts
import { WorkerRegistry } from './src/distributed/worker-registry';
import { ClaudeFlowMemory } from './src/memory/claude-flow-memory';

class WorkerNode {
  private registry: WorkerRegistry;
  private workerId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private nodeId: string,
    private capabilities: string[],
    private maxConcurrentTasks: number
  ) {
    this.registry = new WorkerRegistry({
      memory: new ClaudeFlowMemory(),
    });
  }

  async start(): Promise<void> {
    // Register worker
    const worker = await this.registry.registerWorker({
      nodeId: this.nodeId,
      capabilities: this.capabilities,
      maxConcurrentTasks: this.maxConcurrentTasks,
    });

    this.workerId = worker.id;
    console.log(`Worker ${this.workerId} started`);

    // Start heartbeat
    this.startHeartbeat();
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.workerId) {
      await this.registry.unregisterWorker(this.workerId);
      console.log(`Worker ${this.workerId} stopped`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.workerId) {
        await this.registry.heartbeat(this.workerId);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async executeTask(task: any): Promise<void> {
    if (!this.workerId) {
      throw new Error('Worker not registered');
    }

    const startTime = Date.now();

    try {
      // Increment task count
      await this.registry.updateTaskCount(this.workerId, 1);

      // Execute task
      await this.performTask(task);

      // Record success
      const duration = Date.now() - startTime;
      await this.registry.recordTaskCompletion(this.workerId, true, duration);

      console.log(`Task completed in ${duration}ms`);
    } catch (error) {
      // Record failure
      const duration = Date.now() - startTime;
      await this.registry.recordTaskCompletion(this.workerId, false, duration);

      console.error(`Task failed after ${duration}ms:`, error);
      throw error;
    }
  }

  private async performTask(task: any): Promise<void> {
    // Task execution logic here
    console.log('Executing task:', task);
  }
}

// Usage
const worker = new WorkerNode('coder-node-1', ['coder', 'tester'], 5);
await worker.start();

// Worker processes tasks...

await worker.stop();
```

## Memory Keys

All worker data is stored in Claude Flow Memory with these keys:

- **Workers**: `task-sentinel/workers/{worker-id}`
- **Events**: `task-sentinel/events/{event-type}/{timestamp}`

## TTL Management

- **Worker Records**: 15 minutes (automatically refreshed by heartbeats)
- **Events**: 1 minute (short-lived for notifications)

## Best Practices

1. **Regular Heartbeats**: Send heartbeats every 5 minutes to maintain healthy status
2. **Accurate Task Counts**: Always update task counts when assigning/completing tasks
3. **Record Metrics**: Use `recordTaskCompletion()` to track performance
4. **Filter Wisely**: Use discovery filters to find optimal workers
5. **Monitor Health**: Check worker health before assigning critical tasks
6. **Graceful Shutdown**: Unregister workers before stopping nodes
7. **Enable Cleanup**: Always start the automatic cleanup process

## Error Handling

```typescript
try {
  await registry.heartbeat(workerId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Worker was removed, re-register
    const worker = await registry.registerWorker(registration);
    workerId = worker.id;
  } else {
    throw error;
  }
}
```

## Monitoring Dashboard Example

```typescript
async function displayWorkerDashboard() {
  const workers = await registry.discoverWorkers();

  console.log('\n=== Worker Dashboard ===\n');

  // Group by health status
  const byHealth = {
    healthy: workers.filter(w => w.healthStatus === 'healthy'),
    degraded: workers.filter(w => w.healthStatus === 'degraded'),
    unhealthy: workers.filter(w => w.healthStatus === 'unhealthy'),
  };

  console.log(`Healthy: ${byHealth.healthy.length}`);
  console.log(`Degraded: ${byHealth.degraded.length}`);
  console.log(`Unhealthy: ${byHealth.unhealthy.length}`);

  // Total capacity
  const totalCapacity = workers.reduce((sum, w) => sum + w.maxConcurrentTasks, 0);
  const usedCapacity = workers.reduce((sum, w) => sum + w.currentTasks, 0);
  const availableCapacity = totalCapacity - usedCapacity;

  console.log(`\nCapacity: ${usedCapacity}/${totalCapacity} (${availableCapacity} available)`);

  // Overall metrics
  const totalCompleted = workers.reduce((sum, w) => sum + w.metrics.tasksCompleted, 0);
  const totalFailed = workers.reduce((sum, w) => sum + w.metrics.tasksFailedCount, 0);
  const successRate = totalCompleted / (totalCompleted + totalFailed) * 100;

  console.log(`\nTasks: ${totalCompleted} completed, ${totalFailed} failed`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);

  // Top performers
  const byPriority = await registry.getWorkersForLoadBalancing();
  console.log('\nTop Performers:');
  byPriority.slice(0, 5).forEach((w, i) => {
    console.log(`  ${i + 1}. ${w.nodeId} (priority: ${w.priority.toFixed(3)})`);
  });
}
```
