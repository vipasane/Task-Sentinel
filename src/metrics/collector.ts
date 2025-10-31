/**
 * Task Sentinel Phase 2 - Metrics Collector
 * Comprehensive metrics collection for OODA loop and system performance
 */

import {
  OODAPhase,
  TaskOutcome,
  PhaseMetric,
  PlanningMetric,
  TaskExecutionMetric,
  SystemMetric,
  OODACycleMetric,
  MetricsSummary,
  MetricsAggregation,
  MetricsExport,
  MetricsQuery
} from './types.js';

// KPI Targets
const KPI_TARGETS = {
  OODA_CYCLE_TIME_MS: 5 * 60 * 1000, // 5 minutes
  PLANNING_TIME_MS: 30 * 1000, // 30 seconds
  TASK_THROUGHPUT_PER_DAY: 50,
  QA_PASS_RATE: 0.95, // 95%
  PARALLEL_EFFICIENCY: 0.90 // 90%
};

export class MetricsCollector {
  private activeCycles: Map<string, OODACycleMetric> = new Map();
  private activePhases: Map<string, PhaseMetric> = new Map();
  private cycleMetrics: OODACycleMetric[] = [];
  private planningMetrics: PlanningMetric[] = [];
  private taskMetrics: TaskExecutionMetric[] = [];
  private systemMetrics: SystemMetric[] = [];

  private namespace = 'task-sentinel/metrics';
  private readonly TTL_DAYS = 90;

  constructor(private memoryEnabled: boolean = true) {}

  // ============================================================================
  // OODA Loop Phase Tracking
  // ============================================================================

  /**
   * Record the start of an OODA loop cycle
   */
  startCycle(cycleId: string): void {
    const cycle: OODACycleMetric = {
      cycleId,
      startTime: Date.now(),
      phases: [],
      replanningTriggered: false,
      successRate: 0
    };

    this.activeCycles.set(cycleId, cycle);
  }

  /**
   * Record the start of an OODA phase
   */
  recordPhaseStart(phase: OODAPhase, cycleId?: string): string {
    const phaseId = `${phase}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const phaseMetric: PhaseMetric = {
      phase,
      startTime: Date.now(),
      success: false
    };

    this.activePhases.set(phaseId, phaseMetric);

    // Add to active cycle if provided
    if (cycleId && this.activeCycles.has(cycleId)) {
      const cycle = this.activeCycles.get(cycleId)!;
      cycle.phases.push(phaseMetric);
    }

    return phaseId;
  }

  /**
   * Record the end of an OODA phase
   */
  async recordPhaseEnd(phaseId: string, success: boolean, errorMessage?: string): Promise<void> {
    const phaseMetric = this.activePhases.get(phaseId);

    if (!phaseMetric) {
      console.warn(`Phase ${phaseId} not found in active phases`);
      return;
    }

    phaseMetric.endTime = Date.now();
    phaseMetric.duration = phaseMetric.endTime - phaseMetric.startTime;
    phaseMetric.success = success;
    if (errorMessage) {
      phaseMetric.errorMessage = errorMessage;
    }

    this.activePhases.delete(phaseId);

    // Store in memory if enabled
    if (this.memoryEnabled) {
      await this.storeMetric('ooda/phase', phaseMetric);
    }
  }

  /**
   * Complete an OODA cycle
   */
  async endCycle(cycleId: string, replanningTriggered: boolean = false): Promise<void> {
    const cycle = this.activeCycles.get(cycleId);

    if (!cycle) {
      console.warn(`Cycle ${cycleId} not found in active cycles`);
      return;
    }

    cycle.endTime = Date.now();
    cycle.totalDuration = cycle.endTime - cycle.startTime;
    cycle.replanningTriggered = replanningTriggered;

    // Calculate success rate
    const successfulPhases = cycle.phases.filter(p => p.success).length;
    cycle.successRate = cycle.phases.length > 0
      ? successfulPhases / cycle.phases.length
      : 0;

    this.cycleMetrics.push(cycle);
    this.activeCycles.delete(cycleId);

    // Store in memory
    if (this.memoryEnabled) {
      await this.storeMetric('ooda/cycle', cycle);
    }
  }

  // ============================================================================
  // GOAP Planning Metrics
  // ============================================================================

  /**
   * Record plan generation metrics
   */
  async recordPlanGeneration(
    planId: string,
    planningTime: number,
    planCost: number,
    actionsCount: number,
    optimalCost?: number,
    replanningCount: number = 0
  ): Promise<void> {
    const metric: PlanningMetric = {
      planId,
      timestamp: Date.now(),
      planningTime,
      planCost,
      actionsCount,
      optimalCost,
      replanningCount
    };

    this.planningMetrics.push(metric);

    if (this.memoryEnabled) {
      await this.storeMetric('planning', metric);
    }
  }

  // ============================================================================
  // Task Execution Metrics
  // ============================================================================

  /**
   * Record task execution
   */
  async recordTaskExecution(
    taskId: string,
    duration: number,
    outcome: TaskOutcome,
    retryCount: number = 0,
    workerUtilization: number = 0,
    parallelEfficiency?: number
  ): Promise<void> {
    const metric: TaskExecutionMetric = {
      taskId,
      timestamp: Date.now(),
      duration,
      outcome,
      retryCount,
      workerUtilization,
      parallelEfficiency
    };

    this.taskMetrics.push(metric);

    if (this.memoryEnabled) {
      await this.storeMetric('task', metric);
    }
  }

  // ============================================================================
  // System Performance Metrics
  // ============================================================================

  /**
   * Record system performance snapshot
   */
  async recordSystemMetrics(
    workerUtilization: number,
    parallelEfficiency: number,
    memoryUsageMB: number,
    lockContentionMs: number,
    activeWorkers: number,
    queuedTasks: number
  ): Promise<void> {
    const metric: SystemMetric = {
      timestamp: Date.now(),
      workerUtilization,
      parallelEfficiency,
      memoryUsageMB,
      lockContentionMs,
      activeWorkers,
      queuedTasks
    };

    this.systemMetrics.push(metric);

    if (this.memoryEnabled) {
      await this.storeMetric('system', metric);
    }
  }

  // ============================================================================
  // Metrics Summary and Reporting
  // ============================================================================

  /**
   * Get comprehensive metrics summary
   */
  getMetricsSummary(query?: MetricsQuery): MetricsSummary {
    const now = Date.now();
    const startTime = query?.startTime || (now - 24 * 60 * 60 * 1000); // Default 24h
    const endTime = query?.endTime || now;

    // Filter metrics by timeframe
    const filteredCycles = this.cycleMetrics.filter(
      m => m.startTime >= startTime && m.startTime <= endTime
    );
    const filteredPlanning = this.planningMetrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
    const filteredTasks = this.taskMetrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
    const filteredSystem = this.systemMetrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    // Calculate OODA metrics
    const oodaMetrics = this.calculateOODAMetrics(filteredCycles);

    // Calculate planning metrics
    const planningMetrics = this.calculatePlanningMetrics(filteredPlanning);

    // Calculate task metrics
    const taskMetrics = this.calculateTaskMetrics(filteredTasks, endTime - startTime);

    // Calculate system metrics
    const systemMetrics = this.calculateSystemMetrics(filteredSystem);

    // Determine KPI status
    const kpiStatus = {
      oodaCycleTime: {
        target: KPI_TARGETS.OODA_CYCLE_TIME_MS,
        actual: oodaMetrics.avgCycleTime,
        met: oodaMetrics.targetMet
      },
      planningTime: {
        target: KPI_TARGETS.PLANNING_TIME_MS,
        actual: planningMetrics.avgPlanningTime,
        met: planningMetrics.targetMet
      },
      taskThroughput: {
        target: KPI_TARGETS.TASK_THROUGHPUT_PER_DAY,
        actual: taskMetrics.throughput,
        met: taskMetrics.targetMet
      },
      qaPassRate: {
        target: KPI_TARGETS.QA_PASS_RATE,
        actual: taskMetrics.qaPassRate,
        met: taskMetrics.qaTargetMet
      },
      parallelEfficiency: {
        target: KPI_TARGETS.PARALLEL_EFFICIENCY,
        actual: systemMetrics.avgParallelEfficiency,
        met: systemMetrics.parallelTargetMet
      }
    };

    return {
      timeframe: {
        start: startTime,
        end: endTime,
        durationMs: endTime - startTime
      },
      oodaMetrics,
      planningMetrics,
      taskMetrics,
      systemMetrics,
      kpiStatus
    };
  }

  /**
   * Generate formatted report
   */
  generateReport(timeframe: 'hourly' | 'daily' | 'weekly' = 'daily'): string {
    const now = Date.now();
    let startTime: number;

    switch (timeframe) {
      case 'hourly':
        startTime = now - 60 * 60 * 1000;
        break;
      case 'daily':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
    }

    const summary = this.getMetricsSummary({ startTime, endTime: now });

    return this.formatReport(summary, timeframe);
  }

  /**
   * Export metrics in specified format
   */
  exportMetrics(format: 'json' | 'csv', query?: MetricsQuery): MetricsExport {
    const summary = this.getMetricsSummary(query);

    if (format === 'json') {
      return {
        format: 'json',
        timeframe: summary.timeframe,
        data: summary
      };
    } else {
      return {
        format: 'csv',
        timeframe: summary.timeframe,
        data: this.convertToCSV(summary)
      };
    }
  }

  /**
   * Compare current metrics to targets
   */
  compareToTargets(): Record<string, { target: number; actual: number; met: boolean; variance: number }> {
    const summary = this.getMetricsSummary();

    return {
      oodaCycleTime: {
        target: KPI_TARGETS.OODA_CYCLE_TIME_MS,
        actual: summary.oodaMetrics.avgCycleTime,
        met: summary.kpiStatus.oodaCycleTime.met,
        variance: ((summary.oodaMetrics.avgCycleTime - KPI_TARGETS.OODA_CYCLE_TIME_MS) / KPI_TARGETS.OODA_CYCLE_TIME_MS) * 100
      },
      planningTime: {
        target: KPI_TARGETS.PLANNING_TIME_MS,
        actual: summary.planningMetrics.avgPlanningTime,
        met: summary.kpiStatus.planningTime.met,
        variance: ((summary.planningMetrics.avgPlanningTime - KPI_TARGETS.PLANNING_TIME_MS) / KPI_TARGETS.PLANNING_TIME_MS) * 100
      },
      taskThroughput: {
        target: KPI_TARGETS.TASK_THROUGHPUT_PER_DAY,
        actual: summary.taskMetrics.throughput,
        met: summary.kpiStatus.taskThroughput.met,
        variance: ((summary.taskMetrics.throughput - KPI_TARGETS.TASK_THROUGHPUT_PER_DAY) / KPI_TARGETS.TASK_THROUGHPUT_PER_DAY) * 100
      },
      qaPassRate: {
        target: KPI_TARGETS.QA_PASS_RATE,
        actual: summary.taskMetrics.qaPassRate,
        met: summary.kpiStatus.qaPassRate.met,
        variance: ((summary.taskMetrics.qaPassRate - KPI_TARGETS.QA_PASS_RATE) / KPI_TARGETS.QA_PASS_RATE) * 100
      },
      parallelEfficiency: {
        target: KPI_TARGETS.PARALLEL_EFFICIENCY,
        actual: summary.systemMetrics.avgParallelEfficiency,
        met: summary.kpiStatus.parallelEfficiency.met,
        variance: ((summary.systemMetrics.avgParallelEfficiency - KPI_TARGETS.PARALLEL_EFFICIENCY) / KPI_TARGETS.PARALLEL_EFFICIENCY) * 100
      }
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateOODAMetrics(cycles: OODACycleMetric[]) {
    if (cycles.length === 0) {
      return this.getEmptyOODAMetrics();
    }

    const cycleTimes = cycles
      .filter(c => c.totalDuration !== undefined)
      .map(c => c.totalDuration!);

    const avgCycleTime = this.average(cycleTimes);

    // Calculate phase durations
    const phaseDurations: Record<OODAPhase, number[]> = {
      [OODAPhase.OBSERVE]: [],
      [OODAPhase.ORIENT]: [],
      [OODAPhase.DECIDE]: [],
      [OODAPhase.ACT]: []
    };

    cycles.forEach(cycle => {
      cycle.phases.forEach(phase => {
        if (phase.duration !== undefined) {
          phaseDurations[phase.phase].push(phase.duration);
        }
      });
    });

    const phaseDurationStats: any = {};
    Object.keys(phaseDurations).forEach(phase => {
      const durations = phaseDurations[phase as OODAPhase];
      if (durations.length > 0) {
        phaseDurationStats[phase] = {
          avg: this.average(durations),
          min: Math.min(...durations),
          max: Math.max(...durations),
          p95: this.percentile(durations, 95)
        };
      } else {
        phaseDurationStats[phase] = {
          avg: 0, min: 0, max: 0, p95: 0
        };
      }
    });

    // Calculate success rates by phase
    const successRateByPhase: any = {};
    Object.values(OODAPhase).forEach(phase => {
      const phaseMetrics = cycles.flatMap(c => c.phases).filter(p => p.phase === phase);
      const successCount = phaseMetrics.filter(p => p.success).length;
      successRateByPhase[phase] = phaseMetrics.length > 0
        ? successCount / phaseMetrics.length
        : 0;
    });

    const replanningCount = cycles.filter(c => c.replanningTriggered).length;

    return {
      avgCycleTime,
      cycleCount: cycles.length,
      targetMet: avgCycleTime < KPI_TARGETS.OODA_CYCLE_TIME_MS,
      phaseDurations: phaseDurationStats,
      replanningFrequency: cycles.length > 0 ? replanningCount / cycles.length : 0,
      successRateByPhase
    };
  }

  private calculatePlanningMetrics(plans: PlanningMetric[]) {
    if (plans.length === 0) {
      return this.getEmptyPlanningMetrics();
    }

    const planningTimes = plans.map(p => p.planningTime);
    const avgPlanningTime = this.average(planningTimes);

    const avgPlanCost = this.average(plans.map(p => p.planCost));
    const avgActionsPerPlan = this.average(plans.map(p => p.actionsCount));

    // Calculate optimality ratio
    const plansWithOptimal = plans.filter(p => p.optimalCost !== undefined);
    const optimalityRatio = plansWithOptimal.length > 0
      ? this.average(plansWithOptimal.map(p => p.planCost / p.optimalCost!))
      : 1.0;

    const totalReplans = plans.reduce((sum, p) => sum + p.replanningCount, 0);
    const replanningRate = totalReplans / (plans.length > 0 ? plans.length : 1);

    return {
      avgPlanningTime,
      targetMet: avgPlanningTime < KPI_TARGETS.PLANNING_TIME_MS,
      avgPlanCost,
      avgActionsPerPlan,
      optimalityRatio,
      replanningRate
    };
  }

  private calculateTaskMetrics(tasks: TaskExecutionMetric[], timeframeMs: number) {
    if (tasks.length === 0) {
      return this.getEmptyTaskMetrics();
    }

    // Calculate throughput (tasks per day)
    const tasksPerMs = tasks.length / timeframeMs;
    const throughput = tasksPerMs * (24 * 60 * 60 * 1000);

    const durations = tasks.map(t => t.duration);
    const avgDuration = this.average(durations);

    const durationDistribution = {
      p50: this.percentile(durations, 50),
      p75: this.percentile(durations, 75),
      p90: this.percentile(durations, 90),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99)
    };

    // Success rate
    const successCount = tasks.filter(t => t.outcome === TaskOutcome.SUCCESS).length;
    const successRate = successCount / tasks.length;

    // Outcome breakdown
    const outcomeBreakdown: any = {};
    Object.values(TaskOutcome).forEach(outcome => {
      const count = tasks.filter(t => t.outcome === outcome).length;
      outcomeBreakdown[outcome] = count / tasks.length;
    });

    // QA pass rate (success + not QA failed)
    const qaFailedCount = tasks.filter(t => t.outcome === TaskOutcome.QA_FAILED).length;
    const qaPassRate = 1 - (qaFailedCount / tasks.length);

    return {
      throughput,
      targetMet: throughput > KPI_TARGETS.TASK_THROUGHPUT_PER_DAY,
      avgDuration,
      durationDistribution,
      successRate,
      outcomeBreakdown,
      qaPassRate,
      qaTargetMet: qaPassRate >= KPI_TARGETS.QA_PASS_RATE
    };
  }

  private calculateSystemMetrics(metrics: SystemMetric[]) {
    if (metrics.length === 0) {
      return this.getEmptySystemMetrics();
    }

    const avgWorkerUtilization = this.average(metrics.map(m => m.workerUtilization));
    const avgParallelEfficiency = this.average(metrics.map(m => m.parallelEfficiency));
    const avgMemoryUsageMB = this.average(metrics.map(m => m.memoryUsageMB));
    const avgLockContentionMs = this.average(metrics.map(m => m.lockContentionMs));
    const peakActiveWorkers = Math.max(...metrics.map(m => m.activeWorkers));

    return {
      avgWorkerUtilization,
      avgParallelEfficiency,
      parallelTargetMet: avgParallelEfficiency >= KPI_TARGETS.PARALLEL_EFFICIENCY,
      avgMemoryUsageMB,
      avgLockContentionMs,
      peakActiveWorkers
    };
  }

  private getEmptyOODAMetrics() {
    return {
      avgCycleTime: 0,
      cycleCount: 0,
      targetMet: false,
      phaseDurations: {
        [OODAPhase.OBSERVE]: { avg: 0, min: 0, max: 0, p95: 0 },
        [OODAPhase.ORIENT]: { avg: 0, min: 0, max: 0, p95: 0 },
        [OODAPhase.DECIDE]: { avg: 0, min: 0, max: 0, p95: 0 },
        [OODAPhase.ACT]: { avg: 0, min: 0, max: 0, p95: 0 }
      },
      replanningFrequency: 0,
      successRateByPhase: {
        [OODAPhase.OBSERVE]: 0,
        [OODAPhase.ORIENT]: 0,
        [OODAPhase.DECIDE]: 0,
        [OODAPhase.ACT]: 0
      }
    };
  }

  private getEmptyPlanningMetrics() {
    return {
      avgPlanningTime: 0,
      targetMet: false,
      avgPlanCost: 0,
      avgActionsPerPlan: 0,
      optimalityRatio: 1.0,
      replanningRate: 0
    };
  }

  private getEmptyTaskMetrics() {
    return {
      throughput: 0,
      targetMet: false,
      avgDuration: 0,
      durationDistribution: {
        p50: 0, p75: 0, p90: 0, p95: 0, p99: 0
      },
      successRate: 0,
      outcomeBreakdown: {
        [TaskOutcome.SUCCESS]: 0,
        [TaskOutcome.FAILURE]: 0,
        [TaskOutcome.TIMEOUT]: 0,
        [TaskOutcome.CANCELLED]: 0,
        [TaskOutcome.QA_FAILED]: 0
      },
      qaPassRate: 0,
      qaTargetMet: false
    };
  }

  private getEmptySystemMetrics() {
    return {
      avgWorkerUtilization: 0,
      avgParallelEfficiency: 0,
      parallelTargetMet: false,
      avgMemoryUsageMB: 0,
      avgLockContentionMs: 0,
      peakActiveWorkers: 0
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private percentile(numbers: number[], p: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private formatReport(summary: MetricsSummary, timeframe: string): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push(`TASK SENTINEL PERFORMANCE METRICS REPORT (${timeframe.toUpperCase()})`);
    lines.push('='.repeat(80));
    lines.push('');

    lines.push(`Timeframe: ${new Date(summary.timeframe.start).toISOString()} to ${new Date(summary.timeframe.end).toISOString()}`);
    lines.push(`Duration: ${(summary.timeframe.durationMs / 1000 / 60).toFixed(2)} minutes`);
    lines.push('');

    // OODA Metrics
    lines.push('OODA LOOP METRICS:');
    lines.push('-'.repeat(80));
    lines.push(`  Average Cycle Time: ${(summary.oodaMetrics.avgCycleTime / 1000).toFixed(2)}s (Target: <${KPI_TARGETS.OODA_CYCLE_TIME_MS / 1000}s) ${summary.oodaMetrics.targetMet ? '✓' : '✗'}`);
    lines.push(`  Total Cycles: ${summary.oodaMetrics.cycleCount}`);
    lines.push(`  Replanning Frequency: ${(summary.oodaMetrics.replanningFrequency * 100).toFixed(2)}%`);
    lines.push('  Phase Durations (avg):');
    Object.entries(summary.oodaMetrics.phaseDurations).forEach(([phase, stats]) => {
      lines.push(`    ${phase}: ${(stats.avg / 1000).toFixed(2)}s (p95: ${(stats.p95 / 1000).toFixed(2)}s)`);
    });
    lines.push('');

    // Planning Metrics
    lines.push('GOAP PLANNING METRICS:');
    lines.push('-'.repeat(80));
    lines.push(`  Average Planning Time: ${(summary.planningMetrics.avgPlanningTime / 1000).toFixed(2)}s (Target: <${KPI_TARGETS.PLANNING_TIME_MS / 1000}s) ${summary.planningMetrics.targetMet ? '✓' : '✗'}`);
    lines.push(`  Average Plan Cost: ${summary.planningMetrics.avgPlanCost.toFixed(2)}`);
    lines.push(`  Average Actions/Plan: ${summary.planningMetrics.avgActionsPerPlan.toFixed(2)}`);
    lines.push(`  Optimality Ratio: ${summary.planningMetrics.optimalityRatio.toFixed(2)}`);
    lines.push(`  Replanning Rate: ${summary.planningMetrics.replanningRate.toFixed(2)} replans/hour`);
    lines.push('');

    // Task Metrics
    lines.push('TASK EXECUTION METRICS:');
    lines.push('-'.repeat(80));
    lines.push(`  Throughput: ${summary.taskMetrics.throughput.toFixed(2)} tasks/day (Target: >${KPI_TARGETS.TASK_THROUGHPUT_PER_DAY}) ${summary.taskMetrics.targetMet ? '✓' : '✗'}`);
    lines.push(`  Average Duration: ${(summary.taskMetrics.avgDuration / 1000).toFixed(2)}s`);
    lines.push(`  Success Rate: ${(summary.taskMetrics.successRate * 100).toFixed(2)}%`);
    lines.push(`  QA Pass Rate: ${(summary.taskMetrics.qaPassRate * 100).toFixed(2)}% (Target: >${KPI_TARGETS.QA_PASS_RATE * 100}%) ${summary.taskMetrics.qaTargetMet ? '✓' : '✗'}`);
    lines.push('  Duration Distribution:');
    lines.push(`    p50: ${(summary.taskMetrics.durationDistribution.p50 / 1000).toFixed(2)}s`);
    lines.push(`    p95: ${(summary.taskMetrics.durationDistribution.p95 / 1000).toFixed(2)}s`);
    lines.push(`    p99: ${(summary.taskMetrics.durationDistribution.p99 / 1000).toFixed(2)}s`);
    lines.push('');

    // System Metrics
    lines.push('SYSTEM PERFORMANCE METRICS:');
    lines.push('-'.repeat(80));
    lines.push(`  Worker Utilization: ${(summary.systemMetrics.avgWorkerUtilization * 100).toFixed(2)}%`);
    lines.push(`  Parallel Efficiency: ${(summary.systemMetrics.avgParallelEfficiency * 100).toFixed(2)}% (Target: >${KPI_TARGETS.PARALLEL_EFFICIENCY * 100}%) ${summary.systemMetrics.parallelTargetMet ? '✓' : '✗'}`);
    lines.push(`  Memory Usage: ${summary.systemMetrics.avgMemoryUsageMB.toFixed(2)} MB`);
    lines.push(`  Lock Contention: ${summary.systemMetrics.avgLockContentionMs.toFixed(2)} ms`);
    lines.push(`  Peak Active Workers: ${summary.systemMetrics.peakActiveWorkers}`);
    lines.push('');

    // KPI Summary
    lines.push('KPI STATUS SUMMARY:');
    lines.push('-'.repeat(80));
    Object.entries(summary.kpiStatus).forEach(([key, status]) => {
      const metSymbol = status.met ? '✓' : '✗';
      lines.push(`  ${key}: ${metSymbol} (${status.actual.toFixed(2)} / ${status.target.toFixed(2)})`);
    });
    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  private convertToCSV(summary: MetricsSummary): string {
    const rows: string[] = [];

    // Header
    rows.push('Category,Metric,Value,Target,Met');

    // OODA metrics
    rows.push(`OODA,Avg Cycle Time (ms),${summary.oodaMetrics.avgCycleTime},${KPI_TARGETS.OODA_CYCLE_TIME_MS},${summary.oodaMetrics.targetMet}`);
    rows.push(`OODA,Cycle Count,${summary.oodaMetrics.cycleCount},,`);
    rows.push(`OODA,Replanning Frequency,${summary.oodaMetrics.replanningFrequency},,`);

    // Planning metrics
    rows.push(`Planning,Avg Planning Time (ms),${summary.planningMetrics.avgPlanningTime},${KPI_TARGETS.PLANNING_TIME_MS},${summary.planningMetrics.targetMet}`);
    rows.push(`Planning,Avg Plan Cost,${summary.planningMetrics.avgPlanCost},,`);

    // Task metrics
    rows.push(`Tasks,Throughput (tasks/day),${summary.taskMetrics.throughput},${KPI_TARGETS.TASK_THROUGHPUT_PER_DAY},${summary.taskMetrics.targetMet}`);
    rows.push(`Tasks,QA Pass Rate,${summary.taskMetrics.qaPassRate},${KPI_TARGETS.QA_PASS_RATE},${summary.taskMetrics.qaTargetMet}`);
    rows.push(`Tasks,Success Rate,${summary.taskMetrics.successRate},,`);

    // System metrics
    rows.push(`System,Parallel Efficiency,${summary.systemMetrics.avgParallelEfficiency},${KPI_TARGETS.PARALLEL_EFFICIENCY},${summary.systemMetrics.parallelTargetMet}`);
    rows.push(`System,Worker Utilization,${summary.systemMetrics.avgWorkerUtilization},,`);

    return rows.join('\n');
  }

  private async storeMetric(category: string, metric: any): Promise<void> {
    // This method would integrate with MCP memory tools
    // For now, it's a placeholder for the storage interface
    const key = `${this.namespace}/${category}/${Date.now()}`;
    const ttlSeconds = this.TTL_DAYS * 24 * 60 * 60;

    // In a real implementation, this would call:
    // await mcp__claude-flow__memory_usage({
    //   action: 'store',
    //   namespace: this.namespace,
    //   key,
    //   value: JSON.stringify(metric),
    //   ttl: ttlSeconds
    // });

    console.log(`[MetricsCollector] Stored metric: ${key} (TTL: ${this.TTL_DAYS} days)`);
  }

  // ============================================================================
  // Data Access Methods
  // ============================================================================

  /**
   * Get raw cycle metrics
   */
  getCycleMetrics(query?: MetricsQuery): OODACycleMetric[] {
    if (!query) return this.cycleMetrics;

    return this.cycleMetrics.filter(m => {
      if (query.startTime && m.startTime < query.startTime) return false;
      if (query.endTime && m.startTime > query.endTime) return false;
      return true;
    });
  }

  /**
   * Get raw planning metrics
   */
  getPlanningMetrics(query?: MetricsQuery): PlanningMetric[] {
    if (!query) return this.planningMetrics;

    return this.planningMetrics.filter(m => {
      if (query.startTime && m.timestamp < query.startTime) return false;
      if (query.endTime && m.timestamp > query.endTime) return false;
      return true;
    });
  }

  /**
   * Get raw task metrics
   */
  getTaskMetrics(query?: MetricsQuery): TaskExecutionMetric[] {
    if (!query) return this.taskMetrics;

    return this.taskMetrics.filter(m => {
      if (query.startTime && m.timestamp < query.startTime) return false;
      if (query.endTime && m.timestamp > query.endTime) return false;
      return true;
    });
  }

  /**
   * Get raw system metrics
   */
  getSystemMetrics(query?: MetricsQuery): SystemMetric[] {
    if (!query) return this.systemMetrics;

    return this.systemMetrics.filter(m => {
      if (query.startTime && m.timestamp < query.startTime) return false;
      if (query.endTime && m.timestamp > query.endTime) return false;
      return true;
    });
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.cycleMetrics = [];
    this.planningMetrics = [];
    this.taskMetrics = [];
    this.systemMetrics = [];
    this.activeCycles.clear();
    this.activePhases.clear();
  }
}

// Singleton instance
let instance: MetricsCollector | null = null;

/**
 * Get the singleton metrics collector instance
 */
export function getMetricsCollector(memoryEnabled: boolean = true): MetricsCollector {
  if (!instance) {
    instance = new MetricsCollector(memoryEnabled);
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMetricsCollector(): void {
  instance = null;
}
