# GOAP API Reference

**Goal-Oriented Action Planning Module**

Version: 2.0.0

---

## Table of Contents

- [Overview](#overview)
- [Core Classes](#core-classes)
- [State Model](#state-model)
- [Actions](#actions)
- [Planning](#planning)
- [Execution](#execution)
- [Examples](#examples)

---

## Overview

The GOAP module provides goal-oriented action planning using A* search to find optimal sequences of actions.

### Installation

```typescript
import {
  GOAPPlanner,
  WorldState,
  Action,
  Goal,
  PlanResult
} from '@tasksentinel/goap';
```

---

## Core Classes

### GOAPPlanner

Main planner class that generates action plans.

```typescript
class GOAPPlanner {
  constructor(
    currentState: WorldState,
    goalState: WorldState,
    options?: GOAPOptions
  );

  async plan(actions: Action[]): Promise<PlanResult>;
  async replan(
    completedActions: Action[],
    newState: WorldState
  ): Promise<PlanResult>;

  validateState(state: WorldState): ValidationResult;
  estimateCost(actions: Action[]): number;
  optimizeForParallel(plan: Action[]): OptimizedPlan;
}
```

**Constructor Parameters:**
- `currentState`: Starting world state
- `goalState`: Desired end state
- `options`: Optional configuration

**Example:**
```typescript
const planner = new GOAPPlanner(
  { hasRequirements: true, hasImplementation: false },
  { hasImplementation: true, hasTests: true, deployed: true },
  {
    maxSearchDepth: 50,
    enableParallelization: true,
    heuristicWeight: 1.0
  }
);

const plan = await planner.plan(availableActions);
```

### GOAPOptions

Configuration options for the planner.

```typescript
interface GOAPOptions {
  // Search parameters
  maxSearchDepth?: number;          // Default: 50
  maxPlanLength?: number;           // Default: 20
  planningTimeout?: number;         // Default: 30000ms

  // Optimization
  enableParallelization?: boolean;  // Default: true
  parallelThreshold?: number;       // Default: 2

  // Heuristic weights
  costWeight?: number;              // Default: 1.0
  timeWeight?: number;              // Default: 0.8
  qualityWeight?: number;           // Default: 0.6

  // Callbacks
  onProgress?: (progress: PlanProgress) => void;
  onComplete?: (result: PlanResult) => void;
  onError?: (error: Error) => void;
}
```

**Example:**
```typescript
const options: GOAPOptions = {
  maxSearchDepth: 100,
  enableParallelization: true,
  costWeight: 1.2,  // Prioritize low-cost actions
  onProgress: (progress) => {
    console.log(`Planning: ${progress.nodesExplored} nodes explored`);
  }
};
```

---

## State Model

### WorldState

Represents the current state of the world/task.

```typescript
interface WorldState {
  // Task progression
  hasRequirements?: boolean;
  hasResearch?: boolean;
  hasDesign?: boolean;
  hasImplementation?: boolean;
  hasTests?: boolean;
  hasDocumentation?: boolean;

  // Quality gates
  codeQualityChecked?: boolean;
  securityScanned?: boolean;
  performanceTested?: boolean;

  // Deployment
  staged?: boolean;
  deployed?: boolean;
  validated?: boolean;

  // Custom states
  [key: string]: boolean | undefined;
}
```

**Example:**
```typescript
const initialState: WorldState = {
  hasRequirements: true,
  hasResearch: false,
  hasDesign: false,
  hasImplementation: false,
  hasTests: false,
  codeQualityChecked: false,
  deployed: false
};

const goalState: WorldState = {
  hasImplementation: true,
  hasTests: true,
  codeQualityChecked: true,
  deployed: true
};
```

### StateTransition

Represents a state change caused by an action.

```typescript
interface StateTransition {
  action: Action;
  fromState: WorldState;
  toState: WorldState;
  timestamp: Date;
  duration: number;
  success: boolean;
}
```

**Example:**
```typescript
const transition: StateTransition = {
  action: researchAction,
  fromState: { hasRequirements: true, hasResearch: false },
  toState: { hasRequirements: true, hasResearch: true },
  timestamp: new Date(),
  duration: 480000,  // 8 minutes
  success: true
};
```

### ValidationResult

Result of state validation.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Example:**
```typescript
const validation = planner.validateState({
  hasTests: true,
  hasImplementation: false  // Invalid: can't have tests without implementation
});

// Result:
// {
//   valid: false,
//   errors: ["Cannot have tests without implementation"],
//   warnings: []
// }
```

---

## Actions

### Action

Represents an action that transforms state.

```typescript
interface Action {
  // Identification
  name: string;
  description?: string;

  // State requirements
  preconditions: Partial<WorldState>;
  effects: Partial<WorldState>;

  // Cost estimation
  cost: number;
  estimatedTime?: number;  // milliseconds

  // Execution
  agent: string;
  parameters?: Record<string, any>;

  // Parallelization
  parallelizable?: boolean;
  parallelGroup?: string;
  dependencies?: string[];  // Action names

  // Metadata
  category?: string;
  priority?: number;
  tags?: string[];
}
```

**Example:**
```typescript
const implementAction: Action = {
  name: "implement-feature",
  description: "Implement the core feature logic",

  preconditions: {
    hasDesign: true,
    hasResearch: true
  },
  effects: {
    hasImplementation: true
  },

  cost: 5,
  estimatedTime: 1200000,  // 20 minutes

  agent: "backend-dev",
  parameters: {
    language: "typescript",
    framework: "express"
  },

  parallelizable: false,
  dependencies: ["research-patterns", "design-schema"],

  category: "implementation",
  priority: 8,
  tags: ["backend", "core-feature"]
};
```

### ActionBuilder

Fluent API for building actions.

```typescript
class ActionBuilder {
  name(name: string): this;
  description(desc: string): this;
  precondition(key: string, value: boolean): this;
  effect(key: string, value: boolean): this;
  cost(cost: number): this;
  time(milliseconds: number): this;
  agent(agentType: string): this;
  parallel(group?: string): this;
  dependsOn(...actions: string[]): this;
  build(): Action;
}
```

**Example:**
```typescript
const action = new ActionBuilder()
  .name("write-tests")
  .description("Create unit and integration tests")
  .precondition("hasImplementation", true)
  .effect("hasTests", true)
  .effect("testCoverageAchieved", true)
  .cost(3)
  .time(600000)  // 10 minutes
  .agent("tester")
  .parallel("testing")
  .dependsOn("implement-feature")
  .build();
```

### ActionLibrary

Pre-defined common actions.

```typescript
class ActionLibrary {
  static research(topic: string, cost?: number): Action;
  static design(component: string, cost?: number): Action;
  static implement(feature: string, cost?: number): Action;
  static test(scope: string, cost?: number): Action;
  static document(artifact: string, cost?: number): Action;
  static deploy(environment: string, cost?: number): Action;

  static getAll(): Action[];
  static getByCategory(category: string): Action[];
  static getByAgent(agentType: string): Action[];
}
```

**Example:**
```typescript
const actions = [
  ActionLibrary.research("authentication-patterns", 2),
  ActionLibrary.design("auth-schema", 3),
  ActionLibrary.implement("jwt-authentication", 5),
  ActionLibrary.test("auth-system", 3),
  ActionLibrary.document("auth-api", 2),
  ActionLibrary.deploy("staging", 1)
];
```

---

## Planning

### PlanResult

Result of planning operation.

```typescript
interface PlanResult {
  success: boolean;
  plan: Action[];
  totalCost: number;
  estimatedTime: number;

  // Optimization
  parallelGroups?: ParallelGroup[];
  optimizedTime?: number;
  speedup?: number;

  // Search statistics
  nodesExplored: number;
  pathLength: number;
  searchTime: number;

  // Warnings
  warnings?: string[];
  errors?: string[];
}
```

**Example:**
```typescript
const result = await planner.plan(actions);

if (result.success) {
  console.log(`Plan found with ${result.plan.length} actions`);
  console.log(`Total cost: ${result.totalCost}`);
  console.log(`Estimated time: ${result.estimatedTime}ms`);
  console.log(`Parallel speedup: ${result.speedup}x`);

  for (const action of result.plan) {
    console.log(`- ${action.name} (${action.cost})`);
  }
} else {
  console.error("Planning failed:", result.errors);
}
```

### ParallelGroup

Group of actions that can execute in parallel.

```typescript
interface ParallelGroup {
  id: string;
  actions: Action[];
  estimatedTime: number;
  totalCost: number;
}
```

**Example:**
```typescript
const parallelGroup: ParallelGroup = {
  id: "testing-phase",
  actions: [
    ActionLibrary.test("unit-tests", 3),
    ActionLibrary.test("integration-tests", 4),
    ActionLibrary.test("e2e-tests", 5)
  ],
  estimatedTime: 5 * 60000,  // Limited by slowest (e2e)
  totalCost: 12  // Sum of all costs
};
```

### OptimizedPlan

Plan optimized for parallel execution.

```typescript
interface OptimizedPlan {
  groups: ParallelGroup[];
  totalCost: number;
  sequentialTime: number;
  parallelTime: number;
  speedup: number;
}
```

**Example:**
```typescript
const optimized = planner.optimizeForParallel(result.plan);

console.log("Execution Plan:");
for (let i = 0; i < optimized.groups.length; i++) {
  const group = optimized.groups[i];
  console.log(`\nPhase ${i + 1}:`);

  if (group.actions.length === 1) {
    console.log(`  ${group.actions[0].name}`);
  } else {
    console.log(`  Parallel execution:`);
    for (const action of group.actions) {
      console.log(`    - ${action.name}`);
    }
  }
}

console.log(`\nSpeedup: ${optimized.speedup.toFixed(2)}x`);
```

### PlanProgress

Progress information during planning.

```typescript
interface PlanProgress {
  nodesExplored: number;
  currentDepth: number;
  bestCostSoFar: number;
  timeElapsed: number;
  estimatedRemaining?: number;
}
```

**Example:**
```typescript
const options: GOAPOptions = {
  onProgress: (progress: PlanProgress) => {
    const pct = (progress.timeElapsed / 30000) * 100;
    console.log(
      `Planning: ${progress.nodesExplored} nodes, ` +
      `depth ${progress.currentDepth}, ` +
      `best cost ${progress.bestCostSoFar}, ` +
      `${pct.toFixed(0)}% time used`
    );
  }
};
```

---

## Execution

### PlanExecutor

Executes planned actions.

```typescript
class PlanExecutor {
  constructor(
    plan: PlanResult,
    agentSpawner: AgentSpawner,
    options?: ExecutorOptions
  );

  async execute(): Promise<ExecutionResult>;
  async executeAction(action: Action): Promise<ActionResult>;
  async executeParallel(group: ParallelGroup): Promise<ActionResult[]>;

  pause(): void;
  resume(): void;
  cancel(): void;

  getProgress(): ExecutionProgress;
}
```

**Example:**
```typescript
const executor = new PlanExecutor(
  planResult,
  agentSpawner,
  {
    onActionStart: (action) => {
      console.log(`Starting: ${action.name}`);
    },
    onActionComplete: (result) => {
      console.log(`Completed: ${result.action.name} in ${result.duration}ms`);
    }
  }
);

const result = await executor.execute();
```

### ExecutorOptions

Configuration for plan execution.

```typescript
interface ExecutorOptions {
  // Execution control
  maxRetries?: number;            // Default: 3
  retryDelay?: number;            // Default: 5000ms
  actionTimeout?: number;         // Default: 600000ms

  // Parallelization
  maxConcurrentActions?: number;  // Default: 5

  // Callbacks
  onActionStart?: (action: Action) => void;
  onActionComplete?: (result: ActionResult) => void;
  onActionFail?: (action: Action, error: Error) => void;
  onProgress?: (progress: ExecutionProgress) => void;
}
```

### ActionResult

Result of executing a single action.

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

  stateTransition?: StateTransition;
  agentId?: string;
  retries?: number;
}
```

**Example:**
```typescript
const result: ActionResult = {
  action: implementAction,
  status: "success",
  startTime: new Date("2025-10-30T11:00:00Z"),
  endTime: new Date("2025-10-30T11:20:00Z"),
  duration: 1200000,  // 20 minutes

  output: {
    filesCreated: ["auth.service.ts", "jwt.util.ts"],
    linesAdded: 245,
    testsCreated: 12
  },

  stateTransition: {
    action: implementAction,
    fromState: { hasDesign: true, hasImplementation: false },
    toState: { hasDesign: true, hasImplementation: true },
    timestamp: new Date(),
    duration: 1200000,
    success: true
  },

  agentId: "backend-dev-agent-1",
  retries: 0
};
```

### ExecutionResult

Complete result of plan execution.

```typescript
interface ExecutionResult {
  success: boolean;
  totalTime: number;
  actionResults: ActionResult[];

  // Statistics
  actionsCompleted: number;
  actionsFailed: number;
  actionsSkipped: number;

  // Final state
  finalState: WorldState;
  goalAchieved: boolean;

  // Errors
  errors?: string[];
  failedActions?: Action[];
}
```

**Example:**
```typescript
const executionResult = await executor.execute();

console.log(`Execution completed in ${executionResult.totalTime}ms`);
console.log(`Success: ${executionResult.success}`);
console.log(`Actions completed: ${executionResult.actionsCompleted}`);
console.log(`Actions failed: ${executionResult.actionsFailed}`);
console.log(`Goal achieved: ${executionResult.goalAchieved}`);

if (!executionResult.success) {
  console.error("Failed actions:");
  for (const action of executionResult.failedActions) {
    console.error(`  - ${action.name}`);
  }
}
```

---

## Examples

### Example 1: Simple Task Planning

```typescript
import { GOAPPlanner, ActionLibrary } from '@tasksentinel/goap';

// Define states
const currentState = {
  hasRequirements: true,
  hasImplementation: false,
  hasTests: false
};

const goalState = {
  hasImplementation: true,
  hasTests: true,
  deployed: true
};

// Get actions
const actions = [
  ActionLibrary.research("feature-patterns", 2),
  ActionLibrary.design("feature-schema", 3),
  ActionLibrary.implement("feature-logic", 5),
  ActionLibrary.test("feature", 3),
  ActionLibrary.deploy("production", 1)
];

// Create planner
const planner = new GOAPPlanner(currentState, goalState);

// Generate plan
const result = await planner.plan(actions);

if (result.success) {
  console.log("Plan generated successfully!");
  console.log(`Total cost: ${result.totalCost}`);
  console.log(`Actions: ${result.plan.length}`);

  result.plan.forEach((action, i) => {
    console.log(`${i + 1}. ${action.name} (cost: ${action.cost})`);
  });
}
```

### Example 2: Custom Actions with Builder

```typescript
import { ActionBuilder, GOAPPlanner } from '@tasksentinel/goap';

// Build custom actions
const actions = [
  new ActionBuilder()
    .name("analyze-requirements")
    .precondition("hasRequirements", true)
    .effect("hasAnalysis", true)
    .cost(2)
    .agent("analyst")
    .build(),

  new ActionBuilder()
    .name("design-database-schema")
    .precondition("hasAnalysis", true)
    .effect("hasDBSchema", true)
    .cost(3)
    .agent("architect")
    .parallel("design")
    .build(),

  new ActionBuilder()
    .name("design-api-endpoints")
    .precondition("hasAnalysis", true)
    .effect("hasAPIDesign", true)
    .cost(3)
    .agent("architect")
    .parallel("design")
    .build(),

  new ActionBuilder()
    .name("implement-database")
    .precondition("hasDBSchema", true)
    .effect("hasDB", true)
    .cost(4)
    .agent("backend-dev")
    .build(),

  new ActionBuilder()
    .name("implement-api")
    .precondition("hasAPIDesign", true)
    .precondition("hasDB", true)
    .effect("hasAPI", true)
    .cost(5)
    .agent("backend-dev")
    .build()
];

// Plan and optimize
const planner = new GOAPPlanner(
  { hasRequirements: true },
  { hasAPI: true }
);

const plan = await planner.plan(actions);
const optimized = planner.optimizeForParallel(plan.plan);

console.log("Optimized execution plan:");
optimized.groups.forEach((group, i) => {
  console.log(`\nPhase ${i + 1}:`);
  group.actions.forEach(action => {
    console.log(`  - ${action.name}`);
  });
});
```

### Example 3: Replanning During Execution

```typescript
import { GOAPPlanner, PlanExecutor } from '@tasksentinel/goap';

// Initial planning
const planner = new GOAPPlanner(currentState, goalState);
let plan = await planner.plan(actions);

// Execute with replanning
const executor = new PlanExecutor(plan, agentSpawner, {
  onActionComplete: async (result) => {
    console.log(`Completed: ${result.action.name}`);

    // Check if replanning is beneficial
    const currentState = getCurrentState();
    const shouldReplan = await checkForBetterApproach(currentState);

    if (shouldReplan) {
      console.log("Better approach found, replanning...");

      // Create new planner with current state
      const newPlanner = new GOAPPlanner(
        currentState,
        goalState
      );

      // Generate new plan
      const newPlan = await newPlanner.plan(remainingActions);

      if (newPlan.totalCost < plan.totalCost) {
        console.log(`Cost reduced: ${plan.totalCost} → ${newPlan.totalCost}`);
        plan = newPlan;
        executor.updatePlan(plan);
      }
    }
  }
});

const result = await executor.execute();
```

### Example 4: Real-time Progress Monitoring

```typescript
import { GOAPPlanner, PlanExecutor } from '@tasksentinel/goap';

// Planning with progress
const planner = new GOAPPlanner(currentState, goalState, {
  onProgress: (progress) => {
    const pct = (progress.nodesExplored / 1000) * 100;
    console.log(`Planning: ${pct.toFixed(1)}% (${progress.nodesExplored} nodes)`);
  }
});

const plan = await planner.plan(actions);

// Execution with progress
const executor = new PlanExecutor(plan, agentSpawner, {
  onProgress: (progress) => {
    const pct = (progress.actionsCompleted / progress.totalActions) * 100;
    console.log(
      `Execution: ${pct.toFixed(1)}% ` +
      `(${progress.actionsCompleted}/${progress.totalActions} actions)`
    );
  },

  onActionStart: (action) => {
    console.log(`▶ Starting: ${action.name}`);
  },

  onActionComplete: (result) => {
    const status = result.status === "success" ? "✓" : "✗";
    console.log(`${status} Completed: ${result.action.name} (${result.duration}ms)`);
  }
});

const result = await executor.execute();
console.log(`\nExecution ${result.success ? "succeeded" : "failed"}`);
```

### Example 5: State Persistence

```typescript
import { GOAPPlanner, StateManager } from '@tasksentinel/goap';

// Create state manager
const stateManager = new StateManager('task-42');

// Save initial state
await stateManager.saveState('initial', currentState);

// Execute actions
const executor = new PlanExecutor(plan, agentSpawner, {
  onActionComplete: async (result) => {
    // Save state after each action
    if (result.stateTransition) {
      await stateManager.saveState(
        result.action.name,
        result.stateTransition.toState
      );
    }
  }
});

// If execution fails, restore from last checkpoint
try {
  await executor.execute();
} catch (error) {
  console.error("Execution failed, restoring last state...");
  const lastState = await stateManager.getLatestState();

  // Resume from last state
  const resumePlanner = new GOAPPlanner(lastState, goalState);
  const resumePlan = await resumePlanner.plan(remainingActions);
  // ... continue execution
}
```

---

## API Summary

### Main Classes
- `GOAPPlanner` - A* based action planning
- `PlanExecutor` - Action execution engine
- `ActionBuilder` - Fluent action creation
- `ActionLibrary` - Pre-defined actions
- `StateManager` - State persistence

### Key Interfaces
- `WorldState` - State representation
- `Action` - Action definition
- `PlanResult` - Planning result
- `ActionResult` - Execution result
- `OptimizedPlan` - Parallel-optimized plan

### Utilities
- `validateState()` - State validation
- `estimateCost()` - Cost estimation
- `optimizeForParallel()` - Parallel optimization
- `calculateSpeedup()` - Speedup calculation

---

**Version:** 2.0.0
**Last Updated:** 2025-10-30
**Module:** @tasksentinel/goap
