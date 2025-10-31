/**
 * GOAP (Goal-Oriented Action Planning) Type Definitions
 */

export interface WorldState {
  [key: string]: boolean | number | string;
}

export interface Action {
  name: string;
  preconditions: WorldState;
  effects: WorldState;
  cost: number;
}

export interface Plan {
  actions: Action[];
  totalCost: number;
}

export interface PlannerNode {
  state: WorldState;
  action: Action | null;
  parent: PlannerNode | null;
  gScore: number; // Actual cost from start
  hScore: number; // Estimated cost to goal
  fScore: number; // g + h
}
