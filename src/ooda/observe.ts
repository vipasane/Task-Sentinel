/**
 * OODA Observe Phase
 * Collects information about system state, tasks, and resources
 */

import { Octokit } from '@octokit/rest';

/**
 * Task observation from GitHub Issues
 */
export interface TaskObservation {
  issueNumber: number;
  title: string;
  body: string;
  labels: string[];
  state: 'open' | 'closed';
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedComplexity?: number;
}

/**
 * Worker status observation
 */
export interface WorkerStatus {
  workerId: string;
  state: 'idle' | 'busy' | 'offline';
  currentTask?: string;
  capabilities: string[];
  loadFactor: number;
  availableResources: {
    cpu: number;
    memory: number;
    concurrentSlots: number;
  };
  performance: {
    tasksCompleted: number;
    averageTaskTime: number;
    successRate: number;
  };
}

/**
 * Memory state observation
 */
export interface MemoryState {
  coordinationState: Record<string, unknown>;
  activeSwarms: string[];
  taskAssignments: Map<string, string>;
  sharedContext: Record<string, unknown>;
  recentDecisions: Array<{
    timestamp: number;
    decision: string;
    outcome: string;
  }>;
}

/**
 * System observation snapshot
 */
export interface SystemObservation {
  timestamp: number;
  readyTasks: TaskObservation[];
  workerStatuses: WorkerStatus[];
  memoryState: MemoryState;
  systemHealth: {
    activeWorkers: number;
    totalWorkers: number;
    queueDepth: number;
    averageWaitTime: number;
  };
  metrics: {
    tasksPerHour: number;
    successRate: number;
    averageResponseTime: number;
  };
}

/**
 * Observation metrics
 */
export interface ObservationMetrics {
  observationCount: number;
  avgObservationTime: number;
  tasksDiscovered: number;
  workersOnline: number;
  lastObservationTime: number;
  errorCount: number;
}

/**
 * OODA Observe System
 * Implements the Observe phase of the OODA loop
 */
export class ObserveSystem {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private metrics: ObservationMetrics;

  constructor(
    githubToken: string,
    owner: string,
    repo: string
  ) {
    this.octokit = new Octokit({ auth: githubToken });
    this.owner = owner;
    this.repo = repo;
    this.metrics = {
      observationCount: 0,
      avgObservationTime: 0,
      tasksDiscovered: 0,
      workersOnline: 0,
      lastObservationTime: 0,
      errorCount: 0
    };
  }

  /**
   * Perform a complete system observation
   */
  public async observe(): Promise<SystemObservation> {
    const startTime = Date.now();

    try {
      const [readyTasks, workerStatuses, memoryState] = await Promise.all([
        this.checkReadyTasks(),
        this.getWorkerStatus(),
        this.getMemoryState()
      ]);

      const systemHealth = this.calculateSystemHealth(workerStatuses, readyTasks);
      const metrics = this.calculateSystemMetrics();

      const observation: SystemObservation = {
        timestamp: Date.now(),
        readyTasks,
        workerStatuses,
        memoryState,
        systemHealth,
        metrics
      };

      this.updateObservationMetrics(startTime, readyTasks.length, workerStatuses.length);

      return observation;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  /**
   * Check for ready tasks from GitHub Issues
   */
  public async checkReadyTasks(): Promise<TaskObservation[]> {
    try {
      const { data: issues } = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        labels: 'ready',
        per_page: 100
      });

      return issues.map((issue: any) => this.mapIssueToTask(issue));
    } catch (error) {
      console.error('Failed to check ready tasks:', error);
      return [];
    }
  }

  /**
   * Get status of all workers
   */
  public async getWorkerStatus(): Promise<WorkerStatus[]> {
    try {
      // In a real implementation, this would query worker health endpoints
      // For now, we'll simulate with memory state
      const memoryState = await this.getMemoryState();
      const workers: WorkerStatus[] = [];

      // Extract worker information from coordination state
      if (memoryState.coordinationState.workers) {
        const workersData = memoryState.coordinationState.workers as Record<string, any>;

        for (const [workerId, workerData] of Object.entries(workersData)) {
          workers.push({
            workerId,
            state: workerData.state || 'idle',
            currentTask: workerData.currentTask,
            capabilities: workerData.capabilities || [],
            loadFactor: workerData.loadFactor || 0,
            availableResources: {
              cpu: workerData.cpu || 100,
              memory: workerData.memory || 100,
              concurrentSlots: workerData.slots || 1
            },
            performance: {
              tasksCompleted: workerData.tasksCompleted || 0,
              averageTaskTime: workerData.avgTaskTime || 0,
              successRate: workerData.successRate || 1.0
            }
          });
        }
      }

      return workers;
    } catch (error) {
      console.error('Failed to get worker status:', error);
      return [];
    }
  }

  /**
   * Retrieve coordination state from memory
   */
  public async getMemoryState(): Promise<MemoryState> {
    try {
      // This would integrate with Claude Flow memory system
      // For now, return empty state
      return {
        coordinationState: {},
        activeSwarms: [],
        taskAssignments: new Map(),
        sharedContext: {},
        recentDecisions: []
      };
    } catch (error) {
      console.error('Failed to get memory state:', error);
      return {
        coordinationState: {},
        activeSwarms: [],
        taskAssignments: new Map(),
        sharedContext: {},
        recentDecisions: []
      };
    }
  }

  /**
   * Get observation metrics
   */
  public getMetrics(): ObservationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset observation metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      observationCount: 0,
      avgObservationTime: 0,
      tasksDiscovered: 0,
      workersOnline: 0,
      lastObservationTime: 0,
      errorCount: 0
    };
  }

  // Private helper methods

  private mapIssueToTask(issue: any): TaskObservation {
    const labels = issue.labels.map((l: any) =>
      typeof l === 'string' ? l : l.name
    );

    const priority = this.extractPriority(labels);
    const complexity = this.estimateComplexity(issue);

    return {
      issueNumber: issue.number,
      title: issue.title,
      body: issue.body || '',
      labels,
      state: issue.state,
      assignee: issue.assignee?.login,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      priority,
      estimatedComplexity: complexity
    };
  }

  private extractPriority(labels: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (labels.includes('priority:critical')) return 'critical';
    if (labels.includes('priority:high')) return 'high';
    if (labels.includes('priority:medium')) return 'medium';
    return 'low';
  }

  private estimateComplexity(issue: any): number {
    // Simple heuristic based on body length and labels
    let complexity = 1;

    const bodyLength = issue.body?.length || 0;
    if (bodyLength > 1000) complexity += 2;
    else if (bodyLength > 500) complexity += 1;

    const labels = issue.labels.map((l: any) =>
      typeof l === 'string' ? l : l.name
    );

    if (labels.includes('complexity:high')) complexity += 3;
    else if (labels.includes('complexity:medium')) complexity += 2;

    return Math.min(complexity, 10);
  }

  private calculateSystemHealth(
    workers: WorkerStatus[],
    tasks: TaskObservation[]
  ): SystemObservation['systemHealth'] {
    const activeWorkers = workers.filter(w => w.state !== 'offline').length;

    // Calculate average wait time based on queue depth and worker capacity
    const totalCapacity = workers.reduce((sum, w) =>
      sum + (w.state === 'idle' ? w.availableResources.concurrentSlots : 0), 0
    );
    const queueDepth = Math.max(0, tasks.length - totalCapacity);

    const avgTaskTime = workers.length > 0
      ? workers.reduce((sum, w) => sum + w.performance.averageTaskTime, 0) / workers.length
      : 0;

    const averageWaitTime = totalCapacity > 0
      ? (queueDepth / totalCapacity) * avgTaskTime
      : tasks.length * 300000; // 5 minutes default

    return {
      activeWorkers,
      totalWorkers: workers.length,
      queueDepth,
      averageWaitTime
    };
  }

  private calculateSystemMetrics(): SystemObservation['metrics'] {
    // These would be calculated from historical data
    // For now, return defaults
    return {
      tasksPerHour: 0,
      successRate: 1.0,
      averageResponseTime: 0
    };
  }

  private updateObservationMetrics(
    startTime: number,
    tasksFound: number,
    workersFound: number
  ): void {
    const duration = Date.now() - startTime;

    this.metrics.observationCount++;
    this.metrics.avgObservationTime =
      (this.metrics.avgObservationTime * (this.metrics.observationCount - 1) + duration)
      / this.metrics.observationCount;
    this.metrics.tasksDiscovered += tasksFound;
    this.metrics.workersOnline = workersFound;
    this.metrics.lastObservationTime = Date.now();
  }
}
