# Task Sentinel Phase 2 - Performance Metrics System

Comprehensive metrics collection and tracking for OODA loop performance and system KPIs.

## Overview

The metrics system provides:

- **OODA Loop Tracking**: Monitor observe, orient, decide, and act phases
- **GOAP Planning Metrics**: Track planning time, costs, and optimality
- **Task Execution Metrics**: Measure throughput, duration, and success rates
- **System Performance**: Monitor worker utilization and parallel efficiency
- **KPI Validation**: Automatic comparison against defined targets
- **Persistent Storage**: 90-day retention with MCP memory integration
- **Aggregation**: Hourly, daily, and weekly rollups

## Quick Start

```typescript
import { getMetricsCollector } from './metrics/index.js';

// Get singleton collector instance
const metrics = getMetricsCollector();

// Track OODA cycle
const cycleId = 'cycle-123';
metrics.startCycle(cycleId);

// Track phases
const observeId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
// ... do work ...
metrics.recordPhaseEnd(observeId, true);

// End cycle
metrics.endCycle(cycleId, false);

// Get summary
const summary = metrics.getMetricsSummary();
console.log(`Average cycle time: ${summary.oodaMetrics.avgCycleTime}ms`);

// Generate report
const report = metrics.generateReport('daily');
console.log(report);
```

## Key Performance Indicators (KPIs)

### OODA Loop
- **Target**: < 5 minutes per cycle
- **Tracked**: Cycle time, phase durations, replanning frequency
- **Status**: `summary.kpiStatus.oodaCycleTime.met`

### Planning Time
- **Target**: < 30 seconds per plan
- **Tracked**: Planning duration, plan cost, optimality ratio
- **Status**: `summary.kpiStatus.planningTime.met`

### Task Throughput
- **Target**: > 50 tasks per day
- **Tracked**: Tasks completed, duration distribution
- **Status**: `summary.kpiStatus.taskThroughput.met`

### QA Pass Rate
- **Target**: > 95%
- **Tracked**: Success rate, outcome breakdown
- **Status**: `summary.kpiStatus.qaPassRate.met`

### Parallel Efficiency
- **Target**: > 90%
- **Tracked**: Worker utilization, parallel efficiency
- **Status**: `summary.kpiStatus.parallelEfficiency.met`

## API Reference

### MetricsCollector

#### OODA Loop Methods

```typescript
// Start tracking a cycle
startCycle(cycleId: string): void

// Record phase start
recordPhaseStart(phase: OODAPhase, cycleId?: string): string

// Record phase end
recordPhaseEnd(phaseId: string, success: boolean, errorMessage?: string): void

// Complete cycle
endCycle(cycleId: string, replanningTriggered?: boolean): void
```

#### Planning Methods

```typescript
// Record plan generation
recordPlanGeneration(
  planId: string,
  planningTime: number,
  planCost: number,
  actionsCount: number,
  optimalCost?: number,
  replanningCount?: number
): void
```

#### Task Execution Methods

```typescript
// Record task execution
recordTaskExecution(
  taskId: string,
  duration: number,
  outcome: TaskOutcome,
  retryCount?: number,
  workerUtilization?: number,
  parallelEfficiency?: number
): void
```

#### System Metrics Methods

```typescript
// Record system snapshot
recordSystemMetrics(
  workerUtilization: number,
  parallelEfficiency: number,
  memoryUsageMB: number,
  lockContentionMs: number,
  activeWorkers: number,
  queuedTasks: number
): void
```

#### Reporting Methods

```typescript
// Get metrics summary
getMetricsSummary(query?: MetricsQuery): MetricsSummary

// Generate formatted report
generateReport(timeframe?: 'hourly' | 'daily' | 'weekly'): string

// Export metrics
exportMetrics(format: 'json' | 'csv', query?: MetricsQuery): MetricsExport

// Compare to targets
compareToTargets(): Record<string, { target: number; actual: number; met: boolean; variance: number }>
```

### MetricsStorage

#### Store Operations

```typescript
// Store metrics
storeCycleMetric(metric: OODACycleMetric): Promise<void>
storePlanningMetric(metric: PlanningMetric): Promise<void>
storeTaskMetric(metric: TaskExecutionMetric): Promise<void>
storeSystemMetric(metric: SystemMetric): Promise<void>
```

#### Retrieve Operations

```typescript
// Retrieve metrics
retrieveCycleMetrics(query: MetricsQuery): Promise<OODACycleMetric[]>
retrievePlanningMetrics(query: MetricsQuery): Promise<PlanningMetric[]>
retrieveTaskMetrics(query: MetricsQuery): Promise<TaskExecutionMetric[]>
retrieveSystemMetrics(query: MetricsQuery): Promise<SystemMetric[]>
```

#### Aggregation Operations

```typescript
// Create aggregations
createHourlyAggregation(summary: MetricsSummary): Promise<void>
createDailyAggregation(summary: MetricsSummary): Promise<void>
createWeeklyAggregation(summary: MetricsSummary): Promise<void>

// Retrieve aggregations
retrieveAggregations(
  period: 'hourly' | 'daily' | 'weekly',
  startTime?: number,
  endTime?: number
): Promise<MetricsAggregation[]>
```

#### Maintenance Operations

```typescript
// Clean up expired metrics
cleanupExpiredMetrics(): Promise<number>

// Compress old metrics
compressOldMetrics(olderThanDays?: number): Promise<number>

// Backup metrics
backupMetrics(destinationPath: string): Promise<boolean>

// Get storage statistics
getStorageStats(): Promise<StorageStats>
```

## Integration Examples

### OODA Loop Integration

```typescript
import { getMetricsCollector, OODAPhase } from './metrics/index.js';

class OODALoop {
  private metrics = getMetricsCollector();

  async executeCycle(taskId: string): Promise<void> {
    const cycleId = `cycle-${taskId}-${Date.now()}`;
    this.metrics.startCycle(cycleId);

    // Observe phase
    const observeId = this.metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
    try {
      await this.observe();
      this.metrics.recordPhaseEnd(observeId, true);
    } catch (error) {
      this.metrics.recordPhaseEnd(observeId, false, error.message);
      throw error;
    }

    // Orient phase
    const orientId = this.metrics.recordPhaseStart(OODAPhase.ORIENT, cycleId);
    try {
      await this.orient();
      this.metrics.recordPhaseEnd(orientId, true);
    } catch (error) {
      this.metrics.recordPhaseEnd(orientId, false, error.message);
      throw error;
    }

    // Decide phase
    const decideId = this.metrics.recordPhaseStart(OODAPhase.DECIDE, cycleId);
    let needsReplanning = false;
    try {
      needsReplanning = await this.decide();
      this.metrics.recordPhaseEnd(decideId, true);
    } catch (error) {
      this.metrics.recordPhaseEnd(decideId, false, error.message);
      throw error;
    }

    // Act phase
    const actId = this.metrics.recordPhaseStart(OODAPhase.ACT, cycleId);
    try {
      await this.act();
      this.metrics.recordPhaseEnd(actId, true);
    } catch (error) {
      this.metrics.recordPhaseEnd(actId, false, error.message);
      throw error;
    }

    this.metrics.endCycle(cycleId, needsReplanning);
  }
}
```

### GOAP Planner Integration

```typescript
import { getMetricsCollector } from './metrics/index.js';

class GOAPPlanner {
  private metrics = getMetricsCollector();

  async generatePlan(goal: Goal, worldState: WorldState): Promise<Plan> {
    const planId = `plan-${Date.now()}`;
    const startTime = Date.now();

    const plan = await this.search(goal, worldState);

    const planningTime = Date.now() - startTime;
    const planCost = plan.actions.reduce((sum, a) => sum + a.cost, 0);
    const optimalCost = this.calculateOptimalCost(goal);

    this.metrics.recordPlanGeneration(
      planId,
      planningTime,
      planCost,
      plan.actions.length,
      optimalCost,
      plan.replanCount
    );

    return plan;
  }
}
```

### Task Executor Integration

```typescript
import { getMetricsCollector, TaskOutcome } from './metrics/index.js';

class TaskExecutor {
  private metrics = getMetricsCollector();

  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    let outcome = TaskOutcome.SUCCESS;
    let retryCount = 0;

    try {
      const result = await this.execute(task);

      if (!result.qaPass) {
        outcome = TaskOutcome.QA_FAILED;
      }

      return result;
    } catch (error) {
      outcome = TaskOutcome.FAILURE;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const workerUtilization = this.getWorkerUtilization();
      const parallelEfficiency = this.getParallelEfficiency();

      this.metrics.recordTaskExecution(
        task.id,
        duration,
        outcome,
        retryCount,
        workerUtilization,
        parallelEfficiency
      );
    }
  }
}
```

### System Monitor Integration

```typescript
import { getMetricsCollector } from './metrics/index.js';

class SystemMonitor {
  private metrics = getMetricsCollector();

  async collectSystemMetrics(): Promise<void> {
    const workerUtilization = await this.getWorkerUtilization();
    const parallelEfficiency = await this.getParallelEfficiency();
    const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
    const lockContentionMs = await this.getLockContentionTime();
    const activeWorkers = this.getActiveWorkerCount();
    const queuedTasks = this.getQueuedTaskCount();

    this.metrics.recordSystemMetrics(
      workerUtilization,
      parallelEfficiency,
      memoryUsageMB,
      lockContentionMs,
      activeWorkers,
      queuedTasks
    );
  }

  startPeriodicCollection(intervalMs: number = 60000): void {
    setInterval(() => this.collectSystemMetrics(), intervalMs);
  }
}
```

## Report Example

```
================================================================================
TASK SENTINEL PERFORMANCE METRICS REPORT (DAILY)
================================================================================

Timeframe: 2025-01-15T00:00:00.000Z to 2025-01-16T00:00:00.000Z
Duration: 1440.00 minutes

OODA LOOP METRICS:
--------------------------------------------------------------------------------
  Average Cycle Time: 4.23s (Target: <300s) ✓
  Total Cycles: 87
  Replanning Frequency: 12.50%
  Phase Durations (avg):
    observe: 0.85s (p95: 1.20s)
    orient: 1.10s (p95: 1.50s)
    decide: 1.45s (p95: 2.10s)
    act: 0.83s (p95: 1.10s)

GOAP PLANNING METRICS:
--------------------------------------------------------------------------------
  Average Planning Time: 24.5s (Target: <30s) ✓
  Average Plan Cost: 145.30
  Average Actions/Plan: 8.20
  Optimality Ratio: 1.15
  Replanning Rate: 0.85 replans/hour

TASK EXECUTION METRICS:
--------------------------------------------------------------------------------
  Throughput: 62.50 tasks/day (Target: >50) ✓
  Average Duration: 23.45s
  Success Rate: 94.20%
  QA Pass Rate: 96.30% (Target: >95%) ✓
  Duration Distribution:
    p50: 18.20s
    p95: 45.30s
    p99: 78.50s

SYSTEM PERFORMANCE METRICS:
--------------------------------------------------------------------------------
  Worker Utilization: 87.50%
  Parallel Efficiency: 92.30% (Target: >90%) ✓
  Memory Usage: 145.20 MB
  Lock Contention: 2.30 ms
  Peak Active Workers: 8

KPI STATUS SUMMARY:
--------------------------------------------------------------------------------
  oodaCycleTime: ✓ (4230.00 / 300000.00)
  planningTime: ✓ (24500.00 / 30000.00)
  taskThroughput: ✓ (62.50 / 50.00)
  qaPassRate: ✓ (0.96 / 0.95)
  parallelEfficiency: ✓ (0.92 / 0.90)

================================================================================
```

## Storage Schema

### Memory Namespaces

```
task-sentinel/metrics/
  ├── ooda/
  │   ├── cycle/{cycleId}          # OODACycleMetric
  │   └── phase/{phaseId}          # PhaseMetric
  ├── planning/{planId}            # PlanningMetric
  ├── task/{taskId}                # TaskExecutionMetric
  ├── system/{timestamp}           # SystemMetric
  ├── aggregation/
  │   ├── hourly/{timestamp}       # MetricsAggregation
  │   ├── daily/{timestamp}        # MetricsAggregation
  │   └── weekly/{timestamp}       # MetricsAggregation
  └── backup/{timestamp}           # BackupMetadata
```

### TTL Configuration

- **Raw Metrics**: 90 days
- **Hourly Aggregations**: 30 days
- **Daily Aggregations**: 1 year
- **Weekly Aggregations**: 2 years

## Best Practices

1. **Use Singleton**: Always use `getMetricsCollector()` for consistency
2. **Handle Errors**: Wrap metric recording in try-catch blocks
3. **Batch Operations**: Use aggregations for historical analysis
4. **Monitor Storage**: Regularly check `getStorageStats()`
5. **Cleanup Regularly**: Run `cleanupExpiredMetrics()` periodically
6. **Backup Important Data**: Use `backupMetrics()` for critical periods
7. **Set Realistic Targets**: Adjust KPI_TARGETS based on system capabilities

## Testing

```typescript
import { resetMetricsCollector, getMetricsCollector } from './metrics/index.js';

describe('MetricsCollector', () => {
  beforeEach(() => {
    resetMetricsCollector();
  });

  it('should track OODA cycle correctly', () => {
    const metrics = getMetricsCollector(false); // Disable memory for tests

    const cycleId = 'test-cycle';
    metrics.startCycle(cycleId);

    const phaseId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
    metrics.recordPhaseEnd(phaseId, true);

    metrics.endCycle(cycleId, false);

    const summary = metrics.getMetricsSummary();
    expect(summary.oodaMetrics.cycleCount).toBe(1);
  });
});
```

## Performance Considerations

- **In-Memory First**: Metrics collected in memory for fast access
- **Async Storage**: MCP storage operations are non-blocking
- **Batch Aggregation**: Hourly/daily/weekly rollups reduce query load
- **TTL Management**: Automatic cleanup prevents memory bloat
- **Compression**: Optional compression for old metrics
- **Query Optimization**: Use time-based filtering for efficiency

## Future Enhancements

- Real-time dashboards via WebSocket
- Machine learning for anomaly detection
- Predictive analytics for capacity planning
- Integration with external monitoring tools (Prometheus, Grafana)
- Custom alert thresholds per metric
- Historical trend analysis
- Comparative benchmarking across deployments
