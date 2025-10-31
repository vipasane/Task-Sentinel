---
name: "Task Sentinel"
description: "GitHub-based distributed task orchestration with OODA loop, GOAP planning, and swarm intelligence. Automate task discovery, intelligent planning, distributed execution, quality assurance, and evidence collection using 54 existing agents."
---

# Task Sentinel

## What This Skill Does

Task Sentinel is a production-ready distributed task orchestration system that transforms GitHub Issues into an intelligent, self-organizing task execution platform. It combines:

- **OODA Loop** (Observe, Orient, Decide, Act) for continuous adaptive execution
- **GOAP Planning** (Goal-Oriented Action Planning) for intelligent task decomposition
- **Distributed Locking** via GitHub issue assignment for parallel execution
- **Swarm Intelligence** using 54 existing Claude Code agents
- **Quality Assurance** with automated testing and code review
- **Evidence Collection** for complete task traceability

**Use Task Sentinel when you need to:**
- Automate feature development from GitHub Issues
- Execute multiple tasks in parallel across workers
- Ensure quality with automated QA gates
- Track progress with complete evidence trails
- Scale development with intelligent agent coordination
- Implement systematic TDD workflows

## Prerequisites

- **Claude Code** (latest version)
- **Claude Flow** v2.7.26+ (`npx claude-flow@alpha`)
- **GitHub CLI** (`gh`) configured with authentication
- **Node.js** 18+
- **Git** with repository access
- **Optional**: Flow-Nexus for cloud features

### Setup

```bash
# Install Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Optional: Advanced coordination
claude mcp add ruv-swarm npx ruv-swarm mcp start
claude mcp add flow-nexus npx flow-nexus@latest mcp start

# Configure GitHub CLI
gh auth login

# Verify setup
npx claude-flow sparc modes
gh issue list
```

## Quick Start

### Create a Task

```bash
# Using slash command
/task-create \
  --title "Implement user authentication" \
  --priority 5000 \
  --description "Add OAuth2 authentication with JWT tokens"

# Directly via GitHub
gh issue create \
  --title "Implement user authentication" \
  --label "task,priority:5000,status:queued" \
  --body "Add OAuth2 authentication with JWT tokens"
```

### Claim and Execute Task

```bash
# Automatic (via hooks - runs every 30s)
# System monitors for ready tasks and auto-claims

# Manual
/task-claim --issue 42

# This will:
# 1. Acquire distributed lock (GitHub assignment)
# 2. Analyze with GOAP planning
# 3. Spawn execution swarm
# 4. Monitor with heartbeat (every 5 minutes)
# 5. Run quality assurance
# 6. Collect evidence
# 7. Create pull request
```

### Monitor Progress

```bash
# Check all tasks
/task-status

# Check specific task
/task-status --issue 42

# Check worker status
/task-status --worker

# Via GitHub
gh issue view 42
```

## OODA Loop: Continuous Adaptive Execution

Task Sentinel implements a continuous OODA loop for intelligent task execution:

```
┌─────────────┐
│  OBSERVE    │  Monitor GitHub Issues, agent status, execution progress
│             │  Hooks: task-observe (every 30s)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ORIENT     │  Analyze task complexity, load GOAP context, assess resources
│             │  Agents: goal-planner, adaptive-coordinator
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DECIDE     │  Select agents, allocate resources, plan execution strategy
│             │  Agents: queen-coordinator, collective-intelligence-coordinator
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ACT        │  Claim task, spawn agents, execute plan, monitor progress
│             │  Claude Code Task tool + MCP coordination
└──────┬──────┘
       │
       └──────► REPLAN on failure/blockage (return to ORIENT)
```

### 1. OBSERVE Phase

**Continuous Monitoring:**
```javascript
// Automated via hooks (every 30 seconds)
// .claude/settings.json configuration:
{
  "hooks": {
    "custom": {
      "task-observe": {
        "trigger": "interval",
        "interval": 30000,
        "command": "npx claude-flow hook task-observe --check-ready --update-memory"
      }
    }
  }
}
```

**What Gets Observed:**
- GitHub Issues with label `task` and status `queued`
- Current agent assignments and availability
- Task dependencies and blockers
- Worker node health and capacity
- Quality gate status
- Stale locks (tasks held > 10 minutes without heartbeat)

**Manual Observation:**
```bash
# Check for ready tasks
gh issue list \
  --label "task,status:queued" \
  --json number,title,labels,createdAt

# Check agent status
mcp__claude-flow__agent_metrics { agentId: "all" }

# Check memory state
mcp__claude-flow__memory_usage {
  action: "retrieve",
  key: "task-sentinel/tasks/ready"
}
```

### 2. ORIENT Phase

**Analyze and Plan:**
```javascript
// Use GOAP planning with goal-planner agent
[Single Message]:
  Task("goal-planner", `
    Analyze task #42: Implement user authentication

    Current State:
    - task_claimed: false
    - dependencies_resolved: true
    - code_implemented: false
    - tests_passing: false
    - qa_complete: false

    Goal State:
    - task_complete: true
    - tests_passing: true
    - qa_complete: true
    - merged: true

    Available Actions:
    - claim_task (cost: 1)
    - implement_feature (cost: 5)
    - write_tests (cost: 3)
    - run_qa (cost: 4)
    - create_pr (cost: 2)
    - merge_pr (cost: 1)

    Generate optimal action plan with preconditions and effects.
  `, "goal-planner")

  // Load historical context
  mcp__claude-flow__memory_usage {
    action: "retrieve",
    key: "task-sentinel/context/42",
    namespace: "coordination"
  }
```

**Analysis Outputs:**
- Task complexity assessment (1-10 scale)
- Required agent types and capabilities
- Estimated execution time
- Dependency chain resolution
- Resource allocation plan
- Quality requirements

### 3. DECIDE Phase

**Make Execution Decisions:**
```javascript
// Decision logic based on analysis
const decision = {
  canProceed: true,
  topology: "star",           // mesh, hierarchical, star, adaptive
  maxAgents: 5,
  assignedWorker: "worker-local-1",
  selectedAgents: ["coder", "tester", "reviewer"],
  executionStrategy: "adaptive",  // parallel, sequential, adaptive
  qualityGates: ["test-coverage-85", "security-scan", "code-review"],
  estimatedTime: 1800  // 30 minutes
};

// Store decision for audit trail
mcp__claude-flow__memory_usage {
  action: "store",
  key: "task-sentinel/decisions/42",
  value: JSON.stringify(decision),
  ttl: 86400  // 24 hours
}
```

**Decision Criteria:**
- IF dependencies resolved AND agents available → CLAIM
- IF complexity > 7 → DECOMPOSE into subtasks
- IF QA requirements unclear → REQUEST clarification
- IF resource constraints → QUEUE for later
- IF previous failure → REPLAN with different strategy

**Agent Selection:**
```javascript
// Use adaptive coordinator for optimal agent selection
Task("adaptive-coordinator", `
  Task complexity: 8/10
  Required capabilities: backend, testing, security

  Select optimal agents and topology from 54 available agents.
  Consider: task history, agent performance, current load
`, "adaptive-coordinator")
```

### 4. ACT Phase

**Execute the Plan:**
```javascript
// Complete execution in single message (golden rule)
[Single Message]:
  // 1. Acquire distributed lock
  Bash(`gh issue edit 42 --add-assignee "@me"`)
  Bash(`gh issue comment 42 --body "
🔒 **LOCK ACQUIRED**
- Worker: worker-local-1
- Started: $(date -u +'%Y-%m-%dT%H:%M:%SZ')
- Plan: 5 steps, estimated 30 minutes"`)

  // 2. Initialize swarm coordination (optional for complex tasks)
  mcp__claude-flow__swarm_init { topology: "star", maxAgents: 5 }

  // 3. Spawn execution agents via Claude Code Task tool
  Task("goal-planner", "Create detailed implementation plan", "goal-planner")
  Task("coder", "Implement OAuth2 authentication with JWT", "coder")
  Task("tester", "Create comprehensive test suite (target: 90% coverage)", "tester")
  Task("code-review-swarm", "Review code quality and security", "code-review-swarm")

  // 4. Track progress with todos
  TodoWrite { todos: [
    {content: "Claim task", status: "completed", activeForm: "Task claimed"},
    {content: "Plan implementation", status: "in_progress", activeForm: "Planning implementation"},
    {content: "Implement OAuth2", status: "pending", activeForm: "Implementing OAuth2"},
    {content: "Write tests", status: "pending", activeForm: "Writing tests"},
    {content: "Run QA", status: "pending", activeForm: "Running QA"},
    {content: "Create PR", status: "pending", activeForm: "Creating PR"},
    {content: "Collect evidence", status: "pending", activeForm: "Collecting evidence"}
  ]}

  // 5. Memory coordination
  mcp__claude-flow__memory_usage {
    action: "store",
    key: "task/42/execution",
    value: JSON.stringify({
      started: Date.now(),
      worker: "worker-local-1",
      agents: ["goal-planner", "coder", "tester", "code-review-swarm"],
      plan: decision
    }),
    namespace: "task-sentinel"
  }
```

**Heartbeat Monitoring:**
```javascript
// Automated via hooks (every 5 minutes)
// Keeps lock alive and updates progress
{
  "hooks": {
    "custom": {
      "task-heartbeat": {
        "trigger": "interval",
        "interval": 300000,
        "command": "npx claude-flow hook task-heartbeat --issue 42 --worker worker-local-1"
      }
    }
  }
}

// Heartbeat updates GitHub comment:
// 💓 Heartbeat: 2024-10-30T14:35:22Z - Implementation 60% complete
```

### OODA Replanning

**Adaptive Replanning on Failure:**
```javascript
// When execution fails or blocks
[Single Message]:
  // 1. OBSERVE: Detect failure
  const failureState = await checkExecutionStatus();

  // 2. ORIENT: Re-analyze with new information
  Task("goal-planner", `
    Task #42 failed at step: ${failureState.failedStep}
    Error: ${failureState.error}

    Current State: ${JSON.stringify(failureState.current)}
    Goal State: ${JSON.stringify(goalState)}

    Generate alternative action plan.
  `, "goal-planner")

  // 3. DECIDE: New strategy
  const newStrategy = {
    approach: "decompose",  // Break into smaller subtasks
    agents: ["backend-dev", "tester"],  // Different agent types
    topology: "hierarchical"  // Different coordination pattern
  };

  // 4. ACT: Execute new plan
  Task("backend-dev", "Implement auth with alternative approach", "backend-dev")
  Task("tester", "Create focused unit tests", "tester")

  // Update memory
  mcp__claude-flow__memory_usage {
    action: "store",
    key: "task/42/replan",
    value: JSON.stringify({ iteration: 2, reason: "initial_failure", newStrategy })
  }
```

## GOAP Integration: Intelligent Planning

Task Sentinel uses Goal-Oriented Action Planning for systematic task execution.

### State Model

```typescript
interface TaskState {
  // Current State
  task_claimed: boolean;
  dependencies_resolved: boolean;
  plan_created: boolean;
  code_implemented: boolean;
  tests_written: boolean;
  tests_passing: boolean;
  qa_complete: boolean;
  pr_created: boolean;
  pr_approved: boolean;
  merged: boolean;
}
```

### Available Actions

```yaml
# GOAP Action Definitions

claim_task:
  preconditions:
    - dependencies_resolved: true
    - no_blocking_issues: true
  effects:
    - task_claimed: true
    - heartbeat_started: true
  cost: 1

create_plan:
  preconditions:
    - task_claimed: true
  effects:
    - plan_created: true
  cost: 2

implement_feature:
  preconditions:
    - plan_created: true
  effects:
    - code_implemented: true
  cost: 5

write_tests:
  preconditions:
    - code_implemented: true
  effects:
    - tests_written: true
  cost: 3

run_tests:
  preconditions:
    - tests_written: true
  effects:
    - tests_passing: true
  cost: 2

run_qa:
  preconditions:
    - tests_passing: true
  effects:
    - qa_complete: true
  cost: 4

create_pr:
  preconditions:
    - qa_complete: true
  effects:
    - pr_created: true
  cost: 2

merge_pr:
  preconditions:
    - pr_created: true
    - pr_approved: true
  effects:
    - merged: true
    - task_complete: true
  cost: 1
```

### GOAP Planning Example

```javascript
// Use goal-planner for A* search
Task("goal-planner", `
  Task: Implement dark mode feature

  Current State: {
    task_claimed: false,
    dependencies_resolved: true,
    code_implemented: false,
    tests_passing: false,
    merged: false
  }

  Goal State: {
    task_claimed: true,
    code_implemented: true,
    tests_passing: true,
    qa_complete: true,
    merged: true
  }

  Available Actions: [claim_task, create_plan, implement_feature, write_tests, run_tests, run_qa, create_pr, merge_pr]

  Generate optimal action plan with A* search.
  Minimize total cost while satisfying all preconditions.
`, "goal-planner")

// Returns optimal plan:
// 1. claim_task (cost: 1)
// 2. create_plan (cost: 2)
// 3. implement_feature (cost: 5)
// 4. write_tests (cost: 3)
// 5. run_tests (cost: 2)
// 6. run_qa (cost: 4)
// 7. create_pr (cost: 2)
// 8. merge_pr (cost: 1)
// Total cost: 20
```

### SPARC + GOAP Synergy

```javascript
// Use code-goal-planner for SPARC-based decomposition
Task("code-goal-planner", `
  Feature: Payment processing system
  Complexity: 9/10

  Use SPARC methodology:
  - Specification: Define requirements
  - Pseudocode: Algorithm design
  - Architecture: System design
  - Refinement: TDD implementation
  - Completion: Integration

  Break into milestones with GOAP preconditions and effects.
`, "code-goal-planner")

// Returns structured plan with subtasks
```

## Task Lifecycle

### Complete Task Flow

```
┌─────────────────┐
│  1. CREATE      │  User/System creates GitHub Issue with labels
│  /task-create   │  Labels: task, priority:XXXX, status:queued
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. OBSERVE     │  Hook monitors issues every 30s
│  (Automated)    │  Identifies ready tasks (no dependencies)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. ORIENT      │  GOAP planning with goal-planner
│  (Automated)    │  Analyze complexity, select agents, estimate cost
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. DECIDE      │  Resource allocation, agent selection
│  (Automated)    │  Determine topology and execution strategy
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. CLAIM       │  Acquire distributed lock (GitHub assignment)
│  gh assign      │  Start heartbeat monitoring
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. EXECUTE     │  Spawn agents via Claude Code Task tool
│  Task(...) x N  │  Parallel execution with swarm coordination
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  7. QA          │  Automated quality assurance
│  /task-qa       │  Tests, coverage, security, performance
└────────┬────────┘
         │
         ├─ FAIL ──► REPLAN (return to ORIENT)
         │
         ▼ PASS
┌─────────────────┐
│  8. PR          │  Create pull request with evidence
│  gh pr create   │  Link to issue, include QA reports
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  9. COMPLETE    │  Collect evidence, release lock
│  /task-complete │  Update GitHub, store metrics
└─────────────────┘
```

## Agent Coordination Patterns

### Pattern 1: Simple Task (Star Topology)

**Use Case:** Straightforward feature implementation
**Agents:** 3-4

```javascript
[Single Message]:
  // Initialize star topology (centralized coordinator)
  mcp__claude-flow__swarm_init { topology: "star", maxAgents: 4 }

  // Spawn agents
  Task("code-goal-planner", "Create implementation plan", "code-goal-planner")
  Task("coder", "Implement feature", "coder")
  Task("tester", "Write comprehensive tests", "tester")
  Task("reviewer", "Review code quality", "reviewer")

  // Coordinator tracks progress
  mcp__claude-flow__task_orchestrate {
    task: "Simple feature implementation",
    strategy: "sequential"
  }
```

### Pattern 2: Complex Task (Hierarchical Topology)

**Use Case:** Large feature requiring decomposition
**Agents:** 6-10

```javascript
[Single Message]:
  // Initialize hierarchical topology (queen-worker)
  mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 10 }

  // Spawn queen and specialized workers
  Task("queen-coordinator", "Coordinate overall implementation", "queen-coordinator")
  Task("goal-planner", "Decompose into subtasks", "goal-planner")
  Task("backend-dev", "Build API endpoints", "backend-dev")
  Task("mobile-dev", "Create mobile UI", "mobile-dev")
  Task("system-architect", "Design system architecture", "system-architect")
  Task("tester", "Integration tests", "tester")
  Task("tester", "E2E tests", "tester")
  Task("code-review-swarm", "Comprehensive review", "code-review-swarm")

  mcp__claude-flow__task_orchestrate {
    task: "Complex feature with subtask management",
    strategy: "adaptive"
  }
```

### Pattern 3: Parallel Tasks (Mesh Topology)

**Use Case:** Multiple independent tasks
**Agents:** Multiple swarms

```javascript
// Each worker processes one task independently
for (const task of readyTasks.slice(0, 3)) {
  [Single Message]:
    // Each task gets its own mesh swarm
    mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 5 }

    Bash(`gh issue edit ${task.number} --add-assignee "@me"`)

    Task("goal-planner", `Plan task ${task.number}`, "goal-planner")
    Task("coder", `Implement task ${task.number}`, "coder")
    Task("tester", `Test task ${task.number}`, "tester")
    Task("reviewer", `Review task ${task.number}`, "reviewer")

    mcp__claude-flow__memory_usage {
      action: "store",
      key: `task/${task.number}/swarm`,
      value: JSON.stringify({ worker: WORKER_ID, started: Date.now() })
    }
}
```

### Pattern 4: Adaptive Refinement (QA Loop)

**Use Case:** Task failed QA, needs fixes
**Agents:** 3-5

```javascript
let iteration = 0;
const MAX_ITERATIONS = 5;

while (iteration < MAX_ITERATIONS) {
  // Run QA
  [Single Message]:
    Task("code-review-swarm", "Comprehensive QA review", "code-review-swarm")

    Bash(`cd agentic-qe && npm run test:comprehensive -- \
      --target ../src \
      --coverage-threshold 85`)

  const qaResult = checkQAResults();

  if (qaResult.passed) break;

  // REPLAN: Fix issues
  [Single Message]:
    Task("goal-planner", `Analyze failures: ${qaResult.failures}`, "goal-planner")
    Task("coder", `Fix issues: ${qaResult.failures}`, "coder")
    Task("tester", "Verify fixes", "tester")

  iteration++;
}
```

## Distributed Locking

### Lock Acquisition

```bash
# Atomic operation via GitHub assignment
gh issue edit 42 --add-assignee "@me"

# Add lock metadata
gh issue comment 42 --body "
🔒 **LOCK ACQUIRED**
- Worker: worker-local-1
- Node: node-001
- Time: $(date -u +'%Y-%m-%dT%H:%M:%SZ')
- PID: $$
- Estimated: 30 minutes
"
```

### Heartbeat Monitoring

```javascript
// Automated hook (every 5 minutes)
{
  "hooks": {
    "custom": {
      "task-heartbeat": {
        "trigger": "interval",
        "interval": 300000,
        "command": "npx claude-flow hook task-heartbeat --issue ${TASK_ISSUE} --worker ${WORKER_ID}"
      }
    }
  }
}

// Heartbeat updates GitHub:
// 💓 Heartbeat: 2024-10-30T14:35:22Z
// Progress: Implementation 60% complete (3/5 steps)
// Next: Write tests (estimated 10 minutes)
```

### Stale Lock Detection

```javascript
// Automated cleanup (every 1 minute)
{
  "hooks": {
    "custom": {
      "stale-lock-check": {
        "trigger": "interval",
        "interval": 60000,
        "command": "./scripts/stale-lock-checker.sh --threshold 600"
      }
    }
  }
}

// Removes locks older than 10 minutes without heartbeat
// Posts warning comment and unassigns
```

### Lock Release

```bash
# Manual release
gh issue edit 42 --remove-assignee "@me"

# Automated release on completion
/task-complete --issue 42 --pr 123
```

## Quality Assurance

### Automated QA Workflow

```javascript
[Single Message]:
  // 1. Code review swarm
  Task("code-review-swarm", `
    Review task #42 changes:
    - Code quality (complexity, duplication)
    - Security vulnerabilities
    - Performance issues
    - Test coverage (target: 85%)
    - Documentation completeness
  `, "code-review-swarm")

  // 2. Automated testing (optional: external agentic-qe)
  Bash(`cd agentic-qe && npm run test:comprehensive -- \
    --target ../src \
    --output ../qa-reports/42.json \
    --coverage-threshold 85 \
    --quality-gates security,performance`)

  // 3. Security scanning
  Bash(`npm audit --json > security-scan-42.json`)

  // 4. Performance benchmarking
  Bash(`npm run benchmark -- --output benchmarks-42.json`)
```

### Quality Gates

```javascript
const qualityGates = {
  testCoverage: { threshold: 85, actual: 89, passed: true },
  security: { criticalVulns: 0, passed: true },
  performance: { p95Latency: 180, threshold: 200, passed: true },
  codeQuality: { complexity: 15, threshold: 20, passed: true },
  documentation: { coverage: 100, passed: true }
};

// All gates must pass before PR creation
if (Object.values(qualityGates).every(g => g.passed)) {
  // Create PR
  Bash(`gh pr create --title "feat: Task #42" --body "Closes #42"`);
}
```

### Evidence Collection

```javascript
// Upload evidence to GitHub releases
Bash(`gh release create task-42-evidence \
  --title "Task #42 Evidence" \
  --notes "Quality assurance evidence for task #42"`)

Bash(`gh release upload task-42-evidence \
  qa-reports/42.json \
  coverage/42.html \
  security-scan-42.json \
  benchmarks-42.json`)

// Link evidence in GitHub comment
Bash(`gh issue comment 42 --body "
## 📋 Task Completion Evidence

### Quality Assurance Results
- ✅ Test Coverage: 89% (target: 85%)
  [Coverage Report](https://github.com/\$OWNER/\$REPO/releases/download/task-42-evidence/42.html)

### Security Scan
- ✅ No critical vulnerabilities
  [Security Report](https://github.com/\$OWNER/\$REPO/releases/download/task-42-evidence/security-scan-42.json)

### Performance Benchmarks
- ✅ p95 latency: 180ms (target: <200ms)
  [Benchmark Results](https://github.com/\$OWNER/\$REPO/releases/download/task-42-evidence/benchmarks-42.json)

### Code Review
- ✅ All checks passed
  [Review Summary](https://github.com/\$OWNER/\$REPO/releases/download/task-42-evidence/qa-reports-42.json)

---
All quality gates passed ✅
PR: #123
Completed: $(date -u +'%Y-%m-%dT%H:%M:%SZ')
"`)
```

## Hooks Integration

### Pre-Task Hooks

```json
{
  "hooks": {
    "custom": {
      "pre-task-claim": {
        "trigger": "on-task-claim",
        "command": "npx claude-flow hook pre-task-claim --issue ${TASK_ISSUE} --validate-dependencies"
      },
      "task-observe": {
        "trigger": "interval",
        "interval": 30000,
        "command": "npx claude-flow hook task-observe --check-ready --update-memory"
      }
    }
  }
}
```

### Post-Task Hooks

```json
{
  "hooks": {
    "custom": {
      "post-task-complete": {
        "trigger": "on-task-complete",
        "command": "npx claude-flow hook post-task-complete --issue ${TASK_ISSUE} --collect-evidence --run-qa"
      },
      "post-task-edit": {
        "trigger": "on-file-edit",
        "command": "npx claude-flow hook post-edit --file ${FILE} --memory-key task/${TASK_ISSUE}/files"
      }
    }
  }
}
```

### Session Hooks

```json
{
  "hooks": {
    "custom": {
      "session-restore": {
        "trigger": "on-session-start",
        "command": "npx claude-flow hook session-restore --session-id task-sentinel-main"
      },
      "memory-sync": {
        "trigger": "interval",
        "interval": 60000,
        "command": "npx claude-flow hook memory-sync --namespace task-sentinel"
      }
    }
  }
}
```

## Available Commands

### Slash Commands

**`/task-create`** - Create new task in GitHub Issues
```bash
/task-create \
  --title "Feature title" \
  --description "Detailed description" \
  --priority 5000 \
  --goals "goal1,goal2,goal3" \
  --limitations "limit1,limit2"
```

**`/task-claim`** - Claim task and start execution
```bash
/task-claim --issue 42
```

**`/task-status`** - Show task and worker status
```bash
/task-status              # All tasks
/task-status --worker     # This worker only
/task-status --issue 42   # Specific task
```

**`/task-qa`** - Run quality assurance
```bash
/task-qa --issue 42 --strict
```

**`/task-complete`** - Mark task complete with evidence
```bash
/task-complete --issue 42 --pr 123 --evidence "url1,url2"
```

**`/task-monitor`** - Real-time task monitoring
```bash
/task-monitor              # Monitor all tasks
/task-monitor --issue 42   # Monitor specific task
```

### CLI Commands

```bash
# Task management
npx claude-flow task create --title "..." --priority 5000
npx claude-flow task claim 42
npx claude-flow task status 42
npx claude-flow task complete 42 --pr 123

# Worker management
npx claude-flow worker start
npx claude-flow worker status
npx claude-flow worker stop

# Monitoring
npx claude-flow monitor tasks
npx claude-flow monitor workers
npx claude-flow monitor swarms
```

## Best Practices

### 1. Task Creation

- Use clear, specific titles
- Include acceptance criteria
- Set appropriate priority (0-10000, lower = higher priority)
- Add relevant labels (feature, bug, enhancement)
- Define dependencies explicitly
- Estimate complexity (1-10 scale)

```bash
gh issue create \
  --title "Implement user authentication with OAuth2" \
  --label "task,feature,priority:5000,complexity:7" \
  --body "
## Goals
- [ ] OAuth2 integration
- [ ] JWT token management
- [ ] User session handling

## Acceptance Criteria
- Users can login via OAuth2 providers
- Sessions persist across browser restarts
- Tokens refresh automatically

## Dependencies
- None

## Estimated Complexity: 7/10
"
```

### 2. Agent Selection

- Use `adaptive-coordinator` for automatic selection
- Match agent specialization to task requirements
- Consider agent history and success rates
- Balance load across available agents
- Use swarms for complex tasks

```javascript
// Let system select optimal agents
Task("adaptive-coordinator", `
  Task: ${task.title}
  Complexity: ${task.complexity}
  Requirements: ${task.requirements}

  Select optimal agents from 54 available.
  Consider: specialization, availability, historical performance
`, "adaptive-coordinator")
```

### 3. Quality Assurance

- Always run QA before PR creation
- Set coverage threshold (recommended: 85%+)
- Include security scanning
- Run performance benchmarks
- Collect and link evidence
- Use iterative refinement for failures

```bash
# Comprehensive QA
/task-qa --issue 42 \
  --coverage-threshold 85 \
  --security-scan \
  --performance-benchmark \
  --collect-evidence
```

### 4. Memory Management

- Use namespaces for organization
- Set TTL for temporary data
- Clean up completed task data
- Use memory for cross-worker coordination
- Cache frequently accessed data

```javascript
// Store with TTL
mcp__claude-flow__memory_usage {
  action: "store",
  key: "task/42/state",
  value: JSON.stringify(state),
  namespace: "task-sentinel",
  ttl: 86400  // 24 hours
}
```

### 5. Parallel Execution

- Limit parallel tasks per worker (recommended: 3)
- Monitor worker capacity
- Use mesh topology for independent tasks
- Ensure proper lock management
- Track metrics for optimization

```javascript
// Process top 3 priority tasks in parallel
const maxParallel = 3;
const tasks = readyTasks.slice(0, maxParallel);

for (const task of tasks) {
  // Each task gets independent execution
  [Single Message]: /* ... */
}
```

### 6. Error Handling

- Enable adaptive replanning
- Set maximum retry attempts (recommended: 3)
- Log failures to memory
- Update GitHub with error details
- Escalate complex failures

```javascript
const MAX_RETRIES = 3;
let retries = 0;

while (retries < MAX_RETRIES) {
  try {
    await executeTask(task);
    break;
  } catch (error) {
    retries++;

    // Store failure
    mcp__claude-flow__memory_usage {
      action: "store",
      key: `task/${task.number}/failure/${retries}`,
      value: JSON.stringify({ error, timestamp: Date.now() })
    };

    // Replan with different strategy
    if (retries < MAX_RETRIES) {
      await replanTask(task, error);
    } else {
      // Escalate
      await escalateTask(task, error);
    }
  }
}
```

### 7. Monitoring

- Enable heartbeat hooks (every 5 minutes)
- Monitor stale locks (every 1 minute)
- Track execution metrics
- Use GitHub comments for visibility
- Set up alerts for failures

```javascript
// Comprehensive monitoring
{
  "hooks": {
    "custom": {
      "task-heartbeat": { "interval": 300000 },
      "stale-lock-check": { "interval": 60000 },
      "metrics-collection": { "interval": 600000 }
    }
  }
}
```

## Troubleshooting

### Issue: Tasks not being auto-claimed

**Symptoms:**
- Tasks remain in `status:queued`
- No worker assignments

**Solutions:**
1. Check hooks are enabled:
   ```bash
   # Verify in .claude/settings.json
   "hooks": { "enabled": true }
   ```

2. Check observe hook:
   ```bash
   npx claude-flow hook test task-observe --check-ready
   ```

3. Check worker status:
   ```bash
   /task-status --worker
   ```

4. Verify GitHub CLI authentication:
   ```bash
   gh auth status
   ```

### Issue: Stale locks not cleaning up

**Symptoms:**
- Tasks stuck with old assignments
- Workers can't claim ready tasks

**Solutions:**
1. Manual cleanup:
   ```bash
   gh issue edit 42 --remove-assignee "@me"
   ```

2. Enable stale lock hook:
   ```json
   {
     "hooks": {
       "custom": {
         "stale-lock-check": {
           "trigger": "interval",
           "interval": 60000,
           "command": "./scripts/stale-lock-checker.sh --threshold 600"
         }
       }
     }
   }
   ```

3. Adjust threshold (default: 10 minutes):
   ```bash
   ./scripts/stale-lock-checker.sh --threshold 300  # 5 minutes
   ```

### Issue: QA always failing

**Symptoms:**
- Tasks blocked at QA phase
- Evidence shows consistent failures

**Solutions:**
1. Check quality gates:
   ```bash
   /task-qa --issue 42 --debug
   ```

2. Lower thresholds temporarily:
   ```bash
   /task-qa --issue 42 --coverage-threshold 70
   ```

3. Review QA reports:
   ```bash
   gh release download task-42-evidence --pattern "qa-reports-*.json"
   ```

4. Enable iterative refinement:
   ```javascript
   // Automatically fix and retry
   const MAX_QA_ITERATIONS = 5;
   // System will replan and fix issues
   ```

### Issue: Memory not persisting

**Symptoms:**
- Workers can't access shared state
- Duplicate work across workers

**Solutions:**
1. Verify memory operations:
   ```javascript
   mcp__claude-flow__memory_usage {
     action: "retrieve",
     key: "task-sentinel/test",
     namespace: "task-sentinel"
   }
   ```

2. Check namespace:
   ```javascript
   // Ensure consistent namespace
   namespace: "task-sentinel"
   ```

3. Enable memory sync hook:
   ```json
   {
     "hooks": {
       "custom": {
         "memory-sync": {
           "trigger": "interval",
           "interval": 60000,
           "command": "npx claude-flow hook memory-sync --namespace task-sentinel"
         }
       }
     }
   }
   ```

### Issue: Agents not coordinating

**Symptoms:**
- Agents working independently
- No swarm coordination
- Conflicting changes

**Solutions:**
1. Initialize swarm before spawning:
   ```javascript
   [Single Message]:
     mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 5 }
     Task("agent1", "...", "agent1")
     Task("agent2", "...", "agent2")
   ```

2. Use coordination hooks:
   ```bash
   npx claude-flow hook coordination-sync --swarm task-42
   ```

3. Check memory coordination:
   ```javascript
   mcp__claude-flow__memory_usage {
     action: "retrieve",
     key: "task/42/swarm"
   }
   ```

### Issue: Poor performance

**Symptoms:**
- Slow task execution
- High latency
- Worker overload

**Solutions:**
1. Check bottlenecks:
   ```bash
   mcp__claude-flow__bottleneck_analyze { component: "task-sentinel" }
   ```

2. Reduce parallel tasks:
   ```javascript
   const maxParallel = 2;  // Reduce from 3
   ```

3. Use adaptive topology:
   ```javascript
   mcp__claude-flow__swarm_init { topology: "adaptive" }
   ```

4. Enable load balancing:
   ```javascript
   mcp__claude-flow__load_balance {
     swarmId: "task-sentinel-main",
     tasks: readyTasks
   }
   ```

## Advanced Features

### GitHub Actions Integration

```yaml
# .github/workflows/task-sentinel-workers.yml
name: Task Sentinel Workers

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  process-tasks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        worker: [worker-1, worker-2, worker-3]
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          worker-id: ${{ matrix.worker }}
          command: /task-status --worker && /task-claim
```

### Custom Agent Types

```javascript
// Define custom agents for specialized tasks
const customAgents = {
  "data-migration": {
    capabilities: ["database", "etl", "validation"],
    cost: 6
  },
  "infrastructure": {
    capabilities: ["terraform", "kubernetes", "monitoring"],
    cost: 7
  }
};

// Use in GOAP planning
Task("goal-planner", `
  Task: Database migration
  Custom agents available: ${JSON.stringify(customAgents)}
`, "goal-planner")
```

### Multi-Repository Coordination

```javascript
// Coordinate changes across multiple repositories
[Single Message]:
  Task("multi-repo-swarm", `
    Task: Update authentication across 3 repositories
    Repos: frontend, backend, mobile

    Coordinate changes, maintain consistency, update dependencies
  `, "multi-repo-swarm")

  mcp__claude-flow__memory_usage {
    action: "store",
    key: "cross-repo/task-42/state",
    value: JSON.stringify({ repos: ["frontend", "backend", "mobile"] })
  }
```

### Neural Training

```javascript
// Train neural patterns from successful tasks
mcp__claude-flow__neural_train {
  pattern_type: "coordination",
  training_data: JSON.stringify({
    task_type: "authentication",
    agents: ["coder", "tester", "reviewer"],
    topology: "star",
    success: true,
    execution_time: 1800
  })
}

// Use learned patterns
mcp__claude-flow__neural_patterns {
  action: "predict",
  operation: "authenticate-user",
  metadata: { complexity: 7 }
}
```

## Performance Metrics

### Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task Throughput | >50 tasks/day | GitHub Issues closed |
| Worker Utilization | >80% | Active time / total time |
| OODA Cycle Time | <5 minutes | Observe → Act |
| GOAP Planning Time | <30 seconds | goal-planner execution |
| Lock Acquisition | <2 seconds | GitHub API latency |
| QA Completion | <10 minutes | agentic-qe execution |
| Test Coverage | >85% | Coverage reports |
| QA Pass Rate | >95% | Successful QA / total |
| Stale Lock Rate | <1% | Stale locks / total |

### Monitoring

```bash
# Check metrics
mcp__claude-flow__agent_metrics { agentId: "task-sentinel" }

# Performance report
mcp__claude-flow__performance_report {
  format: "detailed",
  timeframe: "24h"
}

# Bottleneck analysis
mcp__claude-flow__bottleneck_analyze {
  component: "task-sentinel",
  metrics: ["throughput", "latency", "utilization"]
}
```

## Learn More

- **Implementation Plan**: `/workspaces/Task-Sentinel/docs/task_sentinel_implementation_plan.md`
- **OODA Loop**: `/workspaces/Task-Sentinel/docs/OODA_LOOP.md`
- **GOAP Integration**: `/workspaces/Task-Sentinel/docs/GOAP_INTEGRATION.md`
- **Architecture**: `/workspaces/Task-Sentinel/docs/ARCHITECTURE.md`
- **User Guide**: `/workspaces/Task-Sentinel/docs/USER_GUIDE.md`

## Support

- GitHub Issues: Report bugs and request features
- Claude Flow: https://github.com/ruvnet/claude-flow
- Flow-Nexus: https://flow-nexus.ruv.io (registration required)

---

**Ready to orchestrate tasks with intelligence!** 🚀

Task Sentinel transforms GitHub Issues into a self-organizing, adaptive task execution platform powered by OODA loop, GOAP planning, and swarm intelligence.
