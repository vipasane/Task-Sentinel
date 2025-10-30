# Performance Benchmarking System - Task Sentinel

Complete performance testing and regression detection system for automated quality assurance.

## Overview

The Performance Benchmarking System provides comprehensive tools for:

- **Latency Benchmarking**: Measure API endpoints, function execution, database queries
- **Throughput Benchmarking**: Calculate operations per second/minute
- **Resource Benchmarking**: Monitor memory and CPU usage
- **Statistical Analysis**: Mean, median, percentiles, outlier detection
- **Regression Detection**: Compare against baselines with configurable thresholds
- **Quality Gates**: Enforce performance SLAs automatically

## Architecture

```
src/qa/performance-benchmarker.ts
├── StatisticalAnalyzer      # Statistical analysis engine
├── PerformanceBenchmarker    # Main benchmarking orchestrator
└── BenchmarkReporter         # Multi-format reporting
```

## Quick Start

### Basic Latency Benchmark

```typescript
import { PerformanceBenchmarker, BenchmarkConfig } from './performance-benchmarker';

const benchmarker = new PerformanceBenchmarker();

const config: BenchmarkConfig = {
  name: 'API Endpoint',
  type: 'latency',
  operation: async () => {
    // Your operation here
    await fetch('/api/users/1');
  },
  warmup: 10,
  iterations: 100
};

const results = await benchmarker.runLatencyBenchmark(config);
console.log(`P95 Latency: ${results.statistics.p95.toFixed(2)}ms`);
```

## Benchmark Types

### 1. Latency Benchmarks

Measure response times and execution duration.

```typescript
const config: BenchmarkConfig = {
  name: 'Database Query',
  description: 'User lookup by ID',
  type: 'latency',
  operation: async () => {
    return await db.users.findById(userId);
  },
  warmup: 10,        // Warmup iterations
  iterations: 100,   // Measurement iterations
  timeout: 5000,     // Operation timeout (ms)
  metadata: {
    database: 'postgresql',
    query: 'SELECT * FROM users WHERE id = ?'
  }
};

const results = await benchmarker.runLatencyBenchmark(config);
```

**Results Include:**
- Mean, median, mode
- Standard deviation and variance
- Percentiles: P50, P75, P90, P95, P99
- Min/max values
- Outlier detection

### 2. Throughput Benchmarks

Measure operations per second/minute.

```typescript
const config: BenchmarkConfig = {
  name: 'Task Processing',
  type: 'throughput',
  operation: async () => {
    return await processTask(task);
  },
  warmup: 5,
  iterations: 200
};

const results = await benchmarker.runThroughputBenchmark(config);
console.log(`Throughput: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
```

**Metrics:**
- Operations per second
- Operations per minute
- Average operation time
- Full latency distribution

### 3. Memory Benchmarks

Monitor heap and RSS memory usage.

```typescript
const config: BenchmarkConfig = {
  name: 'Large Dataset Processing',
  type: 'memory',
  operation: async () => {
    const data = generateLargeDataset(50000);
    return processDataset(data);
  },
  warmup: 3,
  iterations: 20
};

const results = await benchmarker.runMemoryBenchmark(config);
console.log(`Peak Memory: ${(results.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`);
```

**Tracked Metrics:**
- Heap used/total
- RSS (Resident Set Size)
- External memory
- Peak and average usage

### 4. CPU Benchmarks

Measure CPU utilization.

```typescript
const config: BenchmarkConfig = {
  name: 'CPU Intensive Task',
  type: 'cpu',
  operation: async () => {
    return await heavyComputation();
  },
  warmup: 3,
  iterations: 30
};

const results = await benchmarker.runCPUBenchmark(config);
console.log(`Peak CPU: ${results.peak.cpuUsage?.toFixed(2)}%`);
```

## Statistical Analysis

### Available Metrics

```typescript
interface StatisticalResults {
  mean: number;           // Average value
  median: number;         // 50th percentile
  mode?: number;          // Most frequent value
  stdDev: number;         // Standard deviation
  variance: number;       // Statistical variance
  min: number;            // Minimum value
  max: number;            // Maximum value
  p50: number;            // 50th percentile
  p75: number;            // 75th percentile
  p90: number;            // 90th percentile
  p95: number;            // 95th percentile
  p99: number;            // 99th percentile
  outliers: number[];     // Detected outliers (3-sigma)
  sampleSize: number;     // Number of samples
}
```

### Percentile Calculation

Uses linear interpolation for accurate percentile estimation:

```typescript
const stats = StatisticalAnalyzer.analyze(data);
console.log(`P95: ${stats.p95}ms`); // 95% of requests faster than this
console.log(`P99: ${stats.p99}ms`); // 99% of requests faster than this
```

### Outlier Detection

Automatically detects outliers using 3-sigma rule:

```typescript
const outliers = StatisticalAnalyzer.detectOutliers(data);
// Values beyond 3 standard deviations from mean
```

## Regression Detection

### Setting Baselines

```typescript
const baseline = await benchmarker.runLatencyBenchmark(config);
benchmarker.setBaseline('api-endpoint', baseline);
```

### Comparing Results

```typescript
const current = await benchmarker.runLatencyBenchmark(config);
const regression = benchmarker.compareToBaseline('api-endpoint', current, 1.20);

if (regression?.regressed) {
  console.error(`🚨 Regression detected in ${regression.metric}`);
  console.error(`Current: ${regression.currentValue}ms`);
  console.error(`Baseline: ${regression.baselineValue}ms`);
  console.error(`Degradation: ${regression.degradationPercent.toFixed(2)}%`);
}
```

### Detection Logic

```typescript
detectRegression(current, baseline, threshold = 1.20) {
  // Check P95 latency (20% threshold)
  if (current.statistics.p95 > baseline.statistics.p95 * threshold) {
    return { regressed: true, metric: 'p95', ... };
  }

  // Check mean latency
  if (current.statistics.mean > baseline.statistics.mean * threshold) {
    return { regressed: true, metric: 'mean', ... };
  }

  return { regressed: false };
}
```

## Quality Gates

### Default Gates

```typescript
const defaultGates = [
  {
    metric: 'p95',
    operator: '<',
    threshold: 200,  // 200ms
    description: 'P95 latency must be under 200ms'
  },
  {
    metric: 'operationsPerSecond',
    operator: '>',
    threshold: 50,
    description: 'Throughput must exceed 50 ops/sec'
  },
  {
    metric: 'heapUsed',
    operator: '<',
    threshold: 512 * 1024 * 1024,  // 512MB
    description: 'Memory usage must be under 512MB'
  }
];
```

### Custom Gates

```typescript
benchmarker.addQualityGate({
  metric: 'p99',
  operator: '<',
  threshold: 500,
  description: 'P99 latency must be under 500ms'
});

benchmarker.addQualityGate({
  metric: 'mean',
  operator: '<',
  threshold: 100,
  description: 'Mean latency must be under 100ms'
});
```

### Validation

Quality gates are automatically validated after each benchmark:

```typescript
const results = await benchmarker.runLatencyBenchmark(config);

if (!results.passed) {
  console.error('❌ Quality gates failed!');
  for (const violation of results.violations) {
    console.error(`  - ${violation.message}`);
  }
  process.exit(1);  // Fail CI/CD pipeline
}
```

## Reporting

### Console Report

```typescript
import { BenchmarkReporter } from './performance-benchmarker';

BenchmarkReporter.console(results);
```

Output:
```
================================================================================
📊 Benchmark Results: API Endpoint
================================================================================
Type: latency
Timestamp: 2025-01-30T12:00:00.000Z
Duration: 5250ms
Status: ✅ PASSED

Statistics:
  Iterations: 100
  Mean: 45.23ms
  Median: 42.15ms
  Std Dev: 8.45ms
  Min: 28.34ms
  Max: 78.92ms

Percentiles:
  P50: 42.15ms
  P75: 48.67ms
  P90: 56.23ms
  P95: 62.45ms
  P99: 72.18ms
================================================================================
```

### JSON Report

```typescript
const json = BenchmarkReporter.json(results);
fs.writeFileSync('benchmark-results.json', json);
```

### Markdown Report

```typescript
const markdown = BenchmarkReporter.markdown(results);
fs.writeFileSync('BENCHMARK_REPORT.md', markdown);
```

Output:
```markdown
# Benchmark Results: API Endpoint

- **Type:** latency
- **Timestamp:** 2025-01-30T12:00:00.000Z
- **Duration:** 5250ms
- **Status:** ✅ PASSED

## Statistics

| Metric | Value |
|--------|-------|
| Iterations | 100 |
| Mean | 45.23ms |
| Median | 42.15ms |
| Std Dev | 8.45ms |
| Min | 28.34ms |
| Max | 78.92ms |

## Percentiles

| Percentile | Value |
|------------|-------|
| P50 | 42.15ms |
| P75 | 48.67ms |
| P90 | 56.23ms |
| P95 | 62.45ms |
| P99 | 72.18ms |
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Benchmarks

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run benchmarks
        run: npm run benchmark

      - name: Check for regressions
        run: npm run benchmark:check

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-results.json

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('benchmark-results.json'));
            const markdown = require('./src/qa/performance-benchmarker').BenchmarkReporter.markdown(results);

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: markdown
            });
```

### NPM Scripts

```json
{
  "scripts": {
    "benchmark": "ts-node examples/benchmark-examples.ts",
    "benchmark:api": "ts-node benchmarks/api-benchmarks.ts",
    "benchmark:db": "ts-node benchmarks/db-benchmarks.ts",
    "benchmark:check": "ts-node benchmarks/regression-check.ts"
  }
}
```

## Best Practices

### 1. Warmup Phase

Always include warmup iterations to allow JIT compilation and caching:

```typescript
{
  warmup: 10,      // Good: allows JIT optimization
  iterations: 100
}
```

### 2. Adequate Sample Size

Use sufficient iterations for statistical significance:

- **Latency**: 100-1000 iterations
- **Throughput**: 200-500 iterations
- **Memory**: 20-50 iterations
- **CPU**: 30-100 iterations

### 3. Timeout Configuration

Set reasonable timeouts to prevent hanging:

```typescript
{
  timeout: 5000,  // 5 seconds per operation
  iterations: 100
}
```

### 4. Consistent Environment

- Run on same hardware/instance type
- Same Node.js version
- Same dependencies
- No competing processes

### 5. Baseline Management

```typescript
// Update baseline after verified improvements
if (newResults.passed && !regression?.regressed) {
  benchmarker.setBaseline('operation-name', newResults);
}
```

### 6. Metadata Tracking

Include context for analysis:

```typescript
{
  metadata: {
    nodeVersion: process.version,
    platform: process.platform,
    cpus: os.cpus().length,
    commit: gitCommitHash,
    branch: gitBranch
  }
}
```

## Performance Goals

### Default Quality Gates

| Metric | Target | Critical |
|--------|--------|----------|
| P95 Latency | < 200ms | < 500ms |
| P99 Latency | < 500ms | < 1000ms |
| Throughput | > 50 ops/sec | > 20 ops/sec |
| Memory | < 512MB | < 1GB |
| CPU | < 70% | < 90% |

### Regression Thresholds

| Severity | Threshold | Action |
|----------|-----------|--------|
| Minor | 10-20% | Warning |
| Major | 20-50% | Block PR |
| Critical | > 50% | Immediate investigation |

## Advanced Usage

### Comparative Benchmarking

```typescript
async function compareAlgorithms() {
  const algorithms = [
    { name: 'Algorithm A', fn: algorithmA },
    { name: 'Algorithm B', fn: algorithmB },
    { name: 'Algorithm C', fn: algorithmC }
  ];

  const results = await Promise.all(
    algorithms.map(algo =>
      benchmarker.runLatencyBenchmark({
        name: algo.name,
        type: 'latency',
        operation: algo.fn,
        warmup: 10,
        iterations: 100
      })
    )
  );

  // Find fastest
  const fastest = results.reduce((best, current) =>
    current.statistics.mean < best.statistics.mean ? current : best
  );

  console.log(`Fastest: ${fastest.name}`);
}
```

### Load Testing

```typescript
async function loadTest() {
  const concurrency = [1, 5, 10, 20, 50];

  for (const concurrent of concurrency) {
    const config: BenchmarkConfig = {
      name: `Load Test (${concurrent} concurrent)`,
      type: 'throughput',
      operation: async () => {
        const promises = Array(concurrent).fill(null).map(() =>
          fetch('/api/endpoint')
        );
        return Promise.all(promises);
      },
      warmup: 5,
      iterations: 50
    };

    const results = await benchmarker.runThroughputBenchmark(config);
    console.log(`${concurrent} concurrent: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
  }
}
```

## Troubleshooting

### Issue: High Variance

**Symptoms**: Large standard deviation, many outliers

**Solutions**:
- Increase warmup iterations
- Ensure no competing processes
- Use dedicated benchmark environment
- Check for garbage collection pauses

### Issue: Inconsistent Results

**Symptoms**: Different results between runs

**Solutions**:
- Increase sample size (iterations)
- Control external dependencies
- Mock network calls
- Use fixed random seeds

### Issue: Memory Leaks

**Symptoms**: Increasing memory over iterations

**Solutions**:
- Enable GC between iterations: `if (global.gc) global.gc();`
- Check for event listener leaks
- Verify cleanup in operation
- Use WeakMap/WeakSet for caches

## Examples

See `/workspaces/Task-Sentinel/examples/benchmark-examples.ts` for complete examples:

1. ✅ API Endpoint Latency
2. ✅ Database Query Throughput
3. ✅ Memory Usage Monitoring
4. ✅ CPU Intensive Operations
5. ✅ Regression Detection
6. ✅ Quality Gate Enforcement
7. ✅ Comparative Algorithm Benchmarking

## API Reference

### PerformanceBenchmarker

```typescript
class PerformanceBenchmarker {
  // Run benchmarks
  runLatencyBenchmark(config: BenchmarkConfig): Promise<BenchmarkResults>
  runThroughputBenchmark(config: BenchmarkConfig): Promise<ThroughputResults>
  runMemoryBenchmark(config: BenchmarkConfig): Promise<ResourceResults>
  runCPUBenchmark(config: BenchmarkConfig): Promise<ResourceResults>
  runBenchmark(config: BenchmarkConfig): Promise<Results>

  // Quality gates
  addQualityGate(gate: QualityGate): void

  // Baselines
  setBaseline(name: string, results: Results): void
  getBaseline(name: string): PerformanceBaseline | undefined
  compareToBaseline(name: string, current: Results, threshold?: number): RegressionResult | null

  // Regression detection
  detectRegression(current: Results, baseline: Results, threshold?: number): RegressionResult
}
```

### StatisticalAnalyzer

```typescript
class StatisticalAnalyzer {
  static analyze(data: number[]): StatisticalResults
  static mean(data: number[]): number
  static median(sortedData: number[]): number
  static mode(data: number[]): number | undefined
  static variance(data: number[], mean?: number): number
  static percentile(sortedData: number[], p: number): number
  static detectOutliers(data: number[], mean?: number, stdDev?: number): number[]
}
```

### BenchmarkReporter

```typescript
class BenchmarkReporter {
  static console(results: Results): void
  static json(results: Results): string
  static markdown(results: Results): string
}
```

## Summary

The Performance Benchmarking System provides enterprise-grade performance testing with:

✅ **Multiple Benchmark Types**: Latency, throughput, memory, CPU
✅ **Statistical Analysis**: Comprehensive metrics and outlier detection
✅ **Regression Detection**: Automatic baseline comparison
✅ **Quality Gates**: Enforce performance SLAs
✅ **Multi-Format Reporting**: Console, JSON, Markdown
✅ **CI/CD Integration**: GitHub Actions ready
✅ **Production Ready**: Battle-tested patterns

Use it to maintain performance standards and prevent regressions in your codebase!
