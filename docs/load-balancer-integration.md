# Load Balancer Integration Guide

## Overview

The LoadBalancer provides intelligent task distribution across workers with multiple balancing strategies, worker affinity rules, and dynamic rebalancing capabilities.

## Quick Start

```typescript
import { LoadBalancer, AdaptiveStrategy } from './src/distributed/load-balancer';
import { WorkerRegistry } from './src/distributed/worker-registry';

// Initialize load balancer with adaptive strategy
const loadBalancer = new LoadBalancer(new AdaptiveStrategy());

// Get workers from registry
const workers = workerRegistry.getAll();

// Define task requirements
const task = {
  capabilities: ['typescript', 'testing'],
  complexity: 7,
  priority: 8,
  taskType: 'test-generation'
};

// Select best worker
const worker = loadBalancer.selectWorker(task, workers);

if (worker) {
  console.log(`Assigned task to ${worker.id}`);
} else {
  console.log('No capable worker available');
}
```

## Balancing Strategies

### 1. Round Robin Strategy

Simple rotation through available workers. Use when all tasks are similar.

```typescript
import { RoundRobinStrategy } from './src/distributed/load-balancer';

const loadBalancer = new LoadBalancer(new RoundRobinStrategy());

// Tasks will be distributed evenly in rotation
for (const task of taskQueue) {
  const worker = loadBalancer.selectWorker(task, workers);
  assignTask(worker, task);
}
```

**Use cases:**
- Homogeneous tasks with similar resource requirements
- Simple workload distribution
- When worker performance is similar

### 2. Least Loaded Strategy

Assigns tasks to the worker with the lowest current load.

```typescript
import { LeastLoadedStrategy } from './src/distributed/load-balancer';

const loadBalancer = new LoadBalancer(new LeastLoadedStrategy());

// Tasks go to least busy workers
const worker = loadBalancer.selectWorker(task, workers);
```

**Use cases:**
- General-purpose workloads
- Preventing worker overload
- Dynamic load balancing

### 3. Capability Based Strategy

Matches task requirements to worker capabilities for optimal specialization.

```typescript
import { CapabilityBasedStrategy } from './src/distributed/load-balancer';

const loadBalancer = new LoadBalancer(new CapabilityBasedStrategy());

// Define task with specific capability requirements
const task = {
  capabilities: ['database', 'postgresql', 'optimization'],
  complexity: 8,
  priority: 9
};

// Will select worker with best capability match
const worker = loadBalancer.selectWorker(task, workers);
```

**Use cases:**
- Tasks requiring specific skills or tools
- Specialized workloads (database, ML, frontend, etc.)
- Optimizing for expertise

### 4. Performance Based Strategy

Assigns tasks based on historical performance metrics.

```typescript
import { PerformanceBasedStrategy } from './src/distributed/load-balancer';

const loadBalancer = new LoadBalancer(new PerformanceBasedStrategy());

// Will select high-performing workers
const worker = loadBalancer.selectWorker(task, workers);
```

**Scoring factors:**
- Success rate (35%)
- Task completion speed (25%)
- Reliability/uptime (25%)
- Available capacity (15%)

**Use cases:**
- Critical tasks requiring high reliability
- Performance optimization
- Production workloads

### 5. Adaptive Strategy

Combines multiple strategies and learns optimal distribution patterns.

```typescript
import { AdaptiveStrategy } from './src/distributed/load-balancer';

const adaptive = new AdaptiveStrategy();
const loadBalancer = new LoadBalancer(adaptive);

// Select worker
const worker = loadBalancer.selectWorker(task, workers);

// Provide feedback to improve future selections
loadBalancer.updateContext(
  worker.id,
  task.taskType,
  true, // success
  5000  // duration in ms
);

// View current strategy weights
const weights = adaptive.getWeights();
console.log('Strategy weights:', Object.fromEntries(weights));
```

**Use cases:**
- Production environments with diverse workloads
- Learning optimal patterns over time
- Complex distribution requirements

## Worker Affinity Rules

### Task Affinity (Sticky Workers)

Prefer specific workers for related tasks:

```typescript
const task = {
  capabilities: ['typescript'],
  complexity: 5,
  priority: 7,
  taskType: 'code-generation',
  affinity: ['worker-3', 'worker-5'] // Prefer these workers
};

const worker = loadBalancer.selectWorker(task, workers);
```

### Anti-Affinity

Avoid workers with recent failures or conflicts:

```typescript
const task = {
  capabilities: ['database'],
  complexity: 8,
  priority: 9,
  antiAffinity: ['worker-2'] // Never assign to worker-2
};

const worker = loadBalancer.selectWorker(task, workers);
// Will never return worker-2
```

### Context-Based Affinity

Use balancing context for intelligent affinity:

```typescript
const context = {
  taskHistory: new Map([
    ['worker-1', ['typescript', 'testing', 'typescript']],
    ['worker-2', ['frontend', 'react', 'frontend']]
  ]),
  affinityRules: new Map([
    ['typescript', ['worker-1', 'worker-4']],
    ['frontend', ['worker-2']]
  ])
};

const loadBalancer = new LoadBalancer(new AdaptiveStrategy(), context);
```

## Worker Scoring

Get detailed scores for all workers:

```typescript
const task = {
  capabilities: ['typescript', 'testing'],
  complexity: 6,
  priority: 8
};

const scores = loadBalancer.scoreWorkers(task, workers);

scores.forEach(({ worker, score, breakdown }) => {
  console.log(`Worker ${worker.id}: ${score.toFixed(3)}`);
  console.log('  Capacity:', breakdown.capacityScore.toFixed(3));
  console.log('  Performance:', breakdown.performanceScore.toFixed(3));
  console.log('  Affinity:', breakdown.affinityScore.toFixed(3));
  console.log('  Reliability:', breakdown.reliabilityScore.toFixed(3));
});
```

**Score calculation:**
```
score = (
  0.4 * capacityScore +      // Available capacity
  0.3 * performanceScore +   // Success rate
  0.2 * affinityScore +      // Task affinity
  0.1 * reliabilityScore     // Speed + reliability
)
```

## Dynamic Rebalancing

### Detecting Overload

Monitor workers and detect overload conditions:

```typescript
const recommendations = loadBalancer.detectOverload(workers);

recommendations.forEach(rec => {
  console.log(`${rec.reason}`);
  console.log(`  Migrate from: ${rec.fromWorker}`);
  console.log(`  Migrate to: ${rec.toWorker}`);
  console.log(`  Priority: ${rec.priority}/10`);
});
```

### Task Migration

Suggest optimal task migrations:

```typescript
const taskQueue = [
  { id: 'task-1', requirements: { capabilities: ['typescript'], complexity: 5, priority: 7 } },
  { id: 'task-2', requirements: { capabilities: ['backend'], complexity: 8, priority: 9 } },
  { id: 'task-3', requirements: { capabilities: ['testing'], complexity: 4, priority: 5 } }
];

const migrations = loadBalancer.suggestMigration(workers, taskQueue);

migrations.forEach(mig => {
  console.log(`Consider migrating tasks from ${mig.fromWorker} to ${mig.toWorker}`);
  console.log(`Reason: ${mig.reason}`);
});
```

### Queue Reordering

Optimize task queue for better efficiency:

```typescript
const reordered = loadBalancer.reorderQueue(taskQueue, workers);

console.log('Optimized task order:');
reordered.forEach(task => {
  console.log(`- ${task.id} (priority: ${task.requirements.priority})`);
  console.log(`  Assigned to: ${task.assignedWorker || 'unassigned'}`);
});
```

## Integration with WorkerRegistry

```typescript
import { WorkerRegistry } from './src/distributed/worker-registry';
import { LoadBalancer } from './src/distributed/load-balancer';

class TaskDistributor {
  private registry: WorkerRegistry;
  private loadBalancer: LoadBalancer;

  constructor() {
    this.registry = new WorkerRegistry();
    this.loadBalancer = new LoadBalancer();
  }

  async distributeTask(task: TaskRequirements): Promise<string | null> {
    // Get available workers
    const workers = this.registry.getAll().map(w => ({
      id: w.id,
      capabilities: w.capabilities,
      maxCapacity: w.maxTasks,
      currentLoad: w.activeTasks.size,
      status: w.status as any,
      metrics: w.metrics
    }));

    // Select best worker
    const worker = this.loadBalancer.selectWorker(task, workers);

    if (!worker) {
      console.log('No capable worker available');
      return null;
    }

    // Assign task to worker
    const taskId = await this.registry.assignTask(worker.id, {
      id: crypto.randomUUID(),
      ...task
    });

    // Update context with assignment
    this.loadBalancer.updateContext(
      worker.id,
      task.taskType || 'generic',
      true,
      0
    );

    return taskId;
  }

  async handleTaskCompletion(
    workerId: string,
    taskId: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    // Complete task in registry
    this.registry.completeTask(workerId, taskId, success);

    // Update load balancer context
    const task = this.registry.getWorker(workerId)?.completedTasks.find(
      t => t.id === taskId
    );

    if (task) {
      this.loadBalancer.updateContext(
        workerId,
        task.type || 'generic',
        success,
        duration
      );
    }
  }

  monitorAndRebalance(): void {
    const workers = this.registry.getAll().map(w => ({
      id: w.id,
      capabilities: w.capabilities,
      maxCapacity: w.maxTasks,
      currentLoad: w.activeTasks.size,
      status: w.status as any,
      metrics: w.metrics
    }));

    // Detect overload
    const overloadRecs = this.loadBalancer.detectOverload(workers);

    if (overloadRecs.length > 0) {
      console.log('Overload detected! Recommendations:');
      overloadRecs.forEach(rec => {
        console.log(`  - ${rec.reason}`);
      });
    }

    // Check for load imbalance
    const taskQueue: any[] = []; // Get pending tasks
    const migrationRecs = this.loadBalancer.suggestMigration(workers, taskQueue);

    if (migrationRecs.length > 0) {
      console.log('Load imbalance detected! Consider rebalancing.');
    }
  }
}
```

## Advanced Usage

### Custom Strategy

Create custom balancing strategy:

```typescript
import { BalancingStrategy, WorkerInfo, TaskRequirements } from './src/distributed/load-balancer';

class CustomStrategy implements BalancingStrategy {
  name = 'custom-ml-strategy';

  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[]
  ): WorkerInfo | null {
    // Custom logic for ML workloads
    const mlCapable = workers.filter(w =>
      w.capabilities.has('tensorflow') &&
      w.capabilities.has('gpu')
    );

    if (mlCapable.length === 0) return null;

    // Select based on GPU memory
    return mlCapable.sort((a, b) =>
      (b.maxCapacity - b.currentLoad) - (a.maxCapacity - a.currentLoad)
    )[0];
  }
}

// Register and use custom strategy
const loadBalancer = new LoadBalancer();
loadBalancer.registerStrategy(new CustomStrategy());
loadBalancer.setStrategy('custom-ml-strategy');
```

### Multi-Region Load Balancing

```typescript
interface RegionalWorker extends WorkerInfo {
  region: string;
  latency: number;
}

class RegionalLoadBalancer extends LoadBalancer {
  selectWorkerByRegion(
    task: TaskRequirements,
    workers: RegionalWorker[],
    preferredRegion: string
  ): RegionalWorker | null {
    // Filter by region first
    const regionalWorkers = workers.filter(w => w.region === preferredRegion);

    // Fallback to nearest region if none available
    if (regionalWorkers.length === 0) {
      const sorted = workers.sort((a, b) => a.latency - b.latency);
      return super.selectWorker(task, sorted) as RegionalWorker;
    }

    return super.selectWorker(task, regionalWorkers) as RegionalWorker;
  }
}
```

### Priority-Based Distribution

```typescript
function distributeTasks(
  tasks: TaskRequirements[],
  workers: WorkerInfo[],
  loadBalancer: LoadBalancer
): Map<string, TaskRequirements[]> {
  const assignments = new Map<string, TaskRequirements[]>();

  // Sort tasks by priority (high to low)
  const sortedTasks = [...tasks].sort((a, b) =>
    (b.priority || 0) - (a.priority || 0)
  );

  for (const task of sortedTasks) {
    const worker = loadBalancer.selectWorker(task, workers);

    if (worker) {
      const workerTasks = assignments.get(worker.id) || [];
      workerTasks.push(task);
      assignments.set(worker.id, workerTasks);

      // Update worker load for next iteration
      const workerInfo = workers.find(w => w.id === worker.id);
      if (workerInfo) {
        workerInfo.currentLoad += task.complexity;
      }
    }
  }

  return assignments;
}
```

## Performance Monitoring

```typescript
class LoadBalancerMonitor {
  private loadBalancer: LoadBalancer;
  private metrics = {
    totalAssignments: 0,
    successfulAssignments: 0,
    failedAssignments: 0,
    averageAssignmentTime: 0
  };

  constructor(loadBalancer: LoadBalancer) {
    this.loadBalancer = loadBalancer;
  }

  async monitoredAssignment(
    task: TaskRequirements,
    workers: WorkerInfo[]
  ): Promise<WorkerInfo | null> {
    const startTime = Date.now();

    const worker = this.loadBalancer.selectWorker(task, workers);

    const assignmentTime = Date.now() - startTime;
    this.metrics.totalAssignments++;

    if (worker) {
      this.metrics.successfulAssignments++;
    } else {
      this.metrics.failedAssignments++;
    }

    this.metrics.averageAssignmentTime =
      (this.metrics.averageAssignmentTime * (this.metrics.totalAssignments - 1) +
       assignmentTime) / this.metrics.totalAssignments;

    return worker;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.successfulAssignments / this.metrics.totalAssignments
    };
  }
}
```

## Best Practices

1. **Choose the Right Strategy**
   - Use Round Robin for simple, homogeneous workloads
   - Use Least Loaded for general-purpose distribution
   - Use Capability Based when tasks require specific skills
   - Use Performance Based for critical production workloads
   - Use Adaptive for complex, evolving workloads

2. **Monitor and Rebalance**
   - Regularly check for overload conditions
   - Use `detectOverload()` to identify bottlenecks
   - Apply `suggestMigration()` recommendations
   - Reorder queues for optimal efficiency

3. **Provide Feedback**
   - Always call `updateContext()` after task completion
   - Track success/failure rates
   - Monitor task durations
   - Let adaptive strategies learn

4. **Use Affinity Wisely**
   - Set affinity for related tasks (e.g., sequential processing)
   - Use anti-affinity to avoid problematic workers
   - Don't over-constrain with too many affinity rules

5. **Consider Worker Capabilities**
   - Match task requirements to worker skills
   - Don't overload specialized workers
   - Maintain diverse worker pools

6. **Handle Edge Cases**
   - Check for null returns (no capable workers)
   - Handle offline workers gracefully
   - Plan for capacity exhaustion
   - Implement task queuing for backpressure

## Troubleshooting

### No workers selected

```typescript
const worker = loadBalancer.selectWorker(task, workers);

if (!worker) {
  // Check: Do workers have required capabilities?
  const capable = workers.filter(w =>
    task.capabilities.every(cap => w.capabilities.has(cap))
  );
  console.log(`Capable workers: ${capable.length}`);

  // Check: Do workers have available capacity?
  const available = capable.filter(w =>
    w.currentLoad + task.complexity <= w.maxCapacity
  );
  console.log(`Available workers: ${available.length}`);

  // Check: Are all workers offline?
  const online = workers.filter(w => w.status !== 'offline');
  console.log(`Online workers: ${online.length}`);
}
```

### Poor distribution

```typescript
// Check current strategy
console.log('Current strategy:', loadBalancer.getCurrentStrategy());

// Try switching strategies
loadBalancer.setStrategy('adaptive');

// Monitor worker scores
const scores = loadBalancer.scoreWorkers(task, workers);
console.log('Worker scores:', scores.map(s => ({
  id: s.worker.id,
  score: s.score,
  breakdown: s.breakdown
})));
```

### Persistent overload

```typescript
// Check overload recommendations
const overload = loadBalancer.detectOverload(workers);
console.log('Overload recommendations:', overload);

// Increase worker capacity or add workers
workerRegistry.scaleWorkers(workers.length + 2);

// Reduce task complexity
task.complexity = Math.floor(task.complexity * 0.8);
```

## Related Documentation

- [Worker Registry Guide](./worker-registry.md)
- [Task Queue Management](./task-queue.md)
- [Performance Optimization](./performance.md)
- [Distributed Systems](./distributed-systems.md)
