# Task Sentinel Metrics System - Setup Guide

## 📋 Prerequisites

- Node.js 18+ or Bun runtime
- TypeScript 5.0+
- Jest for testing (optional)
- Claude Flow MCP server (for persistent storage)

## 🚀 Installation

### 1. Verify Files

Ensure all metrics files are in place:

```bash
# Check source files
ls -la src/metrics/
# Should show: collector.ts, index.ts, storage.ts, types.ts, README.md

# Check test files
ls -la tests/metrics/
# Should show: collector.test.ts, integration.test.ts

# Check documentation
ls -la docs/*METRICS*
# Should show various metrics documentation files
```

### 2. Install Dependencies

The metrics system uses standard TypeScript and integrates with existing Task Sentinel dependencies:

```bash
# No additional dependencies required
# Uses existing TypeScript, Node.js APIs, and MCP tools
```

### 3. TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ]
}
```

## 🔧 Configuration

### Basic Setup

Create a metrics configuration file:

```typescript
// src/config/metrics.config.ts
export const metricsConfig = {
  // Storage configuration
  storage: {
    namespace: 'task-sentinel/metrics',
    ttlDays: 90,
    compressionEnabled: true
  },

  // KPI targets (can be adjusted)
  kpiTargets: {
    oodaCycleTimeMs: 5 * 60 * 1000,    // 5 minutes
    planningTimeMs: 30 * 1000,          // 30 seconds
    taskThroughputPerDay: 50,           // 50 tasks/day
    qaPassRate: 0.95,                   // 95%
    parallelEfficiency: 0.90            // 90%
  },

  // Collection intervals
  collection: {
    systemMetricsIntervalMs: 60000,    // Every minute
    reportGenerationIntervalMs: 3600000, // Every hour
    cleanupIntervalMs: 86400000         // Every day
  },

  // Alerting thresholds
  alerting: {
    criticalVarianceThreshold: 50,     // 50% variance = critical
    warningVarianceThreshold: 20,      // 20% variance = warning
    checkIntervalMs: 300000             // Check every 5 minutes
  }
};
```

### MCP Integration

Ensure Claude Flow MCP server is configured:

```bash
# Add MCP server if not already added
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Verify MCP server is running
claude mcp list
```

## 🎯 Integration Steps

### Step 1: Basic Integration

Create a metrics service:

```typescript
// src/services/metrics.service.ts
import { getMetricsCollector, createMetricsStorage } from '../metrics/index.js';
import { metricsConfig } from '../config/metrics.config.js';

export class MetricsService {
  private static instance: MetricsService;
  private collector = getMetricsCollector(true);
  private storage = createMetricsStorage(metricsConfig.storage);

  private constructor() {}

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  getCollector() {
    return this.collector;
  }

  getStorage() {
    return this.storage;
  }
}

// Export singleton
export const metricsService = MetricsService.getInstance();
```

### Step 2: Integrate with OODA Loop

```typescript
// src/core/ooda-loop.ts
import { metricsService } from '../services/metrics.service.js';
import { OODAPhase } from '../metrics/index.js';

export class OODALoop {
  private metrics = metricsService.getCollector();

  async executeCycle(taskId: string): Promise<void> {
    const cycleId = `cycle-${taskId}-${Date.now()}`;
    this.metrics.startCycle(cycleId);

    try {
      await this.executePhase(OODAPhase.OBSERVE, cycleId, () => this.observe());
      await this.executePhase(OODAPhase.ORIENT, cycleId, () => this.orient());
      const needsReplanning = await this.executePhase(
        OODAPhase.DECIDE,
        cycleId,
        () => this.decide()
      );
      await this.executePhase(OODAPhase.ACT, cycleId, () => this.act());

      this.metrics.endCycle(cycleId, needsReplanning);
    } catch (error) {
      this.metrics.endCycle(cycleId, true);
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

  // ... other methods ...
}
```

### Step 3: Integrate with GOAP Planner

```typescript
// src/planning/goap-planner.ts
import { metricsService } from '../services/metrics.service.js';

export class GOAPPlanner {
  private metrics = metricsService.getCollector();

  async generatePlan(goal: Goal, worldState: WorldState): Promise<Plan> {
    const planId = `plan-${Date.now()}`;
    const startTime = Date.now();

    const plan = await this.search(goal, worldState);

    this.metrics.recordPlanGeneration(
      planId,
      Date.now() - startTime,
      plan.cost,
      plan.actions.length,
      this.calculateOptimalCost(goal),
      0
    );

    return plan;
  }

  // ... other methods ...
}
```

### Step 4: Integrate with Task Executor

```typescript
// src/execution/task-executor.ts
import { metricsService } from '../services/metrics.service.js';
import { TaskOutcome } from '../metrics/index.js';

export class TaskExecutor {
  private metrics = metricsService.getCollector();

  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    let outcome = TaskOutcome.SUCCESS;

    try {
      const result = await this.execute(task);

      if (!await this.qaCheck(result)) {
        outcome = TaskOutcome.QA_FAILED;
      }

      return result;
    } catch (error) {
      outcome = TaskOutcome.FAILURE;
      throw error;
    } finally {
      this.metrics.recordTaskExecution(
        task.id,
        Date.now() - startTime,
        outcome,
        0,
        this.getWorkerUtilization(),
        this.getParallelEfficiency()
      );
    }
  }

  // ... other methods ...
}
```

### Step 5: Add System Monitor

```typescript
// src/monitoring/system-monitor.ts
import { metricsService } from '../services/metrics.service.js';

export class SystemMonitor {
  private metrics = metricsService.getCollector();
  private intervalId: NodeJS.Timeout | null = null;

  start(intervalMs: number = 60000): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private collectMetrics(): void {
    this.metrics.recordSystemMetrics(
      this.getWorkerUtilization(),
      this.getParallelEfficiency(),
      this.getMemoryUsageMB(),
      this.getLockContentionMs(),
      this.getActiveWorkers(),
      this.getQueuedTasks()
    );
  }

  // ... helper methods ...
}
```

## 🧪 Testing Setup

### Configure Jest

```javascript
// jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
};
```

### Run Tests

```bash
# Run all metrics tests
npm test -- tests/metrics/

# Run unit tests only
npm test -- tests/metrics/collector.test.ts

# Run integration tests only
npm test -- tests/metrics/integration.test.ts

# Run with coverage
npm test -- --coverage tests/metrics/
```

## 📊 Dashboard Setup (Optional)

### Create Metrics API

```typescript
// src/api/metrics-api.ts
import express from 'express';
import { metricsService } from '../services/metrics.service.js';

export function createMetricsAPI(port: number = 3000) {
  const app = express();
  const metrics = metricsService.getCollector();

  app.get('/api/health', (req, res) => {
    const summary = metrics.getMetricsSummary();
    res.json({
      status: 'healthy',
      kpis: summary.kpiStatus
    });
  });

  app.get('/api/metrics/summary', (req, res) => {
    const summary = metrics.getMetricsSummary();
    res.json(summary);
  });

  app.get('/api/metrics/report', (req, res) => {
    const timeframe = (req.query.timeframe as any) || 'daily';
    const report = metrics.generateReport(timeframe);
    res.type('text/plain').send(report);
  });

  app.listen(port, () => {
    console.log(`Metrics API running on http://localhost:${port}`);
  });

  return app;
}
```

### Start Dashboard

```typescript
// src/index.ts
import { createMetricsAPI } from './api/metrics-api.js';

// Start metrics dashboard
createMetricsAPI(3000);
```

## 🔔 Alerting Setup

```typescript
// src/alerting/alert-manager.ts
import { metricsService } from '../services/metrics.service.js';
import { metricsConfig } from '../config/metrics.config.js';

export class AlertManager {
  private metrics = metricsService.getCollector();

  start(): void {
    setInterval(() => {
      this.checkAlerts();
    }, metricsConfig.alerting.checkIntervalMs);
  }

  private checkAlerts(): void {
    const comparison = this.metrics.compareToTargets();

    Object.entries(comparison).forEach(([kpi, status]) => {
      if (!status.met) {
        const variance = Math.abs(status.variance);
        const severity = variance > metricsConfig.alerting.criticalVarianceThreshold
          ? 'critical'
          : 'warning';

        this.sendAlert({
          severity,
          kpi,
          message: `${kpi} ${status.variance > 0 ? 'exceeds' : 'below'} target by ${variance.toFixed(1)}%`,
          actual: status.actual,
          target: status.target
        });
      }
    });
  }

  private sendAlert(alert: any): void {
    console.log(`🚨 [${alert.severity.toUpperCase()}] ${alert.message}`);
    // Add integration with your alerting system (Slack, email, etc.)
  }
}
```

## 🚦 Startup Sequence

Create a main initialization file:

```typescript
// src/init-metrics.ts
import { metricsService } from './services/metrics.service.js';
import { SystemMonitor } from './monitoring/system-monitor.js';
import { AlertManager } from './alerting/alert-manager.js';
import { createMetricsAPI } from './api/metrics-api.js';

export async function initializeMetrics() {
  console.log('🚀 Initializing Task Sentinel Metrics System...');

  // Start system monitoring
  const monitor = new SystemMonitor();
  monitor.start(60000); // Every minute
  console.log('✓ System monitor started');

  // Start alerting
  const alertManager = new AlertManager();
  alertManager.start();
  console.log('✓ Alert manager started');

  // Start metrics API (optional)
  createMetricsAPI(3000);
  console.log('✓ Metrics API started on port 3000');

  // Setup periodic aggregations
  setInterval(async () => {
    const metrics = metricsService.getCollector();
    const storage = metricsService.getStorage();
    const summary = metrics.getMetricsSummary();

    await storage.createHourlyAggregation(summary);
    console.log('✓ Hourly aggregation created');
  }, 60 * 60 * 1000); // Every hour

  console.log('✓ Task Sentinel Metrics System initialized');
}

// Call from your main application
// await initializeMetrics();
```

## ✅ Verification

### Check Installation

```bash
# Verify files
ls src/metrics/*.ts
ls tests/metrics/*.ts

# Run tests
npm test -- tests/metrics/

# Check TypeScript compilation
npx tsc --noEmit
```

### Quick Test

```typescript
import { getMetricsCollector } from './src/metrics/index.js';

const metrics = getMetricsCollector(false); // Disable memory for test

// Record a quick cycle
const cycleId = 'test-cycle';
metrics.startCycle(cycleId);
const phaseId = metrics.recordPhaseStart('observe', cycleId);
metrics.recordPhaseEnd(phaseId, true);
metrics.endCycle(cycleId, false);

// Generate report
const report = metrics.generateReport('daily');
console.log(report);
```

## 🔍 Troubleshooting

### Issue: TypeScript compilation errors

**Solution**: Ensure you're using ES modules:
```json
// package.json
{
  "type": "module"
}
```

### Issue: MCP memory tools not working

**Solution**: Verify Claude Flow MCP server is running:
```bash
claude mcp list
# Should show claude-flow in the list
```

### Issue: Tests failing

**Solution**: Reset metrics collector before each test:
```typescript
import { resetMetricsCollector } from './src/metrics/index.js';

beforeEach(() => {
  resetMetricsCollector();
});
```

## 📚 Next Steps

1. ✅ Install and verify files
2. ✅ Configure TypeScript
3. ✅ Integrate with OODA loop
4. ✅ Integrate with GOAP planner
5. ✅ Integrate with task executor
6. ✅ Setup system monitor
7. ✅ Configure alerting
8. ✅ Start metrics API (optional)
9. ✅ Run tests
10. ✅ Monitor in production

## 📖 Documentation References

- **API Reference**: `/src/metrics/README.md`
- **Usage Examples**: `/docs/metrics-usage-examples.md`
- **System Summary**: `/docs/METRICS_SYSTEM_SUMMARY.md`
- **Quick Reference**: `/docs/METRICS_QUICK_REFERENCE.md`

## 🆘 Support

For issues or questions:
1. Check the documentation files
2. Review the usage examples
3. Run the test suite for validation
4. Verify MCP server configuration

---

**Congratulations!** Your Task Sentinel Metrics System is now ready to track and optimize performance! 🎉
