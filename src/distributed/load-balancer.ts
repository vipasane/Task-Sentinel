/**
 * Load Balancer for Task Sentinel Phase 3
 *
 * Provides intelligent task distribution across workers with multiple
 * balancing strategies, worker affinity rules, and dynamic rebalancing.
 */

export interface WorkerInfo {
  id: string;
  capabilities: Set<string>;
  maxCapacity: number;
  currentLoad: number;
  status: 'idle' | 'busy' | 'overloaded' | 'offline';
  metrics: WorkerMetrics;
  affinity?: Map<string, number>; // Task type -> affinity score
}

export interface WorkerMetrics {
  successRate: number; // 0-1
  failureRate: number; // 0-1
  averageTaskDuration: number; // milliseconds
  tasksCompleted: number;
  tasksFailed: number;
  lastFailureTime?: number;
  uptime: number; // milliseconds
}

export interface TaskRequirements {
  capabilities: string[];
  complexity: number; // 1-10
  priority: number; // 1-10
  estimatedDuration?: number;
  taskType?: string;
  affinity?: string[]; // Preferred worker IDs
  antiAffinity?: string[]; // Avoid these worker IDs
}

export interface BalancingStrategy {
  name: string;
  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[],
    context?: BalancingContext
  ): WorkerInfo | null;
}

export interface BalancingContext {
  taskHistory?: Map<string, string[]>; // Worker ID -> completed task types
  recentFailures?: Map<string, number>; // Worker ID -> failure timestamp
  affinityRules?: Map<string, string[]>; // Task type -> preferred worker IDs
  loadThreshold?: number;
}

export interface WorkerScore {
  worker: WorkerInfo;
  score: number;
  breakdown: {
    capacityScore: number;
    performanceScore: number;
    affinityScore: number;
    reliabilityScore: number;
  };
}

export interface RebalanceRecommendation {
  reason: string;
  taskId: string;
  fromWorker: string;
  toWorker: string;
  priority: number;
}

/**
 * Round Robin Strategy
 * Simple rotation through available workers
 */
export class RoundRobinStrategy implements BalancingStrategy {
  name = 'round-robin';
  private lastWorkerIndex = -1;

  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[]
  ): WorkerInfo | null {
    const available = workers.filter(
      w => w.status !== 'offline' && this.hasCapabilities(w, task.capabilities)
    );

    if (available.length === 0) return null;

    this.lastWorkerIndex = (this.lastWorkerIndex + 1) % available.length;
    return available[this.lastWorkerIndex];
  }

  private hasCapabilities(worker: WorkerInfo, required: string[]): boolean {
    return required.every(cap => worker.capabilities.has(cap));
  }
}

/**
 * Least Loaded Strategy
 * Assigns to worker with lowest current load
 */
export class LeastLoadedStrategy implements BalancingStrategy {
  name = 'least-loaded';

  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[]
  ): WorkerInfo | null {
    const capable = workers.filter(
      w =>
        w.status !== 'offline' &&
        w.status !== 'overloaded' &&
        this.hasCapabilities(w, task.capabilities)
    );

    if (capable.length === 0) return null;

    // Sort by available capacity (maxCapacity - currentLoad)
    const sorted = capable.sort((a, b) => {
      const availableA = a.maxCapacity - a.currentLoad;
      const availableB = b.maxCapacity - b.currentLoad;
      return availableB - availableA;
    });

    return sorted[0];
  }

  private hasCapabilities(worker: WorkerInfo, required: string[]): boolean {
    return required.every(cap => worker.capabilities.has(cap));
  }
}

/**
 * Capability Based Strategy
 * Matches task requirements to worker capabilities
 */
export class CapabilityBasedStrategy implements BalancingStrategy {
  name = 'capability-based';

  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[]
  ): WorkerInfo | null {
    const scored = workers
      .filter(w => w.status !== 'offline')
      .map(worker => ({
        worker,
        score: this.scoreCapabilities(worker, task)
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].worker : null;
  }

  private scoreCapabilities(
    worker: WorkerInfo,
    task: TaskRequirements
  ): number {
    const hasRequired = task.capabilities.every(cap =>
      worker.capabilities.has(cap)
    );
    if (!hasRequired) return 0;

    // Score based on capability overlap and specialization
    const overlapCount = task.capabilities.filter(cap =>
      worker.capabilities.has(cap)
    ).length;
    const specializationScore =
      overlapCount / Math.max(worker.capabilities.size, 1);

    // Penalize overloaded workers
    const capacityPenalty =
      worker.status === 'overloaded'
        ? 0.5
        : 1 - worker.currentLoad / worker.maxCapacity;

    return specializationScore * capacityPenalty;
  }
}

/**
 * Performance Based Strategy
 * Assigns based on historical performance
 */
export class PerformanceBasedStrategy implements BalancingStrategy {
  name = 'performance-based';

  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[],
    context?: BalancingContext
  ): WorkerInfo | null {
    const capable = workers.filter(
      w =>
        w.status !== 'offline' &&
        this.hasCapabilities(w, task.capabilities)
    );

    if (capable.length === 0) return null;

    const scored = capable
      .map(worker => ({
        worker,
        score: this.scorePerformance(worker, task, context)
      }))
      .sort((a, b) => b.score - a.score);

    return scored[0].worker;
  }

  private hasCapabilities(worker: WorkerInfo, required: string[]): boolean {
    return required.every(cap => worker.capabilities.has(cap));
  }

  private scorePerformance(
    worker: WorkerInfo,
    task: TaskRequirements,
    context?: BalancingContext
  ): number {
    const metrics = worker.metrics;

    // Success rate component (0-1)
    const successScore = metrics.successRate;

    // Speed component (inverse of duration)
    const speedScore =
      1 / (1 + metrics.averageTaskDuration / 1000); // Normalize to seconds

    // Reliability component (penalize recent failures)
    let reliabilityScore = 1;
    if (metrics.lastFailureTime && context?.recentFailures) {
      const timeSinceFailure = Date.now() - metrics.lastFailureTime;
      const failurePenalty = Math.max(0, 1 - timeSinceFailure / 60000); // 1min decay
      reliabilityScore = 1 - failurePenalty * 0.3;
    }

    // Capacity component
    const capacityScore = 1 - worker.currentLoad / worker.maxCapacity;

    // Weighted combination
    return (
      0.35 * successScore +
      0.25 * speedScore +
      0.25 * reliabilityScore +
      0.15 * capacityScore
    );
  }
}

/**
 * Adaptive Strategy
 * Combines multiple strategies and learns optimal distribution
 */
export class AdaptiveStrategy implements BalancingStrategy {
  name = 'adaptive';
  private strategyWeights = new Map<string, number>([
    ['performance', 0.4],
    ['capability', 0.3],
    ['least-loaded', 0.2],
    ['round-robin', 0.1]
  ]);

  private strategies: Map<string, BalancingStrategy>;
  private performanceHistory = new Map<
    string,
    { successes: number; failures: number }
  >();

  constructor() {
    this.strategies = new Map([
      ['performance', new PerformanceBasedStrategy()],
      ['capability', new CapabilityBasedStrategy()],
      ['least-loaded', new LeastLoadedStrategy()],
      ['round-robin', new RoundRobinStrategy()]
    ]);
  }

  selectWorker(
    task: TaskRequirements,
    workers: WorkerInfo[],
    context?: BalancingContext
  ): WorkerInfo | null {
    const workerScores = new Map<string, number>();

    // Get selections from each strategy
    for (const [name, strategy] of this.strategies) {
      const selected = strategy.selectWorker(task, workers, context);
      if (selected) {
        const weight = this.strategyWeights.get(name) || 0;
        const currentScore = workerScores.get(selected.id) || 0;
        workerScores.set(selected.id, currentScore + weight);
      }
    }

    if (workerScores.size === 0) return null;

    // Select worker with highest combined score
    let bestWorker: WorkerInfo | null = null;
    let bestScore = -1;

    for (const [workerId, score] of workerScores) {
      if (score > bestScore) {
        bestScore = score;
        bestWorker = workers.find(w => w.id === workerId) || null;
      }
    }

    return bestWorker;
  }

  /**
   * Update strategy weights based on performance feedback
   */
  updateWeights(strategyName: string, success: boolean): void {
    const history = this.performanceHistory.get(strategyName) || {
      successes: 0,
      failures: 0
    };

    if (success) {
      history.successes++;
    } else {
      history.failures++;
    }

    this.performanceHistory.set(strategyName, history);

    // Rebalance weights based on success rates
    this.rebalanceWeights();
  }

  private rebalanceWeights(): void {
    const totalWeight = 1.0;
    let sumSuccessRates = 0;

    const successRates = new Map<string, number>();

    for (const [name] of this.strategies) {
      const history = this.performanceHistory.get(name);
      if (history && history.successes + history.failures > 0) {
        const rate =
          history.successes / (history.successes + history.failures);
        successRates.set(name, rate);
        sumSuccessRates += rate;
      }
    }

    if (sumSuccessRates > 0) {
      for (const [name, rate] of successRates) {
        this.strategyWeights.set(name, rate / sumSuccessRates);
      }
    }
  }

  getWeights(): Map<string, number> {
    return new Map(this.strategyWeights);
  }
}

/**
 * Main Load Balancer
 * Orchestrates task distribution with multiple strategies
 */
export class LoadBalancer {
  private strategies = new Map<string, BalancingStrategy>();
  private currentStrategy: BalancingStrategy;
  private context: BalancingContext;

  constructor(
    initialStrategy: BalancingStrategy = new AdaptiveStrategy(),
    context: BalancingContext = {}
  ) {
    this.currentStrategy = initialStrategy;
    this.context = {
      taskHistory: new Map(),
      recentFailures: new Map(),
      affinityRules: new Map(),
      loadThreshold: 0.8,
      ...context
    };

    // Register all strategies
    this.registerStrategy(new RoundRobinStrategy());
    this.registerStrategy(new LeastLoadedStrategy());
    this.registerStrategy(new CapabilityBasedStrategy());
    this.registerStrategy(new PerformanceBasedStrategy());
    this.registerStrategy(new AdaptiveStrategy());
  }

  /**
   * Register a balancing strategy
   */
  registerStrategy(strategy: BalancingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Set the active balancing strategy
   */
  setStrategy(strategyName: string): boolean {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) return false;
    this.currentStrategy = strategy;
    return true;
  }

  /**
   * Select the best worker for a task
   */
  selectWorker(task: TaskRequirements, workers: WorkerInfo[]): WorkerInfo | null {
    // Filter by capabilities
    const capable = this.filterByCapabilities(workers, task.capabilities);
    if (capable.length === 0) return null;

    // Filter by capacity
    const available = this.filterByCapacity(capable, task.complexity);
    if (available.length === 0) return null;

    // Apply affinity/anti-affinity rules
    const filtered = this.applyAffinityRules(available, task);
    if (filtered.length === 0) return null;

    // Use current strategy to select
    return this.currentStrategy.selectWorker(filtered, task, this.context);
  }

  /**
   * Score all available workers for a task
   */
  scoreWorkers(task: TaskRequirements, workers: WorkerInfo[]): WorkerScore[] {
    return workers
      .filter(w => w.status !== 'offline')
      .map(worker => ({
        worker,
        score: this.calculateWorkerScore(worker, task),
        breakdown: this.getScoreBreakdown(worker, task)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate comprehensive worker score
   */
  private calculateWorkerScore(
    worker: WorkerInfo,
    task: TaskRequirements
  ): number {
    const breakdown = this.getScoreBreakdown(worker, task);
    return (
      0.4 * breakdown.capacityScore +
      0.3 * breakdown.performanceScore +
      0.2 * breakdown.affinityScore +
      0.1 * breakdown.reliabilityScore
    );
  }

  /**
   * Get detailed score breakdown
   */
  private getScoreBreakdown(
    worker: WorkerInfo,
    task: TaskRequirements
  ): WorkerScore['breakdown'] {
    // Capacity score (available capacity / max capacity)
    const availableCapacity = worker.maxCapacity - worker.currentLoad;
    const capacityScore = Math.max(0, availableCapacity / worker.maxCapacity);

    // Performance score (success rate)
    const performanceScore = worker.metrics.successRate;

    // Affinity score
    let affinityScore = 0.5; // Neutral default
    if (task.taskType && worker.affinity?.has(task.taskType)) {
      affinityScore = worker.affinity.get(task.taskType) || 0.5;
    }
    if (task.affinity?.includes(worker.id)) {
      affinityScore = Math.min(1, affinityScore + 0.3);
    }
    if (task.antiAffinity?.includes(worker.id)) {
      affinityScore = Math.max(0, affinityScore - 0.5);
    }

    // Reliability score (inverse of average duration + failure penalty)
    const durationScore =
      1 / (1 + worker.metrics.averageTaskDuration / 10000);
    const failurePenalty = worker.metrics.failureRate * 0.5;
    const reliabilityScore = Math.max(0, durationScore - failurePenalty);

    return {
      capacityScore,
      performanceScore,
      affinityScore,
      reliabilityScore
    };
  }

  /**
   * Filter workers by required capabilities
   */
  private filterByCapabilities(
    workers: WorkerInfo[],
    required: string[]
  ): WorkerInfo[] {
    return workers.filter(worker =>
      required.every(cap => worker.capabilities.has(cap))
    );
  }

  /**
   * Filter workers by available capacity
   */
  private filterByCapacity(
    workers: WorkerInfo[],
    taskComplexity: number
  ): WorkerInfo[] {
    return workers.filter(worker => {
      const availableCapacity = worker.maxCapacity - worker.currentLoad;
      return availableCapacity >= taskComplexity && worker.status !== 'overloaded';
    });
  }

  /**
   * Apply affinity and anti-affinity rules
   */
  private applyAffinityRules(
    workers: WorkerInfo[],
    task: TaskRequirements
  ): WorkerInfo[] {
    let filtered = [...workers];

    // Apply anti-affinity (hard constraint)
    if (task.antiAffinity && task.antiAffinity.length > 0) {
      filtered = filtered.filter(w => !task.antiAffinity!.includes(w.id));
    }

    // Sort by affinity preference (soft constraint)
    if (task.affinity && task.affinity.length > 0) {
      filtered.sort((a, b) => {
        const aPreferred = task.affinity!.includes(a.id) ? 1 : 0;
        const bPreferred = task.affinity!.includes(b.id) ? 1 : 0;
        return bPreferred - aPreferred;
      });
    }

    return filtered;
  }

  /**
   * Detect overloaded workers and recommend rebalancing
   */
  detectOverload(workers: WorkerInfo[]): RebalanceRecommendation[] {
    const recommendations: RebalanceRecommendation[] = [];
    const loadThreshold = this.context.loadThreshold || 0.8;

    const overloaded = workers.filter(
      w =>
        w.status === 'overloaded' ||
        w.currentLoad / w.maxCapacity > loadThreshold
    );

    const underutilized = workers.filter(
      w =>
        w.status === 'idle' ||
        (w.currentLoad / w.maxCapacity < 0.3 && w.status !== 'offline')
    );

    if (overloaded.length > 0 && underutilized.length > 0) {
      for (const worker of overloaded) {
        recommendations.push({
          reason: `Worker ${worker.id} is overloaded (${Math.round((worker.currentLoad / worker.maxCapacity) * 100)}% capacity)`,
          taskId: 'auto-rebalance',
          fromWorker: worker.id,
          toWorker: underutilized[0].id,
          priority: Math.round((worker.currentLoad / worker.maxCapacity) * 10)
        });
      }
    }

    return recommendations;
  }

  /**
   * Suggest task migration for better load distribution
   */
  suggestMigration(
    workers: WorkerInfo[],
    taskQueue: Array<{ id: string; requirements: TaskRequirements }>
  ): RebalanceRecommendation[] {
    const recommendations: RebalanceRecommendation[] = [];

    // Calculate load variance
    const loads = workers.map(w => w.currentLoad / w.maxCapacity);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance =
      loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) /
      loads.length;

    // High variance indicates poor distribution
    if (variance > 0.1) {
      const sorted = [...workers].sort(
        (a, b) =>
          b.currentLoad / b.maxCapacity - a.currentLoad / a.maxCapacity
      );

      const busiest = sorted[0];
      const leastBusy = sorted[sorted.length - 1];

      if (
        busiest.currentLoad / busiest.maxCapacity >
        leastBusy.currentLoad / leastBusy.maxCapacity + 0.2
      ) {
        recommendations.push({
          reason: `Load imbalance detected: ${busiest.id} at ${Math.round((busiest.currentLoad / busiest.maxCapacity) * 100)}%, ${leastBusy.id} at ${Math.round((leastBusy.currentLoad / leastBusy.maxCapacity) * 100)}%`,
          taskId: 'rebalance-queue',
          fromWorker: busiest.id,
          toWorker: leastBusy.id,
          priority: Math.round(variance * 100)
        });
      }
    }

    return recommendations;
  }

  /**
   * Reorder task queue for optimal efficiency
   */
  reorderQueue(
    taskQueue: Array<{ id: string; requirements: TaskRequirements }>,
    workers: WorkerInfo[]
  ): Array<{ id: string; requirements: TaskRequirements; assignedWorker?: string }> {
    // Score each task-worker pairing
    const taskAssignments = taskQueue.map(task => {
      const scores = this.scoreWorkers(task.requirements, workers);
      return {
        ...task,
        assignedWorker: scores.length > 0 ? scores[0].worker.id : undefined,
        score: scores.length > 0 ? scores[0].score : 0
      };
    });

    // Sort by priority first, then by worker availability
    return taskAssignments.sort((a, b) => {
      const priorityDiff =
        (b.requirements.priority || 0) - (a.requirements.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return b.score - a.score;
    });
  }

  /**
   * Update context with task completion feedback
   */
  updateContext(
    workerId: string,
    taskType: string,
    success: boolean,
    duration: number
  ): void {
    // Update task history
    if (!this.context.taskHistory) {
      this.context.taskHistory = new Map();
    }
    const history = this.context.taskHistory.get(workerId) || [];
    history.push(taskType);
    this.context.taskHistory.set(workerId, history);

    // Update recent failures
    if (!success) {
      if (!this.context.recentFailures) {
        this.context.recentFailures = new Map();
      }
      this.context.recentFailures.set(workerId, Date.now());
    }

    // Update adaptive strategy if using it
    if (this.currentStrategy instanceof AdaptiveStrategy) {
      this.currentStrategy.updateWeights(this.currentStrategy.name, success);
    }
  }

  /**
   * Get current strategy name
   */
  getCurrentStrategy(): string {
    return this.currentStrategy.name;
  }

  /**
   * Get all registered strategy names
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get balancing context
   */
  getContext(): BalancingContext {
    return { ...this.context };
  }

  /**
   * Update balancing context
   */
  updateContextSettings(updates: Partial<BalancingContext>): void {
    this.context = { ...this.context, ...updates };
  }
}

export default LoadBalancer;
