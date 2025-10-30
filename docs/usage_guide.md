# Task Sentinel Usage Guide

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
- [Workflow Patterns](#workflow-patterns)
- [OODA Loop Explained](#ooda-loop-explained)
- [GOAP Planning](#goap-planning)
- [Agent Coordination](#agent-coordination)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

---

## Installation

### Prerequisites Check

Before installing Task Sentinel, ensure you have the following:

```bash
# Check Node.js version (requires 18+)
node --version
# v18.0.0 or higher

# Check npm version
npm --version
# 9.0.0 or higher

# Check GitHub CLI
gh --version
# gh version 2.0.0 or higher

# Verify GitHub authentication
gh auth status
# ✓ Logged in to github.com as username
```

### Claude Flow Initialization

Task Sentinel requires Claude Flow for agent coordination:

```bash
# Install Claude Flow globally
npm install -g claude-flow@alpha

# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Verify installation
npx claude-flow@alpha --version
# claude-flow 2.0.0-alpha

# Check available modes
npx claude-flow@alpha sparc modes
```

### GitHub CLI Authentication

Task Sentinel uses GitHub CLI for issue and PR management:

```bash
# Login to GitHub
gh auth login

# Follow prompts:
# ? What account do you want to log into? GitHub.com
# ? What is your preferred protocol for Git operations? HTTPS
# ? Authenticate Git with your GitHub credentials? Yes
# ? How would you like to authenticate GitHub CLI? Login with a web browser

# Verify authentication
gh auth status
# ✓ Logged in to github.com as your-username (keyring)
# ✓ Git operations for github.com configured to use https protocol.

# Set default repository (optional)
gh repo set-default owner/repo
```

### MCP Server Configuration

Configure MCP servers for enhanced capabilities:

```bash
# Add required MCP server (Claude Flow)
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Add optional MCP servers for advanced features

# Enhanced coordination
claude mcp add ruv-swarm npx ruv-swarm mcp start

# Cloud features (requires registration)
claude mcp add flow-nexus npx flow-nexus@latest mcp start

# Verify MCP servers
claude mcp list
# claude-flow - npx claude-flow@alpha mcp start
# ruv-swarm - npx ruv-swarm mcp start
# flow-nexus - npx flow-nexus@latest mcp start
```

### Project Setup

```bash
# Clone Task Sentinel repository
git clone https://github.com/yourusername/Task-Sentinel.git
cd Task-Sentinel

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify installation
npm test
# ✓ All tests passed
```

---

## Quick Start

### Step-by-Step First Task

Let's create and complete your first task using Task Sentinel.

#### 1. Create Task with /task-create

```bash
# Create a new task
/task-create --title "Add user authentication API endpoint" \
             --priority 5000 \
             --labels "feature,api,authentication"

# Expected output:
# ✓ Task created successfully!
#
# Issue #42: Add user authentication API endpoint
# Priority: 5000
# Labels: feature, api, authentication
# Status: Open (Unclaimed)
# URL: https://github.com/owner/repo/issues/42
#
# Initial GOAP Plan:
# 1. Research authentication patterns (Cost: 2)
# 2. Design API schema (Cost: 3)
# 3. Implement authentication logic (Cost: 5)
# 4. Write tests (Cost: 3)
# 5. Create documentation (Cost: 2)
#
# Total estimated cost: 15
```

#### 2. Check Status with /task-status

```bash
# Check status of all tasks
/task-status

# Expected output:
# Task Status Summary
# ===================
#
# Open Tasks (1):
# • #42: Add user authentication API endpoint [Priority: 5000]
#   Labels: feature, api, authentication
#   Status: Unclaimed
#   GOAP Plan: 5 steps (cost: 15)
#
# In Progress (0):
# • None
#
# Completed (0):
# • None

# Check specific task status
/task-status --issue 42

# Expected output:
# Issue #42: Add user authentication API endpoint
# ===============================================
#
# Status: Open (Unclaimed)
# Priority: 5000
# Labels: feature, api, authentication
# Created: 2025-10-30 10:30:00
#
# GOAP Plan (5 steps):
# 1. [Pending] Research authentication patterns (Cost: 2)
# 2. [Pending] Design API schema (Cost: 3)
# 3. [Pending] Implement authentication logic (Cost: 5)
# 4. [Pending] Write tests (Cost: 3)
# 5. [Pending] Create documentation (Cost: 2)
#
# Execution History: None
# Replan Count: 0
```

#### 3. Claim Task with /task-claim

```bash
# Claim the task for execution
/task-claim --issue 42

# Expected output:
# ✓ Task #42 claimed successfully!
#
# Claiming agent: auth-implementer-agent
# Claimed at: 2025-10-30 10:35:00
# Distributed lock acquired: task-42-lock
# Heartbeat interval: 30s
#
# Spawning agent swarm...
# • researcher: Analyzing authentication patterns
# • architect: Designing API schema
# • coder: Ready to implement
# • tester: Preparing test suite
# • reviewer: Standing by for code review
#
# OODA Loop Status:
# • Observe: Monitoring repository state
# • Orient: Context established
# • Decide: Executing GOAP plan step 1
# • Act: Research phase initiated
#
# Estimated completion: 45-60 minutes
```

#### 4. Monitor Progress

```bash
# Monitor task progress in real-time
/task-status --issue 42

# Expected output after 10 minutes:
# Issue #42: Add user authentication API endpoint
# ===============================================
#
# Status: In Progress
# Claimed by: auth-implementer-agent
# Heartbeat: Last seen 15s ago ✓
# Progress: 40% (Step 2/5)
#
# GOAP Plan:
# 1. ✓ Research authentication patterns (Completed in 8m)
# 2. → Design API schema (In Progress - 2m elapsed)
# 3. [Pending] Implement authentication logic
# 4. [Pending] Write tests
# 5. [Pending] Create documentation
#
# OODA Loop Activity:
# • Observe: Detected new security best practices
# • Orient: Updating authentication strategy
# • Decide: Continuing with OAuth2 approach
# • Act: Designing token validation schema
#
# Recent Actions:
# 10:38 - Completed authentication pattern research
# 10:40 - Started API schema design
# 10:42 - Created auth.schema.json
# 10:43 - Heartbeat ✓
#
# Memory Coordination:
# • swarm/researcher/auth-patterns: Stored
# • swarm/architect/schema-design: Updated
```

#### 5. Complete with /task-complete

```bash
# Complete the task and create PR
/task-complete --issue 42 --pr 123

# Expected output:
# ✓ Task #42 completed successfully!
#
# Pull Request: #123
# Title: Add user authentication API endpoint
# URL: https://github.com/owner/repo/pull/123
#
# Execution Summary:
# • Total time: 52 minutes
# • GOAP steps completed: 5/5
# • Replans: 1 (security enhancement)
# • Files changed: 12
# • Tests added: 24 (100% coverage)
#
# Agent Performance:
# • researcher: 8m (pattern analysis)
# • architect: 12m (schema design)
# • coder: 22m (implementation)
# • tester: 7m (test suite)
# • reviewer: 3m (code review)
#
# OODA Loop Summary:
# • Observations: 15
# • Orientation updates: 8
# • Decisions: 12
# • Actions executed: 47
#
# Quality Metrics:
# • Code coverage: 100%
# • Security scan: Passed
# • Performance benchmarks: All green
# • Documentation: Complete
#
# Neural Patterns Trained: 3
# • authentication-flow-pattern
# • oauth2-implementation-pattern
# • api-security-pattern
#
# Distributed lock released: task-42-lock
# Issue #42 closed automatically
```

---

## Command Reference

### /task-create

Create a new task with GOAP planning and agent coordination.

**Syntax:**
```bash
/task-create --title "Task title" \
             [--priority <number>] \
             [--labels "label1,label2"] \
             [--description "Task description"] \
             [--assignee @username] \
             [--topology <topology>]
```

**Parameters:**
- `--title` (required): Task title
- `--priority` (optional): Priority score 1-10000 (default: 5000)
- `--labels` (optional): Comma-separated labels
- `--description` (optional): Detailed task description
- `--assignee` (optional): GitHub username to assign
- `--topology` (optional): Swarm topology (mesh, hierarchical, ring, star)

**Examples:**

```bash
# Simple task creation
/task-create --title "Fix login bug"

# Task with full parameters
/task-create --title "Implement real-time notifications" \
             --priority 8000 \
             --labels "feature,real-time,high-priority" \
             --description "Add WebSocket support for real-time user notifications" \
             --assignee @johndoe \
             --topology mesh

# Complex feature decomposition
/task-create --title "Build payment gateway integration" \
             --priority 9000 \
             --labels "feature,payment,critical" \
             --description "Integrate Stripe for payment processing with full webhook support"

# Bug fix task
/task-create --title "Memory leak in user session handler" \
             --priority 7000 \
             --labels "bug,memory,performance"
```

**Output:**
```
✓ Task created successfully!

Issue #45: Implement real-time notifications
Priority: 8000
Labels: feature, real-time, high-priority
Assignee: @johndoe
Topology: mesh
Status: Open (Unclaimed)
URL: https://github.com/owner/repo/issues/45

Initial GOAP Plan (6 steps):
1. Research WebSocket libraries (Cost: 2, Preconditions: none)
2. Design notification schema (Cost: 3, Preconditions: [1])
3. Implement WebSocket server (Cost: 5, Preconditions: [1,2])
4. Create client integration (Cost: 4, Preconditions: [3])
5. Write tests (Cost: 3, Preconditions: [3,4])
6. Deploy and monitor (Cost: 2, Preconditions: [5])

Total estimated cost: 19
Estimated completion time: 60-90 minutes

Agent swarm ready:
• researcher (WebSocket patterns)
• architect (notification schema)
• backend-dev (server implementation)
• coder (client integration)
• tester (test suite)
• cicd-engineer (deployment)
```

---

### /task-claim

Claim a task for execution and spawn agent swarm.

**Syntax:**
```bash
/task-claim --issue <number> [--agent-id <id>] [--topology <type>]
```

**Parameters:**
- `--issue` (required): GitHub issue number
- `--agent-id` (optional): Custom agent identifier
- `--topology` (optional): Override swarm topology

**Examples:**

```bash
# Simple claim
/task-claim --issue 45

# Claim with custom agent
/task-claim --issue 45 --agent-id "notification-specialist"

# Claim with topology override
/task-claim --issue 45 --topology hierarchical
```

**Output:**
```
✓ Task #45 claimed successfully!

Claiming agent: notification-specialist
Claimed at: 2025-10-30 11:00:00
Distributed lock acquired: task-45-lock
Heartbeat interval: 30s

Swarm initialized (mesh topology):
• researcher (ready) - Analyzing WebSocket patterns
• architect (ready) - Designing notification schema
• backend-dev (ready) - Standing by for implementation
• coder (ready) - Preparing client integration
• tester (ready) - Test suite framework ready
• cicd-engineer (ready) - Deployment pipeline configured

Coordination:
• Memory namespace: swarm-task-45
• Session ID: sess-45-20251030110000
• Mesh connections established: 15/15

OODA Loop initialized:
• Observe: Monitoring repository and dependencies
• Orient: Context established, ready to proceed
• Decide: Executing GOAP step 1 (Research)
• Act: Spawning researcher agent

Estimated completion: 60-90 minutes
Next heartbeat: 30s
```

---

### /task-status

Check status of tasks with detailed progress information.

**Syntax:**
```bash
/task-status [--issue <number>] [--verbose] [--filter <status>]
```

**Parameters:**
- `--issue` (optional): Specific issue number
- `--verbose` (optional): Show detailed agent activity
- `--filter` (optional): Filter by status (open, claimed, in-progress, completed)

**Examples:**

```bash
# All tasks summary
/task-status

# Specific task status
/task-status --issue 45

# Verbose output with agent details
/task-status --issue 45 --verbose

# Filter by status
/task-status --filter in-progress
```

**Output (Summary):**
```
Task Status Summary
===================

Open Tasks (2):
• #46: Optimize database queries [Priority: 6000]
  Labels: performance, database
  Status: Unclaimed

• #47: Add dark mode support [Priority: 4000]
  Labels: feature, ui
  Status: Unclaimed

In Progress (1):
• #45: Implement real-time notifications [Priority: 8000]
  Labels: feature, real-time, high-priority
  Status: In Progress (40% - Step 2/6)
  Claimed by: notification-specialist
  Last heartbeat: 12s ago ✓

Completed Today (3):
• #42: Add user authentication API endpoint [5000]
• #43: Fix memory leak in session handler [7000]
• #44: Update API documentation [3000]
```

**Output (Detailed with --verbose):**
```
Issue #45: Implement real-time notifications
============================================

Status: In Progress (40%)
Priority: 8000
Labels: feature, real-time, high-priority
Claimed by: notification-specialist
Claimed at: 2025-10-30 11:00:00
Elapsed time: 25m 30s

Distributed Lock:
• Lock ID: task-45-lock
• Acquired: 2025-10-30 11:00:00
• Last heartbeat: 12s ago ✓
• TTL: 30s

GOAP Plan Progress (Step 2/6):
1. ✓ Research WebSocket libraries
   Completed: 11:08 (8m)
   Agent: researcher
   Output: Socket.io recommended, comparison doc created

2. → Design notification schema
   Started: 11:08
   In Progress: 17m 30s
   Agent: architect
   Current: Creating event type definitions
   Files: notification.schema.json, events.types.ts

3. [Pending] Implement WebSocket server
   Agent: backend-dev (standing by)

4. [Pending] Create client integration
   Agent: coder (standing by)

5. [Pending] Write tests
   Agent: tester (standing by)

6. [Pending] Deploy and monitor
   Agent: cicd-engineer (standing by)

Active Agents (6):
• researcher: Idle (last task completed)
• architect: Active - Designing notification schema
  - Current file: src/types/notification.schema.json
  - Memory updates: 3
  - Last action: Created EventType enum (2m ago)

• backend-dev: Standby
• coder: Standby
• tester: Preparing test framework
  - Current: Setting up WebSocket test utilities
  - Last action: Installed socket.io-client@latest (5m ago)

• cicd-engineer: Standby

OODA Loop Activity (Last 10m):
11:15 [Observe] Detected Socket.io v4.6.0 as latest stable
11:17 [Orient] Reviewing real-time notification patterns
11:19 [Decide] Choosing event-driven architecture
11:21 [Act] Creating notification schema
11:23 [Observe] Found existing event system in codebase
11:24 [Orient] Integrating with existing event infrastructure
11:25 [Decide] Extending current event types

Memory Coordination:
• swarm-task-45/researcher/websocket-analysis: 1.2KB
• swarm-task-45/architect/schema-design: 3.4KB
• swarm-task-45/architect/event-types: 2.1KB
• swarm-task-45/tester/test-config: 0.8KB

Performance Metrics:
• Token usage: 12,450 tokens
• API calls: 23
• File operations: 8 reads, 4 writes
• Memory operations: 7 stores, 12 retrieves

Neural Training:
• Patterns identified: 2
  - websocket-integration-pattern
  - event-driven-notification-pattern

Next Actions:
1. Complete notification schema (ETA: 3m)
2. Review schema with researcher (ETA: 2m)
3. Begin WebSocket server implementation (ETA: 20m)

Estimated completion: 35-50 minutes remaining
```

---

### /task-qa

Perform quality assurance checks on completed task.

**Syntax:**
```bash
/task-qa --issue <number> [--coverage-min <percent>] [--strict]
```

**Parameters:**
- `--issue` (required): GitHub issue number
- `--coverage-min` (optional): Minimum code coverage (default: 80%)
- `--strict` (optional): Enable strict quality checks

**Examples:**

```bash
# Basic QA check
/task-qa --issue 45

# QA with higher coverage requirement
/task-qa --issue 45 --coverage-min 95

# Strict QA checks
/task-qa --issue 45 --strict
```

**Output:**
```
Quality Assurance Report: Issue #45
====================================

Overall Status: ✓ PASSED

Code Quality: ✓ PASSED
• ESLint: 0 errors, 2 warnings
• TypeScript: 0 errors
• Code complexity: Average 4.2 (threshold: 10)
• Duplicate code: 0.3% (threshold: 5%)

Test Coverage: ✓ PASSED
• Line coverage: 96.5% (required: 80%)
• Branch coverage: 94.2%
• Function coverage: 100%
• Statement coverage: 96.8%
• Tests: 32 passed, 0 failed

Security Scan: ✓ PASSED
• Vulnerabilities: 0 critical, 0 high, 1 medium
• Dependencies: All up to date
• OWASP Top 10: No issues
• Secret detection: Clean

Performance: ✓ PASSED
• Build time: 12.3s (baseline: 11.8s, +4.2%)
• Bundle size: 245KB (threshold: 500KB)
• Memory usage: Normal
• No memory leaks detected

Documentation: ✓ PASSED
• API documentation: Complete
• README updated: Yes
• Inline comments: Adequate
• Type definitions: Complete

Integration Tests: ✓ PASSED
• End-to-end: 8/8 passed
• API tests: 12/12 passed
• WebSocket tests: 6/6 passed

Warnings (2):
1. ESLint: Unused variable 'debugMode' in notification.service.ts:45
2. ESLint: Consider adding explicit return type to function 'handleEvent'

Recommendations:
• Remove unused variables before merge
• Add explicit return types for public functions
• Consider upgrading medium-severity dependency (ws@7.5.0 → 7.5.10)

Quality Score: 97/100
✓ Ready for pull request creation
```

---

### /task-complete

Complete task and create pull request.

**Syntax:**
```bash
/task-complete --issue <number> \
               [--pr <number>] \
               [--skip-qa] \
               [--close-issue]
```

**Parameters:**
- `--issue` (required): GitHub issue number
- `--pr` (optional): Existing PR number to associate
- `--skip-qa` (optional): Skip QA checks (not recommended)
- `--close-issue` (optional): Automatically close issue

**Examples:**

```bash
# Complete task and create PR
/task-complete --issue 45

# Complete with existing PR
/task-complete --issue 45 --pr 156

# Complete and auto-close issue
/task-complete --issue 45 --close-issue

# Complete without QA (not recommended)
/task-complete --issue 45 --skip-qa
```

**Output:**
```
✓ Task #45 completed successfully!

Pull Request: #156
Title: Implement real-time notifications
URL: https://github.com/owner/repo/pull/156
Status: Open, ready for review

Branch: feature/real-time-notifications-45
Base: main

Files Changed (12):
• src/server/websocket.server.ts (new)
• src/types/notification.schema.json (new)
• src/types/events.types.ts (modified)
• src/services/notification.service.ts (new)
• src/client/notification.client.ts (new)
• tests/websocket.server.test.ts (new)
• tests/notification.service.test.ts (new)
• tests/integration/notification.e2e.test.ts (new)
• docs/api/notifications.md (new)
• package.json (modified)
• README.md (modified)
• .github/workflows/notification-deploy.yml (new)

Statistics:
• Lines added: 1,247
• Lines removed: 34
• Tests added: 32
• Documentation pages: 2

Execution Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total time: 67 minutes
GOAP steps completed: 6/6
Replans: 1 (integrated existing event system)
Success rate: 100%

GOAP Step Breakdown:
1. ✓ Research WebSocket libraries (8m)
2. ✓ Design notification schema (18m)
3. ✓ Implement WebSocket server (22m)
4. ✓ Create client integration (11m)
5. ✓ Write tests (6m)
6. ✓ Deploy and monitor (2m)

Agent Performance:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• researcher: 8m (pattern analysis)
  - Tokens: 2,340
  - Quality: Excellent

• architect: 18m (schema design)
  - Tokens: 4,120
  - Quality: Excellent
  - Replans: 1 (integration improvement)

• backend-dev: 22m (server implementation)
  - Tokens: 8,450
  - Quality: Excellent

• coder: 11m (client integration)
  - Tokens: 5,230
  - Quality: Good

• tester: 6m (test suite)
  - Tokens: 3,890
  - Coverage: 96.5%

• cicd-engineer: 2m (deployment config)
  - Tokens: 1,120
  - Quality: Excellent

OODA Loop Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Observations: 23
• Orientation updates: 14
• Decisions: 19
• Actions executed: 67
• Replans triggered: 1

Replan Details:
• Trigger: Discovered existing event system
• Adaptation: Integrated with current infrastructure
• Impact: Reduced implementation time by 15m
• Quality improvement: Better code reuse

Quality Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Code coverage: 96.5% ✓
• Security scan: Passed ✓
• Performance: All benchmarks green ✓
• Documentation: Complete ✓
• ESLint: 0 errors, 2 warnings ⚠
• Quality score: 97/100 ✓

Neural Patterns Trained (3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. websocket-integration-pattern
   - Accuracy: 94.2%
   - Applications: Real-time communication

2. event-driven-notification-pattern
   - Accuracy: 91.8%
   - Applications: Event processing

3. schema-first-design-pattern
   - Accuracy: 89.5%
   - Applications: API design

Resource Usage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total tokens: 25,150
• API calls: 89
• Memory operations: 45
• File operations: 67
• Git operations: 23

Distributed Coordination:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lock released: task-45-lock
• Session exported: sess-45-20251030110000
• Memory persisted: swarm-task-45
• Heartbeat stopped: Clean shutdown

Issue #45 Status:
• Labels updated: +completed, +tested
• Linked to PR #156
• Status: Open (awaiting review)

Next Steps:
1. Request code review from team
2. Address ESLint warnings
3. Monitor CI/CD pipeline
4. Merge after approval

PR Review Checklist:
□ Code quality review
□ Security audit
□ Performance testing
□ Documentation review
□ Integration testing

✓ Task completion successful!
```

---

## Workflow Patterns

### Single Task Workflow

**Scenario:** Implementing a simple feature or bug fix.

**Steps:**

```bash
# 1. Create the task
/task-create --title "Add password reset email template" \
             --priority 6000 \
             --labels "feature,email,template"

# Output: Issue #50 created

# 2. Claim and execute
/task-claim --issue 50

# 3. Monitor progress (check every 10-15 minutes)
/task-status --issue 50

# 4. Run QA before completion
/task-qa --issue 50

# 5. Complete and create PR
/task-complete --issue 50 --close-issue
```

**Timeline:** 30-45 minutes for simple tasks

**Agent Usage:** 3-5 agents (researcher, coder, tester, reviewer, documenter)

**Best For:**
- Bug fixes
- Simple feature additions
- Documentation updates
- Configuration changes
- Small refactorings

---

### Parallel Task Workflow

**Scenario:** Multiple independent tasks that can run simultaneously.

**Steps:**

```bash
# 1. Create multiple independent tasks
/task-create --title "Add user profile API endpoint" --priority 7000 --labels "api,feature"
# Output: Issue #51

/task-create --title "Implement email notification service" --priority 7000 --labels "service,email"
# Output: Issue #52

/task-create --title "Add database migration for user preferences" --priority 6000 --labels "database,migration"
# Output: Issue #53

# 2. Claim all tasks (in parallel messages)
# Message 1:
/task-claim --issue 51
# Message 2:
/task-claim --issue 52
# Message 3:
/task-claim --issue 53

# 3. Monitor all tasks
/task-status --filter in-progress

# Output shows parallel execution:
# In Progress (3):
# • #51: Add user profile API endpoint (30% - Step 2/5)
# • #52: Implement email notification service (45% - Step 3/6)
# • #53: Add database migration for user preferences (60% - Step 3/4)

# 4. Complete tasks as they finish
/task-complete --issue 53  # Finishes first (simpler task)
/task-complete --issue 51  # Finishes second
/task-complete --issue 52  # Finishes last
```

**Timeline:** 45-90 minutes total (tasks complete at different times)

**Agent Usage:** 15-20 agents distributed across tasks

**Coordination:**
- Each task has isolated memory namespace
- No dependencies between tasks
- Independent GOAP plans
- Separate distributed locks
- Parallel neural training

**Best For:**
- Multiple bug fixes
- Feature batch implementation
- Component updates
- Independent service improvements
- Parallel documentation

---

### Complex Feature Workflow

**Scenario:** Large feature requiring decomposition and coordination.

**Steps:**

```bash
# 1. Create parent task with complex feature
/task-create --title "Build complete user management system" \
             --priority 9000 \
             --labels "epic,feature,user-management" \
             --description "Full user CRUD, authentication, authorization, profile management"

# Output: Issue #60 created with decomposed subtasks

# GOAP automatically decomposes into:
# - Issue #61: Design user data model and schema
# - Issue #62: Implement authentication service
# - Issue #63: Build authorization middleware
# - Issue #64: Create user CRUD API endpoints
# - Issue #65: Develop user profile UI
# - Issue #66: Integration testing suite

# 2. Execute in dependency order
# Phase 1: Foundation
/task-claim --issue 61  # Data model (no dependencies)

# Wait for completion, then Phase 2: Core services
/task-complete --issue 61
/task-claim --issue 62  # Authentication (depends on #61)
/task-claim --issue 63  # Authorization (depends on #61)

# Phase 3: Application layer
/task-complete --issue 62
/task-complete --issue 63
/task-claim --issue 64  # API endpoints (depends on #62, #63)
/task-claim --issue 65  # UI (depends on #64)

# Phase 4: Validation
/task-complete --issue 64
/task-complete --issue 65
/task-claim --issue 66  # Integration tests (depends on all)

# 3. Final completion
/task-complete --issue 66
/task-complete --issue 60  # Mark epic complete
```

**Timeline:** 4-6 hours across multiple phases

**Agent Usage:** 25-30 agents with hierarchical coordination

**Decomposition Strategy:**
```
Epic Task (#60)
├── Foundation (#61)
│   └── researcher, architect, documenter
├── Core Services (#62, #63)
│   ├── #62: backend-dev, security-manager, tester
│   └── #63: backend-dev, security-manager, reviewer
├── Application Layer (#64, #65)
│   ├── #64: backend-dev, api-docs, tester
│   └── #65: coder, mobile-dev, reviewer
└── Validation (#66)
    └── tester, perf-analyzer, integration-tester
```

**Coordination Patterns:**
- **Memory Sharing:** Parent task memory accessible to subtasks
- **GOAP Dependencies:** Subtasks wait for preconditions
- **Topology:** Hierarchical with coordinator agent
- **Replanning:** Parent GOAP updates based on subtask results

**Best For:**
- Major features
- System refactorings
- Multi-component implementations
- Architecture changes
- Complex integrations

---

### Cross-Repository Workflow

**Scenario:** Feature spanning multiple repositories.

**Steps:**

```bash
# 1. Create tasks in each repository

# Repository 1: Backend API
cd ~/projects/backend-api
/task-create --title "Add webhook endpoints for order processing" \
             --priority 8000 \
             --labels "api,webhook,cross-repo"
# Output: owner/backend-api#70

# Repository 2: Frontend App
cd ~/projects/frontend-app
/task-create --title "Implement webhook status UI" \
             --priority 8000 \
             --labels "ui,webhook,cross-repo"
# Output: owner/frontend-app#45

# Repository 3: Shared Types
cd ~/projects/shared-types
/task-create --title "Define webhook event types" \
             --priority 9000 \
             --labels "types,webhook,cross-repo"
# Output: owner/shared-types#12

# 2. Execute in dependency order
# Start with shared types (dependency for others)
cd ~/projects/shared-types
/task-claim --issue 12

# Monitor and complete
/task-complete --issue 12

# 3. Parallel execution in backend and frontend
# Message 1:
cd ~/projects/backend-api
/task-claim --issue 70

# Message 2:
cd ~/projects/frontend-app
/task-claim --issue 45

# 4. Monitor cross-repo coordination
cd ~/projects/backend-api
/task-status --issue 70

# Output shows memory coordination:
# Memory Coordination:
# • Local: swarm-task-70/backend
# • Cross-repo: cross-repo/webhook/shared-types (imported)
# • Cross-repo: cross-repo/webhook/contract (shared)

# 5. Complete all tasks
cd ~/projects/backend-api
/task-complete --issue 70

cd ~/projects/frontend-app
/task-complete --issue 45

# 6. Verify integration
cd ~/projects/backend-api
/task-qa --issue 70 --strict
```

**Timeline:** 2-4 hours with coordination overhead

**Multi-Repo Coordination:**

```javascript
// Shared memory namespace
{
  "cross-repo": {
    "webhook": {
      "shared-types": {
        "eventTypes": ["order.created", "order.updated"],
        "schema": "https://owner.github.io/schemas/webhook.json",
        "version": "1.0.0"
      },
      "contract": {
        "endpoint": "/api/v1/webhooks",
        "authentication": "bearer-token",
        "retry": {
          "maxAttempts": 3,
          "backoff": "exponential"
        }
      }
    }
  }
}
```

**Agent Usage:**
- **Shared types repo:** 3 agents (architect, coder, documenter)
- **Backend repo:** 8 agents (backend-dev, api-docs, tester, security-manager)
- **Frontend repo:** 7 agents (coder, mobile-dev, reviewer)
- **Cross-repo coordinator:** 1 agent (multi-repo-swarm)

**Coordination Mechanisms:**
- **Shared memory:** Cross-repository memory namespaces
- **Contract-first:** Types define interface contracts
- **Version tracking:** Semantic versioning for compatibility
- **Integration testing:** Cross-repo E2E tests

**Best For:**
- Microservice features
- Full-stack implementations
- API contract changes
- Shared library updates
- Multi-tier features

---

## OODA Loop Explained

### What is OODA?

OODA (Observe, Orient, Decide, Act) is a decision-making cycle developed by military strategist John Boyd. Task Sentinel implements OODA to create adaptive, intelligent task execution.

**The Four Phases:**

```
┌──────────┐
│  OBSERVE │ ──> Gather information from environment
└──────────┘
     │
     ▼
┌──────────┐
│  ORIENT  │ ──> Analyze and contextualize information
└──────────┘
     │
     ▼
┌──────────┐
│  DECIDE  │ ──> Choose action based on analysis
└──────────┘
     │
     ▼
┌──────────┐
│   ACT    │ ──> Execute chosen action
└──────────┘
     │
     └──────> Loop back to OBSERVE
```

### How Task Sentinel Implements OODA

#### Observe Phase

**What it monitors:**
- Repository state (files, commits, branches)
- Dependencies (package.json, lock files)
- Test results and code coverage
- Performance benchmarks
- Security scans
- Team activity (PRs, issues, comments)
- External APIs and services

**Example observations:**
```javascript
{
  "observations": [
    {
      "timestamp": "2025-10-30T11:15:00Z",
      "type": "dependency",
      "data": {
        "package": "socket.io",
        "currentVersion": "4.5.0",
        "latestVersion": "4.6.0",
        "breaking": false
      }
    },
    {
      "timestamp": "2025-10-30T11:16:30Z",
      "type": "code-pattern",
      "data": {
        "pattern": "existing-event-system",
        "location": "src/events/",
        "relevance": "high",
        "suggestion": "integrate-with-current-system"
      }
    },
    {
      "timestamp": "2025-10-30T11:18:00Z",
      "type": "test-failure",
      "data": {
        "test": "notification.service.test.ts",
        "reason": "WebSocket connection timeout",
        "frequency": "intermittent"
      }
    }
  ]
}
```

#### Orient Phase

**What it analyzes:**
- Patterns in observations
- Historical context from memory
- Current GOAP plan state
- Agent performance metrics
- Resource availability
- Risk assessment

**Example orientation:**
```javascript
{
  "orientation": {
    "context": "Implementing real-time notifications",
    "currentState": {
      "phase": "design",
      "progress": 0.35,
      "step": "2/6"
    },
    "analysis": {
      "existingEventSystem": {
        "discovered": true,
        "compatibility": "high",
        "integration_effort": "low",
        "recommendation": "Reuse and extend existing system"
      },
      "dependencies": {
        "socket.io": {
          "status": "needs-update",
          "priority": "medium",
          "risk": "low"
        }
      },
      "risks": [
        {
          "type": "technical",
          "description": "WebSocket connection timeout in tests",
          "severity": "medium",
          "mitigation": "Increase timeout, add retry logic"
        }
      ]
    },
    "confidence": 0.87
  }
}
```

#### Decide Phase

**Decision types:**
- Continue with current plan
- Replan GOAP sequence
- Adjust agent allocation
- Modify implementation approach
- Request additional resources
- Escalate to human review

**Example decision:**
```javascript
{
  "decision": {
    "timestamp": "2025-10-30T11:19:00Z",
    "type": "replan",
    "reasoning": [
      "Discovered existing event system with high compatibility",
      "Integration reduces implementation time by ~30%",
      "Better code reuse and consistency",
      "Lower risk of introducing bugs"
    ],
    "changes": {
      "goap": {
        "removed": [
          "Create standalone event system"
        ],
        "added": [
          "Extend existing event system",
          "Add WebSocket event types"
        ],
        "modified": [
          {
            "step": "Implement WebSocket server",
            "oldCost": 5,
            "newCost": 3,
            "reason": "Reusing event infrastructure"
          }
        ]
      },
      "estimatedImpact": {
        "timeSaving": "15-20 minutes",
        "qualityImprovement": "Better consistency",
        "riskReduction": "Fewer integration points"
      }
    },
    "confidence": 0.92,
    "requiresApproval": false
  }
}
```

#### Act Phase

**Action types:**
- Execute GOAP step
- Spawn agents
- Modify files
- Run tests
- Update documentation
- Communicate with team
- Store in memory

**Example actions:**
```javascript
{
  "actions": [
    {
      "timestamp": "2025-10-30T11:20:00Z",
      "type": "goap-execution",
      "step": "Extend existing event system",
      "agent": "backend-dev",
      "operations": [
        {
          "type": "file-read",
          "path": "src/events/event-emitter.ts"
        },
        {
          "type": "file-edit",
          "path": "src/events/event-types.ts",
          "changes": "Added WebSocket event types"
        },
        {
          "type": "memory-store",
          "key": "swarm-task-45/architect/event-integration",
          "data": {...}
        }
      ],
      "result": "success"
    },
    {
      "timestamp": "2025-10-30T11:21:30Z",
      "type": "communication",
      "target": "team-channel",
      "message": "Replanned notification implementation to integrate with existing event system"
    }
  ]
}
```

### Automatic Observation and Replanning

**Triggers for replanning:**

1. **Discovery of better approach:**
   ```
   Observation: Existing event system found
   Orient: High compatibility, lower cost
   Decide: Replan to integrate
   Act: Update GOAP, continue execution
   ```

2. **Test failures:**
   ```
   Observation: Intermittent WebSocket timeout
   Orient: Connection stability issue
   Decide: Add retry logic and increase timeout
   Act: Modify test configuration, rerun
   ```

3. **Dependency conflicts:**
   ```
   Observation: Package version conflict
   Orient: Breaking change in dependency
   Decide: Lock to compatible version
   Act: Update package.json, rebuild
   ```

4. **Performance issues:**
   ```
   Observation: High memory usage in implementation
   Orient: Inefficient data structure
   Decide: Replan with optimized approach
   Act: Refactor implementation
   ```

5. **Security concerns:**
   ```
   Observation: Vulnerability detected
   Orient: High severity, requires immediate fix
   Decide: Pause current step, address security
   Act: Apply patch, rerun security scan
   ```

**Replanning example:**

```
Initial GOAP Plan:
1. Research WebSocket libraries (Cost: 2)
2. Design notification schema (Cost: 3)
3. Implement WebSocket server (Cost: 5)
4. Create standalone event system (Cost: 4)
5. Integrate with application (Cost: 3)
6. Write tests (Cost: 3)

OODA Cycle at Step 2:
[Observe] Discovered existing event system in src/events/
[Orient] High compatibility, reduces implementation cost
[Decide] Replan to integrate instead of creating standalone

Updated GOAP Plan:
1. ✓ Research WebSocket libraries (Cost: 2) - COMPLETED
2. → Design notification schema (Cost: 3) - IN PROGRESS
3. Extend existing event system (Cost: 2) - MODIFIED
4. Implement WebSocket server (Cost: 3) - MODIFIED (was 5)
5. Integrate with application (Cost: 2) - MODIFIED (was 3)
6. Write tests (Cost: 3) - UNCHANGED

Cost reduction: 20 → 15 (25% savings)
Time savings: ~15-20 minutes
Quality improvement: Better code consistency
```

### OODA Loop Benefits

**Adaptability:**
- Responds to changing conditions
- Discovers better approaches mid-execution
- Handles unexpected obstacles

**Efficiency:**
- Reduces wasted effort
- Optimizes resource allocation
- Minimizes redundant work

**Quality:**
- Identifies issues early
- Suggests improvements
- Ensures consistency

**Intelligence:**
- Learns from observations
- Applies historical patterns
- Makes data-driven decisions

**Monitoring OODA activity:**

```bash
# View OODA activity in task status
/task-status --issue 45 --verbose

# OODA Loop Activity (Last 30m):
# 11:00 [Observe] Task claimed, initializing
# 11:02 [Orient] Context established
# 11:03 [Decide] Beginning research phase
# 11:04 [Act] Spawned researcher agent
# 11:08 [Observe] Research completed
# 11:09 [Orient] Moving to design phase
# 11:10 [Decide] Executing schema design
# 11:11 [Act] Spawned architect agent
# 11:15 [Observe] Discovered existing event system
# 11:16 [Orient] Analyzing integration opportunity
# 11:18 [Decide] Replanning for integration
# 11:19 [Act] Updated GOAP plan
# 11:20 [Act] Modified implementation approach
# 11:25 [Observe] Schema design progressing well
# 11:28 [Orient] On track with updated plan
```

---

## GOAP Planning

### What is GOAP?

GOAP (Goal-Oriented Action Planning) is an AI planning technique that breaks down high-level goals into sequences of actions based on preconditions and costs.

**Core concepts:**

```
Goal: Implement feature X
  └─> Actions: A, B, C, D, E
       ├─> Preconditions: What must be true before action
       ├─> Effects: What becomes true after action
       └─> Cost: Effort/time estimate
```

### GOAP Components

#### 1. States

**World state** represents current environment:
```javascript
{
  "states": {
    "hasRequirements": false,
    "hasDesign": false,
    "hasImplementation": false,
    "hasTests": false,
    "hasDocumentation": false,
    "codeQualityChecked": false,
    "securityScanned": false,
    "deployed": false
  }
}
```

#### 2. Actions

**Actions** transform states:
```javascript
{
  "action": "research-patterns",
  "preconditions": {
    "hasRequirements": true
  },
  "effects": {
    "hasTechnicalResearch": true,
    "hasPatternAnalysis": true
  },
  "cost": 2,
  "agent": "researcher",
  "estimatedTime": "8-12 minutes"
}
```

#### 3. Goals

**Goals** define desired end states:
```javascript
{
  "goal": "feature-completed",
  "requiredStates": {
    "hasImplementation": true,
    "hasTests": true,
    "codeQualityChecked": true,
    "securityScanned": true,
    "hasDocumentation": true
  }
}
```

### State Transitions

**Example workflow:**

```
Initial State:
{ hasRequirements: true, everything else: false }

Action 1: research-patterns
├─ Cost: 2
├─ Preconditions: { hasRequirements: true } ✓
└─ New state: { hasRequirements: true, hasTechnicalResearch: true }

Action 2: design-schema
├─ Cost: 3
├─ Preconditions: { hasTechnicalResearch: true } ✓
└─ New state: { ..., hasDesign: true }

Action 3: implement-feature
├─ Cost: 5
├─ Preconditions: { hasDesign: true } ✓
└─ New state: { ..., hasImplementation: true }

Action 4: write-tests
├─ Cost: 3
├─ Preconditions: { hasImplementation: true } ✓
└─ New state: { ..., hasTests: true }

Action 5: check-quality
├─ Cost: 2
├─ Preconditions: { hasImplementation: true, hasTests: true } ✓
└─ New state: { ..., codeQualityChecked: true }

Goal State Achieved:
{ hasImplementation: true, hasTests: true, codeQualityChecked: true, ... }
```

### Cost Optimization

**GOAP finds lowest-cost path:**

```javascript
// Multiple paths to goal

// Path A: Traditional approach
{
  "path": "A",
  "actions": [
    "research-patterns (2)",
    "design-schema (3)",
    "implement-feature (5)",
    "write-tests (3)",
    "document (2)"
  ],
  "totalCost": 15
}

// Path B: Reuse existing code
{
  "path": "B",
  "actions": [
    "research-patterns (2)",
    "analyze-existing-code (1)",
    "extend-existing-system (2)",
    "write-tests (3)",
    "document (2)"
  ],
  "totalCost": 10
}

// GOAP selects Path B (lower cost)
```

### Dynamic Replanning

**When replanning occurs:**

```javascript
// Initial plan
{
  "plan": [
    "research (2)",
    "design-new-system (4)",
    "implement (6)",
    "test (3)"
  ],
  "totalCost": 15
}

// OODA observes existing system
{
  "observation": "Compatible existing system found",
  "newAction": {
    "action": "extend-existing-system",
    "cost": 2,
    "effects": { "hasImplementation": true }
  }
}

// GOAP replans
{
  "newPlan": [
    "research (2)",
    "analyze-existing (1)",
    "extend-existing-system (2)",
    "test (3)"
  ],
  "totalCost": 8,
  "savings": "47% cost reduction"
}
```

### Parallel Action Execution

**GOAP identifies parallelizable actions:**

```javascript
// Sequential execution (slow)
{
  "sequence": [
    "action-A (5min)",
    "action-B (8min)", // depends on A
    "action-C (6min)", // independent
    "action-D (4min)"  // depends on B
  ],
  "totalTime": "23 minutes"
}

// Parallel execution (fast)
{
  "parallel": [
    {
      "thread-1": [
        "action-A (5min)",
        "action-B (8min)",
        "action-D (4min)"
      ],
      "time": "17 minutes"
    },
    {
      "thread-2": [
        "action-C (6min)"
      ],
      "time": "6 minutes"
    }
  ],
  "totalTime": "17 minutes",
  "speedup": "1.35x"
}
```

### Complex GOAP Example

**Large feature decomposition:**

```javascript
{
  "task": "Build complete authentication system",
  "initialState": {
    "hasRequirements": true
  },
  "goalState": {
    "hasAuth": true,
    "hasTests": true,
    "hasDocumentation": true,
    "deployed": true
  },
  "goapPlan": {
    "steps": [
      {
        "id": 1,
        "action": "research-auth-patterns",
        "cost": 2,
        "preconditions": { "hasRequirements": true },
        "effects": { "hasAuthResearch": true },
        "agent": "researcher",
        "parallelizable": false
      },
      {
        "id": 2,
        "action": "design-auth-schema",
        "cost": 3,
        "preconditions": { "hasAuthResearch": true },
        "effects": { "hasAuthSchema": true },
        "agent": "architect",
        "parallelizable": false
      },
      {
        "id": 3,
        "action": "implement-jwt-service",
        "cost": 4,
        "preconditions": { "hasAuthSchema": true },
        "effects": { "hasJWTService": true },
        "agent": "backend-dev",
        "parallelizable": true,
        "parallelGroup": "auth-services"
      },
      {
        "id": 4,
        "action": "implement-password-hashing",
        "cost": 3,
        "preconditions": { "hasAuthSchema": true },
        "effects": { "hasPasswordService": true },
        "agent": "backend-dev",
        "parallelizable": true,
        "parallelGroup": "auth-services"
      },
      {
        "id": 5,
        "action": "implement-session-management",
        "cost": 4,
        "preconditions": { "hasAuthSchema": true },
        "effects": { "hasSessionService": true },
        "agent": "backend-dev",
        "parallelizable": true,
        "parallelGroup": "auth-services"
      },
      {
        "id": 6,
        "action": "create-auth-middleware",
        "cost": 3,
        "preconditions": {
          "hasJWTService": true,
          "hasSessionService": true
        },
        "effects": { "hasAuthMiddleware": true },
        "agent": "backend-dev",
        "parallelizable": false
      },
      {
        "id": 7,
        "action": "write-unit-tests",
        "cost": 3,
        "preconditions": { "hasAuthMiddleware": true },
        "effects": { "hasUnitTests": true },
        "agent": "tester",
        "parallelizable": true,
        "parallelGroup": "testing"
      },
      {
        "id": 8,
        "action": "write-integration-tests",
        "cost": 4,
        "preconditions": { "hasAuthMiddleware": true },
        "effects": { "hasIntegrationTests": true },
        "agent": "tester",
        "parallelizable": true,
        "parallelGroup": "testing"
      },
      {
        "id": 9,
        "action": "security-audit",
        "cost": 3,
        "preconditions": {
          "hasAuthMiddleware": true,
          "hasUnitTests": true
        },
        "effects": { "securityAudited": true },
        "agent": "security-manager",
        "parallelizable": false
      },
      {
        "id": 10,
        "action": "create-documentation",
        "cost": 2,
        "preconditions": { "securityAudited": true },
        "effects": { "hasDocumentation": true },
        "agent": "documenter",
        "parallelizable": false
      }
    ],
    "totalCost": 31,
    "estimatedTime": {
      "sequential": "90-120 minutes",
      "parallel": "60-80 minutes"
    },
    "parallelGroups": {
      "auth-services": [3, 4, 5],
      "testing": [7, 8]
    }
  }
}
```

**Execution visualization:**

```
Timeline (Parallel Execution):
0m   ┌─────────────────────────────────────────────────────┐
     │ 1. Research auth patterns (researcher)              │ 8m
8m   ├─────────────────────────────────────────────────────┤
     │ 2. Design auth schema (architect)                   │ 12m
20m  ├──────────────────────┬──────────────────────────────┤
     │ 3. JWT Service       │ 4. Password   │ 5. Session   │
     │    (backend-dev-1)   │    (backend)  │    (backend) │ 15m
     │         16m          │      12m      │      16m     │
35m  ├──────────────────────────────────────────────────────┤
     │ 6. Auth middleware (backend-dev)                    │ 12m
47m  ├──────────────────┬───────────────────────────────────┤
     │ 7. Unit tests    │ 8. Integration tests             │
     │    (tester-1)    │    (tester-2)                    │ 16m
63m  ├──────────────────────────────────────────────────────┤
     │ 9. Security audit (security-manager)                │ 12m
75m  ├──────────────────────────────────────────────────────┤
     │ 10. Documentation (documenter)                      │ 8m
83m  └─────────────────────────────────────────────────────┘

Total: 83 minutes (vs 120 minutes sequential)
Speedup: 1.45x
```

### Monitoring GOAP Execution

```bash
# View GOAP plan and progress
/task-status --issue 45 --verbose

# Output shows:
# GOAP Plan Progress (Step 6/10):
# 1. ✓ Research auth patterns (8m)
# 2. ✓ Design auth schema (12m)
# 3. ✓ JWT Service (16m)
# 4. ✓ Password hashing (12m)
# 5. ✓ Session management (16m)
# 6. → Auth middleware (In progress - 5m elapsed)
# 7. [Pending] Unit tests
# 8. [Pending] Integration tests
# 9. [Pending] Security audit
# 10. [Pending] Documentation
#
# Parallel execution groups:
# • auth-services: 3 agents completed in 16m (vs 31m sequential)
# • testing: Ready to execute (2 agents)
#
# Cost tracking:
# • Planned: 31
# • Actual: 28 (savings from parallel execution)
# • Remaining: 11
```

---

## Agent Coordination

Task Sentinel provides 54 specialized agents organized into categories for different tasks.

### Available Agents (54 Total)

#### Core Development (5 agents)
Essential agents for basic development tasks.

- **coder**: General-purpose coding agent
  - Capabilities: Code generation, refactoring, implementation
  - Best for: Feature implementation, bug fixes

- **reviewer**: Code review and quality assurance
  - Capabilities: Code analysis, best practices, security review
  - Best for: Pull request reviews, code quality checks

- **tester**: Test creation and execution
  - Capabilities: Unit tests, integration tests, E2E tests
  - Best for: Test suite development, coverage improvement

- **planner**: Task decomposition and planning
  - Capabilities: GOAP planning, task breakdown, estimation
  - Best for: Complex task planning, project organization

- **researcher**: Research and pattern analysis
  - Capabilities: Technology research, pattern discovery, best practices
  - Best for: Technical investigation, solution evaluation

#### Swarm Coordination (5 agents)
Agents managing swarm topology and coordination.

- **hierarchical-coordinator**: Tree-based coordination
  - Topology: Hierarchical
  - Best for: Large teams with clear roles

- **mesh-coordinator**: Peer-to-peer coordination
  - Topology: Mesh
  - Best for: High collaboration tasks

- **adaptive-coordinator**: Dynamic coordination
  - Topology: Adaptive
  - Best for: Changing requirements

- **collective-intelligence-coordinator**: Swarm intelligence
  - Topology: Distributed
  - Best for: Creative problem solving

- **swarm-memory-manager**: Memory coordination
  - Capabilities: Memory operations, context sharing
  - Best for: Cross-agent communication

#### Consensus & Distributed (7 agents)
Agents for distributed systems and consensus.

- **byzantine-coordinator**: Byzantine fault tolerance
  - Algorithm: BFT
  - Best for: Critical systems requiring consensus

- **raft-manager**: Raft consensus
  - Algorithm: Raft
  - Best for: Leader election, log replication

- **gossip-coordinator**: Gossip protocol
  - Algorithm: Epidemic
  - Best for: Eventually consistent systems

- **consensus-builder**: Generic consensus
  - Capabilities: Multiple consensus algorithms
  - Best for: Flexible consensus needs

- **crdt-synchronizer**: Conflict-free replicated data
  - Algorithm: CRDT
  - Best for: Offline-first, sync systems

- **quorum-manager**: Quorum-based decisions
  - Algorithm: Quorum
  - Best for: Voting, approval workflows

- **security-manager**: Security and authentication
  - Capabilities: Auth, encryption, security scanning
  - Best for: Security-critical operations

#### Performance & Optimization (5 agents)
Agents focused on performance and optimization.

- **perf-analyzer**: Performance analysis
  - Capabilities: Profiling, bottleneck detection
  - Best for: Performance optimization

- **performance-benchmarker**: Benchmarking
  - Capabilities: Benchmark creation, comparison
  - Best for: Performance testing

- **task-orchestrator**: Task coordination
  - Capabilities: Task scheduling, load balancing
  - Best for: Complex workflow management

- **memory-coordinator**: Memory management
  - Capabilities: Memory optimization, caching
  - Best for: Memory-intensive operations

- **smart-agent**: Intelligent automation
  - Capabilities: ML-based decisions, pattern learning
  - Best for: Adaptive automation

#### GitHub & Repository (9 agents)
Agents for GitHub operations and repository management.

- **github-modes**: GitHub operations
  - Capabilities: Issue, PR, workflow management
  - Best for: General GitHub tasks

- **pr-manager**: Pull request management
  - Capabilities: PR creation, review, merging
  - Best for: PR workflows

- **code-review-swarm**: Collaborative code review
  - Capabilities: Multi-agent code review
  - Best for: Comprehensive reviews

- **issue-tracker**: Issue management
  - Capabilities: Issue triage, labeling, assignment
  - Best for: Issue organization

- **release-manager**: Release coordination
  - Capabilities: Version management, changelog, deployment
  - Best for: Release workflows

- **workflow-automation**: GitHub Actions automation
  - Capabilities: Workflow creation, CI/CD
  - Best for: Automation setup

- **project-board-sync**: Project board management
  - Capabilities: Board sync, card management
  - Best for: Project tracking

- **repo-architect**: Repository structure
  - Capabilities: Repo design, organization
  - Best for: Repository setup

- **multi-repo-swarm**: Multi-repository coordination
  - Capabilities: Cross-repo operations
  - Best for: Monorepo, multi-repo projects

#### SPARC Methodology (6 agents)
Agents implementing SPARC development methodology.

- **sparc-coord**: SPARC coordinator
  - Capabilities: SPARC workflow management
  - Best for: SPARC-based development

- **sparc-coder**: SPARC-specific coding
  - Capabilities: TDD, clean architecture
  - Best for: SPARC implementation phase

- **specification**: Specification phase
  - Capabilities: Requirements analysis
  - Best for: Requirements gathering

- **pseudocode**: Pseudocode phase
  - Capabilities: Algorithm design
  - Best for: Algorithm planning

- **architecture**: Architecture phase
  - Capabilities: System design
  - Best for: Architecture decisions

- **refinement**: Refinement phase
  - Capabilities: Code refinement, optimization
  - Best for: Code quality improvement

#### Specialized Development (8 agents)
Domain-specific development agents.

- **backend-dev**: Backend development
  - Capabilities: API, database, server logic
  - Best for: Backend features

- **mobile-dev**: Mobile development
  - Capabilities: iOS, Android, React Native
  - Best for: Mobile applications

- **ml-developer**: Machine learning
  - Capabilities: ML models, training, deployment
  - Best for: ML features

- **cicd-engineer**: CI/CD pipelines
  - Capabilities: Pipeline creation, deployment
  - Best for: DevOps automation

- **api-docs**: API documentation
  - Capabilities: OpenAPI, documentation generation
  - Best for: API documentation

- **system-architect**: System architecture
  - Capabilities: Architecture design, patterns
  - Best for: System design

- **code-analyzer**: Code analysis
  - Capabilities: Static analysis, refactoring suggestions
  - Best for: Code quality analysis

- **base-template-generator**: Template generation
  - Capabilities: Boilerplate, scaffolding
  - Best for: Project setup

#### Testing & Validation (2 agents)
Specialized testing agents.

- **tdd-london-swarm**: TDD London school
  - Methodology: Outside-in TDD
  - Best for: Test-first development

- **production-validator**: Production validation
  - Capabilities: Production checks, smoke tests
  - Best for: Production deployment validation

#### Migration & Planning (2 agents)
Migration and initialization agents.

- **migration-planner**: Migration planning
  - Capabilities: Migration strategy, execution
  - Best for: System migrations

- **swarm-init**: Swarm initialization
  - Capabilities: Swarm setup, topology selection
  - Best for: Initial swarm configuration

### Coordination Patterns

#### 1. Mesh Topology

**Structure:** All agents connected to all others (peer-to-peer)

```
    Agent1 ←→ Agent2
      ↕  ╲   ╱  ↕
      ↕    ✕    ↕
      ↕  ╱   ╲  ↕
    Agent3 ←→ Agent4
```

**Best for:**
- High collaboration tasks
- Brainstorming and ideation
- Complex problem solving
- Creative tasks

**Example:**
```bash
/task-create --title "Design new system architecture" \
             --topology mesh
```

**Agent communication:**
- Direct peer-to-peer
- High bandwidth
- Low latency
- No bottlenecks

#### 2. Hierarchical Topology

**Structure:** Tree-based with coordinator at top

```
       Coordinator
       /    |    \
    Agent1 Agent2 Agent3
     / \           / \
  A1.1 A1.2     A3.1 A3.2
```

**Best for:**
- Large teams (10+ agents)
- Clear role separation
- Structured workflows
- Enterprise projects

**Example:**
```bash
/task-create --title "Build enterprise application" \
             --topology hierarchical
```

**Agent communication:**
- Coordinator mediates
- Clear chain of command
- Scalable structure
- Efficient resource allocation

#### 3. Ring Topology

**Structure:** Circular agent connections

```
   Agent1 → Agent2
     ↑         ↓
   Agent4 ← Agent3
```

**Best for:**
- Sequential workflows
- Pipeline processing
- Data transformation
- Assembly-line tasks

**Example:**
```bash
/task-create --title "Multi-stage data processing pipeline" \
             --topology ring
```

**Agent communication:**
- Sequential passing
- Ordered execution
- Predictable flow
- Good for pipelines

#### 4. Star Topology

**Structure:** Central hub with spoke agents

```
      Agent2
        |
Agent1—Hub—Agent3
        |
      Agent4
```

**Best for:**
- Centralized coordination
- Resource management
- Small teams (3-6 agents)
- Simple workflows

**Example:**
```bash
/task-create --title "Simple feature implementation" \
             --topology star
```

**Agent communication:**
- Hub mediates all
- Single point of control
- Simple management
- Lower bandwidth

### When to Use Which Topology

**Decision matrix:**

```
Task Complexity | Team Size | Best Topology
─────────────────────────────────────────────
Simple          | Small     | Star
Simple          | Large     | Hierarchical
Complex         | Small     | Mesh
Complex         | Large     | Hierarchical
Sequential      | Any       | Ring
Collaborative   | Small     | Mesh
Collaborative   | Large     | Hierarchical + Mesh hybrid
Dynamic         | Any       | Adaptive (auto-selects)
```

### Agent Selection Examples

#### Simple Bug Fix
```bash
/task-create --title "Fix null pointer exception" \
             --topology star

# Spawns:
# • coder (implementation)
# • tester (verification)
# • reviewer (quality check)
```

#### Complex Feature
```bash
/task-create --title "Build payment gateway" \
             --topology hierarchical

# Spawns:
# • Coordinator (hierarchical-coordinator)
# • Research team:
#   - researcher (payment patterns)
#   - security-manager (PCI compliance)
# • Development team:
#   - backend-dev (API endpoints)
#   - coder (client integration)
# • Quality team:
#   - tester (test suite)
#   - code-analyzer (quality check)
# • Documentation team:
#   - api-docs (API documentation)
```

#### Performance Optimization
```bash
/task-create --title "Optimize application performance" \
             --topology mesh

# Spawns:
# • perf-analyzer (bottleneck detection)
# • code-analyzer (code analysis)
# • backend-dev (optimization implementation)
# • performance-benchmarker (benchmarking)
# All collaborate in mesh for best results
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Task Creation Fails

**Symptoms:**
```bash
/task-create --title "My task"
# Error: Failed to create GitHub issue
```

**Causes:**
- GitHub CLI not authenticated
- Repository not configured
- Insufficient permissions

**Solutions:**

```bash
# Check GitHub auth
gh auth status

# If not logged in:
gh auth login

# Set default repository
gh repo set-default owner/repo

# Verify permissions
gh repo view owner/repo
```

#### 2. Task Claim Fails

**Symptoms:**
```bash
/task-claim --issue 42
# Error: Failed to acquire distributed lock
```

**Causes:**
- Task already claimed by another agent
- Lock service unavailable
- Network issues

**Solutions:**

```bash
# Check task status
/task-status --issue 42

# If locked by stale process:
# Wait for lock TTL (30s) to expire, then retry

# Force release lock (use with caution):
npx claude-flow@alpha memory delete "lock/task-42"

# Retry claim
/task-claim --issue 42
```

#### 3. Agent Spawn Failures

**Symptoms:**
```
Spawning agents...
Error: Agent spawn timeout
```

**Causes:**
- Claude Flow MCP not configured
- Network connectivity issues
- Resource constraints

**Solutions:**

```bash
# Verify Claude Flow MCP
claude mcp list
# Should show: claude-flow - npx claude-flow@alpha mcp start

# If missing, add it:
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Test Claude Flow directly:
npx claude-flow@alpha sparc modes

# Check system resources:
top  # Monitor CPU/memory

# Restart Claude Code:
# Exit and restart the application
```

#### 4. Heartbeat Timeout

**Symptoms:**
```
Task #42: Heartbeat timeout
Agent may be unresponsive
```

**Causes:**
- Agent process crashed
- Network interruption
- Long-running operation blocking heartbeat

**Solutions:**

```bash
# Check task status
/task-status --issue 42 --verbose

# If agent is stuck:
# Lock will auto-expire after TTL
# Wait 30-60 seconds, then:

# Reclaim the task
/task-claim --issue 42

# Or manually release lock:
npx claude-flow@alpha memory delete "lock/task-42"
```

#### 5. GOAP Planning Errors

**Symptoms:**
```
Error: Failed to generate GOAP plan
Invalid action dependencies
```

**Causes:**
- Complex task with circular dependencies
- Insufficient context
- Planning algorithm timeout

**Solutions:**

```bash
# Simplify task description
/task-create --title "Clear, specific task description"

# Break into smaller tasks:
/task-create --title "Subtask 1 - Foundation"
/task-create --title "Subtask 2 - Implementation"
/task-create --title "Subtask 3 - Testing"

# Provide more context:
/task-create --title "Detailed task" \
             --description "Specific requirements, constraints, and acceptance criteria"
```

#### 6. Memory Coordination Issues

**Symptoms:**
```
Warning: Failed to retrieve shared memory
Agents may have incomplete context
```

**Causes:**
- Memory service connection issues
- Memory namespace conflicts
- Expired memory entries

**Solutions:**

```bash
# Check memory service:
npx claude-flow@alpha memory list

# Clear old memory entries:
npx claude-flow@alpha memory clear --namespace "swarm-task-*" --older-than 24h

# Verify memory operations:
npx claude-flow@alpha memory store "test-key" "test-value"
npx claude-flow@alpha memory retrieve "test-key"

# If persistent issues, restart memory service:
# (Memory is ephemeral and will be recreated)
```

#### 7. Test Failures During QA

**Symptoms:**
```bash
/task-qa --issue 42
# Test Coverage: 45% (required: 80%) ✗
```

**Causes:**
- Incomplete test suite
- Tests not generated properly
- Coverage calculation error

**Solutions:**

```bash
# Review test files:
/task-status --issue 42 --verbose

# Manually trigger test agent:
# Create a follow-up task:
/task-create --title "Improve test coverage for #42" \
             --labels "testing,follow-up"

# Run local tests to verify:
npm test -- --coverage
```

#### 8. PR Creation Fails

**Symptoms:**
```bash
/task-complete --issue 42
# Error: No commits found for branch
```

**Causes:**
- No changes committed
- Branch not pushed
- Git configuration issues

**Solutions:**

```bash
# Check git status:
git status

# View commits:
git log --oneline

# If no commits, agents may have failed
# Check task status for errors:
/task-status --issue 42 --verbose

# Manually commit and retry:
git add .
git commit -m "Complete task #42"
git push origin feature-branch
/task-complete --issue 42
```

#### 9. Slow Performance

**Symptoms:**
```
Task execution unusually slow
Expected: 30m, Actual: 2h+
```

**Causes:**
- Too many parallel tasks
- Resource constraints
- Network latency
- Inefficient GOAP plan

**Solutions:**

```bash
# Check active tasks:
/task-status --filter in-progress

# Limit parallel tasks to 2-3
# Wait for current tasks to complete

# Monitor system resources:
top

# Check GOAP plan efficiency:
/task-status --issue 42 --verbose
# Review "Cost tracking" section

# Consider simpler topology:
/task-create --title "Task" --topology star  # Instead of mesh
```

#### 10. Neural Training Errors

**Symptoms:**
```
Warning: Failed to train neural pattern
Pattern: [pattern-name]
```

**Causes:**
- Insufficient training data
- Pattern already exists
- Training service unavailable

**Solutions:**

```bash
# Neural training is optional
# System will continue without it

# Check existing patterns:
npx claude-flow@alpha neural patterns

# Clear old patterns if needed:
npx claude-flow@alpha neural clear

# Neural features require enhanced coordination:
# Verify ruv-swarm or flow-nexus MCP:
claude mcp list
```

### Diagnostic Commands

```bash
# System health check
npx claude-flow@alpha --version
gh --version
node --version
npm --version

# Claude Flow diagnostics
npx claude-flow@alpha sparc modes
npx claude-flow@alpha memory list
npx claude-flow@alpha neural status

# GitHub connectivity
gh auth status
gh repo view

# Memory inspection
npx claude-flow@alpha memory list --namespace "swarm-*"
npx claude-flow@alpha memory search "task-"

# Lock inspection
npx claude-flow@alpha memory list --namespace "lock/*"
```

### Getting Help

```bash
# Claude Flow documentation
npx claude-flow@alpha --help

# GitHub CLI help
gh help

# Task Sentinel issues
# https://github.com/yourusername/Task-Sentinel/issues

# Claude Code documentation
# https://docs.anthropic.com/claude-code
```

---

## Advanced Features

### 1. Distributed Locking

**Purpose:** Prevents multiple agents from claiming the same task.

**How it works:**

```javascript
// When agent claims task #42:
{
  "lock": {
    "key": "lock/task-42",
    "holder": "auth-implementer-agent",
    "acquiredAt": "2025-10-30T11:00:00Z",
    "ttl": 30,  // seconds
    "autoRenew": true
  }
}

// Lock prevents concurrent claims:
// Agent A: Claims task #42 ✓ (acquires lock)
// Agent B: Claims task #42 ✗ (lock held by Agent A)
```

**Lock lifecycle:**

```
1. Claim attempt
   ↓
2. Check if lock exists
   ↓
3a. Lock exists → Claim fails
3b. Lock free → Acquire lock
   ↓
4. Perform work with periodic heartbeat
   ↓
5. Heartbeat renews lock (every 15s)
   ↓
6. On completion, release lock
   ↓
7. If no heartbeat for TTL, lock expires
```

**Manual lock operations:**

```bash
# View active locks
npx claude-flow@alpha memory list --namespace "lock/*"

# Force release lock (emergency only)
npx claude-flow@alpha memory delete "lock/task-42"

# Check lock status
npx claude-flow@alpha memory retrieve "lock/task-42"

# Output:
# {
#   "holder": "agent-id",
#   "acquiredAt": "2025-10-30T11:00:00Z",
#   "expiresAt": "2025-10-30T11:00:30Z"
# }
```

### 2. Heartbeat Monitoring

**Purpose:** Detect and recover from agent failures.

**Heartbeat mechanism:**

```javascript
// Agent sends heartbeat every 15 seconds:
{
  "heartbeat": {
    "taskId": 42,
    "agentId": "auth-implementer-agent",
    "timestamp": "2025-10-30T11:15:00Z",
    "status": "in-progress",
    "progress": 0.45,
    "currentStep": "3/6",
    "health": {
      "memory": "512MB",
      "cpu": "45%",
      "errors": 0
    }
  }
}
```

**Failure detection:**

```
Timeline:
11:00:00 - Agent claims task, heartbeat starts
11:00:15 - Heartbeat ✓ (OK)
11:00:30 - Heartbeat ✓ (OK)
11:00:45 - Heartbeat ✓ (OK)
11:01:00 - Heartbeat ✗ (MISSED)
11:01:15 - Heartbeat ✗ (MISSED)
11:01:30 - System marks agent as unresponsive
11:01:30 - Lock auto-expires
11:01:30 - Task becomes available for reclaim
```

**Monitoring heartbeats:**

```bash
# Check task heartbeat status
/task-status --issue 42

# Output includes:
# Heartbeat: Last seen 12s ago ✓  # Healthy
# Heartbeat: Last seen 45s ago ⚠  # Warning
# Heartbeat: Timeout (2m) ✗       # Failed
```

### 3. Memory Coordination

**Purpose:** Share context and decisions between agents.

**Memory namespaces:**

```javascript
// Task-specific memory
{
  "namespace": "swarm-task-42",
  "entries": {
    "researcher/auth-patterns": {
      "patterns": ["JWT", "OAuth2", "Session"],
      "recommendation": "JWT for stateless API",
      "timestamp": "2025-10-30T11:08:00Z"
    },
    "architect/schema-design": {
      "schema": {...},
      "decisions": ["Use PostgreSQL", "bcrypt for passwords"],
      "timestamp": "2025-10-30T11:20:00Z"
    },
    "coder/implementation-notes": {
      "files": ["auth.service.ts", "jwt.util.ts"],
      "patterns-used": ["Singleton", "Factory"],
      "timestamp": "2025-10-30T11:35:00Z"
    }
  }
}

// Cross-task memory
{
  "namespace": "project-wide",
  "entries": {
    "patterns/authentication": {
      "preferred": "JWT",
      "library": "jsonwebtoken",
      "learned-from": ["task-42", "task-38", "task-27"]
    },
    "conventions/api-design": {
      "style": "RESTful",
      "versioning": "/api/v1/",
      "error-format": "RFC7807"
    }
  }
}
```

**Memory operations:**

```bash
# Store memory
npx claude-flow@alpha memory store \
  "swarm-task-42/researcher/auth-patterns" \
  '{"recommendation": "JWT"}'

# Retrieve memory
npx claude-flow@alpha memory retrieve \
  "swarm-task-42/researcher/auth-patterns"

# Search memory
npx claude-flow@alpha memory search "auth"

# List all entries
npx claude-flow@alpha memory list

# Delete old entries
npx claude-flow@alpha memory delete \
  "swarm-task-42/researcher/auth-patterns"

# Clear namespace
npx claude-flow@alpha memory clear --namespace "swarm-task-42"
```

**Cross-agent coordination:**

```javascript
// Agent A (researcher) stores findings:
memory.store("swarm-task-42/patterns", {
  "authentication": "JWT recommended",
  "reasons": ["Stateless", "Scalable", "Industry standard"]
});

// Agent B (architect) reads findings:
const patterns = memory.retrieve("swarm-task-42/patterns");
// Uses JWT recommendation in design

// Agent C (coder) reads design:
const design = memory.retrieve("swarm-task-42/architect/schema");
// Implements based on design decisions
```

### 4. Neural Training Integration

**Purpose:** Learn from task execution to improve future performance.

**Pattern learning:**

```javascript
// After successful task completion:
{
  "neuralTraining": {
    "patterns": [
      {
        "name": "authentication-implementation",
        "type": "implementation-pattern",
        "confidence": 0.94,
        "components": {
          "research": {
            "approach": "Compare industry standards",
            "timeSpent": "8m",
            "success": true
          },
          "design": {
            "approach": "Schema-first design",
            "patterns": ["JWT", "bcrypt"],
            "timeSpent": "12m",
            "success": true
          },
          "implementation": {
            "approach": "TDD with mocks",
            "testCoverage": 0.96,
            "timeSpent": "22m",
            "success": true
          }
        },
        "applicableTo": [
          "authentication",
          "authorization",
          "security-features"
        ],
        "successRate": 0.95,
        "averageTime": "42m",
        "qualityScore": 0.97
      }
    ]
  }
}
```

**Pattern application:**

```javascript
// New task: "Add OAuth2 authentication"
// System recognizes similar pattern:
{
  "patternMatch": {
    "pattern": "authentication-implementation",
    "confidence": 0.91,
    "recommendations": {
      "approach": "Reuse JWT pattern with OAuth2 extension",
      "estimatedTime": "35-45m (vs 60m from scratch)",
      "agents": ["researcher", "architect", "backend-dev", "tester"],
      "risks": ["OAuth2 provider configuration"],
      "testStrategy": "Similar to JWT tests + OAuth2 flow"
    }
  }
}
```

**Training commands:**

```bash
# View learned patterns
npx claude-flow@alpha neural patterns

# Output:
# Learned Patterns (12):
# 1. authentication-implementation (Confidence: 94%)
# 2. api-endpoint-creation (Confidence: 89%)
# 3. database-schema-design (Confidence: 91%)
# ...

# Train from specific task
npx claude-flow@alpha neural train \
  --task-id 42 \
  --pattern-name "custom-auth-pattern"

# Clear patterns
npx claude-flow@alpha neural clear

# Export patterns
npx claude-flow@alpha neural export \
  --output patterns.json
```

### 5. Session Management

**Purpose:** Resume work across sessions.

**Session export:**

```javascript
// At task completion or interruption:
{
  "session": {
    "id": "sess-42-20251030110000",
    "taskId": 42,
    "startTime": "2025-10-30T11:00:00Z",
    "endTime": "2025-10-30T12:07:00Z",
    "state": {
      "goapPlan": {...},
      "completedSteps": [1, 2, 3, 4, 5, 6],
      "agentStates": {...},
      "memorySnapshot": {...}
    },
    "metrics": {
      "totalTime": "67m",
      "tokensUsed": 25150,
      "apiCalls": 89,
      "filesChanged": 12
    },
    "artifacts": {
      "branch": "feature/auth-42",
      "commits": ["abc123", "def456", "ghi789"],
      "prNumber": 156
    }
  }
}
```

**Session restoration:**

```bash
# List available sessions
npx claude-flow@alpha hooks session-list

# Restore session
npx claude-flow@alpha hooks session-restore \
  --session-id "sess-42-20251030110000"

# Output:
# ✓ Session restored
# Task: #42 (Implement authentication)
# Progress: 100% (Step 6/6 completed)
# Branch: feature/auth-42
# Memory restored: 15 entries
# Agents ready: 6
#
# Continue from last checkpoint:
# Last action: Tests completed
# Next action: Create pull request
```

### 6. Performance Optimization

**Automatic optimization:**

```javascript
// System learns optimal configurations:
{
  "optimization": {
    "topology": {
      "taskType": "authentication",
      "learned": {
        "bestTopology": "hierarchical",
        "reason": "Better for sequential dependency tasks",
        "performanceGain": "15% faster than mesh"
      }
    },
    "agentAllocation": {
      "taskType": "api-implementation",
      "learned": {
        "optimalAgents": 6,
        "breakdown": {
          "researcher": 1,
          "architect": 1,
          "backend-dev": 2,
          "tester": 1,
          "reviewer": 1
        },
        "reason": "2 backend-dev agents handle parallel implementation"
      }
    },
    "parallelization": {
      "taskType": "full-stack-feature",
      "learned": {
        "parallelGroups": [
          ["backend-api", "database-schema"],
          ["frontend-ui", "api-integration"],
          ["testing", "documentation"]
        ],
        "speedup": "2.3x vs sequential"
      }
    }
  }
}
```

**Manual optimization:**

```bash
# Analyze task performance
npx claude-flow@alpha performance analyze --task-id 42

# Output:
# Performance Analysis: Task #42
# ===============================
#
# Execution Time: 67m
# Baseline Estimate: 90m
# Performance: 25% faster than estimate ✓
#
# Agent Utilization:
# • researcher: 8m (12%) - Optimal
# • architect: 18m (27%) - Optimal
# • backend-dev: 22m (33%) - High but efficient
# • coder: 11m (16%) - Optimal
# • tester: 6m (9%) - Could be parallelized more
# • cicd-engineer: 2m (3%) - Optimal
#
# Bottlenecks:
# • None detected
#
# Optimization Suggestions:
# 1. Consider 2 tester agents for faster test creation
# 2. Backend-dev and coder could overlap more
#
# Estimated improvement: 5-8 minutes with suggestions
```

### 7. Quality Gates

**Automatic quality checks:**

```javascript
// Before PR creation:
{
  "qualityGates": {
    "code": {
      "gate": "eslint",
      "status": "passed",
      "errors": 0,
      "warnings": 2,
      "threshold": "0 errors"
    },
    "tests": {
      "gate": "coverage",
      "status": "passed",
      "coverage": 0.965,
      "threshold": 0.80
    },
    "security": {
      "gate": "vulnerability-scan",
      "status": "passed",
      "critical": 0,
      "high": 0,
      "medium": 1,
      "threshold": "0 critical, 0 high"
    },
    "performance": {
      "gate": "benchmarks",
      "status": "passed",
      "regression": 0.042,
      "threshold": 0.10
    },
    "documentation": {
      "gate": "api-docs",
      "status": "passed",
      "coverage": 1.0,
      "threshold": 0.90
    }
  }
}
```

### 8. Rollback Support

**Automatic rollback on failure:**

```javascript
// If quality gate fails:
{
  "rollback": {
    "trigger": "test-coverage-below-threshold",
    "actions": [
      "Revert commit ghi789",
      "Restore previous GOAP step",
      "Respawn tester agent",
      "Increase test requirements"
    ],
    "newPlan": {
      "step": "5a: Improve test coverage",
      "cost": 2,
      "agent": "tester",
      "target": "90% coverage"
    }
  }
}
```

```bash
# Manual rollback
/task-rollback --issue 42 --to-step 4

# Output:
# ✓ Rolled back task #42 to step 4
#
# Reverted changes:
# • Removed commits: ghi789, jkl012
# • Restored state: Step 4 (Implementation complete)
# • Memory rolled back: 3 entries removed
#
# Current state:
# • Step: 4/6
# • Next: Write tests
# • Status: Ready to continue
```

---

## Best Practices

### 1. Task Creation
- **Clear titles:** Describe the task precisely
- **Appropriate priority:** Use priority scale consistently
- **Relevant labels:** Tag for easy filtering and search
- **Detailed descriptions:** Provide context and requirements

### 2. Workflow Management
- **One task at a time:** For simple tasks
- **Parallel for independent:** Run multiple independent tasks together
- **Sequential for dependent:** Complete prerequisites first
- **Monitor progress:** Check status regularly

### 3. Agent Coordination
- **Choose topology wisely:** Match topology to task complexity
- **Trust the system:** Let GOAP and OODA adapt
- **Review memory:** Check agent coordination via memory
- **Learn from patterns:** System improves over time

### 4. Quality Assurance
- **Always run QA:** Before completing tasks
- **Address warnings:** Fix issues before PR
- **Maintain coverage:** Keep tests at 80%+
- **Document changes:** Update docs with code

### 5. Performance
- **Limit parallel tasks:** 2-3 concurrent tasks max
- **Use appropriate agents:** Match agent to task type
- **Monitor resources:** Check system performance
- **Optimize workflows:** Learn from execution metrics

---

## Conclusion

Task Sentinel provides a powerful, intelligent task execution system that combines:
- **OODA Loop:** Adaptive decision-making
- **GOAP Planning:** Optimal action sequencing
- **Agent Coordination:** Specialized capabilities
- **Distributed Systems:** Locks, heartbeats, memory
- **Neural Learning:** Continuous improvement

Start with simple tasks to learn the system, then gradually explore advanced features for complex projects.

For more information:
- GitHub: https://github.com/yourusername/Task-Sentinel
- Claude Flow: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/yourusername/Task-Sentinel/issues

Happy automating! 🚀
