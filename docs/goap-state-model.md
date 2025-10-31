# GOAP State Model Documentation

## Overview

The Goal-Oriented Action Planning (GOAP) state model provides a comprehensive representation of task lifecycle states and actions in Task Sentinel Phase 2. This model enables intelligent planning and optimization of task execution through a well-defined state space.

## Architecture

### State Space

The system defines 16 discrete states representing the complete task lifecycle:

```
task_created → task_queued → task_claimed → dependencies_resolved →
agents_spawned → code_implemented → tests_written → tests_passing →
qa_started → qa_complete → reviewed → pr_created → ci_passing →
approved → merged → task_complete
```

### Core Components

#### 1. TaskState Interface

Represents the complete state of a task with boolean flags for each lifecycle stage:

```typescript
interface TaskState {
  // Lifecycle flags
  task_created: boolean;
  task_queued: boolean;
  task_claimed: boolean;
  dependencies_resolved: boolean;
  agents_spawned: boolean;
  code_implemented: boolean;
  tests_written: boolean;
  tests_passing: boolean;
  qa_started: boolean;
  qa_complete: boolean;
  reviewed: boolean;
  pr_created: boolean;
  ci_passing: boolean;
  approved: boolean;
  merged: boolean;
  task_complete: boolean;

  // Metadata
  taskId?: string;
  assignedAgent?: string;
  dependencyCount?: number;
  testCoverage?: number;
  qaIssuesCount?: number;
  reviewerCount?: number;
}
```

#### 2. Action Interface

Defines actions with preconditions, effects, and costs:

```typescript
interface Action {
  type: ActionType;
  name: string;
  description: string;
  preconditions: Partial<TaskState>;
  effects: Partial<TaskState>;
  cost: number;
  validate?: (state: TaskState) => boolean;
  execute?: (state: TaskState) => Promise<TaskState>;
}
```

#### 3. Plan Interface

Represents a sequence of actions to achieve a goal:

```typescript
interface Plan {
  actions: Action[];
  totalCost: number;
  initialState: TaskState;
  goalState: Partial<TaskState>;
  estimatedDuration?: number;
}
```

## Action Catalog

### Simple Actions (Cost: 1)

**claim_task**
- Preconditions: `task_queued: true`, `task_claimed: false`
- Effects: `task_claimed: true`
- Description: Agent claims ownership of queued task

**create_pr**
- Preconditions: `reviewed: true`, `pr_created: false`
- Effects: `pr_created: true`
- Description: Create pull request for code review

**approve_pr**
- Preconditions: `ci_passing: true`, `approved: false`
- Effects: `approved: true`
- Validation: At least 1 reviewer required

**merge_pr**
- Preconditions: `approved: true`, `merged: false`
- Effects: `merged: true`
- Description: Merge approved PR into main branch

**complete_task**
- Preconditions: `merged: true`, `task_complete: false`
- Effects: `task_complete: true`
- Description: Mark task as complete and cleanup

### Medium Actions (Cost: 2-3)

**resolve_dependencies**
- Preconditions: `task_claimed: true`, `dependencies_resolved: false`
- Effects: `dependencies_resolved: true`
- Cost: 2
- Validation: All dependencies must be satisfied

**spawn_agents**
- Preconditions: `task_claimed: true`, `dependencies_resolved: true`, `agents_spawned: false`
- Effects: `agents_spawned: true`
- Cost: 3
- Description: Create specialized agents for task execution

**run_tests**
- Preconditions: `tests_written: true`, `tests_passing: false`
- Effects: `tests_passing: true`
- Cost: 2
- Validation: Test coverage must be ≥80%

**start_qa**
- Preconditions: `tests_passing: true`, `qa_started: false`
- Effects: `qa_started: true`
- Cost: 2

**complete_qa**
- Preconditions: `qa_started: true`, `qa_complete: false`
- Effects: `qa_complete: true`
- Cost: 3
- Validation: No outstanding QA issues

**review_code**
- Preconditions: `qa_complete: true`, `reviewed: false`
- Effects: `reviewed: true`
- Cost: 3

**run_ci**
- Preconditions: `pr_created: true`, `ci_passing: false`
- Effects: `ci_passing: true`
- Cost: 2

### Complex Actions (Cost: 5-8)

**write_tests**
- Preconditions: `code_implemented: true`, `tests_written: false`
- Effects: `tests_written: true`
- Cost: 5
- Description: Create comprehensive test suite

**implement_code**
- Preconditions: `agents_spawned: true`, `code_implemented: false`
- Effects: `code_implemented: true`
- Cost: 8
- Description: Write the actual implementation code

## Cost Model Rationale

The cost model reflects the relative complexity and time investment of each action:

- **Cost 1**: Simple administrative actions (claim, create PR, approve)
- **Cost 2-3**: Coordination and validation actions (spawn agents, run tests, QA)
- **Cost 5**: Substantial work with clear scope (write tests)
- **Cost 8**: Most complex work requiring creativity and problem-solving (implement code)

## State Validation

### checkPreconditions(action, state)

Validates that all preconditions are satisfied before action execution:

```typescript
function checkPreconditions(action: Action, state: TaskState): boolean {
  // Check all precondition flags match current state
  for (const [key, value] of Object.entries(action.preconditions)) {
    if (state[key] !== value) return false;
  }

  // Run custom validation if provided
  if (action.validate) {
    return action.validate(state);
  }

  return true;
}
```

### applyEffects(action, state)

Creates new state by applying action effects:

```typescript
function applyEffects(action: Action, state: TaskState): TaskState {
  const newState = { ...state };

  for (const [key, value] of Object.entries(action.effects)) {
    newState[key] = value;
  }

  return newState;
}
```

### isGoalAchieved(state, goal)

Checks if current state satisfies goal state:

```typescript
function isGoalAchieved(state: TaskState, goal: Partial<TaskState>): boolean {
  for (const [key, value] of Object.entries(goal)) {
    if (state[key] !== value) return false;
  }
  return true;
}
```

## StateValidator Class

Provides comprehensive validation for states, actions, and plans:

### validateState(state)

Checks for logical consistency in state:
- Code cannot be implemented without agents
- Tests cannot pass without being written
- QA cannot complete without starting
- PR cannot be created without review
- Task cannot complete without merge
- Metadata consistency checks

### validatePlan(plan)

Verifies that a plan is executable:
- All action preconditions are satisfied in sequence
- Effects properly transform state
- Final state achieves goal

### validateAction(action)

Ensures action definitions are complete:
- Has required fields (type, name, cost)
- Cost is positive
- Has preconditions and effects

## Usage Examples

### Creating Initial State

```typescript
import { createInitialState, createGoalState } from './goap/state-model';

const initialState = createInitialState('TASK-001');
const goalState = createGoalState();
```

### Checking Action Applicability

```typescript
import { ACTIONS, checkPreconditions, getApplicableActions } from './goap/state-model';

const currentState = { /* ... */ };
const action = ACTIONS.CLAIM_TASK;

if (checkPreconditions(action, currentState)) {
  console.log('Action can be executed');
}

// Get all applicable actions
const applicable = getApplicableActions(currentState);
```

### Validating State

```typescript
import { StateValidator } from './goap/state-model';

const validation = StateValidator.validateState(currentState);
if (!validation.valid) {
  console.error('State errors:', validation.errors);
}
```

## Integration with Planner

The state model integrates with the GOAP planner through:

1. **State Space Definition**: Provides complete state representation
2. **Action Catalog**: Defines all possible actions
3. **Validation Functions**: Ensures plan correctness
4. **Heuristic Calculation**: Guides A* search algorithm
5. **Effect Application**: Updates state during planning and execution

## Future Extensions

Potential enhancements to the state model:

1. **Dynamic Actions**: Runtime action generation based on context
2. **Probabilistic Effects**: Actions with uncertain outcomes
3. **Resource Constraints**: CPU, memory, token limits
4. **Parallel Actions**: Actions that can execute concurrently
5. **Conditional Effects**: Effects that depend on state conditions
6. **Action Costs**: Dynamic costs based on current load
7. **State History**: Track state transitions for debugging
8. **Rollback Support**: Undo actions on failure

## Best Practices

1. **State Immutability**: Always create new state objects, never mutate
2. **Validation First**: Check preconditions before applying effects
3. **Cost Calibration**: Regularly review and adjust action costs
4. **Comprehensive Testing**: Test all state transitions
5. **Clear Naming**: Use descriptive names for states and actions
6. **Documentation**: Keep action descriptions up to date
7. **Error Handling**: Validate states and plans before execution

## Related Documentation

- [GOAP Planner](./goap-planner.md) - A* planning algorithm
- [Task Orchestration](./task-orchestration.md) - Task execution system
- [Agent Coordination](./agent-coordination.md) - Multi-agent planning

## References

- Original GOAP paper: "Goal-Oriented Action Planning" by Jeff Orkin (2006)
- A* algorithm: Hart, Nilsson, and Raphael (1968)
- Task Sentinel architecture documents
