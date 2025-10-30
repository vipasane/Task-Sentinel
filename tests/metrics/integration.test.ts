/**
 * Task Sentinel Phase 2 - Metrics Integration Tests
 * Integration tests for metrics system with OODA loop and GOAP planner
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getMetricsCollector,
  resetMetricsCollector,
  OODAPhase,
  TaskOutcome
} from '../../src/metrics/index.js';

describe('Metrics Integration Tests', () => {
  beforeEach(() => {
    resetMetricsCollector();
  });

  describe('End-to-End OODA Loop Workflow', () => {
    it('should track complete workflow with all phases', async () => {
      const metrics = getMetricsCollector(false);
      const cycleId = 'integration-cycle-1';

      // Start OODA cycle
      metrics.startCycle(cycleId);

      // Observe Phase
      const observeId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      // Simulate observation work
      await new Promise(resolve => setTimeout(resolve, 50));
      metrics.recordPhaseEnd(observeId, true);

      // Orient Phase
      const orientId = metrics.recordPhaseStart(OODAPhase.ORIENT, cycleId);
      // Simulate orientation work
      await new Promise(resolve => setTimeout(resolve, 50));
      metrics.recordPhaseEnd(orientId, true);

      // Decide Phase (includes planning)
      const decideId = metrics.recordPhaseStart(OODAPhase.DECIDE, cycleId);

      // Generate plan
      const planStartTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100));
      const planningTime = Date.now() - planStartTime;

      metrics.recordPlanGeneration('plan-1', planningTime, 150, 7, 140, 0);
      metrics.recordPhaseEnd(decideId, true);

      // Act Phase (execute tasks)
      const actId = metrics.recordPhaseStart(OODAPhase.ACT, cycleId);

      // Execute multiple tasks
      for (let i = 0; i < 5; i++) {
        const taskStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, 30));
        const taskDuration = Date.now() - taskStart;

        metrics.recordTaskExecution(
          `task-${i}`,
          taskDuration,
          TaskOutcome.SUCCESS,
          0,
          0.85,
          0.92
        );
      }

      metrics.recordPhaseEnd(actId, true);

      // Record system metrics
      metrics.recordSystemMetrics(0.87, 0.93, 256, 3, 8, 5);

      // Complete cycle
      metrics.endCycle(cycleId, false);

      // Verify metrics
      const summary = metrics.getMetricsSummary();

      expect(summary.oodaMetrics.cycleCount).toBe(1);
      expect(summary.oodaMetrics.successRateByPhase[OODAPhase.OBSERVE]).toBe(1.0);
      expect(summary.oodaMetrics.successRateByPhase[OODAPhase.ORIENT]).toBe(1.0);
      expect(summary.oodaMetrics.successRateByPhase[OODAPhase.DECIDE]).toBe(1.0);
      expect(summary.oodaMetrics.successRateByPhase[OODAPhase.ACT]).toBe(1.0);

      expect(summary.planningMetrics.avgPlanningTime).toBeGreaterThan(0);
      expect(summary.taskMetrics.successRate).toBe(1.0);
      expect(summary.systemMetrics.avgParallelEfficiency).toBe(0.93);
    });

    it('should handle replanning workflow', async () => {
      const metrics = getMetricsCollector(false);
      const cycleId = 'replanning-cycle';

      metrics.startCycle(cycleId);

      // Initial planning
      metrics.recordPlanGeneration('plan-1', 15000, 100, 5, 90, 0);

      // Task execution fails
      metrics.recordTaskExecution('task-1', 3000, TaskOutcome.FAILURE);

      // Trigger replanning
      const decideId = metrics.recordPhaseStart(OODAPhase.DECIDE, cycleId);
      metrics.recordPlanGeneration('plan-2', 12000, 110, 6, 100, 1);
      metrics.recordPhaseEnd(decideId, true);

      // Retry task execution
      metrics.recordTaskExecution('task-1-retry', 3500, TaskOutcome.SUCCESS);

      metrics.endCycle(cycleId, true); // Replanning was triggered

      const summary = metrics.getMetricsSummary();
      expect(summary.oodaMetrics.replanningFrequency).toBe(1.0);
      expect(summary.planningMetrics.replanningRate).toBeGreaterThan(0);
    });
  });

  describe('Multi-Cycle Performance', () => {
    it('should track performance across multiple cycles', async () => {
      const metrics = getMetricsCollector(false);

      // Execute 10 cycles
      for (let i = 0; i < 10; i++) {
        const cycleId = `cycle-${i}`;
        metrics.startCycle(cycleId);

        // Quick phases
        const observeId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
        await new Promise(resolve => setTimeout(resolve, 20));
        metrics.recordPhaseEnd(observeId, true);

        const orientId = metrics.recordPhaseStart(OODAPhase.ORIENT, cycleId);
        await new Promise(resolve => setTimeout(resolve, 20));
        metrics.recordPhaseEnd(orientId, true);

        const decideId = metrics.recordPhaseStart(OODAPhase.DECIDE, cycleId);
        metrics.recordPlanGeneration(`plan-${i}`, 10000 + i * 1000, 100, 5);
        await new Promise(resolve => setTimeout(resolve, 20));
        metrics.recordPhaseEnd(decideId, true);

        const actId = metrics.recordPhaseStart(OODAPhase.ACT, cycleId);
        metrics.recordTaskExecution(`task-${i}`, 3000, TaskOutcome.SUCCESS);
        await new Promise(resolve => setTimeout(resolve, 20));
        metrics.recordPhaseEnd(actId, true);

        metrics.endCycle(cycleId, i % 3 === 0); // Replanning every 3 cycles
      }

      const summary = metrics.getMetricsSummary();

      expect(summary.oodaMetrics.cycleCount).toBe(10);
      expect(summary.planningMetrics.avgPlanningTime).toBeGreaterThan(0);
      expect(summary.oodaMetrics.replanningFrequency).toBeCloseTo(0.3, 1); // ~3/10
    });

    it('should identify performance degradation', async () => {
      const metrics = getMetricsCollector(false);

      // First 5 cycles: fast
      for (let i = 0; i < 5; i++) {
        metrics.recordTaskExecution(`fast-task-${i}`, 2000, TaskOutcome.SUCCESS, 0, 0.90, 0.95);
      }

      // Next 5 cycles: slow
      for (let i = 0; i < 5; i++) {
        metrics.recordTaskExecution(`slow-task-${i}`, 6000, TaskOutcome.SUCCESS, 0, 0.70, 0.80);
      }

      const summary = metrics.getMetricsSummary();

      // Should show degraded performance
      expect(summary.systemMetrics.avgWorkerUtilization).toBeLessThan(0.85);
      expect(summary.systemMetrics.avgParallelEfficiency).toBeLessThan(0.90);
    });
  });

  describe('High-Throughput Scenario', () => {
    it('should handle high task throughput', async () => {
      const metrics = getMetricsCollector(false);

      // Simulate 100 tasks in quick succession
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        metrics.recordTaskExecution(
          `task-${i}`,
          Math.random() * 5000 + 1000, // 1-6 seconds
          Math.random() > 0.1 ? TaskOutcome.SUCCESS : TaskOutcome.FAILURE,
          0,
          0.85,
          0.92
        );
      }

      const summary = metrics.getMetricsSummary({
        startTime,
        endTime: Date.now()
      });

      expect(summary.taskMetrics.throughput).toBeGreaterThan(0);
      expect(summary.taskMetrics.successRate).toBeGreaterThan(0.8);
    });

    it('should maintain QA standards under load', () => {
      const metrics = getMetricsCollector(false);

      // 96 successful, 4 QA failures out of 100
      for (let i = 0; i < 96; i++) {
        metrics.recordTaskExecution(`success-${i}`, 3000, TaskOutcome.SUCCESS);
      }

      for (let i = 0; i < 4; i++) {
        metrics.recordTaskExecution(`qa-fail-${i}`, 3000, TaskOutcome.QA_FAILED);
      }

      const summary = metrics.getMetricsSummary();
      expect(summary.taskMetrics.qaPassRate).toBe(0.96);
      expect(summary.kpiStatus.qaPassRate.met).toBe(true); // > 95%
    });
  });

  describe('KPI Monitoring', () => {
    it('should detect all KPIs being met', async () => {
      const metrics = getMetricsCollector(false);

      // Fast OODA cycle
      const cycleId = 'fast-cycle';
      metrics.startCycle(cycleId);
      const phaseId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      await new Promise(resolve => setTimeout(resolve, 10));
      metrics.recordPhaseEnd(phaseId, true);
      metrics.endCycle(cycleId, false);

      // Fast planning
      metrics.recordPlanGeneration('fast-plan', 15000, 100, 5);

      // High throughput (simulate 60 tasks/day)
      const oneHourMs = 60 * 60 * 1000;
      const tasksPerHour = 3; // = 72/day
      for (let i = 0; i < tasksPerHour; i++) {
        metrics.recordTaskExecution(`task-${i}`, 3000, TaskOutcome.SUCCESS);
      }

      // Good QA rate
      for (let i = 0; i < 20; i++) {
        metrics.recordTaskExecution(`qa-task-${i}`, 3000, TaskOutcome.SUCCESS);
      }

      // High parallel efficiency
      metrics.recordSystemMetrics(0.88, 0.94, 256, 2, 8, 10);

      const summary = metrics.getMetricsSummary();

      // Check KPI status
      expect(summary.kpiStatus.oodaCycleTime.met).toBe(true);
      expect(summary.kpiStatus.planningTime.met).toBe(true);
      expect(summary.kpiStatus.qaPassRate.met).toBe(true);
      expect(summary.kpiStatus.parallelEfficiency.met).toBe(true);
    });

    it('should detect KPI failures and provide actionable data', () => {
      const metrics = getMetricsCollector(false);

      // Slow planning (over 30s)
      metrics.recordPlanGeneration('slow-plan', 45000, 100, 5);

      // Low QA rate
      for (let i = 0; i < 90; i++) {
        metrics.recordTaskExecution(`success-${i}`, 3000, TaskOutcome.SUCCESS);
      }
      for (let i = 0; i < 10; i++) {
        metrics.recordTaskExecution(`qa-fail-${i}`, 3000, TaskOutcome.QA_FAILED);
      }

      // Low parallel efficiency
      metrics.recordSystemMetrics(0.70, 0.82, 256, 15, 8, 10);

      const summary = metrics.getMetricsSummary();

      expect(summary.kpiStatus.planningTime.met).toBe(false);
      expect(summary.kpiStatus.qaPassRate.met).toBe(false); // 90%
      expect(summary.kpiStatus.parallelEfficiency.met).toBe(false); // 82%

      const comparison = metrics.compareToTargets();
      expect(comparison.planningTime.variance).toBeGreaterThan(0);
      expect(comparison.qaPassRate.variance).toBeLessThan(0);
      expect(comparison.parallelEfficiency.variance).toBeLessThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      const metrics = getMetricsCollector(false);

      // Create realistic scenario
      const cycleId = 'report-cycle';
      metrics.startCycle(cycleId);

      const observeId = metrics.recordPhaseStart(OODAPhase.OBSERVE, cycleId);
      await new Promise(resolve => setTimeout(resolve, 20));
      metrics.recordPhaseEnd(observeId, true);

      metrics.recordPlanGeneration('plan-1', 22000, 125, 6, 120, 0);

      for (let i = 0; i < 15; i++) {
        metrics.recordTaskExecution(
          `task-${i}`,
          Math.random() * 4000 + 2000,
          i < 14 ? TaskOutcome.SUCCESS : TaskOutcome.QA_FAILED,
          0,
          0.85,
          0.91
        );
      }

      metrics.recordSystemMetrics(0.85, 0.91, 280, 4, 8, 12);
      metrics.endCycle(cycleId, false);

      const report = metrics.generateReport('daily');

      // Verify report contains all sections
      expect(report).toContain('OODA LOOP METRICS');
      expect(report).toContain('Average Cycle Time');
      expect(report).toContain('GOAP PLANNING METRICS');
      expect(report).toContain('TASK EXECUTION METRICS');
      expect(report).toContain('QA Pass Rate');
      expect(report).toContain('SYSTEM PERFORMANCE METRICS');
      expect(report).toContain('Parallel Efficiency');
      expect(report).toContain('KPI STATUS SUMMARY');

      // Verify KPI indicators
      expect(report).toMatch(/✓|✗/); // Should contain checkmarks or x's
    });
  });

  describe('Data Export', () => {
    it('should export metrics for external analysis', () => {
      const metrics = getMetricsCollector(false);

      // Create sample data
      metrics.recordTaskExecution('task-1', 3000, TaskOutcome.SUCCESS);
      metrics.recordPlanGeneration('plan-1', 20000, 100, 5);
      metrics.recordSystemMetrics(0.85, 0.92, 256, 3, 8, 10);

      // Export as JSON
      const jsonExport = metrics.exportMetrics('json');
      expect(jsonExport.format).toBe('json');
      expect(jsonExport.data).toHaveProperty('taskMetrics');

      // Export as CSV
      const csvExport = metrics.exportMetrics('csv');
      expect(csvExport.format).toBe('csv');
      expect(typeof csvExport.data).toBe('string');
      expect(csvExport.data).toContain('OODA');
      expect(csvExport.data).toContain('Planning');
      expect(csvExport.data).toContain('Tasks');
      expect(csvExport.data).toContain('System');
    });
  });
});
