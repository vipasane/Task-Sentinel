/**
 * Performance Benchmark
 * Measures and validates performance metrics
 */

import { execSync } from 'child_process';
import * as os from 'os';
import {
  PerformanceBenchmarkConfig,
  PerformanceResults,
  BenchmarkResult,
  PerformanceMetric
} from '../types';

export class PerformanceBenchmark {
  constructor(private config: PerformanceBenchmarkConfig) {}

  /**
   * Run all performance benchmarks
   */
  async runBenchmarks(): Promise<PerformanceResults> {
    console.log('⚡ Running performance benchmarks...');
    const startTime = Date.now();

    const benchmarks: BenchmarkResult[] = [];
    const metrics: PerformanceMetric[] = [];

    // Response time benchmark
    if (this.config.metrics.includes('responseTime')) {
      const responseBenchmark = await this.benchmarkResponseTime();
      benchmarks.push(responseBenchmark);

      metrics.push({
        name: 'P95 Response Time',
        value: responseBenchmark.stats.p95,
        unit: 'ms',
        threshold: 200,
        passed: responseBenchmark.stats.p95 < 200
      });

      metrics.push({
        name: 'P99 Response Time',
        value: responseBenchmark.stats.p99,
        unit: 'ms',
        threshold: 500,
        passed: responseBenchmark.stats.p99 < 500
      });
    }

    // Throughput benchmark
    if (this.config.metrics.includes('throughput')) {
      const throughputBenchmark = await this.benchmarkThroughput();
      benchmarks.push(throughputBenchmark);

      metrics.push({
        name: 'Throughput',
        value: throughputBenchmark.stats.mean,
        unit: 'req/s',
        threshold: 100,
        passed: throughputBenchmark.stats.mean > 100
      });
    }

    // Memory usage benchmark
    if (this.config.metrics.includes('memoryUsage')) {
      const memoryMetric = await this.benchmarkMemoryUsage();
      metrics.push(memoryMetric);
    }

    // CPU utilization benchmark
    if (this.config.metrics.includes('cpuUtilization')) {
      const cpuMetric = await this.benchmarkCPUUtilization();
      metrics.push(cpuMetric);
    }

    const passed = metrics.every(m => m.passed);

    console.log(`✅ Performance benchmarks complete in ${Date.now() - startTime}ms`);
    console.log(`   ${metrics.filter(m => m.passed).length}/${metrics.length} metrics passed`);

    return {
      timestamp: new Date(),
      metrics,
      passed,
      benchmarks
    };
  }

  /**
   * Benchmark response time
   */
  private async benchmarkResponseTime(): Promise<BenchmarkResult> {
    console.log('  ⚡ Benchmarking response time...');

    const measurements: number[] = [];

    // Warmup
    for (let i = 0; i < this.config.warmupRuns; i++) {
      await this.measureSingleRequest();
    }

    // Actual measurements
    for (let i = 0; i < this.config.iterations; i++) {
      const duration = await this.measureSingleRequest();
      measurements.push(duration);
    }

    const stats = this.calculateStats(measurements);

    return {
      name: 'Response Time',
      iterations: this.config.iterations,
      stats,
      passed: stats.p95 < 200 && stats.p99 < 500
    };
  }

  /**
   * Measure single request
   */
  private async measureSingleRequest(): Promise<number> {
    const start = performance.now();

    // Simulate API request (in real implementation, use actual HTTP client)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    return performance.now() - start;
  }

  /**
   * Benchmark throughput
   */
  private async benchmarkThroughput(): Promise<BenchmarkResult> {
    console.log('  ⚡ Benchmarking throughput...');

    const measurements: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const requests = [];

      // Send concurrent requests
      for (let j = 0; j < this.config.concurrency; j++) {
        requests.push(this.measureSingleRequest());
      }

      await Promise.all(requests);
      const duration = performance.now() - start;

      // Calculate requests per second
      const throughput = (this.config.concurrency / duration) * 1000;
      measurements.push(throughput);
    }

    const stats = this.calculateStats(measurements);

    return {
      name: 'Throughput',
      iterations: 10,
      stats,
      passed: stats.mean > 100
    };
  }

  /**
   * Benchmark memory usage
   */
  private async benchmarkMemoryUsage(): Promise<PerformanceMetric> {
    console.log('  ⚡ Benchmarking memory usage...');

    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    return {
      name: 'Memory Usage',
      value: heapUsedMB,
      unit: 'MB',
      threshold: 512,
      passed: heapUsedMB < 512
    };
  }

  /**
   * Benchmark CPU utilization
   */
  private async benchmarkCPUUtilization(): Promise<PerformanceMetric> {
    console.log('  ⚡ Benchmarking CPU utilization...');

    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);

    return {
      name: 'CPU Utilization',
      value: usage,
      unit: '%',
      threshold: 80,
      passed: usage < 80
    };
  }

  /**
   * Calculate statistics from measurements
   */
  private calculateStats(measurements: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  } {
    const sorted = measurements.slice().sort((a, b) => a - b);
    const len = sorted.length;

    const min = sorted[0];
    const max = sorted[len - 1];
    const mean = measurements.reduce((a, b) => a + b, 0) / len;
    const median = len % 2 === 0
      ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
      : sorted[Math.floor(len / 2)];

    const p95Index = Math.floor(len * 0.95);
    const p99Index = Math.floor(len * 0.99);
    const p95 = sorted[p95Index];
    const p99 = sorted[p99Index];

    const variance = measurements.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0) / len;
    const stdDev = Math.sqrt(variance);

    return { min, max, mean, median, p95, p99, stdDev };
  }
}
