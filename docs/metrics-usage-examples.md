# Task Sentinel Phase 2 - Metrics Usage Examples

Complete examples demonstrating metrics system integration with Task Sentinel components.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [OODA Loop Integration](#ooda-loop-integration)
3. [GOAP Planner Integration](#goap-planner-integration)
4. [Task Executor Integration](#task-executor-integration)
5. [System Monitor Integration](#system-monitor-integration)
6. [Dashboard Integration](#dashboard-integration)
7. [Alerting System](#alerting-system)
8. [Advanced Patterns](#advanced-patterns)

---

## Basic Setup

### Initialize Metrics Collector

```typescript
import { getMetricsCollector, createMetricsStorage } from './src/metrics/index.js';

// Get singleton collector (with MCP memory enabled)
const metrics = getMetricsCollector(true);

// Create storage instance for persistence
const storage = createMetricsStorage({
  namespace: 'task-sentinel/metrics',
  ttlDays: 90,
  compressionEnabled: true
});

console.log('Metrics system initialized');
```

### Quick Health Check

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

const metrics = getMetricsCollector();
const summary = metrics.getMetricsSummary();

console.log('=== System Health ===');
console.log(`OODA Cycle Time: ${summary.kpiStatus.oodaCycleTime.met ? '✓' : '✗'}`);
console.log(`Planning Time: ${summary.kpiStatus.planningTime.met ? '✓' : '✗'}`);
console.log(`Task Throughput: ${summary.kpiStatus.taskThroughput.met ? '✓' : '✗'}`);
console.log(`QA Pass Rate: ${summary.kpiStatus.qaPassRate.met ? '✓' : '✗'}`);
console.log(`Parallel Efficiency: ${summary.kpiStatus.parallelEfficiency.met ? '✓' : '✗'}`);
```

---

## OODA Loop Integration

### Complete OODA Loop with Metrics

```typescript
import { getMetricsCollector, OODAPhase } from './src/metrics/index.js';

class OODALoop {
  private metrics = getMetricsCollector();

  async executeCycle(taskId: string): Promise<void> {
    const cycleId = `cycle-${taskId}-${Date.now()}`;
    console.log(`Starting OODA cycle: ${cycleId}`);

    // Start cycle tracking
    this.metrics.startCycle(cycleId);

    try {
      // Observe Phase
      await this.executePhase(OODAPhase.OBSERVE, cycleId, async () => {
        console.log('  [Observe] Gathering environmental data...');
        const observations = await this.observe();
        return observations;
      });

      // Orient Phase
      await this.executePhase(OODAPhase.ORIENT, cycleId, async () => {
        console.log('  [Orient] Analyzing context and situation...');
        const analysis = await this.orient();
        return analysis;
      });

      // Decide Phase
      const needsReplanning = await this.executePhase(
        OODAPhase.DECIDE,
        cycleId,
        async () => {
          console.log('  [Decide] Generating action plan...');
          const decision = await this.decide();
          return decision.needsReplanning;
        }
      );

      // Act Phase
      await this.executePhase(OODAPhase.ACT, cycleId, async () => {
        console.log('  [Act] Executing planned actions...');
        await this.act();
      });

      // Complete cycle
      this.metrics.endCycle(cycleId, needsReplanning);
      console.log(`Completed OODA cycle: ${cycleId}`);

    } catch (error) {
      console.error(`OODA cycle failed: ${error.message}`);
      throw error;
    }
  }

  private async executePhase<T>(
    phase: OODAPhase,
    cycleId: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const phaseId = this.metrics.recordPhaseStart(phase, cycleId);

    try {
      const result = await handler();
      this.metrics.recordPhaseEnd(phaseId, true);
      return result;
    } catch (error) {
      this.metrics.recordPhaseEnd(phaseId, false, error.message);
      throw error;
    }
  }

  private async observe(): Promise<any> {
    // Implementation details
    await new Promise(resolve => setTimeout(resolve, 100));
    return { events: [], state: {} };
  }

  private async orient(): Promise<any> {
    // Implementation details
    await new Promise(resolve => setTimeout(resolve, 150));
    return { analysis: {}, recommendations: [] };
  }

  private async decide(): Promise<{ needsReplanning: boolean }> {
    // Implementation details
    await new Promise(resolve => setTimeout(resolve, 200));
    return { needsReplanning: false };
  }

  private async act(): Promise<void> {
    // Implementation details
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Usage
const loop = new OODALoop();
await loop.executeCycle('task-123');
```

### Monitor OODA Performance

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

function monitorOODAPerformance(): void {
  const metrics = getMetricsCollector();
  const summary = metrics.getMetricsSummary();

  console.log('\n=== OODA Loop Performance ===');
  console.log(`Total Cycles: ${summary.oodaMetrics.cycleCount}`);
  console.log(`Avg Cycle Time: ${(summary.oodaMetrics.avgCycleTime / 1000).toFixed(2)}s`);
  console.log(`Target Met: ${summary.oodaMetrics.targetMet ? 'YES' : 'NO'}`);
  console.log(`Replanning Rate: ${(summary.oodaMetrics.replanningFrequency * 100).toFixed(1)}%`);

  console.log('\nPhase Performance:');
  Object.entries(summary.oodaMetrics.phaseDurations).forEach(([phase, stats]) => {
    console.log(`  ${phase}:`);
    console.log(`    Average: ${(stats.avg / 1000).toFixed(2)}s`);
    console.log(`    P95: ${(stats.p95 / 1000).toFixed(2)}s`);
  });

  console.log('\nPhase Success Rates:');
  Object.entries(summary.oodaMetrics.successRateByPhase).forEach(([phase, rate]) => {
    console.log(`  ${phase}: ${(rate * 100).toFixed(1)}%`);
  });
}

// Run monitoring
monitorOODAPerformance();
```

---

## GOAP Planner Integration

### Track Planning Performance

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

class GOAPPlanner {
  private metrics = getMetricsCollector();

  async generatePlan(goal: Goal, worldState: WorldState): Promise<Plan> {
    const planId = `plan-${Date.now()}`;
    const startTime = Date.now();

    console.log(`Generating plan: ${planId}`);

    try {
      // Execute A* search
      const plan = await this.search(goal, worldState);

      // Calculate metrics
      const planningTime = Date.now() - startTime;
      const planCost = plan.actions.reduce((sum, a) => sum + a.cost, 0);
      const actionsCount = plan.actions.length;
      const optimalCost = this.calculateOptimalCost(goal);

      // Record metrics
      this.metrics.recordPlanGeneration(
        planId,
        planningTime,
        planCost,
        actionsCount,
        optimalCost,
        plan.replanCount
      );

      console.log(`  Planning Time: ${planningTime}ms`);
      console.log(`  Plan Cost: ${planCost}`);
      console.log(`  Actions: ${actionsCount}`);
      console.log(`  Optimality: ${((optimalCost / planCost) * 100).toFixed(1)}%`);

      return plan;
    } catch (error) {
      console.error(`Planning failed: ${error.message}`);
      throw error;
    }
  }

  private async search(goal: Goal, worldState: WorldState): Promise<Plan> {
    // A* search implementation
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      actions: [
        { name: 'action1', cost: 10 },
        { name: 'action2', cost: 15 },
        { name: 'action3', cost: 20 }
      ],
      replanCount: 0
    };
  }

  private calculateOptimalCost(goal: Goal): number {
    // Calculate theoretical optimal cost
    return 40; // Example
  }
}

// Usage with replanning
class AdaptivePlanner extends GOAPPlanner {
  async generatePlanWithReplanning(
    goal: Goal,
    worldState: WorldState,
    maxRetries: number = 3
  ): Promise<Plan> {
    let replanCount = 0;

    while (replanCount < maxRetries) {
      try {
        const plan = await this.generatePlan(goal, worldState);

        // Validate plan
        if (this.isValidPlan(plan, worldState)) {
          return plan;
        }

        console.log(`Plan invalid, replanning... (attempt ${replanCount + 1})`);
        replanCount++;
        worldState = this.updateWorldState(worldState);

      } catch (error) {
        console.error(`Planning attempt ${replanCount + 1} failed`);
        replanCount++;
      }
    }

    throw new Error('Maximum replanning attempts exceeded');
  }

  private isValidPlan(plan: Plan, worldState: WorldState): boolean {
    // Validation logic
    return true;
  }

  private updateWorldState(worldState: WorldState): WorldState {
    // Update logic
    return worldState;
  }
}
```

---

## Task Executor Integration

### Track Task Execution

```typescript
import { getMetricsCollector, TaskOutcome } from './src/metrics/index.js';

class TaskExecutor {
  private metrics = getMetricsCollector();
  private workerPool: WorkerPool;

  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    let outcome = TaskOutcome.SUCCESS;
    let retryCount = 0;

    console.log(`Executing task: ${task.id}`);

    try {
      // Execute task with retries
      const result = await this.executeWithRetry(task, 3);

      // Quality assurance check
      if (!await this.qaCheck(result)) {
        outcome = TaskOutcome.QA_FAILED;
        console.warn(`Task ${task.id} failed QA check`);
      }

      return result;

    } catch (error) {
      if (error.name === 'TimeoutError') {
        outcome = TaskOutcome.TIMEOUT;
      } else if (error.name === 'CancelledError') {
        outcome = TaskOutcome.CANCELLED;
      } else {
        outcome = TaskOutcome.FAILURE;
      }

      console.error(`Task ${task.id} failed: ${error.message}`);
      throw error;

    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      const workerUtilization = this.workerPool.getUtilization();
      const parallelEfficiency = this.workerPool.getEfficiency();

      this.metrics.recordTaskExecution(
        task.id,
        duration,
        outcome,
        retryCount,
        workerUtilization,
        parallelEfficiency
      );

      console.log(`  Duration: ${duration}ms`);
      console.log(`  Outcome: ${outcome}`);
      console.log(`  Worker Utilization: ${(workerUtilization * 100).toFixed(1)}%`);
    }
  }

  private async executeWithRetry(
    task: Task,
    maxRetries: number
  ): Promise<TaskResult> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(task);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`  Retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError!;
  }

  private async execute(task: Task): Promise<TaskResult> {
    // Actual task execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    return { success: true, data: {} };
  }

  private async qaCheck(result: TaskResult): Promise<boolean> {
    // Quality assurance validation
    return Math.random() > 0.05; // 95% pass rate
  }
}

// Parallel task execution
class ParallelTaskExecutor extends TaskExecutor {
  async executeBatch(tasks: Task[]): Promise<TaskResult[]> {
    console.log(`Executing batch of ${tasks.length} tasks...`);

    const results = await Promise.all(
      tasks.map(task => this.executeTask(task).catch(error => ({
        taskId: task.id,
        error: error.message
      })))
    );

    // Report batch metrics
    const summary = this.metrics.getMetricsSummary();
    console.log(`\nBatch Summary:`);
    console.log(`  Success Rate: ${(summary.taskMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`  QA Pass Rate: ${(summary.taskMetrics.qaPassRate * 100).toFixed(1)}%`);

    return results;
  }
}
```

---

## System Monitor Integration

### Continuous System Monitoring

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

class SystemMonitor {
  private metrics = getMetricsCollector();
  private monitoringInterval: NodeJS.Timeout | null = null;

  startMonitoring(intervalMs: number = 60000): void {
    console.log(`Starting system monitoring (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('System monitoring stopped');
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const workerUtilization = await this.getWorkerUtilization();
      const parallelEfficiency = await this.getParallelEfficiency();
      const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
      const lockContentionMs = await this.getLockContentionTime();
      const activeWorkers = this.getActiveWorkerCount();
      const queuedTasks = this.getQueuedTaskCount();

      // Record metrics
      this.metrics.recordSystemMetrics(
        workerUtilization,
        parallelEfficiency,
        memoryUsageMB,
        lockContentionMs,
        activeWorkers,
        queuedTasks
      );

      // Log current status
      console.log(`[${new Date().toISOString()}] System Snapshot:`);
      console.log(`  Workers: ${activeWorkers} active, ${queuedTasks} queued`);
      console.log(`  Utilization: ${(workerUtilization * 100).toFixed(1)}%`);
      console.log(`  Efficiency: ${(parallelEfficiency * 100).toFixed(1)}%`);
      console.log(`  Memory: ${memoryUsageMB.toFixed(2)} MB`);

      // Check for alerts
      this.checkAlerts(workerUtilization, parallelEfficiency, memoryUsageMB);

    } catch (error) {
      console.error(`Metrics collection failed: ${error.message}`);
    }
  }

  private async getWorkerUtilization(): Promise<number> {
    // Calculate worker utilization
    return Math.random() * 0.3 + 0.7; // 70-100%
  }

  private async getParallelEfficiency(): Promise<number> {
    // Calculate parallel efficiency
    return Math.random() * 0.2 + 0.8; // 80-100%
  }

  private async getLockContentionTime(): Promise<number> {
    // Measure lock contention
    return Math.random() * 10; // 0-10ms
  }

  private getActiveWorkerCount(): number {
    // Get active worker count
    return Math.floor(Math.random() * 4 + 6); // 6-10 workers
  }

  private getQueuedTaskCount(): number {
    // Get queued task count
    return Math.floor(Math.random() * 20); // 0-20 tasks
  }

  private checkAlerts(
    workerUtilization: number,
    parallelEfficiency: number,
    memoryUsageMB: number
  ): void {
    if (workerUtilization < 0.5) {
      console.warn(`⚠️  Low worker utilization: ${(workerUtilization * 100).toFixed(1)}%`);
    }

    if (parallelEfficiency < 0.9) {
      console.warn(`⚠️  Parallel efficiency below target: ${(parallelEfficiency * 100).toFixed(1)}%`);
    }

    if (memoryUsageMB > 512) {
      console.warn(`⚠️  High memory usage: ${memoryUsageMB.toFixed(2)} MB`);
    }
  }

  async generateHealthReport(): Promise<string> {
    const summary = this.metrics.getMetricsSummary();
    return this.metrics.generateReport('hourly');
  }
}

// Usage
const monitor = new SystemMonitor();
monitor.startMonitoring(60000); // Every minute

// Stop after 1 hour
setTimeout(() => {
  monitor.stopMonitoring();
  console.log('\n' + await monitor.generateHealthReport());
}, 60 * 60 * 1000);
```

---

## Dashboard Integration

### Real-Time Metrics Dashboard

```typescript
import { getMetricsCollector } from './src/metrics/index.js';
import express from 'express';

class MetricsDashboard {
  private app = express();
  private metrics = getMetricsCollector();

  constructor(private port: number = 3000) {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      const summary = this.metrics.getMetricsSummary();
      res.json({
        status: 'healthy',
        kpis: {
          oodaCycleTime: summary.kpiStatus.oodaCycleTime.met,
          planningTime: summary.kpiStatus.planningTime.met,
          taskThroughput: summary.kpiStatus.taskThroughput.met,
          qaPassRate: summary.kpiStatus.qaPassRate.met,
          parallelEfficiency: summary.kpiStatus.parallelEfficiency.met
        }
      });
    });

    // Summary endpoint
    this.app.get('/api/metrics/summary', (req, res) => {
      const timeframe = req.query.timeframe as string || 'daily';
      const summary = this.metrics.getMetricsSummary();
      res.json(summary);
    });

    // Report endpoint
    this.app.get('/api/metrics/report', (req, res) => {
      const timeframe = (req.query.timeframe as any) || 'daily';
      const report = this.metrics.generateReport(timeframe);
      res.type('text/plain').send(report);
    });

    // Export endpoint
    this.app.get('/api/metrics/export', (req, res) => {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const exported = this.metrics.exportMetrics(format);

      if (format === 'csv') {
        res.type('text/csv').send(exported.data);
      } else {
        res.json(exported.data);
      }
    });

    // KPI comparison endpoint
    this.app.get('/api/metrics/kpi', (req, res) => {
      const comparison = this.metrics.compareToTargets();
      res.json(comparison);
    });

    // Live metrics endpoint (SSE)
    this.app.get('/api/metrics/live', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const interval = setInterval(() => {
        const summary = this.metrics.getMetricsSummary();
        res.write(`data: ${JSON.stringify(summary)}\n\n`);
      }, 5000);

      req.on('close', () => {
        clearInterval(interval);
      });
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Metrics dashboard running on http://localhost:${this.port}`);
      console.log(`  Health: http://localhost:${this.port}/api/health`);
      console.log(`  Summary: http://localhost:${this.port}/api/metrics/summary`);
      console.log(`  Report: http://localhost:${this.port}/api/metrics/report`);
      console.log(`  Export: http://localhost:${this.port}/api/metrics/export?format=csv`);
    });
  }
}

// Start dashboard
const dashboard = new MetricsDashboard(3000);
dashboard.start();
```

---

## Alerting System

### Automated Performance Alerts

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

interface Alert {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  timestamp: number;
  metrics: any;
}

class AlertingSystem {
  private metrics = getMetricsCollector();
  private alerts: Alert[] = [];

  checkAlerts(): Alert[] {
    const newAlerts: Alert[] = [];
    const summary = this.metrics.getMetricsSummary();
    const comparison = this.metrics.compareToTargets();

    // OODA cycle time alerts
    if (!summary.kpiStatus.oodaCycleTime.met) {
      newAlerts.push({
        severity: comparison.oodaCycleTime.variance > 50 ? 'critical' : 'warning',
        category: 'OODA_CYCLE_TIME',
        message: `OODA cycle time exceeds target by ${comparison.oodaCycleTime.variance.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: {
          target: comparison.oodaCycleTime.target,
          actual: comparison.oodaCycleTime.actual,
          variance: comparison.oodaCycleTime.variance
        }
      });
    }

    // Planning time alerts
    if (!summary.kpiStatus.planningTime.met) {
      newAlerts.push({
        severity: comparison.planningTime.variance > 100 ? 'critical' : 'warning',
        category: 'PLANNING_TIME',
        message: `Planning time exceeds target by ${comparison.planningTime.variance.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: {
          target: comparison.planningTime.target,
          actual: comparison.planningTime.actual,
          variance: comparison.planningTime.variance
        }
      });
    }

    // Task throughput alerts
    if (!summary.kpiStatus.taskThroughput.met) {
      newAlerts.push({
        severity: comparison.taskThroughput.variance < -50 ? 'critical' : 'warning',
        category: 'TASK_THROUGHPUT',
        message: `Task throughput below target by ${Math.abs(comparison.taskThroughput.variance).toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: {
          target: comparison.taskThroughput.target,
          actual: comparison.taskThroughput.actual,
          variance: comparison.taskThroughput.variance
        }
      });
    }

    // QA pass rate alerts
    if (!summary.kpiStatus.qaPassRate.met) {
      newAlerts.push({
        severity: 'critical',
        category: 'QA_PASS_RATE',
        message: `QA pass rate below target: ${(summary.taskMetrics.qaPassRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: {
          target: comparison.qaPassRate.target,
          actual: comparison.qaPassRate.actual,
          variance: comparison.qaPassRate.variance
        }
      });
    }

    // Parallel efficiency alerts
    if (!summary.kpiStatus.parallelEfficiency.met) {
      newAlerts.push({
        severity: comparison.parallelEfficiency.variance < -20 ? 'critical' : 'warning',
        category: 'PARALLEL_EFFICIENCY',
        message: `Parallel efficiency below target by ${Math.abs(comparison.parallelEfficiency.variance).toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: {
          target: comparison.parallelEfficiency.target,
          actual: comparison.parallelEfficiency.actual,
          variance: comparison.parallelEfficiency.variance
        }
      });
    }

    // Add to history
    this.alerts.push(...newAlerts);

    return newAlerts;
  }

  async sendAlerts(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    // Log to console
    const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.category}`);
    console.log(`   ${alert.message}`);
    console.log(`   Time: ${new Date(alert.timestamp).toISOString()}`);

    // In production: send to monitoring systems, Slack, email, etc.
    // await this.sendToSlack(alert);
    // await this.sendToEmail(alert);
    // await this.sendToMonitoring(alert);
  }

  getRecentAlerts(count: number = 10): Alert[] {
    return this.alerts.slice(-count);
  }

  getCriticalAlerts(): Alert[] {
    return this.alerts.filter(a => a.severity === 'critical');
  }
}

// Usage
const alerting = new AlertingSystem();

// Check alerts every 5 minutes
setInterval(() => {
  const alerts = alerting.checkAlerts();

  if (alerts.length > 0) {
    console.log(`\n🔔 ${alerts.length} new alert(s) detected`);
    alerting.sendAlerts(alerts);
  }
}, 5 * 60 * 1000);
```

---

## Advanced Patterns

### Metrics Aggregation and Historical Analysis

```typescript
import { createMetricsStorage } from './src/metrics/index.js';

class MetricsAnalyzer {
  private storage = createMetricsStorage();

  async analyzePerformanceTrends(days: number = 7): Promise<any> {
    const now = Date.now();
    const startTime = now - (days * 24 * 60 * 60 * 1000);

    // Get daily aggregations
    const dailyAggs = await this.storage.retrieveAggregations(
      'daily',
      startTime,
      now
    );

    // Analyze trends
    const trends = {
      oodaCycleTime: this.analyzeTrend(
        dailyAggs.map(a => a.summary.oodaMetrics.avgCycleTime)
      ),
      planningTime: this.analyzeTrend(
        dailyAggs.map(a => a.summary.planningMetrics.avgPlanningTime)
      ),
      taskThroughput: this.analyzeTrend(
        dailyAggs.map(a => a.summary.taskMetrics.throughput)
      ),
      qaPassRate: this.analyzeTrend(
        dailyAggs.map(a => a.summary.taskMetrics.qaPassRate)
      ),
      parallelEfficiency: this.analyzeTrend(
        dailyAggs.map(a => a.summary.systemMetrics.avgParallelEfficiency)
      )
    };

    return {
      period: `${days} days`,
      dataPoints: dailyAggs.length,
      trends
    };
  }

  private analyzeTrend(values: number[]): any {
    if (values.length < 2) {
      return { trend: 'insufficient_data' };
    }

    // Simple linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      slope,
      current: values[values.length - 1],
      average: sumY / n,
      min: Math.min(...values),
      max: Math.max(...values),
      changePercent: ((values[values.length - 1] - values[0]) / values[0]) * 100
    };
  }

  async generateCapacityPlan(targetThroughput: number): Promise<any> {
    const metrics = await this.getMetricsCollector();
    const summary = metrics.getMetricsSummary();

    const currentThroughput = summary.taskMetrics.throughput;
    const currentWorkers = summary.systemMetrics.peakActiveWorkers;
    const currentEfficiency = summary.systemMetrics.avgParallelEfficiency;

    // Calculate required workers
    const throughputRatio = targetThroughput / currentThroughput;
    const requiredWorkers = Math.ceil(
      (currentWorkers * throughputRatio) / currentEfficiency
    );

    return {
      current: {
        throughput: currentThroughput,
        workers: currentWorkers,
        efficiency: currentEfficiency
      },
      target: {
        throughput: targetThroughput,
        workers: requiredWorkers,
        estimatedEfficiency: currentEfficiency * 0.95 // Assume slight degradation
      },
      recommendation: {
        addWorkers: requiredWorkers - currentWorkers,
        estimatedCost: this.estimateCost(requiredWorkers - currentWorkers),
        timeline: '1-2 weeks'
      }
    };
  }

  private estimateCost(additionalWorkers: number): number {
    // Example cost calculation
    const costPerWorker = 1000; // $1000/month per worker
    return additionalWorkers * costPerWorker;
  }
}

// Usage
const analyzer = new MetricsAnalyzer();

// Analyze trends
const trends = await analyzer.analyzePerformanceTrends(30);
console.log('Performance Trends (30 days):', JSON.stringify(trends, null, 2));

// Capacity planning
const capacityPlan = await analyzer.generateCapacityPlan(100); // Target: 100 tasks/day
console.log('Capacity Plan:', JSON.stringify(capacityPlan, null, 2));
```

---

## Complete Integration Example

### Full Task Sentinel System with Metrics

```typescript
import {
  getMetricsCollector,
  createMetricsStorage,
  OODAPhase,
  TaskOutcome
} from './src/metrics/index.js';

class TaskSentinelWithMetrics {
  private metrics = getMetricsCollector();
  private storage = createMetricsStorage();
  private monitor = new SystemMonitor();
  private alerting = new AlertingSystem();

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Task Sentinel with Metrics...');

    // Start system monitoring
    this.monitor.startMonitoring(60000); // Every minute

    // Start periodic reporting
    this.startPeriodicReporting();

    // Start alert checking
    this.startAlertChecking();

    console.log('✓ Task Sentinel initialized with comprehensive metrics tracking');
  }

  async executeTask(task: Task): Promise<TaskResult> {
    const cycleId = `cycle-${task.id}-${Date.now()}`;

    // Execute OODA loop with full metrics tracking
    this.metrics.startCycle(cycleId);

    try {
      // Observe
      const observeId = this.metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      const observations = await this.observe(task);
      this.metrics.recordPhaseEnd(observeId, true);

      // Orient
      const orientId = this.metrics.recordPhaseStart(OODAPhase.ORIENT, cycleId);
      const analysis = await this.orient(observations);
      this.metrics.recordPhaseEnd(orientId, true);

      // Decide
      const decideId = this.metrics.recordPhaseStart(OODAPhase.DECIDE, cycleId);
      const plan = await this.generatePlan(task, analysis);
      this.metrics.recordPhaseEnd(decideId, true);

      // Act
      const actId = this.metrics.recordPhaseStart(OODAPhase.ACT, cycleId);
      const result = await this.executePlan(task, plan);
      this.metrics.recordPhaseEnd(actId, true);

      this.metrics.endCycle(cycleId, false);

      return result;

    } catch (error) {
      this.metrics.endCycle(cycleId, true); // Replanning needed
      throw error;
    }
  }

  private async observe(task: Task): Promise<any> {
    // Observation logic
    return {};
  }

  private async orient(observations: any): Promise<any> {
    // Analysis logic
    return {};
  }

  private async generatePlan(task: Task, analysis: any): Promise<Plan> {
    const planId = `plan-${task.id}-${Date.now()}`;
    const startTime = Date.now();

    // Generate plan
    const plan = await this.planner.generatePlan(task.goal, task.worldState);

    // Record planning metrics
    const planningTime = Date.now() - startTime;
    this.metrics.recordPlanGeneration(
      planId,
      planningTime,
      plan.cost,
      plan.actions.length,
      plan.optimalCost,
      0
    );

    return plan;
  }

  private async executePlan(task: Task, plan: Plan): Promise<TaskResult> {
    const taskStartTime = Date.now();

    try {
      // Execute plan actions
      const result = await this.executor.execute(plan);

      // Record successful execution
      const duration = Date.now() - taskStartTime;
      this.metrics.recordTaskExecution(
        task.id,
        duration,
        result.qaPass ? TaskOutcome.SUCCESS : TaskOutcome.QA_FAILED,
        0,
        this.getWorkerUtilization(),
        this.getParallelEfficiency()
      );

      return result;

    } catch (error) {
      // Record failed execution
      const duration = Date.now() - taskStartTime;
      this.metrics.recordTaskExecution(
        task.id,
        duration,
        TaskOutcome.FAILURE,
        0,
        this.getWorkerUtilization(),
        this.getParallelEfficiency()
      );

      throw error;
    }
  }

  private startPeriodicReporting(): void {
    // Generate reports every hour
    setInterval(() => {
      const report = this.metrics.generateReport('hourly');
      console.log('\n' + report);

      // Store aggregations
      const summary = this.metrics.getMetricsSummary();
      this.storage.createHourlyAggregation(summary);
    }, 60 * 60 * 1000);

    // Generate daily reports
    setInterval(() => {
      const report = this.metrics.generateReport('daily');
      console.log('\n' + report);

      const summary = this.metrics.getMetricsSummary();
      this.storage.createDailyAggregation(summary);
    }, 24 * 60 * 60 * 1000);
  }

  private startAlertChecking(): void {
    // Check for alerts every 5 minutes
    setInterval(() => {
      const alerts = this.alerting.checkAlerts();

      if (alerts.length > 0) {
        this.alerting.sendAlerts(alerts);
      }
    }, 5 * 60 * 1000);
  }

  private getWorkerUtilization(): number {
    return 0.85; // Example
  }

  private getParallelEfficiency(): number {
    return 0.92; // Example
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Task Sentinel...');

    // Stop monitoring
    this.monitor.stopMonitoring();

    // Generate final report
    const finalReport = this.metrics.generateReport('daily');
    console.log('\n=== FINAL PERFORMANCE REPORT ===\n');
    console.log(finalReport);

    // Backup metrics
    await this.storage.backupMetrics('/backups/metrics-final.json');

    console.log('✓ Task Sentinel shutdown complete');
  }
}

// Main execution
const taskSentinel = new TaskSentinelWithMetrics();

await taskSentinel.initialize();

// Execute tasks
for (let i = 0; i < 100; i++) {
  const task = { id: `task-${i}`, goal: {}, worldState: {} };
  await taskSentinel.executeTask(task);
}

// Shutdown gracefully
await taskSentinel.shutdown();
```

---

## Summary

This metrics system provides comprehensive tracking for:

- **OODA Loop Performance**: All phases, cycle times, success rates
- **Planning Efficiency**: Generation time, costs, optimality
- **Task Execution**: Throughput, duration, outcomes, QA rates
- **System Performance**: Utilization, efficiency, resource usage
- **KPI Validation**: Automatic comparison against targets
- **Real-time Monitoring**: Continuous data collection
- **Historical Analysis**: Trend detection, capacity planning
- **Alerting**: Automated performance alerts

Use these patterns to integrate metrics tracking throughout your Task Sentinel implementation for complete visibility and performance optimization.
