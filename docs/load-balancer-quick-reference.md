# Load Balancer Quick Reference

## 🚀 Quick Start

```typescript
import { LoadBalancer } from './src/distributed/load-balancer';

const loadBalancer = new LoadBalancer();
const worker = loadBalancer.selectWorker(task, workers);
```

## 📊 Strategies

| Strategy | Use Case | Complexity |
|----------|----------|------------|
| **Round Robin** | Homogeneous tasks | O(n) |
| **Least Loaded** | General workloads | O(n log n) |
| **Capability Based** | Specialized tasks | O(n × m) |
| **Performance Based** | Critical workloads | O(n) |
| **Adaptive** | Production systems | O(n × s) |

## 🎯 Strategy Selection

```typescript
// Switch strategy
loadBalancer.setStrategy('adaptive');

// Available strategies
const strategies = loadBalancer.getAvailableStrategies();
// ['round-robin', 'least-loaded', 'capability-based', 'performance-based', 'adaptive']
```

## 📝 Task Requirements

```typescript
const task: TaskRequirements = {
  capabilities: ['typescript', 'testing'],  // Required skills
  complexity: 7,                            // 1-10 scale
  priority: 8,                              // 1-10 scale
  taskType: 'unit-test',                    // Optional type
  estimatedDuration: 5000,                  // Milliseconds
  affinity: ['worker-1', 'worker-2'],      // Preferred workers
  antiAffinity: ['worker-3']                // Avoid these workers
};
```

## 👥 Worker Info

```typescript
const worker: WorkerInfo = {
  id: 'worker-1',
  capabilities: new Set(['typescript', 'testing']),
  maxCapacity: 10,
  currentLoad: 3,
  status: 'busy',  // 'idle' | 'busy' | 'overloaded' | 'offline'
  metrics: {
    successRate: 0.95,
    failureRate: 0.05,
    averageTaskDuration: 5000,
    tasksCompleted: 100,
    tasksFailed: 5,
    uptime: 3600000
  }
};
```

## 🎲 Scoring Formula

```typescript
score = (
  0.4 × capacityScore +      // Available capacity
  0.3 × performanceScore +   // Success rate
  0.2 × affinityScore +      // Task affinity
  0.1 × reliabilityScore     // Speed + uptime
)
```

## 📈 Worker Scoring

```typescript
const scores = loadBalancer.scoreWorkers(task, workers);

scores.forEach(({ worker, score, breakdown }) => {
  console.log(`${worker.id}: ${score.toFixed(3)}`);
  console.log(`  Capacity: ${breakdown.capacityScore.toFixed(3)}`);
  console.log(`  Performance: ${breakdown.performanceScore.toFixed(3)}`);
  console.log(`  Affinity: ${breakdown.affinityScore.toFixed(3)}`);
  console.log(`  Reliability: ${breakdown.reliabilityScore.toFixed(3)}`);
});
```

## 🔄 Dynamic Rebalancing

```typescript
// Detect overload
const overload = loadBalancer.detectOverload(workers);

// Suggest migrations
const migrations = loadBalancer.suggestMigration(workers, taskQueue);

// Reorder queue
const optimized = loadBalancer.reorderQueue(taskQueue, workers);
```

## 📊 Context Management

```typescript
// Update context after task completion
loadBalancer.updateContext(
  workerId,
  taskType,
  success,    // boolean
  duration    // milliseconds
);

// Get current context
const context = loadBalancer.getContext();

// Update settings
loadBalancer.updateContextSettings({
  loadThreshold: 0.85
});
```

## 🎯 Common Patterns

### High-Priority Tasks

```typescript
if (task.priority > 8) {
  loadBalancer.setStrategy('performance-based');
}
const worker = loadBalancer.selectWorker(task, workers);
```

### GPU Tasks

```typescript
const task = {
  capabilities: ['ml', 'tensorflow', 'gpu'],
  complexity: 10,
  priority: 9,
  affinity: ['worker-gpu-1', 'worker-gpu-2']
};
```

### Avoid Failed Workers

```typescript
const task = {
  capabilities: ['backend'],
  complexity: 5,
  priority: 7,
  antiAffinity: ['worker-failed']
};
```

### Sequential Tasks

```typescript
const tasks = [
  { id: 'research', capabilities: ['research'] },
  { id: 'develop', capabilities: ['typescript'], affinity: ['worker-1'] },
  { id: 'test', capabilities: ['testing'], affinity: ['worker-1'] },
  { id: 'deploy', capabilities: ['devops'] }
];
```

## ⚡ Performance Tips

1. **Use Adaptive** for production workloads
2. **Monitor regularly** with `detectOverload()`
3. **Provide feedback** via `updateContext()`
4. **Set affinity** for related tasks
5. **Reorder queues** for efficiency

## 🐛 Troubleshooting

### No Worker Selected

```typescript
if (!worker) {
  // Check capabilities
  const capable = workers.filter(w =>
    task.capabilities.every(cap => w.capabilities.has(cap))
  );

  // Check capacity
  const available = capable.filter(w =>
    w.maxCapacity - w.currentLoad >= task.complexity
  );

  // Check status
  const online = workers.filter(w => w.status !== 'offline');
}
```

### Poor Distribution

```typescript
// Check scores
const scores = loadBalancer.scoreWorkers(task, workers);

// Try different strategy
loadBalancer.setStrategy('adaptive');

// Check for overload
const overload = loadBalancer.detectOverload(workers);
```

### Persistent Overload

```typescript
// Increase capacity
workers.forEach(w => w.maxCapacity *= 1.2);

// Add workers
workerRegistry.addWorker(newWorker);

// Reduce complexity
task.complexity = Math.floor(task.complexity * 0.8);
```

## 📚 API Reference

### LoadBalancer Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `selectWorker(task, workers)` | Select best worker | `WorkerInfo \| null` |
| `scoreWorkers(task, workers)` | Score all workers | `WorkerScore[]` |
| `setStrategy(name)` | Change strategy | `boolean` |
| `getCurrentStrategy()` | Get active strategy | `string` |
| `getAvailableStrategies()` | List strategies | `string[]` |
| `detectOverload(workers)` | Find overloaded workers | `Recommendation[]` |
| `suggestMigration(workers, queue)` | Suggest migrations | `Recommendation[]` |
| `reorderQueue(queue, workers)` | Optimize queue | `Task[]` |
| `updateContext(...)` | Update after task | `void` |
| `getContext()` | Get context | `BalancingContext` |
| `updateContextSettings(...)` | Update settings | `void` |

### Strategy Methods

| Strategy | Method | Description |
|----------|--------|-------------|
| All | `selectWorker(task, workers, context?)` | Select worker |
| Adaptive | `updateWeights(strategy, success)` | Update weights |
| Adaptive | `getWeights()` | Get current weights |

## 🔧 Configuration

```typescript
// Initialize with strategy
const loadBalancer = new LoadBalancer(
  new AdaptiveStrategy(),
  {
    loadThreshold: 0.8,
    taskHistory: new Map(),
    recentFailures: new Map(),
    affinityRules: new Map()
  }
);

// Register custom strategy
loadBalancer.registerStrategy(new CustomStrategy());
```

## 📊 Monitoring Metrics

Track these metrics:

- **Assignment Time**: Time to select worker
- **Success Rate**: % of successful assignments
- **Load Variance**: Distribution across workers
- **Strategy Effectiveness**: Success by strategy
- **Overload Frequency**: How often rebalancing needed
- **Queue Depth**: Pending tasks
- **Worker Utilization**: Average capacity usage

## 🎯 Decision Matrix

| Scenario | Strategy | Reason |
|----------|----------|--------|
| Similar tasks | Round Robin | Simple, fair |
| Variable load | Least Loaded | Prevent overload |
| Specialized skills | Capability Based | Match expertise |
| Critical tasks | Performance Based | Reliability first |
| Production | Adaptive | Learn & optimize |
| GPU/ML tasks | Capability + Affinity | Specific resources |
| Sequential pipeline | Capability + Affinity | Continuity |
| High throughput | Least Loaded | Balance load |

## 📖 Related Docs

- [Complete Integration Guide](./load-balancer-integration.md)
- [Usage Examples](./load-balancer-examples.ts)
- [Implementation Summary](./LOAD-BALANCER-SUMMARY.md)
- [Worker Registry Guide](./worker-registry.md)

---

**Quick Links:**
- [Source Code](/workspaces/Task-Sentinel/src/distributed/load-balancer.ts)
- [Tests](/workspaces/Task-Sentinel/tests/load-balancer.test.ts)
- [Examples](/workspaces/Task-Sentinel/docs/load-balancer-examples.ts)
