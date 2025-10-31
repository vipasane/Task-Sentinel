/**
 * Comprehensive Test Suite for Load Balancer
 */

import {
  LoadBalancer,
  RoundRobinStrategy,
  LeastLoadedStrategy,
  CapabilityBasedStrategy,
  PerformanceBasedStrategy,
  AdaptiveStrategy,
  WorkerInfo,
  TaskRequirements,
  WorkerMetrics
} from '../src/distributed/load-balancer';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let mockWorkers: WorkerInfo[];

  beforeEach(() => {
    // Create mock workers with diverse capabilities
    mockWorkers = [
      createMockWorker('worker-1', ['typescript', 'testing'], 10, 2, {
        successRate: 0.95,
        failureRate: 0.05,
        averageTaskDuration: 5000,
        tasksCompleted: 100,
        tasksFailed: 5,
        uptime: 3600000
      }),
      createMockWorker('worker-2', ['typescript', 'frontend'], 10, 5, {
        successRate: 0.85,
        failureRate: 0.15,
        averageTaskDuration: 8000,
        tasksCompleted: 80,
        tasksFailed: 15,
        uptime: 3600000
      }),
      createMockWorker('worker-3', ['backend', 'database'], 15, 10, {
        successRate: 0.9,
        failureRate: 0.1,
        averageTaskDuration: 6000,
        tasksCompleted: 90,
        tasksFailed: 10,
        uptime: 3600000
      }),
      createMockWorker('worker-4', ['typescript', 'backend', 'testing'], 20, 3, {
        successRate: 0.98,
        failureRate: 0.02,
        averageTaskDuration: 4000,
        tasksCompleted: 200,
        tasksFailed: 4,
        uptime: 7200000
      })
    ];

    loadBalancer = new LoadBalancer();
  });

  describe('Strategy Selection', () => {
    test('should allow setting different strategies', () => {
      expect(loadBalancer.setStrategy('round-robin')).toBe(true);
      expect(loadBalancer.getCurrentStrategy()).toBe('round-robin');

      expect(loadBalancer.setStrategy('least-loaded')).toBe(true);
      expect(loadBalancer.getCurrentStrategy()).toBe('least-loaded');

      expect(loadBalancer.setStrategy('non-existent')).toBe(false);
    });

    test('should list all available strategies', () => {
      const strategies = loadBalancer.getAvailableStrategies();
      expect(strategies).toContain('round-robin');
      expect(strategies).toContain('least-loaded');
      expect(strategies).toContain('capability-based');
      expect(strategies).toContain('performance-based');
      expect(strategies).toContain('adaptive');
    });
  });

  describe('Round Robin Strategy', () => {
    beforeEach(() => {
      loadBalancer.setStrategy('round-robin');
    });

    test('should rotate through available workers', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const selections = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const worker = loadBalancer.selectWorker(task, mockWorkers);
        expect(worker).not.toBeNull();
        if (worker) selections.add(worker.id);
      }

      // Should have selected multiple workers
      expect(selections.size).toBeGreaterThan(1);
    });

    test('should only select capable workers', () => {
      const task: TaskRequirements = {
        capabilities: ['database'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      expect(worker?.id).toBe('worker-3');
    });

    test('should return null if no capable workers', () => {
      const task: TaskRequirements = {
        capabilities: ['nonexistent-capability'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).toBeNull();
    });
  });

  describe('Least Loaded Strategy', () => {
    beforeEach(() => {
      loadBalancer.setStrategy('least-loaded');
    });

    test('should select worker with most available capacity', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 3,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // worker-1 has 8 available (10-2), worker-4 has 17 available (20-3)
      expect(worker?.id).toBe('worker-4');
    });

    test('should not select overloaded workers', () => {
      const task: TaskRequirements = {
        capabilities: ['backend'],
        complexity: 3,
        priority: 5
      };

      // Mark worker-3 as overloaded
      mockWorkers[2].status = 'overloaded';

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      expect(worker?.id).toBe('worker-4');
    });

    test('should handle high complexity tasks', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 12,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // Only worker-4 has 17 available capacity
      expect(worker?.id).toBe('worker-4');
    });
  });

  describe('Capability Based Strategy', () => {
    beforeEach(() => {
      loadBalancer.setStrategy('capability-based');
    });

    test('should prefer specialized workers', () => {
      const task: TaskRequirements = {
        capabilities: ['database'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      expect(worker?.id).toBe('worker-3'); // Only has database capability
    });

    test('should handle multiple required capabilities', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript', 'backend', 'testing'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      expect(worker?.id).toBe('worker-4'); // Has all three
    });

    test('should penalize overloaded specialized workers', () => {
      mockWorkers[2].status = 'overloaded';

      const task: TaskRequirements = {
        capabilities: ['database'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      // Should still select worker-3 but with penalty
      expect(worker).not.toBeNull();
    });
  });

  describe('Performance Based Strategy', () => {
    beforeEach(() => {
      loadBalancer.setStrategy('performance-based');
    });

    test('should select high-performing workers', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // worker-4 has highest success rate (0.98) and fastest duration (4000ms)
      expect(worker?.id).toBe('worker-4');
    });

    test('should penalize workers with recent failures', () => {
      const context = {
        recentFailures: new Map([['worker-4', Date.now()]])
      };

      const customBalancer = new LoadBalancer(
        new PerformanceBasedStrategy(),
        context
      );

      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = customBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // Should prefer worker-1 over worker-4 due to recent failure
      expect(['worker-1', 'worker-2']).toContain(worker?.id);
    });

    test('should balance performance with capacity', () => {
      // Make worker-4 nearly full
      mockWorkers[3].currentLoad = 18;

      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // Should prefer worker-1 which has better availability
      expect(['worker-1', 'worker-4']).toContain(worker?.id);
    });
  });

  describe('Adaptive Strategy', () => {
    test('should combine multiple strategies', () => {
      const adaptive = new AdaptiveStrategy();
      loadBalancer = new LoadBalancer(adaptive);

      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
    });

    test('should update weights based on feedback', () => {
      const adaptive = new AdaptiveStrategy();

      const initialWeights = adaptive.getWeights();
      expect(initialWeights.get('performance')).toBe(0.4);

      // Simulate successful outcomes for performance strategy
      for (let i = 0; i < 10; i++) {
        adaptive.updateWeights('performance', true);
      }

      // Simulate failures for round-robin
      for (let i = 0; i < 5; i++) {
        adaptive.updateWeights('round-robin', false);
      }

      const updatedWeights = adaptive.getWeights();
      // Performance weight should remain high or increase
      expect(updatedWeights.get('performance')).toBeGreaterThanOrEqual(
        initialWeights.get('performance')!
      );
    });
  });

  describe('Worker Scoring', () => {
    test('should score all available workers', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const scores = loadBalancer.scoreWorkers(task, mockWorkers);
      expect(scores.length).toBeGreaterThan(0);
      expect(scores[0].score).toBeGreaterThan(0);
      expect(scores[0].breakdown).toHaveProperty('capacityScore');
      expect(scores[0].breakdown).toHaveProperty('performanceScore');
      expect(scores[0].breakdown).toHaveProperty('affinityScore');
      expect(scores[0].breakdown).toHaveProperty('reliabilityScore');
    });

    test('should sort workers by score', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const scores = loadBalancer.scoreWorkers(task, mockWorkers);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1].score).toBeGreaterThanOrEqual(scores[i].score);
      }
    });

    test('should handle empty worker list', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const scores = loadBalancer.scoreWorkers(task, []);
      expect(scores.length).toBe(0);
    });
  });

  describe('Affinity Rules', () => {
    test('should respect task affinity preferences', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5,
        affinity: ['worker-2']
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // Should prefer worker-2 due to affinity
      expect(worker?.id).toBe('worker-2');
    });

    test('should respect anti-affinity rules', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5,
        antiAffinity: ['worker-4']
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      expect(worker?.id).not.toBe('worker-4');
    });

    test('should handle both affinity and anti-affinity', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5,
        affinity: ['worker-1', 'worker-2'],
        antiAffinity: ['worker-2']
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
      // Anti-affinity takes precedence
      expect(worker?.id).not.toBe('worker-2');
    });
  });

  describe('Overload Detection', () => {
    test('should detect overloaded workers', () => {
      mockWorkers[0].currentLoad = 9; // 90% capacity
      mockWorkers[2].currentLoad = 14; // 93% capacity

      const recommendations = loadBalancer.detectOverload(mockWorkers);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].reason).toContain('overloaded');
    });

    test('should recommend migration to underutilized workers', () => {
      mockWorkers[0].currentLoad = 9;
      mockWorkers[3].currentLoad = 2; // 10% capacity

      const recommendations = loadBalancer.detectOverload(mockWorkers);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].toWorker).toBe('worker-4');
    });

    test('should prioritize by severity', () => {
      mockWorkers[0].currentLoad = 10; // 100% capacity
      mockWorkers[2].currentLoad = 13; // 87% capacity

      const recommendations = loadBalancer.detectOverload(mockWorkers);
      if (recommendations.length > 1) {
        expect(recommendations[0].priority).toBeGreaterThanOrEqual(
          recommendations[1].priority
        );
      }
    });
  });

  describe('Task Migration', () => {
    test('should suggest migration for load imbalance', () => {
      mockWorkers[0].currentLoad = 1; // 10%
      mockWorkers[2].currentLoad = 14; // 93%

      const taskQueue = [
        { id: 'task-1', requirements: { capabilities: ['backend'], complexity: 5, priority: 5 } },
        { id: 'task-2', requirements: { capabilities: ['backend'], complexity: 3, priority: 7 } }
      ];

      const recommendations = loadBalancer.suggestMigration(
        mockWorkers,
        taskQueue
      );
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('should not suggest migration for balanced load', () => {
      // Set all workers to similar load
      mockWorkers.forEach(w => (w.currentLoad = w.maxCapacity * 0.5));

      const taskQueue = [
        { id: 'task-1', requirements: { capabilities: ['typescript'], complexity: 5, priority: 5 } }
      ];

      const recommendations = loadBalancer.suggestMigration(
        mockWorkers,
        taskQueue
      );
      expect(recommendations.length).toBe(0);
    });
  });

  describe('Queue Reordering', () => {
    test('should prioritize high-priority tasks', () => {
      const taskQueue = [
        { id: 'task-1', requirements: { capabilities: ['typescript'], complexity: 5, priority: 3 } },
        { id: 'task-2', requirements: { capabilities: ['typescript'], complexity: 5, priority: 8 } },
        { id: 'task-3', requirements: { capabilities: ['typescript'], complexity: 5, priority: 5 } }
      ];

      const reordered = loadBalancer.reorderQueue(taskQueue, mockWorkers);
      expect(reordered[0].id).toBe('task-2'); // Highest priority
      expect(reordered[2].id).toBe('task-1'); // Lowest priority
    });

    test('should assign workers to tasks', () => {
      const taskQueue = [
        { id: 'task-1', requirements: { capabilities: ['typescript'], complexity: 5, priority: 5 } },
        { id: 'task-2', requirements: { capabilities: ['database'], complexity: 5, priority: 5 } }
      ];

      const reordered = loadBalancer.reorderQueue(taskQueue, mockWorkers);
      reordered.forEach(task => {
        expect(task.assignedWorker).toBeDefined();
      });
    });

    test('should handle tasks with no capable workers', () => {
      const taskQueue = [
        { id: 'task-1', requirements: { capabilities: ['nonexistent'], complexity: 5, priority: 5 } }
      ];

      const reordered = loadBalancer.reorderQueue(taskQueue, mockWorkers);
      expect(reordered[0].assignedWorker).toBeUndefined();
    });
  });

  describe('Context Management', () => {
    test('should update context with task feedback', () => {
      loadBalancer.updateContext('worker-1', 'typescript', true, 5000);

      const context = loadBalancer.getContext();
      expect(context.taskHistory?.get('worker-1')).toContain('typescript');
    });

    test('should track recent failures', () => {
      loadBalancer.updateContext('worker-2', 'frontend', false, 10000);

      const context = loadBalancer.getContext();
      expect(context.recentFailures?.has('worker-2')).toBe(true);
    });

    test('should allow context updates', () => {
      loadBalancer.updateContextSettings({ loadThreshold: 0.9 });

      const context = loadBalancer.getContext();
      expect(context.loadThreshold).toBe(0.9);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty worker list', () => {
      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, []);
      expect(worker).toBeNull();
    });

    test('should handle all workers offline', () => {
      mockWorkers.forEach(w => (w.status = 'offline'));

      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).toBeNull();
    });

    test('should handle task with no required capabilities', () => {
      const task: TaskRequirements = {
        capabilities: [],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, mockWorkers);
      expect(worker).not.toBeNull();
    });

    test('should handle worker with zero capacity', () => {
      const zeroCapWorker = createMockWorker('worker-0', ['typescript'], 0, 0, {
        successRate: 1,
        failureRate: 0,
        averageTaskDuration: 1000,
        tasksCompleted: 0,
        tasksFailed: 0,
        uptime: 0
      });

      const workersWithZero = [...mockWorkers, zeroCapWorker];

      const task: TaskRequirements = {
        capabilities: ['typescript'],
        complexity: 5,
        priority: 5
      };

      const worker = loadBalancer.selectWorker(task, workersWithZero);
      expect(worker).not.toBeNull();
      expect(worker?.id).not.toBe('worker-0');
    });
  });
});

// Helper function to create mock workers
function createMockWorker(
  id: string,
  capabilities: string[],
  maxCapacity: number,
  currentLoad: number,
  metrics: WorkerMetrics
): WorkerInfo {
  return {
    id,
    capabilities: new Set(capabilities),
    maxCapacity,
    currentLoad,
    status: currentLoad >= maxCapacity ? 'overloaded' : currentLoad > 0 ? 'busy' : 'idle',
    metrics
  };
}
