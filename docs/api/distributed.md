# Distributed Execution API Reference

## Table of Contents

1. [LockManager API](#lockmanager-api)
2. [WorkerRegistry API](#workerregistry-api)
3. [MemorySyncManager API](#memorysyncmanager-api)
4. [LoadBalancer API](#loadbalancer-api)
5. [HeartbeatMonitor API](#heartbeatmonitor-api)
6. [Types & Interfaces](#types--interfaces)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)

---

## LockManager API

Manages distributed locks to prevent concurrent task execution.

### Constructor

```typescript
constructor(
  config: DistributedConfig,
  githubClient: GitHubClient
)
```

**Parameters:**
- `config: DistributedConfig` - Configuration object
- `githubClient: GitHubClient` - GitHub API client

**Example:**
```typescript
const lockManager = new LockManager(
  {
    locking: {
      ttlSeconds: 300,
      retryAttempts: 3,
      retryDelayMs: 1000
    }
  },
  githubClient
);
```

---

### acquireLock()

Attempts to acquire a distributed lock for a task.

```typescript
async acquireLock(
  taskId: string,
  workerId: string,
  metadata?: LockMetadata
): Promise<Lock | null>
```

**Parameters:**
- `taskId: string` - Unique task identifier
- `workerId: string` - Worker attempting to acquire lock
- `metadata?: LockMetadata` - Optional metadata (hostname, pid, etc.)

**Returns:**
- `Lock` - Lock object if acquired successfully
- `null` - If lock could not be acquired (already locked)

**Throws:**
- `LockError` - If lock acquisition fails due to API error

**Example:**
```typescript
const lock = await lockManager.acquireLock(
  'task-123',
  'worker-001',
  {
    hostname: 'worker-1.example.com',
    pid: process.pid,
    taskType: 'build'
  }
);

if (lock) {
  try {
    // Execute task
    await executeTask();
  } finally {
    await lockManager.releaseLock('task-123', 'worker-001');
  }
} else {
  console.log('Task already locked by another worker');
}
```

---

### releaseLock()

Releases a distributed lock.

```typescript
async releaseLock(
  taskId: string,
  workerId: string
): Promise<void>
```

**Parameters:**
- `taskId: string` - Task identifier
- `workerId: string` - Worker releasing the lock

**Throws:**
- `LockError` - If worker doesn't own the lock
- `NotFoundError` - If lock doesn't exist

**Example:**
```typescript
try {
  await lockManager.releaseLock('task-123', 'worker-001');
  console.log('Lock released successfully');
} catch (error) {
  if (error instanceof LockError) {
    console.error('Failed to release lock:', error.message);
  }
}
```

---

### isLocked()

Checks if a task is currently locked.

```typescript
async isLocked(taskId: string): Promise<boolean>
```

**Parameters:**
- `taskId: string` - Task identifier

**Returns:**
- `boolean` - True if locked, false otherwise

**Example:**
```typescript
if (await lockManager.isLocked('task-123')) {
  console.log('Task is currently locked');
  // Maybe retry later or skip
}
```

---

### getLock()

Retrieves lock information.

```typescript
async getLock(taskId: string): Promise<Lock | null>
```

**Parameters:**
- `taskId: string` - Task identifier

**Returns:**
- `Lock` - Lock object with metadata
- `null` - If no lock exists

**Example:**
```typescript
const lock = await lockManager.getLock('task-123');
if (lock) {
  console.log(`Locked by: ${lock.workerId}`);
  console.log(`Acquired at: ${lock.acquiredAt}`);
  console.log(`Expires at: ${lock.expiresAt}`);
}
```

---

### cleanupStaleLocks()

Removes expired locks.

```typescript
async cleanupStaleLocks(): Promise<number>
```

**Returns:**
- `number` - Count of locks cleaned up

**Example:**
```typescript
// Run cleanup periodically
setInterval(async () => {
  const cleaned = await lockManager.cleanupStaleLocks();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} stale locks`);
  }
}, 60000); // Every minute
```

---

### listLocks()

Lists all active locks.

```typescript
async listLocks(options?: ListLocksOptions): Promise<Lock[]>
```

**Parameters:**
- `options?: ListLocksOptions`
  - `workerId?: string` - Filter by worker
  - `includeExpired?: boolean` - Include expired locks

**Returns:**
- `Lock[]` - Array of lock objects

**Example:**
```typescript
// List all locks for a worker
const workerLocks = await lockManager.listLocks({
  workerId: 'worker-001'
});

console.log(`Worker holds ${workerLocks.length} locks`);
```

---

## WorkerRegistry API

Manages worker registration and discovery.

### Constructor

```typescript
constructor(
  config: DistributedConfig,
  githubClient: GitHubClient
)
```

---

### register()

Registers a worker with the cluster.

```typescript
async register(worker: WorkerInfo): Promise<void>
```

**Parameters:**
- `worker: WorkerInfo` - Worker information
  ```typescript
  interface WorkerInfo {
    workerId: string;
    hostname: string;
    capacity: WorkerCapacity;
    capabilities: WorkerCapabilities;
    metadata?: Record<string, any>;
  }
  ```

**Example:**
```typescript
await workerRegistry.register({
  workerId: 'worker-001',
  hostname: 'worker-1.example.com',
  capacity: {
    maxTasks: 10,
    activeTasks: 0,
    availableSlots: 10
  },
  capabilities: {
    cpuCores: 4,
    memoryMb: 8192,
    supportedTaskTypes: ['build', 'test', 'deploy']
  },
  metadata: {
    region: 'us-east-1',
    version: '1.0.0'
  }
});

console.log('Worker registered successfully');
```

---

### deregister()

Removes a worker from the registry.

```typescript
async deregister(workerId: string): Promise<void>
```

**Parameters:**
- `workerId: string` - Worker identifier

**Example:**
```typescript
// Clean shutdown
process.on('SIGTERM', async () => {
  await workerRegistry.deregister('worker-001');
  console.log('Worker deregistered');
  process.exit(0);
});
```

---

### updateStatus()

Updates worker status and capacity.

```typescript
async updateStatus(
  workerId: string,
  status: WorkerStatus,
  capacity?: Partial<WorkerCapacity>
): Promise<void>
```

**Parameters:**
- `workerId: string` - Worker identifier
- `status: WorkerStatus` - New status ('active' | 'busy' | 'draining' | 'offline')
- `capacity?: Partial<WorkerCapacity>` - Updated capacity metrics

**Example:**
```typescript
// Update after completing a task
await workerRegistry.updateStatus(
  'worker-001',
  'active',
  {
    activeTasks: 2,
    availableSlots: 8
  }
);
```

---

### getWorker()

Retrieves worker information.

```typescript
async getWorker(workerId: string): Promise<WorkerInfo | null>
```

**Parameters:**
- `workerId: string` - Worker identifier

**Returns:**
- `WorkerInfo | null` - Worker data or null if not found

**Example:**
```typescript
const worker = await workerRegistry.getWorker('worker-001');
if (worker) {
  console.log(`Worker status: ${worker.status}`);
  console.log(`Available slots: ${worker.capacity.availableSlots}`);
}
```

---

### listWorkers()

Lists all workers matching criteria.

```typescript
async listWorkers(filter?: WorkerFilter): Promise<WorkerInfo[]>
```

**Parameters:**
- `filter?: WorkerFilter`
  ```typescript
  interface WorkerFilter {
    status?: WorkerStatus | WorkerStatus[];
    hasCapacity?: boolean;
    supportedTaskType?: string;
  }
  ```

**Returns:**
- `WorkerInfo[]` - Array of workers

**Example:**
```typescript
// Get all healthy workers with capacity
const availableWorkers = await workerRegistry.listWorkers({
  status: 'active',
  hasCapacity: true
});

console.log(`${availableWorkers.length} workers available`);

// Get workers that support 'build' tasks
const buildWorkers = await workerRegistry.listWorkers({
  supportedTaskType: 'build'
});
```

---

### markStale()

Marks workers with old heartbeats as stale.

```typescript
async markStale(
  staleThresholdMs: number
): Promise<string[]>
```

**Parameters:**
- `staleThresholdMs: number` - Milliseconds since last heartbeat

**Returns:**
- `string[]` - Array of stale worker IDs

**Example:**
```typescript
// Mark workers stale after 2 minutes
const staleWorkers = await workerRegistry.markStale(120000);
if (staleWorkers.length > 0) {
  console.log(`Marked ${staleWorkers.length} workers as stale`);

  // Cleanup locks from stale workers
  for (const workerId of staleWorkers) {
    await lockManager.releaseWorkerLocks(workerId);
  }
}
```

---

## MemorySyncManager API

Provides distributed state synchronization.

### Constructor

```typescript
constructor(
  config: DistributedConfig,
  githubClient: GitHubClient
)
```

---

### set()

Stores a value in distributed memory.

```typescript
async set(
  key: string,
  value: any,
  namespace?: string
): Promise<void>
```

**Parameters:**
- `key: string` - Memory key
- `value: any` - Value to store (must be JSON-serializable)
- `namespace?: string` - Optional namespace (default: 'global')

**Example:**
```typescript
// Store task state
await memorySyncManager.set(
  'task-123-state',
  {
    status: 'in_progress',
    progress: 45,
    startedAt: new Date().toISOString()
  },
  'tasks'
);

// Store swarm coordination data
await memorySyncManager.set(
  'coordinator-decision',
  { action: 'scale_up', reason: 'high_load' },
  'swarm'
);
```

---

### get()

Retrieves a value from distributed memory.

```typescript
async get<T = any>(
  key: string,
  namespace?: string
): Promise<T | null>
```

**Parameters:**
- `key: string` - Memory key
- `namespace?: string` - Optional namespace

**Returns:**
- `T | null` - Stored value or null if not found

**Example:**
```typescript
// Retrieve task state
const taskState = await memorySyncManager.get<TaskState>(
  'task-123-state',
  'tasks'
);

if (taskState) {
  console.log(`Task progress: ${taskState.progress}%`);
}

// Type-safe retrieval
interface CoordinatorDecision {
  action: string;
  reason: string;
}

const decision = await memorySyncManager.get<CoordinatorDecision>(
  'coordinator-decision',
  'swarm'
);
```

---

### delete()

Removes a value from distributed memory.

```typescript
async delete(
  key: string,
  namespace?: string
): Promise<boolean>
```

**Parameters:**
- `key: string` - Memory key
- `namespace?: string` - Optional namespace

**Returns:**
- `boolean` - True if deleted, false if not found

**Example:**
```typescript
// Cleanup after task completion
const deleted = await memorySyncManager.delete(
  'task-123-state',
  'tasks'
);

if (deleted) {
  console.log('Task state cleaned up');
}
```

---

### list()

Lists all keys in a namespace.

```typescript
async list(
  namespace?: string,
  prefix?: string
): Promise<string[]>
```

**Parameters:**
- `namespace?: string` - Optional namespace
- `prefix?: string` - Optional key prefix filter

**Returns:**
- `string[]` - Array of keys

**Example:**
```typescript
// List all task states
const taskKeys = await memorySyncManager.list('tasks', 'task-');
console.log(`Found ${taskKeys.length} task states`);

// Process all tasks
for (const key of taskKeys) {
  const state = await memorySyncManager.get(key, 'tasks');
  // Process state...
}
```

---

### sync()

Forces synchronization with GitHub.

```typescript
async sync(namespace?: string): Promise<void>
```

**Parameters:**
- `namespace?: string` - Optional namespace to sync

**Example:**
```typescript
// Manual sync after batch updates
await memorySyncManager.set('key1', 'value1');
await memorySyncManager.set('key2', 'value2');
await memorySyncManager.sync(); // Force sync to GitHub

// Sync specific namespace
await memorySyncManager.sync('tasks');
```

---

### watch()

Watches for changes to a key.

```typescript
watch(
  key: string,
  callback: (value: any) => void,
  namespace?: string
): () => void
```

**Parameters:**
- `key: string` - Memory key to watch
- `callback: (value: any) => void` - Called when value changes
- `namespace?: string` - Optional namespace

**Returns:**
- `() => void` - Unwatch function

**Example:**
```typescript
// Watch for coordinator decisions
const unwatch = memorySyncManager.watch(
  'coordinator-decision',
  (decision) => {
    console.log('New decision:', decision);
    if (decision.action === 'scale_up') {
      spawnNewWorker();
    }
  },
  'swarm'
);

// Later: stop watching
unwatch();
```

---

## LoadBalancer API

Distributes tasks across workers.

### Constructor

```typescript
constructor(
  config: DistributedConfig,
  workerRegistry: WorkerRegistry
)
```

---

### getNextTask()

Selects the next task for a worker.

```typescript
async getNextTask(
  workerId: string,
  availableTasks: Task[]
): Promise<Task | null>
```

**Parameters:**
- `workerId: string` - Worker requesting task
- `availableTasks: Task[]` - Array of pending tasks

**Returns:**
- `Task | null` - Selected task or null if none suitable

**Example:**
```typescript
// Worker task loop
while (running) {
  const tasks = await taskQueue.getPendingTasks();
  const task = await loadBalancer.getNextTask('worker-001', tasks);

  if (task) {
    await processTask(task);
  } else {
    await sleep(1000); // Wait before retry
  }
}
```

---

### selectWorker()

Selects optimal worker for a task.

```typescript
async selectWorker(
  task: Task,
  availableWorkers?: WorkerInfo[]
): Promise<WorkerInfo | null>
```

**Parameters:**
- `task: Task` - Task to assign
- `availableWorkers?: WorkerInfo[]` - Optional worker list (fetched if not provided)

**Returns:**
- `WorkerInfo | null` - Selected worker or null if none available

**Example:**
```typescript
// Coordinator selects worker for task
const task = await taskQueue.getNext();
const worker = await loadBalancer.selectWorker(task);

if (worker) {
  await assignTaskToWorker(task, worker);
  console.log(`Assigned task ${task.id} to ${worker.workerId}`);
} else {
  console.log('No workers available, requeueing task');
}
```

---

### setStrategy()

Changes load balancing strategy.

```typescript
setStrategy(strategy: LoadBalanceStrategy): void
```

**Parameters:**
- `strategy: LoadBalanceStrategy` - Strategy to use
  - `'round_robin'` - Simple rotation
  - `'least_loaded'` - Select least busy worker
  - `'capacity_based'` - Weight by capacity
  - `'affinity'` - Prefer workers with task history

**Example:**
```typescript
// Switch strategy based on workload
if (taskQueue.length > 100) {
  loadBalancer.setStrategy('least_loaded'); // Optimize for throughput
} else {
  loadBalancer.setStrategy('affinity'); // Optimize for cache hits
}
```

---

### getLoadDistribution()

Gets current load distribution.

```typescript
async getLoadDistribution(): Promise<LoadDistribution>
```

**Returns:**
```typescript
interface LoadDistribution {
  totalCapacity: number;
  utilizedCapacity: number;
  utilizationPercent: number;
  workerLoads: {
    workerId: string;
    activeTasks: number;
    capacity: number;
    utilizationPercent: number;
  }[];
}
```

**Example:**
```typescript
const distribution = await loadBalancer.getLoadDistribution();

console.log(`Cluster utilization: ${distribution.utilizationPercent}%`);

// Check for imbalance
const maxUtil = Math.max(...distribution.workerLoads.map(w => w.utilizationPercent));
const minUtil = Math.min(...distribution.workerLoads.map(w => w.utilizationPercent));

if (maxUtil - minUtil > 30) {
  console.warn('Load imbalance detected, consider rebalancing');
  await loadBalancer.rebalance();
}
```

---

### rebalance()

Triggers task rebalancing.

```typescript
async rebalance(): Promise<RebalanceResult>
```

**Returns:**
```typescript
interface RebalanceResult {
  tasksMoved: number;
  improvedUtilization: boolean;
  beforeUtilization: number;
  afterUtilization: number;
}
```

**Example:**
```typescript
// Periodic rebalancing
setInterval(async () => {
  const result = await loadBalancer.rebalance();

  if (result.tasksMoved > 0) {
    console.log(`Rebalanced ${result.tasksMoved} tasks`);
    console.log(`Utilization: ${result.beforeUtilization}% → ${result.afterUtilization}%`);
  }
}, 60000); // Every minute
```

---

## HeartbeatMonitor API

Monitors worker health via heartbeats.

### Constructor

```typescript
constructor(
  config: DistributedConfig,
  workerRegistry: WorkerRegistry,
  lockManager: LockManager
)
```

---

### start()

Starts heartbeat monitoring.

```typescript
start(workerId: string): void
```

**Parameters:**
- `workerId: string` - Worker to monitor

**Example:**
```typescript
// Start monitoring on worker startup
const monitor = new HeartbeatMonitor(config, registry, lockManager);
monitor.start('worker-001');

// Heartbeats sent automatically
```

---

### stop()

Stops heartbeat monitoring.

```typescript
stop(): void
```

**Example:**
```typescript
// Stop on shutdown
process.on('SIGTERM', () => {
  monitor.stop();
  workerRegistry.deregister('worker-001');
  process.exit(0);
});
```

---

### sendHeartbeat()

Manually sends a heartbeat.

```typescript
async sendHeartbeat(
  workerId: string,
  metadata?: HeartbeatMetadata
): Promise<void>
```

**Parameters:**
- `workerId: string` - Worker ID
- `metadata?: HeartbeatMetadata` - Optional health data

**Example:**
```typescript
// Send heartbeat with metrics
await monitor.sendHeartbeat('worker-001', {
  cpu: os.loadavg()[0],
  memory: process.memoryUsage().heapUsed,
  activeTasks: currentTaskCount,
  healthStatus: 'healthy'
});
```

---

### checkStaleWorkers()

Checks for stale workers.

```typescript
async checkStaleWorkers(): Promise<string[]>
```

**Returns:**
- `string[]` - Array of stale worker IDs

**Example:**
```typescript
// Periodic stale check
setInterval(async () => {
  const staleWorkers = await monitor.checkStaleWorkers();

  for (const workerId of staleWorkers) {
    console.warn(`Worker ${workerId} is stale`);

    // Recover locks
    await lockManager.releaseWorkerLocks(workerId);

    // Deregister worker
    await workerRegistry.deregister(workerId);
  }
}, 60000);
```

---

### recoverStaleLocks()

Recovers locks from failed workers.

```typescript
async recoverStaleLocks(workerId: string): Promise<number>
```

**Parameters:**
- `workerId: string` - Failed worker ID

**Returns:**
- `number` - Count of locks recovered

**Example:**
```typescript
const recovered = await monitor.recoverStaleLocks('worker-001');
console.log(`Recovered ${recovered} locks from failed worker`);
```

---

## Types & Interfaces

### Lock

```typescript
interface Lock {
  taskId: string;
  workerId: string;
  acquiredAt: string; // ISO 8601
  expiresAt: string;  // ISO 8601
  metadata: LockMetadata;
}

interface LockMetadata {
  hostname?: string;
  pid?: number;
  taskType?: string;
  [key: string]: any;
}
```

### Worker

```typescript
interface WorkerInfo {
  workerId: string;
  hostname: string;
  status: WorkerStatus;
  registeredAt: string;
  lastHeartbeat: string;
  capacity: WorkerCapacity;
  capabilities: WorkerCapabilities;
  metadata?: Record<string, any>;
}

type WorkerStatus = 'active' | 'busy' | 'draining' | 'offline';

interface WorkerCapacity {
  maxTasks: number;
  activeTasks: number;
  availableSlots: number;
}

interface WorkerCapabilities {
  cpuCores: number;
  memoryMb: number;
  supportedTaskTypes: string[];
}
```

### Task

```typescript
interface Task {
  id: string;
  type: string;
  priority: number;
  estimatedDuration?: number;
  requirements?: TaskRequirements;
  metadata?: Record<string, any>;
}

interface TaskRequirements {
  minCpuCores?: number;
  minMemoryMb?: number;
  requiredCapabilities?: string[];
}
```

---

## Error Handling

### Error Types

```typescript
class LockError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LockError';
  }
}

class WorkerError extends Error {
  constructor(message: string, public readonly workerId: string) {
    super(message);
    this.name = 'WorkerError';
  }
}

class SyncError extends Error {
  constructor(message: string, public readonly namespace: string) {
    super(message);
    this.name = 'SyncError';
  }
}
```

### Error Handling Example

```typescript
try {
  const lock = await lockManager.acquireLock('task-123', 'worker-001');

  if (!lock) {
    // Lock conflict (not an error)
    console.log('Task already locked, skipping');
    return;
  }

  try {
    await executeTask();
  } finally {
    await lockManager.releaseLock('task-123', 'worker-001');
  }

} catch (error) {
  if (error instanceof LockError) {
    // Handle lock-specific errors
    if (error.code === 'LOCK_EXPIRED') {
      console.error('Lock expired during execution');
      // Maybe retry
    } else if (error.code === 'INVALID_OWNER') {
      console.error('Worker does not own this lock');
      // Critical error, investigate
    }
  } else if (error instanceof WorkerError) {
    // Handle worker errors
    console.error(`Worker error: ${error.message}`);
    await workerRegistry.updateStatus(error.workerId, 'offline');
  } else {
    // Unknown error
    throw error;
  }
}
```

---

## Code Examples

### Complete Worker Implementation

```typescript
import {
  LockManager,
  WorkerRegistry,
  MemorySyncManager,
  LoadBalancer,
  HeartbeatMonitor
} from './distributed';

class DistributedWorker {
  private lockManager: LockManager;
  private workerRegistry: WorkerRegistry;
  private memorySyncManager: MemorySyncManager;
  private loadBalancer: LoadBalancer;
  private heartbeatMonitor: HeartbeatMonitor;
  private running = false;

  constructor(
    private workerId: string,
    private config: DistributedConfig,
    private githubClient: GitHubClient
  ) {
    this.lockManager = new LockManager(config, githubClient);
    this.workerRegistry = new WorkerRegistry(config, githubClient);
    this.memorySyncManager = new MemorySyncManager(config, githubClient);
    this.loadBalancer = new LoadBalancer(config, this.workerRegistry);
    this.heartbeatMonitor = new HeartbeatMonitor(
      config,
      this.workerRegistry,
      this.lockManager
    );
  }

  async start(): Promise<void> {
    // Register worker
    await this.workerRegistry.register({
      workerId: this.workerId,
      hostname: os.hostname(),
      capacity: {
        maxTasks: 10,
        activeTasks: 0,
        availableSlots: 10
      },
      capabilities: {
        cpuCores: os.cpus().length,
        memoryMb: os.totalmem() / 1024 / 1024,
        supportedTaskTypes: ['build', 'test', 'deploy']
      }
    });

    // Start heartbeat
    this.heartbeatMonitor.start(this.workerId);

    // Start task processing loop
    this.running = true;
    await this.processLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.heartbeatMonitor.stop();
    await this.workerRegistry.deregister(this.workerId);
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        // Get pending tasks
        const tasks = await this.getPendingTasks();

        // Select next task
        const task = await this.loadBalancer.getNextTask(
          this.workerId,
          tasks
        );

        if (!task) {
          await sleep(1000);
          continue;
        }

        // Acquire lock
        const lock = await this.lockManager.acquireLock(
          task.id,
          this.workerId,
          { taskType: task.type }
        );

        if (!lock) {
          continue; // Task locked by another worker
        }

        try {
          // Update capacity
          await this.updateCapacity('busy', +1);

          // Execute task
          await this.executeTask(task);

          // Store result in memory
          await this.memorySyncManager.set(
            `task-${task.id}-result`,
            { status: 'completed', completedAt: new Date().toISOString() },
            'tasks'
          );

        } finally {
          // Release lock
          await this.lockManager.releaseLock(task.id, this.workerId);

          // Update capacity
          await this.updateCapacity('active', -1);
        }

      } catch (error) {
        console.error('Error in process loop:', error);
        await sleep(5000); // Back off on error
      }
    }
  }

  private async updateCapacity(
    status: WorkerStatus,
    taskDelta: number
  ): Promise<void> {
    const worker = await this.workerRegistry.getWorker(this.workerId);
    if (!worker) return;

    const newActiveTasks = worker.capacity.activeTasks + taskDelta;

    await this.workerRegistry.updateStatus(
      this.workerId,
      status,
      {
        activeTasks: newActiveTasks,
        availableSlots: worker.capacity.maxTasks - newActiveTasks
      }
    );
  }

  private async executeTask(task: Task): Promise<void> {
    // Task execution logic
    console.log(`Executing task ${task.id}`);
    // ... actual work ...
  }

  private async getPendingTasks(): Promise<Task[]> {
    // Fetch tasks from queue
    // ... implementation ...
    return [];
  }
}

// Usage
const worker = new DistributedWorker(
  process.env.WORKER_ID || 'worker-001',
  config,
  githubClient
);

await worker.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.stop();
  process.exit(0);
});
```

### Coordinator Pattern

```typescript
class TaskCoordinator {
  private loadBalancer: LoadBalancer;
  private workerRegistry: WorkerRegistry;
  private memorySyncManager: MemorySyncManager;

  async coordinateTask(task: Task): Promise<void> {
    // Select optimal worker
    const worker = await this.loadBalancer.selectWorker(task);

    if (!worker) {
      throw new Error('No workers available');
    }

    // Store task assignment
    await this.memorySyncManager.set(
      `task-${task.id}-assignment`,
      {
        workerId: worker.workerId,
        assignedAt: new Date().toISOString(),
        task
      },
      'tasks'
    );

    // Watch for completion
    return new Promise((resolve, reject) => {
      const unwatch = this.memorySyncManager.watch(
        `task-${task.id}-result`,
        (result) => {
          if (result.status === 'completed') {
            unwatch();
            resolve();
          } else if (result.status === 'failed') {
            unwatch();
            reject(new Error(result.error));
          }
        },
        'tasks'
      );

      // Timeout after 5 minutes
      setTimeout(() => {
        unwatch();
        reject(new Error('Task timeout'));
      }, 300000);
    });
  }
}
```

---

## Next Steps

- [Phase 3 Overview](../phase3_guide.md)
- [Deployment Guides](../deployment/)
- [Troubleshooting](../phase3_guide.md#troubleshooting)
