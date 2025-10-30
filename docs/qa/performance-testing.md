# Performance Testing Guide

Comprehensive guide to performance benchmarking in Task Sentinel Phase 4.

## Table of Contents

1. [Overview](#overview)
2. [Benchmark Types](#benchmark-types)
3. [Metrics Collection](#metrics-collection)
4. [Statistical Analysis](#statistical-analysis)
5. [Regression Detection](#regression-detection)
6. [Performance Tuning](#performance-tuning)
7. [Best Practices](#best-practices)

## Overview

Task Sentinel's PerformanceBenchmarker provides automated performance testing with statistical analysis, baseline comparison, and regression detection.

### Key Features

- **Multiple Test Types:** Load, stress, spike, endurance testing
- **Statistical Analysis:** Percentiles, mean, standard deviation
- **Baseline Tracking:** Compare against historical performance
- **Regression Detection:** Automatically identify performance degradation
- **Resource Monitoring:** CPU, memory, network utilization
- **Bottleneck Identification:** Pinpoint performance issues

### Performance Philosophy

1. **Measure Early:** Performance testing from day one
2. **Continuous Benchmarking:** Test on every commit
3. **Realistic Scenarios:** Use production-like data
4. **Track Trends:** Monitor performance over time
5. **Optimize Proactively:** Address issues before they impact users

## Benchmark Types

### Load Testing

Tests system behavior under normal expected load.

**Purpose:** Verify system handles typical traffic

**Configuration:**
```typescript
{
  type: 'load',
  duration: 300,          // 5 minutes
  rps: 100,               // 100 requests/second
  concurrency: 50,        // 50 concurrent users
  rampUp: 60              // 1 minute ramp-up
}
```

**Example:**
```typescript
const result = await benchmarker.runLoadTest({
  type: 'http',
  url: 'http://localhost:3000/api/users',
  method: 'GET',
  headers: { Authorization: 'Bearer token' }
}, {
  duration: 300,
  rps: 100
});

console.log(result.metrics.responseTime.p95); // 150ms
console.log(result.metrics.throughput);        // 98.5 req/sec
console.log(result.metrics.errorRate);         // 0.002 (0.2%)
```

**Success Criteria:**
- Response time p95 < threshold
- Error rate < 1%
- Throughput meets target
- Resource utilization stable

### Stress Testing

Pushes system to limits to find breaking point.

**Purpose:** Identify maximum capacity and failure modes

**Configuration:**
```typescript
{
  type: 'stress',
  maxRPS: 1000,           // Gradually increase to 1000 RPS
  step: 50,               // Increase by 50 RPS
  stepDuration: 60,       // Hold each step for 60s
  breakOnError: false     // Continue after errors
}
```

**Example:**
```typescript
const result = await benchmarker.runStressTest({
  type: 'http',
  url: 'http://localhost:3000/api/heavy',
  method: 'POST',
  body: largePayload
}, 1000);

console.log(result.breakingPoint);      // 850 RPS
console.log(result.maxThroughput);      // 840 RPS
console.log(result.degradationPoint);   // 750 RPS (response time > 2x)
console.log(result.recovery);           // true (system recovered)
```

**Metrics Captured:**
- Breaking point (max sustainable RPS)
- Degradation point (performance decline starts)
- Error threshold (when errors spike)
- Recovery time (how fast system recovers)

### Spike Testing

Tests sudden traffic surges.

**Purpose:** Verify system handles traffic spikes gracefully

**Configuration:**
```typescript
{
  type: 'spike',
  baseline: 100,          // Normal load: 100 RPS
  spike: 1000,            // Spike to: 1000 RPS
  spikeDuration: 30,      // Hold spike for 30s
  recoveryTime: 120       // Monitor recovery for 2 min
}
```

**Example:**
```typescript
const result = await benchmarker.runSpikeTest({
  type: 'http',
  url: 'http://localhost:3000/api/orders',
  method: 'POST'
}, {
  baseline: 100,
  spike: 1000,
  spikeDuration: 30
});

console.log(result.spikeHandled);           // true
console.log(result.errorsDuringSpike);      // 15 (1.5%)
console.log(result.recoveryTime);           // 45 seconds
console.log(result.degradationDuring);      // 'moderate'
```

**Success Criteria:**
- System remains available during spike
- Error rate < 5% during spike
- Recovery time < 2 minutes
- No cascading failures

### Endurance Testing

Tests system stability over extended periods.

**Purpose:** Identify memory leaks and resource exhaustion

**Configuration:**
```typescript
{
  type: 'endurance',
  duration: 14400,        // 4 hours
  rps: 50,                // Moderate constant load
  monitorInterval: 60     // Check resources every minute
}
```

**Example:**
```typescript
const result = await benchmarker.runEnduranceTest({
  type: 'http',
  url: 'http://localhost:3000/api/data',
  method: 'GET'
}, {
  duration: 14400,
  rps: 50
});

console.log(result.memoryLeak);             // false
console.log(result.resourceGrowth);         // { cpu: 0.05, memory: 0.12 }
console.log(result.performanceDegradation); // 0.03 (3%)
console.log(result.stable);                 // true
```

**Metrics Monitored:**
- Memory usage trend
- CPU utilization trend
- Response time degradation
- Error rate over time
- Connection pool exhaustion

## Metrics Collection

### Response Time Metrics

```typescript
interface ResponseTimeMetrics {
  p50: number;   // Median response time
  p75: number;   // 75th percentile
  p90: number;   // 90th percentile
  p95: number;   // 95th percentile
  p99: number;   // 99th percentile
  mean: number;  // Average response time
  min: number;   // Fastest response
  max: number;   // Slowest response
  stdDev: number; // Standard deviation
}
```

**Interpretation:**
```typescript
// Good performance
{
  p50: 50,   // Half of requests < 50ms
  p95: 120,  // 95% of requests < 120ms
  p99: 200,  // 99% of requests < 200ms
  max: 450   // Worst case: 450ms
}

// Performance issue
{
  p50: 200,   // Median already slow
  p95: 1500,  // 5% of users wait > 1.5s
  p99: 5000,  // 1% of users wait > 5s
  max: 30000  // Some requests timeout
}
```

### Throughput Metrics

```typescript
interface ThroughputMetrics {
  rps: number;              // Requests per second
  rpm: number;              // Requests per minute
  totalRequests: number;    // Total requests made
  successful: number;       // Successful requests
  failed: number;           // Failed requests
  timeouts: number;         // Timed out requests
}
```

### Resource Metrics

```typescript
interface ResourceMetrics {
  cpu: {
    usage: number;          // CPU usage percentage
    cores: number;          // Number of cores
    loadAverage: number[];  // 1, 5, 15 min averages
  };
  memory: {
    used: number;           // Used memory (MB)
    total: number;          // Total memory (MB)
    percentage: number;     // Usage percentage
    heapUsed: number;       // Heap used (Node.js)
    heapTotal: number;      // Heap total (Node.js)
  };
  network: {
    bytesIn: number;        // Bytes received
    bytesOut: number;       // Bytes sent
    packetsIn: number;      // Packets received
    packetsOut: number;     // Packets sent
  };
  disk: {
    reads: number;          // Disk reads
    writes: number;         // Disk writes
    iops: number;           // I/O operations per second
  };
}
```

### Error Metrics

```typescript
interface ErrorMetrics {
  total: number;            // Total errors
  rate: number;             // Error rate (0-1)
  types: Record<string, number>; // Error counts by type
  statusCodes: Record<number, number>; // HTTP status counts
  timeouts: number;         // Request timeouts
  networkErrors: number;    // Network failures
}
```

## Statistical Analysis

### Percentile Calculation

```typescript
function calculatePercentiles(values: number[]): ResponseTimeMetrics {
  const sorted = values.sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.50)],
    p75: sorted[Math.floor(len * 0.75)],
    p90: sorted[Math.floor(len * 0.90)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    mean: values.reduce((a, b) => a + b, 0) / len,
    min: sorted[0],
    max: sorted[len - 1],
    stdDev: calculateStdDev(values)
  };
}
```

### Outlier Detection

```typescript
function detectOutliers(values: number[]): {
  outliers: number[];
  threshold: number;
} {
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;
  const threshold = q3 + (1.5 * iqr);

  const outliers = values.filter(v => v > threshold);

  return { outliers, threshold };
}
```

### Trend Analysis

```typescript
function analyzeTrend(timeSeries: Array<{ time: number; value: number }>) {
  // Calculate linear regression
  const { slope, intercept } = linearRegression(timeSeries);

  return {
    trend: slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable',
    rate: slope,
    prediction: (time: number) => slope * time + intercept
  };
}
```

### Statistical Significance

```typescript
function isSignificantChange(
  baseline: number[],
  current: number[],
  alpha: number = 0.05
): boolean {
  // T-test for statistical significance
  const tScore = calculateTScore(baseline, current);
  const pValue = calculatePValue(tScore, baseline.length + current.length - 2);

  return pValue < alpha;
}
```

## Regression Detection

### Baseline Comparison

```typescript
interface RegressionAnalysis {
  hasRegression: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  metrics: {
    responseTime: {
      baseline: number;
      current: number;
      change: number;        // Percentage change
      significant: boolean;  // Statistically significant
    };
    throughput: {
      baseline: number;
      current: number;
      change: number;
      significant: boolean;
    };
    errorRate: {
      baseline: number;
      current: number;
      change: number;
      significant: boolean;
    };
  };
  recommendations: string[];
}
```

### Example Analysis

```typescript
const analysis = await benchmarker.analyzeRegression(
  currentMetrics,
  baselineMetrics
);

if (analysis.hasRegression) {
  console.log(`Regression severity: ${analysis.severity}`);

  if (analysis.metrics.responseTime.change > 20) {
    console.log('Response time increased by 20%');
    console.log('Recommendations:', analysis.recommendations);
  }
}
```

### Regression Thresholds

```typescript
const regressionThresholds = {
  minor: {
    responseTime: 10,      // 10% increase
    throughput: -5,        // 5% decrease
    errorRate: 50          // 50% increase
  },
  moderate: {
    responseTime: 20,      // 20% increase
    throughput: -10,       // 10% decrease
    errorRate: 100         // 100% increase
  },
  severe: {
    responseTime: 50,      // 50% increase
    throughput: -25,       // 25% decrease
    errorRate: 200         // 200% increase
  }
};
```

### Automated Alerts

```typescript
{
  "performanceBenchmark": {
    "regression": {
      "alertOn": ["moderate", "severe"],
      "notifications": {
        "slack": "#alerts-performance",
        "email": ["team@example.com"],
        "pagerduty": "performance-oncall"
      },
      "actions": {
        "moderate": "create-ticket",
        "severe": "block-deployment"
      }
    }
  }
}
```

## Performance Tuning

### Bottleneck Identification

```typescript
interface BottleneckAnalysis {
  component: string;
  type: 'cpu' | 'memory' | 'network' | 'database' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;           // Percentage of total time
  recommendation: string;
  expectedImprovement: number; // Estimated improvement
}

// Example
const bottlenecks = await benchmarker.identifyBottlenecks(metrics);

bottlenecks.forEach(bottleneck => {
  console.log(`${bottleneck.component}: ${bottleneck.type}`);
  console.log(`Impact: ${bottleneck.impact}% of total time`);
  console.log(`Recommendation: ${bottleneck.recommendation}`);
  console.log(`Expected improvement: ${bottleneck.expectedImprovement}%`);
});
```

### Common Bottlenecks

**1. Database Queries**
```typescript
// Problem: N+1 queries
for (const user of users) {
  const orders = await db.orders.find({ userId: user.id });
}

// Solution: Eager loading
const users = await db.users.find().populate('orders');
```

**2. Synchronous Operations**
```typescript
// Problem: Blocking operations
const result1 = await operation1();
const result2 = await operation2();
const result3 = await operation3();

// Solution: Parallel execution
const [result1, result2, result3] = await Promise.all([
  operation1(),
  operation2(),
  operation3()
]);
```

**3. Missing Caching**
```typescript
// Problem: Repeated expensive operations
app.get('/api/data', async (req, res) => {
  const data = await expensiveOperation();
  res.json(data);
});

// Solution: Add caching
const cache = new NodeCache({ stdTTL: 3600 });

app.get('/api/data', async (req, res) => {
  let data = cache.get('data');
  if (!data) {
    data = await expensiveOperation();
    cache.set('data', data);
  }
  res.json(data);
});
```

**4. Large Payloads**
```typescript
// Problem: Sending unnecessary data
app.get('/api/users', async (req, res) => {
  const users = await db.users.find();
  res.json(users); // Includes all fields
});

// Solution: Project only needed fields
app.get('/api/users', async (req, res) => {
  const users = await db.users.find()
    .select('id name email');
  res.json(users);
});
```

**5. Memory Leaks**
```typescript
// Problem: Event listeners not cleaned up
const emitter = new EventEmitter();
setInterval(() => {
  emitter.on('event', handler); // New listener every interval
}, 1000);

// Solution: Proper cleanup
const emitter = new EventEmitter();
emitter.on('event', handler);

process.on('exit', () => {
  emitter.removeAllListeners();
});
```

### Optimization Strategies

**1. Connection Pooling**
```typescript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  connectionLimit: 10,
  queueLimit: 0
});
```

**2. Request Batching**
```typescript
// Instead of individual requests
for (const id of ids) {
  await api.get(`/users/${id}`);
}

// Batch request
await api.post('/users/batch', { ids });
```

**3. Lazy Loading**
```typescript
// Load data only when needed
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

**4. Compression**
```typescript
import compression from 'compression';
app.use(compression());
```

**5. CDN for Static Assets**
```typescript
// Serve static assets from CDN
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true
}));
```

## Best Practices

### 1. Establish Baselines Early

```typescript
// After initial implementation
await benchmarker.setBaseline('feature-x', metrics);

// Compare future runs
const comparison = await benchmarker.compareToBaseline('feature-x', newMetrics);
```

### 2. Use Realistic Test Data

```typescript
// Bad: Tiny test data
const testData = { users: 10, orders: 5 };

// Good: Production-scale data
const testData = {
  users: 100000,
  orders: 500000,
  products: 50000
};
```

### 3. Test Under Various Conditions

```typescript
const conditions = [
  { name: 'ideal', latency: 0, packetLoss: 0 },
  { name: '3g', latency: 100, packetLoss: 0.01 },
  { name: 'flaky', latency: 50, packetLoss: 0.05 }
];

for (const condition of conditions) {
  await benchmarker.runWithConditions(condition);
}
```

### 4. Monitor Resource Usage

```typescript
const resourceMonitor = setInterval(async () => {
  const resources = await getResourceUsage();
  if (resources.memory > 0.9 * TOTAL_MEMORY) {
    console.warn('High memory usage detected');
  }
}, 5000);
```

### 5. Automate Performance Testing

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - name: Run Performance Tests
        run: npx task-sentinel qa perf-test

      - name: Compare to Baseline
        run: npx task-sentinel qa compare-baseline

      - name: Block if Regression
        run: npx task-sentinel qa check-regression --fail-on-severe
```

### 6. Document Performance Requirements

```typescript
// performance-requirements.json
{
  "api": {
    "responseTime": {
      "p95": 200,
      "p99": 500
    },
    "throughput": {
      "min": 1000
    },
    "availability": {
      "min": 0.999
    }
  },
  "database": {
    "queryTime": {
      "p95": 50,
      "p99": 100
    }
  }
}
```

## CLI Commands

```bash
# Run all performance tests
npx task-sentinel qa perf-test --task-id task-123

# Run specific test type
npx task-sentinel qa perf-test --type load
npx task-sentinel qa perf-test --type stress
npx task-sentinel qa perf-test --type spike
npx task-sentinel qa perf-test --type endurance

# Set baseline
npx task-sentinel qa set-baseline --task-id task-123

# Compare to baseline
npx task-sentinel qa compare-baseline --task-id task-123

# Analyze regression
npx task-sentinel qa analyze-regression --task-id task-123

# Identify bottlenecks
npx task-sentinel qa find-bottlenecks --task-id task-123

# Generate performance report
npx task-sentinel qa perf-report --task-id task-123 --format html
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
**Maintainers:** Task Sentinel Team
