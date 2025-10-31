/**
 * Comprehensive tests for Performance Benchmarker
 */

import {
  PerformanceBenchmarker,
  StatisticalAnalyzer,
  BenchmarkReporter,
  BenchmarkConfig,
  BenchmarkResults,
  ThroughputResults,
  ResourceResults
} from './performance-benchmarker';

describe('StatisticalAnalyzer', () => {
  describe('analyze', () => {
    it('should calculate comprehensive statistics', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = StatisticalAnalyzer.analyze(data);

      expect(stats.mean).toBe(5.5);
      expect(stats.median).toBe(5.5);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.sampleSize).toBe(10);
      expect(stats.p50).toBe(5.5);
      expect(stats.p95).toBeGreaterThan(9);
    });

    it('should handle single value', () => {
      const data = [42];
      const stats = StatisticalAnalyzer.analyze(data);

      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.stdDev).toBe(0);
    });

    it('should throw on empty dataset', () => {
      expect(() => StatisticalAnalyzer.analyze([])).toThrow('Cannot analyze empty dataset');
    });
  });

  describe('mean', () => {
    it('should calculate mean correctly', () => {
      expect(StatisticalAnalyzer.mean([1, 2, 3, 4, 5])).toBe(3);
      expect(StatisticalAnalyzer.mean([10, 20, 30])).toBe(20);
    });
  });

  describe('median', () => {
    it('should calculate median for odd-length array', () => {
      const sorted = [1, 2, 3, 4, 5];
      expect(StatisticalAnalyzer.median(sorted)).toBe(3);
    });

    it('should calculate median for even-length array', () => {
      const sorted = [1, 2, 3, 4];
      expect(StatisticalAnalyzer.median(sorted)).toBe(2.5);
    });
  });

  describe('mode', () => {
    it('should find mode in dataset', () => {
      const data = [1, 2, 2, 3, 4, 2, 5];
      expect(StatisticalAnalyzer.mode(data)).toBe(2);
    });

    it('should return undefined when no value repeats', () => {
      const data = [1, 2, 3, 4, 5];
      expect(StatisticalAnalyzer.mode(data)).toBeUndefined();
    });
  });

  describe('percentile', () => {
    it('should calculate percentiles correctly', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(StatisticalAnalyzer.percentile(sorted, 50)).toBe(5.5);
      expect(StatisticalAnalyzer.percentile(sorted, 90)).toBe(9.1);
      expect(StatisticalAnalyzer.percentile(sorted, 95)).toBe(9.55);
      expect(StatisticalAnalyzer.percentile(sorted, 99)).toBe(9.91);
    });

    it('should throw on invalid percentile', () => {
      const sorted = [1, 2, 3];
      expect(() => StatisticalAnalyzer.percentile(sorted, -1)).toThrow();
      expect(() => StatisticalAnalyzer.percentile(sorted, 101)).toThrow();
    });
  });

  describe('detectOutliers', () => {
    it('should detect outliers using 3-sigma rule', () => {
      const data = [1, 2, 3, 4, 5, 100]; // 100 is outlier
      const mean = StatisticalAnalyzer.mean(data);
      const variance = StatisticalAnalyzer.variance(data, mean);
      const stdDev = Math.sqrt(variance);

      const outliers = StatisticalAnalyzer.detectOutliers(data, mean, stdDev);
      expect(outliers).toContain(100);
    });

    it('should return empty array when no outliers', () => {
      const data = [1, 2, 3, 4, 5];
      const outliers = StatisticalAnalyzer.detectOutliers(data);
      expect(outliers).toHaveLength(0);
    });
  });
});

describe('PerformanceBenchmarker', () => {
  let benchmarker: PerformanceBenchmarker;

  beforeEach(() => {
    benchmarker = new PerformanceBenchmarker();
  });

  describe('runLatencyBenchmark', () => {
    it('should run latency benchmark successfully', async () => {
      const config: BenchmarkConfig = {
        name: 'Test Latency',
        type: 'latency',
        operation: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        warmup: 2,
        iterations: 10
      };

      const results = await benchmarker.runLatencyBenchmark(config);

      expect(results.name).toBe('Test Latency');
      expect(results.type).toBe('latency');
      expect(results.iterations).toBe(10);
      expect(results.statistics.sampleSize).toBe(10);
      expect(results.statistics.mean).toBeGreaterThan(0);
      expect(results.statistics.p95).toBeGreaterThan(0);
    });

    it('should detect quality gate violations', async () => {
      benchmarker.addQualityGate({
        metric: 'mean',
        operator: '<',
        threshold: 1, // Very low threshold
        description: 'Mean must be under 1ms'
      });

      const config: BenchmarkConfig = {
        name: 'Slow Operation',
        type: 'latency',
        operation: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        warmup: 1,
        iterations: 5
      };

      const results = await benchmarker.runLatencyBenchmark(config);

      expect(results.passed).toBe(false);
      expect(results.violations.length).toBeGreaterThan(0);
    });
  });

  describe('runThroughputBenchmark', () => {
    it('should run throughput benchmark successfully', async () => {
      const config: BenchmarkConfig = {
        name: 'Test Throughput',
        type: 'throughput',
        operation: async () => {
          // Simulate work
          let sum = 0;
          for (let i = 0; i < 1000; i++) sum += i;
          return sum;
        },
        warmup: 2,
        iterations: 20
      };

      const results = await benchmarker.runThroughputBenchmark(config);

      expect(results.name).toBe('Test Throughput');
      expect(results.type).toBe('throughput');
      expect(results.totalOperations).toBe(20);
      expect(results.operationsPerSecond).toBeGreaterThan(0);
      expect(results.operationsPerMinute).toBeGreaterThan(0);
      expect(results.avgOperationTime).toBeGreaterThan(0);
    });
  });

  describe('runMemoryBenchmark', () => {
    it('should run memory benchmark successfully', async () => {
      const config: BenchmarkConfig = {
        name: 'Test Memory',
        type: 'memory',
        operation: async () => {
          // Allocate some memory
          const arr = new Array(10000).fill(Math.random());
          return arr.length;
        },
        warmup: 2,
        iterations: 10
      };

      const results = await benchmarker.runMemoryBenchmark(config);

      expect(results.name).toBe('Test Memory');
      expect(results.type).toBe('memory');
      expect(results.samples.length).toBe(10);
      expect(results.peak.heapUsed).toBeGreaterThan(0);
      expect(results.average.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('runCPUBenchmark', () => {
    it('should run CPU benchmark successfully', async () => {
      const config: BenchmarkConfig = {
        name: 'Test CPU',
        type: 'cpu',
        operation: async () => {
          // CPU-intensive work
          let sum = 0;
          for (let i = 0; i < 100000; i++) {
            sum += Math.sqrt(i) * Math.sin(i);
          }
          return sum;
        },
        warmup: 2,
        iterations: 10
      };

      const results = await benchmarker.runCPUBenchmark(config);

      expect(results.name).toBe('Test CPU');
      expect(results.type).toBe('cpu');
      expect(results.samples.length).toBe(10);
      expect(results.peak.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(results.average.cpuUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectRegression', () => {
    it('should detect performance regression', () => {
      const baseline: BenchmarkResults = {
        name: 'test',
        type: 'latency',
        timestamp: new Date(),
        duration: 1000,
        iterations: 100,
        statistics: {
          mean: 10,
          median: 10,
          stdDev: 2,
          variance: 4,
          min: 5,
          max: 15,
          p50: 10,
          p75: 12,
          p90: 14,
          p95: 15,
          p99: 15,
          outliers: [],
          sampleSize: 100
        },
        passed: true,
        violations: []
      };

      const current: BenchmarkResults = {
        ...baseline,
        statistics: {
          ...baseline.statistics,
          p95: 20, // 100% worse
          mean: 15  // 50% worse
        }
      };

      const regression = benchmarker.detectRegression(current, baseline, 1.2);

      expect(regression.regressed).toBe(true);
      expect(regression.metric).toBe('p95');
      expect(regression.degradationPercent).toBeGreaterThan(20);
    });

    it('should not detect regression when performance improves', () => {
      const baseline: BenchmarkResults = {
        name: 'test',
        type: 'latency',
        timestamp: new Date(),
        duration: 1000,
        iterations: 100,
        statistics: {
          mean: 10,
          median: 10,
          stdDev: 2,
          variance: 4,
          min: 5,
          max: 15,
          p50: 10,
          p75: 12,
          p90: 14,
          p95: 15,
          p99: 15,
          outliers: [],
          sampleSize: 100
        },
        passed: true,
        violations: []
      };

      const current: BenchmarkResults = {
        ...baseline,
        statistics: {
          ...baseline.statistics,
          p95: 12, // Improved
          mean: 8   // Improved
        }
      };

      const regression = benchmarker.detectRegression(current, baseline, 1.2);

      expect(regression.regressed).toBe(false);
    });
  });

  describe('baseline management', () => {
    it('should set and get baseline', () => {
      const results: BenchmarkResults = {
        name: 'test',
        type: 'latency',
        timestamp: new Date(),
        duration: 1000,
        iterations: 100,
        statistics: {
          mean: 10,
          median: 10,
          stdDev: 2,
          variance: 4,
          min: 5,
          max: 15,
          p50: 10,
          p75: 12,
          p90: 14,
          p95: 15,
          p99: 15,
          outliers: [],
          sampleSize: 100
        },
        passed: true,
        violations: []
      };

      benchmarker.setBaseline('test-baseline', results);
      const baseline = benchmarker.getBaseline('test-baseline');

      expect(baseline).toBeDefined();
      expect(baseline?.name).toBe('test-baseline');
      expect(baseline?.results).toEqual(results);
    });

    it('should compare to baseline', () => {
      const baseline: BenchmarkResults = {
        name: 'test',
        type: 'latency',
        timestamp: new Date(),
        duration: 1000,
        iterations: 100,
        statistics: {
          mean: 10,
          median: 10,
          stdDev: 2,
          variance: 4,
          min: 5,
          max: 15,
          p50: 10,
          p75: 12,
          p90: 14,
          p95: 15,
          p99: 15,
          outliers: [],
          sampleSize: 100
        },
        passed: true,
        violations: []
      };

      benchmarker.setBaseline('test', baseline);

      const current: BenchmarkResults = {
        ...baseline,
        statistics: {
          ...baseline.statistics,
          p95: 20
        }
      };

      const regression = benchmarker.compareToBaseline('test', current);

      expect(regression).not.toBeNull();
      expect(regression?.regressed).toBe(true);
    });
  });

  describe('quality gates', () => {
    it('should validate custom quality gates', async () => {
      benchmarker.addQualityGate({
        metric: 'p99',
        operator: '<',
        threshold: 50,
        description: 'P99 must be under 50ms'
      });

      const config: BenchmarkConfig = {
        name: 'Custom Gate Test',
        type: 'latency',
        operation: async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        },
        warmup: 1,
        iterations: 10
      };

      const results = await benchmarker.runLatencyBenchmark(config);

      // Should pass since we're only waiting 5ms
      expect(results.violations.length).toBeLessThanOrEqual(1);
    });
  });
});

describe('BenchmarkReporter', () => {
  let mockResults: BenchmarkResults;

  beforeEach(() => {
    mockResults = {
      name: 'Test Benchmark',
      type: 'latency',
      timestamp: new Date('2025-01-01T00:00:00Z'),
      duration: 1000,
      iterations: 100,
      statistics: {
        mean: 10.5,
        median: 10,
        stdDev: 2.5,
        variance: 6.25,
        min: 5,
        max: 20,
        p50: 10,
        p75: 12,
        p90: 15,
        p95: 17,
        p99: 19,
        outliers: [20],
        sampleSize: 100
      },
      passed: true,
      violations: []
    };
  });

  describe('console', () => {
    it('should generate console report without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      BenchmarkReporter.console(mockResults);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call =>
        call[0].includes('Test Benchmark')
      )).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('json', () => {
    it('should generate valid JSON report', () => {
      const json = BenchmarkReporter.json(mockResults);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('Test Benchmark');
      expect(parsed.type).toBe('latency');
      expect(parsed.statistics.mean).toBe(10.5);
    });
  });

  describe('markdown', () => {
    it('should generate markdown report', () => {
      const markdown = BenchmarkReporter.markdown(mockResults);

      expect(markdown).toContain('# Benchmark Results: Test Benchmark');
      expect(markdown).toContain('**Type:** latency');
      expect(markdown).toContain('✅ PASSED');
      expect(markdown).toContain('| Mean | 10.50ms |');
      expect(markdown).toContain('| P95 | 17.00ms |');
    });

    it('should include violations in markdown', () => {
      const resultsWithViolations = {
        ...mockResults,
        passed: false,
        violations: [{
          gate: {
            metric: 'p95' as const,
            operator: '<' as const,
            threshold: 15,
            description: 'P95 must be under 15ms'
          },
          actualValue: 17,
          message: 'P95 must be under 15ms: expected < 15, got 17.00'
        }]
      };

      const markdown = BenchmarkReporter.markdown(resultsWithViolations);

      expect(markdown).toContain('❌ FAILED');
      expect(markdown).toContain('⚠️ Quality Gate Violations');
      expect(markdown).toContain('P95 must be under 15ms');
    });
  });
});
