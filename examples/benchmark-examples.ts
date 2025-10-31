/**
 * Performance Benchmarking Examples for Task Sentinel
 *
 * Demonstrates various benchmarking scenarios and patterns
 */

import {
  PerformanceBenchmarker,
  BenchmarkConfig,
  BenchmarkReporter
} from '../src/qa/performance-benchmarker';

// ============================================================================
// Example 1: API Endpoint Latency Benchmark
// ============================================================================

async function benchmarkAPIEndpoint() {
  console.log('\n=== API Endpoint Latency Benchmark ===\n');

  const benchmarker = new PerformanceBenchmarker();

  // Simulate API endpoint
  const fetchUserData = async () => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
    return { id: 1, name: 'John Doe', email: 'john@example.com' };
  };

  const config: BenchmarkConfig = {
    name: 'GET /api/users/:id',
    description: 'User profile endpoint latency',
    type: 'latency',
    operation: fetchUserData,
    warmup: 10,
    iterations: 100,
    timeout: 5000,
    metadata: {
      endpoint: '/api/users/:id',
      method: 'GET',
      version: '1.0.0'
    }
  };

  const results = await benchmarker.runLatencyBenchmark(config);

  // Set as baseline for future comparisons
  benchmarker.setBaseline('user-profile-api', results);

  BenchmarkReporter.console(results);

  return results;
}

// ============================================================================
// Example 2: Database Query Throughput Benchmark
// ============================================================================

async function benchmarkDatabaseQuery() {
  console.log('\n=== Database Query Throughput Benchmark ===\n');

  const benchmarker = new PerformanceBenchmarker();

  // Simulate database query
  const queryUsers = async () => {
    // Simulate query execution
    const users = [];
    for (let i = 0; i < 100; i++) {
      users.push({
        id: i,
        name: `User ${i}`,
        createdAt: new Date()
      });
    }
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    return users;
  };

  const config: BenchmarkConfig = {
    name: 'SELECT * FROM users',
    description: 'User query throughput',
    type: 'throughput',
    operation: queryUsers,
    warmup: 5,
    iterations: 200,
    metadata: {
      database: 'postgresql',
      table: 'users',
      resultSize: 100
    }
  };

  const results = await benchmarker.runThroughputBenchmark(config);

  BenchmarkReporter.console(results);

  return results;
}

// ============================================================================
// Example 3: Memory Usage Benchmark
// ============================================================================

async function benchmarkMemoryUsage() {
  console.log('\n=== Memory Usage Benchmark ===\n');

  const benchmarker = new PerformanceBenchmarker();

  // Simulate memory-intensive operation
  const processLargeDataset = async () => {
    // Allocate memory
    const data = new Array(50000).fill(null).map((_, i) => ({
      id: i,
      value: Math.random(),
      timestamp: Date.now(),
      metadata: {
        processed: false,
        tags: ['tag1', 'tag2', 'tag3']
      }
    }));

    // Process data
    const processed = data.map(item => ({
      ...item,
      metadata: { ...item.metadata, processed: true }
    }));

    return processed.length;
  };

  const config: BenchmarkConfig = {
    name: 'Large Dataset Processing',
    description: 'Memory usage for processing 50k records',
    type: 'memory',
    operation: processLargeDataset,
    warmup: 3,
    iterations: 20,
    metadata: {
      recordCount: 50000,
      dataType: 'objects'
    }
  };

  const results = await benchmarker.runMemoryBenchmark(config);

  BenchmarkReporter.console(results);

  return results;
}

// ============================================================================
// Example 4: CPU Intensive Benchmark
// ============================================================================

async function benchmarkCPUIntensive() {
  console.log('\n=== CPU Intensive Operations Benchmark ===\n');

  const benchmarker = new PerformanceBenchmarker();

  // CPU-intensive computation
  const computePrimes = async () => {
    const isPrime = (n: number): boolean => {
      if (n <= 1) return false;
      if (n <= 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;

      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
      }
      return true;
    };

    const primes: number[] = [];
    for (let i = 0; i < 10000; i++) {
      if (isPrime(i)) {
        primes.push(i);
      }
    }

    return primes.length;
  };

  const config: BenchmarkConfig = {
    name: 'Prime Number Computation',
    description: 'CPU usage for computing primes up to 10000',
    type: 'cpu',
    operation: computePrimes,
    warmup: 3,
    iterations: 30,
    metadata: {
      algorithm: 'trial-division',
      range: 10000
    }
  };

  const results = await benchmarker.runCPUBenchmark(config);

  BenchmarkReporter.console(results);

  return results;
}

// ============================================================================
// Example 5: Regression Detection
// ============================================================================

async function demonstrateRegressionDetection() {
  console.log('\n=== Regression Detection Example ===\n');

  const benchmarker = new PerformanceBenchmarker();

  // Fast operation (baseline)
  const fastOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
  };

  // Slow operation (regression)
  const slowOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
  };

  // Run baseline
  const baselineConfig: BenchmarkConfig = {
    name: 'Task Processing (Baseline)',
    type: 'latency',
    operation: fastOperation,
    warmup: 5,
    iterations: 50
  };

  const baseline = await benchmarker.runLatencyBenchmark(baselineConfig);
  benchmarker.setBaseline('task-processing', baseline);

  console.log('✅ Baseline established\n');

  // Run current (with regression)
  const currentConfig: BenchmarkConfig = {
    name: 'Task Processing (Current)',
    type: 'latency',
    operation: slowOperation,
    warmup: 5,
    iterations: 50
  };

  const current = await benchmarker.runLatencyBenchmark(currentConfig);

  // Detect regression
  const regression = benchmarker.compareToBaseline('task-processing', current);

  if (regression?.regressed) {
    console.log('🚨 REGRESSION DETECTED!\n');
    console.log(`Metric: ${regression.metric}`);
    console.log(`Current: ${regression.currentValue.toFixed(2)}ms`);
    console.log(`Baseline: ${regression.baselineValue.toFixed(2)}ms`);
    console.log(`Degradation: ${regression.degradationPercent.toFixed(2)}%\n`);
  } else {
    console.log('✅ No regression detected\n');
  }

  return { baseline, current, regression };
}

// ============================================================================
// Example 6: Quality Gate Enforcement
// ============================================================================

async function demonstrateQualityGates() {
  console.log('\n=== Quality Gate Enforcement Example ===\n');

  const benchmarker = new PerformanceBenchmarker();

  // Add strict quality gates
  benchmarker.addQualityGate({
    metric: 'p95',
    operator: '<',
    threshold: 100,
    description: 'P95 latency must be under 100ms'
  });

  benchmarker.addQualityGate({
    metric: 'p99',
    operator: '<',
    threshold: 150,
    description: 'P99 latency must be under 150ms'
  });

  benchmarker.addQualityGate({
    metric: 'mean',
    operator: '<',
    threshold: 50,
    description: 'Mean latency must be under 50ms'
  });

  // Operation that might violate gates
  const variableLatencyOperation = async () => {
    const delay = Math.random() < 0.9 ? 30 : 120; // 10% slow requests
    await new Promise(resolve => setTimeout(resolve, delay));
  };

  const config: BenchmarkConfig = {
    name: 'Variable Latency Operation',
    type: 'latency',
    operation: variableLatencyOperation,
    warmup: 5,
    iterations: 100
  };

  const results = await benchmarker.runLatencyBenchmark(config);

  BenchmarkReporter.console(results);

  if (!results.passed) {
    console.log('\n❌ Quality gates failed! Pipeline should be blocked.\n');
  } else {
    console.log('\n✅ All quality gates passed!\n');
  }

  return results;
}

// ============================================================================
// Example 7: Comparative Benchmarking
// ============================================================================

async function comparativeAlgorithmBenchmark() {
  console.log('\n=== Comparative Algorithm Benchmark ===\n');

  const benchmarker = new PerformanceBenchmarker();

  const data = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10000));

  // Algorithm 1: Bubble Sort
  const bubbleSort = (arr: number[]) => {
    const sorted = [...arr];
    for (let i = 0; i < sorted.length; i++) {
      for (let j = 0; j < sorted.length - 1 - i; j++) {
        if (sorted[j] > sorted[j + 1]) {
          [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
        }
      }
    }
    return sorted;
  };

  // Algorithm 2: Native Sort
  const nativeSort = (arr: number[]) => {
    return [...arr].sort((a, b) => a - b);
  };

  // Benchmark both
  const config1: BenchmarkConfig = {
    name: 'Bubble Sort',
    type: 'latency',
    operation: () => bubbleSort(data),
    warmup: 3,
    iterations: 20
  };

  const config2: BenchmarkConfig = {
    name: 'Native Sort',
    type: 'latency',
    operation: () => nativeSort(data),
    warmup: 3,
    iterations: 20
  };

  const results1 = await benchmarker.runLatencyBenchmark(config1);
  const results2 = await benchmarker.runLatencyBenchmark(config2);

  console.log('Bubble Sort Results:');
  console.log(`  Mean: ${results1.statistics.mean.toFixed(2)}ms`);
  console.log(`  P95: ${results1.statistics.p95.toFixed(2)}ms\n`);

  console.log('Native Sort Results:');
  console.log(`  Mean: ${results2.statistics.mean.toFixed(2)}ms`);
  console.log(`  P95: ${results2.statistics.p95.toFixed(2)}ms\n`);

  const speedup = results1.statistics.mean / results2.statistics.mean;
  console.log(`Native Sort is ${speedup.toFixed(2)}x faster\n`);

  return { bubbleSort: results1, nativeSort: results2, speedup };
}

// ============================================================================
// Main Execution
// ============================================================================

async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Task Sentinel - Performance Benchmarking Examples         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await benchmarkAPIEndpoint();
    await benchmarkDatabaseQuery();
    await benchmarkMemoryUsage();
    await benchmarkCPUIntensive();
    await demonstrateRegressionDetection();
    await demonstrateQualityGates();
    await comparativeAlgorithmBenchmark();

    console.log('\n✅ All benchmark examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running benchmarks:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  benchmarkAPIEndpoint,
  benchmarkDatabaseQuery,
  benchmarkMemoryUsage,
  benchmarkCPUIntensive,
  demonstrateRegressionDetection,
  demonstrateQualityGates,
  comparativeAlgorithmBenchmark,
  runAllExamples
};
