/**
 * OODA Orient Phase
 * Analyzes observations and determines context, strategies, and resource requirements
 */

import { TaskObservation, WorkerStatus, MemoryState } from './observe';

/**
 * Task complexity analysis
 */
export interface ComplexityAnalysis {
  score: number;
  factors: {
    codeComplexity: number;
    dependencyCount: number;
    estimatedLines: number;
    domainKnowledge: number;
    integrationPoints: number;
  };
  category: 'trivial' | 'simple' | 'moderate' | 'complex' | 'critical';
  estimatedEffort: number; // in hours
  confidence: number;
}

/**
 * Task context from memory
 */
export interface TaskContext {
  taskId: string;
  relatedTasks: string[];
  historicalPerformance: {
    similarTasksCompleted: number;
    avgCompletionTime: number;
    successRate: number;
  };
  domainContext: Record<string, unknown>;
  constraints: string[];
  dependencies: string[];
}

/**
 * Strategic approach for task execution
 */
export interface ExecutionStrategy {
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
  rationale: string;
  expectedAgents: number;
  parallelization: 'low' | 'medium' | 'high';
  coordination: 'loose' | 'tight';
  riskLevel: 'low' | 'medium' | 'high';
  fallbackStrategy?: ExecutionStrategy;
}

/**
 * Agent requirements
 */
export interface AgentRequirements {
  agents: Array<{
    type: string;
    role: string;
    capabilities: string[];
    priority: number;
    optional: boolean;
  }>;
  minimumAgents: number;
  optimalAgents: number;
  maximumAgents: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    estimatedDuration: number;
  };
}

/**
 * Orientation decision
 */
export interface OrientationDecision {
  timestamp: number;
  taskId: string;
  complexity: ComplexityAnalysis;
  strategy: ExecutionStrategy;
  agentRequirements: AgentRequirements;
  context: TaskContext;
  confidence: number;
  reasoning: string[];
}

/**
 * Orientation metrics
 */
export interface OrientationMetrics {
  decisionsCount: number;
  avgOrientationTime: number;
  avgConfidence: number;
  strategyDistribution: Map<string, number>;
  complexityDistribution: Map<string, number>;
}

/**
 * OODA Orient System
 * Implements the Orient phase of the OODA loop
 */
export class OrientSystem {
  private metrics: OrientationMetrics;
  private decisions: OrientationDecision[] = [];
  private readonly maxStoredDecisions: number;

  constructor(maxStoredDecisions: number = 1000) {
    this.maxStoredDecisions = maxStoredDecisions;
    this.metrics = {
      decisionsCount: 0,
      avgOrientationTime: 0,
      avgConfidence: 0,
      strategyDistribution: new Map(),
      complexityDistribution: new Map()
    };
  }

  /**
   * Perform complete orientation for a task
   */
  public async orient(
    task: TaskObservation,
    workers: WorkerStatus[],
    memoryState: MemoryState
  ): Promise<OrientationDecision> {
    const startTime = Date.now();

    // Analyze task complexity
    const complexity = this.analyzeTaskComplexity(task);

    // Load historical context
    const context = await this.loadContext(task.issueNumber.toString());

    // Select execution strategy
    const strategy = this.selectStrategy(complexity, workers, context);

    // Determine agent requirements
    const agentRequirements = this.determineAgents(
      complexity,
      strategy,
      task,
      workers
    );

    // Build reasoning chain
    const reasoning = this.buildReasoning(
      task,
      complexity,
      strategy,
      agentRequirements,
      workers
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(
      complexity,
      workers,
      context,
      agentRequirements
    );

    const decision: OrientationDecision = {
      timestamp: Date.now(),
      taskId: task.issueNumber.toString(),
      complexity,
      strategy,
      agentRequirements,
      context,
      confidence,
      reasoning
    };

    this.recordOrientationDecision(decision, startTime);

    return decision;
  }

  /**
   * Analyze task complexity
   */
  public analyzeTaskComplexity(task: TaskObservation): ComplexityAnalysis {
    const factors = {
      codeComplexity: this.estimateCodeComplexity(task),
      dependencyCount: this.estimateDependencies(task),
      estimatedLines: this.estimateLines(task),
      domainKnowledge: this.estimateDomainKnowledge(task),
      integrationPoints: this.estimateIntegrationPoints(task)
    };

    // Weighted complexity score
    const score =
      factors.codeComplexity * 0.3 +
      factors.dependencyCount * 0.2 +
      (factors.estimatedLines / 1000) * 0.2 +
      factors.domainKnowledge * 0.15 +
      factors.integrationPoints * 0.15;

    const category = this.categorizeComplexity(score);
    const estimatedEffort = this.estimateEffort(score, category);
    const confidence = this.estimateComplexityConfidence(task);

    return {
      score,
      factors,
      category,
      estimatedEffort,
      confidence
    };
  }

  /**
   * Load context from memory
   */
  public async loadContext(taskId: string): Promise<TaskContext> {
    // This would integrate with Claude Flow memory
    // For now, return empty context
    return {
      taskId,
      relatedTasks: [],
      historicalPerformance: {
        similarTasksCompleted: 0,
        avgCompletionTime: 0,
        successRate: 1.0
      },
      domainContext: {},
      constraints: [],
      dependencies: []
    };
  }

  /**
   * Select execution strategy based on complexity
   */
  public selectStrategy(
    complexity: ComplexityAnalysis,
    workers: WorkerStatus[],
    context: TaskContext
  ): ExecutionStrategy {
    const availableWorkers = workers.filter(w => w.state !== 'offline').length;

    // Strategy selection based on complexity and resources
    if (complexity.category === 'trivial') {
      return {
        topology: 'star',
        rationale: 'Simple task requires single coordinator with minimal parallelization',
        expectedAgents: 2,
        parallelization: 'low',
        coordination: 'loose',
        riskLevel: 'low'
      };
    }

    if (complexity.category === 'simple') {
      return {
        topology: 'star',
        rationale: 'Straightforward task with single point of coordination',
        expectedAgents: 3,
        parallelization: 'medium',
        coordination: 'loose',
        riskLevel: 'low'
      };
    }

    if (complexity.category === 'moderate') {
      return {
        topology: 'hierarchical',
        rationale: 'Moderate complexity benefits from hierarchical coordination',
        expectedAgents: 5,
        parallelization: 'medium',
        coordination: 'tight',
        riskLevel: 'medium'
      };
    }

    if (complexity.category === 'complex') {
      return {
        topology: 'mesh',
        rationale: 'Complex task requires peer-to-peer coordination for flexibility',
        expectedAgents: 8,
        parallelization: 'high',
        coordination: 'tight',
        riskLevel: 'medium'
      };
    }

    // Critical complexity
    return {
      topology: 'hierarchical',
      rationale: 'Critical task requires structured coordination with clear command chain',
      expectedAgents: 10,
      parallelization: 'high',
      coordination: 'tight',
      riskLevel: 'high',
      fallbackStrategy: {
        topology: 'mesh',
        rationale: 'Fallback to mesh for distributed decision making',
        expectedAgents: 8,
        parallelization: 'high',
        coordination: 'tight',
        riskLevel: 'high'
      }
    };
  }

  /**
   * Determine required agents for task
   */
  public determineAgents(
    complexity: ComplexityAnalysis,
    strategy: ExecutionStrategy,
    task: TaskObservation,
    workers: WorkerStatus[]
  ): AgentRequirements {
    const agents: AgentRequirements['agents'] = [];

    // Always need coordinator
    agents.push({
      type: 'coordinator',
      role: 'Task coordination and progress monitoring',
      capabilities: ['coordination', 'monitoring', 'decision-making'],
      priority: 1,
      optional: false
    });

    // Add researcher for understanding requirements
    if (complexity.category !== 'trivial') {
      agents.push({
        type: 'researcher',
        role: 'Analyze requirements and research solutions',
        capabilities: ['research', 'analysis', 'documentation'],
        priority: 2,
        optional: false
      });
    }

    // Add coder for implementation
    agents.push({
      type: 'coder',
      role: 'Implement solution and write code',
      capabilities: ['coding', 'implementation', 'refactoring'],
      priority: 3,
      optional: false
    });

    // Add tester for quality assurance
    if (complexity.category !== 'trivial') {
      agents.push({
        type: 'tester',
        role: 'Write and execute tests',
        capabilities: ['testing', 'qa', 'validation'],
        priority: 4,
        optional: false
      });
    }

    // Add reviewer for code quality
    if (complexity.score >= 5) {
      agents.push({
        type: 'reviewer',
        role: 'Review code quality and architecture',
        capabilities: ['code-review', 'architecture', 'best-practices'],
        priority: 5,
        optional: false
      });
    }

    // Add architect for complex systems
    if (complexity.category === 'complex' || complexity.category === 'critical') {
      agents.push({
        type: 'system-architect',
        role: 'Design system architecture and patterns',
        capabilities: ['architecture', 'design', 'patterns'],
        priority: 2,
        optional: false
      });
    }

    // Add optimizer for performance-critical tasks
    if (task.labels.includes('performance') || complexity.category === 'critical') {
      agents.push({
        type: 'perf-analyzer',
        role: 'Analyze and optimize performance',
        capabilities: ['optimization', 'profiling', 'benchmarking'],
        priority: 6,
        optional: true
      });
    }

    // Calculate resource requirements
    const estimatedDuration = complexity.estimatedEffort * 3600000; // hours to ms
    const resourceRequirements = {
      cpu: complexity.score * 10,
      memory: complexity.score * 100,
      estimatedDuration
    };

    return {
      agents,
      minimumAgents: agents.filter(a => !a.optional).length,
      optimalAgents: agents.length,
      maximumAgents: agents.length + 2,
      resourceRequirements
    };
  }

  /**
   * Record orientation decision
   */
  public recordOrientationDecision(
    decision: OrientationDecision,
    startTime: number
  ): void {
    this.decisions.push(decision);

    // Evict old decisions
    if (this.decisions.length > this.maxStoredDecisions) {
      this.decisions.shift();
    }

    // Update metrics
    const duration = Date.now() - startTime;
    this.metrics.decisionsCount++;
    this.metrics.avgOrientationTime =
      (this.metrics.avgOrientationTime * (this.metrics.decisionsCount - 1) + duration)
      / this.metrics.decisionsCount;
    this.metrics.avgConfidence =
      (this.metrics.avgConfidence * (this.metrics.decisionsCount - 1) + decision.confidence)
      / this.metrics.decisionsCount;

    // Update distributions
    const topologyCount = this.metrics.strategyDistribution.get(decision.strategy.topology) || 0;
    this.metrics.strategyDistribution.set(decision.strategy.topology, topologyCount + 1);

    const complexityCount = this.metrics.complexityDistribution.get(decision.complexity.category) || 0;
    this.metrics.complexityDistribution.set(decision.complexity.category, complexityCount + 1);
  }

  /**
   * Get orientation metrics
   */
  public getMetrics(): OrientationMetrics {
    return {
      ...this.metrics,
      strategyDistribution: new Map(this.metrics.strategyDistribution),
      complexityDistribution: new Map(this.metrics.complexityDistribution)
    };
  }

  /**
   * Get recent decisions
   */
  public getRecentDecisions(count: number = 10): OrientationDecision[] {
    return this.decisions.slice(-count);
  }

  // Private helper methods

  private estimateCodeComplexity(task: TaskObservation): number {
    let complexity = 1;

    const keywords = {
      high: ['architecture', 'refactor', 'migration', 'distributed', 'async'],
      medium: ['api', 'integration', 'database', 'authentication'],
      low: ['fix', 'update', 'documentation', 'style']
    };

    const text = `${task.title} ${task.body}`.toLowerCase();

    if (keywords.high.some(k => text.includes(k))) complexity += 3;
    else if (keywords.medium.some(k => text.includes(k))) complexity += 2;
    else if (keywords.low.some(k => text.includes(k))) complexity += 1;

    return Math.min(complexity, 10);
  }

  private estimateDependencies(task: TaskObservation): number {
    const text = `${task.title} ${task.body}`.toLowerCase();
    const dependencyKeywords = ['depends', 'requires', 'needs', 'integrate', 'connect'];
    return dependencyKeywords.filter(k => text.includes(k)).length;
  }

  private estimateLines(task: TaskObservation): number {
    const baseLines = 100;
    const multiplier = task.estimatedComplexity || 1;
    return baseLines * multiplier;
  }

  private estimateDomainKnowledge(task: TaskObservation): number {
    const specializedKeywords = [
      'ml', 'ai', 'blockchain', 'crypto', 'quantum',
      'embedded', 'kernel', 'compiler', 'graphics'
    ];
    const text = `${task.title} ${task.body}`.toLowerCase();
    return specializedKeywords.filter(k => text.includes(k)).length;
  }

  private estimateIntegrationPoints(task: TaskObservation): number {
    const integrationKeywords = ['api', 'webhook', 'service', 'external', 'third-party'];
    const text = `${task.title} ${task.body}`.toLowerCase();
    return integrationKeywords.filter(k => text.includes(k)).length;
  }

  private categorizeComplexity(score: number): ComplexityAnalysis['category'] {
    if (score <= 2) return 'trivial';
    if (score <= 4) return 'simple';
    if (score <= 6) return 'moderate';
    if (score <= 8) return 'complex';
    return 'critical';
  }

  private estimateEffort(score: number, category: string): number {
    const baseHours = {
      trivial: 1,
      simple: 2,
      moderate: 8,
      complex: 24,
      critical: 80
    };
    return (baseHours[category as keyof typeof baseHours] || 8) * (score / 5);
  }

  private estimateComplexityConfidence(task: TaskObservation): number {
    let confidence = 0.7;

    if (task.body.length > 500) confidence += 0.1;
    if (task.labels.length > 3) confidence += 0.1;
    if (task.priority) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private buildReasoning(
    task: TaskObservation,
    complexity: ComplexityAnalysis,
    strategy: ExecutionStrategy,
    requirements: AgentRequirements,
    workers: WorkerStatus[]
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Task complexity: ${complexity.category} (score: ${complexity.score.toFixed(2)})`);
    reasoning.push(`Estimated effort: ${complexity.estimatedEffort.toFixed(1)} hours`);
    reasoning.push(`Selected topology: ${strategy.topology} - ${strategy.rationale}`);
    reasoning.push(`Agents required: ${requirements.minimumAgents}-${requirements.optimalAgents}`);
    reasoning.push(`Available workers: ${workers.filter(w => w.state !== 'offline').length}`);
    reasoning.push(`Parallelization: ${strategy.parallelization}, Coordination: ${strategy.coordination}`);
    reasoning.push(`Risk level: ${strategy.riskLevel}`);

    return reasoning;
  }

  private calculateConfidence(
    complexity: ComplexityAnalysis,
    workers: WorkerStatus[],
    context: TaskContext,
    requirements: AgentRequirements
  ): number {
    let confidence = 0.5;

    // Complexity confidence
    confidence += complexity.confidence * 0.3;

    // Worker availability confidence
    const availableWorkers = workers.filter(w => w.state !== 'offline').length;
    const workerRatio = Math.min(availableWorkers / requirements.optimalAgents, 1.0);
    confidence += workerRatio * 0.3;

    // Historical performance confidence
    if (context.historicalPerformance.similarTasksCompleted > 0) {
      confidence += context.historicalPerformance.successRate * 0.2;
    }

    // Requirements clarity confidence
    if (requirements.agents.every(a => !a.optional)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }
}
