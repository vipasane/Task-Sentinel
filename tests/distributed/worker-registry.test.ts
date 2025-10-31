/**
 * Tests for Worker Registry
 */

import { WorkerRegistry, WorkerRegistration, WorkerFilter } from '../../src/distributed/worker-registry';
import { ClaudeFlowMemory } from '../../src/memory/claude-flow-memory';

// Mock ClaudeFlowMemory
class MockMemory implements ClaudeFlowMemory {
  private storage: Map<string, { value: string; ttl: number; timestamp: number }> = new Map();

  async store(key: string, value: string, ttl?: number): Promise<void> {
    this.storage.set(key, {
      value,
      ttl: ttl || 0,
      timestamp: Date.now(),
    });
  }

  async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
    if (!item) {
      return null;
    }

    // Check TTL
    if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
      this.storage.delete(key);
      return null;
    }

    return item.value;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async search(pattern: string): Promise<Array<{ key: string; value: string }>> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const results: Array<{ key: string; value: string }> = [];

    for (const [key, item] of this.storage.entries()) {
      if (regex.test(key)) {
        // Check TTL
        if (item.ttl === 0 || Date.now() - item.timestamp <= item.ttl) {
          results.push({ key, value: item.value });
        } else {
          this.storage.delete(key);
        }
      }
    }

    return results;
  }

  async list(namespace?: string): Promise<string[]> {
    const prefix = namespace || '';
    const keys: string[] = [];

    for (const [key, item] of this.storage.entries()) {
      if (key.startsWith(prefix)) {
        // Check TTL
        if (item.ttl === 0 || Date.now() - item.timestamp <= item.ttl) {
          keys.push(key);
        } else {
          this.storage.delete(key);
        }
      }
    }

    return keys;
  }

  clear(): void {
    this.storage.clear();
  }
}

describe('WorkerRegistry', () => {
  let registry: WorkerRegistry;
  let mockMemory: MockMemory;

  beforeEach(() => {
    mockMemory = new MockMemory();
    registry = new WorkerRegistry({
      memory: mockMemory,
      workerTTL: 15 * 60 * 1000,
      healthyThreshold: 10 * 60 * 1000,
      degradedThreshold: 15 * 60 * 1000,
      cleanupInterval: 5 * 60 * 1000,
    });
  });

  afterEach(() => {
    registry.stopCleanup();
    mockMemory.clear();
  });

  describe('Worker Registration', () => {
    it('should register a new worker', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder', 'tester'],
        maxConcurrentTasks: 5,
      };

      const worker = await registry.registerWorker(registration);

      expect(worker).toBeDefined();
      expect(worker.id).toMatch(/^worker-/);
      expect(worker.nodeId).toBe('node-1');
      expect(worker.capabilities).toEqual(['coder', 'tester']);
      expect(worker.maxConcurrentTasks).toBe(5);
      expect(worker.currentTasks).toBe(0);
      expect(worker.healthStatus).toBe('healthy');
      expect(worker.metrics.tasksCompleted).toBe(0);
      expect(worker.metrics.tasksFailedCount).toBe(0);
    });

    it('should retrieve a registered worker', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      const registered = await registry.registerWorker(registration);
      const retrieved = await registry.getWorker(registered.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(registered.id);
      expect(retrieved?.nodeId).toBe('node-1');
    });

    it('should return null for non-existent worker', async () => {
      const worker = await registry.getWorker('non-existent-id');
      expect(worker).toBeNull();
    });
  });

  describe('Worker Heartbeat', () => {
    it('should update worker heartbeat', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      const worker = await registry.registerWorker(registration);
      const originalHeartbeat = worker.lastHeartbeat;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      await registry.heartbeat(worker.id);
      const updated = await registry.getWorker(worker.id);

      expect(updated?.lastHeartbeat.getTime()).toBeGreaterThan(originalHeartbeat.getTime());
    });

    it('should throw error for non-existent worker heartbeat', async () => {
      await expect(registry.heartbeat('non-existent-id')).rejects.toThrow();
    });
  });

  describe('Worker Health Status', () => {
    it('should mark worker as healthy with recent heartbeat', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      const worker = await registry.registerWorker(registration);
      expect(worker.healthStatus).toBe('healthy');
    });

    it('should detect degraded worker', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      // Create registry with short thresholds for testing
      const testRegistry = new WorkerRegistry({
        memory: mockMemory,
        healthyThreshold: 100, // 100ms
        degradedThreshold: 500, // 500ms
      });

      await testRegistry.registerWorker(registration);

      // Wait for worker to become degraded
      await new Promise(resolve => setTimeout(resolve, 200));

      const workers = await testRegistry.discoverWorkers();
      expect(workers[0].healthStatus).toBe('degraded');
    });

    it('should detect unhealthy worker', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      // Create registry with short thresholds for testing
      const testRegistry = new WorkerRegistry({
        memory: mockMemory,
        healthyThreshold: 100, // 100ms
        degradedThreshold: 300, // 300ms
      });

      await testRegistry.registerWorker(registration);

      // Wait for worker to become unhealthy
      await new Promise(resolve => setTimeout(resolve, 400));

      const workers = await testRegistry.discoverWorkers();
      expect(workers[0].healthStatus).toBe('unhealthy');
    });
  });

  describe('Worker Task Management', () => {
    it('should update worker task count', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 5,
      };

      const worker = await registry.registerWorker(registration);

      await registry.updateTaskCount(worker.id, 2);
      let updated = await registry.getWorker(worker.id);
      expect(updated?.currentTasks).toBe(2);

      await registry.updateTaskCount(worker.id, -1);
      updated = await registry.getWorker(worker.id);
      expect(updated?.currentTasks).toBe(1);
    });

    it('should not allow negative task count', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 5,
      };

      const worker = await registry.registerWorker(registration);

      await registry.updateTaskCount(worker.id, -5);
      const updated = await registry.getWorker(worker.id);
      expect(updated?.currentTasks).toBe(0);
    });

    it('should record task completion', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 5,
      };

      const worker = await registry.registerWorker(registration);
      await registry.updateTaskCount(worker.id, 1);

      await registry.recordTaskCompletion(worker.id, true, 5000);

      const updated = await registry.getWorker(worker.id);
      expect(updated?.metrics.tasksCompleted).toBe(1);
      expect(updated?.metrics.averageTaskDuration).toBe(5000);
      expect(updated?.currentTasks).toBe(0);
    });

    it('should record task failure', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 5,
      };

      const worker = await registry.registerWorker(registration);
      await registry.updateTaskCount(worker.id, 1);

      await registry.recordTaskCompletion(worker.id, false, 3000);

      const updated = await registry.getWorker(worker.id);
      expect(updated?.metrics.tasksFailedCount).toBe(1);
      expect(updated?.metrics.tasksCompleted).toBe(0);
    });
  });

  describe('Worker Discovery', () => {
    beforeEach(async () => {
      // Register multiple workers
      await registry.registerWorker({
        nodeId: 'node-1',
        capabilities: ['coder', 'tester'],
        maxConcurrentTasks: 5,
      });

      await registry.registerWorker({
        nodeId: 'node-2',
        capabilities: ['reviewer'],
        maxConcurrentTasks: 3,
      });

      await registry.registerWorker({
        nodeId: 'node-3',
        capabilities: ['coder'],
        maxConcurrentTasks: 10,
      });
    });

    it('should discover all workers', async () => {
      const workers = await registry.discoverWorkers();
      expect(workers).toHaveLength(3);
    });

    it('should filter workers by capability', async () => {
      const filter: WorkerFilter = {
        capabilities: ['coder'],
      };

      const workers = await registry.discoverWorkers(filter);
      expect(workers).toHaveLength(2);
      expect(workers.every(w => w.capabilities.includes('coder'))).toBe(true);
    });

    it('should filter workers by multiple capabilities', async () => {
      const filter: WorkerFilter = {
        capabilities: ['coder', 'tester'],
      };

      const workers = await registry.discoverWorkers(filter);
      expect(workers).toHaveLength(1);
      expect(workers[0].nodeId).toBe('node-1');
    });

    it('should filter workers by health status', async () => {
      const filter: WorkerFilter = {
        healthStatus: ['healthy'],
      };

      const workers = await registry.discoverWorkers(filter);
      expect(workers.every(w => w.healthStatus === 'healthy')).toBe(true);
    });

    it('should filter workers by available capacity', async () => {
      // Update task count for some workers
      const allWorkers = await registry.discoverWorkers();
      await registry.updateTaskCount(allWorkers[0].id, 4);
      await registry.updateTaskCount(allWorkers[1].id, 3);

      const filter: WorkerFilter = {
        minAvailableCapacity: 2,
      };

      const workers = await registry.discoverWorkers(filter);
      expect(workers.length).toBeGreaterThan(0);
      expect(workers.every(w =>
        (w.maxConcurrentTasks - w.currentTasks) >= 2
      )).toBe(true);
    });
  });

  describe('Load Balancing', () => {
    beforeEach(async () => {
      // Register workers with different characteristics
      const worker1 = await registry.registerWorker({
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 5,
      });

      const worker2 = await registry.registerWorker({
        nodeId: 'node-2',
        capabilities: ['coder'],
        maxConcurrentTasks: 10,
      });

      const worker3 = await registry.registerWorker({
        nodeId: 'node-3',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      });

      // Simulate different load levels
      await registry.updateTaskCount(worker1.id, 2); // 3 available
      await registry.updateTaskCount(worker2.id, 1); // 9 available
      await registry.updateTaskCount(worker3.id, 2); // 1 available

      // Add some metrics (need to add tasks first before completing them)
      await registry.updateTaskCount(worker1.id, 1);
      await registry.recordTaskCompletion(worker1.id, true, 5000);
      await registry.updateTaskCount(worker2.id, 2);
      await registry.recordTaskCompletion(worker2.id, true, 3000);
      await registry.recordTaskCompletion(worker2.id, true, 4000);
    });

    it('should return workers sorted by priority', async () => {
      const workers = await registry.getWorkersForLoadBalancing();

      expect(workers).toHaveLength(3);

      // Workers should be sorted by priority (descending)
      for (let i = 0; i < workers.length - 1; i++) {
        expect(workers[i].priority).toBeGreaterThanOrEqual(workers[i + 1].priority);
      }
    });

    it('should calculate available capacity correctly', async () => {
      const workers = await registry.getWorkersForLoadBalancing();

      const worker = workers.find(w => w.nodeId === 'node-2');
      expect(worker?.availableCapacity).toBe(9);
    });

    it('should calculate success rate correctly', async () => {
      const workers = await registry.getWorkersForLoadBalancing();

      const worker = workers.find(w => w.nodeId === 'node-2');
      expect(worker?.successRate).toBe(1.0); // 2 completed, 0 failed
    });

    it('should prioritize workers with more available capacity', async () => {
      const workers = await registry.getWorkersForLoadBalancing();

      // Worker with most available capacity should have high priority
      const topWorker = workers[0];
      expect(topWorker.nodeId).toBe('node-2'); // Has 9 available slots
    });
  });

  describe('Worker Unregistration', () => {
    it('should unregister a worker', async () => {
      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      const worker = await registry.registerWorker(registration);
      await registry.unregisterWorker(worker.id);

      const retrieved = await registry.getWorker(worker.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Automatic Cleanup', () => {
    it('should cleanup unhealthy workers', async () => {
      // Create registry with very short thresholds
      const testRegistry = new WorkerRegistry({
        memory: mockMemory,
        healthyThreshold: 50,
        degradedThreshold: 100,
        cleanupInterval: 150,
      });

      const registration: WorkerRegistration = {
        nodeId: 'node-1',
        capabilities: ['coder'],
        maxConcurrentTasks: 3,
      };

      const worker = await testRegistry.registerWorker(registration);

      // Start cleanup
      testRegistry.startCleanup();

      // Wait for worker to expire and cleanup to run
      await new Promise(resolve => setTimeout(resolve, 300));

      const retrieved = await testRegistry.getWorker(worker.id);
      expect(retrieved).toBeNull();

      testRegistry.stopCleanup();
    });
  });
});
