/**
 * Performance Benchmarking System for Task Sentinel
 *
 * Automated performance testing with:
 * - Multiple benchmark types (latency, throughput, resource)
 * - Statistical analysis (mean, median, percentiles)
 * - Regression detection
 * - Performance baselines and quality gates
 */

import * as os from 'os';
import * as v8 from 'v8';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface BenchmarkConfig {
  name: string;
  description?: string;
  type: 'latency' | 'throughput' | 'memory' | 'cpu';
  operation: () => Promise<any> | any;
  warmup?: number;
  iterations?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface StatisticalResults {
  mean: number;
  median: number;
  mode?: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  outliers: number[];
  sampleSize: number;
}

export interface BenchmarkResults {
  name: string;
  type: string;
  timestamp: Date;
  duration: number;
  iterations: number;
  statistics: StatisticalResults;
  metadata?: Record<string, any>;
  passed: boolean;
  violations: QualityViolation[];
}

export interface ThroughputResults {
  name: string;
  type: 'throughput';
  timestamp: Date;
  duration: number;
  totalOperations: number;
  operationsPerSecond: number;
  operationsPerMinute: number;
  avgOperationTime: number;
  statistics: StatisticalResults;
  passed: boolean;
  violations: QualityViolation[];
}

export interface ResourceResults {
  name: string;
  type: 'memory' | 'cpu';
  timestamp: Date;
  duration: number;
  samples: ResourceSample[];
  peak: ResourceSample;
  average: ResourceSample;
  passed: boolean;
  violations: QualityViolation[];
}

export interface ResourceSample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  cpuUsage?: number;
}

export interface RegressionResult {
  regressed: boolean;
  metric: string;
  currentValue: number;
  baselineValue: number;
  degradationPercent: number;
  threshold: number;
}

export interface QualityGate {
  metric: keyof StatisticalResults | 'operationsPerSecond' | 'heapUsed' | 'cpuUsage';
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  description: string;
}

export interface QualityViolation {
  gate: QualityGate;
  actualValue: number;
  message: string;
}

export interface PerformanceBaseline {
  name: string;
  type: string;
  results: BenchmarkResults | ThroughputResults | ResourceResults;
  createdAt: Date;
}

// ============================================================================
// Statistical Analysis
// ============================================================================

export class StatisticalAnalyzer {
  /**
   * Calculate comprehensive statistics for a dataset
   */
  static analyze(data: number[]): StatisticalResults {
    if (data.length === 0) {
      throw new Error('Cannot analyze empty dataset');
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = this.mean(data);
    const variance = this.variance(data, mean);
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median: this.median(sorted),
      mode: this.mode(data),
      stdDev,
      variance,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 50),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      outliers: this.detectOutliers(data, mean, stdDev),
      sampleSize: data.length
    };
  }

  /**
   * Calculate mean (average)
   */
  static mean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  /**
   * Calculate median (50th percentile)
   */
  static median(sortedData: number[]): number {
    return this.percentile(sortedData, 50);
  }

  /**
   * Calculate mode (most frequent value)
   */
  static mode(data: number[]): number | undefined {
    const frequency = new Map<number, number>();
    let maxFreq = 0;
    let mode: number | undefined;

    for (const value of data) {
      const freq = (frequency.get(value) || 0) + 1;
      frequency.set(value, freq);

      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    }

    // Only return mode if it appears more than once
    return maxFreq > 1 ? mode : undefined;
  }

  /**
   * Calculate variance
   */
  static variance(data: number[], mean?: number): number {
    const m = mean ?? this.mean(data);
    const squaredDiffs = data.map(val => Math.pow(val - m, 2));
    return this.mean(squaredDiffs);
  }

  /**
   * Calculate percentile
   */
  static percentile(sortedData: number[], p: number): number {
    if (p < 0 || p > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const index = (p / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedData[lower];
    }

    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
  }

  /**
   * Detect outliers using standard deviation method
   */
  static detectOutliers(data: number[], mean?: number, stdDev?: number): number[] {
    const m = mean ?? this.mean(data);
    const sd = stdDev ?? Math.sqrt(this.variance(data, m));
    const threshold = 3; // 3 standard deviations

    return data.filter(val => Math.abs(val - m) > threshold * sd);
  }
}

// ============================================================================
// Performance Benchmarker
// ============================================================================

export class PerformanceBenchmarker {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private qualityGates: QualityGate[] = [];

  constructor() {
    this.initializeDefaultQualityGates();
  }

  /**
   * Initialize default quality gates
   */
  private initializeDefaultQualityGates(): void {
    this.qualityGates = [
      {
        metric: 'p95',
        operator: '<',
        threshold: 200,
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
        threshold: 512 * 1024 * 1024, // 512MB
        description: 'Memory usage must be under 512MB'
      }
    ];
  }

  /**
   * Add custom quality gate
   */
  addQualityGate(gate: QualityGate): void {
    this.qualityGates.push(gate);
  }

  /**
   * Run latency benchmark
   */
  async runLatencyBenchmark(config: BenchmarkConfig): Promise<BenchmarkResults> {
    const {
      name,
      description,
      operation,
      warmup = 10,
      iterations = 100,
      timeout = 30000,
      metadata
    } = config;

    const results: number[] = [];

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await this.executeWithTimeout(operation, timeout);
    }

    // Measurement phase
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.executeWithTimeout(operation, timeout);
      const duration = performance.now() - start;
      results.push(duration);
    }
    const totalDuration = Date.now() - startTime;

    // Statistical analysis
    const statistics = StatisticalAnalyzer.analyze(results);

    // Quality gate validation
    const violations = this.validateQualityGates(statistics, 'latency');

    return {
      name,
      type: 'latency',
      timestamp: new Date(),
      duration: totalDuration,
      iterations,
      statistics,
      metadata: { ...metadata, description },
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Run throughput benchmark
   */
  async runThroughputBenchmark(config: BenchmarkConfig): Promise<ThroughputResults> {
    const {
      name,
      description,
      operation,
      warmup = 10,
      iterations = 100,
      timeout = 30000,
      metadata
    } = config;

    const operationTimes: number[] = [];

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await this.executeWithTimeout(operation, timeout);
    }

    // Measurement phase
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.executeWithTimeout(operation, timeout);
      const duration = performance.now() - start;
      operationTimes.push(duration);
    }
    const totalDuration = Date.now() - startTime;

    // Calculate throughput metrics
    const operationsPerSecond = (iterations / totalDuration) * 1000;
    const operationsPerMinute = operationsPerSecond * 60;
    const avgOperationTime = totalDuration / iterations;

    // Statistical analysis
    const statistics = StatisticalAnalyzer.analyze(operationTimes);

    // Quality gate validation
    const violations = this.validateQualityGates(
      { ...statistics, operationsPerSecond } as any,
      'throughput'
    );

    return {
      name,
      type: 'throughput',
      timestamp: new Date(),
      duration: totalDuration,
      totalOperations: iterations,
      operationsPerSecond,
      operationsPerMinute,
      avgOperationTime,
      statistics,
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Run memory benchmark
   */
  async runMemoryBenchmark(config: BenchmarkConfig): Promise<ResourceResults> {
    const {
      name,
      description,
      operation,
      warmup = 5,
      iterations = 50,
      timeout = 30000,
      metadata
    } = config;

    const samples: ResourceSample[] = [];

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await this.executeWithTimeout(operation, timeout);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Measurement phase
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const beforeMemory = process.memoryUsage();
      await this.executeWithTimeout(operation, timeout);
      const afterMemory = process.memoryUsage();

      samples.push({
        timestamp: Date.now(),
        heapUsed: afterMemory.heapUsed,
        heapTotal: afterMemory.heapTotal,
        external: afterMemory.external,
        rss: afterMemory.rss
      });
    }
    const totalDuration = Date.now() - startTime;

    // Calculate peak and average
    const peak = this.findPeakMemory(samples);
    const average = this.calculateAverageMemory(samples);

    // Quality gate validation
    const violations = this.validateQualityGates(
      { heapUsed: peak.heapUsed } as any,
      'memory'
    );

    return {
      name,
      type: 'memory',
      timestamp: new Date(),
      duration: totalDuration,
      samples,
      peak,
      average,
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Run CPU benchmark
   */
  async runCPUBenchmark(config: BenchmarkConfig): Promise<ResourceResults> {
    const {
      name,
      description,
      operation,
      warmup = 5,
      iterations = 50,
      timeout = 30000,
      metadata
    } = config;

    const samples: ResourceSample[] = [];

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await this.executeWithTimeout(operation, timeout);
    }

    // Measurement phase
    const startTime = Date.now();
    const startCpu = process.cpuUsage();

    for (let i = 0; i < iterations; i++) {
      const iterationStartCpu = process.cpuUsage();
      const iterationStartTime = Date.now();

      await this.executeWithTimeout(operation, timeout);

      const iterationCpu = process.cpuUsage(iterationStartCpu);
      const iterationDuration = Date.now() - iterationStartTime;
      const cpuPercent = this.calculateCPUPercent(iterationCpu, iterationDuration);

      const memory = process.memoryUsage();
      samples.push({
        timestamp: Date.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
        cpuUsage: cpuPercent
      });
    }
    const totalDuration = Date.now() - startTime;

    // Calculate peak and average
    const peak = this.findPeakCPU(samples);
    const average = this.calculateAverageCPU(samples);

    // Quality gate validation
    const violations = this.validateQualityGates(
      { cpuUsage: peak.cpuUsage } as any,
      'cpu'
    );

    return {
      name,
      type: 'cpu',
      timestamp: new Date(),
      duration: totalDuration,
      samples,
      peak,
      average,
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Run all benchmark types
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResults | ThroughputResults | ResourceResults> {
    switch (config.type) {
      case 'latency':
        return this.runLatencyBenchmark(config);
      case 'throughput':
        return this.runThroughputBenchmark(config);
      case 'memory':
        return this.runMemoryBenchmark(config);
      case 'cpu':
        return this.runCPUBenchmark(config);
      default:
        throw new Error(`Unsupported benchmark type: ${config.type}`);
    }
  }

  /**
   * Detect regression against baseline
   */
  detectRegression(
    current: BenchmarkResults,
    baseline: BenchmarkResults,
    threshold: number = 1.20
  ): RegressionResult {
    // Check P95 latency regression
    if (current.statistics.p95 > baseline.statistics.p95 * threshold) {
      return {
        regressed: true,
        metric: 'p95',
        currentValue: current.statistics.p95,
        baselineValue: baseline.statistics.p95,
        degradationPercent: ((current.statistics.p95 / baseline.statistics.p95) - 1) * 100,
        threshold: threshold
      };
    }

    // Check mean latency regression
    if (current.statistics.mean > baseline.statistics.mean * threshold) {
      return {
        regressed: true,
        metric: 'mean',
        currentValue: current.statistics.mean,
        baselineValue: baseline.statistics.mean,
        degradationPercent: ((current.statistics.mean / baseline.statistics.mean) - 1) * 100,
        threshold: threshold
      };
    }

    return {
      regressed: false,
      metric: 'none',
      currentValue: 0,
      baselineValue: 0,
      degradationPercent: 0,
      threshold: threshold
    };
  }

  /**
   * Set performance baseline
   */
  setBaseline(name: string, results: BenchmarkResults | ThroughputResults | ResourceResults): void {
    this.baselines.set(name, {
      name,
      type: results.type,
      results,
      createdAt: new Date()
    });
  }

  /**
   * Get performance baseline
   */
  getBaseline(name: string): PerformanceBaseline | undefined {
    return this.baselines.get(name);
  }

  /**
   * Compare against baseline
   */
  compareToBaseline(
    name: string,
    current: BenchmarkResults,
    threshold: number = 1.20
  ): RegressionResult | null {
    const baseline = this.baselines.get(name);
    if (!baseline || baseline.results.type !== 'latency') {
      return null;
    }

    return this.detectRegression(current, baseline.results as BenchmarkResults, threshold);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout(operation: () => any, timeout: number): Promise<any> {
    return Promise.race([
      Promise.resolve(operation()),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }

  /**
   * Validate quality gates
   */
  private validateQualityGates(
    results: Partial<StatisticalResults & { operationsPerSecond?: number; heapUsed?: number; cpuUsage?: number }>,
    type: string
  ): QualityViolation[] {
    const violations: QualityViolation[] = [];

    for (const gate of this.qualityGates) {
      const value = results[gate.metric as keyof typeof results];
      if (value === undefined) continue;

      let violated = false;
      switch (gate.operator) {
        case '<':
          violated = value >= gate.threshold;
          break;
        case '>':
          violated = value <= gate.threshold;
          break;
        case '<=':
          violated = value > gate.threshold;
          break;
        case '>=':
          violated = value < gate.threshold;
          break;
      }

      if (violated) {
        violations.push({
          gate,
          actualValue: value,
          message: `${gate.description}: expected ${gate.operator} ${gate.threshold}, got ${value.toFixed(2)}`
        });
      }
    }

    return violations;
  }

  /**
   * Find peak memory usage
   */
  private findPeakMemory(samples: ResourceSample[]): ResourceSample {
    return samples.reduce((peak, sample) =>
      sample.heapUsed > peak.heapUsed ? sample : peak
    );
  }

  /**
   * Calculate average memory usage
   */
  private calculateAverageMemory(samples: ResourceSample[]): ResourceSample {
    const sum = samples.reduce(
      (acc, sample) => ({
        heapUsed: acc.heapUsed + sample.heapUsed,
        heapTotal: acc.heapTotal + sample.heapTotal,
        external: acc.external + sample.external,
        rss: acc.rss + sample.rss
      }),
      { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }
    );

    const count = samples.length;
    return {
      timestamp: Date.now(),
      heapUsed: sum.heapUsed / count,
      heapTotal: sum.heapTotal / count,
      external: sum.external / count,
      rss: sum.rss / count
    };
  }

  /**
   * Find peak CPU usage
   */
  private findPeakCPU(samples: ResourceSample[]): ResourceSample {
    return samples.reduce((peak, sample) =>
      (sample.cpuUsage || 0) > (peak.cpuUsage || 0) ? sample : peak
    );
  }

  /**
   * Calculate average CPU usage
   */
  private calculateAverageCPU(samples: ResourceSample[]): ResourceSample {
    const avgMemory = this.calculateAverageMemory(samples);
    const avgCpu = samples.reduce((sum, s) => sum + (s.cpuUsage || 0), 0) / samples.length;

    return {
      ...avgMemory,
      cpuUsage: avgCpu
    };
  }

  /**
   * Calculate CPU percentage
   */
  private calculateCPUPercent(cpuUsage: NodeJS.CpuUsage, duration: number): number {
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    const totalTime = duration * 1000; // Convert to microseconds
    return (totalCpuTime / totalTime) * 100;
  }
}

// ============================================================================
// Benchmark Reporter
// ============================================================================

export class BenchmarkReporter {
  /**
   * Generate console report
   */
  static console(results: BenchmarkResults | ThroughputResults | ResourceResults): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Benchmark Results: ${results.name}`);
    console.log('='.repeat(80));
    console.log(`Type: ${results.type}`);
    console.log(`Timestamp: ${results.timestamp.toISOString()}`);
    console.log(`Duration: ${results.duration}ms`);
    console.log(`Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    if (results.type === 'latency') {
      this.printLatencyStats(results as BenchmarkResults);
    } else if (results.type === 'throughput') {
      this.printThroughputStats(results as ThroughputResults);
    } else {
      this.printResourceStats(results as ResourceResults);
    }

    if (results.violations.length > 0) {
      console.log('\n⚠️  Quality Gate Violations:');
      for (const violation of results.violations) {
        console.log(`  - ${violation.message}`);
      }
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Print latency statistics
   */
  private static printLatencyStats(results: BenchmarkResults): void {
    const stats = results.statistics;
    console.log('Statistics:');
    console.log(`  Iterations: ${stats.sampleSize}`);
    console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
    console.log(`  Median: ${stats.median.toFixed(2)}ms`);
    console.log(`  Std Dev: ${stats.stdDev.toFixed(2)}ms`);
    console.log(`  Min: ${stats.min.toFixed(2)}ms`);
    console.log(`  Max: ${stats.max.toFixed(2)}ms`);
    console.log('');
    console.log('Percentiles:');
    console.log(`  P50: ${stats.p50.toFixed(2)}ms`);
    console.log(`  P75: ${stats.p75.toFixed(2)}ms`);
    console.log(`  P90: ${stats.p90.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);

    if (stats.outliers.length > 0) {
      console.log(`\nOutliers: ${stats.outliers.length} detected`);
    }
  }

  /**
   * Print throughput statistics
   */
  private static printThroughputStats(results: ThroughputResults): void {
    console.log('Throughput:');
    console.log(`  Total Operations: ${results.totalOperations}`);
    console.log(`  Operations/Second: ${results.operationsPerSecond.toFixed(2)}`);
    console.log(`  Operations/Minute: ${results.operationsPerMinute.toFixed(2)}`);
    console.log(`  Avg Operation Time: ${results.avgOperationTime.toFixed(2)}ms`);
    console.log('');
    console.log('Latency Distribution:');
    console.log(`  P50: ${results.statistics.p50.toFixed(2)}ms`);
    console.log(`  P95: ${results.statistics.p95.toFixed(2)}ms`);
    console.log(`  P99: ${results.statistics.p99.toFixed(2)}ms`);
  }

  /**
   * Print resource statistics
   */
  private static printResourceStats(results: ResourceResults): void {
    console.log('Resource Usage:');
    console.log(`  Samples: ${results.samples.length}`);
    console.log('');
    console.log('Peak Usage:');
    console.log(`  Heap: ${(results.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  RSS: ${(results.peak.rss / 1024 / 1024).toFixed(2)}MB`);
    if (results.peak.cpuUsage !== undefined) {
      console.log(`  CPU: ${results.peak.cpuUsage.toFixed(2)}%`);
    }
    console.log('');
    console.log('Average Usage:');
    console.log(`  Heap: ${(results.average.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  RSS: ${(results.average.rss / 1024 / 1024).toFixed(2)}MB`);
    if (results.average.cpuUsage !== undefined) {
      console.log(`  CPU: ${results.average.cpuUsage.toFixed(2)}%`);
    }
  }

  /**
   * Generate JSON report
   */
  static json(results: BenchmarkResults | ThroughputResults | ResourceResults): string {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Generate markdown report
   */
  static markdown(results: BenchmarkResults | ThroughputResults | ResourceResults): string {
    let md = `# Benchmark Results: ${results.name}\n\n`;
    md += `- **Type:** ${results.type}\n`;
    md += `- **Timestamp:** ${results.timestamp.toISOString()}\n`;
    md += `- **Duration:** ${results.duration}ms\n`;
    md += `- **Status:** ${results.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (results.type === 'latency') {
      md += this.markdownLatencyStats(results as BenchmarkResults);
    } else if (results.type === 'throughput') {
      md += this.markdownThroughputStats(results as ThroughputResults);
    } else {
      md += this.markdownResourceStats(results as ResourceResults);
    }

    if (results.violations.length > 0) {
      md += '\n## ⚠️ Quality Gate Violations\n\n';
      for (const violation of results.violations) {
        md += `- ${violation.message}\n`;
      }
    }

    return md;
  }

  private static markdownLatencyStats(results: BenchmarkResults): string {
    const stats = results.statistics;
    let md = '## Statistics\n\n';
    md += '| Metric | Value |\n';
    md += '|--------|-------|\n';
    md += `| Iterations | ${stats.sampleSize} |\n`;
    md += `| Mean | ${stats.mean.toFixed(2)}ms |\n`;
    md += `| Median | ${stats.median.toFixed(2)}ms |\n`;
    md += `| Std Dev | ${stats.stdDev.toFixed(2)}ms |\n`;
    md += `| Min | ${stats.min.toFixed(2)}ms |\n`;
    md += `| Max | ${stats.max.toFixed(2)}ms |\n\n`;

    md += '## Percentiles\n\n';
    md += '| Percentile | Value |\n';
    md += '|------------|-------|\n';
    md += `| P50 | ${stats.p50.toFixed(2)}ms |\n`;
    md += `| P75 | ${stats.p75.toFixed(2)}ms |\n`;
    md += `| P90 | ${stats.p90.toFixed(2)}ms |\n`;
    md += `| P95 | ${stats.p95.toFixed(2)}ms |\n`;
    md += `| P99 | ${stats.p99.toFixed(2)}ms |\n`;

    return md;
  }

  private static markdownThroughputStats(results: ThroughputResults): string {
    let md = '## Throughput\n\n';
    md += '| Metric | Value |\n';
    md += '|--------|-------|\n';
    md += `| Total Operations | ${results.totalOperations} |\n`;
    md += `| Operations/Second | ${results.operationsPerSecond.toFixed(2)} |\n`;
    md += `| Operations/Minute | ${results.operationsPerMinute.toFixed(2)} |\n`;
    md += `| Avg Operation Time | ${results.avgOperationTime.toFixed(2)}ms |\n`;

    return md;
  }

  private static markdownResourceStats(results: ResourceResults): string {
    let md = '## Resource Usage\n\n';
    md += '| Metric | Peak | Average |\n';
    md += '|--------|------|--------|\n';
    md += `| Heap Memory | ${(results.peak.heapUsed / 1024 / 1024).toFixed(2)}MB | ${(results.average.heapUsed / 1024 / 1024).toFixed(2)}MB |\n`;
    md += `| RSS | ${(results.peak.rss / 1024 / 1024).toFixed(2)}MB | ${(results.average.rss / 1024 / 1024).toFixed(2)}MB |\n`;

    if (results.peak.cpuUsage !== undefined) {
      md += `| CPU Usage | ${results.peak.cpuUsage.toFixed(2)}% | ${results.average.cpuUsage!.toFixed(2)}% |\n`;
    }

    return md;
  }
}
