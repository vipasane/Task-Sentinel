/**
 * A* Planner Demo
 *
 * Demonstrates the GOAP A* planner with practical examples
 */

import {
  generatePlan,
  findOptimalPath,
  validatePlan
} from '../src/goap/planner';
import { WorldState, Action } from '../src/goap/types';

console.log('=== A* GOAP Planner Demo ===\n');

// Example 1: Simple Key and Door Problem
console.log('Example 1: Key and Door');
console.log('------------------------');

const example1Current: WorldState = {
  hasKey: false,
  doorOpen: false
};

const example1Goal: WorldState = {
  doorOpen: true
};

const example1Actions: Action[] = [
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

const plan1 = generatePlan(example1Current, example1Goal, example1Actions);

if (plan1) {
  console.log(`Found plan with ${plan1.actions.length} actions (cost: ${plan1.totalCost}):`);
  plan1.actions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action.name}`);
  });

  const validation = validatePlan(plan1, example1Current, example1Goal);
  console.log(`Plan is ${validation.valid ? 'VALID' : 'INVALID'}`);
} else {
  console.log('No plan found!');
}

// Example 2: Path Optimization
console.log('\nExample 2: Path Optimization');
console.log('----------------------------');

const example2Current: WorldState = {
  atStart: true,
  atGoal: false
};

const example2Goal: WorldState = {
  atGoal: true
};

const example2Actions: Action[] = [
  {
    name: 'expensiveDirect',
    preconditions: { atStart: true },
    effects: { atGoal: true, atStart: false },
    cost: 10
  },
  {
    name: 'cheapToMiddle',
    preconditions: { atStart: true },
    effects: { atMiddle: true, atStart: false },
    cost: 2
  },
  {
    name: 'cheapToGoal',
    preconditions: { atMiddle: true },
    effects: { atGoal: true, atMiddle: false },
    cost: 2
  }
];

const plan2 = generatePlan(example2Current, example2Goal, example2Actions);

if (plan2) {
  console.log(`Found optimal path (cost: ${plan2.totalCost}):`);
  plan2.actions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action.name} (cost: ${action.cost})`);
  });
  console.log(`Saved ${10 - plan2.totalCost} cost by choosing cheaper path!`);
}

// Example 3: Complex Resource Gathering
console.log('\nExample 3: Resource Gathering');
console.log('-----------------------------');

const example3Current: WorldState = {
  hasWood: false,
  hasStone: false,
  hasTool: false,
  canBuild: false
};

const example3Goal: WorldState = {
  canBuild: true
};

const example3Actions: Action[] = [
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

const plan3 = findOptimalPath(example3Current, example3Goal, example3Actions);

if (plan3) {
  console.log(`Found plan with ${plan3.actions.length} steps (cost: ${plan3.totalCost}):`);

  let currentState = { ...example3Current };
  plan3.actions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action.name}`);
    console.log(`     Before: ${JSON.stringify(currentState)}`);
    currentState = { ...currentState, ...action.effects };
    console.log(`     After:  ${JSON.stringify(currentState)}`);
  });
}

// Example 4: RPG Quest System
console.log('\nExample 4: RPG Quest');
console.log('--------------------');

const example4Current: WorldState = {
  location: 'village',
  hasWeapon: false,
  hasArmor: false,
  gold: 100,
  questComplete: false
};

const example4Goal: WorldState = {
  questComplete: true
};

const example4Actions: Action[] = [
  {
    name: 'visitBlacksmith',
    preconditions: { location: 'village' },
    effects: { location: 'blacksmith' },
    cost: 1
  },
  {
    name: 'buyWeapon',
    preconditions: { location: 'blacksmith', hasWeapon: false, gold: 100 },
    effects: { hasWeapon: true, gold: 50 },
    cost: 2
  },
  {
    name: 'returnToVillage',
    preconditions: { location: 'blacksmith' },
    effects: { location: 'village' },
    cost: 1
  },
  {
    name: 'visitArmorer',
    preconditions: { location: 'village' },
    effects: { location: 'armorer' },
    cost: 1
  },
  {
    name: 'buyArmor',
    preconditions: { location: 'armorer', hasArmor: false, gold: 50 },
    effects: { hasArmor: true, gold: 0 },
    cost: 2
  },
  {
    name: 'returnToVillageFromArmorer',
    preconditions: { location: 'armorer' },
    effects: { location: 'village' },
    cost: 1
  },
  {
    name: 'enterDungeon',
    preconditions: { location: 'village' },
    effects: { location: 'dungeon' },
    cost: 2
  },
  {
    name: 'completeQuest',
    preconditions: {
      location: 'dungeon',
      hasWeapon: true,
      hasArmor: true,
      questComplete: false
    },
    effects: { questComplete: true },
    cost: 5
  }
];

const plan4 = generatePlan(example4Current, example4Goal, example4Actions);

if (plan4) {
  console.log(`Quest plan found (cost: ${plan4.totalCost}):`);
  plan4.actions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action.name}`);
  });
}

// Example 5: Task Sentinel Integration
console.log('\nExample 5: Task Sentinel Workflow');
console.log('----------------------------------');

const example5Current: WorldState = {
  taskAnalyzed: false,
  dependenciesResolved: false,
  codeGenerated: false,
  testsWritten: false,
  documented: false,
  taskComplete: false
};

const example5Goal: WorldState = {
  taskComplete: true
};

const example5Actions: Action[] = [
  {
    name: 'analyzeRequirements',
    preconditions: { taskAnalyzed: false },
    effects: { taskAnalyzed: true },
    cost: 2
  },
  {
    name: 'resolveDependencies',
    preconditions: { taskAnalyzed: true, dependenciesResolved: false },
    effects: { dependenciesResolved: true },
    cost: 3
  },
  {
    name: 'generateCode',
    preconditions: { dependenciesResolved: true, codeGenerated: false },
    effects: { codeGenerated: true },
    cost: 5
  },
  {
    name: 'writeTests',
    preconditions: { codeGenerated: true, testsWritten: false },
    effects: { testsWritten: true },
    cost: 3
  },
  {
    name: 'writeDocumentation',
    preconditions: { codeGenerated: true, documented: false },
    effects: { documented: true },
    cost: 2
  },
  {
    name: 'completeTask',
    preconditions: {
      testsWritten: true,
      codeGenerated: true,
      documented: true,
      taskComplete: false
    },
    effects: { taskComplete: true },
    cost: 1
  }
];

const plan5 = generatePlan(example5Current, example5Goal, example5Actions);

if (plan5) {
  console.log(`Task workflow plan (cost: ${plan5.totalCost}):`);
  plan5.actions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action.name} (cost: ${action.cost})`);
  });

  console.log(`\nTotal estimated effort: ${plan5.totalCost} units`);
}

// Performance Test
console.log('\n=== Performance Test ===');
console.log('Testing complex scenario with multiple paths...');

const perfStart = Date.now();
const perfCurrent: WorldState = {
  room: 'start',
  hasRedKey: false,
  hasBlueKey: false,
  hasGreenKey: false,
  redDoorOpen: false,
  blueDoorOpen: false,
  greenDoorOpen: false
};

const perfGoal: WorldState = {
  room: 'treasure'
};

const perfActions: Action[] = [
  { name: 'getRedKey', preconditions: { hasRedKey: false }, effects: { hasRedKey: true }, cost: 1 },
  { name: 'getBlueKey', preconditions: { hasBlueKey: false }, effects: { hasBlueKey: true }, cost: 1 },
  { name: 'getGreenKey', preconditions: { hasGreenKey: false }, effects: { hasGreenKey: true }, cost: 1 },
  { name: 'openRedDoor', preconditions: { hasRedKey: true, redDoorOpen: false }, effects: { redDoorOpen: true }, cost: 1 },
  { name: 'openBlueDoor', preconditions: { hasBlueKey: true, blueDoorOpen: false }, effects: { blueDoorOpen: true }, cost: 1 },
  { name: 'openGreenDoor', preconditions: { hasGreenKey: true, greenDoorOpen: false }, effects: { greenDoorOpen: true }, cost: 1 },
  { name: 'enterRedRoom', preconditions: { room: 'start', redDoorOpen: true }, effects: { room: 'redRoom' }, cost: 1 },
  { name: 'enterBlueRoom', preconditions: { room: 'redRoom', blueDoorOpen: true }, effects: { room: 'blueRoom' }, cost: 1 },
  { name: 'enterGreenRoom', preconditions: { room: 'blueRoom', greenDoorOpen: true }, effects: { room: 'greenRoom' }, cost: 1 },
  { name: 'enterTreasure', preconditions: { room: 'greenRoom' }, effects: { room: 'treasure' }, cost: 1 }
];

const perfPlan = generatePlan(perfCurrent, perfGoal, perfActions);
const perfEnd = Date.now();

if (perfPlan) {
  console.log(`Plan found in ${perfEnd - perfStart}ms`);
  console.log(`Steps: ${perfPlan.actions.length}, Cost: ${perfPlan.totalCost}`);
  console.log(`Actions: ${perfPlan.actions.map(a => a.name).join(' → ')}`);
} else {
  console.log('No plan found');
}

console.log('\n=== Demo Complete ===');
