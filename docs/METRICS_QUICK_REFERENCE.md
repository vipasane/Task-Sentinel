# Task Sentinel Metrics - Quick Reference Card

## 🚀 Quick Start

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

const metrics = getMetricsCollector();
```

## 📊 Common Operations

### Track OODA Cycle
```typescript
const cycleId = 'cycle-123';
metrics.startCycle(cycleId);

const phaseId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
// ... work ...
metrics.recordPhaseEnd(phaseId, true);

metrics.endCycle(cycleId, false);
```

### Record Planning
```typescript
metrics.recordPlanGeneration(
  'plan-1',    // planId
  20000,       // time (ms)
  100,         // cost
  5,           // actions
  90,          // optimal cost (optional)
  0            // replan count (optional)
);
```

### Record Task Execution
```typescript
metrics.recordTaskExecution(
  'task-1',              // taskId
  3000,                  // duration (ms)
  TaskOutcome.SUCCESS,   // outcome
  0,                     // retries
  0.85,                  // worker utilization
  0.92                   // parallel efficiency
);
```

### Record System Metrics
```typescript
metrics.recordSystemMetrics(
  0.87,  // worker utilization
  0.93,  // parallel efficiency
  256,   // memory MB
  3,     // lock contention ms
  8,     // active workers
  10     // queued tasks
);
```

### Get Summary
```typescript
const summary = metrics.getMetricsSummary();
console.log(summary.oodaMetrics.avgCycleTime);
console.log(summary.kpiStatus.oodaCycleTime.met);
```

### Generate Report
```typescript
const report = metrics.generateReport('daily');
console.log(report);
```

### Export Metrics
```typescript
const json = metrics.exportMetrics('json');
const csv = metrics.exportMetrics('csv');
```

### Check KPIs
```typescript
const comparison = metrics.compareToTargets();
Object.entries(comparison).forEach(([kpi, status]) => {
  console.log(`${kpi}: ${status.met ? '✓' : '✗'}`);
});
```

## 🎯 KPI Targets

| KPI | Target | Check |
|-----|--------|-------|
| OODA Cycle | < 5 min | `summary.kpiStatus.oodaCycleTime.met` |
| Planning | < 30 sec | `summary.kpiStatus.planningTime.met` |
| Throughput | > 50/day | `summary.kpiStatus.taskThroughput.met` |
| QA Pass | > 95% | `summary.kpiStatus.qaPassRate.met` |
| Efficiency | > 90% | `summary.kpiStatus.parallelEfficiency.met` |

## 📦 Data Types

### OODAPhase
```typescript
enum OODAPhase {
  OBSERVE = 'observe',
  ORIENT = 'orient',
  DECIDE = 'decide',
  ACT = 'act'
}
```

### TaskOutcome
```typescript
enum TaskOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  QA_FAILED = 'qa_failed'
}
```

## 🔍 Query Examples

### Time Range
```typescript
const summary = metrics.getMetricsSummary({
  startTime: Date.now() - (24 * 60 * 60 * 1000),
  endTime: Date.now()
});
```

### Category Filter
```typescript
const cycles = metrics.getCycleMetrics({ category: 'ooda' });
const plans = metrics.getPlanningMetrics({ category: 'planning' });
```

## 💾 Storage Operations

```typescript
import { createMetricsStorage } from './src/metrics/index.js';

const storage = createMetricsStorage();

// Store aggregations
await storage.createHourlyAggregation(summary);
await storage.createDailyAggregation(summary);

// Retrieve
const dailyAggs = await storage.retrieveAggregations('daily', startTime, endTime);

// Maintenance
await storage.cleanupExpiredMetrics();
await storage.backupMetrics('/path/to/backup');
```

## 🔧 Common Patterns

### Wrap Phase Execution
```typescript
async function executePhase<T>(
  phase: OODAPhase,
  cycleId: string,
  handler: () => Promise<T>
): Promise<T> {
  const phaseId = metrics.recordPhaseStart(phase, cycleId);
  try {
    const result = await handler();
    metrics.recordPhaseEnd(phaseId, true);
    return result;
  } catch (error) {
    metrics.recordPhaseEnd(phaseId, false, error.message);
    throw error;
  }
}
```

### Track Task with Timing
```typescript
async function executeTaskWithMetrics(task: Task): Promise<Result> {
  const startTime = Date.now();
  let outcome = TaskOutcome.SUCCESS;

  try {
    const result = await executeTask(task);
    if (!result.qaPass) outcome = TaskOutcome.QA_FAILED;
    return result;
  } catch (error) {
    outcome = TaskOutcome.FAILURE;
    throw error;
  } finally {
    metrics.recordTaskExecution(
      task.id,
      Date.now() - startTime,
      outcome,
      0,
      getWorkerUtilization(),
      getParallelEfficiency()
    );
  }
}
```

### Periodic System Monitoring
```typescript
setInterval(() => {
  metrics.recordSystemMetrics(
    getWorkerUtilization(),
    getParallelEfficiency(),
    getMemoryUsageMB(),
    getLockContentionMs(),
    getActiveWorkers(),
    getQueuedTasks()
  );
}, 60000); // Every minute
```

## 🚨 Alert Checking

```typescript
function checkKPIs(): void {
  const comparison = metrics.compareToTargets();

  Object.entries(comparison).forEach(([kpi, status]) => {
    if (!status.met) {
      console.warn(`⚠️  KPI Alert: ${kpi}`);
      console.warn(`   Target: ${status.target}`);
      console.warn(`   Actual: ${status.actual}`);
      console.warn(`   Variance: ${status.variance.toFixed(1)}%`);
    }
  });
}
```

## 📈 Report Formats

### Console Report
```typescript
const report = metrics.generateReport('daily');
console.log(report); // Formatted text
```

### JSON Export
```typescript
const json = metrics.exportMetrics('json');
// Use json.data for MetricsSummary object
```

### CSV Export
```typescript
const csv = metrics.exportMetrics('csv');
// csv.data is CSV string
```

## 🧪 Testing

```typescript
import { resetMetricsCollector } from './src/metrics/index.js';

beforeEach(() => {
  resetMetricsCollector(); // Fresh instance
});

const metrics = getMetricsCollector(false); // Disable memory for tests
```

## 🔗 Files

- **Implementation**: `/src/metrics/`
- **Tests**: `/tests/metrics/`
- **Docs**: `/src/metrics/README.md`
- **Examples**: `/docs/metrics-usage-examples.md`
- **Summary**: `/docs/METRICS_SYSTEM_SUMMARY.md`

## 📞 Support

For detailed documentation:
- API Reference: `/src/metrics/README.md`
- Usage Examples: `/docs/metrics-usage-examples.md`
- Integration Guide: `/docs/METRICS_SYSTEM_SUMMARY.md`

---

**Remember**: Always use the singleton `getMetricsCollector()` for consistency across your application!
