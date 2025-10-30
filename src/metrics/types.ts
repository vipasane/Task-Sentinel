/**
 * Task Sentinel Phase 2 - Performance Metrics Types
 * Comprehensive type definitions for OODA loop and system metrics
 */

export enum OODAPhase {
  OBSERVE = 'observe',
  ORIENT = 'orient',
  DECIDE = 'decide',
  ACT = 'act'
}

export enum TaskOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  QA_FAILED = 'qa_failed'
}

export interface PhaseMetric {
  phase: OODAPhase;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface PlanningMetric {
  planId: string;
  timestamp: number;
  planningTime: number; // milliseconds
  planCost: number; // total action cost
  actionsCount: number;
  optimalCost?: number; // if known
  replanningCount: number;
}

export interface TaskExecutionMetric {
  taskId: string;
  timestamp: number;
  duration: number; // milliseconds
  outcome: TaskOutcome;
  retryCount: number;
  workerUtilization: number; // 0-1
  parallelEfficiency?: number; // 0-1
}

export interface SystemMetric {
  timestamp: number;
  workerUtilization: number; // 0-1
  parallelEfficiency: number; // 0-1
  memoryUsageMB: number;
  lockContentionMs: number;
  activeWorkers: number;
  queuedTasks: number;
}

export interface OODACycleMetric {
  cycleId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  phases: PhaseMetric[];
  replanningTriggered: boolean;
  successRate: number;
}

export interface MetricsSummary {
  timeframe: {
    start: number;
    end: number;
    durationMs: number;
  };

  oodaMetrics: {
    avgCycleTime: number; // milliseconds
    cycleCount: number;
    targetMet: boolean; // < 5 minutes
    phaseDurations: Record<OODAPhase, {
      avg: number;
      min: number;
      max: number;
      p95: number;
    }>;
    replanningFrequency: number; // replans per cycle
    successRateByPhase: Record<OODAPhase, number>;
  };

  planningMetrics: {
    avgPlanningTime: number; // milliseconds
    targetMet: boolean; // < 30 seconds
    avgPlanCost: number;
    avgActionsPerPlan: number;
    optimalityRatio: number; // actual/optimal cost
    replanningRate: number; // replans per hour
  };

  taskMetrics: {
    throughput: number; // tasks per day
    targetMet: boolean; // > 50 tasks/day
    avgDuration: number;
    durationDistribution: {
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
    successRate: number;
    outcomeBreakdown: Record<TaskOutcome, number>;
    qaPassRate: number;
    qaTargetMet: boolean; // > 95%
  };

  systemMetrics: {
    avgWorkerUtilization: number;
    avgParallelEfficiency: number;
    parallelTargetMet: boolean; // > 90%
    avgMemoryUsageMB: number;
    avgLockContentionMs: number;
    peakActiveWorkers: number;
  };

  kpiStatus: {
    oodaCycleTime: { target: number; actual: number; met: boolean };
    planningTime: { target: number; actual: number; met: boolean };
    taskThroughput: { target: number; actual: number; met: boolean };
    qaPassRate: { target: number; actual: number; met: boolean };
    parallelEfficiency: { target: number; actual: number; met: boolean };
  };
}

export interface MetricsAggregation {
  period: 'hourly' | 'daily' | 'weekly';
  timestamp: number;
  summary: MetricsSummary;
}

export interface MetricsExport {
  format: 'json' | 'csv';
  timeframe: { start: number; end: number };
  data: MetricsSummary | string;
}

export interface MetricsQuery {
  startTime?: number;
  endTime?: number;
  category?: 'ooda' | 'planning' | 'task' | 'system';
  aggregation?: 'raw' | 'hourly' | 'daily' | 'weekly';
}
