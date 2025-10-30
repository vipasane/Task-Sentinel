# OODA Loop API Reference

**Observe-Orient-Decide-Act Module**

Version: 2.0.0

---

## Table of Contents

- [Overview](#overview)
- [Core Classes](#core-classes)
- [Observation Phase](#observation-phase)
- [Orientation Phase](#orientation-phase)
- [Decision Phase](#decision-phase)
- [Action Phase](#action-phase)
- [Integration](#integration)
- [Examples](#examples)

---

## Overview

The OODA module implements the Observe-Orient-Decide-Act decision-making loop for adaptive task execution.

### Installation

```typescript
import {
  OODALoop,
  ObservePhase,
  OrientPhase,
  DecidePhase,
  ActPhase,
  Observation,
  Orientation,
  Decision,
  ActionResult
} from '@tasksentinel/ooda';
```

---

## Core Classes

### OODALoop

Main OODA loop coordinator.

```typescript
class OODALoop {
  constructor(
    plan: Plan,
    options?: OODAOptions
  );

  async cycle(): Promise<CycleResult>;
  async start(): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;

  getStatus(): OODAStatus;
  getMetrics(): OODAMetrics;
}
```

**Constructor Parameters:**
- `plan`: Current execution plan (GOAP result)
- `options`: Configuration options

**Example:**
```typescript
const ooda = new OODALoop(plan, {
  cycleInterval: 30000,  // 30 seconds
  enableAutomaticReplan: true,
  observationSources: ['git', 'tests', 'security'],
  onReplan: (decision) => {
    console.log('Replanning triggered:', decision.reasoning);
  }
});

await ooda.start();
```

### OODAOptions

Configuration for OODA loop.

```typescript
interface OODAOptions {
  // Cycle control
  cycleInterval?: number;           // Default: 30000ms
  maxCycles?: number;               // Default: unlimited

  // Observation
  observationSources?: string[];    // Default: ["git", "tests", "deps"]
  observationInterval?: number;     // Default: 30000ms

  // Orientation
  enablePatternRecognition?: boolean; // Default: true
  contextWindow?: number;            // Default: 10 observations

  // Decision
  enableAutomaticReplan?: boolean;   // Default: true
  replanThreshold?: number;          // Default: 0.15 (15%)
  decisionConfidenceThreshold?: number; // Default: 0.7

  // Callbacks
  onObserve?: (observations: Observation[]) => void;
  onOrient?: (orientation: Orientation) => void;
  onDecide?: (decision: Decision) => void;
  onAct?: (results: ActionResult[]) => void;
  onReplan?: (decision: Decision) => void;
  onError?: (error: Error) => void;
}
```

### OODAStatus

Current status of OODA loop.

```typescript
interface OODAStatus {
  running: boolean;
  paused: boolean;
  currentCycle: number;
  currentPhase: "observe" | "orient" | "decide" | "act";

  lastCycleTime: Date;
  averageCycleTime: number;

  observationCount: number;
  decisionCount: number;
  replanCount: number;

  health: "healthy" | "degraded" | "unhealthy";
}
```

**Example:**
```typescript
const status = ooda.getStatus();

console.log(`OODA Status: ${status.health}`);
console.log(`Running: ${status.running}`);
console.log(`Current phase: ${status.currentPhase}`);
console.log(`Cycle: ${status.currentCycle}`);
console.log(`Replans: ${status.replanCount}`);
```

---

## Observation Phase

### ObservePhase

Monitors environment and collects observations.

```typescript
class ObservePhase {
  constructor(sources: ObservationSource[], options?: ObserveOptions);

  async observe(): Promise<Observation[]>;
  addSource(source: ObservationSource): void;
  removeSource(sourceId: string): void;
  getSources(): ObservationSource[];
}
```

**Example:**
```typescript
const observer = new ObservePhase(
  [
    new GitObserver(),
    new TestObserver(),
    new DependencyObserver(),
    new SecurityObserver()
  ],
  {
    interval: 30000,
    priority: "high-only"  // Only high priority observations
  }
);

const observations = await observer.observe();
```

### Observation

Single observation of the environment.

```typescript
interface Observation {
  id: string;
  timestamp: Date;
  type: ObservationType;
  source: string;

  data: any;
  priority: "low" | "medium" | "high" | "critical";

  relevance?: number;  // 0-1 score
  impact?: "positive" | "negative" | "neutral";

  metadata?: Record<string, any>;
}

enum ObservationType {
  FILE_CHANGE = "file-change",
  TEST_RESULT = "test-result",
  DEPENDENCY_UPDATE = "dependency-update",
  CODE_PATTERN = "code-pattern",
  PERFORMANCE_METRIC = "performance-metric",
  SECURITY_FINDING = "security-finding",
  AGENT_STATUS = "agent-status",
  RESOURCE_USAGE = "resource-usage"
}
```

**Example:**
```typescript
const observation: Observation = {
  id: "obs-1234",
  timestamp: new Date(),
  type: ObservationType.CODE_PATTERN,
  source: "code-analyzer",

  data: {
    pattern: "existing-authentication-system",
    location: "src/auth/",
    compatibility: 0.95,
    functionality: ["jwt", "session", "oauth2"]
  },

  priority: "high",
  relevance: 0.9,
  impact: "positive",

  metadata: {
    linesOfCode: 1200,
    testCoverage: 0.92
  }
};
```

### ObservationSource

Base class for observation sources.

```typescript
abstract class ObservationSource {
  abstract id: string;
  abstract name: string;

  abstract observe(): Promise<Observation[]>;

  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  getLastObservation(): Observation | null;
}
```

**Example:**
```typescript
class CustomObserver extends ObservationSource {
  id = "custom-observer";
  name = "Custom Environment Observer";

  async observe(): Promise<Observation[]> {
    const observations: Observation[] = [];

    // Check custom metrics
    const metrics = await this.collectMetrics();

    if (metrics.anomalyDetected) {
      observations.push({
        id: `${this.id}-${Date.now()}`,
        timestamp: new Date(),
        type: ObservationType.PERFORMANCE_METRIC,
        source: this.id,
        data: metrics,
        priority: "high",
        impact: "negative"
      });
    }

    return observations;
  }

  private async collectMetrics() {
    // Custom metric collection logic
    return { anomalyDetected: false };
  }
}
```

### Built-in Observers

```typescript
class GitObserver extends ObservationSource {
  // Monitors git repository changes
}

class TestObserver extends ObservationSource {
  // Monitors test results
}

class DependencyObserver extends ObservationSource {
  // Monitors dependency updates
}

class SecurityObserver extends ObservationSource {
  // Monitors security vulnerabilities
}

class PerformanceObserver extends ObservationSource {
  // Monitors performance metrics
}

class AgentObserver extends ObservationSource {
  // Monitors agent status
}
```

---

## Orientation Phase

### OrientPhase

Analyzes observations and builds context.

```typescript
class OrientPhase {
  constructor(options?: OrientOptions);

  async orient(observations: Observation[]): Promise<Orientation>;

  identifyPatterns(observations: Observation[]): Pattern[];
  assessRisks(observations: Observation[]): Risk[];
  findOpportunities(observations: Observation[]): Opportunity[];
  buildContext(data: OrientationData): Context;
}
```

**Example:**
```typescript
const orienter = new OrientPhase({
  patternRecognition: true,
  riskAssessment: true,
  contextWindow: 10
});

const orientation = await orienter.orient(observations);

console.log(`Context: ${orientation.context.description}`);
console.log(`Patterns found: ${orientation.patterns.length}`);
console.log(`Risks identified: ${orientation.risks.length}`);
console.log(`Opportunities: ${orientation.opportunities.length}`);
console.log(`Confidence: ${orientation.confidence}`);
```

### Orientation

Result of orientation analysis.

```typescript
interface Orientation {
  timestamp: Date;
  context: Context;

  analysis: AnalysisResult;
  patterns: Pattern[];
  risks: Risk[];
  opportunities: Opportunity[];

  confidence: number;  // 0-1 score
  recommendations: Recommendation[];
}
```

**Example:**
```typescript
const orientation: Orientation = {
  timestamp: new Date(),

  context: {
    description: "Authentication feature implementation",
    currentPhase: "design",
    progress: 0.35,
    environmentState: {
      hasExistingAuthSystem: true,
      authSystemCompatibility: 0.95
    }
  },

  analysis: {
    summary: "Existing authentication system found with high compatibility",
    details: {
      existingSystem: {
        location: "src/auth/",
        features: ["jwt", "session"],
        coverage: 0.80
      }
    }
  },

  patterns: [
    {
      type: "code-reuse",
      description: "Reusable authentication pattern found",
      confidence: 0.95,
      impact: "positive",
      recommendation: "Integrate with existing system"
    }
  ],

  risks: [
    {
      type: "integration",
      severity: "low",
      description: "Minor API changes needed for integration",
      probability: 0.3,
      mitigation: "Add adapter layer"
    }
  ],

  opportunities: [
    {
      type: "optimization",
      impact: "high",
      description: "Reduce implementation time by 30%",
      benefit: {
        costSavings: 6,
        timeSavings: 1200000,  // 20 minutes
        qualityImprovement: "Better consistency"
      }
    }
  ],

  confidence: 0.92,

  recommendations: [
    {
      priority: "high",
      action: "replan-to-integrate",
      reasoning: "Significant cost and time savings with existing system"
    }
  ]
};
```

### Pattern

Identified pattern in observations.

```typescript
interface Pattern {
  id?: string;
  type: string;
  description: string;

  confidence: number;  // 0-1 score
  impact: "positive" | "negative" | "neutral";

  evidence: Observation[];
  recommendation: string;

  metadata?: Record<string, any>;
}
```

### Risk

Identified risk from observations.

```typescript
interface Risk {
  id?: string;
  type: string;
  description: string;

  severity: "low" | "medium" | "high" | "critical";
  probability: number;  // 0-1 score

  impact: string;
  mitigation: string;

  relatedObservations: Observation[];
}
```

### Opportunity

Identified opportunity for improvement.

```typescript
interface Opportunity {
  id?: string;
  type: string;
  description: string;

  impact: "low" | "medium" | "high";

  benefit: {
    costSavings?: number;
    timeSavings?: number;
    qualityImprovement?: string;
    riskReduction?: string;
  };

  requirements: string[];
  confidence: number;  // 0-1 score
}
```

---

## Decision Phase

### DecidePhase

Makes strategic decisions based on orientation.

```typescript
class DecidePhase {
  constructor(options?: DecideOptions);

  async decide(
    orientation: Orientation,
    currentPlan: Plan
  ): Promise<Decision>;

  evaluatePlan(
    plan: Plan,
    orientation: Orientation
  ): PlanEvaluation;

  shouldReplan(
    evaluation: PlanEvaluation,
    threshold: number
  ): boolean;
}
```

**Example:**
```typescript
const decider = new DecidePhase({
  confidenceThreshold: 0.7,
  replanThreshold: 0.15,
  requireApprovalForCritical: true
});

const decision = await decider.decide(orientation, currentPlan);

if (decision.type === DecisionType.REPLAN) {
  console.log('Replanning recommended:');
  decision.reasoning.forEach(reason => {
    console.log(`  - ${reason}`);
  });
  console.log(`Confidence: ${decision.confidence}`);
  console.log(`Cost reduction: ${decision.changes.costSavings}`);
}
```

### Decision

Strategic decision result.

```typescript
interface Decision {
  id: string;
  timestamp: Date;
  type: DecisionType;

  reasoning: string[];
  confidence: number;  // 0-1 score

  changes?: PlanChanges;
  requiresApproval: boolean;

  metadata?: Record<string, any>;
}

enum DecisionType {
  CONTINUE = "continue",
  REPLAN = "replan",
  ADJUST = "adjust",
  ESCALATE = "escalate",
  ROLLBACK = "rollback",
  PAUSE = "pause"
}
```

**Example:**
```typescript
const decision: Decision = {
  id: "decision-1234",
  timestamp: new Date(),
  type: DecisionType.REPLAN,

  reasoning: [
    "Discovered existing authentication system with 95% compatibility",
    "Integration reduces implementation time by 30%",
    "Better code reuse and consistency",
    "Lower risk of introducing bugs"
  ],

  confidence: 0.92,

  changes: {
    removedActions: ["implement-new-auth-system"],
    addedActions: [
      "analyze-existing-system",
      "design-integration-layer",
      "extend-existing-auth"
    ],
    modifiedActions: [
      {
        action: "implement-authentication",
        oldCost: 6,
        newCost: 3,
        reason: "Reusing existing infrastructure"
      }
    ],
    costSavings: 6,
    timeSavings: 1200000,
    qualityImprovement: "Better consistency with existing code"
  },

  requiresApproval: false
};
```

### PlanChanges

Proposed changes to the plan.

```typescript
interface PlanChanges {
  removedActions: string[];
  addedActions: Action[];
  modifiedActions: ActionModification[];

  costSavings: number;
  timeSavings: number;
  qualityImprovement?: string;
  riskReduction?: string;
}

interface ActionModification {
  action: string;
  oldCost: number;
  newCost: number;
  reason: string;
  modifications?: Record<string, any>;
}
```

### PlanEvaluation

Evaluation of current plan.

```typescript
interface PlanEvaluation {
  needsReplan: boolean;
  needsAdjustment: boolean;
  needsEscalation: boolean;

  reasons: string[];
  score: number;  // 0-1, higher is better

  issues: Issue[];
  improvements: Improvement[];
}
```

---

## Action Phase

### ActPhase

Executes decisions and tracks results.

```typescript
class ActPhase {
  constructor(
    executor: PlanExecutor,
    options?: ActOptions
  );

  async act(decision: Decision, plan: Plan): Promise<ActionResult[]>;
  async executeAction(action: Action): Promise<ActionResult>;
  async handleFailure(
    result: ActionResult,
    plan: Plan
  ): Promise<Recovery>;
}
```

**Example:**
```typescript
const actor = new ActPhase(planExecutor, {
  maxRetries: 3,
  retryDelay: 5000,
  onActionStart: (action) => {
    console.log(`▶ Starting: ${action.name}`);
  },
  onActionComplete: (result) => {
    console.log(`✓ Completed: ${result.action.name}`);
  }
});

const results = await actor.act(decision, plan);
```

### ActionResult

Result of executing an action (see GOAP API for full definition).

```typescript
interface ActionResult {
  action: Action;
  status: "success" | "failure" | "partial" | "skipped";
  startTime: Date;
  endTime: Date;
  duration: number;
  output?: any;
  errors?: string[];
  warnings?: string[];
}
```

### Recovery

Recovery plan after action failure.

```typescript
interface Recovery {
  strategy: RecoveryStrategy;
  actions: Action[];
  rollbackTo?: number;
  reason: string;
}

enum RecoveryStrategy {
  RETRY = "retry",
  REPLAN = "replan",
  ROLLBACK = "rollback",
  ESCALATE = "escalate",
  SKIP = "skip"
}
```

**Example:**
```typescript
const recovery: Recovery = {
  strategy: RecoveryStrategy.REPLAN,
  actions: [
    ActionLibrary.analyze("failure-root-cause", 1),
    ActionLibrary.design("alternative-approach", 2),
    ActionLibrary.implement("alternative", 4)
  ],
  reason: "Original approach failed due to dependency conflict"
};
```

---

## Integration

### Combining OODA with GOAP

```typescript
import { GOAPPlanner } from '@tasksentinel/goap';
import { OODALoop } from '@tasksentinel/ooda';

// Initial GOAP planning
const planner = new GOAPPlanner(currentState, goalState);
const initialPlan = await planner.plan(actions);

// Create OODA loop with replanning capability
const ooda = new OODALoop(initialPlan, {
  enableAutomaticReplan: true,
  onReplan: async (decision) => {
    console.log('OODA triggered replan');

    // Get current state from execution
    const currentState = await getCurrentState();

    // Create new planner
    const replanner = new GOAPPlanner(currentState, goalState);
    const newPlan = await replanner.plan(remainingActions);

    // Update execution plan
    executor.updatePlan(newPlan);
  }
});

// Start OODA loop
await ooda.start();
```

### Full Integration Example

```typescript
import { GOAPPlanner, PlanExecutor } from '@tasksentinel/goap';
import {
  OODALoop,
  GitObserver,
  TestObserver,
  DependencyObserver
} from '@tasksentinel/ooda';

class TaskExecutionEngine {
  private planner: GOAPPlanner;
  private executor: PlanExecutor;
  private ooda: OODALoop;

  async execute(
    currentState: WorldState,
    goalState: WorldState,
    actions: Action[]
  ): Promise<ExecutionResult> {
    // 1. Initial GOAP planning
    this.planner = new GOAPPlanner(currentState, goalState);
    const plan = await this.planner.plan(actions);

    // 2. Setup executor
    this.executor = new PlanExecutor(plan, agentSpawner);

    // 3. Create OODA loop
    this.ooda = new OODALoop(plan, {
      observationSources: ['git', 'tests', 'deps', 'security'],
      enableAutomaticReplan: true,
      cycleInterval: 30000,

      onObserve: (observations) => {
        this.handleObservations(observations);
      },

      onDecide: async (decision) => {
        await this.handleDecision(decision);
      }
    });

    // 4. Start OODA loop
    await this.ooda.start();

    // 5. Execute plan
    const result = await this.executor.execute();

    // 6. Stop OODA loop
    this.ooda.stop();

    return result;
  }

  private handleObservations(observations: Observation[]): void {
    // Store observations in memory
    for (const obs of observations) {
      if (obs.priority === "critical" || obs.priority === "high") {
        console.log(`⚠ ${obs.type}: ${obs.data.description}`);
      }
    }
  }

  private async handleDecision(decision: Decision): Promise<void> {
    if (decision.type === DecisionType.REPLAN) {
      console.log('Replanning triggered by OODA loop');

      // Get current execution state
      const currentState = this.executor.getCurrentState();
      const remainingActions = this.executor.getRemainingActions();

      // Replan with GOAP
      const newPlan = await this.planner.replan(
        this.executor.getCompletedActions(),
        currentState
      );

      // Update executor
      this.executor.updatePlan(newPlan);

      console.log(`Plan updated: ${decision.changes.costSavings} cost saved`);
    }
  }
}
```

---

## Examples

### Example 1: Basic OODA Loop

```typescript
import { OODALoop } from '@tasksentinel/ooda';

const ooda = new OODALoop(plan, {
  cycleInterval: 30000,
  observationSources: ['git', 'tests'],

  onObserve: (observations) => {
    console.log(`Observed ${observations.length} changes`);
  },

  onDecide: (decision) => {
    console.log(`Decision: ${decision.type}`);
    if (decision.reasoning.length > 0) {
      console.log('Reasoning:');
      decision.reasoning.forEach(r => console.log(`  - ${r}`));
    }
  }
});

await ooda.start();

// Let it run for task duration
// OODA will automatically observe, orient, decide, and act

// Stop when done
ooda.stop();
```

### Example 2: Custom Observer

```typescript
import { ObservationSource, Observation } from '@tasksentinel/ooda';

class PerformanceObserver extends ObservationSource {
  id = "performance-observer";
  name = "Performance Monitor";

  private thresholds = {
    cpu: 80,      // 80%
    memory: 85,   // 85%
    response: 500 // 500ms
  };

  async observe(): Promise<Observation[]> {
    const observations: Observation[] = [];

    // Check CPU usage
    const cpuUsage = await this.getCPUUsage();
    if (cpuUsage > this.thresholds.cpu) {
      observations.push({
        id: `${this.id}-cpu-${Date.now()}`,
        timestamp: new Date(),
        type: ObservationType.RESOURCE_USAGE,
        source: this.id,
        data: {
          metric: 'cpu',
          value: cpuUsage,
          threshold: this.thresholds.cpu
        },
        priority: "high",
        impact: "negative"
      });
    }

    // Check memory usage
    const memoryUsage = await this.getMemoryUsage();
    if (memoryUsage > this.thresholds.memory) {
      observations.push({
        id: `${this.id}-memory-${Date.now()}`,
        timestamp: new Date(),
        type: ObservationType.RESOURCE_USAGE,
        source: this.id,
        data: {
          metric: 'memory',
          value: memoryUsage,
          threshold: this.thresholds.memory
        },
        priority: "high",
        impact: "negative"
      });
    }

    return observations;
  }

  private async getCPUUsage(): Promise<number> {
    // Implementation
    return 0;
  }

  private async getMemoryUsage(): Promise<number> {
    // Implementation
    return 0;
  }
}

// Use custom observer
const ooda = new OODALoop(plan);
ooda.addObserver(new PerformanceObserver());
```

### Example 3: Conditional Replanning

```typescript
import { OODALoop, DecisionType } from '@tasksentinel/ooda';

const ooda = new OODALoop(plan, {
  enableAutomaticReplan: false,  // Manual control

  onDecide: async (decision) => {
    if (decision.type === DecisionType.REPLAN) {
      // Custom replanning logic
      const costSavings = decision.changes?.costSavings || 0;
      const timeSavings = decision.changes?.timeSavings || 0;

      // Only replan if significant savings
      if (costSavings >= 5 || timeSavings >= 600000) {  // 10min
        console.log('Significant savings detected, replanning');
        console.log(`  Cost savings: ${costSavings}`);
        console.log(`  Time savings: ${timeSavings}ms`);

        // Trigger replan
        await performReplan(decision);
      } else {
        console.log('Savings not significant, continuing with current plan');
      }
    }
  }
});
```

### Example 4: Metrics Collection

```typescript
import { OODALoop, OODAMetrics } from '@tasksentinel/ooda';

const ooda = new OODALoop(plan);
await ooda.start();

// Periodically check metrics
setInterval(() => {
  const metrics = ooda.getMetrics();

  console.log('OODA Metrics:');
  console.log(`  Cycles completed: ${metrics.cyclesCompleted}`);
  console.log(`  Observations: ${metrics.totalObservations}`);
  console.log(`  Decisions: ${metrics.totalDecisions}`);
  console.log(`  Replans: ${metrics.replanCount}`);
  console.log(`  Average cycle time: ${metrics.averageCycleTime}ms`);
  console.log(`  Observation rate: ${metrics.observationRate}/min`);
}, 60000);  // Every minute
```

---

## API Summary

### Main Classes
- `OODALoop` - Main OODA loop coordinator
- `ObservePhase` - Environment observation
- `OrientPhase` - Context analysis
- `DecidePhase` - Strategic decisions
- `ActPhase` - Action execution

### Key Interfaces
- `Observation` - Environment observation
- `Orientation` - Analysis result
- `Decision` - Strategic decision
- `ActionResult` - Execution result
- `Pattern` - Identified pattern
- `Risk` - Identified risk
- `Opportunity` - Improvement opportunity

### Observers
- `GitObserver` - Git repository monitoring
- `TestObserver` - Test result monitoring
- `DependencyObserver` - Dependency monitoring
- `SecurityObserver` - Security monitoring
- `PerformanceObserver` - Performance monitoring

---

**Version:** 2.0.0
**Last Updated:** 2025-10-30
**Module:** @tasksentinel/ooda
