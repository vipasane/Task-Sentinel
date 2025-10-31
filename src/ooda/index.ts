/**
 * OODA Loop System - Main Entry Point
 * Integrates Observe, Orient, Decide, Act phases into a complete loop
 */

export { OODAPhase, OODAMonitor, OODACycleMetrics, OODAMetrics } from './monitor';
export { ObserveSystem, TaskObservation, WorkerStatus, MemoryState, SystemObservation } from './observe';
export { OrientSystem, ComplexityAnalysis, ExecutionStrategy, AgentRequirements, OrientationDecision } from './orient';
export { DecideSystem, ResourceAvailability, ExecutionPlan, Decision } from './decide';
export { ActSystem, TaskClaim, AgentDeployment, ExecutionProgress, FailureDetection } from './act';

import { OODAMonitor, OODAPhase } from './monitor';
import { ObserveSystem, SystemObservation } from './observe';
import { OrientSystem, OrientationDecision } from './orient';
import { DecideSystem, Decision } from './decide';
import { ActSystem } from './act';

/**
 * Complete OODA Loop Configuration
 */
export interface OODALoopConfig {
  githubToken: string;
  owner: string;
  repo: string;
  observeIntervalMs?: number;
  maxStoredCycles?: number;
  autoExecute?: boolean;
}

/**
 * OODA Loop Status
 */
export interface OODALoopStatus {
  running: boolean;
  currentPhase: OODAPhase | null;
  currentCycleId: string | null;
  cyclesCompleted: number;
  lastObservation: SystemObservation | null;
  lastOrientation: OrientationDecision | null;
  lastDecision: Decision | null;
  activeExecutions: number;
}

/**
 * Complete OODA Loop System
 * Orchestrates the full Observe-Orient-Decide-Act cycle
 */
export class OODALoop {
  private monitor: OODAMonitor;
  private observe: ObserveSystem;
  private orient: OrientSystem;
  private decide: DecideSystem;
  private act: ActSystem;

  private config: Required<OODALoopConfig>;
  private running: boolean = false;
  private intervalHandle: NodeJS.Timeout | null = null;
  private currentCycleId: string | null = null;

  private status: OODALoopStatus = {
    running: false,
    currentPhase: null,
    currentCycleId: null,
    cyclesCompleted: 0,
    lastObservation: null,
    lastOrientation: null,
    lastDecision: null,
    activeExecutions: 0
  };

  constructor(config: OODALoopConfig) {
    this.config = {
      observeIntervalMs: 60000, // 1 minute default
      maxStoredCycles: 1000,
      autoExecute: true,
      ...config
    };

    this.monitor = new OODAMonitor(this.config.maxStoredCycles);
    this.observe = new ObserveSystem(
      this.config.githubToken,
      this.config.owner,
      this.config.repo
    );
    this.orient = new OrientSystem(this.config.maxStoredCycles);
    this.decide = new DecideSystem(this.config.maxStoredCycles);
    this.act = new ActSystem(
      this.config.githubToken,
      this.config.owner,
      this.config.repo,
      this.config.maxStoredCycles
    );
  }

  /**
   * Start the OODA loop
   */
  public start(): void {
    if (this.running) {
      console.warn('OODA loop is already running');
      return;
    }

    this.running = true;
    this.status.running = true;

    console.log(`Starting OODA loop with ${this.config.observeIntervalMs}ms interval`);

    // Run immediately
    this.runCycle().catch(console.error);

    // Schedule periodic execution
    this.intervalHandle = setInterval(() => {
      this.runCycle().catch(console.error);
    }, this.config.observeIntervalMs);
  }

  /**
   * Stop the OODA loop
   */
  public stop(): void {
    if (!this.running) {
      console.warn('OODA loop is not running');
      return;
    }

    this.running = false;
    this.status.running = false;
    this.status.currentPhase = null;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    console.log('OODA loop stopped');
  }

  /**
   * Run a single OODA cycle
   */
  public async runCycle(): Promise<void> {
    if (!this.running) return;

    const cycleId = this.monitor.startCycle();
    this.currentCycleId = cycleId;
    this.status.currentCycleId = cycleId;

    try {
      // OBSERVE PHASE
      this.status.currentPhase = OODAPhase.OBSERVE;
      this.monitor.startPhase(OODAPhase.OBSERVE, cycleId);

      const observation = await this.observe.observe();
      this.status.lastObservation = observation;

      this.monitor.endPhase(OODAPhase.OBSERVE, true, {
        tasksFound: observation.readyTasks.length,
        workersAvailable: observation.workerStatuses.length
      }, cycleId);

      // If no ready tasks, end cycle
      if (observation.readyTasks.length === 0) {
        console.log('No ready tasks found, ending cycle');
        this.monitor.endCycle(true, cycleId);
        this.status.cyclesCompleted++;
        this.status.currentPhase = null;
        return;
      }

      // ORIENT PHASE
      this.status.currentPhase = OODAPhase.ORIENT;
      this.monitor.startPhase(OODAPhase.ORIENT, cycleId);

      // Orient for the first ready task
      const task = observation.readyTasks[0];
      const orientation = await this.orient.orient(
        task,
        observation.workerStatuses,
        observation.memoryState
      );
      this.status.lastOrientation = orientation;

      this.monitor.recordDecision(
        OODAPhase.ORIENT,
        `Selected ${orientation.strategy.topology} topology for task ${task.issueNumber}`,
        orientation.reasoning.join('; '),
        orientation.confidence,
        [orientation.strategy.topology],
        cycleId
      );

      this.monitor.endPhase(OODAPhase.ORIENT, true, {
        complexity: orientation.complexity.category,
        confidence: orientation.confidence
      }, cycleId);

      // DECIDE PHASE
      this.status.currentPhase = OODAPhase.DECIDE;
      this.monitor.startPhase(OODAPhase.DECIDE, cycleId);

      const decision = await this.decide.decide(
        orientation,
        observation.workerStatuses
      );
      this.status.lastDecision = decision;

      this.monitor.recordDecision(
        OODAPhase.DECIDE,
        `Plan: ${decision.selectedPlan.planId}`,
        decision.rationale,
        decision.confidence,
        decision.alternativePlans.map(p => p.planId),
        cycleId
      );

      this.monitor.endPhase(OODAPhase.DECIDE, true, {
        planId: decision.selectedPlan.planId,
        agentsRequired: decision.selectedPlan.agentAssignments.length
      }, cycleId);

      // Check if approval is required
      if (decision.approvalRequired && !this.config.autoExecute) {
        console.log('Decision requires approval, skipping execution');
        this.monitor.endCycle(true, cycleId);
        this.status.cyclesCompleted++;
        this.status.currentPhase = null;
        return;
      }

      // ACT PHASE
      this.status.currentPhase = OODAPhase.ACT;
      this.monitor.startPhase(OODAPhase.ACT, cycleId);

      const executionId = await this.act.execute(decision);
      this.status.activeExecutions++;

      this.monitor.updateResources(
        decision.selectedPlan.agentAssignments.length,
        undefined,
        undefined,
        undefined,
        cycleId
      );

      this.monitor.endPhase(OODAPhase.ACT, true, {
        executionId
      }, cycleId);

      // Complete cycle
      this.monitor.endCycle(true, cycleId);
      this.status.cyclesCompleted++;
      this.status.currentPhase = null;
      this.currentCycleId = null;

      console.log(`OODA cycle ${cycleId} completed successfully`);

    } catch (error) {
      console.error('OODA cycle failed:', error);

      if (this.status.currentPhase) {
        this.monitor.endPhase(this.status.currentPhase, false, {
          error: String(error)
        }, cycleId);
      }

      // Consider replanning
      if (this.shouldReplan(error)) {
        this.monitor.recordReplan('Cycle failure', cycleId);
        this.monitor.startPhase(OODAPhase.REPLAN, cycleId);

        // Replan logic would go here

        this.monitor.endPhase(OODAPhase.REPLAN, true, {}, cycleId);
      }

      this.monitor.endCycle(false, cycleId);
      this.status.currentPhase = null;
      this.currentCycleId = null;
    }
  }

  /**
   * Get current loop status
   */
  public getStatus(): OODALoopStatus {
    return { ...this.status };
  }

  /**
   * Get aggregated metrics
   */
  public getMetrics() {
    return {
      ooda: this.monitor.getAggregatedMetrics(),
      observe: this.observe.getMetrics(),
      orient: this.orient.getMetrics(),
      decide: this.decide.getMetrics(),
      act: this.act.getMetrics()
    };
  }

  /**
   * Export complete metrics as JSON
   */
  public exportMetrics(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.monitor.reset();
    this.observe.resetMetrics();
    this.status.cyclesCompleted = 0;
  }

  /**
   * Get recent OODA decisions
   */
  public getRecentDecisions(count: number = 10) {
    return this.monitor.getAllDecisions().slice(-count);
  }

  // Private helper methods

  private shouldReplan(error: unknown): boolean {
    // Determine if error is recoverable through replanning
    const errorString = String(error).toLowerCase();

    if (errorString.includes('resource') ||
        errorString.includes('timeout') ||
        errorString.includes('unavailable')) {
      return true;
    }

    return false;
  }
}
