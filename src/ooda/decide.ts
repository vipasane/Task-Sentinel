/**
 * OODA Decide Phase
 * Makes execution decisions based on orientation analysis
 */

import { OrientationDecision, AgentRequirements, ExecutionStrategy } from './orient';
import { WorkerStatus } from './observe';

/**
 * Resource availability assessment
 */
export interface ResourceAvailability {
  availableWorkers: number;
  totalWorkers: number;
  availableCpu: number;
  availableMemory: number;
  concurrentSlots: number;
  utilizationRate: number;
  bottlenecks: string[];
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  planId: string;
  taskId: string;
  strategy: ExecutionStrategy;
  agentAssignments: Array<{
    agentType: string;
    workerId: string;
    role: string;
    priority: number;
  }>;
  executionOrder: string[];
  estimatedCost: {
    cpu: number;
    memory: number;
    time: number;
    apiCalls: number;
  };
  riskFactors: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  successProbability: number;
}

/**
 * Decision outcome
 */
export interface Decision {
  decisionId: string;
  timestamp: number;
  taskId: string;
  selectedPlan: ExecutionPlan;
  alternativePlans: ExecutionPlan[];
  rationale: string;
  confidence: number;
  resourceAllocation: ResourceAvailability;
  constraints: string[];
  approvalRequired: boolean;
}

/**
 * Decision metrics
 */
export interface DecisionMetrics {
  decisionsCount: number;
  avgDecisionTime: number;
  avgConfidence: number;
  approvalRate: number;
  overriddenDecisions: number;
  successfulExecutions: number;
  failedExecutions: number;
}

/**
 * OODA Decide System
 * Implements the Decide phase of the OODA loop
 */
export class DecideSystem {
  private metrics: DecisionMetrics;
  private decisions: Decision[] = [];
  private readonly maxStoredDecisions: number;

  constructor(maxStoredDecisions: number = 1000) {
    this.maxStoredDecisions = maxStoredDecisions;
    this.metrics = {
      decisionsCount: 0,
      avgDecisionTime: 0,
      avgConfidence: 0,
      approvalRate: 1.0,
      overriddenDecisions: 0,
      successfulExecutions: 0,
      failedExecutions: 0
    };
  }

  /**
   * Make execution decision based on orientation
   */
  public async decide(
    orientation: OrientationDecision,
    workers: WorkerStatus[]
  ): Promise<Decision> {
    const startTime = Date.now();

    // Evaluate resource availability
    const resourceAvailability = this.evaluateResourceAvailability(workers);

    // Generate candidate plans
    const candidatePlans = this.generateExecutionPlans(
      orientation,
      resourceAvailability
    );

    // Calculate execution cost for each plan
    const plansWithCost = candidatePlans.map(plan => ({
      ...plan,
      estimatedCost: this.calculateExecutionCost(plan, resourceAvailability)
    }));

    // Select optimal plan
    const selectedPlan = this.selectOptimalPlan(plansWithCost, resourceAvailability);

    // Assign resources to selected plan
    const planWithResources = this.assignResources(selectedPlan, workers);

    // Build decision rationale
    const rationale = this.buildRationale(
      orientation,
      planWithResources,
      plansWithCost,
      resourceAvailability
    );

    // Determine if approval is required
    const approvalRequired = this.requiresApproval(planWithResources, orientation);

    const decision: Decision = {
      decisionId: this.generateDecisionId(),
      timestamp: Date.now(),
      taskId: orientation.taskId,
      selectedPlan: planWithResources,
      alternativePlans: plansWithCost.filter(p => p.planId !== planWithResources.planId),
      rationale,
      confidence: this.calculateDecisionConfidence(
        planWithResources,
        resourceAvailability,
        orientation
      ),
      resourceAllocation: resourceAvailability,
      constraints: this.identifyConstraints(resourceAvailability, orientation),
      approvalRequired
    };

    this.commitDecision(decision, startTime);

    return decision;
  }

  /**
   * Evaluate available resources
   */
  public evaluateResourceAvailability(workers: WorkerStatus[]): ResourceAvailability {
    const activeWorkers = workers.filter(w => w.state !== 'offline');
    const idleWorkers = workers.filter(w => w.state === 'idle');

    const availableCpu = activeWorkers.reduce(
      (sum, w) => sum + w.availableResources.cpu,
      0
    );

    const availableMemory = activeWorkers.reduce(
      (sum, w) => sum + w.availableResources.memory,
      0
    );

    const concurrentSlots = idleWorkers.reduce(
      (sum, w) => sum + w.availableResources.concurrentSlots,
      0
    );

    const totalCapacity = workers.length * 100;
    const utilizationRate = totalCapacity > 0
      ? ((totalCapacity - availableCpu) / totalCapacity)
      : 0;

    const bottlenecks: string[] = [];
    if (availableCpu < 20) bottlenecks.push('cpu');
    if (availableMemory < 20) bottlenecks.push('memory');
    if (concurrentSlots < 1) bottlenecks.push('workers');

    return {
      availableWorkers: idleWorkers.length,
      totalWorkers: workers.length,
      availableCpu,
      availableMemory,
      concurrentSlots,
      utilizationRate,
      bottlenecks
    };
  }

  /**
   * Calculate execution cost for a plan
   */
  public calculateExecutionCost(
    plan: ExecutionPlan,
    resources: ResourceAvailability
  ): ExecutionPlan['estimatedCost'] {
    const baseApiCalls = 10;
    const agentCount = plan.agentAssignments.length;

    return {
      cpu: agentCount * 20,
      memory: agentCount * 50,
      time: plan.estimatedCost?.time || 3600000, // 1 hour default
      apiCalls: baseApiCalls * agentCount
    };
  }

  /**
   * Select optimal plan from candidates
   */
  public selectOptimalPlan(
    plans: ExecutionPlan[],
    resources: ResourceAvailability
  ): ExecutionPlan {
    if (plans.length === 0) {
      throw new Error('No execution plans available');
    }

    // Score each plan based on multiple factors
    const scoredPlans = plans.map(plan => {
      let score = 0;

      // Success probability (40% weight)
      score += plan.successProbability * 40;

      // Resource efficiency (30% weight)
      const resourceFit = this.calculateResourceFit(plan, resources);
      score += resourceFit * 30;

      // Risk factor (20% weight)
      const riskScore = this.calculateRiskScore(plan);
      score += (1 - riskScore) * 20;

      // Execution time (10% weight)
      const timeScore = 1 - Math.min(plan.estimatedCost.time / 14400000, 1); // 4 hours max
      score += timeScore * 10;

      return { plan, score };
    });

    // Sort by score descending
    scoredPlans.sort((a, b) => b.score - a.score);

    return scoredPlans[0].plan;
  }

  /**
   * Assign resources to execution plan
   */
  public assignResources(
    plan: ExecutionPlan,
    workers: WorkerStatus[]
  ): ExecutionPlan {
    const idleWorkers = workers.filter(w => w.state === 'idle');
    const assignments = [...plan.agentAssignments];

    // Match agents to workers based on capabilities
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];

      // Find best matching worker
      const matchedWorker = this.findBestWorker(
        assignment.agentType,
        idleWorkers,
        assignments.slice(0, i)
      );

      if (matchedWorker) {
        assignment.workerId = matchedWorker.workerId;
      } else {
        // No worker available - may need to queue or scale
        assignment.workerId = 'queued';
      }
    }

    return {
      ...plan,
      agentAssignments: assignments
    };
  }

  /**
   * Commit decision and update metrics
   */
  public commitDecision(decision: Decision, startTime: number): void {
    this.decisions.push(decision);

    // Evict old decisions
    if (this.decisions.length > this.maxStoredDecisions) {
      this.decisions.shift();
    }

    // Update metrics
    const duration = Date.now() - startTime;
    this.metrics.decisionsCount++;
    this.metrics.avgDecisionTime =
      (this.metrics.avgDecisionTime * (this.metrics.decisionsCount - 1) + duration)
      / this.metrics.decisionsCount;
    this.metrics.avgConfidence =
      (this.metrics.avgConfidence * (this.metrics.decisionsCount - 1) + decision.confidence)
      / this.metrics.decisionsCount;

    if (!decision.approvalRequired) {
      this.metrics.approvalRate =
        (this.metrics.approvalRate * (this.metrics.decisionsCount - 1) + 1)
        / this.metrics.decisionsCount;
    }
  }

  /**
   * Record execution outcome
   */
  public recordOutcome(decisionId: string, success: boolean): void {
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }
  }

  /**
   * Get decision metrics
   */
  public getMetrics(): DecisionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent decisions
   */
  public getRecentDecisions(count: number = 10): Decision[] {
    return this.decisions.slice(-count);
  }

  /**
   * Get decision by ID
   */
  public getDecision(decisionId: string): Decision | undefined {
    return this.decisions.find(d => d.decisionId === decisionId);
  }

  // Private helper methods

  private generateExecutionPlans(
    orientation: OrientationDecision,
    resources: ResourceAvailability
  ): ExecutionPlan[] {
    const plans: ExecutionPlan[] = [];

    // Primary plan based on orientation
    const primaryPlan = this.createPlan(
      orientation,
      orientation.strategy,
      resources
    );
    plans.push(primaryPlan);

    // Alternative plan with different topology if resources constrained
    if (resources.bottlenecks.length > 0) {
      const alternativeStrategy = this.selectAlternativeStrategy(
        orientation.strategy,
        resources
      );
      const alternativePlan = this.createPlan(
        orientation,
        alternativeStrategy,
        resources
      );
      plans.push(alternativePlan);
    }

    // Fallback plan if one exists
    if (orientation.strategy.fallbackStrategy) {
      const fallbackPlan = this.createPlan(
        orientation,
        orientation.strategy.fallbackStrategy,
        resources
      );
      plans.push(fallbackPlan);
    }

    return plans;
  }

  private createPlan(
    orientation: OrientationDecision,
    strategy: ExecutionStrategy,
    resources: ResourceAvailability
  ): ExecutionPlan {
    const agentAssignments = orientation.agentRequirements.agents
      .slice(0, Math.min(strategy.expectedAgents, resources.availableWorkers + 2))
      .map((agent, index) => ({
        agentType: agent.type,
        workerId: '',
        role: agent.role,
        priority: agent.priority
      }));

    const executionOrder = this.determineExecutionOrder(
      agentAssignments,
      strategy
    );

    const riskFactors = this.identifyRiskFactors(
      strategy,
      resources,
      orientation
    );

    const successProbability = this.estimateSuccessProbability(
      strategy,
      resources,
      riskFactors,
      orientation
    );

    return {
      planId: this.generatePlanId(),
      taskId: orientation.taskId,
      strategy,
      agentAssignments,
      executionOrder,
      estimatedCost: {
        cpu: 0,
        memory: 0,
        time: orientation.agentRequirements.resourceRequirements.estimatedDuration,
        apiCalls: 0
      },
      riskFactors,
      successProbability
    };
  }

  private selectAlternativeStrategy(
    primary: ExecutionStrategy,
    resources: ResourceAvailability
  ): ExecutionStrategy {
    if (resources.bottlenecks.includes('workers')) {
      return {
        ...primary,
        topology: 'star',
        expectedAgents: Math.max(2, Math.floor(primary.expectedAgents / 2)),
        parallelization: 'low'
      };
    }

    return primary;
  }

  private determineExecutionOrder(
    assignments: ExecutionPlan['agentAssignments'],
    strategy: ExecutionStrategy
  ): string[] {
    // Sort by priority
    const sorted = [...assignments].sort((a, b) => a.priority - b.priority);

    if (strategy.parallelization === 'high') {
      return ['parallel:all'];
    }

    if (strategy.parallelization === 'medium') {
      const half = Math.ceil(sorted.length / 2);
      return [
        `parallel:${sorted.slice(0, half).map(a => a.agentType).join(',')}`,
        `parallel:${sorted.slice(half).map(a => a.agentType).join(',')}`
      ];
    }

    return sorted.map(a => a.agentType);
  }

  private identifyRiskFactors(
    strategy: ExecutionStrategy,
    resources: ResourceAvailability,
    orientation: OrientationDecision
  ): ExecutionPlan['riskFactors'] {
    const risks: ExecutionPlan['riskFactors'] = [];

    if (resources.utilizationRate > 0.8) {
      risks.push({
        risk: 'High system utilization',
        severity: 'high',
        mitigation: 'Queue task for later execution'
      });
    }

    if (resources.availableWorkers < strategy.expectedAgents) {
      risks.push({
        risk: 'Insufficient workers available',
        severity: 'medium',
        mitigation: 'Scale down agent count or wait for workers'
      });
    }

    if (orientation.complexity.category === 'critical') {
      risks.push({
        risk: 'Critical complexity task',
        severity: 'high',
        mitigation: 'Enhanced monitoring and fallback plans'
      });
    }

    if (orientation.confidence < 0.7) {
      risks.push({
        risk: 'Low orientation confidence',
        severity: 'medium',
        mitigation: 'Additional research and validation'
      });
    }

    return risks;
  }

  private estimateSuccessProbability(
    strategy: ExecutionStrategy,
    resources: ResourceAvailability,
    risks: ExecutionPlan['riskFactors'],
    orientation: OrientationDecision
  ): number {
    let probability = 0.8;

    // Adjust for resources
    if (resources.availableWorkers >= strategy.expectedAgents) {
      probability += 0.1;
    } else {
      probability -= 0.15;
    }

    // Adjust for risks
    const highRisks = risks.filter(r => r.severity === 'high').length;
    probability -= highRisks * 0.1;

    // Adjust for orientation confidence
    probability += (orientation.confidence - 0.5) * 0.2;

    return Math.max(0.1, Math.min(0.95, probability));
  }

  private calculateResourceFit(
    plan: ExecutionPlan,
    resources: ResourceAvailability
  ): number {
    let fit = 1.0;

    if (plan.estimatedCost.cpu > resources.availableCpu) {
      fit -= 0.3;
    }

    if (plan.estimatedCost.memory > resources.availableMemory) {
      fit -= 0.3;
    }

    if (plan.agentAssignments.length > resources.availableWorkers) {
      fit -= 0.4;
    }

    return Math.max(0, fit);
  }

  private calculateRiskScore(plan: ExecutionPlan): number {
    const weights = { low: 0.1, medium: 0.3, high: 0.6 };
    const totalRisk = plan.riskFactors.reduce(
      (sum, r) => sum + weights[r.severity],
      0
    );
    return Math.min(totalRisk / plan.riskFactors.length || 0, 1);
  }

  private findBestWorker(
    agentType: string,
    workers: WorkerStatus[],
    existingAssignments: ExecutionPlan['agentAssignments']
  ): WorkerStatus | null {
    const assignedWorkerIds = new Set(existingAssignments.map(a => a.workerId));
    const availableWorkers = workers.filter(w => !assignedWorkerIds.has(w.workerId));

    if (availableWorkers.length === 0) return null;

    // Find worker with matching capabilities
    const matchingWorkers = availableWorkers.filter(w =>
      w.capabilities.includes(agentType)
    );

    if (matchingWorkers.length > 0) {
      // Return worker with best performance
      return matchingWorkers.sort((a, b) =>
        b.performance.successRate - a.performance.successRate
      )[0];
    }

    // Return any available worker
    return availableWorkers[0];
  }

  private buildRationale(
    orientation: OrientationDecision,
    plan: ExecutionPlan,
    alternatives: ExecutionPlan[],
    resources: ResourceAvailability
  ): string {
    const parts: string[] = [];

    parts.push(`Selected ${plan.strategy.topology} topology with ${plan.agentAssignments.length} agents`);
    parts.push(`Success probability: ${(plan.successProbability * 100).toFixed(1)}%`);
    parts.push(`Estimated completion: ${(plan.estimatedCost.time / 3600000).toFixed(1)} hours`);
    parts.push(`Resource utilization: ${(resources.utilizationRate * 100).toFixed(1)}%`);

    if (plan.riskFactors.length > 0) {
      parts.push(`Identified ${plan.riskFactors.length} risk factors with mitigations`);
    }

    if (alternatives.length > 0) {
      parts.push(`${alternatives.length} alternative plans considered`);
    }

    return parts.join('. ');
  }

  private requiresApproval(
    plan: ExecutionPlan,
    orientation: OrientationDecision
  ): boolean {
    // Require approval for high-risk or critical tasks
    if (plan.strategy.riskLevel === 'high') return true;
    if (orientation.complexity.category === 'critical') return true;
    if (plan.successProbability < 0.6) return true;
    if (plan.riskFactors.some(r => r.severity === 'high')) return true;

    return false;
  }

  private identifyConstraints(
    resources: ResourceAvailability,
    orientation: OrientationDecision
  ): string[] {
    const constraints: string[] = [];

    if (resources.bottlenecks.length > 0) {
      constraints.push(`Resource bottlenecks: ${resources.bottlenecks.join(', ')}`);
    }

    if (resources.utilizationRate > 0.8) {
      constraints.push('High system utilization');
    }

    if (orientation.context.constraints.length > 0) {
      constraints.push(...orientation.context.constraints);
    }

    return constraints;
  }

  private calculateDecisionConfidence(
    plan: ExecutionPlan,
    resources: ResourceAvailability,
    orientation: OrientationDecision
  ): number {
    let confidence = 0.5;

    confidence += plan.successProbability * 0.3;
    confidence += orientation.confidence * 0.2;
    confidence += (1 - resources.utilizationRate) * 0.2;

    if (resources.availableWorkers >= plan.agentAssignments.length) {
      confidence += 0.2;
    }

    const highRisks = plan.riskFactors.filter(r => r.severity === 'high').length;
    confidence -= highRisks * 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private generateDecisionId(): string {
    return `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlanId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
