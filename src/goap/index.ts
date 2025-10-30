/**
 * GOAP Module Entry Point
 *
 * Goal-Oriented Action Planning system for Task Sentinel
 */

export {
  // Types
  TaskState,
  TaskStateType,
  Action,
  ActionType,
  Preconditions,
  Effects,
  Plan,
  PlanExecutionResult,

  // Actions catalog
  ACTIONS,

  // State utilities
  createInitialState,
  createGoalState,

  // Validation functions
  checkPreconditions,
  applyEffects,
  isGoalAchieved,
  calculateHeuristic,
  getApplicableActions,

  // Validator class
  StateValidator
} from './state-model';

// Export A* planner types and functions
export {
  WorldState,
  PlannerNode
} from './types';

export {
  generatePlan,
  findOptimalPath,
  validatePlan,
  stateEquals,
  satisfiesGoal,
  applyAction
} from './planner';
