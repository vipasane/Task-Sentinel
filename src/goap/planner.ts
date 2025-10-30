/**
 * A* Pathfinding Algorithm for GOAP Planning
 *
 * Finds the optimal sequence of actions to transform current state to goal state
 * using A* search with an admissible heuristic.
 */

import { WorldState, Action, Plan, PlannerNode } from './types';

/**
 * Priority Queue implementation for A* open set
 * Maintains nodes sorted by f-score (lowest first)
 */
class PriorityQueue {
  private nodes: PlannerNode[] = [];

  enqueue(node: PlannerNode): void {
    this.nodes.push(node);
    this.nodes.sort((a, b) => a.fScore - b.fScore);
  }

  dequeue(): PlannerNode | undefined {
    return this.nodes.shift();
  }

  isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  contains(state: WorldState): boolean {
    return this.nodes.some(node => stateEquals(node.state, state));
  }

  remove(state: WorldState): void {
    this.nodes = this.nodes.filter(node => !stateEquals(node.state, state));
  }

  size(): number {
    return this.nodes.length;
  }
}

/**
 * Check if two world states are equal
 */
export function stateEquals(state1: WorldState, state2: WorldState): boolean {
  const keys1 = Object.keys(state1).sort();
  const keys2 = Object.keys(state2).sort();

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every(key => state1[key] === state2[key]);
}

/**
 * Check if a state satisfies goal conditions
 * Goal state can be a partial state (only specifies required conditions)
 */
export function satisfiesGoal(state: WorldState, goal: WorldState): boolean {
  return Object.entries(goal).every(([key, value]) => state[key] === value);
}

/**
 * Get actions that can be applied in the current state
 */
export function getApplicableActions(state: WorldState, actions: Action[]): Action[] {
  return actions.filter(action => {
    return Object.entries(action.preconditions).every(
      ([key, value]) => state[key] === value
    );
  });
}

/**
 * Apply an action to a state, creating a new state
 */
export function applyAction(state: WorldState, action: Action): WorldState {
  return {
    ...state,
    ...action.effects
  };
}

/**
 * Calculate heuristic cost estimate from state to goal
 * Uses number of unmet goal conditions as an admissible heuristic
 *
 * This heuristic is admissible because:
 * - It never overestimates (each action changes at least one condition)
 * - It's optimistic (assumes each action can fix exactly one unmet condition)
 */
export function calculateHeuristic(state: WorldState, goal: WorldState): number {
  let unmeetConditions = 0;

  for (const [key, value] of Object.entries(goal)) {
    if (state[key] !== value) {
      unmeetConditions++;
    }
  }

  return unmeetConditions;
}

/**
 * Reconstruct the path from start to goal
 */
function reconstructPath(node: PlannerNode): Action[] {
  const path: Action[] = [];
  let current: PlannerNode | null = node;

  while (current && current.action) {
    path.unshift(current.action);
    current = current.parent;
  }

  return path;
}

/**
 * Generate a state hash for memoization
 */
function hashState(state: WorldState): string {
  return JSON.stringify(
    Object.keys(state)
      .sort()
      .reduce((acc, key) => {
        acc[key] = state[key];
        return acc;
      }, {} as WorldState)
  );
}

/**
 * Main A* planner
 *
 * @param currentState Starting world state
 * @param goalState Desired world state (can be partial)
 * @param actions Available actions
 * @param maxDepth Maximum search depth to prevent infinite loops
 * @returns Plan with action sequence and total cost, or null if no plan found
 */
export function generatePlan(
  currentState: WorldState,
  goalState: WorldState,
  actions: Action[],
  maxDepth: number = 50
): Plan | null {
  // Early termination if already at goal
  if (satisfiesGoal(currentState, goalState)) {
    return { actions: [], totalCost: 0 };
  }

  // Initialize A* data structures
  const openSet = new PriorityQueue();
  const closedSet = new Set<string>();
  const stateCache = new Map<string, PlannerNode>();

  // Create start node
  const startNode: PlannerNode = {
    state: currentState,
    action: null,
    parent: null,
    gScore: 0,
    hScore: calculateHeuristic(currentState, goalState),
    fScore: calculateHeuristic(currentState, goalState)
  };

  openSet.enqueue(startNode);
  stateCache.set(hashState(currentState), startNode);

  let iterations = 0;
  const maxIterations = maxDepth * actions.length;

  // A* main loop
  while (!openSet.isEmpty() && iterations < maxIterations) {
    iterations++;

    const current = openSet.dequeue()!;
    const currentHash = hashState(current.state);

    // Goal check
    if (satisfiesGoal(current.state, goalState)) {
      const planActions = reconstructPath(current);
      return {
        actions: planActions,
        totalCost: current.gScore
      };
    }

    closedSet.add(currentHash);

    // Check depth limit
    let depth = 0;
    let node: PlannerNode | null = current;
    while (node.parent) {
      depth++;
      node = node.parent;
    }
    if (depth >= maxDepth) {
      continue;
    }

    // Expand neighbors
    const applicableActions = getApplicableActions(current.state, actions);

    for (const action of applicableActions) {
      const newState = applyAction(current.state, action);
      const newStateHash = hashState(newState);

      // Skip if already evaluated
      if (closedSet.has(newStateHash)) {
        continue;
      }

      const gScore = current.gScore + action.cost;
      const hScore = calculateHeuristic(newState, goalState);
      const fScore = gScore + hScore;

      // Check if we've seen this state before
      const existingNode = stateCache.get(newStateHash);

      if (existingNode) {
        // Found a better path to this state
        if (gScore < existingNode.gScore) {
          existingNode.gScore = gScore;
          existingNode.fScore = fScore;
          existingNode.parent = current;
          existingNode.action = action;

          // Re-add to open set with new priority
          openSet.remove(existingNode.state);
          openSet.enqueue(existingNode);
        }
      } else {
        // New state
        const neighbor: PlannerNode = {
          state: newState,
          action,
          parent: current,
          gScore,
          hScore,
          fScore
        };

        openSet.enqueue(neighbor);
        stateCache.set(newStateHash, neighbor);
      }
    }
  }

  // No plan found
  return null;
}

/**
 * Validate that a plan is executable and achieves the goal
 */
export function validatePlan(
  plan: Plan,
  initialState: WorldState,
  goalState: WorldState
): { valid: boolean; error?: string } {
  if (plan.actions.length === 0) {
    if (satisfiesGoal(initialState, goalState)) {
      return { valid: true };
    }
    return { valid: false, error: 'Empty plan does not achieve goal' };
  }

  let currentState = { ...initialState };
  let totalCost = 0;

  for (let i = 0; i < plan.actions.length; i++) {
    const action = plan.actions[i];

    // Check preconditions
    const preconditionsMet = Object.entries(action.preconditions).every(
      ([key, value]) => currentState[key] === value
    );

    if (!preconditionsMet) {
      return {
        valid: false,
        error: `Action "${action.name}" at step ${i} has unmet preconditions`
      };
    }

    // Apply action
    currentState = applyAction(currentState, action);
    totalCost += action.cost;
  }

  // Check goal achievement
  if (!satisfiesGoal(currentState, goalState)) {
    return { valid: false, error: 'Plan does not achieve goal state' };
  }

  // Check cost calculation
  if (totalCost !== plan.totalCost) {
    return {
      valid: false,
      error: `Plan cost mismatch: expected ${plan.totalCost}, got ${totalCost}`
    };
  }

  return { valid: true };
}

/**
 * Find optimal path using A* algorithm
 * This is an alias for generatePlan with additional validation
 */
export function findOptimalPath(
  currentState: WorldState,
  goalState: WorldState,
  actions: Action[],
  maxDepth?: number
): Plan | null {
  const plan = generatePlan(currentState, goalState, actions, maxDepth);

  if (plan) {
    const validation = validatePlan(plan, currentState, goalState);
    if (!validation.valid) {
      console.error('Generated invalid plan:', validation.error);
      return null;
    }
  }

  return plan;
}
