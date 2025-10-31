# Metrics API Reference

**Performance Metrics and Monitoring Module**

Version: 2.0.0

---

## Table of Contents

- [Overview](#overview)
- [Core Classes](#core-classes)
- [Metric Types](#metric-types)
- [Collection Methods](#collection-methods)
- [Reporting](#reporting)
- [KPIs](#kpis)
- [Examples](#examples)

---

## Overview

The Metrics module provides comprehensive performance monitoring and analysis for Task Sentinel operations.

### Installation

```typescript
import {
  MetricsCollector,
  MetricsStore,
  MetricsReporter,
  PerformanceMetrics,
  KPI,
  MetricType
} from '@tasksentinel/metrics';
```

---

## Core Classes

### MetricsCollector

Main class for collecting metrics.

```typescript
class MetricsCollector {
  constructor(taskId: number, options?: CollectorOptions);

  async start(): Promise<void>;
  stop(): Promise<void>;

  async collect(): Promise<PerformanceMetrics>;
  async collectSnapshot(): Promise<MetricsSnapshot>;

  recordEvent(event: MetricEvent): void;
  recordDuration(name: string, duration: number): void;
  recordCounter(name: string, value: number): void;
  recordGauge(name: string, value: number): void;
}
```

**Example:**
```typescript
const collector = new MetricsCollector(42, {
  interval: 30000,  // Collect every 30s
  autoStart: true,
  includeAgentMetrics: true,
  includeResourceMetrics: true
});

await collector.start();

// Metrics are collected automatically
// Or manually trigger collection:
const metrics = await collector.collect();

console.log(`Total time: ${metrics.totalTime}ms`);
console.log(`Tokens used: ${metrics.tokensUsed}`);
console.log(`Cost: $${metrics.estimatedCost}`);

await collector.stop();
```

### CollectorOptions

Configuration for metrics collector.

```typescript
interface CollectorOptions {
  // Collection
  interval?: number;              // Default: 30000ms
  autoStart?: boolean;            // Default: false

  // Scope
  includeAgentMetrics?: boolean;  // Default: true
  includeResourceMetrics?: boolean; // Default: true
  includeOODAMetrics?: boolean;   // Default: true
  includeQualityMetrics?: boolean; // Default: true

  // Storage
  store?: MetricsStore;
  persistInterval?: number;       // Default: 60000ms

  // Callbacks
  onMetric?: (metric: Metric) => void;
  onSnapshot?: (snapshot: MetricsSnapshot) => void;
  onError?: (error: Error) => void;
}
```

### MetricsStore

Storage interface for metrics.

```typescript
interface MetricsStore {
  save(taskId: number, metrics: PerformanceMetrics): Promise<void>;
  load(taskId: number): Promise<PerformanceMetrics | null>;
  saveSnapshot(taskId: number, snapshot: MetricsSnapshot): Promise<void>;
  loadSnapshots(taskId: number): Promise<MetricsSnapshot[]>;

  query(query: MetricsQuery): Promise<PerformanceMetrics[]>;
  aggregate(query: AggregateQuery): Promise<AggregateResult>;

  delete(taskId: number): Promise<void>;
  clear(): Promise<void>;
}
```

**Example:**
```typescript
// In-memory store
const memoryStore = new MemoryMetricsStore();

// File-based store
const fileStore = new FileMetricsStore('/path/to/metrics');

// Database store
const dbStore = new DatabaseMetricsStore(connectionString);

const collector = new MetricsCollector(42, {
  store: fileStore,
  persistInterval: 60000
});
```

### MetricsReporter

Generates reports from metrics.

```typescript
class MetricsReporter {
  constructor(store: MetricsStore, options?: ReporterOptions);

  async generateReport(taskId: number): Promise<Report>;
  async generateSummary(taskIds: number[]): Promise<Summary>;
  async generateComparison(taskIds: number[]): Promise<Comparison>;

  async exportCSV(taskId: number, outputPath: string): Promise<void>;
  async exportJSON(taskId: number, outputPath: string): Promise<void>;
  async exportHTML(taskId: number, outputPath: string): Promise<void>;
}
```

**Example:**
```typescript
const reporter = new MetricsReporter(store, {
  format: 'detailed',
  includeCharts: true
});

// Generate report for single task
const report = await reporter.generateReport(42);
console.log(report.summary);

// Compare multiple tasks
const comparison = await reporter.generateComparison([42, 43, 44]);
console.log(`Average time: ${comparison.averageTime}ms`);

// Export to file
await reporter.exportHTML(42, 'reports/task-42.html');
```

---

## Metric Types

### PerformanceMetrics

Complete performance metrics for a task.

```typescript
interface PerformanceMetrics {
  // Task info
  taskId: number;
  startTime: Date;
  endTime?: Date;

  // Execution metrics
  totalTime: number;              // milliseconds
  planningTime: number;
  executionTime: number;
  waitTime: number;

  // Resource metrics
  tokensUsed: number;
  apiCalls: number;
  memoryOperations: number;
  fileOperations: number;
  gitOperations: number;

  // Cost metrics
  plannedCost: number;
  actualCost: number;
  costDeviation: number;          // -1 to 1
  estimatedCost: number;          // USD

  // Efficiency metrics
  parallelizationRatio: number;   // 0-1
  agentUtilization: number;       // 0-1
  throughput: number;             // actions/hour

  // Quality metrics
  testCoverage: number;           // 0-1
  codeQuality: number;            // 0-100
  securityScore: number;          // 0-100
  documentationCoverage: number;  // 0-1

  // OODA metrics
  observations: number;
  orientations: number;
  decisions: number;
  actions: number;
  replans: number;

  // Agent metrics
  agentCount: number;
  agentUtilizationByType: Record<string, number>;
  agentEfficiency: Record<string, number>;

  // Additional data
  metadata?: Record<string, any>;
}
```

**Example:**
```typescript
const metrics: PerformanceMetrics = {
  taskId: 42,
  startTime: new Date('2025-10-30T11:00:00Z'),
  endTime: new Date('2025-10-30T12:07:00Z'),

  totalTime: 4020000,     // 67 minutes
  planningTime: 150000,   // 2.5 minutes
  executionTime: 3855000, // 64.25 minutes
  waitTime: 15000,        // 15 seconds

  tokensUsed: 25150,
  apiCalls: 89,
  memoryOperations: 45,
  fileOperations: 67,
  gitOperations: 23,

  plannedCost: 20,
  actualCost: 18,
  costDeviation: -0.1,    // 10% under budget
  estimatedCost: 0.75,    // $0.75

  parallelizationRatio: 0.68,  // 68% parallelized
  agentUtilization: 0.85,      // 85% utilized
  throughput: 5.37,            // 5.37 actions/hour

  testCoverage: 0.965,
  codeQuality: 94,
  securityScore: 98,
  documentationCoverage: 1.0,

  observations: 23,
  orientations: 14,
  decisions: 19,
  actions: 67,
  replans: 1,

  agentCount: 6,
  agentUtilizationByType: {
    "researcher": 0.12,
    "architect": 0.27,
    "backend-dev": 0.33,
    "coder": 0.16,
    "tester": 0.09,
    "cicd-engineer": 0.03
  },
  agentEfficiency: {
    "researcher": 0.95,
    "architect": 0.92,
    "backend-dev": 0.88,
    "coder": 0.91,
    "tester": 0.93,
    "cicd-engineer": 0.97
  }
};
```

### MetricsSnapshot

Point-in-time metrics snapshot.

```typescript
interface MetricsSnapshot {
  timestamp: Date;
  taskId: number;

  progress: number;         // 0-1
  currentPhase: string;
  currentAction?: string;

  metrics: Partial<PerformanceMetrics>;

  health: "healthy" | "degraded" | "unhealthy";
  issues?: string[];
}
```

**Example:**
```typescript
const snapshot: MetricsSnapshot = {
  timestamp: new Date(),
  taskId: 42,

  progress: 0.45,
  currentPhase: "implementation",
  currentAction: "implement-authentication",

  metrics: {
    totalTime: 1800000,  // 30 minutes so far
    tokensUsed: 12000,
    actualCost: 9,
    agentCount: 6,
    testCoverage: 0.82
  },

  health: "healthy",
  issues: []
};
```

### Metric

Individual metric measurement.

```typescript
interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;

  unit?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

enum MetricType {
  COUNTER = "counter",
  GAUGE = "gauge",
  HISTOGRAM = "histogram",
  DURATION = "duration"
}
```

**Example:**
```typescript
// Counter metric
const tokenMetric: Metric = {
  name: "tokens.used",
  type: MetricType.COUNTER,
  value: 2340,
  timestamp: new Date(),
  unit: "tokens",
  tags: { agent: "researcher", task: "42" }
};

// Duration metric
const actionDuration: Metric = {
  name: "action.duration",
  type: MetricType.DURATION,
  value: 480000,  // 8 minutes
  timestamp: new Date(),
  unit: "ms",
  tags: { action: "research", agent: "researcher" }
};

// Gauge metric
const memoryUsage: Metric = {
  name: "memory.usage",
  type: MetricType.GAUGE,
  value: 512,
  timestamp: new Date(),
  unit: "MB",
  tags: { agent: "backend-dev" }
};
```

---

## Collection Methods

### Automatic Collection

```typescript
// Start automatic collection
const collector = new MetricsCollector(42, {
  interval: 30000,
  autoStart: true
});

// Metrics collected every 30 seconds
// Includes:
// - Token usage
// - API calls
// - Memory operations
// - Agent status
// - Resource usage
```

### Manual Collection

```typescript
const collector = new MetricsCollector(42);

// Collect on demand
const metrics = await collector.collect();

// Collect specific snapshot
const snapshot = await collector.collectSnapshot();
```

### Event-Based Collection

```typescript
const collector = new MetricsCollector(42);

// Record specific events
collector.recordEvent({
  type: "action.start",
  action: "implement-feature",
  agent: "backend-dev",
  timestamp: new Date()
});

collector.recordEvent({
  type: "action.complete",
  action: "implement-feature",
  agent: "backend-dev",
  timestamp: new Date(),
  duration: 1200000,
  success: true
});

// Record durations
collector.recordDuration("planning", 150000);
collector.recordDuration("execution", 3855000);

// Record counters
collector.recordCounter("tokens.used", 2340);
collector.recordCounter("api.calls", 15);

// Record gauges
collector.recordGauge("memory.mb", 512);
collector.recordGauge("cpu.percent", 45);
```

### Custom Metrics

```typescript
class CustomMetricsCollector extends MetricsCollector {
  async collectCustomMetrics(): Promise<CustomMetrics> {
    return {
      // Your custom metrics
      customMetric1: await this.getCustomValue1(),
      customMetric2: await this.getCustomValue2()
    };
  }

  async collect(): Promise<PerformanceMetrics> {
    const baseMetrics = await super.collect();
    const customMetrics = await this.collectCustomMetrics();

    return {
      ...baseMetrics,
      metadata: {
        ...baseMetrics.metadata,
        custom: customMetrics
      }
    };
  }
}
```

---

## Reporting

### Report

Comprehensive metrics report.

```typescript
interface Report {
  taskId: number;
  generatedAt: Date;

  summary: ReportSummary;
  sections: ReportSection[];

  charts?: Chart[];
  recommendations?: string[];
}

interface ReportSummary {
  status: "success" | "failure" | "partial";
  overallScore: number;  // 0-100

  highlights: string[];
  concerns: string[];

  keyMetrics: {
    totalTime: string;
    cost: string;
    quality: string;
    efficiency: string;
  };
}

interface ReportSection {
  title: string;
  content: string;
  metrics: Record<string, any>;
  charts?: Chart[];
}
```

**Example:**
```typescript
const report = await reporter.generateReport(42);

console.log('Task Report');
console.log('===========');
console.log(`Status: ${report.summary.status}`);
console.log(`Overall Score: ${report.summary.overallScore}/100`);
console.log();

console.log('Highlights:');
report.summary.highlights.forEach(h => console.log(`  ✓ ${h}`));
console.log();

if (report.summary.concerns.length > 0) {
  console.log('Concerns:');
  report.summary.concerns.forEach(c => console.log(`  ⚠ ${c}`));
}

console.log();
console.log('Key Metrics:');
Object.entries(report.summary.keyMetrics).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});
```

### Summary

Aggregated metrics summary.

```typescript
interface Summary {
  taskCount: number;
  timeRange: { start: Date; end: Date };

  averages: {
    totalTime: number;
    tokensUsed: number;
    cost: number;
    quality: number;
  };

  totals: {
    tasks: number;
    tokensUsed: number;
    cost: number;
    actions: number;
  };

  trends: {
    efficiency: "improving" | "stable" | "declining";
    quality: "improving" | "stable" | "declining";
    cost: "increasing" | "stable" | "decreasing";
  };
}
```

**Example:**
```typescript
const taskIds = [42, 43, 44, 45, 46];
const summary = await reporter.generateSummary(taskIds);

console.log(`Summary of ${summary.taskCount} tasks`);
console.log(`Period: ${summary.timeRange.start} to ${summary.timeRange.end}`);
console.log();

console.log('Averages:');
console.log(`  Time: ${summary.averages.totalTime}ms`);
console.log(`  Tokens: ${summary.averages.tokensUsed}`);
console.log(`  Cost: $${summary.averages.cost}`);
console.log(`  Quality: ${summary.averages.quality}/100`);
console.log();

console.log('Trends:');
console.log(`  Efficiency: ${summary.trends.efficiency}`);
console.log(`  Quality: ${summary.trends.quality}`);
console.log(`  Cost: ${summary.trends.cost}`);
```

### Comparison

Comparative analysis of multiple tasks.

```typescript
interface Comparison {
  taskIds: number[];

  fastest: { taskId: number; time: number };
  slowest: { taskId: number; time: number };

  mostEfficient: { taskId: number; efficiency: number };
  leastEfficient: { taskId: number; efficiency: number };

  bestQuality: { taskId: number; quality: number };
  worstQuality: { taskId: number; quality: number };

  averageTime: number;
  averageCost: number;
  averageQuality: number;

  insights: string[];
}
```

---

## KPIs

### KPI

Key Performance Indicator definition.

```typescript
interface KPI {
  name: string;
  description: string;

  value: number;
  target: number;
  threshold: number;

  unit: string;
  direction: "higher-better" | "lower-better";

  status: "excellent" | "good" | "acceptable" | "poor";
  trend: "improving" | "stable" | "declining";
}
```

### Predefined KPIs

```typescript
class KPIDefinitions {
  // Execution KPIs
  static TIME_TO_COMPLETION: KPI;
  static PLANNING_EFFICIENCY: KPI;
  static PARALLELIZATION_RATIO: KPI;
  static AGENT_UTILIZATION: KPI;

  // Quality KPIs
  static TEST_COVERAGE: KPI;
  static CODE_QUALITY: KPI;
  static SECURITY_SCORE: KPI;
  static DOCUMENTATION_COVERAGE: KPI;

  // OODA KPIs
  static OBSERVATION_RATE: KPI;
  static REPLAN_FREQUENCY: KPI;
  static REPLAN_BENEFIT: KPI;
  static DECISION_QUALITY: KPI;

  // Cost KPIs
  static COST_DEVIATION: KPI;
  static TOKEN_EFFICIENCY: KPI;
  static RESOURCE_UTILIZATION: KPI;
}
```

**Example:**
```typescript
const kpis = await reporter.calculateKPIs(42);

console.log('Key Performance Indicators:');
console.log('==========================');

for (const kpi of kpis) {
  const arrow = kpi.trend === "improving" ? "↑" :
                kpi.trend === "declining" ? "↓" : "→";
  const status = kpi.status === "excellent" ? "✓" :
                 kpi.status === "poor" ? "✗" : "○";

  console.log(`${status} ${kpi.name}: ${kpi.value}${kpi.unit} ${arrow}`);
  console.log(`  Target: ${kpi.target}${kpi.unit}`);
  console.log(`  Status: ${kpi.status}`);
  console.log();
}
```

---

## Examples

### Example 1: Basic Metrics Collection

```typescript
import { MetricsCollector } from '@tasksentinel/metrics';

const collector = new MetricsCollector(42, {
  interval: 30000,
  autoStart: true
});

// Let it collect during task execution
await taskExecution();

// Get final metrics
const metrics = await collector.collect();
await collector.stop();

console.log(`Task completed in ${metrics.totalTime}ms`);
console.log(`Tokens used: ${metrics.tokensUsed}`);
console.log(`Estimated cost: $${metrics.estimatedCost}`);
console.log(`Test coverage: ${(metrics.testCoverage * 100).toFixed(1)}%`);
console.log(`Code quality: ${metrics.codeQuality}/100`);
```

### Example 2: Real-time Monitoring

```typescript
import { MetricsCollector } from '@tasksentinel/metrics';

const collector = new MetricsCollector(42, {
  interval: 10000,  // Every 10 seconds
  onSnapshot: (snapshot) => {
    console.log(`\nProgress: ${(snapshot.progress * 100).toFixed(1)}%`);
    console.log(`Phase: ${snapshot.currentPhase}`);
    console.log(`Action: ${snapshot.currentAction || 'N/A'}`);
    console.log(`Tokens: ${snapshot.metrics.tokensUsed}`);
    console.log(`Health: ${snapshot.health}`);

    if (snapshot.issues && snapshot.issues.length > 0) {
      console.log('Issues:');
      snapshot.issues.forEach(issue => console.log(`  ⚠ ${issue}`));
    }
  }
});

await collector.start();
```

### Example 3: Generate Comprehensive Report

```typescript
import { MetricsReporter, FileMetricsStore } from '@tasksentinel/metrics';

const store = new FileMetricsStore('./metrics');
const reporter = new MetricsReporter(store, {
  format: 'detailed',
  includeCharts: true,
  includeRecommendations: true
});

// Generate report
const report = await reporter.generateReport(42);

// Print summary
console.log(report.summary.overallScore);

// Export to file
await reporter.exportHTML(42, 'reports/task-42.html');
await reporter.exportJSON(42, 'reports/task-42.json');
await reporter.exportCSV(42, 'reports/task-42.csv');
```

### Example 4: Compare Multiple Tasks

```typescript
import { MetricsReporter } from '@tasksentinel/metrics';

const reporter = new MetricsReporter(store);

// Compare tasks
const comparison = await reporter.generateComparison([42, 43, 44, 45]);

console.log('Task Comparison:');
console.log(`Fastest: Task #${comparison.fastest.taskId} (${comparison.fastest.time}ms)`);
console.log(`Slowest: Task #${comparison.slowest.taskId} (${comparison.slowest.time}ms)`);
console.log(`Most Efficient: Task #${comparison.mostEfficient.taskId}`);
console.log(`Best Quality: Task #${comparison.bestQuality.taskId}`);
console.log();

console.log('Averages:');
console.log(`  Time: ${comparison.averageTime}ms`);
console.log(`  Cost: $${comparison.averageCost}`);
console.log(`  Quality: ${comparison.averageQuality}/100`);
console.log();

console.log('Insights:');
comparison.insights.forEach(insight => console.log(`  • ${insight}`));
```

### Example 5: Custom Metrics Dashboard

```typescript
import { MetricsCollector, MetricsStore } from '@tasksentinel/metrics';

class MetricsDashboard {
  private collectors: Map<number, MetricsCollector> = new Map();
  private store: MetricsStore;

  constructor(store: MetricsStore) {
    this.store = store;
  }

  startMonitoring(taskId: number): void {
    const collector = new MetricsCollector(taskId, {
      interval: 5000,
      store: this.store,
      onSnapshot: (snapshot) => this.updateUI(snapshot)
    });

    collector.start();
    this.collectors.set(taskId, collector);
  }

  stopMonitoring(taskId: number): void {
    const collector = this.collectors.get(taskId);
    if (collector) {
      collector.stop();
      this.collectors.delete(taskId);
    }
  }

  private updateUI(snapshot: MetricsSnapshot): void {
    // Update dashboard UI with latest snapshot
    console.log(`Task #${snapshot.taskId}: ${(snapshot.progress * 100).toFixed(1)}%`);
  }

  async getAggregateMetrics(): Promise<AggregateMetrics> {
    const taskIds = Array.from(this.collectors.keys());
    const snapshots = await Promise.all(
      taskIds.map(id => this.collectors.get(id)!.collectSnapshot())
    );

    return {
      activeTasks: snapshots.length,
      totalTokens: snapshots.reduce((sum, s) => sum + (s.metrics.tokensUsed || 0), 0),
      averageProgress: snapshots.reduce((sum, s) => sum + s.progress, 0) / snapshots.length
    };
  }
}
```

---

## API Summary

### Main Classes
- `MetricsCollector` - Collect metrics
- `MetricsStore` - Store metrics
- `MetricsReporter` - Generate reports

### Key Interfaces
- `PerformanceMetrics` - Complete metrics
- `MetricsSnapshot` - Point-in-time metrics
- `Metric` - Individual measurement
- `Report` - Comprehensive report
- `Summary` - Aggregated summary
- `KPI` - Key performance indicator

### Metric Types
- `COUNTER` - Cumulative count
- `GAUGE` - Current value
- `HISTOGRAM` - Distribution
- `DURATION` - Time measurement

---

**Version:** 2.0.0
**Last Updated:** 2025-10-30
**Module:** @tasksentinel/metrics
