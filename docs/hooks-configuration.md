# Task Sentinel Hooks Configuration

## Overview

The `.claude/settings.json` file has been configured with Task Sentinel hooks that implement the OODA (Observe, Orient, Decide, Act) loop for autonomous task management.

## Hook Types Configured

### 1. SessionStart Hook
**Purpose**: Restore context and resume in-progress tasks when a new session starts

**Trigger**: When Claude Code session begins

**Command**:
```bash
npx claude-flow@alpha hooks session-restore \
  --session-id 'task-sentinel-session' \
  --restore-context true \
  --resume-in-progress-tasks true \
  --memory-namespace 'task-sentinel/active'
```

**Behavior**:
- Restores previous session context from memory
- Resumes any tasks that were in progress
- Loads active task state from memory namespace

---

### 2. PreToolUse Hook - Task Claim Validation
**Purpose**: Validate task dependencies and worker availability before claiming a task

**Trigger**: Before executing task claim operations (matcher: `task-sentinel-claim`)

**Command**:
```bash
npx claude-flow@alpha hooks pre-task \
  --description 'task-claim-validation' \
  --validate-dependencies true \
  --check-worker-availability true
```

**Behavior**:
- Validates that task dependencies are met
- Checks if worker resources are available
- Prevents invalid task claims

---

### 3. PostToolUse Hook - Task Claim Initialization
**Purpose**: Initialize heartbeat monitoring and swarm memory after claiming a task

**Trigger**: After executing task claim operations (matcher: `task-sentinel-claim`)

**Command**:
```bash
npx claude-flow@alpha hooks post-task \
  --task-id 'task-claim' \
  --initialize-heartbeat true \
  --memory-key 'task-sentinel/active/current-task' \
  --memory-namespace 'ooda-loop'
```

**Behavior**:
- Starts heartbeat monitoring for the claimed task
- Initializes swarm memory with task details
- Updates memory with current task information

---

### 4. PostToolUse Hook - Task Completion
**Purpose**: Cleanup memory, close issue, and export metrics after task completion

**Trigger**: After completing a task (matcher: `task-sentinel-complete`)

**Command**:
```bash
npx claude-flow@alpha hooks post-task \
  --task-id 'task-complete' \
  --cleanup-memory true \
  --close-issue true \
  --export-metrics true \
  --memory-namespace 'task-sentinel/active'
```

**Behavior**:
- Cleans up task-specific memory entries
- Closes the GitHub issue
- Exports performance metrics
- Removes task from active namespace

---

### 5. PostToolUse Hook - Heartbeat Update
**Purpose**: Update GitHub issue with progress heartbeat to prevent stale locks

**Trigger**: Periodically during task execution (matcher: `task-sentinel-heartbeat`)

**Command**:
```bash
npx claude-flow@alpha memory retrieve \
  --key 'task-sentinel/current-task' \
  --namespace 'ooda-loop' | \
jq -r '.issue_number // empty' | \
xargs -I {} sh -c 'if [ -n "{}" ]; then \
  gh issue comment {} --body "[HEARTBEAT] Task in progress - $(date -Iseconds)"; \
fi'
```

**Behavior**:
- Retrieves current task from memory
- Posts heartbeat comment to GitHub issue
- Includes ISO8601 timestamp
- Prevents 10-minute stale lock threshold

---

### 6. Notification Hook - Task Observation
**Purpose**: Observe GitHub Issues for ready tasks (OODA loop "Observe" phase)

**Trigger**: Notification events (matcher: `task-sentinel-observe`)

**Command**:
```bash
gh issue list \
  --repo $(git config --get remote.origin.url | sed 's|.*github.com[:/]\\(.*\\)\\.git|\\1|') \
  --label ready \
  --label queued \
  --state open \
  --json number,title,labels,assignees 2>/dev/null | \
jq '.[] | select(.assignees | length == 0)' | \
npx claude-flow@alpha memory store \
  --key 'task-sentinel/available-tasks' \
  --namespace 'ooda-loop' || true
```

**Behavior**:
- Lists GitHub issues with `ready` and `queued` labels
- Filters for unassigned issues
- Stores available tasks in memory
- Timeout: 10 seconds
- Fails gracefully if repository not configured

---

### 7. SessionEnd Hook
**Purpose**: Generate summary and persist state when session ends

**Trigger**: When Claude Code session ends

**Command**:
```bash
npx claude-flow@alpha hooks session-end \
  --generate-summary true \
  --persist-state true \
  --export-metrics true \
  --memory-namespace 'task-sentinel/active'
```

**Behavior**:
- Generates session summary
- Persists current state for future restoration
- Exports metrics for analysis
- Saves active task state

---

## Memory Namespaces

### `task-sentinel/active`
Stores currently active task information:
- Current task details
- Task progress state
- Heartbeat status
- Worker assignments

### `ooda-loop`
Stores OODA loop state:
- Available tasks (Observe)
- Task analysis (Orient)
- Decision history (Decide)
- Action logs (Act)

---

## Usage Examples

### Claiming a Task
```bash
# This will trigger pre-task-claim and post-task-claim hooks
gh issue edit <ISSUE_NUMBER> --add-assignee @me --add-label in-progress
```

### Sending Heartbeat
```bash
# This will trigger task-heartbeat hook
# Can be invoked manually or automatically via timer
npx claude-flow@alpha hooks trigger --matcher task-sentinel-heartbeat
```

### Completing a Task
```bash
# This will trigger post-task-complete hook
gh issue close <ISSUE_NUMBER> --comment "Task completed successfully"
```

### Observing Available Tasks
```bash
# This will trigger task-sentinel-observe hook
npx claude-flow@alpha hooks trigger --matcher task-sentinel-observe
```

---

## Integration with Claude Flow

All hooks integrate with Claude Flow's memory and coordination system:

1. **Memory Management**: Uses `memory store` and `memory retrieve` commands
2. **Session Persistence**: Leverages `session-restore` and `session-end` hooks
3. **Task Coordination**: Integrates with `pre-task` and `post-task` hooks
4. **Metrics Tracking**: Exports metrics via `--export-metrics` flag

---

## Troubleshooting

### Hook Not Triggering
- Verify hook matcher patterns in `.claude/settings.json`
- Check that `CLAUDE_FLOW_HOOKS_ENABLED=true` in env settings
- Review Claude Code logs for hook execution errors

### Memory Issues
- Verify memory namespace exists: `npx claude-flow@alpha memory list --namespace ooda-loop`
- Clear stale memory: `npx claude-flow@alpha memory clear --namespace task-sentinel/active`

### GitHub Integration Issues
- Ensure `gh` CLI is authenticated: `gh auth status`
- Verify repository remote URL: `git config --get remote.origin.url`
- Check GitHub API rate limits: `gh api rate_limit`

---

## Architecture Decisions

### Why Custom Matchers?
Custom matchers (`task-sentinel-claim`, `task-sentinel-complete`, etc.) allow fine-grained control over when hooks execute, separate from standard tool matchers like `Bash` or `Write`.

### Why Memory Namespaces?
Separate namespaces (`task-sentinel/active`, `ooda-loop`) prevent memory pollution and allow for clean separation of concerns between active task state and OODA loop coordination.

### Why Timeout on Observation?
The 10-second timeout on task observation prevents blocking operations if GitHub API is slow or unavailable, ensuring the system remains responsive.

---

## Future Enhancements

1. **Interval Hooks**: Once Claude Code supports interval hooks, migrate heartbeat to automatic 5-minute intervals
2. **Swarm Coordination**: Add hooks for multi-agent task coordination
3. **Neural Pattern Learning**: Train patterns from successful task completions
4. **Adaptive Scheduling**: Use metrics to optimize task scheduling decisions

---

## Related Documentation

- `/workspaces/Task-Sentinel/CLAUDE.md` - Claude Code configuration and agent patterns
- `/workspaces/Task-Sentinel/README.md` - Task Sentinel system overview
- `/workspaces/Task-Sentinel/docs/architecture.md` - System architecture (if exists)

---

**Last Updated**: 2025-10-30
**Configuration File**: `/workspaces/Task-Sentinel/.claude/settings.json`
