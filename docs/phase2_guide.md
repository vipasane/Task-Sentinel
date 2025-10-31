# Task Sentinel Phase 2 Guide

## Advanced OODA + GOAP Integration

**Version:** 2.0.0
**Status:** Production Ready
**Last Updated:** 2025-10-30

---

## Table of Contents

1. [Overview](#overview)
2. [GOAP State Model](#goap-state-model)
3. [A* Planning Algorithm](#a-star-planning-algorithm)
4. [OODA Loop Monitoring](#ooda-loop-monitoring)
5. [Adaptive Replanning](#adaptive-replanning)
6. [Performance Metrics](#performance-metrics)
7. [Configuration Options](#configuration-options)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Phase 2 introduces advanced cognitive architecture for autonomous task execution:

### Key Features

**Goal-Oriented Action Planning (GOAP)**
- State-based world modeling
- A* pathfinding for optimal action sequences
- Dynamic cost calculation and optimization
- Precondition and effect chains

**OODA Loop Integration**
- Observe: Real-time environment monitoring
- Orient: Context analysis and pattern recognition
- Decide: Strategic decision making with GOAP
- Act: Action execution with feedback loops

**Adaptive Replanning**
- Automatic plan adjustments based on observations
- Cost-benefit analysis for plan modifications
- Rollback support for failed actions
- Learning from execution history

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Task Sentinel Phase 2               │
│                                                  │
│  ┌──────────────┐         ┌──────────────┐     │
│  │  OODA Loop   │────────▶│  GOAP Engine │     │
│  │              │         │              │     │
│  │ • Observe    │         │ • State      │     │
│  │ • Orient     │◀────────│ • Actions    │     │
│  │ • Decide     │         │ • Goals      │     │
│  │ • Act        │         │ • A* Search  │     │
│  └──────────────┘         └──────────────┘     │
│         │                        │              │
│         ▼                        ▼              │
│  ┌──────────────────────────────────────┐      │
│  │      Agent Swarm Coordination         │      │
│  │  • Hierarchical • Mesh • Ring • Star  │      │
│  └──────────────────────────────────────┘      │
│         │                                       │
│         ▼                                       │
│  ┌──────────────────────────────────────┐      │
│  │    Distributed Memory & Metrics       │      │
│  │  • State persistence • Performance    │      │
│  └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

### Benefits

**Intelligence**
- Self-aware execution with environmental monitoring
- Context-aware decision making
- Pattern recognition and learning

**Efficiency**
- Optimal action sequencing
- Parallel execution when possible
- Resource-aware planning

**Adaptability**
- Real-time replanning based on observations
- Recovery from failures
- Continuous improvement

**Reliability**
- Validation of preconditions before actions
- Rollback support for failures
- Comprehensive error handling

---

## GOAP State Model

### World State Representation

The world state represents the current environment and task progress:

```typescript
interface WorldState {
  // Task progression states
  hasRequirements: boolean;
  hasResearch: boolean;
  hasDesign: boolean;
  hasImplementation: boolean;
  hasTests: boolean;
  hasDocumentation: boolean;

  // Quality gates
  codeQualityChecked: boolean;
  securityScanned: boolean;
  performanceTested: boolean;

  // Deployment states
  staged: boolean;
  deployed: boolean;
  validated: boolean;

  // Environment context
  repositoryReady: boolean;
  dependenciesInstalled: boolean;
  branchCreated: boolean;
}
```

### State Transitions

Actions modify the world state through effects:

```typescript
// Initial state
const initialState: WorldState = {
  hasRequirements: true,  // Provided by task description
  hasResearch: false,
  hasDesign: false,
  // ... all other states false
};

// Action: research-patterns
const researchAction: Action = {
  name: "research-patterns",
  preconditions: { hasRequirements: true },
  effects: {
    hasResearch: true,
    hasPatternAnalysis: true
  },
  cost: 2
};

// After executing researchAction:
const newState: WorldState = {
  hasRequirements: true,
  hasResearch: true,        // Changed
  hasPatternAnalysis: true,  // Changed
  hasDesign: false,
  // ... rest unchanged
};
```

### State Validation

States are validated before and after actions:

```typescript
function validateState(state: WorldState): ValidationResult {
  const errors: string[] = [];

  // Check logical consistency
  if (state.hasTests && !state.hasImplementation) {
    errors.push("Cannot have tests without implementation");
  }

  if (state.deployed && !state.codeQualityChecked) {
    errors.push("Cannot deploy without quality checks");
  }

  // Check prerequisites
  if (state.hasDesign && !state.hasResearch) {
    errors.push("Design requires prior research");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Example: Authentication Feature States

```typescript
// Authentication implementation states
const authStates: WorldState = {
  // Phase 1: Research
  hasRequirements: true,
  hasAuthResearch: true,
  hasSecurityPatterns: true,

  // Phase 2: Design
  hasAuthSchema: true,
  hasJWTDesign: true,
  hasPasswordHashingDesign: true,

  // Phase 3: Implementation
  hasJWTService: true,
  hasPasswordService: true,
  hasSessionManager: true,
  hasAuthMiddleware: true,

  // Phase 4: Testing
  hasUnitTests: true,
  hasIntegrationTests: true,
  hasSecurityTests: true,

  // Phase 5: Quality
  codeQualityChecked: true,
  securityScanned: true,
  vulnerabilitiesResolved: true,

  // Phase 6: Documentation
  hasAPIDocumentation: true,
  hasUsageExamples: true,

  // Ready for deployment
  deployed: false,
  validated: false
};
```

### State Persistence

States are persisted to enable resumption:

```typescript
// Save state to memory
await memory.store("task-42/goap-state", {
  currentState: worldState,
  goalState: targetState,
  timestamp: Date.now(),
  completedActions: ["research", "design"],
  remainingActions: ["implement", "test"]
});

// Restore state on resumption
const savedState = await memory.retrieve("task-42/goap-state");
const planner = new GOAPPlanner(savedState.currentState, savedState.goalState);
```

---

## A* Planning Algorithm

### Overview

Task Sentinel uses A* search to find the optimal sequence of actions from the current state to the goal state.

### Algorithm Details

**Cost Function:**
```
f(n) = g(n) + h(n)

Where:
- f(n) = total estimated cost
- g(n) = actual cost from start to node n
- h(n) = heuristic estimated cost from n to goal
```

**Heuristic Design:**
```typescript
function heuristic(currentState: WorldState, goalState: WorldState): number {
  let estimate = 0;

  // Count unsatisfied goal conditions
  for (const [key, value] of Object.entries(goalState)) {
    if (currentState[key] !== value) {
      estimate += 1; // Minimum one action needed per unsatisfied condition
    }
  }

  // Add complexity factors
  if (!currentState.hasResearch && goalState.hasImplementation) {
    estimate += 2; // Research and design needed before implementation
  }

  if (!currentState.hasTests && goalState.deployed) {
    estimate += 3; // Tests, quality checks, and deployment needed
  }

  return estimate;
}
```

### Planning Process

**Step 1: Initialize**
```typescript
const openSet = new PriorityQueue<PlanNode>();
const closedSet = new Set<string>();

const startNode: PlanNode = {
  state: currentState,
  path: [],
  gCost: 0,
  hCost: heuristic(currentState, goalState),
  fCost: heuristic(currentState, goalState)
};

openSet.enqueue(startNode, startNode.fCost);
```

**Step 2: Search Loop**
```typescript
while (!openSet.isEmpty()) {
  const current = openSet.dequeue();

  // Goal reached?
  if (isGoalState(current.state, goalState)) {
    return current.path; // Success!
  }

  // Mark as explored
  closedSet.add(stateHash(current.state));

  // Expand neighbors (possible actions)
  for (const action of availableActions) {
    if (!canExecute(action, current.state)) continue;

    const newState = applyEffects(current.state, action.effects);
    const stateKey = stateHash(newState);

    if (closedSet.has(stateKey)) continue;

    const gCost = current.gCost + action.cost;
    const hCost = heuristic(newState, goalState);
    const fCost = gCost + hCost;

    const newNode: PlanNode = {
      state: newState,
      path: [...current.path, action],
      gCost,
      hCost,
      fCost
    };

    openSet.enqueue(newNode, fCost);
  }
}

return null; // No path found
```

**Step 3: Optimization**
```typescript
// Parallelize independent actions
function optimizePlan(plan: Action[]): OptimizedPlan {
  const parallelGroups: Action[][] = [];
  const dependencies = buildDependencyGraph(plan);

  let currentGroup: Action[] = [];
  for (const action of plan) {
    const canParallelize = currentGroup.every(other =>
      !hasDependency(action, other, dependencies)
    );

    if (canParallelize) {
      currentGroup.push(action);
    } else {
      if (currentGroup.length > 0) {
        parallelGroups.push(currentGroup);
      }
      currentGroup = [action];
    }
  }

  if (currentGroup.length > 0) {
    parallelGroups.push(currentGroup);
  }

  return {
    groups: parallelGroups,
    estimatedTime: calculateParallelTime(parallelGroups),
    speedup: plan.length / parallelGroups.length
  };
}
```

### Example: Planning a REST API

```typescript
// Goal: Implement REST API endpoint
const goal: WorldState = {
  hasImplementation: true,
  hasTests: true,
  hasDocumentation: true,
  codeQualityChecked: true,
  deployed: true
};

// Available actions
const actions: Action[] = [
  {
    name: "research-rest-patterns",
    preconditions: { hasRequirements: true },
    effects: { hasResearch: true },
    cost: 2,
    agent: "researcher"
  },
  {
    name: "design-api-schema",
    preconditions: { hasResearch: true },
    effects: { hasDesign: true, hasAPISchema: true },
    cost: 3,
    agent: "architect"
  },
  {
    name: "implement-endpoints",
    preconditions: { hasDesign: true },
    effects: { hasImplementation: true },
    cost: 5,
    agent: "backend-dev"
  },
  {
    name: "write-tests",
    preconditions: { hasImplementation: true },
    effects: { hasTests: true },
    cost: 3,
    agent: "tester"
  },
  {
    name: "check-quality",
    preconditions: { hasImplementation: true, hasTests: true },
    effects: { codeQualityChecked: true },
    cost: 2,
    agent: "reviewer"
  },
  {
    name: "create-documentation",
    preconditions: { hasImplementation: true },
    effects: { hasDocumentation: true },
    cost: 2,
    agent: "api-docs"
  },
  {
    name: "deploy",
    preconditions: {
      codeQualityChecked: true,
      hasDocumentation: true
    },
    effects: { deployed: true },
    cost: 1,
    agent: "cicd-engineer"
  }
];

// A* generates optimal plan
const plan = await planner.plan(currentState, goal, actions);

// Result:
// [
//   { action: "research-rest-patterns", cost: 2 },
//   { action: "design-api-schema", cost: 3 },
//   { action: "implement-endpoints", cost: 5 },
//   { action: "write-tests", cost: 3 },        // Can parallel with:
//   { action: "create-documentation", cost: 2 }, // this action
//   { action: "check-quality", cost: 2 },
//   { action: "deploy", cost: 1 }
// ]
//
// Total cost: 18
// Parallel optimized time: ~16 (tests + docs in parallel)
```

### Plan Visualization

```typescript
function visualizePlan(plan: OptimizedPlan): string {
  let output = "Execution Plan:\n";
  output += "=" * 50 + "\n\n";

  for (let i = 0; i < plan.groups.length; i++) {
    const group = plan.groups[i];
    output += `Phase ${i + 1}:\n`;

    if (group.length === 1) {
      const action = group[0];
      output += `  └─ ${action.name} (${action.agent})\n`;
      output += `     Cost: ${action.cost}, Time: ${estimateTime(action)}\n`;
    } else {
      output += `  Parallel Execution:\n`;
      for (const action of group) {
        output += `  ├─ ${action.name} (${action.agent})\n`;
        output += `  │  Cost: ${action.cost}, Time: ${estimateTime(action)}\n`;
      }
    }
    output += "\n";
  }

  output += `Total Cost: ${plan.totalCost}\n`;
  output += `Estimated Time: ${plan.estimatedTime}\n`;
  output += `Speedup: ${plan.speedup.toFixed(2)}x\n`;

  return output;
}
```

---

## OODA Loop Monitoring

### Four Phases

**1. Observe Phase**

Continuous monitoring of the environment:

```typescript
interface Observation {
  timestamp: Date;
  type: ObservationType;
  source: string;
  data: any;
  priority: "low" | "medium" | "high" | "critical";
}

enum ObservationType {
  FILE_CHANGE = "file-change",
  TEST_RESULT = "test-result",
  DEPENDENCY_UPDATE = "dependency-update",
  CODE_PATTERN = "code-pattern",
  PERFORMANCE_METRIC = "performance-metric",
  SECURITY_FINDING = "security-finding",
  AGENT_STATUS = "agent-status"
}

class ObservePhase {
  async observe(): Promise<Observation[]> {
    const observations: Observation[] = [];

    // Monitor repository
    observations.push(...await this.monitorRepository());

    // Monitor dependencies
    observations.push(...await this.monitorDependencies());

    // Monitor test results
    observations.push(...await this.monitorTests());

    // Monitor agent performance
    observations.push(...await this.monitorAgents());

    // Monitor security
    observations.push(...await this.monitorSecurity());

    return observations;
  }

  async monitorRepository(): Promise<Observation[]> {
    const changes = await git.status();
    const patterns = await codeAnalyzer.findPatterns();

    return [
      {
        timestamp: new Date(),
        type: ObservationType.FILE_CHANGE,
        source: "git",
        data: changes,
        priority: "medium"
      },
      {
        timestamp: new Date(),
        type: ObservationType.CODE_PATTERN,
        source: "code-analyzer",
        data: patterns,
        priority: patterns.relevance === "high" ? "high" : "low"
      }
    ];
  }
}
```

**2. Orient Phase**

Analyze observations and build context:

```typescript
interface Orientation {
  context: string;
  analysis: AnalysisResult;
  patterns: Pattern[];
  risks: Risk[];
  opportunities: Opportunity[];
  confidence: number;
}

class OrientPhase {
  async orient(observations: Observation[]): Promise<Orientation> {
    // Filter and prioritize observations
    const prioritized = this.prioritize(observations);

    // Analyze patterns
    const patterns = await this.identifyPatterns(prioritized);

    // Assess risks
    const risks = await this.assessRisks(prioritized, patterns);

    // Find opportunities
    const opportunities = await this.findOpportunities(prioritized, patterns);

    // Build context
    const context = await this.buildContext({
      observations: prioritized,
      patterns,
      risks,
      opportunities
    });

    return {
      context,
      analysis: this.analyze(prioritized),
      patterns,
      risks,
      opportunities,
      confidence: this.calculateConfidence(context)
    };
  }

  identifyPatterns(observations: Observation[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Look for existing code patterns
    const codePatterns = observations.filter(
      obs => obs.type === ObservationType.CODE_PATTERN
    );

    for (const obs of codePatterns) {
      if (obs.data.relevance === "high") {
        patterns.push({
          type: "code-reuse",
          description: `Found reusable ${obs.data.pattern} in ${obs.data.location}`,
          impact: "positive",
          recommendation: "Integrate with existing pattern"
        });
      }
    }

    // Look for dependency patterns
    const depUpdates = observations.filter(
      obs => obs.type === ObservationType.DEPENDENCY_UPDATE
    );

    if (depUpdates.length > 0) {
      patterns.push({
        type: "dependency-maintenance",
        description: `${depUpdates.length} dependencies need updating`,
        impact: "neutral",
        recommendation: "Update during implementation"
      });
    }

    return patterns;
  }
}
```

**3. Decide Phase**

Make strategic decisions based on orientation:

```typescript
interface Decision {
  timestamp: Date;
  type: DecisionType;
  reasoning: string[];
  changes: PlanChanges;
  confidence: number;
  requiresApproval: boolean;
}

enum DecisionType {
  CONTINUE = "continue",
  REPLAN = "replan",
  ADJUST = "adjust",
  ESCALATE = "escalate",
  ROLLBACK = "rollback"
}

class DecidePhase {
  async decide(orientation: Orientation, currentPlan: Plan): Promise<Decision> {
    // Evaluate current plan against new information
    const evaluation = this.evaluatePlan(currentPlan, orientation);

    // Determine if replanning is needed
    if (evaluation.needsReplan) {
      return this.planReplan(orientation, currentPlan);
    }

    // Check for adjustments
    if (evaluation.needsAdjustment) {
      return this.planAdjustment(orientation, currentPlan);
    }

    // Check for risks requiring escalation
    if (this.hasHighRisks(orientation.risks)) {
      return this.planEscalation(orientation, currentPlan);
    }

    // Continue with current plan
    return {
      timestamp: new Date(),
      type: DecisionType.CONTINUE,
      reasoning: ["Current plan optimal", "No significant changes detected"],
      changes: { modifications: [] },
      confidence: 0.9,
      requiresApproval: false
    };
  }

  evaluatePlan(plan: Plan, orientation: Orientation): PlanEvaluation {
    let needsReplan = false;
    let needsAdjustment = false;
    const reasons: string[] = [];

    // Check for better approaches
    for (const opportunity of orientation.opportunities) {
      if (opportunity.impact === "high") {
        needsReplan = true;
        reasons.push(`Better approach found: ${opportunity.description}`);
      }
    }

    // Check for blocking risks
    for (const risk of orientation.risks) {
      if (risk.severity === "high") {
        needsReplan = true;
        reasons.push(`High risk detected: ${risk.description}`);
      } else if (risk.severity === "medium") {
        needsAdjustment = true;
        reasons.push(`Risk mitigation needed: ${risk.description}`);
      }
    }

    return { needsReplan, needsAdjustment, reasons };
  }
}
```

**4. Act Phase**

Execute decisions and track results:

```typescript
interface ActionResult {
  action: Action;
  status: "success" | "failure" | "partial";
  output: any;
  duration: number;
  errors: string[];
}

class ActPhase {
  async act(decision: Decision, plan: Plan): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    // Apply plan changes if needed
    if (decision.type === DecisionType.REPLAN) {
      plan = await this.applyPlanChanges(plan, decision.changes);
    }

    // Execute next action(s)
    const nextActions = this.getNextActions(plan);

    for (const action of nextActions) {
      const result = await this.executeAction(action);
      results.push(result);

      // Update plan state
      if (result.status === "success") {
        plan.markCompleted(action);
      } else if (result.status === "failure") {
        // Trigger OODA loop for recovery
        await this.handleFailure(result, plan);
      }
    }

    return results;
  }

  async executeAction(action: Action): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      // Validate preconditions
      if (!this.validatePreconditions(action)) {
        throw new Error("Preconditions not met");
      }

      // Spawn appropriate agent
      const agent = await this.spawnAgent(action.agent);

      // Execute with timeout
      const output = await this.executeWithTimeout(agent, action, 600000); // 10min

      // Validate effects
      if (!this.validateEffects(action, output)) {
        throw new Error("Expected effects not achieved");
      }

      return {
        action,
        status: "success",
        output,
        duration: Date.now() - startTime,
        errors: []
      };
    } catch (error) {
      return {
        action,
        status: "failure",
        output: null,
        duration: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }
}
```

### OODA Loop Integration

```typescript
class OODALoop {
  private observe: ObservePhase;
  private orient: OrientPhase;
  private decide: DecidePhase;
  private act: ActPhase;

  async cycle(currentPlan: Plan): Promise<ActionResult[]> {
    // 1. Observe environment
    const observations = await this.observe.observe();

    // Store observations
    await memory.store("ooda/observations", {
      timestamp: Date.now(),
      observations,
      count: observations.length
    });

    // 2. Orient and analyze
    const orientation = await this.orient.orient(observations);

    // Store orientation
    await memory.store("ooda/orientation", {
      timestamp: Date.now(),
      orientation
    });

    // 3. Decide on actions
    const decision = await this.decide.decide(orientation, currentPlan);

    // Store decision
    await memory.store("ooda/decision", {
      timestamp: Date.now(),
      decision
    });

    // 4. Act on decision
    const results = await this.act.act(decision, currentPlan);

    // Store results
    await memory.store("ooda/actions", {
      timestamp: Date.now(),
      results
    });

    return results;
  }

  async monitor(taskId: number): Promise<void> {
    console.log(`Starting OODA loop for task #${taskId}`);

    let plan = await this.loadPlan(taskId);

    while (!plan.isComplete()) {
      const results = await this.cycle(plan);

      // Update plan based on results
      plan = await this.updatePlan(plan, results);

      // Send heartbeat
      await this.sendHeartbeat(taskId, plan.progress);

      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log(`OODA loop completed for task #${taskId}`);
  }
}
```

---

## Adaptive Replanning

### Triggers for Replanning

```typescript
enum ReplanTrigger {
  BETTER_APPROACH = "better-approach",
  BLOCKING_ISSUE = "blocking-issue",
  RESOURCE_CONSTRAINT = "resource-constraint",
  DEPENDENCY_CHANGE = "dependency-change",
  QUALITY_ISSUE = "quality-issue",
  TIME_CONSTRAINT = "time-constraint",
  DISCOVERY = "discovery"
}

interface ReplanEvent {
  trigger: ReplanTrigger;
  reason: string;
  impact: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high" | "critical";
}
```

### Replan Decision Logic

```typescript
class ReplanManager {
  shouldReplan(event: ReplanEvent, plan: Plan): boolean {
    // Critical urgency always triggers replan
    if (event.urgency === "critical") return true;

    // High impact + high urgency triggers replan
    if (event.impact === "high" && event.urgency === "high") return true;

    // Better approach with significant savings
    if (event.trigger === ReplanTrigger.BETTER_APPROACH) {
      const savings = this.calculateSavings(event, plan);
      return savings > 0.15; // >15% improvement
    }

    // Blocking issues always trigger replan
    if (event.trigger === ReplanTrigger.BLOCKING_ISSUE) return true;

    // Otherwise, continue with current plan
    return false;
  }

  async replan(
    event: ReplanEvent,
    currentPlan: Plan,
    currentState: WorldState
  ): Promise<Plan> {
    console.log(`Replanning triggered: ${event.reason}`);

    // Analyze current progress
    const completed = currentPlan.completedActions;
    const remaining = currentPlan.remainingActions;

    // Generate new plan from current state
    const newActions = await this.generateActions(event, currentState);
    const newPlan = await this.planner.plan(
      currentState,
      currentPlan.goalState,
      [...this.baseActions, ...newActions]
    );

    // Compare costs
    const comparison = this.comparePlans(currentPlan, newPlan);

    console.log(`Replan analysis:`);
    console.log(`  Current cost: ${currentPlan.remainingCost}`);
    console.log(`  New plan cost: ${newPlan.totalCost}`);
    console.log(`  Savings: ${comparison.savings}%`);
    console.log(`  Time impact: ${comparison.timeImpact}`);

    // Store replan event
    await memory.store("task/replan-history", {
      timestamp: Date.now(),
      trigger: event.trigger,
      reason: event.reason,
      oldCost: currentPlan.remainingCost,
      newCost: newPlan.totalCost,
      savings: comparison.savings
    });

    return newPlan;
  }
}
```

### Replan Example

```typescript
// Original plan: Build new event system
const originalPlan = [
  { action: "research-event-patterns", cost: 2 },
  { action: "design-event-system", cost: 4 },
  { action: "implement-event-system", cost: 6 },
  { action: "create-event-handlers", cost: 4 },
  { action: "write-tests", cost: 3 }
];
// Total cost: 19

// Observation during execution
const observation: Observation = {
  type: ObservationType.CODE_PATTERN,
  data: {
    pattern: "existing-event-system",
    location: "src/events/",
    compatibility: "high",
    functionality: "80% of requirements"
  },
  priority: "high"
};

// Decision to replan
const replanEvent: ReplanEvent = {
  trigger: ReplanTrigger.DISCOVERY,
  reason: "Found existing event system with high compatibility",
  impact: "high",
  urgency: "medium"
};

// New plan: Extend existing system
const newPlan = [
  { action: "research-event-patterns", cost: 2 },      // Already completed
  { action: "analyze-existing-system", cost: 1 },      // New action
  { action: "design-extensions", cost: 2 },            // Modified (was 4)
  { action: "implement-extensions", cost: 3 },         // Modified (was 6)
  { action: "integrate-handlers", cost: 2 },           // Modified (was 4)
  { action: "write-tests", cost: 3 }                   // Unchanged
];
// Total cost: 13
// Savings: 31%
// Additional benefit: Better code consistency
```

### Rollback Support

```typescript
class RollbackManager {
  async rollback(
    plan: Plan,
    targetStep: number,
    reason: string
  ): Promise<void> {
    console.log(`Rolling back to step ${targetStep}: ${reason}`);

    // Get actions to revert
    const revertActions = plan.completedActions.slice(targetStep);

    // Revert in reverse order
    for (let i = revertActions.length - 1; i >= 0; i--) {
      const action = revertActions[i];
      await this.revertAction(action);
    }

    // Restore state
    const targetState = await this.loadState(plan.id, targetStep);
    await this.restoreState(targetState);

    // Update plan
    plan.rollbackTo(targetStep);

    console.log(`Rollback complete. Ready to continue from step ${targetStep}`);
  }

  async revertAction(action: Action): Promise<void> {
    // Revert file changes
    if (action.fileChanges) {
      for (const change of action.fileChanges) {
        await git.revert(change.commit);
      }
    }

    // Revert memory updates
    if (action.memoryUpdates) {
      for (const update of action.memoryUpdates) {
        await memory.delete(update.key);
      }
    }

    // Revert state effects
    // State will be restored from snapshot
  }
}
```

---

## Performance Metrics

### Metric Collection

```typescript
interface PerformanceMetrics {
  // Execution metrics
  totalTime: number;
  planningTime: number;
  executionTime: number;
  waitTime: number;

  // Resource metrics
  tokensUsed: number;
  apiCalls: number;
  memoryOperations: number;
  fileOperations: number;

  // Efficiency metrics
  plannedCost: number;
  actualCost: number;
  costDeviation: number;
  parallelizationRatio: number;

  // Quality metrics
  testCoverage: number;
  codeQuality: number;
  securityScore: number;

  // OODA metrics
  observations: number;
  orientations: number;
  decisions: number;
  actions: number;
  replans: number;

  // Agent metrics
  agentCount: number;
  agentUtilization: { [agent: string]: number };
  agentEfficiency: { [agent: string]: number };
}

class MetricsCollector {
  async collect(taskId: number): Promise<PerformanceMetrics> {
    const execution = await this.loadExecution(taskId);
    const plan = await this.loadPlan(taskId);
    const agents = await this.loadAgentStats(taskId);

    return {
      // Calculate all metrics
      totalTime: execution.endTime - execution.startTime,
      planningTime: this.calculatePlanningTime(execution),
      executionTime: this.calculateExecutionTime(execution),
      waitTime: this.calculateWaitTime(execution),

      tokensUsed: this.sumTokens(agents),
      apiCalls: this.countAPICalls(execution),
      memoryOperations: this.countMemoryOps(execution),
      fileOperations: this.countFileOps(execution),

      plannedCost: plan.estimatedCost,
      actualCost: plan.actualCost,
      costDeviation: (plan.actualCost - plan.estimatedCost) / plan.estimatedCost,
      parallelizationRatio: this.calculateParallelization(plan),

      testCoverage: await this.getTestCoverage(taskId),
      codeQuality: await this.getCodeQuality(taskId),
      securityScore: await this.getSecurityScore(taskId),

      observations: this.countOODAPhase(execution, "observe"),
      orientations: this.countOODAPhase(execution, "orient"),
      decisions: this.countOODAPhase(execution, "decide"),
      actions: this.countOODAPhase(execution, "act"),
      replans: this.countReplans(execution),

      agentCount: agents.length,
      agentUtilization: this.calculateUtilization(agents),
      agentEfficiency: this.calculateEfficiency(agents)
    };
  }
}
```

### KPI Definitions

**Execution KPIs:**
- **Time to Completion**: Total time from claim to completion
- **Planning Efficiency**: Actual cost vs planned cost ratio
- **Parallelization Ratio**: Parallel time / sequential time
- **Agent Utilization**: Active time / total time per agent

**Quality KPIs:**
- **Test Coverage**: Percentage of code covered by tests
- **Code Quality Score**: Weighted score from linters and analyzers
- **Security Score**: Vulnerability count and severity
- **Documentation Coverage**: API endpoints documented

**OODA KPIs:**
- **Observation Rate**: Observations per minute
- **Replan Frequency**: Replans per task
- **Replan Benefit**: Cost savings from replanning
- **Decision Quality**: Successful decisions / total decisions

### Metrics Visualization

```bash
# View metrics for a task
/task-metrics --issue 42

# Output:
# Performance Metrics: Task #42
# ===============================
#
# Execution Time
# ├─ Planning: 2m 30s (6%)
# ├─ Execution: 64m 15s (91%)
# └─ Wait time: 2m 15s (3%)
# Total: 67m
#
# Cost Analysis
# ├─ Planned cost: 20
# ├─ Actual cost: 18
# └─ Savings: 10%
#
# Resource Usage
# ├─ Tokens: 25,150
# ├─ API calls: 89
# ├─ Memory ops: 45
# └─ File ops: 67
#
# Quality Metrics
# ├─ Test coverage: 96.5% ✓
# ├─ Code quality: 94/100 ✓
# └─ Security: 98/100 ✓
#
# OODA Activity
# ├─ Observations: 23
# ├─ Orientations: 14
# ├─ Decisions: 19
# ├─ Actions: 67
# └─ Replans: 1 (saving: 31%)
#
# Agent Performance
# ├─ researcher: 8m (12%) - Excellent
# ├─ architect: 18m (27%) - Excellent
# ├─ backend-dev: 22m (33%) - Good
# ├─ coder: 11m (16%) - Excellent
# ├─ tester: 6m (9%) - Good
# └─ cicd-engineer: 2m (3%) - Excellent
#
# Overall Score: 95/100 ✓
```

---

## Configuration Options

### GOAP Configuration

```typescript
interface GOAPConfig {
  // Planning parameters
  maxSearchDepth: number;        // Default: 50
  maxPlanLength: number;         // Default: 20
  planningTimeout: number;       // Default: 30000ms

  // Heuristic weights
  costWeight: number;            // Default: 1.0
  timeWeight: number;            // Default: 0.8
  qualityWeight: number;         // Default: 0.6

  // Optimization
  enableParallelization: boolean; // Default: true
  parallelThreshold: number;      // Default: 2

  // Replanning
  enableAdaptiveReplan: boolean;  // Default: true
  replanThreshold: number;        // Default: 0.15 (15% improvement)
}

// Configuration file: .tasksentinel/goap.json
{
  "maxSearchDepth": 50,
  "maxPlanLength": 20,
  "planningTimeout": 30000,
  "costWeight": 1.0,
  "timeWeight": 0.8,
  "qualityWeight": 0.6,
  "enableParallelization": true,
  "parallelThreshold": 2,
  "enableAdaptiveReplan": true,
  "replanThreshold": 0.15
}
```

### OODA Configuration

```typescript
interface OODAConfig {
  // Observation
  observationInterval: number;    // Default: 30000ms
  observationSources: string[];   // Default: ["git", "tests", "deps"]

  // Orient
  patternRecognition: boolean;    // Default: true
  contextWindow: number;          // Default: 10 observations

  // Decide
  decisionThreshold: number;      // Default: 0.7 confidence
  requireApprovalForHigh: boolean;// Default: true

  // Act
  actionTimeout: number;          // Default: 600000ms
  maxRetries: number;             // Default: 3
  retryDelay: number;             // Default: 5000ms
}

// Configuration file: .tasksentinel/ooda.json
{
  "observationInterval": 30000,
  "observationSources": ["git", "tests", "dependencies", "security"],
  "patternRecognition": true,
  "contextWindow": 10,
  "decisionThreshold": 0.7,
  "requireApprovalForHigh": true,
  "actionTimeout": 600000,
  "maxRetries": 3,
  "retryDelay": 5000
}
```

### Agent Configuration

```typescript
interface AgentConfig {
  // Spawning
  spawnTimeout: number;           // Default: 60000ms
  maxConcurrentAgents: number;    // Default: 8

  // Coordination
  topology: "mesh" | "hierarchical" | "ring" | "star" | "auto";
  autoScaling: boolean;           // Default: true

  // Memory
  memoryNamespace: string;        // Default: "swarm-task-{id}"
  memoryTTL: number;             // Default: 86400000ms (24h)

  // Heartbeat
  heartbeatInterval: number;      // Default: 30000ms
  heartbeatTimeout: number;       // Default: 90000ms
}

// Configuration file: .tasksentinel/agents.json
{
  "spawnTimeout": 60000,
  "maxConcurrentAgents": 8,
  "topology": "auto",
  "autoScaling": true,
  "memoryNamespace": "swarm-task-{id}",
  "memoryTTL": 86400000,
  "heartbeatInterval": 30000,
  "heartbeatTimeout": 90000
}
```

### Quality Gates Configuration

```typescript
interface QualityGatesConfig {
  // Code quality
  minCoverage: number;            // Default: 0.80
  maxComplexity: number;          // Default: 10
  maxDuplication: number;         // Default: 0.05

  // Security
  allowedVulnerabilities: {
    critical: number;             // Default: 0
    high: number;                 // Default: 0
    medium: number;               // Default: 5
    low: number;                  // Default: 20
  };

  // Performance
  maxBundleSize: number;          // Default: 512KB
  maxBuildTime: number;           // Default: 60000ms
  maxRegressionPercent: number;   // Default: 0.10
}

// Configuration file: .tasksentinel/quality-gates.json
{
  "minCoverage": 0.80,
  "maxComplexity": 10,
  "maxDuplication": 0.05,
  "allowedVulnerabilities": {
    "critical": 0,
    "high": 0,
    "medium": 5,
    "low": 20
  },
  "maxBundleSize": 524288,
  "maxBuildTime": 60000,
  "maxRegressionPercent": 0.10
}
```

---

## Troubleshooting

### GOAP Planning Issues

**Problem: Planning timeout**
```
Error: GOAP planning timeout after 30s
```

**Solution:**
```typescript
// Increase timeout in config
{
  "planningTimeout": 60000  // 60s instead of 30s
}

// Or simplify the task
// Break complex tasks into smaller subtasks
```

**Problem: No path found**
```
Error: No path from current state to goal state
```

**Solution:**
```typescript
// Check action definitions
// Ensure there's a chain of actions connecting start to goal

// Add missing actions
const missingAction = {
  name: "bridge-action",
  preconditions: { hasState1: true },
  effects: { hasState2: true },
  cost: 1
};

// Or adjust goal state
// Make goal more achievable
```

### OODA Loop Issues

**Problem: Excessive observations**
```
Warning: 1000+ observations in 5 minutes
```

**Solution:**
```typescript
// Reduce observation frequency
{
  "observationInterval": 60000  // Check every minute instead of 30s
}

// Filter observation sources
{
  "observationSources": ["git", "tests"]  // Remove less critical sources
}
```

**Problem: Replan loops**
```
Warning: 5 replans in 10 minutes
```

**Solution:**
```typescript
// Increase replan threshold
{
  "replanThreshold": 0.25  // Require 25% improvement instead of 15%
}

// Add cooldown period
{
  "minReplanInterval": 300000  // 5 minutes between replans
}
```

### Performance Issues

**Problem: Slow execution**
```
Task taking 2x estimated time
```

**Diagnostic:**
```bash
# Check metrics
/task-metrics --issue 42

# Look for:
# - High wait times (agent coordination issues)
# - Low parallelization (sequential execution)
# - High replan count (instability)
```

**Solutions:**
```typescript
// Enable more parallelization
{
  "parallelThreshold": 1  // Lower threshold for parallel execution
}

// Increase agent limit
{
  "maxConcurrentAgents": 12  // Allow more agents
}

// Optimize topology
{
  "topology": "hierarchical"  // Better for large teams
}
```

### Memory Issues

**Problem: Memory coordination failures**
```
Error: Failed to retrieve shared memory
```

**Solution:**
```bash
# Clear old memory
npx claude-flow@alpha memory clear --namespace "swarm-*" --older-than 24h

# Check memory service
npx claude-flow@alpha memory list

# Restart memory service if needed
```

### Agent Issues

**Problem: Agent spawn failures**
```
Error: Failed to spawn backend-dev agent
```

**Solution:**
```bash
# Check Claude Flow MCP
claude mcp list

# Verify agent availability
npx claude-flow@alpha sparc modes

# Increase spawn timeout
{
  "spawnTimeout": 120000  // 2 minutes
}
```

---

## Best Practices

### GOAP Planning

1. **Keep actions atomic**: Each action should do one thing well
2. **Define clear preconditions**: Make dependencies explicit
3. **Accurate cost estimates**: Use historical data for costs
4. **Enable parallelization**: Mark independent actions
5. **Regular state validation**: Check state consistency

### OODA Loop

1. **Prioritize observations**: Focus on high-value observations
2. **Context matters**: Build rich context for better decisions
3. **Trust the process**: Let OODA adapt the plan
4. **Document replans**: Record why replans occurred
5. **Monitor metrics**: Track OODA effectiveness

### Performance

1. **Right-size agent teams**: 5-8 agents optimal for most tasks
2. **Use appropriate topology**: Match topology to task structure
3. **Enable auto-scaling**: Let system adjust agent count
4. **Monitor bottlenecks**: Watch for sequential dependencies
5. **Learn from history**: Use neural training for optimization

---

## Next Steps

- **API Reference**: See [GOAP API](/docs/api/goap.md), [OODA API](/docs/api/ooda.md)
- **Examples**: Check [examples](/examples) directory
- **Advanced Patterns**: See [advanced patterns guide](/docs/advanced-patterns.md)

---

**Version:** 2.0.0
**Last Updated:** 2025-10-30
**Contributors:** Task Sentinel Team
