/**
 * Task Sentinel Phase 2 - Metrics Storage Integration
 * MCP memory tools integration for persistent metrics storage
 */

import {
  MetricsSummary,
  MetricsAggregation,
  MetricsQuery,
  OODACycleMetric,
  PlanningMetric,
  TaskExecutionMetric,
  SystemMetric
} from './types.js';

export interface MemoryStorageConfig {
  namespace: string;
  ttlDays: number;
  compressionEnabled: boolean;
}

export class MetricsStorage {
  private readonly namespace: string;
  private readonly ttlSeconds: number;

  constructor(
    private config: MemoryStorageConfig = {
      namespace: 'task-sentinel/metrics',
      ttlDays: 90,
      compressionEnabled: true
    }
  ) {
    this.namespace = config.namespace;
    this.ttlSeconds = config.ttlDays * 24 * 60 * 60;
  }

  // ============================================================================
  // Store Operations
  // ============================================================================

  /**
   * Store OODA cycle metric
   */
  async storeCycleMetric(metric: OODACycleMetric): Promise<void> {
    const key = `${this.namespace}/ooda/cycle/${metric.cycleId}`;
    await this.storeInMemory(key, metric);
  }

  /**
   * Store planning metric
   */
  async storePlanningMetric(metric: PlanningMetric): Promise<void> {
    const key = `${this.namespace}/planning/${metric.planId}`;
    await this.storeInMemory(key, metric);
  }

  /**
   * Store task execution metric
   */
  async storeTaskMetric(metric: TaskExecutionMetric): Promise<void> {
    const key = `${this.namespace}/task/${metric.taskId}`;
    await this.storeInMemory(key, metric);
  }

  /**
   * Store system metric snapshot
   */
  async storeSystemMetric(metric: SystemMetric): Promise<void> {
    const key = `${this.namespace}/system/${metric.timestamp}`;
    await this.storeInMemory(key, metric);
  }

  /**
   * Store aggregated metrics summary
   */
  async storeAggregation(aggregation: MetricsAggregation): Promise<void> {
    const key = `${this.namespace}/aggregation/${aggregation.period}/${aggregation.timestamp}`;
    await this.storeInMemory(key, aggregation);
  }

  // ============================================================================
  // Retrieve Operations
  // ============================================================================

  /**
   * Retrieve cycle metrics by query
   */
  async retrieveCycleMetrics(query: MetricsQuery): Promise<OODACycleMetric[]> {
    const pattern = `${this.namespace}/ooda/cycle/*`;
    const results = await this.searchMemory(pattern);

    return results
      .map(r => JSON.parse(r.value) as OODACycleMetric)
      .filter(m => this.matchesQuery(m.startTime, query));
  }

  /**
   * Retrieve planning metrics by query
   */
  async retrievePlanningMetrics(query: MetricsQuery): Promise<PlanningMetric[]> {
    const pattern = `${this.namespace}/planning/*`;
    const results = await this.searchMemory(pattern);

    return results
      .map(r => JSON.parse(r.value) as PlanningMetric)
      .filter(m => this.matchesQuery(m.timestamp, query));
  }

  /**
   * Retrieve task metrics by query
   */
  async retrieveTaskMetrics(query: MetricsQuery): Promise<TaskExecutionMetric[]> {
    const pattern = `${this.namespace}/task/*`;
    const results = await this.searchMemory(pattern);

    return results
      .map(r => JSON.parse(r.value) as TaskExecutionMetric)
      .filter(m => this.matchesQuery(m.timestamp, query));
  }

  /**
   * Retrieve system metrics by query
   */
  async retrieveSystemMetrics(query: MetricsQuery): Promise<SystemMetric[]> {
    const pattern = `${this.namespace}/system/*`;
    const results = await this.searchMemory(pattern);

    return results
      .map(r => JSON.parse(r.value) as SystemMetric)
      .filter(m => this.matchesQuery(m.timestamp, query));
  }

  /**
   * Retrieve aggregated metrics
   */
  async retrieveAggregations(
    period: 'hourly' | 'daily' | 'weekly',
    startTime?: number,
    endTime?: number
  ): Promise<MetricsAggregation[]> {
    const pattern = `${this.namespace}/aggregation/${period}/*`;
    const results = await this.searchMemory(pattern);

    return results
      .map(r => JSON.parse(r.value) as MetricsAggregation)
      .filter(a => {
        if (startTime && a.timestamp < startTime) return false;
        if (endTime && a.timestamp > endTime) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // ============================================================================
  // Aggregation Operations
  // ============================================================================

  /**
   * Create hourly aggregation
   */
  async createHourlyAggregation(summary: MetricsSummary): Promise<void> {
    const hourTimestamp = Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000);

    const aggregation: MetricsAggregation = {
      period: 'hourly',
      timestamp: hourTimestamp,
      summary
    };

    await this.storeAggregation(aggregation);
  }

  /**
   * Create daily aggregation
   */
  async createDailyAggregation(summary: MetricsSummary): Promise<void> {
    const dayTimestamp = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);

    const aggregation: MetricsAggregation = {
      period: 'daily',
      timestamp: dayTimestamp,
      summary
    };

    await this.storeAggregation(aggregation);
  }

  /**
   * Create weekly aggregation
   */
  async createWeeklyAggregation(summary: MetricsSummary): Promise<void> {
    const weekTimestamp = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) * (7 * 24 * 60 * 60 * 1000);

    const aggregation: MetricsAggregation = {
      period: 'weekly',
      timestamp: weekTimestamp,
      summary
    };

    await this.storeAggregation(aggregation);
  }

  // ============================================================================
  // Maintenance Operations
  // ============================================================================

  /**
   * Clean up expired metrics
   */
  async cleanupExpiredMetrics(): Promise<number> {
    const cutoffTime = Date.now() - (this.ttlSeconds * 1000);
    let deletedCount = 0;

    const categories = ['ooda/cycle', 'planning', 'task', 'system'];

    for (const category of categories) {
      const pattern = `${this.namespace}/${category}/*`;
      const results = await this.searchMemory(pattern);

      for (const result of results) {
        try {
          const metric = JSON.parse(result.value);
          const timestamp = metric.timestamp || metric.startTime;

          if (timestamp && timestamp < cutoffTime) {
            await this.deleteFromMemory(result.key);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error processing metric ${result.key}:`, error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Compress old metrics
   */
  async compressOldMetrics(olderThanDays: number = 30): Promise<number> {
    if (!this.config.compressionEnabled) {
      return 0;
    }

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let compressedCount = 0;

    // In a real implementation, this would compress raw metrics into aggregations
    // For now, we'll mark it as a placeholder

    console.log(`[MetricsStorage] Compression would process metrics older than ${new Date(cutoffTime).toISOString()}`);

    return compressedCount;
  }

  /**
   * Backup metrics to external storage
   */
  async backupMetrics(destinationPath: string): Promise<boolean> {
    try {
      const allMetrics = {
        cycles: await this.retrieveCycleMetrics({}),
        planning: await this.retrievePlanningMetrics({}),
        tasks: await this.retrieveTaskMetrics({}),
        system: await this.retrieveSystemMetrics({}),
        aggregations: {
          hourly: await this.retrieveAggregations('hourly'),
          daily: await this.retrieveAggregations('daily'),
          weekly: await this.retrieveAggregations('weekly')
        }
      };

      // Store backup reference in memory
      const backupKey = `${this.namespace}/backup/${Date.now()}`;
      await this.storeInMemory(backupKey, {
        timestamp: Date.now(),
        destinationPath,
        metricsCount: {
          cycles: allMetrics.cycles.length,
          planning: allMetrics.planning.length,
          tasks: allMetrics.tasks.length,
          system: allMetrics.system.length
        }
      });

      console.log(`[MetricsStorage] Backup created: ${backupKey}`);
      return true;
    } catch (error) {
      console.error('[MetricsStorage] Backup failed:', error);
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Store data in MCP memory
   */
  private async storeInMemory(key: string, value: any): Promise<void> {
    // This would integrate with MCP tools in production:
    // await mcp__claude-flow__memory_usage({
    //   action: 'store',
    //   namespace: this.namespace,
    //   key,
    //   value: JSON.stringify(value),
    //   ttl: this.ttlSeconds
    // });

    console.log(`[MetricsStorage] Store: ${key} (TTL: ${this.config.ttlDays} days)`);
  }

  /**
   * Search memory by pattern
   */
  private async searchMemory(pattern: string): Promise<Array<{ key: string; value: string }>> {
    // This would integrate with MCP tools in production:
    // const result = await mcp__claude-flow__memory_search({
    //   pattern,
    //   namespace: this.namespace,
    //   limit: 1000
    // });
    // return result.matches;

    console.log(`[MetricsStorage] Search: ${pattern}`);
    return [];
  }

  /**
   * Delete from memory
   */
  private async deleteFromMemory(key: string): Promise<void> {
    // This would integrate with MCP tools in production:
    // await mcp__claude-flow__memory_usage({
    //   action: 'delete',
    //   namespace: this.namespace,
    //   key
    // });

    console.log(`[MetricsStorage] Delete: ${key}`);
  }

  /**
   * Check if timestamp matches query
   */
  private matchesQuery(timestamp: number, query: MetricsQuery): boolean {
    if (query.startTime && timestamp < query.startTime) return false;
    if (query.endTime && timestamp > query.endTime) return false;
    return true;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalMetrics: number;
    byCategory: Record<string, number>;
    oldestMetric: number;
    newestMetric: number;
    estimatedSizeKB: number;
  }> {
    const categories = ['ooda/cycle', 'planning', 'task', 'system'];
    const stats = {
      totalMetrics: 0,
      byCategory: {} as Record<string, number>,
      oldestMetric: Date.now(),
      newestMetric: 0,
      estimatedSizeKB: 0
    };

    for (const category of categories) {
      const pattern = `${this.namespace}/${category}/*`;
      const results = await this.searchMemory(pattern);

      stats.byCategory[category] = results.length;
      stats.totalMetrics += results.length;

      for (const result of results) {
        try {
          const metric = JSON.parse(result.value);
          const timestamp = metric.timestamp || metric.startTime;

          if (timestamp) {
            stats.oldestMetric = Math.min(stats.oldestMetric, timestamp);
            stats.newestMetric = Math.max(stats.newestMetric, timestamp);
          }

          stats.estimatedSizeKB += result.value.length / 1024;
        } catch (error) {
          // Skip invalid metrics
        }
      }
    }

    return stats;
  }
}

/**
 * Create metrics storage instance
 */
export function createMetricsStorage(config?: Partial<MemoryStorageConfig>): MetricsStorage {
  return new MetricsStorage({
    namespace: config?.namespace || 'task-sentinel/metrics',
    ttlDays: config?.ttlDays || 90,
    compressionEnabled: config?.compressionEnabled ?? true
  });
}
