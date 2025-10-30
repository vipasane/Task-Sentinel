/**
 * Tests for Memory Synchronization Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemorySyncManager,
  ConflictResolvers,
  VectorClockManager,
  type MemoryEntry,
  type VectorClock
} from '../../src/distributed/memory-sync';

describe('VectorClockManager', () => {
  let clock: VectorClockManager;

  beforeEach(() => {
    clock = new VectorClockManager('worker-1');
  });

  it('should initialize with zero clock', () => {
    const current = clock.getClock();
    expect(current['worker-1']).toBe(0);
  });

  it('should increment local clock', () => {
    const v1 = clock.increment();
    expect(v1['worker-1']).toBe(1);

    const v2 = clock.increment();
    expect(v2['worker-1']).toBe(2);
  });

  it('should update clock with received vector', () => {
    const received: VectorClock = {
      'worker-1': 5,
      'worker-2': 3
    };

    const updated = clock.update(received);
    expect(updated['worker-1']).toBeGreaterThan(5); // Incremented
    expect(updated['worker-2']).toBe(3);
  });

  it('should compare vector clocks correctly', () => {
    const a: VectorClock = { 'w1': 1, 'w2': 2 };
    const b: VectorClock = { 'w1': 2, 'w2': 3 };
    const c: VectorClock = { 'w1': 2, 'w2': 1 };

    expect(clock.compare(a, b)).toBe('before');
    expect(clock.compare(b, a)).toBe('after');
    expect(clock.compare(a, c)).toBe('concurrent');
  });

  it('should detect happened-before relationship', () => {
    const a: VectorClock = { 'w1': 1, 'w2': 1 };
    const b: VectorClock = { 'w1': 2, 'w2': 2 };

    expect(clock.happenedBefore(a, b)).toBe(true);
    expect(clock.happenedBefore(b, a)).toBe(false);
  });
});

describe('ConflictResolvers', () => {
  it('should resolve with last-write-wins', () => {
    const entries: MemoryEntry<string>[] = [
      {
        value: 'old',
        version: { 'w1': 1 },
        timestamp: 1000,
        workerId: 'w1'
      },
      {
        value: 'new',
        version: { 'w1': 2 },
        timestamp: 2000,
        workerId: 'w1'
      }
    ];

    const resolution = ConflictResolvers.lastWriteWins(entries);
    expect(resolution.resolved).toBe('new');
    expect(resolution.strategy).toBe('last-write-wins');
    expect(resolution.discarded).toHaveLength(1);
  });

  it('should merge arrays with union', () => {
    const entries: MemoryEntry<number[]>[] = [
      {
        value: [1, 2, 3],
        version: { 'w1': 1 },
        timestamp: 1000,
        workerId: 'w1'
      },
      {
        value: [3, 4, 5],
        version: { 'w2': 1 },
        timestamp: 1000,
        workerId: 'w2'
      }
    ];

    const resolution = ConflictResolvers.mergeArrays(entries);
    expect(resolution.resolved).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
    expect(resolution.strategy).toBe('merge');
  });

  it('should merge objects deeply', () => {
    const entries: MemoryEntry<Record<string, unknown>>[] = [
      {
        value: { a: 1, b: 2 },
        version: { 'w1': 1 },
        timestamp: 1000,
        workerId: 'w1'
      },
      {
        value: { b: 3, c: 4 },
        version: { 'w2': 1 },
        timestamp: 2000,
        workerId: 'w2'
      }
    ];

    const resolution = ConflictResolvers.mergeObjects(entries);
    expect(resolution.resolved).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should use max value for numbers', () => {
    const entries: MemoryEntry<number>[] = [
      {
        value: 10,
        version: { 'w1': 1 },
        timestamp: 1000,
        workerId: 'w1'
      },
      {
        value: 20,
        version: { 'w2': 1 },
        timestamp: 1000,
        workerId: 'w2'
      }
    ];

    const resolution = ConflictResolvers.maxValue(entries);
    expect(resolution.resolved).toBe(20);
    expect(resolution.discarded).toHaveLength(1);
  });
});

describe('MemorySyncManager', () => {
  let manager: MemorySyncManager;

  beforeEach(() => {
    manager = new MemorySyncManager({
      workerId: 'test-worker',
      batchInterval: 50,
      heartbeatInterval: 100,
      cacheSize: 100
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('Task State Synchronization', () => {
    it('should sync task state', async () => {
      const taskId = 'task-123';
      const state = { status: 'running', progress: 50 };

      await manager.syncTaskState(taskId, state);

      // Wait for batch flush
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });

    it('should acquire and release task lock', async () => {
      const taskId = 'task-456';

      const acquired = await manager.acquireTaskLock(taskId, 5000);
      expect(acquired).toBe(true);

      // Second attempt should fail
      const acquired2 = await manager.acquireTaskLock(taskId, 5000);
      expect(acquired2).toBe(false);

      await manager.releaseTaskLock(taskId);

      // Should succeed after release
      const acquired3 = await manager.acquireTaskLock(taskId, 5000);
      expect(acquired3).toBe(true);
    });

    it('should sync task progress', async () => {
      const taskId = 'task-789';

      await manager.syncTaskProgress(taskId, 75, 'processing');

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });
  });

  describe('Worker Status Synchronization', () => {
    it('should sync worker status', async () => {
      const workerId = 'worker-1';
      const status = {
        state: 'active',
        tasks: ['task-1', 'task-2'],
        capacity: 5
      };

      await manager.syncWorkerStatus(workerId, status);

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });

    it('should update heartbeat', async () => {
      await manager.updateHeartbeat();

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });

    it('should sync worker capacity', async () => {
      const workerId = 'worker-2';

      await manager.syncWorkerCapacity(workerId, 10);

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });
  });

  describe('Agent Coordination', () => {
    it('should sync agent coordination data', async () => {
      const taskId = 'task-abc';
      const agentId = 'agent-1';
      const data = { action: 'process', payload: { foo: 'bar' } };

      await manager.syncAgentCoordination(taskId, agentId, data);

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });
  });

  describe('Queue Synchronization', () => {
    it('should sync queue state', async () => {
      const queueState = {
        pending: ['task-1', 'task-2'],
        processing: ['task-3']
      };

      await manager.syncQueue(queueState);

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.writes).toBeGreaterThan(0);
    });

    it('should sync metrics', async () => {
      const metrics = {
        totalTasks: 100,
        completedTasks: 80,
        failedTasks: 5
      };

      await manager.syncMetrics(metrics);

      await new Promise(resolve => setTimeout(resolve, 100));

      const managerMetrics = manager.getMetrics();
      expect(managerMetrics.writes).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should cache reads', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      // Simulate cache miss
      await manager.read(key);

      const metrics1 = manager.getMetrics();
      expect(metrics1.cacheMisses).toBe(1);

      // Write and read again
      await manager.write(key, value);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be cached now
      await manager.read(key);

      const metrics2 = manager.getMetrics();
      expect(metrics2.cacheHits).toBeGreaterThan(0);
    });

    it('should invalidate cache on write', async () => {
      const key = 'test-invalidate';

      await manager.write(key, 'value1');
      await new Promise(resolve => setTimeout(resolve, 100));

      await manager.write(key, 'value2');

      const metrics = manager.getMetrics();
      expect(metrics.cache.invalidated).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      manager.clearCache();

      const metrics = manager.getMetrics();
      expect(metrics.cache.size).toBe(0);
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to changes', (done) => {
      const pattern = 'task-sentinel/tasks/*/state';

      const subId = manager.subscribe(pattern, {
        onChange: (key, value) => {
          expect(key).toContain('task-sentinel/tasks');
          done();
        }
      });

      expect(subId).toBeTruthy();

      // Trigger change
      manager.syncTaskState('test-task', { status: 'completed' });
    });

    it('should unsubscribe', () => {
      const subId = manager.subscribe('test/*');
      manager.unsubscribe(subId);

      const metrics = manager.getMetrics();
      expect(metrics.subscriptions).toBe(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve concurrent writes', () => {
      const entries: MemoryEntry<string>[] = [
        {
          value: 'version1',
          version: { 'w1': 1 },
          timestamp: 1000,
          workerId: 'w1'
        },
        {
          value: 'version2',
          version: { 'w2': 1 },
          timestamp: 2000,
          workerId: 'w2'
        }
      ];

      const resolution = manager.resolveConflict(entries);
      expect(resolution.resolved).toBeTruthy();
      expect(['last-write-wins', 'merge', 'custom']).toContain(resolution.strategy);
    });

    it('should handle single entry conflict', () => {
      const entries: MemoryEntry<string>[] = [
        {
          value: 'only',
          version: { 'w1': 1 },
          timestamp: 1000,
          workerId: 'w1'
        }
      ];

      const resolution = manager.resolveConflict(entries);
      expect(resolution.resolved).toBe('only');
      expect(resolution.discarded).toHaveLength(0);
    });
  });

  describe('Batch Processing', () => {
    it('should batch writes', async () => {
      await manager.write('key1', 'value1');
      await manager.write('key2', 'value2');
      await manager.write('key3', 'value3');

      // Wait for batch flush
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.syncs).toBeGreaterThan(0);
    });

    it('should force sync', async () => {
      await manager.write('key-force', 'value');

      await manager.forceSync();

      const metrics = manager.getMetrics();
      expect(metrics.syncs).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('should track metrics', async () => {
      await manager.read('key1');
      await manager.write('key2', 'value');
      await manager.delete('key3');

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = manager.getMetrics();
      expect(metrics.reads).toBeGreaterThan(0);
      expect(metrics.writes).toBeGreaterThan(0);
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('vectorClock');
    });

    it('should get cache stats', () => {
      const metrics = manager.getMetrics();
      expect(metrics.cache).toHaveProperty('size');
      expect(metrics.cache).toHaveProperty('maxSize');
      expect(metrics.cache).toHaveProperty('invalidated');
    });
  });

  describe('Lifecycle', () => {
    it('should emit events', (done) => {
      manager.once('write', (event) => {
        expect(event).toHaveProperty('key');
        expect(event).toHaveProperty('value');
        expect(event).toHaveProperty('version');
        done();
      });

      manager.write('event-test', 'value');
    });

    it('should shutdown gracefully', async () => {
      await manager.write('cleanup', 'test');

      await manager.shutdown();

      const metrics = manager.getMetrics();
      expect(metrics.pendingWrites).toBe(0);
    });
  });
});
