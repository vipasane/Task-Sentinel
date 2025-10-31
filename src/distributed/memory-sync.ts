/**
 * Memory Synchronization Manager for Task Sentinel
 *
 * Provides distributed state synchronization across workers with:
 * - Conflict resolution using vector clocks
 * - Cache coherence protocol
 * - Memory change subscriptions
 * - Namespace-based organization
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';

// ============================================================================
// Security Helpers
// ============================================================================

/**
 * Input validation for memory keys
 */
function validateMemoryKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid memory key: must be a non-empty string');
  }

  // Remove shell metacharacters
  const sanitized = key.replace(/[;&|`$(){}[\]<>]/g, '');

  // Validate key format (alphanumeric, slashes, hyphens, underscores, dots)
  if (!/^[a-zA-Z0-9/_.-]+$/.test(sanitized)) {
    throw new Error(`Invalid memory key format: ${key}`);
  }

  return sanitized;
}

/**
 * Execute MCP memory command safely using spawn
 */
function execMemoryCommand(operation: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [
      '@modelcontextprotocol/server-memory',
      operation,
      ...args
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`MCP memory command failed (${code}): ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface VectorClock {
  [workerId: string]: number;
}

export interface MemoryEntry<T = unknown> {
  value: T;
  version: VectorClock;
  timestamp: number;
  workerId: string;
  ttl?: number;
}

export interface ConflictResolution<T = unknown> {
  resolved: T;
  strategy: 'last-write-wins' | 'merge' | 'custom';
  discarded: MemoryEntry<T>[];
}

export interface SyncOperation {
  type: 'read' | 'write' | 'delete' | 'subscribe' | 'invalidate';
  key: string;
  namespace: string;
  timestamp: number;
  workerId: string;
}

export interface CacheEntry<T = unknown> {
  value: T;
  version: VectorClock;
  lastAccess: number;
  invalidated: boolean;
}

export interface SubscriptionOptions {
  namespace?: string;
  pattern?: string;
  onChange?: (key: string, value: unknown) => void;
  onInvalidate?: (key: string) => void;
}

export interface MemorySyncConfig {
  workerId: string;
  defaultTTL?: number;
  cacheSize?: number;
  batchInterval?: number;
  heartbeatInterval?: number;
  conflictResolver?: ConflictResolver;
}

export type ConflictResolver = <T>(entries: MemoryEntry<T>[]) => ConflictResolution<T>;

export type MergeStrategy<T = unknown> = (entries: MemoryEntry<T>[]) => T;

// ============================================================================
// Vector Clock Utilities
// ============================================================================

class VectorClockManager {
  private clock: VectorClock = {};

  constructor(private workerId: string) {
    this.clock[workerId] = 0;
  }

  /**
   * Increment local clock
   */
  increment(): VectorClock {
    this.clock[this.workerId] = (this.clock[this.workerId] || 0) + 1;
    return { ...this.clock };
  }

  /**
   * Update clock with received vector clock
   */
  update(received: VectorClock): VectorClock {
    for (const [workerId, timestamp] of Object.entries(received)) {
      if (workerId === this.workerId) continue;
      this.clock[workerId] = Math.max(this.clock[workerId] || 0, timestamp);
    }
    return this.increment();
  }

  /**
   * Compare two vector clocks for causality
   * Returns: 'before' | 'after' | 'concurrent'
   */
  compare(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent' {
    const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));

    let aLess = false;
    let bLess = false;

    for (const key of allKeys) {
      const aVal = a[key] || 0;
      const bVal = b[key] || 0;

      if (aVal < bVal) aLess = true;
      if (aVal > bVal) bLess = true;
    }

    if (aLess && !bLess) return 'before';
    if (bLess && !aLess) return 'after';
    return 'concurrent';
  }

  /**
   * Check if clock A happened before clock B
   */
  happenedBefore(a: VectorClock, b: VectorClock): boolean {
    return this.compare(a, b) === 'before';
  }

  getClock(): VectorClock {
    return { ...this.clock };
  }
}

// ============================================================================
// Conflict Resolution Strategies
// ============================================================================

class ConflictResolvers {
  /**
   * Last-write-wins strategy using timestamps
   */
  static lastWriteWins<T>(entries: MemoryEntry<T>[]): ConflictResolution<T> {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const winner = sorted[0];

    return {
      resolved: winner.value,
      strategy: 'last-write-wins',
      discarded: sorted.slice(1)
    };
  }

  /**
   * Merge strategy for arrays (union)
   */
  static mergeArrays<T>(entries: MemoryEntry<T[]>[]): ConflictResolution<T[]> {
    const merged = new Set<T>();

    for (const entry of entries) {
      for (const item of entry.value) {
        merged.add(item);
      }
    }

    return {
      resolved: Array.from(merged),
      strategy: 'merge',
      discarded: []
    };
  }

  /**
   * Merge strategy for objects (deep merge)
   */
  static mergeObjects<T extends Record<string, unknown>>(
    entries: MemoryEntry<T>[]
  ): ConflictResolution<T> {
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const merged = sorted.reduce((acc, entry) => {
      return { ...acc, ...entry.value };
    }, {} as T);

    return {
      resolved: merged,
      strategy: 'merge',
      discarded: []
    };
  }

  /**
   * Max value strategy for numbers
   */
  static maxValue(entries: MemoryEntry<number>[]): ConflictResolution<number> {
    const max = Math.max(...entries.map(e => e.value));
    const winner = entries.find(e => e.value === max)!;
    const discarded = entries.filter(e => e.value !== max);

    return {
      resolved: max,
      strategy: 'custom',
      discarded
    };
  }
}

// ============================================================================
// Cache Manager
// ============================================================================

class CacheManager<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];

  constructor(private maxSize: number = 1000) {}

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry && !entry.invalidated) {
      entry.lastAccess = Date.now();
      this.updateAccessOrder(key);
      return entry;
    }
    return undefined;
  }

  set(key: string, value: T, version: VectorClock): void {
    const entry: CacheEntry<T> = {
      value,
      version,
      lastAccess: Date.now(),
      invalidated: false
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.evictIfNeeded();
  }

  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.invalidated = true;
    }
  }

  invalidatePattern(pattern: string): string[] {
    const regex = new RegExp(pattern);
    const invalidated: string[] = [];

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (regex.test(key)) {
        entry.invalidated = true;
        invalidated.push(key);
      }
    }

    return invalidated;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private evictIfNeeded(): void {
    while (this.cache.size > this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      invalidated: Array.from(this.cache.values()).filter(e => e.invalidated).length
    };
  }
}

// ============================================================================
// Memory Sync Manager
// ============================================================================

export class MemorySyncManager extends EventEmitter {
  private vectorClock: VectorClockManager;
  private cache: CacheManager;
  private pendingWrites = new Map<string, MemoryEntry>();
  private subscriptions = new Map<string, SubscriptionOptions>();
  private batchTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private config: Required<MemorySyncConfig>;
  private metrics = {
    reads: 0,
    writes: 0,
    conflicts: 0,
    cacheHits: 0,
    cacheMisses: 0,
    syncs: 0
  };

  constructor(config: MemorySyncConfig) {
    super();

    this.config = {
      workerId: config.workerId,
      defaultTTL: config.defaultTTL || 3600,
      cacheSize: config.cacheSize || 1000,
      batchInterval: config.batchInterval || 100,
      heartbeatInterval: config.heartbeatInterval || 5000,
      conflictResolver: config.conflictResolver || ConflictResolvers.lastWriteWins
    };

    this.vectorClock = new VectorClockManager(this.config.workerId);
    this.cache = new CacheManager(this.config.cacheSize);

    this.startBatchProcessor();
    this.startHeartbeat();
  }

  // ==========================================================================
  // Task State Synchronization
  // ==========================================================================

  /**
   * Synchronize task state across workers
   */
  async syncTaskState(taskId: string, state: Record<string, unknown>): Promise<void> {
    const key = `task-sentinel/tasks/${taskId}/state`;
    await this.write(key, state, { namespace: 'tasks' });

    this.emit('task-state-synced', { taskId, state });
  }

  /**
   * Get task state with cache support
   */
  async getTaskState(taskId: string): Promise<Record<string, unknown> | null> {
    const key = `task-sentinel/tasks/${taskId}/state`;
    return await this.read(key);
  }

  /**
   * Update task progress
   */
  async syncTaskProgress(taskId: string, progress: number, status: string): Promise<void> {
    const key = `task-sentinel/tasks/${taskId}/progress`;
    await this.write(key, { progress, status, timestamp: Date.now() });
  }

  /**
   * Lock a task for exclusive access
   */
  async acquireTaskLock(taskId: string, timeout: number = 30000): Promise<boolean> {
    const key = `task-sentinel/tasks/${taskId}/lock`;
    const lock = {
      workerId: this.config.workerId,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeout
    };

    try {
      const existing = await this.read<typeof lock>(key);

      if (existing && existing.expiresAt > Date.now()) {
        return false; // Lock already held
      }

      await this.write(key, lock, { ttl: Math.ceil(timeout / 1000) });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Release task lock
   */
  async releaseTaskLock(taskId: string): Promise<void> {
    const key = `task-sentinel/tasks/${taskId}/lock`;
    await this.delete(key);
  }

  // ==========================================================================
  // Worker Status Synchronization
  // ==========================================================================

  /**
   * Sync worker status
   */
  async syncWorkerStatus(
    workerId: string,
    status: { state: string; tasks: string[]; capacity: number }
  ): Promise<void> {
    const key = `task-sentinel/workers/${workerId}/status`;
    await this.write(key, status);

    this.emit('worker-status-synced', { workerId, status });
  }

  /**
   * Update worker heartbeat
   */
  async updateHeartbeat(): Promise<void> {
    const key = `task-sentinel/workers/${this.config.workerId}/heartbeat`;
    await this.write(key, { timestamp: Date.now() }, { ttl: 30 });
  }

  /**
   * Get all active workers
   */
  async getActiveWorkers(): Promise<string[]> {
    const pattern = 'task-sentinel/workers/*/heartbeat';
    const keys = await this.searchKeys(pattern);

    return keys.map(key => {
      const match = key.match(/workers\/([^/]+)\/heartbeat/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];
  }

  /**
   * Sync worker capacity
   */
  async syncWorkerCapacity(workerId: string, capacity: number): Promise<void> {
    const key = `task-sentinel/workers/${workerId}/capacity`;
    await this.write(key, { available: capacity, timestamp: Date.now() });
  }

  // ==========================================================================
  // Agent Coordination
  // ==========================================================================

  /**
   * Sync agent coordination data
   */
  async syncAgentCoordination(
    taskId: string,
    agentId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const key = `task-sentinel/tasks/${taskId}/agents/${agentId}`;
    await this.write(key, { ...data, timestamp: Date.now() });

    this.emit('agent-coordinated', { taskId, agentId, data });
  }

  /**
   * Get agent coordination data
   */
  async getAgentCoordination(
    taskId: string,
    agentId: string
  ): Promise<Record<string, unknown> | null> {
    const key = `task-sentinel/tasks/${taskId}/agents/${agentId}`;
    return await this.read(key);
  }

  /**
   * List all agents for a task
   */
  async getTaskAgents(taskId: string): Promise<string[]> {
    const pattern = `task-sentinel/tasks/${taskId}/agents/*`;
    const keys = await this.searchKeys(pattern);

    return keys.map(key => {
      const match = key.match(/agents\/([^/]+)$/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];
  }

  // ==========================================================================
  // Queue Synchronization
  // ==========================================================================

  /**
   * Sync task queue state
   */
  async syncQueue(queueState: { pending: string[]; processing: string[] }): Promise<void> {
    const key = 'task-sentinel/coordination/queue';
    await this.write(key, queueState);

    this.emit('queue-synced', queueState);
  }

  /**
   * Get queue state
   */
  async getQueue(): Promise<{ pending: string[]; processing: string[] } | null> {
    const key = 'task-sentinel/coordination/queue';
    return await this.read(key);
  }

  /**
   * Sync worker assignments
   */
  async syncAssignments(assignments: Record<string, string[]>): Promise<void> {
    const key = 'task-sentinel/coordination/assignments';
    await this.write(key, assignments);
  }

  /**
   * Sync metrics
   */
  async syncMetrics(metrics: Record<string, unknown>): Promise<void> {
    const key = 'task-sentinel/coordination/metrics';
    const existing = await this.read<Record<string, unknown>>(key);

    const merged = { ...existing, ...metrics, timestamp: Date.now() };
    await this.write(key, merged);
  }

  // ==========================================================================
  // Core Memory Operations
  // ==========================================================================

  /**
   * Read from distributed memory with caching
   */
  async read<T = unknown>(key: string): Promise<T | null> {
    this.metrics.reads++;

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      this.metrics.cacheHits++;
      return cached.value as T;
    }

    this.metrics.cacheMisses++;

    // Simulate MCP memory_usage read
    const value = await this.mcpRead<T>(key);

    if (value !== null) {
      const version = this.vectorClock.increment();
      this.cache.set(key, value, version);
    }

    return value;
  }

  /**
   * Write to distributed memory
   */
  async write<T = unknown>(
    key: string,
    value: T,
    options: { ttl?: number; namespace?: string } = {}
  ): Promise<void> {
    this.metrics.writes++;

    const version = this.vectorClock.increment();
    const entry: MemoryEntry<T> = {
      value,
      version,
      timestamp: Date.now(),
      workerId: this.config.workerId,
      ttl: options.ttl || this.config.defaultTTL
    };

    // Add to pending batch
    this.pendingWrites.set(key, entry as MemoryEntry);

    // Invalidate cache
    this.cache.invalidate(key);

    this.emit('write', { key, value, version });
  }

  /**
   * Delete from distributed memory
   */
  async delete(key: string): Promise<void> {
    await this.mcpDelete(key);
    this.cache.delete(key);
    this.emit('delete', { key });
  }

  /**
   * Search for keys matching pattern
   */
  async searchKeys(pattern: string): Promise<string[]> {
    return await this.mcpSearch(pattern);
  }

  // ==========================================================================
  // Conflict Resolution
  // ==========================================================================

  /**
   * Resolve conflicts between concurrent writes
   */
  resolveConflict<T>(entries: MemoryEntry<T>[]): ConflictResolution<T> {
    if (entries.length === 0) {
      throw new Error('Cannot resolve conflict with no entries');
    }

    if (entries.length === 1) {
      return {
        resolved: entries[0].value,
        strategy: 'last-write-wins',
        discarded: []
      };
    }

    this.metrics.conflicts++;

    // Check for concurrent writes using vector clocks
    const concurrent: MemoryEntry<T>[] = [];

    for (let i = 0; i < entries.length; i++) {
      let isConcurrent = false;

      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;

        const comparison = this.vectorClock.compare(
          entries[i].version,
          entries[j].version
        );

        if (comparison === 'concurrent') {
          isConcurrent = true;
          break;
        }
      }

      if (isConcurrent) {
        concurrent.push(entries[i]);
      }
    }

    // Use configured resolver
    const resolution = this.config.conflictResolver(
      concurrent.length > 0 ? concurrent : entries
    );

    this.emit('conflict-resolved', {
      entries: entries.length,
      strategy: resolution.strategy,
      discarded: resolution.discarded.length
    });

    return resolution;
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to memory changes
   */
  subscribe(pattern: string, options: SubscriptionOptions = {}): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`;

    this.subscriptions.set(subscriptionId, {
      ...options,
      pattern
    });

    this.emit('subscribed', { subscriptionId, pattern });

    return subscriptionId;
  }

  /**
   * Unsubscribe from memory changes
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    this.emit('unsubscribed', { subscriptionId });
  }

  /**
   * Notify subscribers of changes
   */
  private notifySubscribers(key: string, value: unknown): void {
    const subscriptions = Array.from(this.subscriptions.entries());
    for (const [subId, options] of subscriptions) {
      if (!options.pattern || new RegExp(options.pattern).test(key)) {
        if (options.onChange) {
          options.onChange(key, value);
        }
        this.emit('change', { subscriptionId: subId, key, value });
      }
    }
  }

  // ==========================================================================
  // Batch Processing
  // ==========================================================================

  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      await this.flushWrites();
    }, this.config.batchInterval);
  }

  private async flushWrites(): Promise<void> {
    if (this.pendingWrites.size === 0) return;

    const writes = Array.from(this.pendingWrites.entries());
    this.pendingWrites.clear();

    for (const [key, entry] of writes) {
      await this.mcpWrite(key, entry);
      this.notifySubscribers(key, entry.value);
    }

    this.metrics.syncs++;
    this.emit('batch-flushed', { count: writes.length });
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      await this.updateHeartbeat();
    }, this.config.heartbeatInterval);
  }

  // ==========================================================================
  // MCP Integration (Simulated)
  // ==========================================================================

  /**
   * Read value from MCP memory
   */
  private async mcpRead<T>(key: string): Promise<T | null> {
    try {
      // Validate and construct namespaced key
      const validated_key = validateMemoryKey(key);
      const namespaced_key = `task-sentinel/${validated_key}`;

      // Use safe spawn-based execution
      const result = await execMemoryCommand('retrieve', [namespaced_key]);

      // Parse the returned JSON
      const parsed = JSON.parse(result.trim());
      return parsed as T;
    } catch (error) {
      // Return null if key doesn't exist or parsing fails
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      console.error(`[MemorySync] Failed to read key ${key}:`, error);
      return null;
    }
  }

  /**
   * Write value to MCP memory
   */
  private async mcpWrite(key: string, entry: MemoryEntry): Promise<void> {
    try {
      // Validate and construct namespaced key
      const validated_key = validateMemoryKey(key);
      const namespaced_key = `task-sentinel/${validated_key}`;

      // Serialize the entry
      const serialized = JSON.stringify(entry);

      // Use safe spawn-based execution
      await execMemoryCommand('store', [namespaced_key, serialized]);

      console.log(`[MemorySync] Stored key: ${namespaced_key} (${serialized.length} bytes)`);
    } catch (error) {
      console.error(`[MemorySync] Failed to write key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from MCP memory
   */
  private async mcpDelete(key: string): Promise<void> {
    try {
      // Validate and construct namespaced key
      const validated_key = validateMemoryKey(key);
      const namespaced_key = `task-sentinel/${validated_key}`;

      // Use safe spawn-based execution
      await execMemoryCommand('delete', [namespaced_key]);

      console.log(`[MemorySync] Deleted key: ${namespaced_key}`);
    } catch (error) {
      // Silently ignore if key doesn't exist
      if (error instanceof Error && error.message.includes('not found')) {
        return;
      }
      console.error(`[MemorySync] Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Search for keys matching pattern in MCP memory
   */
  private async mcpSearch(pattern: string): Promise<string[]> {
    try {
      // Validate pattern (allow wildcards)
      const validated_pattern = pattern.replace(/[;&|`$(){}[\]<>]/g, '');
      const namespaced_pattern = `task-sentinel/${validated_pattern}`;

      // Use safe spawn-based execution
      const result = await execMemoryCommand('list-keys', [namespaced_pattern]);

      // Parse result (newline-separated keys)
      const keys = result
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(k => k.replace(/^task-sentinel\//, '')); // Remove namespace prefix

      console.log(`[MemorySync] Search pattern "${pattern}" found ${keys.length} keys`);
      return keys;
    } catch (error) {
      console.error(`[MemorySync] Failed to search pattern ${pattern}:`, error);
      return [];
    }
  }

  // ==========================================================================
  // Lifecycle & Utilities
  // ==========================================================================

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Flush pending writes
    await this.flushWrites();

    // Clear worker status
    const key = `task-sentinel/workers/${this.config.workerId}/status`;
    await this.delete(key);

    this.emit('shutdown');
  }

  /**
   * Get synchronization metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cache: this.cache.getStats(),
      pendingWrites: this.pendingWrites.size,
      subscriptions: this.subscriptions.size,
      vectorClock: this.vectorClock.getClock()
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<void> {
    await this.flushWrites();
    this.emit('force-sync');
  }
}

// ============================================================================
// Exports
// ============================================================================

export { ConflictResolvers, VectorClockManager };

export default MemorySyncManager;
