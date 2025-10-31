# Task Sentinel - Usage Examples

## Table of Contents
1. [Basic Task Workflow](#basic-task-workflow)
2. [Distributed Task Execution](#distributed-task-execution)
3. [OODA Loop Example](#ooda-loop-example)
4. [GOAP Planning Example](#goap-planning-example)
5. [Error Handling & Recovery](#error-handling--recovery)

---

## Basic Task Workflow

### Creating a New Task

```bash
# Create a high-priority bug fix task
/task-create --title "Fix authentication timeout issue" \
             --description "Users experiencing 30s timeout on login" \
             --priority 5000 \
             --labels "bug,authentication,high-priority"

# GitHub Issue created: #42
# Status: queued
```

### Claiming and Executing a Task

```bash
# Claim task #42
/task-claim --issue 42

# Task Sentinel automatically:
# 1. Assigns issue to current worker
# 2. Changes label from "status:queued" to "status:claimed"
# 3. Stores distributed lock in MCP memory
# 4. Starts OODA loop execution
```

**Automated OODA Loop Phases:**

```yaml
OBSERVE:
  - Reads GitHub issue description
  - Analyzes acceptance criteria
  - Gathers codebase context
  - Reviews related PRs

ORIENT:
  - goal-planner creates execution plan
  - Identifies required agents
  - Selects coordination topology
  - Defines success metrics

DECIDE:
  - Allocates resources
  - Initializes swarm (mesh topology)
  - Updates GitHub label to "status:in-progress"
  - Starts heartbeat monitoring

ACT:
  - Spawns 4 agents concurrently:
    * backend-dev: Implement auth timeout fix
    * tester: Create regression tests
    * reviewer: Code quality check
    * coder: Update documentation
```

### Checking Task Status

```bash
# Check current task status
/task-status

# Output:
# ✅ Task #42 - In Progress
# Phase: ACT
# Agents: 4 active (backend-dev, tester, reviewer, coder)
# Progress: 65%
# Next Milestone: Complete testing
# Heartbeat: Active (last: 15s ago)
```

### Completing a Task

```bash
# Complete task with PR evidence
/task-complete --issue 42 --pr 123

# Task Sentinel:
# 1. Runs code-review-swarm QA
# 2. Collects test evidence
# 3. Updates GitHub issue
# 4. Links PR #123
# 5. Changes label to "status:completed"
# 6. Releases distributed lock
```

---

## Distributed Task Execution

### Multi-Worker Coordination

```typescript
// Worker 1 (claims task)
import { LockManager, HeartbeatMonitor } from './src/distributed';

const lockManager = new LockManager({
  githubRepo: 'org/repo',
  workerId: 'worker-1',
  nodeId: 'node-1-us-east'
});

// Attempt to acquire lock
const locked = await lockManager.acquireLock(42, {
  strategy: 'RETRY',
  maxRetries: 5
});

if (locked) {
  // Start heartbeat
  const heartbeat = new HeartbeatMonitor('worker-1', 'org/repo');
  await heartbeat.start();

  // Execute task
  await executeTask(42);

  // Clean up
  await heartbeat.stop();
  await lockManager.releaseLock(42);
}
```

```typescript
// Worker 2 (detects stale lock)
const worker2 = new LockManager({
  githubRepo: 'org/repo',
  workerId: 'worker-2',
  nodeId: 'node-2-us-west'
});

// Worker 1's heartbeat stops (process crash)
// After 5 minutes of no heartbeat:

const staleLock = await worker2.detectStaleLock(42);
if (staleLock) {
  // Automatically releases stale lock
  await worker2.recoverStaleLock(42);

  // Worker 2 can now claim
  const claimed = await worker2.acquireLock(42);
  // ✅ Success - lock transferred
}
```

### Conflict Resolution Strategies

```typescript
// Strategy 1: RETRY with exponential backoff
await lockManager.acquireLock(42, {
  strategy: 'RETRY',
  maxRetries: 5  // 1s, 2s, 4s, 8s, 16s
});

// Strategy 2: FAIL_FAST
await lockManager.acquireLock(42, {
  strategy: 'FAIL_FAST'  // Returns immediately if locked
});

// Strategy 3: STEAL_STALE
await lockManager.acquireLock(42, {
  strategy: 'STEAL_STALE',  // Takes stale locks immediately
  staleThreshold: 300000    // 5 minutes
});
```

---

## OODA Loop Example

### Continuous Task Monitoring

```typescript
import { OODALoop } from './src/ooda';

const ooda = new OODALoop({
  cycleInterval: 30000,  // 30 seconds
  githubRepo: 'org/repo'
});

// Start continuous monitoring
await ooda.start();

// Cycle 1:
// OBSERVE -> Detected task #42 (priority: 5000)
// ORIENT  -> Created plan: claim → implement → test → qa
// DECIDE  -> Selected: mesh topology, 4 agents
// ACT     -> Claimed task #42, spawned agents

// Cycle 2 (30s later):
// OBSERVE -> Task #42 in progress, task #43 ready
// ORIENT  -> Adaptive replan: continue #42, queue #43
// DECIDE  -> Maintain current allocation
// ACT     -> Monitor progress

// Cycle 3 (failure detected):
// OBSERVE -> Task #42 tests failing
// ORIENT  -> Replan: add debugging agent
// DECIDE  -> Spawn additional reviewer
// ACT     -> Deploy fix strategy
```

### Adaptive Replanning

```typescript
// Initial plan fails
const initialPlan = {
  goal: 'complete_task',
  actions: ['implement', 'test', 'merge']
};

// Replanner detects failure
const replanner = new GOAPReplanner();

const newPlan = await replanner.replan({
  currentState: {
    implemented: true,
    tests_passing: false,  // ❌ Failure
    merged: false
  },
  failedAction: 'test',
  failureReason: 'Integration test timeout',
  goalState: {
    tests_passing: true,
    merged: true
  }
});

// New adaptive plan:
// 1. debug_timeout (new action)
// 2. increase_timeout_config
// 3. rerun_tests
// 4. merge
```

---

## GOAP Planning Example

### State-Based Task Planning

```typescript
import { GOAPPlanner, GOAPState } from './src/planning';

const planner = new GOAPPlanner();

// Define current state
const currentState: GOAPState = {
  task_claimed: false,
  codebase_analyzed: false,
  design_created: false,
  code_implemented: false,
  tests_written: false,
  tests_passing: false,
  pr_created: false,
  qa_approved: false,
  merged: false
};

// Define goal state
const goalState: GOAPState = {
  task_claimed: true,
  codebase_analyzed: true,
  design_created: true,
  code_implemented: true,
  tests_written: true,
  tests_passing: true,
  pr_created: true,
  qa_approved: true,
  merged: true
};

// Available actions with preconditions and effects
const actions = [
  {
    name: 'claim_task',
    cost: 1,
    preconditions: {},
    effects: { task_claimed: true }
  },
  {
    name: 'analyze_codebase',
    cost: 2,
    preconditions: { task_claimed: true },
    effects: { codebase_analyzed: true }
  },
  {
    name: 'create_design',
    cost: 3,
    preconditions: { codebase_analyzed: true },
    effects: { design_created: true }
  },
  {
    name: 'implement',
    cost: 5,
    preconditions: { design_created: true },
    effects: { code_implemented: true }
  },
  {
    name: 'write_tests',
    cost: 3,
    preconditions: { code_implemented: true },
    effects: { tests_written: true }
  },
  {
    name: 'run_tests',
    cost: 1,
    preconditions: { tests_written: true },
    effects: { tests_passing: true }
  },
  {
    name: 'create_pr',
    cost: 1,
    preconditions: { tests_passing: true },
    effects: { pr_created: true }
  },
  {
    name: 'qa_review',
    cost: 4,
    preconditions: { pr_created: true },
    effects: { qa_approved: true }
  },
  {
    name: 'merge',
    cost: 1,
    preconditions: { qa_approved: true },
    effects: { merged: true }
  }
];

// Generate optimal plan using A* search
const plan = await planner.plan(currentState, goalState, actions);

console.log('Optimal Plan:');
plan.actions.forEach((action, index) => {
  console.log(`${index + 1}. ${action.name} (cost: ${action.cost})`);
});

// Output:
// Optimal Plan:
// 1. claim_task (cost: 1)
// 2. analyze_codebase (cost: 2)
// 3. create_design (cost: 3)
// 4. implement (cost: 5)
// 5. write_tests (cost: 3)
// 6. run_tests (cost: 1)
// 7. create_pr (cost: 1)
// 8. qa_review (cost: 4)
// 9. merge (cost: 1)
// Total Cost: 21
```

---

## Error Handling & Recovery

### Heartbeat Failure Recovery

```bash
# Heartbeat fails to start
npx claude-flow@alpha hooks heartbeat-start --task-id "42" --interval 60

# Automatic retry:
# ❌ Heartbeat failed to start, retrying...
# [2s delay]
# ✅ Heartbeat monitoring active

# If retry fails:
# ❌ Heartbeat startup failed after retry
# GitHub Issue #42 → status:error
# Comment added: "⚠️ Heartbeat Monitor Failed - Manual intervention required"
```

### Lock Acquisition Retry

```typescript
const result = await lockManager.acquireLock(42, {
  strategy: 'RETRY',
  maxRetries: 5
});

// Automatic exponential backoff:
// Attempt 1: immediate
// Attempt 2: 1s delay
// Attempt 3: 2s delay
// Attempt 4: 4s delay
// Attempt 5: 8s delay
// Attempt 6: 16s delay

if (!result.success) {
  console.error('Failed after 5 retries:', result.reason);
  // Fallback: queue task for later
  await queueForRetry(42);
}
```

### Signal Handler Graceful Shutdown

```typescript
// Process receives SIGTERM
// Signal handlers automatically:
// 1. Stop all heartbeat timers
// 2. Send final heartbeat with status='unhealthy'
// 3. Release all distributed locks
// 4. Flush pending memory writes
// 5. Clean up worker registry
// 6. Exit gracefully

// Example: Worker shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, shutting down gracefully...');

  // Automatic cleanup handled by signal handlers in:
  // - LockManager
  // - HeartbeatMonitor
  // - MemorySyncManager
  // - WorkerRegistry

  console.log('[Worker] Shutdown complete');
  process.exit(0);
});
```

### Memory Synchronization Conflict Resolution

```typescript
import { MemorySyncManager, ConflictResolvers } from './src/distributed';

const memorySync = new MemorySyncManager({
  workerId: 'worker-1',
  conflictResolver: ConflictResolvers.lastWriteWins
});

// Concurrent writes from multiple workers
await memorySync.write('task/42/status', { status: 'testing' });

// Conflict detected!
// Vector clocks show concurrent writes:
// Worker 1: { w1: 5, w2: 3 }
// Worker 2: { w1: 4, w2: 4 }

// Automatic resolution:
const resolved = memorySync.resolveConflict([entry1, entry2]);
// Uses last-write-wins strategy (highest timestamp)
console.log('Resolved value:', resolved.value);
```

---

## Complete Workflow Example

```typescript
// Complete end-to-end task execution
async function executeTaskSentinel(issueNumber: number) {
  // 1. Initialize components
  const lockManager = new LockManager({
    githubRepo: 'org/task-sentinel',
    workerId: 'worker-1'
  });

  const heartbeat = new HeartbeatMonitor('worker-1', 'org/task-sentinel');

  try {
    // 2. Acquire distributed lock
    const locked = await lockManager.acquireLock(issueNumber, {
      strategy: 'RETRY',
      maxRetries: 5
    });

    if (!locked.success) {
      throw new Error(`Failed to acquire lock: ${locked.reason}`);
    }

    // 3. Start heartbeat monitoring
    await heartbeat.start();

    // 4. Execute OODA loop
    const ooda = new OODALoop();

    // OBSERVE
    const observations = await ooda.observe(issueNumber);

    // ORIENT
    const plan = await ooda.orient(observations);

    // DECIDE
    const resources = await ooda.decide(plan);

    // ACT
    const result = await ooda.act(resources);

    if (!result.success) {
      // Adaptive replanning
      const newPlan = await ooda.replan(result.error);
      await ooda.act(newPlan);
    }

    // 5. Complete task
    await completeTask(issueNumber, result);

  } catch (error) {
    console.error('Task execution failed:', error);
    await handleFailure(issueNumber, error);
  } finally {
    // 6. Cleanup
    await heartbeat.stop();
    await lockManager.releaseLock(issueNumber);
  }
}

// Run
await executeTaskSentinel(42);
```

---

## Next Steps

- See [Setup Instructions](setup_instructions.md) for installation
- Read [Distributed Locking Guide](distributed-locking.md) for advanced coordination
- Review [Implementation Plan](task_sentinel_implementation_plan.md) for architecture details
- Check [Code Quality Summary](CODE_QUALITY_SUMMARY.md) for current status

---

*Task Sentinel - Intelligent Distributed Task Orchestration* 🚀
