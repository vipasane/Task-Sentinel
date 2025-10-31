/**
 * Heartbeat Monitor - Task Sentinel Phase 3
 *
 * Handles:
 * - Periodic heartbeat sending (5-minute intervals)
 * - Heartbeat reception and validation
 * - Stale lock detection (10-minute threshold)
 * - Automatic lock recovery
 * - Failure handling with retries
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface HeartbeatData {
  worker_id: string;
  timestamp: number;
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  current_tasks: string[];
  capacity_available: number;
  metrics: WorkerMetrics;
}

export interface WorkerMetrics {
  cpu_usage: number;
  memory_usage: number;
  tasks_completed: number;
  tasks_failed: number;
  uptime: number;
}

export interface TaskLock {
  task_id: string;
  issue_number: number;
  worker_id: string;
  claimed_at: number;
  last_heartbeat: number;
}

export interface HeartbeatConfig {
  heartbeat_interval: number; // milliseconds (default: 5 minutes)
  stale_threshold: number; // milliseconds (default: 10 minutes)
  detection_interval: number; // milliseconds (default: 1 minute)
  retry_attempts: number; // default: 3
  retry_delay: number; // milliseconds (default: 5 seconds)
}

export interface LockRecoveryResult {
  success: boolean;
  task_id: string;
  worker_id: string;
  stale_duration: number;
  error?: string;
}

// ============================================================================
// Heartbeat Monitor
// ============================================================================

export class HeartbeatMonitor {
  private config: HeartbeatConfig;
  private worker_id: string;
  private heartbeat_timer?: NodeJS.Timeout;
  private detection_timer?: NodeJS.Timeout;
  private current_tasks: Set<string>;
  private metrics: WorkerMetrics;
  private is_running: boolean;
  private github_repo: string;
  private signalHandlersRegistered = false;

  constructor(
    worker_id: string,
    github_repo: string,
    config?: Partial<HeartbeatConfig>
  ) {
    this.worker_id = worker_id;
    this.github_repo = github_repo;
    this.current_tasks = new Set();
    this.is_running = false;

    // Default configuration
    this.config = {
      heartbeat_interval: 5 * 60 * 1000, // 5 minutes
      stale_threshold: 10 * 60 * 1000, // 10 minutes
      detection_interval: 1 * 60 * 1000, // 1 minute
      retry_attempts: 3,
      retry_delay: 5000, // 5 seconds
      ...config,
    };

    // Initialize metrics
    this.metrics = {
      cpu_usage: 0,
      memory_usage: 0,
      tasks_completed: 0,
      tasks_failed: 0,
      uptime: 0,
    };

    // Setup signal handlers for graceful shutdown
    this.setupSignalHandlers();

    console.log(`[HeartbeatMonitor] Initialized for worker: ${worker_id}`);
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Start heartbeat monitoring
   */
  async start(): Promise<void> {
    if (this.is_running) {
      console.log('[HeartbeatMonitor] Already running');
      return;
    }

    this.is_running = true;
    console.log('[HeartbeatMonitor] Starting heartbeat monitor');

    // Send initial heartbeat
    await this.sendHeartbeat();

    // Start periodic heartbeat
    this.heartbeat_timer = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeat_interval
    );

    // Start stale lock detection
    this.detection_timer = setInterval(
      () => this.detectStaleLocks(),
      this.config.detection_interval
    );

    console.log('[HeartbeatMonitor] Started successfully');
  }

  /**
   * Stop heartbeat monitoring
   */
  async stop(): Promise<void> {
    if (!this.is_running) {
      console.log('[HeartbeatMonitor] Not running');
      return;
    }

    console.log('[HeartbeatMonitor] Stopping heartbeat monitor');
    this.is_running = false;

    // Clear timers
    if (this.heartbeat_timer) {
      clearInterval(this.heartbeat_timer);
      this.heartbeat_timer = undefined;
    }

    if (this.detection_timer) {
      clearInterval(this.detection_timer);
      this.detection_timer = undefined;
    }

    // Send final heartbeat with stopped status
    await this.sendFinalHeartbeat();

    console.log('[HeartbeatMonitor] Stopped successfully');
  }

  // ============================================================================
  // Heartbeat Operations
  // ============================================================================

  /**
   * Send heartbeat with retry logic
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.is_running) return;

    const heartbeat = this.createHeartbeat();

    // Try sending with retries
    for (let attempt = 1; attempt <= this.config.retry_attempts; attempt++) {
      try {
        await this.sendHeartbeatToDestinations(heartbeat);
        console.log(`[HeartbeatMonitor] Heartbeat sent successfully (attempt ${attempt})`);
        return;
      } catch (error) {
        console.error(`[HeartbeatMonitor] Heartbeat failed (attempt ${attempt}):`, error);

        if (attempt < this.config.retry_attempts) {
          // Wait before retry
          await this.sleep(this.config.retry_delay);
        } else {
          // All retries failed - log but continue
          console.error('[HeartbeatMonitor] All heartbeat attempts failed - continuing with degraded mode');
          await this.handleHeartbeatFailure(error);
        }
      }
    }
  }

  /**
   * Create heartbeat data
   */
  private createHeartbeat(): HeartbeatData {
    this.updateMetrics();

    return {
      worker_id: this.worker_id,
      timestamp: Date.now(),
      health_status: this.determineHealthStatus(),
      current_tasks: Array.from(this.current_tasks),
      capacity_available: this.calculateAvailableCapacity(),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Send heartbeat to all destinations
   */
  private async sendHeartbeatToDestinations(heartbeat: HeartbeatData): Promise<void> {
    const destinations = [];

    // 1. Memory storage
    destinations.push(this.sendToMemory(heartbeat));

    // 2. GitHub comments on claimed tasks
    destinations.push(this.sendToGitHub(heartbeat));

    // 3. Metrics collection
    destinations.push(this.sendToMetrics(heartbeat));

    // Wait for all destinations
    await Promise.all(destinations);
  }

  /**
   * Send heartbeat to MCP memory
   */
  private async sendToMemory(heartbeat: HeartbeatData): Promise<void> {
    const key = `task-sentinel/workers/${this.worker_id}/heartbeat`;
    const value = JSON.stringify(heartbeat);

    await execAsync(
      `npx @modelcontextprotocol/server-memory store "${key}" '${value}'`
    );
  }

  /**
   * Send heartbeat to GitHub (comment on claimed tasks)
   */
  private async sendToGitHub(heartbeat: HeartbeatData): Promise<void> {
    if (heartbeat.current_tasks.length === 0) return;

    const comment = this.formatHeartbeatComment(heartbeat);

    // Post comment to each claimed task
    for (const task_id of heartbeat.current_tasks) {
      try {
        const lock = await this.getTaskLock(task_id);
        if (lock && lock.issue_number) {
          await execAsync(
            `gh issue comment ${lock.issue_number} --repo ${this.github_repo} --body "${comment}"`
          );
        }
      } catch (error) {
        console.error(`[HeartbeatMonitor] Failed to comment on task ${task_id}:`, error);
        // Continue with other tasks
      }
    }
  }

  /**
   * Send heartbeat to metrics system
   */
  private async sendToMetrics(heartbeat: HeartbeatData): Promise<void> {
    const metrics_key = `task-sentinel/metrics/heartbeats/${this.worker_id}/${heartbeat.timestamp}`;
    const metrics_value = JSON.stringify({
      timestamp: heartbeat.timestamp,
      health_status: heartbeat.health_status,
      task_count: heartbeat.current_tasks.length,
      capacity_available: heartbeat.capacity_available,
      metrics: heartbeat.metrics,
    });

    await execAsync(
      `npx @modelcontextprotocol/server-memory store "${metrics_key}" '${metrics_value}'`
    );
  }

  /**
   * Send final heartbeat on shutdown
   */
  private async sendFinalHeartbeat(): Promise<void> {
    const heartbeat: HeartbeatData = {
      worker_id: this.worker_id,
      timestamp: Date.now(),
      health_status: 'unhealthy',
      current_tasks: [],
      capacity_available: 0,
      metrics: { ...this.metrics },
    };

    try {
      await this.sendToMemory(heartbeat);
      await this.sendToMetrics(heartbeat);
    } catch (error) {
      console.error('[HeartbeatMonitor] Failed to send final heartbeat:', error);
    }
  }

  // ============================================================================
  // Stale Lock Detection
  // ============================================================================

  /**
   * Detect and recover stale locks
   */
  private async detectStaleLocks(): Promise<void> {
    if (!this.is_running) return;

    console.log('[HeartbeatMonitor] Running stale lock detection');

    try {
      // Get all claimed tasks
      const claimed_tasks = await this.getClaimedTasks();

      console.log(`[HeartbeatMonitor] Checking ${claimed_tasks.length} claimed tasks`);

      // Check each task for staleness
      for (const lock of claimed_tasks) {
        const is_stale = await this.isLockStale(lock);

        if (is_stale) {
          console.log(`[HeartbeatMonitor] Stale lock detected: ${lock.task_id} (worker: ${lock.worker_id})`);
          await this.recoverStaleLock(lock);
        }
      }
    } catch (error) {
      console.error('[HeartbeatMonitor] Error during stale lock detection:', error);
    }
  }

  /**
   * Check if a lock is stale
   */
  private async isLockStale(lock: TaskLock): Promise<boolean> {
    try {
      const last_heartbeat = await this.getLastHeartbeat(lock.worker_id);

      if (!last_heartbeat) {
        console.log(`[HeartbeatMonitor] No heartbeat found for worker ${lock.worker_id}`);
        return true;
      }

      const stale_duration = Date.now() - last_heartbeat;
      const is_stale = stale_duration > this.config.stale_threshold;

      if (is_stale) {
        console.log(
          `[HeartbeatMonitor] Lock is stale: ${this.formatDuration(stale_duration)} since last heartbeat`
        );
      }

      return is_stale;
    } catch (error) {
      console.error('[HeartbeatMonitor] Error checking lock staleness:', error);
      return false;
    }
  }

  /**
   * Recover a stale lock
   */
  private async recoverStaleLock(lock: TaskLock): Promise<LockRecoveryResult> {
    console.log(`[HeartbeatMonitor] Attempting to recover stale lock: ${lock.task_id}`);

    try {
      // 1. Verify lock is actually stale
      const last_heartbeat = await this.getLastHeartbeat(lock.worker_id);
      const stale_duration = Date.now() - (last_heartbeat || lock.last_heartbeat);

      if (stale_duration <= this.config.stale_threshold) {
        console.log('[HeartbeatMonitor] Lock is no longer stale - skipping recovery');
        return {
          success: false,
          task_id: lock.task_id,
          worker_id: lock.worker_id,
          stale_duration,
          error: 'Lock is no longer stale',
        };
      }

      // 2. Remove assignment
      await execAsync(
        `gh issue edit ${lock.issue_number} --remove-assignee ${lock.worker_id} --repo ${this.github_repo}`
      );

      // 3. Add recovery comment
      const comment = `⚠️ **Stale Lock Detected**

Worker \`${lock.worker_id}\` last seen ${this.formatDuration(stale_duration)} ago.

**Actions Taken:**
- ✅ Assignment removed
- ✅ Lock released
- ✅ Task returned to queue

Task is now available for other workers to claim.`;

      await execAsync(
        `gh issue comment ${lock.issue_number} --repo ${this.github_repo} --body "${comment}"`
      );

      // 4. Update task status
      await execAsync(
        `gh issue edit ${lock.issue_number} --add-label status:queued --remove-label status:in-progress --repo ${this.github_repo}`
      );

      // 5. Clean up memory
      await execAsync(
        `npx @modelcontextprotocol/server-memory delete "task-sentinel/tasks/${lock.task_id}/lock"`
      );

      // 6. Update metrics
      await this.recordLockRecovery(lock, stale_duration);

      console.log(`[HeartbeatMonitor] Successfully recovered stale lock: ${lock.task_id}`);

      return {
        success: true,
        task_id: lock.task_id,
        worker_id: lock.worker_id,
        stale_duration,
      };
    } catch (error) {
      console.error(`[HeartbeatMonitor] Failed to recover stale lock: ${lock.task_id}`, error);

      return {
        success: false,
        task_id: lock.task_id,
        worker_id: lock.worker_id,
        stale_duration: Date.now() - lock.last_heartbeat,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get all claimed tasks from memory
   */
  private async getClaimedTasks(): Promise<TaskLock[]> {
    try {
      const result = await execAsync(
        `npx @modelcontextprotocol/server-memory list-keys "task-sentinel/tasks/*/lock"`
      );

      const keys = result.stdout.trim().split('\n').filter(Boolean);
      const locks: TaskLock[] = [];

      for (const key of keys) {
        try {
          const lock_result = await execAsync(
            `npx @modelcontextprotocol/server-memory retrieve "${key}"`
          );

          const lock = JSON.parse(lock_result.stdout);
          locks.push(lock);
        } catch (error) {
          console.error(`[HeartbeatMonitor] Failed to retrieve lock ${key}:`, error);
        }
      }

      return locks;
    } catch (error) {
      console.error('[HeartbeatMonitor] Failed to get claimed tasks:', error);
      return [];
    }
  }

  /**
   * Get last heartbeat timestamp for a worker
   */
  private async getLastHeartbeat(worker_id: string): Promise<number | null> {
    try {
      const key = `task-sentinel/workers/${worker_id}/heartbeat`;
      const result = await execAsync(
        `npx @modelcontextprotocol/server-memory retrieve "${key}"`
      );

      const heartbeat: HeartbeatData = JSON.parse(result.stdout);
      return heartbeat.timestamp;
    } catch (error) {
      console.error(`[HeartbeatMonitor] Failed to get heartbeat for ${worker_id}:`, error);
      return null;
    }
  }

  /**
   * Get task lock information
   */
  private async getTaskLock(task_id: string): Promise<TaskLock | null> {
    try {
      const key = `task-sentinel/tasks/${task_id}/lock`;
      const result = await execAsync(
        `npx @modelcontextprotocol/server-memory retrieve "${key}"`
      );

      return JSON.parse(result.stdout);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update worker metrics
   */
  private updateMetrics(): void {
    // Get system metrics
    const usage = process.memoryUsage();
    const uptime = process.uptime();

    this.metrics = {
      cpu_usage: process.cpuUsage().user / 1000000, // Convert to percentage
      memory_usage: usage.heapUsed / 1024 / 1024, // Convert to MB
      tasks_completed: this.metrics.tasks_completed,
      tasks_failed: this.metrics.tasks_failed,
      uptime: uptime,
    };
  }

  /**
   * Determine health status
   */
  private determineHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const { cpu_usage, memory_usage } = this.metrics;

    if (cpu_usage > 90 || memory_usage > 8192) {
      return 'unhealthy';
    } else if (cpu_usage > 70 || memory_usage > 4096) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Calculate available capacity
   */
  private calculateAvailableCapacity(): number {
    const max_capacity = 5; // Maximum concurrent tasks
    return Math.max(0, max_capacity - this.current_tasks.size);
  }

  /**
   * Format heartbeat as GitHub comment
   */
  private formatHeartbeatComment(heartbeat: HeartbeatData): string {
    return `💓 **Worker Heartbeat**

Worker: \`${heartbeat.worker_id}\`
Status: ${this.formatHealthStatus(heartbeat.health_status)}
Timestamp: ${new Date(heartbeat.timestamp).toISOString()}
Active Tasks: ${heartbeat.current_tasks.length}
Available Capacity: ${heartbeat.capacity_available}

**Metrics:**
- CPU: ${heartbeat.metrics.cpu_usage.toFixed(1)}%
- Memory: ${heartbeat.metrics.memory_usage.toFixed(1)} MB
- Uptime: ${this.formatDuration(heartbeat.metrics.uptime * 1000)}
- Completed: ${heartbeat.metrics.tasks_completed}`;
  }

  /**
   * Format health status with emoji
   */
  private formatHealthStatus(status: string): string {
    const icons = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
    };
    return `${icons[status as keyof typeof icons] || '❓'} ${status}`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Handle heartbeat failure
   */
  private async handleHeartbeatFailure(error: unknown): Promise<void> {
    const failure_key = `task-sentinel/workers/${this.worker_id}/heartbeat-failures`;

    try {
      const failure_data = {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
        consecutive_failures: this.metrics.tasks_failed + 1,
      };

      await execAsync(
        `npx @modelcontextprotocol/server-memory store "${failure_key}" '${JSON.stringify(failure_data)}'`
      );

      // Alert if failures persist
      if (failure_data.consecutive_failures >= 3) {
        console.error(
          `[HeartbeatMonitor] ALERT: ${failure_data.consecutive_failures} consecutive heartbeat failures`
        );
      }
    } catch (e) {
      console.error('[HeartbeatMonitor] Failed to log heartbeat failure:', e);
    }
  }

  /**
   * Record lock recovery metrics
   */
  private async recordLockRecovery(lock: TaskLock, stale_duration: number): Promise<void> {
    const metrics_key = `task-sentinel/metrics/lock-recoveries/${Date.now()}`;
    const metrics_value = JSON.stringify({
      timestamp: Date.now(),
      task_id: lock.task_id,
      worker_id: lock.worker_id,
      stale_duration,
      issue_number: lock.issue_number,
    });

    try {
      await execAsync(
        `npx @modelcontextprotocol/server-memory store "${metrics_key}" '${metrics_value}'`
      );
    } catch (error) {
      console.error('[HeartbeatMonitor] Failed to record lock recovery metrics:', error);
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    // Prevent duplicate registration
    if (this.signalHandlersRegistered) return;
    this.signalHandlersRegistered = true;

    const cleanup = async (signal: string) => {
      console.log(`[HeartbeatMonitor] Received ${signal}, cleaning up...`);
      try {
        await this.stop();
        console.log('[HeartbeatMonitor] Cleanup completed');
      } catch (error) {
        console.error('[HeartbeatMonitor] Error during cleanup:', error);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGHUP', () => cleanup('SIGHUP'));
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Public API for Task Management
  // ============================================================================

  /**
   * Register a task as currently being worked on
   */
  public addTask(task_id: string): void {
    this.current_tasks.add(task_id);
    console.log(`[HeartbeatMonitor] Task added: ${task_id} (total: ${this.current_tasks.size})`);
  }

  /**
   * Remove a task that's no longer being worked on
   */
  public removeTask(task_id: string): void {
    this.current_tasks.delete(task_id);
    console.log(`[HeartbeatMonitor] Task removed: ${task_id} (total: ${this.current_tasks.size})`);
  }

  /**
   * Record task completion
   */
  public recordTaskCompletion(): void {
    this.metrics.tasks_completed++;
  }

  /**
   * Record task failure
   */
  public recordTaskFailure(): void {
    this.metrics.tasks_failed++;
  }

  /**
   * Get current worker metrics
   */
  public getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    return this.determineHealthStatus();
  }
}

// ============================================================================
// Exports
// ============================================================================

export default HeartbeatMonitor;
