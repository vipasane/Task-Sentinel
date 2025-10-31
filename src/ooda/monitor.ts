/**
 * OODA Loop Monitor
 * Tracks and analyzes OODA (Observe, Orient, Decide, Act) loop execution
 */

/**
 * OODA Loop Phases
 */
export enum OODAPhase {
  OBSERVE = 'OBSERVE',
  ORIENT = 'ORIENT',
  DECIDE = 'DECIDE',
  ACT = 'ACT',
  REPLAN = 'REPLAN'
}

/**
 * Phase execution metrics
 */
export interface PhaseMetrics {
  phase: OODAPhase;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorCount: number;
  attemptCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Complete OODA cycle metrics
 */
export interface OODACycleMetrics {
  cycleId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  phases: Map<OODAPhase, PhaseMetrics>;
  replanCount: number;
  finalSuccess: boolean;
  taskId?: string;
  agentsDeployed: number;
  resourcesUsed: {
    cpuTime?: number;
    memoryPeak?: number;
    apiCalls?: number;
  };
}

/**
 * Aggregated OODA metrics for analysis
 */
export interface OODAMetrics {
  totalCycles: number;
  successfulCycles: number;
  failedCycles: number;
  successRate: number;

  // Phase-specific metrics
  phaseMetrics: {
    [K in OODAPhase]: {
      avgDuration: number;
      successRate: number;
      totalExecutions: number;
      errorRate: number;
    };
  };

  // Timing metrics
  avgCycleTime: number;
  minCycleTime: number;
  maxCycleTime: number;

  // Replanning metrics
  avgReplanCount: number;
  maxReplanCount: number;
  replanTriggers: Map<string, number>;

  // Resource metrics
  avgAgentsPerCycle: number;
  totalApiCalls: number;
  avgMemoryUsage: number;

  // Temporal metrics
  lastCycleTime: number;
  firstCycleTime: number;
  uptime: number;
}

/**
 * OODA Loop decision record
 */
export interface OODADecision {
  cycleId: string;
  phase: OODAPhase;
  timestamp: number;
  decision: string;
  rationale: string;
  confidence: number;
  alternativesConsidered: string[];
  outcome?: 'success' | 'failure' | 'replanned';
}

/**
 * OODA Loop Monitor
 * Tracks execution of OODA cycles and collects metrics
 */
export class OODAMonitor {
  private cycles: Map<string, OODACycleMetrics> = new Map();
  private decisions: OODADecision[] = [];
  private currentCycleId: string | null = null;
  private globalStartTime: number;
  private readonly maxStoredCycles: number;
  private readonly maxStoredDecisions: number;

  constructor(maxStoredCycles: number = 1000, maxStoredDecisions: number = 1000) {
    this.maxStoredCycles = maxStoredCycles;
    this.maxStoredDecisions = maxStoredDecisions;
    this.globalStartTime = Date.now();
  }

  /**
   * Start a new OODA cycle
   */
  public startCycle(taskId?: string): string {
    const cycleId = this.generateCycleId();
    this.currentCycleId = cycleId;

    const cycle: OODACycleMetrics = {
      cycleId,
      startTime: Date.now(),
      phases: new Map(),
      replanCount: 0,
      finalSuccess: false,
      taskId,
      agentsDeployed: 0,
      resourcesUsed: {}
    };

    this.cycles.set(cycleId, cycle);
    this.evictOldCycles();

    return cycleId;
  }

  /**
   * Start a specific phase
   */
  public startPhase(phase: OODAPhase, cycleId?: string): void {
    const id = cycleId || this.currentCycleId;
    if (!id) {
      throw new Error('No active cycle. Call startCycle() first.');
    }

    const cycle = this.cycles.get(id);
    if (!cycle) {
      throw new Error(`Cycle ${id} not found`);
    }

    const phaseMetrics: PhaseMetrics = {
      phase,
      startTime: Date.now(),
      success: false,
      errorCount: 0,
      attemptCount: 1
    };

    cycle.phases.set(phase, phaseMetrics);
  }

  /**
   * End a specific phase
   */
  public endPhase(
    phase: OODAPhase,
    success: boolean,
    metadata?: Record<string, unknown>,
    cycleId?: string
  ): void {
    const id = cycleId || this.currentCycleId;
    if (!id) return;

    const cycle = this.cycles.get(id);
    if (!cycle) return;

    const phaseMetrics = cycle.phases.get(phase);
    if (!phaseMetrics) return;

    phaseMetrics.endTime = Date.now();
    phaseMetrics.duration = phaseMetrics.endTime - phaseMetrics.startTime;
    phaseMetrics.success = success;
    phaseMetrics.metadata = metadata;

    if (!success) {
      phaseMetrics.errorCount++;
    }
  }

  /**
   * Record a replanning event
   */
  public recordReplan(_reason: string, cycleId?: string): void {
    const id = cycleId || this.currentCycleId;
    if (!id) return;

    const cycle = this.cycles.get(id);
    if (!cycle) return;

    cycle.replanCount++;

    // Start REPLAN phase
    this.startPhase(OODAPhase.REPLAN, id);
  }

  /**
   * Record a decision made during the cycle
   */
  public recordDecision(
    phase: OODAPhase,
    decision: string,
    rationale: string,
    confidence: number,
    alternatives: string[],
    cycleId?: string
  ): void {
    const id = cycleId || this.currentCycleId;
    if (!id) return;

    const decisionRecord: OODADecision = {
      cycleId: id,
      phase,
      timestamp: Date.now(),
      decision,
      rationale,
      confidence,
      alternativesConsidered: alternatives
    };

    this.decisions.push(decisionRecord);
    this.evictOldDecisions();
  }

  /**
   * Update resource usage for the cycle
   */
  public updateResources(
    agentsDeployed?: number,
    cpuTime?: number,
    memoryPeak?: number,
    apiCalls?: number,
    cycleId?: string
  ): void {
    const id = cycleId || this.currentCycleId;
    if (!id) return;

    const cycle = this.cycles.get(id);
    if (!cycle) return;

    if (agentsDeployed !== undefined) {
      cycle.agentsDeployed += agentsDeployed;
    }

    if (cpuTime !== undefined) {
      cycle.resourcesUsed.cpuTime = (cycle.resourcesUsed.cpuTime || 0) + cpuTime;
    }

    if (memoryPeak !== undefined) {
      cycle.resourcesUsed.memoryPeak = Math.max(
        cycle.resourcesUsed.memoryPeak || 0,
        memoryPeak
      );
    }

    if (apiCalls !== undefined) {
      cycle.resourcesUsed.apiCalls = (cycle.resourcesUsed.apiCalls || 0) + apiCalls;
    }
  }

  /**
   * End the current OODA cycle
   */
  public endCycle(success: boolean, cycleId?: string): void {
    const id = cycleId || this.currentCycleId;
    if (!id) return;

    const cycle = this.cycles.get(id);
    if (!cycle) return;

    cycle.endTime = Date.now();
    cycle.totalDuration = cycle.endTime - cycle.startTime;
    cycle.finalSuccess = success;

    if (id === this.currentCycleId) {
      this.currentCycleId = null;
    }
  }

  /**
   * Get metrics for a specific cycle
   */
  public getCycleMetrics(cycleId: string): OODACycleMetrics | undefined {
    return this.cycles.get(cycleId);
  }

  /**
   * Get aggregated metrics across all cycles
   */
  public getAggregatedMetrics(): OODAMetrics {
    const cycles = Array.from(this.cycles.values()).filter(c => c.endTime);

    if (cycles.length === 0) {
      return this.getEmptyMetrics();
    }

    const successfulCycles = cycles.filter(c => c.finalSuccess).length;
    const failedCycles = cycles.length - successfulCycles;

    // Calculate phase metrics
    const phaseMetrics = this.calculatePhaseMetrics(cycles);

    // Calculate timing metrics
    const cycleTimes = cycles.map(c => c.totalDuration || 0);
    const avgCycleTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
    const minCycleTime = Math.min(...cycleTimes);
    const maxCycleTime = Math.max(...cycleTimes);

    // Calculate replanning metrics
    const replanCounts = cycles.map(c => c.replanCount);
    const avgReplanCount = replanCounts.reduce((a, b) => a + b, 0) / replanCounts.length;
    const maxReplanCount = Math.max(...replanCounts);

    // Calculate resource metrics
    const totalAgents = cycles.reduce((sum, c) => sum + c.agentsDeployed, 0);
    const avgAgentsPerCycle = totalAgents / cycles.length;
    const totalApiCalls = cycles.reduce((sum, c) => sum + (c.resourcesUsed.apiCalls || 0), 0);
    const memoryUsages = cycles
      .map(c => c.resourcesUsed.memoryPeak || 0)
      .filter(m => m > 0);
    const avgMemoryUsage = memoryUsages.length > 0
      ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
      : 0;

    return {
      totalCycles: cycles.length,
      successfulCycles,
      failedCycles,
      successRate: successfulCycles / cycles.length,
      phaseMetrics,
      avgCycleTime,
      minCycleTime,
      maxCycleTime,
      avgReplanCount,
      maxReplanCount,
      replanTriggers: new Map(),
      avgAgentsPerCycle,
      totalApiCalls,
      avgMemoryUsage,
      lastCycleTime: cycles[cycles.length - 1]?.startTime || 0,
      firstCycleTime: cycles[0]?.startTime || 0,
      uptime: Date.now() - this.globalStartTime
    };
  }

  /**
   * Get decisions for a specific cycle
   */
  public getCycleDecisions(cycleId: string): OODADecision[] {
    return this.decisions.filter(d => d.cycleId === cycleId);
  }

  /**
   * Get all decisions
   */
  public getAllDecisions(): OODADecision[] {
    return [...this.decisions];
  }

  /**
   * Export metrics as JSON
   */
  public exportMetrics(): string {
    return JSON.stringify({
      aggregated: this.getAggregatedMetrics(),
      cycles: Array.from(this.cycles.values()),
      decisions: this.decisions
    }, null, 2);
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.cycles.clear();
    this.decisions = [];
    this.currentCycleId = null;
    this.globalStartTime = Date.now();
  }

  // Private helper methods

  private generateCycleId(): string {
    return `ooda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private evictOldCycles(): void {
    if (this.cycles.size <= this.maxStoredCycles) return;

    const sortedCycles = Array.from(this.cycles.entries())
      .sort((a, b) => a[1].startTime - b[1].startTime);

    const toRemove = sortedCycles.slice(0, this.cycles.size - this.maxStoredCycles);
    toRemove.forEach(([id]) => this.cycles.delete(id));
  }

  /**
   * Evict oldest decisions when limit is exceeded
   */
  private evictOldDecisions(): void {
    if (this.decisions.length <= this.maxStoredDecisions) return;

    // Remove oldest decisions (FIFO - First In First Out)
    const toRemove = this.decisions.length - this.maxStoredDecisions;
    this.decisions.splice(0, toRemove);
  }

  private calculatePhaseMetrics(cycles: OODACycleMetrics[]): OODAMetrics['phaseMetrics'] {
    const phaseData: Record<OODAPhase, PhaseMetrics[]> = {
      [OODAPhase.OBSERVE]: [],
      [OODAPhase.ORIENT]: [],
      [OODAPhase.DECIDE]: [],
      [OODAPhase.ACT]: [],
      [OODAPhase.REPLAN]: []
    };

    // Collect all phase metrics
    cycles.forEach(cycle => {
      cycle.phases.forEach((metrics, phase) => {
        if (metrics.endTime) {
          phaseData[phase].push(metrics);
        }
      });
    });

    // Calculate aggregates for each phase
    const result: any = {};

    Object.entries(phaseData).forEach(([phase, metrics]) => {
      if (metrics.length === 0) {
        result[phase] = {
          avgDuration: 0,
          successRate: 0,
          totalExecutions: 0,
          errorRate: 0
        };
        return;
      }

      const durations = metrics.map(m => m.duration || 0);
      const successes = metrics.filter(m => m.success).length;
      const errors = metrics.reduce((sum, m) => sum + m.errorCount, 0);

      result[phase] = {
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        successRate: successes / metrics.length,
        totalExecutions: metrics.length,
        errorRate: errors / metrics.length
      };
    });

    return result;
  }

  private getEmptyMetrics(): OODAMetrics {
    return {
      totalCycles: 0,
      successfulCycles: 0,
      failedCycles: 0,
      successRate: 0,
      phaseMetrics: {
        [OODAPhase.OBSERVE]: { avgDuration: 0, successRate: 0, totalExecutions: 0, errorRate: 0 },
        [OODAPhase.ORIENT]: { avgDuration: 0, successRate: 0, totalExecutions: 0, errorRate: 0 },
        [OODAPhase.DECIDE]: { avgDuration: 0, successRate: 0, totalExecutions: 0, errorRate: 0 },
        [OODAPhase.ACT]: { avgDuration: 0, successRate: 0, totalExecutions: 0, errorRate: 0 },
        [OODAPhase.REPLAN]: { avgDuration: 0, successRate: 0, totalExecutions: 0, errorRate: 0 }
      },
      avgCycleTime: 0,
      minCycleTime: 0,
      maxCycleTime: 0,
      avgReplanCount: 0,
      maxReplanCount: 0,
      replanTriggers: new Map(),
      avgAgentsPerCycle: 0,
      totalApiCalls: 0,
      avgMemoryUsage: 0,
      lastCycleTime: 0,
      firstCycleTime: 0,
      uptime: Date.now() - this.globalStartTime
    };
  }
}
