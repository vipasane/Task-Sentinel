/**
 * OODA Act Phase
 * Executes decisions by claiming tasks, spawning agents, and monitoring progress
 */

import { Octokit } from '@octokit/rest';
import { Decision, ExecutionPlan } from './decide';

/**
 * Task claim status
 */
export interface TaskClaim {
  issueNumber: number;
  claimedAt: Date;
  claimedBy: string;
  status: 'claimed' | 'in-progress' | 'completed' | 'failed';
  assignmentComment?: string;
}

/**
 * Agent deployment
 */
export interface AgentDeployment {
  agentId: string;
  agentType: string;
  workerId: string;
  status: 'spawning' | 'active' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  progress: number;
  output?: unknown;
  error?: string;
}

/**
 * Execution progress
 */
export interface ExecutionProgress {
  planId: string;
  taskId: string;
  status: 'initializing' | 'executing' | 'monitoring' | 'completing' | 'failed';
  startTime: number;
  currentTime: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  completionPercentage: number;
  agents: AgentDeployment[];
  checkpoints: Array<{
    timestamp: number;
    phase: string;
    status: string;
    message: string;
  }>;
  metrics: {
    apiCallsUsed: number;
    memoryUsed: number;
    cpuUsed: number;
  };
}

/**
 * Failure detection
 */
export interface FailureDetection {
  detectedAt: number;
  failureType: 'agent-failure' | 'timeout' | 'resource-exhaustion' | 'external-error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAgents: string[];
  errorDetails: string;
  recoveryOptions: Array<{
    option: string;
    description: string;
    estimatedRecoveryTime: number;
  }>;
  autoRecoverable: boolean;
}

/**
 * Action metrics
 */
export interface ActionMetrics {
  tasksClaimedCount: number;
  agentsSpawnedCount: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  totalApiCalls: number;
  failureRate: number;
  recoverySuccessRate: number;
}

/**
 * OODA Act System
 * Implements the Act phase of the OODA loop
 */
export class ActSystem {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private metrics: ActionMetrics;
  private activeExecutions: Map<string, ExecutionProgress> = new Map();
  private completedExecutions: Map<string, ExecutionProgress> = new Map();
  private readonly maxStoredExecutions: number;

  constructor(
    githubToken: string,
    owner: string,
    repo: string,
    maxStoredExecutions: number = 1000
  ) {
    this.octokit = new Octokit({ auth: githubToken });
    this.owner = owner;
    this.repo = repo;
    this.maxStoredExecutions = maxStoredExecutions;
    this.metrics = {
      tasksClaimedCount: 0,
      agentsSpawnedCount: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      totalApiCalls: 0,
      failureRate: 0,
      recoverySuccessRate: 0
    };
  }

  /**
   * Execute a decision
   */
  public async execute(decision: Decision): Promise<string> {
    // Claim the task
    await this.claimTask(parseInt(decision.taskId));

    // Initialize execution tracking
    const executionId = this.initializeExecution(decision);

    // Spawn agents according to plan
    await this.spawnAgents(
      decision.selectedPlan.agentAssignments,
      decision.selectedPlan.strategy.topology,
      executionId
    );

    // Execute actions
    await this.executeActions(decision.selectedPlan, executionId);

    return executionId;
  }

  /**
   * Claim a task from GitHub Issues
   */
  public async claimTask(issueNumber: number): Promise<TaskClaim> {
    try {
      // Add comment claiming the task
      const comment = `🤖 Task claimed by Task Sentinel

Status: In Progress
Claimed at: ${new Date().toISOString()}

The OODA loop has analyzed this task and is deploying agents for execution.`;

      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: comment
      });

      // Assign to self (bot account)
      await this.octokit.issues.addAssignees({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        assignees: ['task-sentinel-bot']
      });

      // Add in-progress label
      await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels: ['in-progress', 'automated']
      });

      this.metrics.tasksClaimedCount++;

      return {
        issueNumber,
        claimedAt: new Date(),
        claimedBy: 'task-sentinel-bot',
        status: 'claimed',
        assignmentComment: comment
      };
    } catch (error) {
      console.error('Failed to claim task:', error);
      throw error;
    }
  }

  /**
   * Spawn agents for execution
   */
  public async spawnAgents(
    assignments: ExecutionPlan['agentAssignments'],
    topology: string,
    executionId: string
  ): Promise<AgentDeployment[]> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const deployments: AgentDeployment[] = [];

    // Spawn agents according to topology
    for (const assignment of assignments) {
      const deployment = await this.spawnAgent(
        assignment.agentType,
        assignment.workerId,
        assignment.role,
        topology
      );

      deployments.push(deployment);
      execution.agents.push(deployment);
      this.metrics.agentsSpawnedCount++;
    }

    execution.checkpoints.push({
      timestamp: Date.now(),
      phase: 'spawn',
      status: 'completed',
      message: `Spawned ${deployments.length} agents with ${topology} topology`
    });

    return deployments;
  }

  /**
   * Execute actions according to plan
   */
  public async executeActions(
    plan: ExecutionPlan,
    executionId: string
  ): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    execution.status = 'executing';

    try {
      // Execute in order specified by plan
      for (const step of plan.executionOrder) {
        if (step.startsWith('parallel:')) {
          const agentTypes = step.replace('parallel:', '').split(',');
          await this.executeParallel(agentTypes, execution);
        } else {
          await this.executeSequential(step, execution);
        }

        // Monitor progress
        await this.monitorProgress(executionId);

        // Check for failures
        const failure = await this.detectFailures(executionId);
        if (failure) {
          await this.handleFailure(failure, executionId);
        }
      }

      execution.status = 'completing';
      this.completeExecution(executionId, true);

    } catch (error) {
      execution.status = 'failed';
      execution.checkpoints.push({
        timestamp: Date.now(),
        phase: 'execution',
        status: 'failed',
        message: `Execution failed: ${error}`
      });
      this.completeExecution(executionId, false);
      throw error;
    }
  }

  /**
   * Monitor execution progress
   */
  public async monitorProgress(executionId: string): Promise<ExecutionProgress | null> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return null;

    // Update elapsed time
    execution.currentTime = Date.now();
    execution.elapsedTime = execution.currentTime - execution.startTime;

    // Calculate completion percentage
    const completedAgents = execution.agents.filter(
      a => a.status === 'completed' || a.status === 'failed'
    ).length;
    execution.completionPercentage = (completedAgents / execution.agents.length) * 100;

    // Estimate time remaining
    if (completedAgents > 0) {
      const avgTimePerAgent = execution.elapsedTime / completedAgents;
      const remainingAgents = execution.agents.length - completedAgents;
      execution.estimatedTimeRemaining = avgTimePerAgent * remainingAgents;
    }

    // Update agent progress
    for (const agent of execution.agents) {
      if (agent.status === 'active') {
        agent.progress = await this.getAgentProgress(agent.agentId);
      }
    }

    return execution;
  }

  /**
   * Detect failures in execution
   */
  public async detectFailures(executionId: string): Promise<FailureDetection | null> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return null;

    const failures: FailureDetection[] = [];

    // Check for agent failures
    const failedAgents = execution.agents.filter(a => a.status === 'failed');
    if (failedAgents.length > 0) {
      failures.push({
        detectedAt: Date.now(),
        failureType: 'agent-failure',
        severity: failedAgents.length > 2 ? 'high' : 'medium',
        affectedAgents: failedAgents.map(a => a.agentId),
        errorDetails: failedAgents.map(a => a.error).join('; '),
        recoveryOptions: [
          {
            option: 'restart-agents',
            description: 'Restart failed agents',
            estimatedRecoveryTime: 300000 // 5 minutes
          },
          {
            option: 'spawn-replacements',
            description: 'Spawn replacement agents',
            estimatedRecoveryTime: 600000 // 10 minutes
          }
        ],
        autoRecoverable: true
      });
    }

    // Check for timeout
    const estimatedDuration = 3600000; // 1 hour default
    if (execution.elapsedTime > estimatedDuration * 2) {
      failures.push({
        detectedAt: Date.now(),
        failureType: 'timeout',
        severity: 'high',
        affectedAgents: execution.agents.map(a => a.agentId),
        errorDetails: 'Execution exceeded estimated duration by 2x',
        recoveryOptions: [
          {
            option: 'extend-timeout',
            description: 'Allow more time for completion',
            estimatedRecoveryTime: estimatedDuration
          },
          {
            option: 'abort-and-replan',
            description: 'Abort and create new plan',
            estimatedRecoveryTime: 1800000 // 30 minutes
          }
        ],
        autoRecoverable: false
      });
    }

    // Check for resource exhaustion
    if (execution.metrics.memoryUsed > 90 || execution.metrics.cpuUsed > 90) {
      failures.push({
        detectedAt: Date.now(),
        failureType: 'resource-exhaustion',
        severity: 'critical',
        affectedAgents: execution.agents.map(a => a.agentId),
        errorDetails: 'System resources critically low',
        recoveryOptions: [
          {
            option: 'scale-down',
            description: 'Reduce number of agents',
            estimatedRecoveryTime: 300000
          },
          {
            option: 'migrate-workers',
            description: 'Move to different workers',
            estimatedRecoveryTime: 900000 // 15 minutes
          }
        ],
        autoRecoverable: true
      });
    }

    return failures.length > 0 ? failures[0] : null;
  }

  /**
   * Get active execution progress
   */
  public getExecution(executionId: string): ExecutionProgress | undefined {
    return this.activeExecutions.get(executionId) ||
           this.completedExecutions.get(executionId);
  }

  /**
   * Get all active executions
   */
  public getActiveExecutions(): ExecutionProgress[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get action metrics
   */
  public getMetrics(): ActionMetrics {
    return { ...this.metrics };
  }

  // Private helper methods

  private initializeExecution(decision: Decision): string {
    const executionId = this.generateExecutionId();

    const execution: ExecutionProgress = {
      planId: decision.selectedPlan.planId,
      taskId: decision.taskId,
      status: 'initializing',
      startTime: Date.now(),
      currentTime: Date.now(),
      elapsedTime: 0,
      estimatedTimeRemaining: decision.selectedPlan.estimatedCost.time,
      completionPercentage: 0,
      agents: [],
      checkpoints: [{
        timestamp: Date.now(),
        phase: 'initialize',
        status: 'started',
        message: 'Execution initialized'
      }],
      metrics: {
        apiCallsUsed: 0,
        memoryUsed: 0,
        cpuUsed: 0
      }
    };

    this.activeExecutions.set(executionId, execution);
    return executionId;
  }

  private async spawnAgent(
    agentType: string,
    workerId: string,
    _role: string,
    _topology: string
  ): Promise<AgentDeployment> {
    // This would integrate with Claude Flow agent spawning
    // For now, simulate agent spawn
    const agentId = this.generateAgentId(agentType);

    const deployment: AgentDeployment = {
      agentId,
      agentType,
      workerId,
      status: 'spawning',
      startTime: Date.now(),
      progress: 0
    };

    // Simulate spawn delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    deployment.status = 'active';
    return deployment;
  }

  private async executeParallel(
    agentTypes: string[],
    execution: ExecutionProgress
  ): Promise<void> {
    const agents = execution.agents.filter(a =>
      agentTypes.includes(a.agentType) && a.status === 'active'
    );

    await Promise.all(agents.map(agent => this.executeAgent(agent, execution)));

    execution.checkpoints.push({
      timestamp: Date.now(),
      phase: 'parallel-execution',
      status: 'completed',
      message: `Completed parallel execution of ${agents.length} agents`
    });
  }

  private async executeSequential(
    agentType: string,
    execution: ExecutionProgress
  ): Promise<void> {
    const agent = execution.agents.find(a =>
      a.agentType === agentType && a.status === 'active'
    );

    if (agent) {
      await this.executeAgent(agent, execution);

      execution.checkpoints.push({
        timestamp: Date.now(),
        phase: 'sequential-execution',
        status: 'completed',
        message: `Completed execution of ${agentType}`
      });
    }
  }

  private async executeAgent(
    agent: AgentDeployment,
    execution: ExecutionProgress
  ): Promise<void> {
    // This would trigger actual agent work
    // For now, simulate execution
    const duration = 5000 + Math.random() * 10000; // 5-15 seconds

    const interval = setInterval(() => {
      agent.progress = Math.min(agent.progress + 10, 90);
    }, duration / 10);

    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(interval);

    agent.progress = 100;
    agent.status = 'completed';
    agent.endTime = Date.now();

    execution.metrics.apiCallsUsed += Math.floor(Math.random() * 10) + 5;
    execution.metrics.memoryUsed = Math.min(execution.metrics.memoryUsed + 10, 100);
    execution.metrics.cpuUsed = Math.min(execution.metrics.cpuUsed + 15, 100);
  }

  private async getAgentProgress(_agentId: string): Promise<number> {
    // This would query actual agent progress
    // For now, return simulated progress
    return Math.random() * 100;
  }

  private async handleFailure(
    failure: FailureDetection,
    executionId: string
  ): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.checkpoints.push({
      timestamp: Date.now(),
      phase: 'failure-handling',
      status: 'detected',
      message: `Failure detected: ${failure.failureType}`
    });

    if (failure.autoRecoverable && failure.recoveryOptions.length > 0) {
      // Attempt automatic recovery
      const option = failure.recoveryOptions[0];
      execution.checkpoints.push({
        timestamp: Date.now(),
        phase: 'failure-recovery',
        status: 'attempting',
        message: `Attempting recovery: ${option.option}`
      });

      // Implementation would go here
    }
  }

  private completeExecution(executionId: string, success: boolean): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.status = success ? 'completing' : 'failed';
    execution.completionPercentage = 100;

    execution.checkpoints.push({
      timestamp: Date.now(),
      phase: 'completion',
      status: success ? 'succeeded' : 'failed',
      message: `Execution ${success ? 'completed successfully' : 'failed'}`
    });

    // Move to completed
    this.activeExecutions.delete(executionId);
    this.completedExecutions.set(executionId, execution);

    // Evict old executions
    if (this.completedExecutions.size > this.maxStoredExecutions) {
      const oldest = Array.from(this.completedExecutions.keys())[0];
      this.completedExecutions.delete(oldest);
    }

    // Update metrics
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    const totalExecutions = this.metrics.successfulExecutions + this.metrics.failedExecutions;
    this.metrics.avgExecutionTime =
      (this.metrics.avgExecutionTime * (totalExecutions - 1) + execution.elapsedTime)
      / totalExecutions;
    this.metrics.totalApiCalls += execution.metrics.apiCallsUsed;
    this.metrics.failureRate = this.metrics.failedExecutions / totalExecutions;
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAgentId(agentType: string): string {
    return `agent-${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
