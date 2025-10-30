/**
 * Task Sentinel GOAP State Model
 *
 * This module defines the complete state space for task orchestration,
 * including all possible task states, actions, preconditions, and effects.
 */

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * Enumeration of all possible states in the task lifecycle
 */
export enum TaskStateType {
  TASK_CREATED = 'task_created',
  TASK_QUEUED = 'task_queued',
  TASK_CLAIMED = 'task_claimed',
  DEPENDENCIES_RESOLVED = 'dependencies_resolved',
  AGENTS_SPAWNED = 'agents_spawned',
  CODE_IMPLEMENTED = 'code_implemented',
  TESTS_WRITTEN = 'tests_written',
  TESTS_PASSING = 'tests_passing',
  QA_STARTED = 'qa_started',
  QA_COMPLETE = 'qa_complete',
  REVIEWED = 'reviewed',
  PR_CREATED = 'pr_created',
  CI_PASSING = 'ci_passing',
  APPROVED = 'approved',
  MERGED = 'merged',
  TASK_COMPLETE = 'task_complete'
}

/**
 * Enumeration of all available actions
 */
export enum ActionType {
  CLAIM_TASK = 'claim_task',
  RESOLVE_DEPENDENCIES = 'resolve_dependencies',
  SPAWN_AGENTS = 'spawn_agents',
  IMPLEMENT_CODE = 'implement_code',
  WRITE_TESTS = 'write_tests',
  RUN_TESTS = 'run_tests',
  START_QA = 'start_qa',
  COMPLETE_QA = 'complete_qa',
  REVIEW_CODE = 'review_code',
  CREATE_PR = 'create_pr',
  RUN_CI = 'run_ci',
  APPROVE_PR = 'approve_pr',
  MERGE_PR = 'merge_pr',
  COMPLETE_TASK = 'complete_task'
}

/**
 * Represents the complete state of a task in the system
 */
export interface TaskState {
  /** Current state flags */
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

  /** Additional metadata */
  taskId?: string;
  assignedAgent?: string;
  dependencyCount?: number;
  testCoverage?: number;
  qaIssuesCount?: number;
  reviewerCount?: number;
}

/**
 * Represents preconditions that must be satisfied for an action
 */
export type Preconditions = Partial<TaskState>;

/**
 * Represents effects that an action will have on the state
 */
export type Effects = Partial<TaskState>;

/**
 * Defines an action with its preconditions, effects, and cost
 */
export interface Action {
  /** Unique identifier for the action */
  type: ActionType;

  /** Human-readable name */
  name: string;

  /** Description of what the action does */
  description: string;

  /** Conditions that must be true before action can execute */
  preconditions: Preconditions;

  /** Changes to state after action executes */
  effects: Effects;

  /** Cost of executing this action (used for optimization) */
  cost: number;

  /** Optional validation function */
  validate?: (state: TaskState) => boolean;

  /** Optional execution handler */
  execute?: (state: TaskState) => Promise<TaskState>;
}

/**
 * Represents a sequence of actions to achieve a goal
 */
export interface Plan {
  /** Ordered sequence of actions */
  actions: Action[];

  /** Total cost of the plan */
  totalCost: number;

  /** Starting state */
  initialState: TaskState;

  /** Desired goal state */
  goalState: Partial<TaskState>;

  /** Estimated time to completion */
  estimatedDuration?: number;
}

/**
 * Result of plan execution
 */
export interface PlanExecutionResult {
  success: boolean;
  finalState: TaskState;
  executedActions: ActionType[];
  failedAction?: ActionType;
  error?: string;
}

// ============================================================================
// Action Definitions
// ============================================================================

/**
 * Complete catalog of all actions with their preconditions, effects, and costs
 */
export const ACTIONS: Record<ActionType, Action> = {
  [ActionType.CLAIM_TASK]: {
    type: ActionType.CLAIM_TASK,
    name: 'Claim Task',
    description: 'Agent claims ownership of a queued task',
    preconditions: {
      task_queued: true,
      task_claimed: false
    },
    effects: {
      task_claimed: true
    },
    cost: 1
  },

  [ActionType.RESOLVE_DEPENDENCIES]: {
    type: ActionType.RESOLVE_DEPENDENCIES,
    name: 'Resolve Dependencies',
    description: 'Ensure all task dependencies are satisfied',
    preconditions: {
      task_claimed: true,
      dependencies_resolved: false
    },
    effects: {
      dependencies_resolved: true
    },
    cost: 2,
    validate: (state: TaskState) => {
      return (state.dependencyCount ?? 0) >= 0;
    }
  },

  [ActionType.SPAWN_AGENTS]: {
    type: ActionType.SPAWN_AGENTS,
    name: 'Spawn Agents',
    description: 'Create specialized agents for task execution',
    preconditions: {
      task_claimed: true,
      dependencies_resolved: true,
      agents_spawned: false
    },
    effects: {
      agents_spawned: true
    },
    cost: 3
  },

  [ActionType.IMPLEMENT_CODE]: {
    type: ActionType.IMPLEMENT_CODE,
    name: 'Implement Code',
    description: 'Write the actual implementation code',
    preconditions: {
      agents_spawned: true,
      code_implemented: false
    },
    effects: {
      code_implemented: true
    },
    cost: 8
  },

  [ActionType.WRITE_TESTS]: {
    type: ActionType.WRITE_TESTS,
    name: 'Write Tests',
    description: 'Create test cases for the implementation',
    preconditions: {
      code_implemented: true,
      tests_written: false
    },
    effects: {
      tests_written: true
    },
    cost: 5
  },

  [ActionType.RUN_TESTS]: {
    type: ActionType.RUN_TESTS,
    name: 'Run Tests',
    description: 'Execute test suite and validate results',
    preconditions: {
      tests_written: true,
      tests_passing: false
    },
    effects: {
      tests_passing: true
    },
    cost: 2,
    validate: (state: TaskState) => {
      return (state.testCoverage ?? 0) >= 80;
    }
  },

  [ActionType.START_QA]: {
    type: ActionType.START_QA,
    name: 'Start QA',
    description: 'Begin quality assurance review',
    preconditions: {
      tests_passing: true,
      qa_started: false
    },
    effects: {
      qa_started: true
    },
    cost: 2
  },

  [ActionType.COMPLETE_QA]: {
    type: ActionType.COMPLETE_QA,
    name: 'Complete QA',
    description: 'Finish quality assurance and document findings',
    preconditions: {
      qa_started: true,
      qa_complete: false
    },
    effects: {
      qa_complete: true
    },
    cost: 3,
    validate: (state: TaskState) => {
      return (state.qaIssuesCount ?? 0) === 0;
    }
  },

  [ActionType.REVIEW_CODE]: {
    type: ActionType.REVIEW_CODE,
    name: 'Review Code',
    description: 'Conduct code review for quality and standards',
    preconditions: {
      qa_complete: true,
      reviewed: false
    },
    effects: {
      reviewed: true
    },
    cost: 3
  },

  [ActionType.CREATE_PR]: {
    type: ActionType.CREATE_PR,
    name: 'Create Pull Request',
    description: 'Open a pull request for code review',
    preconditions: {
      reviewed: true,
      pr_created: false
    },
    effects: {
      pr_created: true
    },
    cost: 1
  },

  [ActionType.RUN_CI]: {
    type: ActionType.RUN_CI,
    name: 'Run CI Pipeline',
    description: 'Execute continuous integration checks',
    preconditions: {
      pr_created: true,
      ci_passing: false
    },
    effects: {
      ci_passing: true
    },
    cost: 2
  },

  [ActionType.APPROVE_PR]: {
    type: ActionType.APPROVE_PR,
    name: 'Approve Pull Request',
    description: 'Approve PR after successful review',
    preconditions: {
      ci_passing: true,
      approved: false
    },
    effects: {
      approved: true
    },
    cost: 1,
    validate: (state: TaskState) => {
      return (state.reviewerCount ?? 0) >= 1;
    }
  },

  [ActionType.MERGE_PR]: {
    type: ActionType.MERGE_PR,
    name: 'Merge Pull Request',
    description: 'Merge approved PR into main branch',
    preconditions: {
      approved: true,
      merged: false
    },
    effects: {
      merged: true
    },
    cost: 1
  },

  [ActionType.COMPLETE_TASK]: {
    type: ActionType.COMPLETE_TASK,
    name: 'Complete Task',
    description: 'Mark task as complete and cleanup',
    preconditions: {
      merged: true,
      task_complete: false
    },
    effects: {
      task_complete: true
    },
    cost: 1
  }
};

// ============================================================================
// State Utilities
// ============================================================================

/**
 * Creates a default initial state for a new task
 */
export function createInitialState(taskId: string): TaskState {
  return {
    task_created: true,
    task_queued: true,
    task_claimed: false,
    dependencies_resolved: false,
    agents_spawned: false,
    code_implemented: false,
    tests_written: false,
    tests_passing: false,
    qa_started: false,
    qa_complete: false,
    reviewed: false,
    pr_created: false,
    ci_passing: false,
    approved: false,
    merged: false,
    task_complete: false,
    taskId,
    dependencyCount: 0,
    testCoverage: 0,
    qaIssuesCount: 0,
    reviewerCount: 0
  };
}

/**
 * Creates a goal state for task completion
 */
export function createGoalState(): Partial<TaskState> {
  return {
    task_complete: true,
    merged: true,
    ci_passing: true,
    tests_passing: true
  };
}

// ============================================================================
// State Validation
// ============================================================================

/**
 * Validates if preconditions are satisfied in the current state
 */
export function checkPreconditions(
  action: Action,
  state: TaskState
): boolean {
  for (const [key, value] of Object.entries(action.preconditions)) {
    const stateKey = key as keyof TaskState;
    if (state[stateKey] !== value) {
      return false;
    }
  }

  // Run custom validation if provided
  if (action.validate) {
    return action.validate(state);
  }

  return true;
}

/**
 * Applies the effects of an action to create a new state
 */
export function applyEffects(action: Action, state: TaskState): TaskState {
  const newState = { ...state };

  for (const [key, value] of Object.entries(action.effects)) {
    const stateKey = key as keyof TaskState;
    (newState[stateKey] as any) = value;
  }

  return newState;
}

/**
 * Checks if the current state satisfies the goal state
 */
export function isGoalAchieved(
  state: TaskState,
  goal: Partial<TaskState>
): boolean {
  for (const [key, value] of Object.entries(goal)) {
    const stateKey = key as keyof TaskState;
    if (state[stateKey] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates the heuristic distance from current state to goal
 * Used by A* search algorithm for planning
 */
export function calculateHeuristic(
  state: TaskState,
  goal: Partial<TaskState>
): number {
  let distance = 0;

  for (const [key, value] of Object.entries(goal)) {
    const stateKey = key as keyof TaskState;
    if (state[stateKey] !== value) {
      distance++;
    }
  }

  return distance;
}

/**
 * Gets all actions that can be executed in the current state
 */
export function getApplicableActions(state: TaskState): Action[] {
  return Object.values(ACTIONS).filter(action =>
    checkPreconditions(action, state)
  );
}

// ============================================================================
// State Validator Class
// ============================================================================

/**
 * Comprehensive state validation and consistency checking
 */
export class StateValidator {
  /**
   * Validates that a state is internally consistent
   */
  static validateState(state: TaskState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check logical progression
    if (state.code_implemented && !state.agents_spawned) {
      errors.push('Code cannot be implemented without spawning agents');
    }

    if (state.tests_passing && !state.tests_written) {
      errors.push('Tests cannot pass without being written');
    }

    if (state.qa_complete && !state.qa_started) {
      errors.push('QA cannot be complete without being started');
    }

    if (state.pr_created && !state.reviewed) {
      errors.push('PR cannot be created without code review');
    }

    if (state.merged && !state.approved) {
      errors.push('PR cannot be merged without approval');
    }

    if (state.task_complete && !state.merged) {
      errors.push('Task cannot be complete without merging PR');
    }

    // Check metadata consistency
    if (state.task_claimed && !state.assignedAgent) {
      errors.push('Claimed task must have an assigned agent');
    }

    if (state.tests_passing && (state.testCoverage ?? 0) < 80) {
      errors.push('Test coverage must be at least 80% for passing tests');
    }

    if (state.qa_complete && (state.qaIssuesCount ?? 1) > 0) {
      errors.push('QA cannot be complete with unresolved issues');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a complete plan for consistency
   */
  static validatePlan(plan: Plan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let currentState = { ...plan.initialState };

    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];

      // Check if action is applicable
      if (!checkPreconditions(action, currentState)) {
        errors.push(
          `Action ${i + 1} (${action.name}) preconditions not satisfied`
        );
      }

      // Apply effects for next iteration
      currentState = applyEffects(action, currentState);
    }

    // Check if goal is achieved
    if (!isGoalAchieved(currentState, plan.goalState)) {
      errors.push('Plan does not achieve the goal state');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates an action definition for completeness
   */
  static validateAction(action: Action): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!action.type) {
      errors.push('Action must have a type');
    }

    if (!action.name) {
      errors.push('Action must have a name');
    }

    if (action.cost <= 0) {
      errors.push('Action cost must be positive');
    }

    if (Object.keys(action.preconditions).length === 0) {
      errors.push('Action must have at least one precondition');
    }

    if (Object.keys(action.effects).length === 0) {
      errors.push('Action must have at least one effect');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  ACTIONS,
  TaskStateType,
  ActionType,
  createInitialState,
  createGoalState,
  checkPreconditions,
  applyEffects,
  isGoalAchieved,
  calculateHeuristic,
  getApplicableActions,
  StateValidator
};
