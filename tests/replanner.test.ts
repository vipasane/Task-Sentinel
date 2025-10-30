/**
 * Comprehensive Tests for Adaptive Replanner
 *
 * Tests all failure scenarios, recovery mechanisms, and learning capabilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AdaptiveReplanner,
  FailureType,
  ReplanStrategy,
  RecoveryAction,
  type Action,
  type SystemState,
  type Goal,
  type Failure,
  type Resource,
  type AgentState,
  type StateCheckpoint,
  type Plan
} from '../src/planning/replanner';

describe('AdaptiveReplanner', () => {
  let replanner: AdaptiveReplanner;
  let mockState: SystemState;
  let mockGoal: Goal;
  let mockAction: Action;

  beforeEach(() => {
    replanner = new AdaptiveReplanner();

    // Setup mock goal
    mockGoal = {
      id: 'goal_1',
      description: 'Complete data processing task',
      constraints: [
        { type: 'time', value: 60000, flexible: true },
        { type: 'cost', value: 100, flexible: false }
      ],
      successCriteria: [
        { metric: 'accuracy', threshold: 0.95, required: true },
        { metric: 'speed', threshold: 1000, required: false }
      ],
      priority: 1
    };

    // Setup mock action
    mockAction = {
      id: 'action_1',
      type: 'data-processing',
      agentId: 'agent_1',
      parameters: { dataset: 'test_data' },
      preconditions: [
        { type: 'resource', condition: 'available', value: 'cpu_1' }
      ],
      expectedDuration: 5000,
      cost: 10,
      retries: 0
    };

    // Setup mock system state
    mockState = {
      currentPlan: {
        id: 'plan_1',
        goal: mockGoal,
        actions: [mockAction],
        dependencies: new Map([['action_1', []]]),
        estimatedCost: 10,
        estimatedDuration: 5000,
        priority: 1
      },
      executedActions: [],
      failedActions: [],
      availableResources: [
        { id: 'cpu_1', type: 'compute', available: true, capacity: 10, allocated: 5 },
        { id: 'mem_1', type: 'memory', available: true, capacity: 100, allocated: 50 }
      ],
      agentStates: new Map([
        ['agent_1', {
          id: 'agent_1',
          status: 'idle',
          successRate: 0.85,
          averageExecutionTime: 4500
        }]
      ]),
      locks: new Map(),
      checkpoints: []
    };
  });

  describe('Failure Detection', () => {
    it('should detect and classify precondition failures', () => {
      const error = new Error('Precondition not met: resource unavailable');
      const failure = replanner.detectFailure(mockAction, error, {});

      expect(failure.failureType).toBe(FailureType.ACTION_PRECONDITIONS_FAILED);
      expect(failure.action.id).toBe(mockAction.id);
      expect(failure.error).toBe(error);
    });

    it('should detect resource unavailability', () => {
      const error = new Error('Resource cpu_1 unavailable');
      const failure = replanner.detectFailure(mockAction, error, {});

      expect(failure.failureType).toBe(FailureType.RESOURCE_UNAVAILABLE);
    });

    it('should detect timeout failures', () => {
      const error = new Error('Operation timed out after 5000ms');
      const failure = replanner.detectFailure(mockAction, error, {});

      expect(failure.failureType).toBe(FailureType.TIMEOUT_EXCEEDED);
    });

    it('should detect dependency blocks', () => {
      const error = new Error('Dependency action_0 blocked');
      const failure = replanner.detectFailure(mockAction, error, {});

      expect(failure.failureType).toBe(FailureType.DEPENDENCY_BLOCKED);
    });

    it('should detect quality gate failures', () => {
      const error = new Error('Quality threshold not met: accuracy < 0.95');
      const failure = replanner.detectFailure(mockAction, error, {});

      expect(failure.failureType).toBe(FailureType.QUALITY_GATE_FAILED);
    });

    it('should default to execution failure for unknown errors', () => {
      const error = new Error('Unknown error occurred');
      const failure = replanner.detectFailure(mockAction, error, {});

      expect(failure.failureType).toBe(FailureType.ACTION_EXECUTION_FAILED);
    });

    it('should emit failure:detected event', (done) => {
      replanner.on('failure:detected', (failure) => {
        expect(failure.failureType).toBeDefined();
        done();
      });

      const error = new Error('Test error');
      replanner.detectFailure(mockAction, error, {});
    });
  });

  describe('Root Cause Analysis', () => {
    it('should analyze precondition failures', async () => {
      const failure: Failure = {
        id: 'fail_1',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_PRECONDITIONS_FAILED,
        action: mockAction,
        error: new Error('Precondition failed'),
        context: {},
        retryCount: 0
      };

      mockState.availableResources[0].available = false;

      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);

      expect(rootCause.category).toBe('precondition');
      expect(rootCause.recoverable).toBe(true);
      expect(rootCause.contributingFactors.length).toBeGreaterThan(0);
      expect(rootCause.contributingFactors[0]).toContain('cpu_1');
    });

    it('should analyze resource unavailability', async () => {
      const failure: Failure = {
        id: 'fail_2',
        timestamp: Date.now(),
        failureType: FailureType.RESOURCE_UNAVAILABLE,
        action: mockAction,
        error: new Error('Resource unavailable'),
        context: {},
        retryCount: 0
      };

      mockState.availableResources[0].allocated = mockState.availableResources[0].capacity;

      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);

      expect(rootCause.category).toBe('resource');
      expect(rootCause.severity).toBe('high');
      expect(rootCause.contributingFactors).toContain('Resource cpu_1 at full capacity (10/10)');
    });

    it('should analyze timeout with agent performance', async () => {
      const failure: Failure = {
        id: 'fail_3',
        timestamp: Date.now(),
        failureType: FailureType.TIMEOUT_EXCEEDED,
        action: mockAction,
        error: new Error('Timeout'),
        context: {},
        retryCount: 0
      };

      const agent = mockState.agentStates.get('agent_1')!;
      agent.averageExecutionTime = 10000; // Much slower than expected

      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);

      expect(rootCause.category).toBe('timing');
      expect(rootCause.contributingFactors).toContain('Agent agent_1 performing slower than expected');
    });

    it('should analyze dependency blocks', async () => {
      const failure: Failure = {
        id: 'fail_4',
        timestamp: Date.now(),
        failureType: FailureType.DEPENDENCY_BLOCKED,
        action: mockAction,
        error: new Error('Dependency blocked'),
        context: {},
        retryCount: 0
      };

      mockState.currentPlan.dependencies.set('action_1', ['action_0']);

      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);

      expect(rootCause.category).toBe('dependency');
      expect(rootCause.contributingFactors).toContain('Dependency action_0 not yet executed');
    });

    it('should assess severity based on retry count', async () => {
      const failure: Failure = {
        id: 'fail_5',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_EXECUTION_FAILED,
        action: { ...mockAction, retries: 3 },
        error: new Error('Execution failed'),
        context: {},
        retryCount: 3
      };

      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);

      expect(rootCause.severity).toBe('critical');
    });

    it('should detect non-recoverable errors', async () => {
      const failure: Failure = {
        id: 'fail_6',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_EXECUTION_FAILED,
        action: mockAction,
        error: new Error('EACCES: permission denied'),
        context: {},
        retryCount: 0
      };

      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);

      expect(rootCause.recoverable).toBe(false);
    });

    it('should emit failure:analyzed event', async (done) => {
      replanner.on('failure:analyzed', ({ failure, rootCause }) => {
        expect(rootCause).toBeDefined();
        expect(rootCause.category).toBeDefined();
        done();
      });

      const failure: Failure = {
        id: 'fail_7',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_EXECUTION_FAILED,
        action: mockAction,
        error: new Error('Test'),
        context: {},
        retryCount: 0
      };

      await replanner.analyzeFailureRoot(failure, mockState);
    });
  });

  describe('Alternative Plan Generation', () => {
    let failure: Failure;

    beforeEach(() => {
      failure = {
        id: 'fail_1',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_EXECUTION_FAILED,
        action: mockAction,
        error: new Error('Execution failed'),
        context: {},
        retryCount: 0,
        rootCause: {
          category: 'execution',
          reason: 'Execution failed',
          contributingFactors: [],
          severity: 'medium',
          recoverable: true
        }
      };
    });

    it('should generate retry plan for recoverable failures', async () => {
      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const retryPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.RETRY_WITH_BACKOFF);
      expect(retryPlan).toBeDefined();
      expect(retryPlan!.confidence).toBeGreaterThan(0);
      expect(retryPlan!.reasoning).toContain('Retry with');
    });

    it('should not generate retry plan after max attempts', async () => {
      failure.retryCount = 3;
      failure.action.retries = 3;

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const retryPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.RETRY_WITH_BACKOFF);
      expect(retryPlan).toBeUndefined();
    });

    it('should generate alternative path plans', async () => {
      const altAction: Action = {
        id: 'action_2',
        type: 'data-processing',
        agentId: 'agent_2',
        parameters: { dataset: 'test_data' },
        preconditions: [],
        expectedDuration: 6000,
        cost: 12,
        retries: 0
      };

      mockState.currentPlan.actions.push(altAction);

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const altPathPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.ALTERNATIVE_PATH);
      expect(altPathPlan).toBeDefined();
    });

    it('should generate simplified plan when goal is flexible', async () => {
      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const simplifiedPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.SIMPLIFY_GOAL);
      expect(simplifiedPlan).toBeDefined();
      expect(simplifiedPlan!.plan.goal.constraints.length).toBeLessThan(mockGoal.constraints.length);
    });

    it('should generate resource request plan for resource failures', async () => {
      failure.failureType = FailureType.RESOURCE_UNAVAILABLE;
      failure.rootCause!.category = 'resource';

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const resourcePlan = alternatives.find(alt => alt.strategy === ReplanStrategy.REQUEST_RESOURCES);
      expect(resourcePlan).toBeDefined();
    });

    it('should generate escalation plan for unrecoverable failures', async () => {
      failure.rootCause!.recoverable = false;
      failure.rootCause!.severity = 'critical';

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const escalationPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.ESCALATE);
      expect(escalationPlan).toBeDefined();
      expect(escalationPlan!.confidence).toBe(0);
    });

    it('should sort alternatives by confidence', async () => {
      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      for (let i = 1; i < alternatives.length; i++) {
        expect(alternatives[i - 1].confidence).toBeGreaterThanOrEqual(alternatives[i].confidence);
      }
    });

    it('should emit plans:generated event', async (done) => {
      replanner.on('plans:generated', ({ failure: f, alternatives }) => {
        expect(alternatives).toBeDefined();
        expect(alternatives.length).toBeGreaterThan(0);
        done();
      });

      await replanner.generateAlternativePlan(mockState, mockGoal, mockAction, failure);
    });
  });

  describe('Recovery Mechanisms', () => {
    let failure: Failure;

    beforeEach(() => {
      failure = {
        id: 'fail_1',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_EXECUTION_FAILED,
        action: mockAction,
        error: new Error('Execution failed'),
        context: {},
        retryCount: 0,
        rootCause: {
          category: 'execution',
          reason: 'Execution failed',
          contributingFactors: [],
          severity: 'medium',
          recoverable: true
        }
      };
    });

    it('should rollback state for critical failures', async () => {
      failure.rootCause!.severity = 'critical';

      const checkpoint: StateCheckpoint = {
        id: 'checkpoint_1',
        timestamp: Date.now() - 10000,
        state: { executedActions: [] },
        description: 'Last good state'
      };
      mockState.checkpoints.push(checkpoint);

      const result = await replanner.attemptRecovery(failure, mockState);

      expect(result.success).toBe(true);
      expect(result.recoveryActions).toContain(RecoveryAction.STATE_ROLLBACK);
      expect(result.restoredState).toBeDefined();
    });

    it('should reallocate resources for resource failures', async () => {
      failure.failureType = FailureType.RESOURCE_UNAVAILABLE;
      failure.rootCause!.category = 'resource';

      const result = await replanner.attemptRecovery(failure, mockState);

      expect(result.recoveryActions).toContain(RecoveryAction.RESOURCE_REALLOCATION);
    });

    it('should respawn failed agents', async () => {
      const agent = mockState.agentStates.get('agent_1')!;
      agent.status = 'failed';

      const result = await replanner.attemptRecovery(failure, mockState);

      expect(result.recoveryActions).toContain(RecoveryAction.AGENT_RESPAWN);
      expect(agent.status).toBe('idle');
    });

    it('should refresh stale locks', async () => {
      const staleLock = {
        id: 'lock_1',
        resourceId: 'cpu_1',
        holderId: 'agent_1',
        acquiredAt: Date.now() - 600000,
        expiresAt: Date.now() - 100
      };
      mockState.locks.set('lock_1', staleLock);

      const result = await replanner.attemptRecovery(failure, mockState);

      expect(result.recoveryActions).toContain(RecoveryAction.LOCK_REFRESH);
      expect(staleLock.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should restore context for dependency failures', async () => {
      failure.failureType = FailureType.DEPENDENCY_BLOCKED;

      const result = await replanner.attemptRecovery(failure, mockState);

      expect(result.recoveryActions).toContain(RecoveryAction.CONTEXT_RESTORATION);
    });

    it('should handle recovery errors gracefully', async () => {
      // Create state that will cause recovery to fail
      mockState.checkpoints = [];
      failure.rootCause!.severity = 'critical';

      const result = await replanner.attemptRecovery(failure, mockState);

      expect(result.success).toBeDefined();
    });

    it('should emit recovery events', async (done) => {
      let eventCount = 0;
      const expectedEvents = ['recovery:completed'];

      replanner.on('recovery:completed', () => {
        eventCount++;
        if (eventCount === expectedEvents.length) done();
      });

      await replanner.attemptRecovery(failure, mockState);
    });
  });

  describe('Escalation Logic', () => {
    let failure: Failure;
    let alternatives: any[];

    beforeEach(() => {
      failure = {
        id: 'fail_1',
        timestamp: Date.now(),
        failureType: FailureType.ACTION_EXECUTION_FAILED,
        action: mockAction,
        error: new Error('Execution failed'),
        context: {},
        retryCount: 0,
        rootCause: {
          category: 'execution',
          reason: 'Execution failed',
          contributingFactors: [],
          severity: 'medium',
          recoverable: true
        }
      };

      alternatives = [
        {
          plan: mockState.currentPlan,
          strategy: ReplanStrategy.RETRY_WITH_BACKOFF,
          confidence: 0.8,
          reasoning: 'Retry',
          tradeoffs: []
        }
      ];
    });

    it('should escalate for unrecoverable failures', async () => {
      failure.rootCause!.recoverable = false;

      const shouldEscalate = await replanner.escalateIfNeeded(failure, alternatives);

      expect(shouldEscalate).toBe(true);
    });

    it('should escalate for critical severity', async () => {
      failure.rootCause!.severity = 'critical';

      const shouldEscalate = await replanner.escalateIfNeeded(failure, alternatives);

      expect(shouldEscalate).toBe(true);
    });

    it('should escalate after max retries', async () => {
      failure.retryCount = 3;

      const shouldEscalate = await replanner.escalateIfNeeded(failure, alternatives);

      expect(shouldEscalate).toBe(true);
    });

    it('should escalate when only escalation plan available', async () => {
      alternatives = [
        {
          plan: mockState.currentPlan,
          strategy: ReplanStrategy.ESCALATE,
          confidence: 0,
          reasoning: 'No alternatives',
          tradeoffs: []
        }
      ];

      const shouldEscalate = await replanner.escalateIfNeeded(failure, alternatives);

      expect(shouldEscalate).toBe(true);
    });

    it('should not escalate for recoverable failures with good alternatives', async () => {
      const shouldEscalate = await replanner.escalateIfNeeded(failure, alternatives);

      expect(shouldEscalate).toBe(false);
    });

    it('should emit escalation:required event', async (done) => {
      failure.rootCause!.recoverable = false;

      replanner.on('escalation:required', ({ failure: f, reason }) => {
        expect(reason).toContain('not recoverable');
        done();
      });

      await replanner.escalateIfNeeded(failure, alternatives);
    });
  });

  describe('Learning and Pattern Recognition', () => {
    let failure: Failure;

    beforeEach(() => {
      failure = {
        id: 'fail_1',
        timestamp: Date.now(),
        failureType: FailureType.TIMEOUT_EXCEEDED,
        action: mockAction,
        error: new Error('Timeout'),
        context: {},
        retryCount: 0,
        rootCause: {
          category: 'timing',
          reason: 'Timeout',
          contributingFactors: [],
          severity: 'medium',
          recoverable: true
        }
      };
    });

    it('should record successful strategies', () => {
      replanner.recordSuccessfulStrategy(failure, ReplanStrategy.RETRY_WITH_BACKOFF, 5000);

      const insights = replanner.getFailureInsights();
      const retryStrategy = insights.mostEffectiveStrategies.find(
        s => s.strategy === ReplanStrategy.RETRY_WITH_BACKOFF
      );

      expect(retryStrategy).toBeDefined();
      expect(retryStrategy!.successRate).toBeGreaterThan(0.5);
    });

    it('should record failed strategies', () => {
      replanner.recordFailedStrategy(failure, ReplanStrategy.ALTERNATIVE_PATH);

      const insights = replanner.getFailureInsights();
      const altPathStrategy = insights.mostEffectiveStrategies.find(
        s => s.strategy === ReplanStrategy.ALTERNATIVE_PATH
      );

      expect(altPathStrategy).toBeDefined();
    });

    it('should track failure patterns', async () => {
      // Record same failure multiple times
      await replanner.analyzeFailureRoot(failure, mockState);
      await replanner.analyzeFailureRoot(failure, mockState);
      await replanner.analyzeFailureRoot(failure, mockState);

      const insights = replanner.getFailureInsights();
      expect(insights.topFailures.length).toBeGreaterThan(0);
    });

    it('should identify riskiest actions', async () => {
      // Create multiple failures for same action type
      for (let i = 0; i < 5; i++) {
        const error = new Error('Test error');
        replanner.detectFailure(mockAction, error, {});
      }

      const insights = replanner.getFailureInsights();
      expect(insights.riskiestActions.length).toBeGreaterThan(0);
      expect(insights.riskiestActions[0].actionType).toBe('data-processing');
    });

    it('should improve confidence based on historical success', async () => {
      // Record successful retries
      for (let i = 0; i < 10; i++) {
        replanner.recordSuccessfulStrategy(failure, ReplanStrategy.RETRY_WITH_BACKOFF, 1000);
      }

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      const retryPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.RETRY_WITH_BACKOFF);
      expect(retryPlan!.confidence).toBeGreaterThan(0.8);
    });

    it('should provide comprehensive insights', () => {
      // Generate some activity
      replanner.detectFailure(mockAction, new Error('Test'), {});
      replanner.recordSuccessfulStrategy(failure, ReplanStrategy.RETRY_WITH_BACKOFF, 1000);
      replanner.recordFailedStrategy(failure, ReplanStrategy.ALTERNATIVE_PATH);

      const insights = replanner.getFailureInsights();

      expect(insights.topFailures).toBeDefined();
      expect(insights.mostEffectiveStrategies).toBeDefined();
      expect(insights.riskiestActions).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete failure-recovery-replan cycle', async () => {
      // 1. Detect failure
      const error = new Error('Resource cpu_1 unavailable');
      const failure = replanner.detectFailure(mockAction, error, {});

      // 2. Analyze root cause
      const rootCause = await replanner.analyzeFailureRoot(failure, mockState);
      expect(rootCause.category).toBe('resource');

      // 3. Attempt recovery
      const recovery = await replanner.attemptRecovery(failure, mockState);
      expect(recovery.success).toBe(true);

      // 4. Generate alternatives
      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );
      expect(alternatives.length).toBeGreaterThan(0);

      // 5. Check escalation
      const shouldEscalate = await replanner.escalateIfNeeded(failure, alternatives);
      expect(shouldEscalate).toBe(false);

      // 6. Record success
      replanner.recordSuccessfulStrategy(failure, alternatives[0].strategy, 5000);
    });

    it('should handle cascading failures', async () => {
      // First failure
      const error1 = new Error('Timeout');
      const failure1 = replanner.detectFailure(mockAction, error1, {});
      await replanner.analyzeFailureRoot(failure1, mockState);

      // Second failure after retry
      const error2 = new Error('Timeout');
      const failure2 = replanner.detectFailure({ ...mockAction, retries: 1 }, error2, {});
      await replanner.analyzeFailureRoot(failure2, mockState);

      // Third failure
      const error3 = new Error('Timeout');
      const failure3 = replanner.detectFailure({ ...mockAction, retries: 2 }, error3, {});
      await replanner.analyzeFailureRoot(failure3, mockState);

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure3
      );

      // Should not suggest retry after many failures
      const retryPlan = alternatives.find(alt => alt.strategy === ReplanStrategy.RETRY_WITH_BACKOFF);
      expect(retryPlan).toBeUndefined();
    });

    it('should prefer learned successful strategies', async () => {
      const failure: Failure = {
        id: 'fail_1',
        timestamp: Date.now(),
        failureType: FailureType.TIMEOUT_EXCEEDED,
        action: mockAction,
        error: new Error('Timeout'),
        context: {},
        retryCount: 0,
        rootCause: {
          category: 'timing',
          reason: 'Timeout',
          contributingFactors: [],
          severity: 'medium',
          recoverable: true
        }
      };

      // Train the system that alternative paths work well for timeouts
      for (let i = 0; i < 20; i++) {
        replanner.recordSuccessfulStrategy(failure, ReplanStrategy.ALTERNATIVE_PATH, 1000);
      }

      // Add alternative action
      mockState.currentPlan.actions.push({
        ...mockAction,
        id: 'action_2',
        agentId: 'agent_2'
      });

      const alternatives = await replanner.generateAlternativePlan(
        mockState,
        mockGoal,
        mockAction,
        failure
      );

      // Alternative path should have high confidence
      const altPath = alternatives.find(alt => alt.strategy === ReplanStrategy.ALTERNATIVE_PATH);
      expect(altPath).toBeDefined();
      expect(altPath!.confidence).toBeGreaterThan(0.7);
    });
  });
});
