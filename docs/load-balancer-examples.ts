/**
 * Load Balancer Usage Examples
 *
 * Demonstrates various load balancing scenarios and patterns
 */

import {
  LoadBalancer,
  RoundRobinStrategy,
  LeastLoadedStrategy,
  CapabilityBasedStrategy,
  PerformanceBasedStrategy,
  AdaptiveStrategy,
  WorkerInfo,
  TaskRequirements
} from '../src/distributed/load-balancer';

// ============================================================================
// Example 1: Basic Load Balancing with Different Strategies
// ============================================================================

function example1_BasicLoadBalancing() {
  console.log('\n=== Example 1: Basic Load Balancing ===\n');

  // Create mock workers
  const workers: WorkerInfo[] = [
    {
      id: 'worker-1',
      capabilities: new Set(['typescript', 'testing']),
      maxCapacity: 10,
      currentLoad: 3,
      status: 'busy',
      metrics: {
        successRate: 0.95,
        failureRate: 0.05,
        averageTaskDuration: 5000,
        tasksCompleted: 100,
        tasksFailed: 5,
        uptime: 3600000
      }
    },
    {
      id: 'worker-2',
      capabilities: new Set(['typescript', 'frontend', 'react']),
      maxCapacity: 10,
      currentLoad: 2,
      status: 'busy',
      metrics: {
        successRate: 0.88,
        failureRate: 0.12,
        averageTaskDuration: 7000,
        tasksCompleted: 80,
        tasksFailed: 12,
        uptime: 3600000
      }
    },
    {
      id: 'worker-3',
      capabilities: new Set(['backend', 'database', 'postgresql']),
      maxCapacity: 15,
      currentLoad: 8,
      status: 'busy',
      metrics: {
        successRate: 0.92,
        failureRate: 0.08,
        averageTaskDuration: 6000,
        tasksCompleted: 120,
        tasksFailed: 10,
        uptime: 7200000
      }
    }
  ];

  const task: TaskRequirements = {
    capabilities: ['typescript'],
    complexity: 5,
    priority: 7,
    taskType: 'code-generation'
  };

  // Try different strategies
  const strategies = [
    new RoundRobinStrategy(),
    new LeastLoadedStrategy(),
    new CapabilityBasedStrategy(),
    new PerformanceBasedStrategy()
  ];

  strategies.forEach(strategy => {
    const loadBalancer = new LoadBalancer(strategy);
    const selectedWorker = loadBalancer.selectWorker(task, workers);

    console.log(`${strategy.name}:`);
    console.log(`  Selected: ${selectedWorker?.id || 'none'}`);
    console.log(`  Load: ${selectedWorker?.currentLoad}/${selectedWorker?.maxCapacity}`);
    console.log(`  Success Rate: ${(selectedWorker?.metrics.successRate * 100).toFixed(1)}%`);
  });
}

// ============================================================================
// Example 2: Adaptive Strategy with Learning
// ============================================================================

function example2_AdaptiveStrategy() {
  console.log('\n=== Example 2: Adaptive Strategy with Learning ===\n');

  const workers: WorkerInfo[] = [
    {
      id: 'worker-1',
      capabilities: new Set(['typescript', 'testing']),
      maxCapacity: 10,
      currentLoad: 2,
      status: 'busy',
      metrics: {
        successRate: 0.98,
        failureRate: 0.02,
        averageTaskDuration: 3000,
        tasksCompleted: 200,
        tasksFailed: 4,
        uptime: 7200000
      }
    },
    {
      id: 'worker-2',
      capabilities: new Set(['typescript', 'testing']),
      maxCapacity: 10,
      currentLoad: 2,
      status: 'busy',
      metrics: {
        successRate: 0.75,
        failureRate: 0.25,
        averageTaskDuration: 8000,
        tasksCompleted: 60,
        tasksFailed: 20,
        uptime: 3600000
      }
    }
  ];

  const adaptive = new AdaptiveStrategy();
  const loadBalancer = new LoadBalancer(adaptive);

  console.log('Initial strategy weights:');
  const initialWeights = adaptive.getWeights();
  initialWeights.forEach((weight, strategy) => {
    console.log(`  ${strategy}: ${(weight * 100).toFixed(1)}%`);
  });

  // Simulate 20 task assignments
  console.log('\nSimulating 20 task assignments...\n');

  for (let i = 0; i < 20; i++) {
    const task: TaskRequirements = {
      capabilities: ['typescript', 'testing'],
      complexity: 5,
      priority: 5 + Math.floor(Math.random() * 5)
    };

    const worker = loadBalancer.selectWorker(task, workers);

    if (worker) {
      // Simulate task execution with worker-specific success rates
      const success = Math.random() < worker.metrics.successRate;
      const duration = worker.metrics.averageTaskDuration + (Math.random() - 0.5) * 2000;

      loadBalancer.updateContext(worker.id, 'testing', success, duration);

      console.log(`Task ${i + 1}: ${worker.id} - ${success ? '✓' : '✗'}`);
    }
  }

  console.log('\nFinal strategy weights:');
  const finalWeights = adaptive.getWeights();
  finalWeights.forEach((weight, strategy) => {
    const change = weight - (initialWeights.get(strategy) || 0);
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    console.log(`  ${strategy}: ${(weight * 100).toFixed(1)}% ${arrow}`);
  });
}

// ============================================================================
// Example 3: Worker Affinity and Anti-Affinity
// ============================================================================

function example3_AffinityRules() {
  console.log('\n=== Example 3: Worker Affinity Rules ===\n');

  const workers: WorkerInfo[] = [
    {
      id: 'worker-gpu-1',
      capabilities: new Set(['ml', 'tensorflow', 'gpu']),
      maxCapacity: 20,
      currentLoad: 5,
      status: 'busy',
      metrics: {
        successRate: 0.95,
        failureRate: 0.05,
        averageTaskDuration: 15000,
        tasksCompleted: 50,
        tasksFailed: 3,
        uptime: 7200000
      }
    },
    {
      id: 'worker-cpu-1',
      capabilities: new Set(['ml', 'sklearn', 'cpu']),
      maxCapacity: 10,
      currentLoad: 3,
      status: 'busy',
      metrics: {
        successRate: 0.90,
        failureRate: 0.10,
        averageTaskDuration: 8000,
        tasksCompleted: 100,
        tasksFailed: 10,
        uptime: 7200000
      }
    },
    {
      id: 'worker-failed',
      capabilities: new Set(['ml', 'tensorflow', 'gpu']),
      maxCapacity: 20,
      currentLoad: 2,
      status: 'busy',
      metrics: {
        successRate: 0.50,
        failureRate: 0.50,
        averageTaskDuration: 12000,
        tasksCompleted: 30,
        tasksFailed: 30,
        uptime: 3600000
      }
    }
  ];

  const loadBalancer = new LoadBalancer();

  // Task 1: Prefer GPU workers (affinity)
  console.log('Task 1: ML training with GPU affinity');
  const task1: TaskRequirements = {
    capabilities: ['ml', 'tensorflow'],
    complexity: 15,
    priority: 9,
    taskType: 'ml-training',
    affinity: ['worker-gpu-1']
  };

  const worker1 = loadBalancer.selectWorker(task1, workers);
  console.log(`  Selected: ${worker1?.id}`);
  console.log(`  Has GPU: ${worker1?.capabilities.has('gpu')}`);

  // Task 2: Avoid failed worker (anti-affinity)
  console.log('\nTask 2: ML training avoiding unreliable worker');
  const task2: TaskRequirements = {
    capabilities: ['ml'],
    complexity: 10,
    priority: 8,
    antiAffinity: ['worker-failed']
  };

  const worker2 = loadBalancer.selectWorker(task2, workers);
  console.log(`  Selected: ${worker2?.id}`);
  console.log(`  Success rate: ${(worker2!.metrics.successRate * 100).toFixed(1)}%`);

  // Task 3: Combined affinity and anti-affinity
  console.log('\nTask 3: Prefer GPU but avoid failed worker');
  const task3: TaskRequirements = {
    capabilities: ['ml', 'tensorflow'],
    complexity: 12,
    priority: 9,
    affinity: ['worker-gpu-1', 'worker-failed'],
    antiAffinity: ['worker-failed'] // Anti-affinity takes precedence
  };

  const worker3 = loadBalancer.selectWorker(task3, workers);
  console.log(`  Selected: ${worker3?.id}`);
}

// ============================================================================
// Example 4: Dynamic Rebalancing
// ============================================================================

function example4_DynamicRebalancing() {
  console.log('\n=== Example 4: Dynamic Rebalancing ===\n');

  const workers: WorkerInfo[] = [
    {
      id: 'worker-1',
      capabilities: new Set(['backend', 'api']),
      maxCapacity: 10,
      currentLoad: 9, // 90% loaded - overloaded
      status: 'overloaded',
      metrics: {
        successRate: 0.85,
        failureRate: 0.15,
        averageTaskDuration: 9000,
        tasksCompleted: 85,
        tasksFailed: 15,
        uptime: 3600000
      }
    },
    {
      id: 'worker-2',
      capabilities: new Set(['backend', 'api']),
      maxCapacity: 10,
      currentLoad: 1, // 10% loaded - underutilized
      status: 'busy',
      metrics: {
        successRate: 0.95,
        failureRate: 0.05,
        averageTaskDuration: 5000,
        tasksCompleted: 95,
        tasksFailed: 5,
        uptime: 3600000
      }
    },
    {
      id: 'worker-3',
      capabilities: new Set(['backend', 'api']),
      maxCapacity: 10,
      currentLoad: 5, // 50% loaded - balanced
      status: 'busy',
      metrics: {
        successRate: 0.90,
        failureRate: 0.10,
        averageTaskDuration: 6000,
        tasksCompleted: 90,
        tasksFailed: 10,
        uptime: 3600000
      }
    }
  ];

  const loadBalancer = new LoadBalancer();

  // Detect overload
  console.log('Detecting overload conditions...\n');
  const overloadRecs = loadBalancer.detectOverload(workers);

  overloadRecs.forEach(rec => {
    console.log(`Recommendation (Priority: ${rec.priority}/10):`);
    console.log(`  ${rec.reason}`);
    console.log(`  Action: Migrate tasks from ${rec.fromWorker} to ${rec.toWorker}`);
  });

  // Suggest migration
  console.log('\nAnalyzing load distribution...\n');
  const taskQueue = [
    { id: 'task-1', requirements: { capabilities: ['backend'], complexity: 4, priority: 5 } },
    { id: 'task-2', requirements: { capabilities: ['api'], complexity: 3, priority: 7 } },
    { id: 'task-3', requirements: { capabilities: ['backend', 'api'], complexity: 5, priority: 6 } }
  ];

  const migrationRecs = loadBalancer.suggestMigration(workers, taskQueue);

  migrationRecs.forEach(rec => {
    console.log(`Migration suggestion (Priority: ${rec.priority}):`);
    console.log(`  ${rec.reason}`);
    console.log(`  From: ${rec.fromWorker} → To: ${rec.toWorker}`);
  });
}

// ============================================================================
// Example 5: Queue Reordering and Optimization
// ============================================================================

function example5_QueueOptimization() {
  console.log('\n=== Example 5: Queue Reordering and Optimization ===\n');

  const workers: WorkerInfo[] = [
    {
      id: 'worker-fast',
      capabilities: new Set(['typescript', 'testing', 'frontend']),
      maxCapacity: 15,
      currentLoad: 3,
      status: 'busy',
      metrics: {
        successRate: 0.98,
        failureRate: 0.02,
        averageTaskDuration: 2000,
        tasksCompleted: 200,
        tasksFailed: 4,
        uptime: 7200000
      }
    },
    {
      id: 'worker-specialized',
      capabilities: new Set(['backend', 'database']),
      maxCapacity: 10,
      currentLoad: 5,
      status: 'busy',
      metrics: {
        successRate: 0.95,
        failureRate: 0.05,
        averageTaskDuration: 5000,
        tasksCompleted: 100,
        tasksFailed: 5,
        uptime: 7200000
      }
    }
  ];

  const loadBalancer = new LoadBalancer();

  const taskQueue = [
    {
      id: 'task-1',
      requirements: {
        capabilities: ['typescript'],
        complexity: 3,
        priority: 5,
        taskType: 'code-review'
      }
    },
    {
      id: 'task-2',
      requirements: {
        capabilities: ['database'],
        complexity: 8,
        priority: 9,
        taskType: 'migration'
      }
    },
    {
      id: 'task-3',
      requirements: {
        capabilities: ['frontend'],
        complexity: 4,
        priority: 7,
        taskType: 'ui-component'
      }
    },
    {
      id: 'task-4',
      requirements: {
        capabilities: ['testing'],
        complexity: 2,
        priority: 3,
        taskType: 'unit-test'
      }
    },
    {
      id: 'task-5',
      requirements: {
        capabilities: ['backend'],
        complexity: 6,
        priority: 8,
        taskType: 'api-endpoint'
      }
    }
  ];

  console.log('Original task queue:');
  taskQueue.forEach(task => {
    console.log(`  ${task.id}: ${task.requirements.taskType} (priority: ${task.requirements.priority})`);
  });

  const reordered = loadBalancer.reorderQueue(taskQueue, workers);

  console.log('\nOptimized task queue:');
  reordered.forEach((task, index) => {
    const assignedWorker = task.assignedWorker || 'unassigned';
    console.log(
      `  ${index + 1}. ${task.id}: ${task.requirements.taskType} ` +
      `(priority: ${task.requirements.priority}) → ${assignedWorker}`
    );
  });

  console.log('\nOptimization benefits:');
  console.log('  - High-priority tasks scheduled first');
  console.log('  - Tasks matched to optimal workers');
  console.log('  - Load distributed efficiently');
}

// ============================================================================
// Example 6: Worker Scoring and Analysis
// ============================================================================

function example6_WorkerScoring() {
  console.log('\n=== Example 6: Worker Scoring and Analysis ===\n');

  const workers: WorkerInfo[] = [
    {
      id: 'worker-reliable',
      capabilities: new Set(['typescript', 'testing']),
      maxCapacity: 10,
      currentLoad: 3,
      status: 'busy',
      metrics: {
        successRate: 0.99,
        failureRate: 0.01,
        averageTaskDuration: 3000,
        tasksCompleted: 300,
        tasksFailed: 3,
        uptime: 14400000
      }
    },
    {
      id: 'worker-fast',
      capabilities: new Set(['typescript', 'testing']),
      maxCapacity: 10,
      currentLoad: 2,
      status: 'busy',
      metrics: {
        successRate: 0.85,
        failureRate: 0.15,
        averageTaskDuration: 1500,
        tasksCompleted: 170,
        tasksFailed: 30,
        uptime: 7200000
      }
    },
    {
      id: 'worker-available',
      capabilities: new Set(['typescript', 'testing']),
      maxCapacity: 20,
      currentLoad: 1,
      status: 'idle',
      metrics: {
        successRate: 0.90,
        failureRate: 0.10,
        averageTaskDuration: 5000,
        tasksCompleted: 90,
        tasksFailed: 10,
        uptime: 3600000
      }
    }
  ];

  const loadBalancer = new LoadBalancer();

  const task: TaskRequirements = {
    capabilities: ['typescript', 'testing'],
    complexity: 5,
    priority: 8,
    taskType: 'critical-test'
  };

  console.log('Analyzing workers for critical test task...\n');

  const scores = loadBalancer.scoreWorkers(task, workers);

  scores.forEach((score, index) => {
    console.log(`${index + 1}. ${score.worker.id} (Total Score: ${score.score.toFixed(3)})`);
    console.log(`   Capacity:     ${score.breakdown.capacityScore.toFixed(3)} (weight: 0.4)`);
    console.log(`   Performance:  ${score.breakdown.performanceScore.toFixed(3)} (weight: 0.3)`);
    console.log(`   Affinity:     ${score.breakdown.affinityScore.toFixed(3)} (weight: 0.2)`);
    console.log(`   Reliability:  ${score.breakdown.reliabilityScore.toFixed(3)} (weight: 0.1)`);
    console.log(`   Current Load: ${score.worker.currentLoad}/${score.worker.maxCapacity}`);
    console.log(`   Success Rate: ${(score.worker.metrics.successRate * 100).toFixed(1)}%`);
    console.log(`   Avg Duration: ${score.worker.metrics.averageTaskDuration}ms\n`);
  });

  const selected = loadBalancer.selectWorker(task, workers);
  console.log(`Selected worker: ${selected?.id}`);
  console.log('Rationale: Best balance of reliability, performance, and availability');
}

// ============================================================================
// Example 7: Multi-Stage Task Distribution
// ============================================================================

function example7_MultiStageDistribution() {
  console.log('\n=== Example 7: Multi-Stage Task Distribution ===\n');

  const workers: WorkerInfo[] = [
    {
      id: 'worker-research',
      capabilities: new Set(['research', 'analysis']),
      maxCapacity: 5,
      currentLoad: 1,
      status: 'busy',
      metrics: {
        successRate: 0.95,
        failureRate: 0.05,
        averageTaskDuration: 10000,
        tasksCompleted: 50,
        tasksFailed: 3,
        uptime: 7200000
      }
    },
    {
      id: 'worker-dev',
      capabilities: new Set(['typescript', 'development']),
      maxCapacity: 10,
      currentLoad: 3,
      status: 'busy',
      metrics: {
        successRate: 0.92,
        failureRate: 0.08,
        averageTaskDuration: 8000,
        tasksCompleted: 120,
        tasksFailed: 10,
        uptime: 7200000
      }
    },
    {
      id: 'worker-test',
      capabilities: new Set(['testing', 'qa']),
      maxCapacity: 8,
      currentLoad: 2,
      status: 'busy',
      metrics: {
        successRate: 0.97,
        failureRate: 0.03,
        averageTaskDuration: 6000,
        tasksCompleted: 200,
        tasksFailed: 6,
        uptime: 7200000
      }
    },
    {
      id: 'worker-deploy',
      capabilities: new Set(['deployment', 'devops']),
      maxCapacity: 5,
      currentLoad: 1,
      status: 'busy',
      metrics: {
        successRate: 0.98,
        failureRate: 0.02,
        averageTaskDuration: 5000,
        tasksCompleted: 100,
        tasksFailed: 2,
        uptime: 7200000
      }
    }
  ];

  const loadBalancer = new LoadBalancer(new PerformanceBasedStrategy());

  // Multi-stage feature development pipeline
  const stages = [
    {
      name: 'Research',
      task: {
        capabilities: ['research', 'analysis'],
        complexity: 8,
        priority: 9,
        taskType: 'requirements-analysis'
      }
    },
    {
      name: 'Development',
      task: {
        capabilities: ['typescript', 'development'],
        complexity: 10,
        priority: 9,
        taskType: 'implementation'
      }
    },
    {
      name: 'Testing',
      task: {
        capabilities: ['testing', 'qa'],
        complexity: 7,
        priority: 9,
        taskType: 'testing'
      }
    },
    {
      name: 'Deployment',
      task: {
        capabilities: ['deployment', 'devops'],
        complexity: 5,
        priority: 9,
        taskType: 'deployment'
      }
    }
  ];

  console.log('Feature Development Pipeline:\n');

  stages.forEach((stage, index) => {
    const worker = loadBalancer.selectWorker(stage.task, workers);

    console.log(`Stage ${index + 1}: ${stage.name}`);
    console.log(`  Assigned to: ${worker?.id || 'none'}`);
    console.log(`  Complexity: ${stage.task.complexity}/10`);
    console.log(`  Success Rate: ${worker ? (worker.metrics.successRate * 100).toFixed(1) : 'N/A'}%`);
    console.log(`  Est. Duration: ${worker?.metrics.averageTaskDuration || 0}ms\n`);

    // Update worker load for next stage
    if (worker) {
      worker.currentLoad += stage.task.complexity;
    }
  });

  const totalEstimatedTime = stages.reduce((sum, stage) => {
    const worker = loadBalancer.selectWorker(stage.task, workers);
    return sum + (worker?.metrics.averageTaskDuration || 0);
  }, 0);

  console.log(`Total estimated pipeline time: ${(totalEstimatedTime / 1000).toFixed(1)}s`);
}

// ============================================================================
// Run All Examples
// ============================================================================

function runAllExamples() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         Load Balancer Usage Examples                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  example1_BasicLoadBalancing();
  example2_AdaptiveStrategy();
  example3_AffinityRules();
  example4_DynamicRebalancing();
  example5_QueueOptimization();
  example6_WorkerScoring();
  example7_MultiStageDistribution();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('All examples completed!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Export for use in other files
export {
  example1_BasicLoadBalancing,
  example2_AdaptiveStrategy,
  example3_AffinityRules,
  example4_DynamicRebalancing,
  example5_QueueOptimization,
  example6_WorkerScoring,
  example7_MultiStageDistribution,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
