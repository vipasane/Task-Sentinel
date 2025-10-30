/**
 * Adaptive Replanning System for Task Sentinel
 *
 * Handles failure detection, root cause analysis, and dynamic replanning
 * with learning capabilities to improve future planning decisions.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum FailureType {
  ACTION_PRECONDITIONS_FAILED = 'ACTION_PRECONDITIONS_FAILED',
  ACTION_EXECUTION_FAILED = 'ACTION_EXECUTION_FAILED',
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  DEPENDENCY_BLOCKED = 'DEPENDENCY_BLOCKED',
  QUALITY_GATE_FAILED = 'QUALITY_GATE_FAILED'
}

export enum ReplanStrategy {
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  ALTERNATIVE_PATH = 'ALTERNATIVE_PATH',
  SIMPLIFY_GOAL = 'SIMPLIFY_GOAL',
  REQUEST_RESOURCES = 'REQUEST_RESOURCES',
  ESCALATE = 'ESCALATE'
}

export enum RecoveryAction {
  STATE_ROLLBACK = 'STATE_ROLLBACK',
  RESOURCE_REALLOCATION = 'RESOURCE_REALLOCATION',
  AGENT_RESPAWN = 'AGENT_RESPAWN',
  LOCK_REFRESH = 'LOCK_REFRESH',
  CONTEXT_RESTORATION = 'CONTEXT_RESTORATION'
}

export interface Action {
  id: string;
  type: string;
  agentId: string;
  parameters: Record<string, any>;
  preconditions: Precondition[];
  expectedDuration: number;
  cost: number;
  retries?: number;
}

export interface Precondition {
  type: string;
  condition: string;
  value: any;
}

export interface Failure {
  id: string;
  timestamp: number;
  failureType: FailureType;
  action: Action;
  error: Error;
  context: Record<string, any>;
  retryCount: number;
  rootCause?: RootCause;
}

export interface RootCause {
  category: string;
  reason: string;
  contributingFactors: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export interface SystemState {
  currentPlan: Plan;
  executedActions: Action[];
  failedActions: Failure[];
  availableResources: Resource[];
  agentStates: Map<string, AgentState>;
  locks: Map<string, Lock>;
  checkpoints: StateCheckpoint[];
}

export interface Plan {
  id: string;
  goal: Goal;
  actions: Action[];
  dependencies: Map<string, string[]>;
  estimatedCost: number;
  estimatedDuration: number;
  priority: number;
}

export interface Goal {
  id: string;
  description: string;
  constraints: Constraint[];
  successCriteria: SuccessCriterion[];
  priority: number;
  deadline?: number;
}

export interface Constraint {
  type: string;
  value: any;
  flexible: boolean;
}

export interface SuccessCriterion {
  metric: string;
  threshold: number;
  required: boolean;
}

export interface Resource {
  id: string;
  type: string;
  available: boolean;
  capacity: number;
  allocated: number;
}

export interface AgentState {
  id: string;
  status: 'idle' | 'busy' | 'failed' | 'recovering';
  currentAction?: string;
  successRate: number;
  averageExecutionTime: number;
}

export interface Lock {
  id: string;
  resourceId: string;
  holderId: string;
  acquiredAt: number;
  expiresAt: number;
}

export interface StateCheckpoint {
  id: string;
  timestamp: number;
  state: Partial<SystemState>;
  description: string;
}

export interface AlternativePlan {
  plan: Plan;
  strategy: ReplanStrategy;
  confidence: number;
  reasoning: string;
  tradeoffs: string[];
}

export interface RecoveryResult {
  success: boolean;
  recoveryActions: RecoveryAction[];
  restoredState?: Partial<SystemState>;
  error?: Error;
}

export interface FailurePattern {
  signature: string;
  occurrences: number;
  successfulStrategies: Map<ReplanStrategy, number>;
  averageRecoveryTime: number;
  lastSeen: number;
}

// ============================================================================
// Adaptive Replanner Class
// ============================================================================

export class AdaptiveReplanner extends EventEmitter {
  private failurePatterns: Map<string, FailurePattern> = new Map();
  private actionSuccessRates: Map<string, { successes: number; failures: number }> = new Map();
  private strategyEffectiveness: Map<ReplanStrategy, { successes: number; failures: number }> = new Map();

  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BACKOFF_BASE_MS = 1000;
  private readonly BACKOFF_MULTIPLIER = 2;
  private readonly PATTERN_MEMORY_SIZE = 1000;

  constructor() {
    super();
    this.initializeStrategyTracking();
  }

  // ============================================================================
  // Failure Detection
  // ============================================================================

  /**
   * Detect and classify action failures
   */
  public detectFailure(action: Action, error: Error, context: Record<string, any>): Failure {
    const failureType = this.classifyFailure(action, error, context);

    const failure: Failure = {
      id: this.generateFailureId(),
      timestamp: Date.now(),
      failureType,
      action,
      error,
      context,
      retryCount: action.retries || 0
    };

    this.emit('failure:detected', failure);
    this.updateActionSuccessRate(action.type, false);

    return failure;
  }

  /**
   * Classify the type of failure
   */
  private classifyFailure(action: Action, error: Error, context: Record<string, any>): FailureType {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Precondition failures
    if (errorMessage.includes('precondition') || errorMessage.includes('prerequisite')) {
      return FailureType.ACTION_PRECONDITIONS_FAILED;
    }

    // Resource availability
    if (errorMessage.includes('resource') && (errorMessage.includes('unavailable') || errorMessage.includes('not found'))) {
      return FailureType.RESOURCE_UNAVAILABLE;
    }

    // Timeouts
    if (errorName.includes('timeout') || errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return FailureType.TIMEOUT_EXCEEDED;
    }

    // Dependency issues
    if (errorMessage.includes('dependency') || errorMessage.includes('blocked') || errorMessage.includes('waiting')) {
      return FailureType.DEPENDENCY_BLOCKED;
    }

    // Quality gates
    if (errorMessage.includes('quality') || errorMessage.includes('validation') || errorMessage.includes('threshold')) {
      return FailureType.QUALITY_GATE_FAILED;
    }

    // Default to execution failure
    return FailureType.ACTION_EXECUTION_FAILED;
  }

  // ============================================================================
  // Root Cause Analysis
  // ============================================================================

  /**
   * Analyze the root cause of a failure
   */
  public async analyzeFailureRoot(failure: Failure, state: SystemState): Promise<RootCause> {
    const contributingFactors: string[] = [];
    let category = 'unknown';
    let reason = failure.error.message;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let recoverable = true;

    switch (failure.failureType) {
      case FailureType.ACTION_PRECONDITIONS_FAILED:
        category = 'precondition';
        contributingFactors.push(...this.analyzePreconditions(failure.action, state));
        severity = 'medium';
        recoverable = true;
        break;

      case FailureType.RESOURCE_UNAVAILABLE:
        category = 'resource';
        contributingFactors.push(...this.analyzeResourceAvailability(failure.action, state));
        severity = 'high';
        recoverable = true;
        break;

      case FailureType.TIMEOUT_EXCEEDED:
        category = 'timing';
        contributingFactors.push(...this.analyzeTimeout(failure.action, state));
        severity = failure.retryCount > 2 ? 'high' : 'medium';
        recoverable = failure.retryCount < this.MAX_RETRY_ATTEMPTS;
        break;

      case FailureType.DEPENDENCY_BLOCKED:
        category = 'dependency';
        contributingFactors.push(...this.analyzeDependencies(failure.action, state));
        severity = 'high';
        recoverable = true;
        break;

      case FailureType.QUALITY_GATE_FAILED:
        category = 'quality';
        contributingFactors.push(...this.analyzeQualityGate(failure.action, state));
        severity = 'medium';
        recoverable = true;
        break;

      case FailureType.ACTION_EXECUTION_FAILED:
        category = 'execution';
        contributingFactors.push(...this.analyzeExecution(failure.action, state, failure.error));
        severity = this.assessExecutionSeverity(failure);
        recoverable = this.isExecutionRecoverable(failure);
        break;
    }

    const rootCause: RootCause = {
      category,
      reason,
      contributingFactors,
      severity,
      recoverable
    };

    failure.rootCause = rootCause;
    this.recordFailurePattern(failure);

    this.emit('failure:analyzed', { failure, rootCause });

    return rootCause;
  }

  private analyzePreconditions(action: Action, state: SystemState): string[] {
    const factors: string[] = [];

    for (const precondition of action.preconditions) {
      if (precondition.type === 'resource') {
        const resource = state.availableResources.find(r => r.id === precondition.value);
        if (!resource || !resource.available) {
          factors.push(`Required resource ${precondition.value} is unavailable`);
        }
      } else if (precondition.type === 'state') {
        factors.push(`State precondition not met: ${precondition.condition}`);
      } else if (precondition.type === 'dependency') {
        const depAction = state.executedActions.find(a => a.id === precondition.value);
        if (!depAction) {
          factors.push(`Dependency action ${precondition.value} not completed`);
        }
      }
    }

    return factors;
  }

  private analyzeResourceAvailability(action: Action, state: SystemState): string[] {
    const factors: string[] = [];

    state.availableResources.forEach(resource => {
      if (resource.allocated >= resource.capacity) {
        factors.push(`Resource ${resource.id} at full capacity (${resource.allocated}/${resource.capacity})`);
      }
    });

    return factors;
  }

  private analyzeTimeout(action: Action, state: SystemState): string[] {
    const factors: string[] = [];

    const agent = state.agentStates.get(action.agentId);
    if (agent && agent.averageExecutionTime > action.expectedDuration * 1.5) {
      factors.push(`Agent ${action.agentId} performing slower than expected`);
    }

    if (action.expectedDuration < 1000) {
      factors.push('Timeout threshold may be too aggressive');
    }

    return factors;
  }

  private analyzeDependencies(action: Action, state: SystemState): string[] {
    const factors: string[] = [];

    const deps = state.currentPlan.dependencies.get(action.id) || [];
    for (const depId of deps) {
      const depAction = state.executedActions.find(a => a.id === depId);
      const failedDep = state.failedActions.find(f => f.action.id === depId);

      if (failedDep) {
        factors.push(`Dependency ${depId} failed: ${failedDep.failureType}`);
      } else if (!depAction) {
        factors.push(`Dependency ${depId} not yet executed`);
      }
    }

    return factors;
  }

  private analyzeQualityGate(action: Action, state: SystemState): string[] {
    const factors: string[] = [];

    const goal = state.currentPlan.goal;
    goal.successCriteria.forEach(criterion => {
      factors.push(`Quality criterion not met: ${criterion.metric} < ${criterion.threshold}`);
    });

    return factors;
  }

  private analyzeExecution(action: Action, state: SystemState, error: Error): string[] {
    const factors: string[] = [];

    factors.push(`Execution error: ${error.name}`);

    const agent = state.agentStates.get(action.agentId);
    if (agent && agent.status === 'failed') {
      factors.push(`Agent ${action.agentId} in failed state`);
    }

    if (agent && agent.successRate < 0.5) {
      factors.push(`Agent ${action.agentId} has low success rate (${(agent.successRate * 100).toFixed(1)}%)`);
    }

    return factors;
  }

  private assessExecutionSeverity(failure: Failure): 'low' | 'medium' | 'high' | 'critical' {
    if (failure.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      return 'critical';
    }
    if (failure.error.message.includes('fatal') || failure.error.message.includes('critical')) {
      return 'critical';
    }
    if (failure.retryCount > 1) {
      return 'high';
    }
    return 'medium';
  }

  private isExecutionRecoverable(failure: Failure): boolean {
    if (failure.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      return false;
    }

    const nonRecoverableErrors = ['EACCES', 'EPERM', 'ENOSPC', 'FATAL'];
    return !nonRecoverableErrors.some(code =>
      failure.error.message.includes(code) || failure.error.name.includes(code)
    );
  }

  // ============================================================================
  // Alternative Plan Generation
  // ============================================================================

  /**
   * Generate alternative plans based on failure analysis
   */
  public async generateAlternativePlan(
    state: SystemState,
    goal: Goal,
    failedAction: Action,
    failure: Failure
  ): Promise<AlternativePlan[]> {
    const alternatives: AlternativePlan[] = [];
    const rootCause = failure.rootCause!;

    // Strategy 1: Retry with backoff
    if (this.shouldRetry(failure, rootCause)) {
      alternatives.push(this.createRetryPlan(state, failedAction, failure));
    }

    // Strategy 2: Alternative path
    if (this.hasAlternativePath(state, failedAction)) {
      alternatives.push(...await this.createAlternativePathPlans(state, goal, failedAction));
    }

    // Strategy 3: Simplify goal
    if (this.canSimplifyGoal(goal)) {
      alternatives.push(this.createSimplifiedPlan(state, goal, failedAction));
    }

    // Strategy 4: Request resources
    if (rootCause.category === 'resource') {
      alternatives.push(this.createResourceRequestPlan(state, failedAction));
    }

    // Strategy 5: Escalate
    if (!rootCause.recoverable || alternatives.length === 0) {
      alternatives.push(this.createEscalationPlan(state, failedAction, failure));
    }

    // Sort by confidence
    alternatives.sort((a, b) => b.confidence - a.confidence);

    this.emit('plans:generated', { failure, alternatives });

    return alternatives;
  }

  private shouldRetry(failure: Failure, rootCause: RootCause): boolean {
    return (
      failure.retryCount < this.MAX_RETRY_ATTEMPTS &&
      rootCause.recoverable &&
      (rootCause.category === 'timing' ||
       rootCause.category === 'resource' ||
       rootCause.category === 'execution')
    );
  }

  private createRetryPlan(state: SystemState, failedAction: Action, failure: Failure): AlternativePlan {
    const retryAction = {
      ...failedAction,
      retries: (failedAction.retries || 0) + 1,
      id: this.generateActionId()
    };

    const backoffDelay = this.calculateBackoff(failure.retryCount);
    const updatedActions = state.currentPlan.actions.map(a =>
      a.id === failedAction.id ? retryAction : a
    );

    const plan: Plan = {
      ...state.currentPlan,
      id: this.generatePlanId(),
      actions: updatedActions,
      estimatedDuration: state.currentPlan.estimatedDuration + backoffDelay
    };

    const historicalSuccess = this.getStrategySuccessRate(ReplanStrategy.RETRY_WITH_BACKOFF);

    return {
      plan,
      strategy: ReplanStrategy.RETRY_WITH_BACKOFF,
      confidence: Math.min(0.9, historicalSuccess * (1 - failure.retryCount * 0.2)),
      reasoning: `Retry with ${backoffDelay}ms backoff (attempt ${failure.retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`,
      tradeoffs: [
        `Adds ${backoffDelay}ms delay`,
        `${this.MAX_RETRY_ATTEMPTS - failure.retryCount} retries remaining`
      ]
    };
  }

  private hasAlternativePath(state: SystemState, failedAction: Action): boolean {
    // Check if there are other actions that could achieve similar results
    return state.currentPlan.actions.some(a =>
      a.type === failedAction.type &&
      a.id !== failedAction.id &&
      !state.failedActions.some(f => f.action.id === a.id)
    );
  }

  private async createAlternativePathPlans(
    state: SystemState,
    goal: Goal,
    failedAction: Action
  ): Promise<AlternativePlan[]> {
    const alternatives: AlternativePlan[] = [];

    // Find actions that haven't been tried
    const remainingActions = state.currentPlan.actions.filter(a =>
      a.id !== failedAction.id &&
      !state.executedActions.some(ea => ea.id === a.id) &&
      !state.failedActions.some(fa => fa.action.id === a.id)
    );

    // Find actions with similar outcomes but different approaches
    const similarActions = remainingActions.filter(a =>
      this.actionsHaveSimilarOutcome(a, failedAction)
    );

    for (const altAction of similarActions) {
      const newActions = state.currentPlan.actions.map(a =>
        a.id === failedAction.id ? altAction : a
      );

      const plan: Plan = {
        ...state.currentPlan,
        id: this.generatePlanId(),
        actions: newActions
      };

      const actionSuccessRate = this.getActionSuccessRate(altAction.type);
      const historicalSuccess = this.getStrategySuccessRate(ReplanStrategy.ALTERNATIVE_PATH);

      alternatives.push({
        plan,
        strategy: ReplanStrategy.ALTERNATIVE_PATH,
        confidence: actionSuccessRate * historicalSuccess,
        reasoning: `Use alternative action ${altAction.type} instead of ${failedAction.type}`,
        tradeoffs: [
          `Different approach may have different resource requirements`,
          `Estimated duration: ${altAction.expectedDuration}ms vs ${failedAction.expectedDuration}ms`
        ]
      });
    }

    return alternatives;
  }

  private canSimplifyGoal(goal: Goal): boolean {
    return goal.constraints.some(c => c.flexible) ||
           goal.successCriteria.some(sc => !sc.required);
  }

  private createSimplifiedPlan(state: SystemState, goal: Goal, failedAction: Action): AlternativePlan {
    // Remove optional constraints and success criteria
    const simplifiedGoal: Goal = {
      ...goal,
      constraints: goal.constraints.filter(c => !c.flexible),
      successCriteria: goal.successCriteria.filter(sc => sc.required)
    };

    // Remove non-critical actions
    const criticalActions = state.currentPlan.actions.filter(a =>
      this.isActionCritical(a, simplifiedGoal)
    );

    const plan: Plan = {
      ...state.currentPlan,
      id: this.generatePlanId(),
      goal: simplifiedGoal,
      actions: criticalActions,
      estimatedCost: criticalActions.reduce((sum, a) => sum + a.cost, 0),
      estimatedDuration: criticalActions.reduce((sum, a) => sum + a.expectedDuration, 0)
    };

    const historicalSuccess = this.getStrategySuccessRate(ReplanStrategy.SIMPLIFY_GOAL);

    return {
      plan,
      strategy: ReplanStrategy.SIMPLIFY_GOAL,
      confidence: historicalSuccess * 0.8,
      reasoning: 'Simplified goal by removing optional constraints',
      tradeoffs: [
        `Reduced from ${state.currentPlan.actions.length} to ${criticalActions.length} actions`,
        'Some optional features will not be delivered',
        `Cost reduced by ${((1 - plan.estimatedCost / state.currentPlan.estimatedCost) * 100).toFixed(1)}%`
      ]
    };
  }

  private createResourceRequestPlan(state: SystemState, failedAction: Action): AlternativePlan {
    const plan: Plan = {
      ...state.currentPlan,
      id: this.generatePlanId(),
      estimatedDuration: state.currentPlan.estimatedDuration + 60000 // Add 1 minute wait
    };

    const historicalSuccess = this.getStrategySuccessRate(ReplanStrategy.REQUEST_RESOURCES);

    return {
      plan,
      strategy: ReplanStrategy.REQUEST_RESOURCES,
      confidence: historicalSuccess * 0.7,
      reasoning: 'Wait for resources to become available',
      tradeoffs: [
        'Adds wait time for resource availability',
        'May require resource reallocation',
        'No guarantee resources will become available'
      ]
    };
  }

  private createEscalationPlan(state: SystemState, failedAction: Action, failure: Failure): AlternativePlan {
    const plan: Plan = {
      ...state.currentPlan,
      id: this.generatePlanId()
    };

    return {
      plan,
      strategy: ReplanStrategy.ESCALATE,
      confidence: 0.0,
      reasoning: `Unrecoverable failure: ${failure.rootCause?.reason}`,
      tradeoffs: [
        'Requires human intervention',
        'System execution paused',
        `Severity: ${failure.rootCause?.severity}`
      ]
    };
  }

  // ============================================================================
  // Recovery Mechanisms
  // ============================================================================

  /**
   * Attempt to recover from a failure
   */
  public async attemptRecovery(failure: Failure, state: SystemState): Promise<RecoveryResult> {
    const recoveryActions: RecoveryAction[] = [];
    let success = false;
    let restoredState: Partial<SystemState> | undefined;
    let error: Error | undefined;

    try {
      const rootCause = failure.rootCause!;

      // State rollback
      if (this.shouldRollback(failure, rootCause)) {
        const checkpoint = this.findLastGoodCheckpoint(state);
        if (checkpoint) {
          restoredState = checkpoint.state;
          recoveryActions.push(RecoveryAction.STATE_ROLLBACK);
          this.emit('recovery:rollback', { checkpoint });
        }
      }

      // Resource reallocation
      if (rootCause.category === 'resource') {
        const reallocated = await this.reallocateResources(failure.action, state);
        if (reallocated) {
          recoveryActions.push(RecoveryAction.RESOURCE_REALLOCATION);
          this.emit('recovery:reallocation', { action: failure.action });
        }
      }

      // Agent respawning
      const agent = state.agentStates.get(failure.action.agentId);
      if (agent && (agent.status === 'failed' || agent.successRate < 0.3)) {
        await this.respawnAgent(failure.action.agentId, state);
        recoveryActions.push(RecoveryAction.AGENT_RESPAWN);
        this.emit('recovery:respawn', { agentId: failure.action.agentId });
      }

      // Lock refresh
      const staleLocks = this.findStaleLocks(state);
      if (staleLocks.length > 0) {
        await this.refreshLocks(staleLocks);
        recoveryActions.push(RecoveryAction.LOCK_REFRESH);
        this.emit('recovery:locks', { count: staleLocks.length });
      }

      // Context restoration
      if (failure.failureType === FailureType.DEPENDENCY_BLOCKED) {
        await this.restoreContext(failure.action, state);
        recoveryActions.push(RecoveryAction.CONTEXT_RESTORATION);
        this.emit('recovery:context', { action: failure.action });
      }

      success = recoveryActions.length > 0;

    } catch (err) {
      error = err as Error;
      this.emit('recovery:failed', { failure, error: err });
    }

    const result: RecoveryResult = {
      success,
      recoveryActions,
      restoredState,
      error
    };

    this.emit('recovery:completed', result);

    return result;
  }

  private shouldRollback(failure: Failure, rootCause: RootCause): boolean {
    return (
      rootCause.severity === 'critical' ||
      failure.failureType === FailureType.QUALITY_GATE_FAILED ||
      failure.retryCount >= this.MAX_RETRY_ATTEMPTS
    );
  }

  private findLastGoodCheckpoint(state: SystemState): StateCheckpoint | null {
    // Find the most recent checkpoint before failures started
    const sortedCheckpoints = [...state.checkpoints].sort((a, b) => b.timestamp - a.timestamp);

    for (const checkpoint of sortedCheckpoints) {
      const failuresAfter = state.failedActions.filter(f => f.timestamp > checkpoint.timestamp);
      if (failuresAfter.length === 0) {
        return checkpoint;
      }
    }

    return sortedCheckpoints[sortedCheckpoints.length - 1] || null;
  }

  private async reallocateResources(action: Action, state: SystemState): Promise<boolean> {
    // Find resources that can be freed up
    for (const resource of state.availableResources) {
      if (resource.allocated > 0 && resource.allocated < resource.capacity) {
        // Try to free up some capacity
        resource.allocated = Math.max(0, resource.allocated - 1);
        return true;
      }
    }
    return false;
  }

  private async respawnAgent(agentId: string, state: SystemState): Promise<void> {
    const agent = state.agentStates.get(agentId);
    if (agent) {
      agent.status = 'idle';
      agent.currentAction = undefined;
      // Reset success rate to give fresh start
      agent.successRate = 0.5;
    }
  }

  private findStaleLocks(state: SystemState): Lock[] {
    const now = Date.now();
    return Array.from(state.locks.values()).filter(lock => lock.expiresAt < now);
  }

  private async refreshLocks(locks: Lock[]): Promise<void> {
    const now = Date.now();
    locks.forEach(lock => {
      lock.expiresAt = now + 300000; // Extend by 5 minutes
    });
  }

  private async restoreContext(action: Action, state: SystemState): Promise<void> {
    // Restore dependencies and preconditions
    const deps = state.currentPlan.dependencies.get(action.id) || [];
    for (const depId of deps) {
      const depAction = state.executedActions.find(a => a.id === depId);
      if (!depAction) {
        // Re-execute dependency if missing
        this.emit('recovery:dependency', { actionId: depId });
      }
    }
  }

  // ============================================================================
  // Escalation
  // ============================================================================

  /**
   * Escalate to human intervention when needed
   */
  public async escalateIfNeeded(failure: Failure, alternatives: AlternativePlan[]): Promise<boolean> {
    const rootCause = failure.rootCause!;

    const shouldEscalate = (
      !rootCause.recoverable ||
      rootCause.severity === 'critical' ||
      alternatives.every(alt => alt.strategy === ReplanStrategy.ESCALATE) ||
      failure.retryCount >= this.MAX_RETRY_ATTEMPTS
    );

    if (shouldEscalate) {
      this.emit('escalation:required', {
        failure,
        rootCause,
        alternatives,
        reason: this.buildEscalationReason(failure, alternatives)
      });

      return true;
    }

    return false;
  }

  private buildEscalationReason(failure: Failure, alternatives: AlternativePlan[]): string {
    const reasons: string[] = [];

    if (failure.rootCause?.severity === 'critical') {
      reasons.push('Critical severity failure');
    }

    if (!failure.rootCause?.recoverable) {
      reasons.push('Failure is not recoverable');
    }

    if (failure.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      reasons.push(`Maximum retry attempts exceeded (${this.MAX_RETRY_ATTEMPTS})`);
    }

    if (alternatives.length === 0) {
      reasons.push('No alternative plans available');
    } else if (alternatives.every(alt => alt.confidence < 0.3)) {
      reasons.push('All alternatives have low confidence');
    }

    return reasons.join('; ');
  }

  // ============================================================================
  // Learning & Pattern Recognition
  // ============================================================================

  /**
   * Record failure pattern for learning
   */
  private recordFailurePattern(failure: Failure): void {
    const signature = this.generateFailureSignature(failure);

    let pattern = this.failurePatterns.get(signature);
    if (!pattern) {
      pattern = {
        signature,
        occurrences: 0,
        successfulStrategies: new Map(),
        averageRecoveryTime: 0,
        lastSeen: Date.now()
      };
      this.failurePatterns.set(signature, pattern);
    }

    pattern.occurrences++;
    pattern.lastSeen = Date.now();

    // Cleanup old patterns if needed
    if (this.failurePatterns.size > this.PATTERN_MEMORY_SIZE) {
      this.pruneOldPatterns();
    }
  }

  /**
   * Update pattern with successful strategy
   */
  public recordSuccessfulStrategy(failure: Failure, strategy: ReplanStrategy, recoveryTime: number): void {
    const signature = this.generateFailureSignature(failure);
    const pattern = this.failurePatterns.get(signature);

    if (pattern) {
      const currentCount = pattern.successfulStrategies.get(strategy) || 0;
      pattern.successfulStrategies.set(strategy, currentCount + 1);

      // Update average recovery time
      pattern.averageRecoveryTime =
        (pattern.averageRecoveryTime * (pattern.occurrences - 1) + recoveryTime) / pattern.occurrences;
    }

    // Update strategy effectiveness
    this.updateStrategyEffectiveness(strategy, true);
  }

  /**
   * Update pattern with failed strategy
   */
  public recordFailedStrategy(failure: Failure, strategy: ReplanStrategy): void {
    this.updateStrategyEffectiveness(strategy, false);
  }

  /**
   * Generate unique signature for failure pattern
   */
  private generateFailureSignature(failure: Failure): string {
    return `${failure.failureType}:${failure.action.type}:${failure.rootCause?.category || 'unknown'}`;
  }

  /**
   * Update action success rates
   */
  private updateActionSuccessRate(actionType: string, success: boolean): void {
    let stats = this.actionSuccessRates.get(actionType);
    if (!stats) {
      stats = { successes: 0, failures: 0 };
      this.actionSuccessRates.set(actionType, stats);
    }

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
  }

  /**
   * Get success rate for an action type
   */
  private getActionSuccessRate(actionType: string): number {
    const stats = this.actionSuccessRates.get(actionType);
    if (!stats || (stats.successes + stats.failures) === 0) {
      return 0.5; // Default neutral confidence
    }
    return stats.successes / (stats.successes + stats.failures);
  }

  /**
   * Update strategy effectiveness tracking
   */
  private updateStrategyEffectiveness(strategy: ReplanStrategy, success: boolean): void {
    let stats = this.strategyEffectiveness.get(strategy);
    if (!stats) {
      stats = { successes: 0, failures: 0 };
      this.strategyEffectiveness.set(strategy, stats);
    }

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
  }

  /**
   * Get historical success rate for a strategy
   */
  private getStrategySuccessRate(strategy: ReplanStrategy): number {
    const stats = this.strategyEffectiveness.get(strategy);
    if (!stats || (stats.successes + stats.failures) === 0) {
      return 0.6; // Default optimistic confidence
    }
    return stats.successes / (stats.successes + stats.failures);
  }

  /**
   * Prune old failure patterns to maintain memory bounds
   */
  private pruneOldPatterns(): void {
    const patterns = Array.from(this.failurePatterns.entries())
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);

    const toRemove = patterns.slice(0, Math.floor(this.PATTERN_MEMORY_SIZE * 0.2));
    toRemove.forEach(([signature]) => {
      this.failurePatterns.delete(signature);
    });
  }

  /**
   * Get learned insights about failure patterns
   */
  public getFailureInsights(): {
    topFailures: Array<{ signature: string; occurrences: number }>;
    mostEffectiveStrategies: Array<{ strategy: ReplanStrategy; successRate: number }>;
    riskiestActions: Array<{ actionType: string; failureRate: number }>;
  } {
    // Top failures
    const topFailures = Array.from(this.failurePatterns.entries())
      .sort((a, b) => b[1].occurrences - a[1].occurrences)
      .slice(0, 10)
      .map(([signature, pattern]) => ({ signature, occurrences: pattern.occurrences }));

    // Most effective strategies
    const mostEffectiveStrategies = Array.from(this.strategyEffectiveness.entries())
      .map(([strategy, stats]) => ({
        strategy,
        successRate: stats.successes / (stats.successes + stats.failures)
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Riskiest actions
    const riskiestActions = Array.from(this.actionSuccessRates.entries())
      .map(([actionType, stats]) => ({
        actionType,
        failureRate: stats.failures / (stats.successes + stats.failures)
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10);

    return {
      topFailures,
      mostEffectiveStrategies,
      riskiestActions
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateBackoff(retryCount: number): number {
    return this.BACKOFF_BASE_MS * Math.pow(this.BACKOFF_MULTIPLIER, retryCount);
  }

  private actionsHaveSimilarOutcome(action1: Action, action2: Action): boolean {
    // Compare action types and expected outcomes
    return action1.type === action2.type ||
           this.actionTypesAreEquivalent(action1.type, action2.type);
  }

  private actionTypesAreEquivalent(type1: string, type2: string): boolean {
    // Define equivalent action types
    const equivalentGroups = [
      ['http-get', 'fetch', 'request'],
      ['file-write', 'save-file', 'persist'],
      ['file-read', 'load-file', 'fetch-file'],
      ['compute', 'calculate', 'process']
    ];

    return equivalentGroups.some(group =>
      group.includes(type1) && group.includes(type2)
    );
  }

  private isActionCritical(action: Action, goal: Goal): boolean {
    // An action is critical if it directly contributes to required success criteria
    return goal.successCriteria.some(criterion =>
      criterion.required && action.type.includes(criterion.metric)
    );
  }

  private initializeStrategyTracking(): void {
    // Initialize with baseline expectations
    Object.values(ReplanStrategy).forEach(strategy => {
      this.strategyEffectiveness.set(strategy, { successes: 1, failures: 1 });
    });
  }

  private generateFailureId(): string {
    return `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory & Exports
// ============================================================================

export function createReplanner(): AdaptiveReplanner {
  return new AdaptiveReplanner();
}

export default AdaptiveReplanner;
