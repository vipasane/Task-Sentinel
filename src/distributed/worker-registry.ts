/**
 * Worker Registry for Task Sentinel Phase 3
 *
 * Manages distributed worker coordination, health tracking,
 * and load balancing for task distribution.
 */

import { ClaudeFlowMemory } from '../memory/claude-flow-memory';

/**
 * Worker health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Worker metrics for performance tracking
 */
export interface WorkerMetrics {
  tasksCompleted: number;
  tasksFailedCount: number;
  averageTaskDuration: number;
}

/**
 * Worker metadata and state
 */
export interface Worker {
  id: string;
  nodeId: string;
  capabilities: string[]; // ['coder', 'tester', 'reviewer', etc.]
  maxConcurrentTasks: number;
  currentTasks: number;
  healthStatus: HealthStatus;
  lastHeartbeat: Date;
  startedAt: Date;
  metrics: WorkerMetrics;
}

/**
 * Worker registration request
 */
export interface WorkerRegistration {
  nodeId: string;
  capabilities: string[];
  maxConcurrentTasks: number;
}

/**
 * Worker discovery filter options
 */
export interface WorkerFilter {
  capabilities?: string[];
  healthStatus?: HealthStatus[];
  minAvailableCapacity?: number;
}

/**
 * Worker with calculated priority for load balancing
 */
export interface WorkerWithPriority extends Worker {
  priority: number;
  availableCapacity: number;
  successRate: number;
}

/**
 * Worker Registry Configuration
 */
export interface WorkerRegistryConfig {
  memory: ClaudeFlowMemory;
  workerTTL?: number; // milliseconds (default: 15 minutes)
  healthyThreshold?: number; // milliseconds (default: 10 minutes)
  degradedThreshold?: number; // milliseconds (default: 15 minutes)
  cleanupInterval?: number; // milliseconds (default: 5 minutes)
}

/**
 * WorkerRegistry manages distributed workers with health tracking,
 * capacity management, and load balancing.
 */
export class WorkerRegistry {
  private memory: ClaudeFlowMemory;
  private workerTTL: number;
  private healthyThreshold: number;
  private degradedThreshold: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly WORKER_KEY_PREFIX = 'task-sentinel/workers';

  constructor(config: WorkerRegistryConfig) {
    this.memory = config.memory;
    this.workerTTL = config.workerTTL || 15 * 60 * 1000; // 15 minutes
    this.healthyThreshold = config.healthyThreshold || 10 * 60 * 1000; // 10 minutes
    this.degradedThreshold = config.degradedThreshold || 15 * 60 * 1000; // 15 minutes
    this.cleanupInterval = config.cleanupInterval || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start automatic cleanup of unhealthy workers
   */
  public startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanupUnhealthyWorkers();
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Register a new worker
   */
  public async registerWorker(registration: WorkerRegistration): Promise<Worker> {
    const workerId = this.generateWorkerId();

    const worker: Worker = {
      id: workerId,
      nodeId: registration.nodeId,
      capabilities: registration.capabilities,
      maxConcurrentTasks: registration.maxConcurrentTasks,
      currentTasks: 0,
      healthStatus: 'healthy',
      lastHeartbeat: new Date(),
      startedAt: new Date(),
      metrics: {
        tasksCompleted: 0,
        tasksFailedCount: 0,
        averageTaskDuration: 0,
      },
    };

    // Store in memory with TTL
    await this.storeWorker(worker);

    // Broadcast registration event
    await this.broadcastEvent({
      type: 'worker-registered',
      workerId,
      nodeId: registration.nodeId,
      capabilities: registration.capabilities,
      timestamp: new Date(),
    });

    return worker;
  }

  /**
   * Update worker heartbeat
   */
  public async heartbeat(workerId: string): Promise<void> {
    const worker = await this.getWorker(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    worker.lastHeartbeat = new Date();
    worker.healthStatus = this.calculateHealthStatus(worker);

    await this.storeWorker(worker);
  }

  /**
   * Update worker task count
   */
  public async updateTaskCount(workerId: string, delta: number): Promise<void> {
    const worker = await this.getWorker(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    worker.currentTasks = Math.max(0, worker.currentTasks + delta);
    await this.storeWorker(worker);
  }

  /**
   * Update worker metrics
   */
  public async updateMetrics(
    workerId: string,
    metrics: Partial<WorkerMetrics>
  ): Promise<void> {
    const worker = await this.getWorker(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    worker.metrics = {
      ...worker.metrics,
      ...metrics,
    };

    // Recalculate average task duration if completed count changed
    if (metrics.tasksCompleted !== undefined && worker.metrics.tasksCompleted > 0) {
      // This would typically be calculated from actual task durations
      // For now, we keep the existing average
    }

    await this.storeWorker(worker);
  }

  /**
   * Record task completion
   */
  public async recordTaskCompletion(
    workerId: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    const worker = await this.getWorker(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    // Update metrics
    const totalTasks = worker.metrics.tasksCompleted + worker.metrics.tasksFailedCount;
    const currentAvg = worker.metrics.averageTaskDuration;

    worker.metrics.averageTaskDuration =
      (currentAvg * totalTasks + duration) / (totalTasks + 1);

    if (success) {
      worker.metrics.tasksCompleted++;
    } else {
      worker.metrics.tasksFailedCount++;
    }

    // Decrement current tasks
    worker.currentTasks = Math.max(0, worker.currentTasks - 1);

    await this.storeWorker(worker);
  }

  /**
   * Get a specific worker by ID
   */
  public async getWorker(workerId: string): Promise<Worker | null> {
    const key = this.getWorkerKey(workerId);
    const data = await this.memory.get(key);

    if (!data) {
      return null;
    }

    return this.deserializeWorker(data);
  }

  /**
   * Discover workers with filtering
   */
  public async discoverWorkers(filter?: WorkerFilter): Promise<Worker[]> {
    const pattern = `${this.WORKER_KEY_PREFIX}/*`;
    const results = await this.memory.search(pattern);

    let workers = results.map(result => this.deserializeWorker(result.value));

    // Apply filters
    if (filter) {
      workers = workers.filter(worker => {
        // Filter by capabilities
        if (filter.capabilities && filter.capabilities.length > 0) {
          const hasAllCapabilities = filter.capabilities.every(cap =>
            worker.capabilities.includes(cap)
          );
          if (!hasAllCapabilities) {
            return false;
          }
        }

        // Filter by health status
        if (filter.healthStatus && filter.healthStatus.length > 0) {
          if (!filter.healthStatus.includes(worker.healthStatus)) {
            return false;
          }
        }

        // Filter by available capacity
        if (filter.minAvailableCapacity !== undefined) {
          const availableCapacity = worker.maxConcurrentTasks - worker.currentTasks;
          if (availableCapacity < filter.minAvailableCapacity) {
            return false;
          }
        }

        return true;
      });
    }

    // Update health status for all workers
    workers = workers.map(worker => ({
      ...worker,
      healthStatus: this.calculateHealthStatus(worker),
    }));

    return workers;
  }

  /**
   * Get workers sorted by load balancing priority
   */
  public async getWorkersForLoadBalancing(
    filter?: WorkerFilter
  ): Promise<WorkerWithPriority[]> {
    const workers = await this.discoverWorkers(filter);

    // Calculate priority for each worker
    const workersWithPriority: WorkerWithPriority[] = workers.map(worker => {
      const availableCapacity = worker.maxConcurrentTasks - worker.currentTasks;
      const totalTasks = worker.metrics.tasksCompleted + worker.metrics.tasksFailedCount;
      const successRate = totalTasks > 0
        ? worker.metrics.tasksCompleted / totalTasks
        : 1.0;

      // Priority calculation:
      // - Available capacity: 50% weight
      // - Success rate: 30% weight
      // - Inverse of average duration: 20% weight
      const capacityScore = availableCapacity / worker.maxConcurrentTasks;
      const durationScore = worker.metrics.averageTaskDuration > 0
        ? 1 / (worker.metrics.averageTaskDuration / 1000) // Normalize to seconds
        : 1.0;

      const priority =
        (capacityScore * 0.5) +
        (successRate * 0.3) +
        (Math.min(durationScore, 1.0) * 0.2);

      return {
        ...worker,
        priority,
        availableCapacity,
        successRate,
      };
    });

    // Sort by priority (descending)
    return workersWithPriority.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a worker
   */
  public async unregisterWorker(workerId: string): Promise<void> {
    const key = this.getWorkerKey(workerId);
    await this.memory.delete(key);

    // Broadcast unregistration event
    await this.broadcastEvent({
      type: 'worker-unregistered',
      workerId,
      timestamp: new Date(),
    });
  }

  /**
   * Cleanup unhealthy workers
   */
  private async cleanupUnhealthyWorkers(): Promise<void> {
    const workers = await this.discoverWorkers();
    const now = Date.now();

    for (const worker of workers) {
      const timeSinceHeartbeat = now - worker.lastHeartbeat.getTime();

      if (timeSinceHeartbeat > this.degradedThreshold) {
        await this.unregisterWorker(worker.id);
      }
    }
  }

  /**
   * Calculate worker health status based on heartbeat
   */
  private calculateHealthStatus(worker: Worker): HealthStatus {
    const now = Date.now();
    const timeSinceHeartbeat = now - worker.lastHeartbeat.getTime();

    if (timeSinceHeartbeat <= this.healthyThreshold) {
      return 'healthy';
    } else if (timeSinceHeartbeat <= this.degradedThreshold) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Store worker in memory with TTL
   */
  private async storeWorker(worker: Worker): Promise<void> {
    const key = this.getWorkerKey(worker.id);
    const value = this.serializeWorker(worker);

    await this.memory.store(
      key,
      value,
      this.workerTTL
    );
  }

  /**
   * Serialize worker for storage
   */
  private serializeWorker(worker: Worker): string {
    return JSON.stringify({
      ...worker,
      lastHeartbeat: worker.lastHeartbeat.toISOString(),
      startedAt: worker.startedAt.toISOString(),
    });
  }

  /**
   * Deserialize worker from storage
   */
  private deserializeWorker(data: string): Worker {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      lastHeartbeat: new Date(parsed.lastHeartbeat),
      startedAt: new Date(parsed.startedAt),
    };
  }

  /**
   * Get memory key for worker
   */
  private getWorkerKey(workerId: string): string {
    return `${this.WORKER_KEY_PREFIX}/${workerId}`;
  }

  /**
   * Generate unique worker ID
   */
  private generateWorkerId(): string {
    return `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Broadcast event to memory system
   */
  private async broadcastEvent(event: any): Promise<void> {
    const key = `task-sentinel/events/${event.type}/${Date.now()}`;
    await this.memory.store(
      key,
      JSON.stringify(event),
      60 * 1000 // Events expire after 1 minute
    );
  }
}
