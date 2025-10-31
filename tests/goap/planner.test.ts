/**
 * A* Planner Tests
 *
 * Comprehensive test suite covering:
 * - Simple action sequences
 * - Complex multi-step planning
 * - Plan cost calculations and optimality
 * - Edge cases and error handling
 */

import {
  generatePlan,
  findOptimalPath,
  validatePlan,
  stateEquals,
  satisfiesGoal,
  getApplicableActions,
  applyAction,
  calculateHeuristic
} from '../../src/goap/planner';
import { WorldState, Action, Plan } from '../../src/goap/types';

describe('A* Planner - Helper Functions', () => {
  describe('stateEquals', () => {
    it('should return true for identical states', () => {
      const state1: WorldState = { hasKey: true, doorOpen: false };
      const state2: WorldState = { hasKey: true, doorOpen: false };
      expect(stateEquals(state1, state2)).toBe(true);
    });

    it('should return true for states with same keys in different order', () => {
      const state1: WorldState = { doorOpen: false, hasKey: true };
      const state2: WorldState = { hasKey: true, doorOpen: false };
      expect(stateEquals(state1, state2)).toBe(true);
    });

    it('should return false for different states', () => {
      const state1: WorldState = { hasKey: true, doorOpen: false };
      const state2: WorldState = { hasKey: false, doorOpen: false };
      expect(stateEquals(state1, state2)).toBe(false);
    });

    it('should return false for states with different number of keys', () => {
      const state1: WorldState = { hasKey: true };
      const state2: WorldState = { hasKey: true, doorOpen: false };
      expect(stateEquals(state1, state2)).toBe(false);
    });
  });

  describe('satisfiesGoal', () => {
    it('should return true when all goal conditions are met', () => {
      const state: WorldState = { hasKey: true, doorOpen: true, treasure: true };
      const goal: WorldState = { doorOpen: true, treasure: true };
      expect(satisfiesGoal(state, goal)).toBe(true);
    });

    it('should return false when goal conditions are not met', () => {
      const state: WorldState = { hasKey: true, doorOpen: false };
      const goal: WorldState = { doorOpen: true };
      expect(satisfiesGoal(state, goal)).toBe(false);
    });

    it('should return true for empty goal', () => {
      const state: WorldState = { hasKey: true };
      const goal: WorldState = {};
      expect(satisfiesGoal(state, goal)).toBe(true);
    });
  });

  describe('getApplicableActions', () => {
    const actions: Action[] = [
      {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      },
      {
        name: 'openDoor',
        preconditions: { hasKey: true, doorOpen: false },
        effects: { doorOpen: true },
        cost: 1
      }
    ];

    it('should return actions with met preconditions', () => {
      const state: WorldState = { hasKey: false, doorOpen: false };
      const applicable = getApplicableActions(state, actions);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].name).toBe('pickupKey');
    });

    it('should return multiple applicable actions', () => {
      const state: WorldState = { hasKey: true, doorOpen: false };
      const applicable = getApplicableActions(state, actions);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].name).toBe('openDoor');
    });

    it('should return empty array when no actions are applicable', () => {
      const state: WorldState = { hasKey: true, doorOpen: true };
      const applicable = getApplicableActions(state, actions);
      expect(applicable).toHaveLength(0);
    });
  });

  describe('applyAction', () => {
    it('should apply action effects to state', () => {
      const state: WorldState = { hasKey: false, doorOpen: false };
      const action: Action = {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      };
      const newState = applyAction(state, action);
      expect(newState.hasKey).toBe(true);
      expect(newState.doorOpen).toBe(false);
    });

    it('should not modify original state', () => {
      const state: WorldState = { hasKey: false };
      const action: Action = {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      };
      applyAction(state, action);
      expect(state.hasKey).toBe(false);
    });

    it('should overwrite existing state properties', () => {
      const state: WorldState = { hasKey: false, doorOpen: false };
      const action: Action = {
        name: 'openDoor',
        preconditions: { hasKey: true },
        effects: { doorOpen: true, hasKey: false },
        cost: 1
      };
      const newState = applyAction(state, action);
      expect(newState.doorOpen).toBe(true);
      expect(newState.hasKey).toBe(false);
    });
  });

  describe('calculateHeuristic', () => {
    it('should return 0 when goal is met', () => {
      const state: WorldState = { hasKey: true, doorOpen: true };
      const goal: WorldState = { doorOpen: true };
      expect(calculateHeuristic(state, goal)).toBe(0);
    });

    it('should count unmet goal conditions', () => {
      const state: WorldState = { hasKey: false, doorOpen: false };
      const goal: WorldState = { hasKey: true, doorOpen: true };
      expect(calculateHeuristic(state, goal)).toBe(2);
    });

    it('should handle partial goal states', () => {
      const state: WorldState = { hasKey: true, doorOpen: false, treasure: false };
      const goal: WorldState = { doorOpen: true };
      expect(calculateHeuristic(state, goal)).toBe(1);
    });
  });
});

describe('A* Planner - Simple Planning', () => {
  it('should return empty plan when already at goal', () => {
    const currentState: WorldState = { hasKey: true };
    const goalState: WorldState = { hasKey: true };
    const actions: Action[] = [];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(0);
    expect(plan!.totalCost).toBe(0);
  });

  it('should find single-action plan', () => {
    const currentState: WorldState = { hasKey: false };
    const goalState: WorldState = { hasKey: true };
    const actions: Action[] = [
      {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(1);
    expect(plan!.actions[0].name).toBe('pickupKey');
    expect(plan!.totalCost).toBe(1);
  });

  it('should find two-action sequential plan', () => {
    const currentState: WorldState = { hasKey: false, doorOpen: false };
    const goalState: WorldState = { doorOpen: true };
    const actions: Action[] = [
      {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      },
      {
        name: 'openDoor',
        preconditions: { hasKey: true, doorOpen: false },
        effects: { doorOpen: true },
        cost: 1
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(2);
    expect(plan!.actions[0].name).toBe('pickupKey');
    expect(plan!.actions[1].name).toBe('openDoor');
    expect(plan!.totalCost).toBe(2);
  });

  it('should return null when no plan exists', () => {
    const currentState: WorldState = { hasKey: false };
    const goalState: WorldState = { doorOpen: true };
    const actions: Action[] = [
      {
        name: 'openDoor',
        preconditions: { hasKey: true, doorOpen: false },
        effects: { doorOpen: true },
        cost: 1
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).toBeNull();
  });
});

describe('A* Planner - Complex Multi-Step Planning', () => {
  it('should find optimal path with multiple choices', () => {
    const currentState: WorldState = {
      hasKey: false,
      doorOpen: false,
      hasWeapon: false,
      enemyDefeated: false
    };
    const goalState: WorldState = {
      doorOpen: true,
      enemyDefeated: true
    };
    const actions: Action[] = [
      {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      },
      {
        name: 'pickupWeapon',
        preconditions: { hasWeapon: false },
        effects: { hasWeapon: true },
        cost: 1
      },
      {
        name: 'openDoor',
        preconditions: { hasKey: true, doorOpen: false },
        effects: { doorOpen: true },
        cost: 1
      },
      {
        name: 'defeatEnemy',
        preconditions: { hasWeapon: true, enemyDefeated: false },
        effects: { enemyDefeated: true },
        cost: 2
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(4);
    expect(plan!.totalCost).toBe(5);

    // Verify the plan achieves the goal
    const validation = validatePlan(plan!, currentState, goalState);
    expect(validation.valid).toBe(true);
  });

  it('should choose cheaper path when multiple paths exist', () => {
    const currentState: WorldState = { atStart: true, atGoal: false };
    const goalState: WorldState = { atGoal: true };
    const actions: Action[] = [
      {
        name: 'expensivePath',
        preconditions: { atStart: true },
        effects: { atGoal: true, atStart: false },
        cost: 10
      },
      {
        name: 'cheapPath1',
        preconditions: { atStart: true },
        effects: { atMiddle: true, atStart: false },
        cost: 2
      },
      {
        name: 'cheapPath2',
        preconditions: { atMiddle: true },
        effects: { atGoal: true, atMiddle: false },
        cost: 2
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.totalCost).toBe(4);
    expect(plan!.actions).toHaveLength(2);
    expect(plan!.actions[0].name).toBe('cheapPath1');
    expect(plan!.actions[1].name).toBe('cheapPath2');
  });

  it('should handle complex resource gathering scenario', () => {
    const currentState: WorldState = {
      hasWood: false,
      hasStone: false,
      hasTool: false,
      canBuild: false
    };
    const goalState: WorldState = {
      canBuild: true
    };
    const actions: Action[] = [
      {
        name: 'gatherWood',
        preconditions: { hasWood: false },
        effects: { hasWood: true },
        cost: 1
      },
      {
        name: 'gatherStone',
        preconditions: { hasStone: false },
        effects: { hasStone: true },
        cost: 1
      },
      {
        name: 'craftTool',
        preconditions: { hasWood: true, hasStone: true, hasTool: false },
        effects: { hasTool: true },
        cost: 2
      },
      {
        name: 'prepareBuilding',
        preconditions: { hasTool: true, canBuild: false },
        effects: { canBuild: true },
        cost: 1
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(4);
    expect(plan!.totalCost).toBe(5);

    // Verify action sequence is valid
    const actionNames = plan!.actions.map(a => a.name);
    expect(actionNames).toContain('gatherWood');
    expect(actionNames).toContain('gatherStone');
    expect(actionNames).toContain('craftTool');
    expect(actionNames).toContain('prepareBuilding');

    // craftTool must come after both gather actions
    const craftIndex = actionNames.indexOf('craftTool');
    const woodIndex = actionNames.indexOf('gatherWood');
    const stoneIndex = actionNames.indexOf('gatherStone');
    expect(craftIndex).toBeGreaterThan(woodIndex);
    expect(craftIndex).toBeGreaterThan(stoneIndex);
  });

  it('should handle branching paths with different costs', () => {
    const currentState: WorldState = {
      location: 'start',
      hasItem: false
    };
    const goalState: WorldState = {
      location: 'goal',
      hasItem: true
    };
    const actions: Action[] = [
      // Path 1: Go to shop, buy item, go to goal (cost: 3)
      {
        name: 'goToShop',
        preconditions: { location: 'start' },
        effects: { location: 'shop' },
        cost: 1
      },
      {
        name: 'buyItem',
        preconditions: { location: 'shop', hasItem: false },
        effects: { hasItem: true },
        cost: 1
      },
      {
        name: 'shopToGoal',
        preconditions: { location: 'shop' },
        effects: { location: 'goal' },
        cost: 1
      },
      // Path 2: Find item, go to goal (cost: 5)
      {
        name: 'findItem',
        preconditions: { location: 'start', hasItem: false },
        effects: { hasItem: true },
        cost: 3
      },
      {
        name: 'startToGoal',
        preconditions: { location: 'start' },
        effects: { location: 'goal' },
        cost: 2
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.totalCost).toBe(3); // Should choose cheaper path
    expect(plan!.actions.map(a => a.name)).toEqual(['goToShop', 'buyItem', 'shopToGoal']);
  });
});

describe('A* Planner - Plan Validation', () => {
  it('should validate a correct plan', () => {
    const initialState: WorldState = { hasKey: false, doorOpen: false };
    const goalState: WorldState = { doorOpen: true };
    const plan: Plan = {
      actions: [
        {
          name: 'pickupKey',
          preconditions: { hasKey: false },
          effects: { hasKey: true },
          cost: 1
        },
        {
          name: 'openDoor',
          preconditions: { hasKey: true, doorOpen: false },
          effects: { doorOpen: true },
          cost: 1
        }
      ],
      totalCost: 2
    };

    const validation = validatePlan(plan, initialState, goalState);
    expect(validation.valid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  it('should reject plan with unmet preconditions', () => {
    const initialState: WorldState = { hasKey: false };
    const goalState: WorldState = { doorOpen: true };
    const plan: Plan = {
      actions: [
        {
          name: 'openDoor',
          preconditions: { hasKey: true, doorOpen: false },
          effects: { doorOpen: true },
          cost: 1
        }
      ],
      totalCost: 1
    };

    const validation = validatePlan(plan, initialState, goalState);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('unmet preconditions');
  });

  it('should reject plan that does not achieve goal', () => {
    const initialState: WorldState = { hasKey: false };
    const goalState: WorldState = { doorOpen: true };
    const plan: Plan = {
      actions: [
        {
          name: 'pickupKey',
          preconditions: { hasKey: false },
          effects: { hasKey: true },
          cost: 1
        }
      ],
      totalCost: 1
    };

    const validation = validatePlan(plan, initialState, goalState);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('does not achieve goal');
  });

  it('should reject plan with incorrect cost', () => {
    const initialState: WorldState = { hasKey: false };
    const goalState: WorldState = { hasKey: true };
    const plan: Plan = {
      actions: [
        {
          name: 'pickupKey',
          preconditions: { hasKey: false },
          effects: { hasKey: true },
          cost: 1
        }
      ],
      totalCost: 5 // Incorrect cost
    };

    const validation = validatePlan(plan, initialState, goalState);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('cost mismatch');
  });
});

describe('A* Planner - Edge Cases', () => {
  it('should handle cycles without infinite loops', () => {
    const currentState: WorldState = { position: 0 };
    const goalState: WorldState = { position: 2 };
    const actions: Action[] = [
      {
        name: 'forward',
        preconditions: {},
        effects: { position: 1 },
        cost: 1
      },
      {
        name: 'backward',
        preconditions: {},
        effects: { position: 0 },
        cost: 1
      }
    ];

    const plan = generatePlan(currentState, goalState, actions, 10);
    // Should return null or timeout without hanging
    expect(plan).toBeNull();
  });

  it('should respect max depth limit', () => {
    const currentState: WorldState = { level: 0 };
    const goalState: WorldState = { level: 100 };
    const actions: Action[] = [
      {
        name: 'increment',
        preconditions: {},
        effects: { level: 1 },
        cost: 1
      }
    ];

    const plan = generatePlan(currentState, goalState, actions, 5);
    expect(plan).toBeNull();
  });

  it('should handle empty action list', () => {
    const currentState: WorldState = { hasKey: false };
    const goalState: WorldState = { hasKey: true };
    const actions: Action[] = [];

    const plan = generatePlan(currentState, goalState, actions);
    expect(plan).toBeNull();
  });

  it('should handle numeric state values', () => {
    const currentState: WorldState = { health: 50, mana: 0 };
    const goalState: WorldState = { mana: 100 };
    const actions: Action[] = [
      {
        name: 'meditate',
        preconditions: { mana: 0 },
        effects: { mana: 100 },
        cost: 5
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);
    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(1);
    expect(plan!.totalCost).toBe(5);
  });

  it('should handle string state values', () => {
    const currentState: WorldState = { mood: 'sad', energy: 'low' };
    const goalState: WorldState = { mood: 'happy' };
    const actions: Action[] = [
      {
        name: 'exercise',
        preconditions: { energy: 'low' },
        effects: { energy: 'high', mood: 'happy' },
        cost: 3
      }
    ];

    const plan = generatePlan(currentState, goalState, actions);
    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(1);
    expect(plan!.totalCost).toBe(3);
  });
});

describe('A* Planner - findOptimalPath', () => {
  it('should return validated optimal plan', () => {
    const currentState: WorldState = { hasKey: false, doorOpen: false };
    const goalState: WorldState = { doorOpen: true };
    const actions: Action[] = [
      {
        name: 'pickupKey',
        preconditions: { hasKey: false },
        effects: { hasKey: true },
        cost: 1
      },
      {
        name: 'openDoor',
        preconditions: { hasKey: true, doorOpen: false },
        effects: { doorOpen: true },
        cost: 1
      }
    ];

    const plan = findOptimalPath(currentState, goalState, actions);

    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(2);
    expect(plan!.totalCost).toBe(2);
  });

  it('should return null for invalid plans', () => {
    const currentState: WorldState = { hasKey: false };
    const goalState: WorldState = { doorOpen: true };
    const actions: Action[] = [];

    const plan = findOptimalPath(currentState, goalState, actions);
    expect(plan).toBeNull();
  });

  it('should handle empty plan validation', () => {
    const currentState: WorldState = { atGoal: true };
    const goalState: WorldState = { atGoal: true };
    const actions: Action[] = [];

    const plan = findOptimalPath(currentState, goalState, actions);
    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(0);
    expect(plan!.totalCost).toBe(0);
  });
});

describe('A* Planner - Performance and Optimality', () => {
  it('should find optimal solution in reasonable time for medium complexity', () => {
    const currentState: WorldState = {
      room: 'start',
      hasRedKey: false,
      hasBlueKey: false,
      redDoorOpen: false,
      blueDoorOpen: false
    };
    const goalState: WorldState = {
      room: 'treasure'
    };
    const actions: Action[] = [
      {
        name: 'pickupRedKey',
        preconditions: { room: 'start', hasRedKey: false },
        effects: { hasRedKey: true },
        cost: 1
      },
      {
        name: 'pickupBlueKey',
        preconditions: { room: 'start', hasBlueKey: false },
        effects: { hasBlueKey: true },
        cost: 1
      },
      {
        name: 'openRedDoor',
        preconditions: { hasRedKey: true, redDoorOpen: false },
        effects: { redDoorOpen: true },
        cost: 1
      },
      {
        name: 'openBlueDoor',
        preconditions: { hasBlueKey: true, blueDoorOpen: false },
        effects: { blueDoorOpen: true },
        cost: 1
      },
      {
        name: 'enterRedRoom',
        preconditions: { room: 'start', redDoorOpen: true },
        effects: { room: 'redRoom' },
        cost: 1
      },
      {
        name: 'enterBlueRoom',
        preconditions: { room: 'redRoom', blueDoorOpen: true },
        effects: { room: 'blueRoom' },
        cost: 1
      },
      {
        name: 'enterTreasure',
        preconditions: { room: 'blueRoom' },
        effects: { room: 'treasure' },
        cost: 1
      }
    ];

    const startTime = Date.now();
    const plan = generatePlan(currentState, goalState, actions);
    const endTime = Date.now();

    expect(plan).not.toBeNull();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    expect(plan!.totalCost).toBe(7); // Optimal path cost

    const validation = validatePlan(plan!, currentState, goalState);
    expect(validation.valid).toBe(true);
  });

  it('should consistently find optimal solutions', () => {
    const currentState: WorldState = { x: 0, y: 0 };
    const goalState: WorldState = { x: 2, y: 2 };
    const actions: Action[] = [
      {
        name: 'moveRight',
        preconditions: { x: 0 },
        effects: { x: 1 },
        cost: 1
      },
      {
        name: 'moveRight2',
        preconditions: { x: 1 },
        effects: { x: 2 },
        cost: 1
      },
      {
        name: 'moveUp',
        preconditions: { y: 0 },
        effects: { y: 1 },
        cost: 1
      },
      {
        name: 'moveUp2',
        preconditions: { y: 1 },
        effects: { y: 2 },
        cost: 1
      }
    ];

    // Run multiple times to ensure consistency
    for (let i = 0; i < 5; i++) {
      const plan = generatePlan(currentState, goalState, actions);
      expect(plan).not.toBeNull();
      expect(plan!.totalCost).toBe(4); // Should always find optimal cost
    }
  });
});
