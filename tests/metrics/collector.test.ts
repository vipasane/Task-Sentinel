/**
 * Task Sentinel Phase 2 - Metrics Collector Tests
 * Comprehensive test suite for MetricsCollector class
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
  OODAPhase,
  TaskOutcome
} from '../../src/metrics/index.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    resetMetricsCollector();
    collector = getMetricsCollector(false); // Disable memory for tests
  });

  describe('OODA Loop Tracking', () => {
    it('should track complete OODA cycle', () => {
      const cycleId = 'test-cycle-1';

      // Start cycle
      collector.startCycle(cycleId);

      // Track all phases
      const observeId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      collector.recordPhaseEnd(observeId, true);

      const orientId = collector.recordPhaseStart(OODAPhase.ORIENT, cycleId);
      collector.recordPhaseEnd(orientId, true);

      const decideId = collector.recordPhaseStart(OODAPhase.DECIDE, cycleId);
      collector.recordPhaseEnd(decideId, true);

      const actId = collector.recordPhaseStart(OODAPhase.ACT, cycleId);
      collector.recordPhaseEnd(actId, true);

      // End cycle
      collector.endCycle(cycleId, false);

      const summary = collector.getMetricsSummary();
      expect(summary.oodaMetrics.cycleCount).toBe(1);
      expect(summary.oodaMetrics.successRateByPhase[OODAPhase.OBSERVE]).toBe(1.0);
    });

    it('should track phase failures', () => {
      const cycleId = 'test-cycle-2';
      collector.startCycle(cycleId);

      const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      collector.recordPhaseEnd(phaseId, false, 'Test error');

      collector.endCycle(cycleId, false);

      const summary = collector.getMetricsSummary();
      expect(summary.oodaMetrics.successRateByPhase[OODAPhase.OBSERVE]).toBe(0);
    });

    it('should calculate average cycle time', () => {
      // Create multiple cycles with known durations
      for (let i = 0; i < 3; i++) {
        const cycleId = `cycle-${i}`;
        collector.startCycle(cycleId);

        const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
        // Simulate some duration
        collector.recordPhaseEnd(phaseId, true);

        collector.endCycle(cycleId, false);
      }

      const summary = collector.getMetricsSummary();
      expect(summary.oodaMetrics.cycleCount).toBe(3);
      expect(summary.oodaMetrics.avgCycleTime).toBeGreaterThan(0);
    });

    it('should track replanning frequency', () => {
      const cycle1 = 'cycle-1';
      collector.startCycle(cycle1);
      collector.endCycle(cycle1, true); // Replanning triggered

      const cycle2 = 'cycle-2';
      collector.startCycle(cycle2);
      collector.endCycle(cycle2, false); // No replanning

      const summary = collector.getMetricsSummary();
      expect(summary.oodaMetrics.replanningFrequency).toBe(0.5); // 1 out of 2
    });

    it('should calculate phase duration statistics', () => {
      const cycleId = 'cycle-stats';
      collector.startCycle(cycleId);

      // Create multiple phases to get meaningful stats
      for (let i = 0; i < 10; i++) {
        const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
        // Simulate varying durations
        setTimeout(() => {
          collector.recordPhaseEnd(phaseId, true);
        }, Math.random() * 10);
      }

      collector.endCycle(cycleId, false);

      const summary = collector.getMetricsSummary();
      const observeStats = summary.oodaMetrics.phaseDurations[OODAPhase.OBSERVE];

      expect(observeStats.avg).toBeGreaterThanOrEqual(0);
      expect(observeStats.min).toBeLessThanOrEqual(observeStats.avg);
      expect(observeStats.max).toBeGreaterThanOrEqual(observeStats.avg);
    });

    it('should meet OODA cycle time target', () => {
      const cycleId = 'fast-cycle';
      collector.startCycle(cycleId);

      const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      collector.recordPhaseEnd(phaseId, true);

      collector.endCycle(cycleId, false);

      const summary = collector.getMetricsSummary();
      // Should meet < 5 minute target for a simple cycle
      expect(summary.kpiStatus.oodaCycleTime.met).toBe(true);
    });
  });

  describe('Planning Metrics', () => {
    it('should record plan generation metrics', () => {
      collector.recordPlanGeneration(
        'plan-1',
        15000, // 15 seconds
        100, // cost
        5, // actions
        90, // optimal cost
        0 // replans
      );

      const summary = collector.getMetricsSummary();
      expect(summary.planningMetrics.avgPlanningTime).toBe(15000);
      expect(summary.planningMetrics.avgPlanCost).toBe(100);
      expect(summary.planningMetrics.avgActionsPerPlan).toBe(5);
      expect(summary.planningMetrics.optimalityRatio).toBeCloseTo(100 / 90, 2);
    });

    it('should track replanning rate', () => {
      collector.recordPlanGeneration('plan-1', 10000, 100, 5, undefined, 2);
      collector.recordPlanGeneration('plan-2', 12000, 110, 6, undefined, 1);
      collector.recordPlanGeneration('plan-3', 11000, 105, 5, undefined, 0);

      const summary = collector.getMetricsSummary();
      expect(summary.planningMetrics.replanningRate).toBe(1.0); // (2+1+0)/3
    });

    it('should meet planning time target', () => {
      // Planning time under 30 seconds
      collector.recordPlanGeneration('fast-plan', 20000, 100, 5);

      const summary = collector.getMetricsSummary();
      expect(summary.kpiStatus.planningTime.met).toBe(true);
    });

    it('should fail planning time target', () => {
      // Planning time over 30 seconds
      collector.recordPlanGeneration('slow-plan', 35000, 100, 5);

      const summary = collector.getMetricsSummary();
      expect(summary.kpiStatus.planningTime.met).toBe(false);
    });

    it('should calculate optimality ratio correctly', () => {
      collector.recordPlanGeneration('plan-1', 10000, 100, 5, 90);
      collector.recordPlanGeneration('plan-2', 10000, 120, 6, 100);

      const summary = collector.getMetricsSummary();
      // Average of (100/90) and (120/100)
      const expectedRatio = ((100 / 90) + (120 / 100)) / 2;
      expect(summary.planningMetrics.optimalityRatio).toBeCloseTo(expectedRatio, 2);
    });
  });

  describe('Task Execution Metrics', () => {
    it('should record task execution', () => {
      collector.recordTaskExecution(
        'task-1',
        5000, // 5 seconds
        TaskOutcome.SUCCESS,
        0, // no retries
        0.85, // 85% worker utilization
        0.92 // 92% parallel efficiency
      );

      const summary = collector.getMetricsSummary();
      expect(summary.taskMetrics.avgDuration).toBe(5000);
      expect(summary.taskMetrics.successRate).toBe(1.0);
    });

    it('should calculate task throughput', () => {
      // Record 24 tasks in 1 hour
      const oneHourMs = 60 * 60 * 1000;
      const startTime = Date.now() - oneHourMs;

      for (let i = 0; i < 24; i++) {
        collector.recordTaskExecution(
          `task-${i}`,
          3000,
          TaskOutcome.SUCCESS,
          0,
          0.85
        );
      }

      const summary = collector.getMetricsSummary({
        startTime,
        endTime: Date.now()
      });

      // Should be approximately 24 tasks/hour = 576 tasks/day
      expect(summary.taskMetrics.throughput).toBeGreaterThan(500);
    });

    it('should calculate success rate', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);
      collector.recordTaskExecution('task-2', 3000, TaskOutcome.SUCCESS);
      collector.recordTaskExecution('task-3', 3000, TaskOutcome.FAILURE);
      collector.recordTaskExecution('task-4', 3000, TaskOutcome.SUCCESS);

      const summary = collector.getMetricsSummary();
      expect(summary.taskMetrics.successRate).toBe(0.75); // 3/4
    });

    it('should calculate QA pass rate', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);
      collector.recordTaskExecution('task-2', 3000, TaskOutcome.SUCCESS);
      collector.recordTaskExecution('task-3', 3000, TaskOutcome.QA_FAILED);
      collector.recordTaskExecution('task-4', 3000, TaskOutcome.SUCCESS);

      const summary = collector.getMetricsSummary();
      expect(summary.taskMetrics.qaPassRate).toBe(0.75); // 3/4
      expect(summary.kpiStatus.qaPassRate.met).toBe(false); // < 95%
    });

    it('should track outcome breakdown', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);
      collector.recordTaskExecution('task-2', 3000, TaskOutcome.SUCCESS);
      collector.recordTaskExecution('task-3', 3000, TaskOutcome.FAILURE);
      collector.recordTaskExecution('task-4', 3000, TaskOutcome.TIMEOUT);
      collector.recordTaskExecution('task-5', 3000, TaskOutcome.QA_FAILED);

      const summary = collector.getMetricsSummary();
      const breakdown = summary.taskMetrics.outcomeBreakdown;

      expect(breakdown[TaskOutcome.SUCCESS]).toBe(0.4); // 2/5
      expect(breakdown[TaskOutcome.FAILURE]).toBe(0.2); // 1/5
      expect(breakdown[TaskOutcome.TIMEOUT]).toBe(0.2); // 1/5
      expect(breakdown[TaskOutcome.QA_FAILED]).toBe(0.2); // 1/5
    });

    it('should calculate duration percentiles', () => {
      const durations = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

      durations.forEach((duration, i) => {
        collector.recordTaskExecution(`task-${i}`, duration, TaskOutcome.SUCCESS);
      });

      const summary = collector.getMetricsSummary();
      const dist = summary.taskMetrics.durationDistribution;

      expect(dist.p50).toBeGreaterThan(0);
      expect(dist.p95).toBeGreaterThan(dist.p50);
      expect(dist.p99).toBeGreaterThanOrEqual(dist.p95);
    });
  });

  describe('System Metrics', () => {
    it('should record system metrics', () => {
      collector.recordSystemMetrics(
        0.87, // 87% worker utilization
        0.93, // 93% parallel efficiency
        256, // 256 MB memory
        5, // 5ms lock contention
        8, // 8 active workers
        12 // 12 queued tasks
      );

      const summary = collector.getMetricsSummary();
      expect(summary.systemMetrics.avgWorkerUtilization).toBe(0.87);
      expect(summary.systemMetrics.avgParallelEfficiency).toBe(0.93);
      expect(summary.systemMetrics.avgMemoryUsageMB).toBe(256);
      expect(summary.systemMetrics.peakActiveWorkers).toBe(8);
    });

    it('should track peak active workers', () => {
      collector.recordSystemMetrics(0.85, 0.90, 200, 5, 5, 10);
      collector.recordSystemMetrics(0.87, 0.91, 210, 4, 8, 12);
      collector.recordSystemMetrics(0.86, 0.92, 205, 3, 6, 11);

      const summary = collector.getMetricsSummary();
      expect(summary.systemMetrics.peakActiveWorkers).toBe(8);
    });

    it('should meet parallel efficiency target', () => {
      collector.recordSystemMetrics(0.85, 0.92, 200, 5, 8, 10);

      const summary = collector.getMetricsSummary();
      expect(summary.kpiStatus.parallelEfficiency.met).toBe(true); // > 90%
    });

    it('should fail parallel efficiency target', () => {
      collector.recordSystemMetrics(0.85, 0.85, 200, 5, 8, 10);

      const summary = collector.getMetricsSummary();
      expect(summary.kpiStatus.parallelEfficiency.met).toBe(false); // < 90%
    });
  });

  describe('Metrics Summary', () => {
    it('should generate comprehensive summary', () => {
      // Create some metrics
      const cycleId = 'cycle-1';
      collector.startCycle(cycleId);
      const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      collector.recordPhaseEnd(phaseId, true);
      collector.endCycle(cycleId, false);

      collector.recordPlanGeneration('plan-1', 20000, 100, 5);
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS, 0, 0.85);
      collector.recordSystemMetrics(0.85, 0.92, 200, 5, 8, 10);

      const summary = collector.getMetricsSummary();

      expect(summary).toHaveProperty('timeframe');
      expect(summary).toHaveProperty('oodaMetrics');
      expect(summary).toHaveProperty('planningMetrics');
      expect(summary).toHaveProperty('taskMetrics');
      expect(summary).toHaveProperty('systemMetrics');
      expect(summary).toHaveProperty('kpiStatus');
    });

    it('should filter by timeframe', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      collector.recordTaskExecution('old-task', 3000, TaskOutcome.SUCCESS);

      const summary = collector.getMetricsSummary({
        startTime: oneHourAgo,
        endTime: now
      });

      expect(summary.timeframe.start).toBe(oneHourAgo);
      expect(summary.timeframe.end).toBe(now);
    });
  });

  describe('Report Generation', () => {
    it('should generate formatted report', () => {
      // Add some metrics
      const cycleId = 'cycle-1';
      collector.startCycle(cycleId);
      const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      collector.recordPhaseEnd(phaseId, true);
      collector.endCycle(cycleId, false);

      const report = collector.generateReport('daily');

      expect(report).toContain('TASK SENTINEL PERFORMANCE METRICS REPORT');
      expect(report).toContain('OODA LOOP METRICS');
      expect(report).toContain('GOAP PLANNING METRICS');
      expect(report).toContain('TASK EXECUTION METRICS');
      expect(report).toContain('SYSTEM PERFORMANCE METRICS');
      expect(report).toContain('KPI STATUS SUMMARY');
    });

    it('should generate hourly report', () => {
      const report = collector.generateReport('hourly');
      expect(report).toContain('HOURLY');
    });

    it('should generate weekly report', () => {
      const report = collector.generateReport('weekly');
      expect(report).toContain('WEEKLY');
    });
  });

  describe('Export Functionality', () => {
    it('should export metrics as JSON', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);

      const exported = collector.exportMetrics('json');

      expect(exported.format).toBe('json');
      expect(exported).toHaveProperty('timeframe');
      expect(exported.data).toHaveProperty('taskMetrics');
    });

    it('should export metrics as CSV', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);

      const exported = collector.exportMetrics('csv');

      expect(exported.format).toBe('csv');
      expect(typeof exported.data).toBe('string');
      expect(exported.data).toContain('Category,Metric,Value,Target,Met');
    });
  });

  describe('KPI Comparison', () => {
    it('should compare metrics to targets', () => {
      // Create metrics that meet some targets and miss others
      const cycleId = 'cycle-1';
      collector.startCycle(cycleId);
      const phaseId = collector.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      collector.recordPhaseEnd(phaseId, true);
      collector.endCycle(cycleId, false);

      collector.recordPlanGeneration('plan-1', 20000, 100, 5); // Meets target
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);
      collector.recordSystemMetrics(0.85, 0.92, 200, 5, 8, 10); // Meets target

      const comparison = collector.compareToTargets();

      expect(comparison).toHaveProperty('oodaCycleTime');
      expect(comparison).toHaveProperty('planningTime');
      expect(comparison).toHaveProperty('taskThroughput');
      expect(comparison).toHaveProperty('qaPassRate');
      expect(comparison).toHaveProperty('parallelEfficiency');

      expect(comparison.planningTime.met).toBe(true);
      expect(comparison.parallelEfficiency.met).toBe(true);
    });

    it('should calculate variance from targets', () => {
      collector.recordPlanGeneration('plan-1', 35000, 100, 5); // Over target

      const comparison = collector.compareToTargets();
      expect(comparison.planningTime.variance).toBeGreaterThan(0);
      expect(comparison.planningTime.met).toBe(false);
    });
  });

  describe('Data Access', () => {
    it('should retrieve cycle metrics', () => {
      const cycleId = 'cycle-1';
      collector.startCycle(cycleId);
      collector.endCycle(cycleId, false);

      const cycles = collector.getCycleMetrics();
      expect(cycles.length).toBe(1);
      expect(cycles[0].cycleId).toBe(cycleId);
    });

    it('should retrieve planning metrics', () => {
      collector.recordPlanGeneration('plan-1', 20000, 100, 5);

      const plans = collector.getPlanningMetrics();
      expect(plans.length).toBe(1);
      expect(plans[0].planId).toBe('plan-1');
    });

    it('should retrieve task metrics', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);

      const tasks = collector.getTaskMetrics();
      expect(tasks.length).toBe(1);
      expect(tasks[0].taskId).toBe('task-1');
    });

    it('should retrieve system metrics', () => {
      collector.recordSystemMetrics(0.85, 0.92, 200, 5, 8, 10);

      const system = collector.getSystemMetrics();
      expect(system.length).toBe(1);
      expect(system[0].workerUtilization).toBe(0.85);
    });

    it('should filter metrics by query', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);

      const tasks = collector.getTaskMetrics({
        startTime: oneHourAgo,
        endTime: now
      });

      expect(tasks.length).toBe(1);
    });
  });

  describe('Clear Metrics', () => {
    it('should clear all metrics', () => {
      collector.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);
      collector.recordPlanGeneration('plan-1', 20000, 100, 5);

      collector.clearMetrics();

      expect(collector.getTaskMetrics().length).toBe(0);
      expect(collector.getPlanningMetrics().length).toBe(0);
      expect(collector.getCycleMetrics().length).toBe(0);
      expect(collector.getSystemMetrics().length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getMetricsCollector(false);
      const instance2 = getMetricsCollector(false);

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getMetricsCollector(false);
      resetMetricsCollector();
      const instance2 = getMetricsCollector(false);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Empty Metrics Handling', () => {
    it('should handle empty OODA metrics', () => {
      const summary = collector.getMetricsSummary();
      expect(summary.oodaMetrics.cycleCount).toBe(0);
      expect(summary.oodaMetrics.avgCycleTime).toBe(0);
    });

    it('should handle empty planning metrics', () => {
      const summary = collector.getMetricsSummary();
      expect(summary.planningMetrics.avgPlanningTime).toBe(0);
    });

    it('should handle empty task metrics', () => {
      const summary = collector.getMetricsSummary();
      expect(summary.taskMetrics.throughput).toBe(0);
    });

    it('should handle empty system metrics', () => {
      const summary = collector.getMetricsSummary();
      expect(summary.systemMetrics.avgWorkerUtilization).toBe(0);
    });
  });
});
