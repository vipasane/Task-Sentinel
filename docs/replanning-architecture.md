# Adaptive Replanning Architecture

## Overview

The Adaptive Replanning System is a core component of Task Sentinel Phase 2 that handles action failures, analyzes root causes, and dynamically generates alternative plans to maintain system resilience and goal achievement.

## Architecture Components

### 1. Failure Detection & Classification

The system automatically detects and classifies failures into six primary types:

```typescript
enum FailureType {
  ACTION_PRECONDITIONS_FAILED,  // Prerequisites not met
  ACTION_EXECUTION_FAILED,      // Execution errors
  RESOURCE_UNAVAILABLE,         // Required resources missing
  TIMEOUT_EXCEEDED,             // Operations exceeded time limits
  DEPENDENCY_BLOCKED,           // Dependent actions failed/incomplete
  QUALITY_GATE_FAILED          // Output quality below threshold
}
```

**Detection Algorithm:**
- Parses error messages and names
- Analyzes execution context
- Classifies based on pattern matching
- Emits `failure:detected` events

### 2. Root Cause Analysis Engine

Performs deep analysis to determine the underlying cause of failures:

```typescript
interface RootCause {
  category: string;              // Type of root cause
  reason: string;                // Human-readable explanation
  contributingFactors: string[]; // Additional context
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;          // Can system recover automatically?
}
```

**Analysis Process:**

1. **Precondition Analysis**: Checks resource availability, state requirements, and dependencies
2. **Resource Analysis**: Evaluates capacity, allocation, and availability
3. **Timing Analysis**: Compares expected vs actual execution times
4. **Dependency Analysis**: Validates dependency completion and success
5. **Quality Analysis**: Assesses output against success criteria
6. **Execution Analysis**: Examines error types and agent performance

**Contributing Factors:**
- Resource capacity exhaustion
- Agent performance degradation
- Aggressive timeout thresholds
- Failed dependencies
- Quality metric violations
- System-level errors

### 3. Alternative Plan Generation

Generates multiple alternative plans ranked by confidence:

```typescript
interface AlternativePlan {
  plan: Plan;                    // Modified execution plan
  strategy: ReplanStrategy;      // Strategy used
  confidence: number;            // Success probability (0-1)
  reasoning: string;             // Why this plan was chosen
  tradeoffs: string[];          // Costs and compromises
}
```

**Generation Strategies:**

#### Strategy 1: Retry with Backoff
- **When**: Recoverable failures, < max retry attempts
- **How**: Exponential backoff delay calculation
- **Confidence**: Historical success rate × (1 - retry penalty)
- **Tradeoffs**: Added latency, limited retry budget

#### Strategy 2: Alternative Path
- **When**: Multiple actions can achieve same outcome
- **How**: Find similar untried actions
- **Confidence**: Action success rate × strategy effectiveness
- **Tradeoffs**: Different resource requirements, unknown performance

#### Strategy 3: Simplify Goal
- **When**: Goal has flexible constraints or optional criteria
- **How**: Remove non-critical requirements
- **Confidence**: Strategy effectiveness × 0.8
- **Tradeoffs**: Reduced functionality, lower quality

#### Strategy 4: Request Resources
- **When**: Resource unavailability detected
- **How**: Wait for resources or trigger reallocation
- **Confidence**: Strategy effectiveness × 0.7
- **Tradeoffs**: Wait time, no guarantee of availability

#### Strategy 5: Escalate
- **When**: No other options or unrecoverable failures
- **How**: Pause execution, notify human operators
- **Confidence**: 0.0 (requires intervention)
- **Tradeoffs**: System halt, manual intervention required

### 4. Recovery Mechanisms

Five recovery mechanisms to restore system health:

#### State Rollback
```typescript
RecoveryAction.STATE_ROLLBACK
```
- Find last known good checkpoint
- Restore system state
- Discard failed operations
- **Triggered by**: Critical failures, quality gate failures, retry exhaustion

#### Resource Reallocation
```typescript
RecoveryAction.RESOURCE_REALLOCATION
```
- Free up allocated resources
- Redistribute capacity
- Update resource availability
- **Triggered by**: Resource unavailability

#### Agent Respawning
```typescript
RecoveryAction.AGENT_RESPAWN
```
- Terminate failed agents
- Reset agent state
- Restore initial success rate
- **Triggered by**: Agent failures, low success rate (<30%)

#### Lock Refresh
```typescript
RecoveryAction.LOCK_REFRESH
```
- Identify expired locks
- Extend lock expiration
- Prevent deadlocks
- **Triggered by**: Any failure with stale locks present

#### Context Restoration
```typescript
RecoveryAction.CONTEXT_RESTORATION
```
- Validate dependencies
- Re-execute missing prerequisites
- Restore execution context
- **Triggered by**: Dependency blocks

### 5. Learning System

The replanner learns from past failures to improve future decisions:

#### Failure Pattern Recognition
```typescript
interface FailurePattern {
  signature: string;              // Unique failure identifier
  occurrences: number;            // Frequency count
  successfulStrategies: Map;      // Which strategies worked
  averageRecoveryTime: number;    // Time to recover
  lastSeen: number;              // Temporal tracking
}
```

**Pattern Signature:**
```
{FailureType}:{ActionType}:{RootCauseCategory}
```

**Learning Mechanisms:**

1. **Action Success Tracking**
   - Records successes/failures per action type
   - Updates success rates dynamically
   - Influences future action selection

2. **Strategy Effectiveness**
   - Tracks success/failure per strategy
   - Adjusts confidence calculations
   - Guides strategy selection

3. **Pattern Memory**
   - Stores up to 1000 recent patterns
   - Prunes old patterns (oldest 20%)
   - Identifies recurring issues

4. **Adaptive Confidence**
   - Increases for successful strategies
   - Decreases for failed strategies
   - Penalizes high retry counts

### 6. Escalation Logic

Determines when human intervention is required:

```typescript
async escalateIfNeeded(
  failure: Failure,
  alternatives: AlternativePlan[]
): Promise<boolean>
```

**Escalation Triggers:**

1. **Unrecoverable Failures**: System cannot self-heal
2. **Critical Severity**: High-impact failures
3. **Retry Exhaustion**: Max attempts reached
4. **No Alternatives**: No viable plans generated
5. **Low Confidence**: All alternatives <30% confidence

**Escalation Event:**
```typescript
{
  failure: Failure,           // Complete failure details
  rootCause: RootCause,       // Analysis results
  alternatives: AlternativePlan[],  // Attempted solutions
  reason: string             // Human-readable explanation
}
```

## Event System

The replanner emits events for monitoring and coordination:

```typescript
// Failure lifecycle events
'failure:detected'      → Failure detected and classified
'failure:analyzed'      → Root cause analysis completed

// Planning events
'plans:generated'       → Alternative plans created

// Recovery events
'recovery:rollback'     → State rollback initiated
'recovery:reallocation' → Resources reallocated
'recovery:respawn'      → Agent respawned
'recovery:locks'        → Locks refreshed
'recovery:context'      → Context restored
'recovery:completed'    → Recovery attempt finished
'recovery:failed'       → Recovery failed

// Escalation events
'escalation:required'   → Human intervention needed
'recovery:dependency'   → Dependency re-execution triggered
```

## Configuration Parameters

```typescript
MAX_RETRY_ATTEMPTS = 3           // Maximum retry attempts
BACKOFF_BASE_MS = 1000          // Base backoff delay
BACKOFF_MULTIPLIER = 2          // Exponential multiplier
PATTERN_MEMORY_SIZE = 1000      // Max failure patterns stored
```

## Usage Example

```typescript
import { AdaptiveReplanner } from './planning/replanner';

const replanner = new AdaptiveReplanner();

// Setup event listeners
replanner.on('failure:detected', (failure) => {
  console.log('Failure detected:', failure.failureType);
});

replanner.on('escalation:required', ({ reason }) => {
  console.log('Human intervention needed:', reason);
});

// 1. Detect failure
const failure = replanner.detectFailure(action, error, context);

// 2. Analyze root cause
const rootCause = await replanner.analyzeFailureRoot(failure, state);

// 3. Attempt recovery
const recovery = await replanner.attemptRecovery(failure, state);

// 4. Generate alternatives
const alternatives = await replanner.generateAlternativePlan(
  state,
  goal,
  action,
  failure
);

// 5. Check if escalation needed
const shouldEscalate = await replanner.escalateIfNeeded(
  failure,
  alternatives
);

if (shouldEscalate) {
  // Handle escalation
  console.log('Escalating to human operator');
} else {
  // Execute best alternative
  const bestPlan = alternatives[0];
  console.log('Executing plan:', bestPlan.strategy);

  // Record outcome for learning
  if (success) {
    replanner.recordSuccessfulStrategy(
      failure,
      bestPlan.strategy,
      recoveryTime
    );
  } else {
    replanner.recordFailedStrategy(failure, bestPlan.strategy);
  }
}

// Get learned insights
const insights = replanner.getFailureInsights();
console.log('Top failures:', insights.topFailures);
console.log('Best strategies:', insights.mostEffectiveStrategies);
console.log('Riskiest actions:', insights.riskiestActions);
```

## Integration Points

### With Task Orchestrator
- Receives failure notifications
- Provides alternative execution plans
- Updates task dependencies

### With Memory System
- Stores failure patterns
- Retrieves historical data
- Coordinates learning

### With Agent Manager
- Receives agent status updates
- Triggers agent respawning
- Monitors agent performance

### With Resource Manager
- Queries resource availability
- Requests resource allocation
- Receives capacity updates

## Performance Characteristics

**Time Complexity:**
- Failure Detection: O(1)
- Root Cause Analysis: O(n) where n = contributing factors
- Alternative Generation: O(m × s) where m = actions, s = strategies
- Recovery: O(r) where r = recovery actions
- Pattern Learning: O(1) amortized

**Space Complexity:**
- Pattern Memory: O(1000) bounded
- Action Success Rates: O(a) where a = unique action types
- Strategy Effectiveness: O(5) fixed

**Latency:**
- Failure Detection: <1ms
- Root Cause Analysis: 5-20ms
- Alternative Generation: 10-100ms
- Recovery: 50-500ms (depends on actions)
- Total Replanning: ~100ms typical, ~1s worst case

## Best Practices

1. **Checkpointing**: Create frequent checkpoints for rollback capability
2. **Retry Budget**: Balance retry attempts with forward progress
3. **Confidence Thresholds**: Set appropriate confidence levels for auto-execution
4. **Pattern Analysis**: Regularly review failure insights for system improvements
5. **Escalation Response**: Ensure timely human response to escalations
6. **Resource Monitoring**: Track resource availability to prevent failures
7. **Agent Health**: Monitor agent success rates for proactive respawning
8. **Lock Management**: Implement appropriate lock timeouts
9. **Quality Gates**: Define clear success criteria for validation
10. **Learning Feedback**: Always record strategy outcomes for learning

## Security Considerations

- **State Rollback**: Ensure rollback doesn't expose sensitive data
- **Resource Access**: Validate resource reallocation permissions
- **Agent Identity**: Verify agent identity during respawn
- **Lock Validation**: Prevent unauthorized lock manipulation
- **Escalation Auth**: Secure escalation notification channels
- **Pattern Storage**: Protect failure pattern data from tampering

## Future Enhancements

1. **Multi-Agent Coordination**: Coordinate replanning across multiple agents
2. **Predictive Failures**: Anticipate failures before they occur
3. **Cost Optimization**: Consider financial costs in plan selection
4. **Parallel Recovery**: Execute multiple recovery actions simultaneously
5. **Distributed Learning**: Share patterns across system instances
6. **Dynamic Strategies**: Generate custom strategies based on context
7. **Causal Analysis**: Deep causal inference for root causes
8. **Simulation Mode**: Test alternatives in sandbox before execution

## Testing Strategy

Comprehensive test coverage includes:

- **Unit Tests**: Each component in isolation
- **Integration Tests**: Full replanning cycles
- **Failure Scenarios**: All failure types and combinations
- **Recovery Tests**: Each recovery mechanism
- **Learning Tests**: Pattern recognition and strategy optimization
- **Escalation Tests**: Escalation triggers and handling
- **Performance Tests**: Latency and throughput benchmarks
- **Edge Cases**: Cascading failures, retry exhaustion, resource starvation

See `/tests/replanner.test.ts` for complete test suite.

## Monitoring & Observability

Key metrics to monitor:

- **Failure Rate**: Failures per action/hour
- **Recovery Success Rate**: Successful recoveries / total failures
- **Average Recovery Time**: Mean time to recovery
- **Strategy Effectiveness**: Success rate per strategy
- **Escalation Rate**: Escalations per failure
- **Pattern Frequency**: Most common failure patterns
- **Confidence Accuracy**: Predicted vs actual success
- **Resource Contention**: Resource unavailability frequency

## Conclusion

The Adaptive Replanning System provides robust failure handling with:
- Automatic failure detection and classification
- Deep root cause analysis
- Multiple recovery strategies
- Continuous learning from outcomes
- Graceful escalation when needed

This enables Task Sentinel to maintain high availability and goal achievement even in the face of failures and changing conditions.
