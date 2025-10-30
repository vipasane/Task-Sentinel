# Task Sentinel Hooks - Architecture

## System Overview

Task Sentinel uses Claude Flow hooks to implement an autonomous OODA (Observe, Orient, Decide, Act) loop for GitHub issue-based task management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code Session                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SessionStart Hook                                               │
│  ├─ session-restore                                              │
│  ├─ Load context from memory                                     │
│  └─ Resume in-progress tasks                                     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              OODA Loop (Continuous)                       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  1. OBSERVE                                               │  │
│  │     └─ Notification Hook: task-sentinel-observe          │  │
│  │        ├─ gh issue list (ready, queued, unassigned)      │  │
│  │        └─ Store in memory: ooda-loop namespace           │  │
│  │                                                           │  │
│  │  2. ORIENT                                                │  │
│  │     └─ PreToolUse Hook: task-sentinel-claim              │  │
│  │        ├─ Validate task dependencies                     │  │
│  │        ├─ Check worker availability                      │  │
│  │        └─ Prevent invalid claims                         │  │
│  │                                                           │  │
│  │  3. DECIDE                                                │  │
│  │     └─ PostToolUse Hook: task-sentinel-claim             │  │
│  │        ├─ Initialize heartbeat monitoring                │  │
│  │        ├─ Store task in swarm memory                     │  │
│  │        └─ Update ooda-loop namespace                     │  │
│  │                                                           │  │
│  │  4. ACT                                                   │  │
│  │     ├─ Execute task work                                 │  │
│  │     ├─ PostToolUse Hook: task-sentinel-heartbeat         │  │
│  │     │  └─ gh issue comment with timestamp                │  │
│  │     └─ PostToolUse Hook: task-sentinel-complete          │  │
│  │        ├─ Cleanup memory                                 │  │
│  │        ├─ gh issue close                                 │  │
│  │        └─ Export metrics                                 │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  SessionEnd Hook                                                 │
│  ├─ Generate session summary                                     │
│  ├─ Persist state to memory                                      │
│  └─ Export performance metrics                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Hook Execution Flow

### Session Lifecycle

```
┌────────────┐
│  Session   │
│   Start    │
└──────┬─────┘
       │
       ▼
┌────────────────────────────────────┐
│  SessionStart Hook                 │
│  ─────────────────────────────────│
│  • Restore context from memory     │
│  • Resume in-progress tasks        │
│  • Load task-sentinel/active state │
└────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  OODA Loop (continuous)            │
│  ─────────────────────────────────│
│  • Observe → Orient → Decide → Act│
│  • Heartbeat monitoring            │
│  • Task completion                 │
└────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  SessionEnd Hook                   │
│  ─────────────────────────────────│
│  • Generate summary                │
│  • Persist state                   │
│  • Export metrics                  │
└────────────────────────────────────┘
       │
       ▼
┌────────────┐
│  Session   │
│    End     │
└────────────┘
```

## Memory Architecture

### Namespace Structure

```
Memory Root
├── ooda-loop/
│   ├── available-tasks          # List of ready, unassigned tasks
│   ├── current-task             # Currently executing task
│   ├── task-analysis            # Task complexity analysis
│   ├── decision-history         # Past decisions and outcomes
│   └── action-logs              # Executed actions and results
│
└── task-sentinel/
    └── active/
        ├── current-task         # Active task details
        ├── heartbeat-status     # Last heartbeat timestamp
        ├── worker-assignment    # Current worker info
        └── progress-state       # Task progress percentage
```

### Data Flow

```
GitHub Issues
     │
     ▼
┌─────────────────┐
│  Observe Hook   │  ─────┐
└─────────────────┘       │
                          ▼
                   ┌──────────────┐
                   │    Memory    │
                   │  ooda-loop/  │
                   │ available-   │
                   │   tasks      │
                   └──────────────┘
                          │
                          ▼
┌─────────────────┐       │
│  Orient Hook    │  ◄────┘
│  (Pre-Claim)    │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Decide Hook    │  ─────┐
│  (Post-Claim)   │       │
└─────────────────┘       │
                          ▼
                   ┌──────────────┐
                   │    Memory    │
                   │task-sentinel/│
                   │   active/    │
                   │current-task  │
                   └──────────────┘
                          │
                          ▼
┌─────────────────┐       │
│  Act Hook       │  ◄────┘
│  (Heartbeat)    │
└─────────────────┘
     │
     ▼
GitHub Issues
(heartbeat comment)
```

## Hook Integration Points

### Claude Flow Integration

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Flow                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Memory System                                              │
│  ├─ memory store    (write to namespace)                   │
│  ├─ memory retrieve (read from namespace)                  │
│  ├─ memory list     (enumerate keys)                       │
│  └─ memory clear    (delete namespace)                     │
│                                                             │
│  Hook System                                                │
│  ├─ hooks pre-task   (before task execution)               │
│  ├─ hooks post-task  (after task execution)                │
│  ├─ hooks pre-edit   (before file edit)                    │
│  ├─ hooks post-edit  (after file edit)                     │
│  ├─ hooks session-restore (restore session)                │
│  └─ hooks session-end     (persist session)                │
│                                                             │
│  Metrics System                                             │
│  ├─ Performance tracking                                    │
│  ├─ Token usage monitoring                                  │
│  └─ Task completion analytics                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Task Sentinel Hooks                       │
└─────────────────────────────────────────────────────────────┘
```

### GitHub CLI Integration

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub CLI (gh)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Issue Operations                                           │
│  ├─ gh issue list     (list issues with filters)           │
│  ├─ gh issue view     (view issue details)                 │
│  ├─ gh issue edit     (modify issue, add labels)           │
│  ├─ gh issue comment  (add comment with heartbeat)         │
│  └─ gh issue close    (close completed issue)              │
│                                                             │
│  Repository Detection                                       │
│  └─ git config --get remote.origin.url                     │
│     └─ Extract owner/repo from URL                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Task Sentinel Hooks                       │
└─────────────────────────────────────────────────────────────┘
```

## Hook Configuration Structure

### settings.json Schema

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "task-sentinel-session",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow@alpha hooks session-restore ..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "task-sentinel-claim",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow@alpha hooks pre-task ..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "task-sentinel-claim",
        "hooks": [...]
      },
      {
        "matcher": "task-sentinel-complete",
        "hooks": [...]
      },
      {
        "matcher": "task-sentinel-heartbeat",
        "hooks": [...]
      }
    ],
    "Notification": [
      {
        "matcher": "task-sentinel-observe",
        "hooks": [
          {
            "type": "command",
            "command": "gh issue list ...",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow@alpha hooks session-end ..."
          }
        ]
      }
    ]
  }
}
```

## Error Handling & Resilience

### Graceful Degradation

```
GitHub API Call
     │
     ├─ Success ──────────► Store in Memory
     │
     ├─ Timeout (10s) ────► Skip, Continue
     │
     └─ Error ─────────────► Log, Continue (|| true)
```

### Retry Strategy

```
Hook Execution
     │
     ├─ Success ──────────► Continue
     │
     ├─ Transient Error ──► Retry (3x)
     │
     └─ Persistent Error ─► Log, Skip
```

### Memory Fallback

```
Memory Retrieve
     │
     ├─ Found ────────────► Use Value
     │
     ├─ Not Found ────────► Use Default
     │
     └─ Error ────────────► Empty Result
```

## Performance Characteristics

### Execution Times

| Hook | Typical Time | Timeout |
|------|-------------|---------|
| SessionStart | <1s | N/A |
| PreToolUse (claim) | <500ms | N/A |
| PostToolUse (claim) | <500ms | N/A |
| PostToolUse (complete) | <1s | N/A |
| PostToolUse (heartbeat) | <2s | N/A |
| Notification (observe) | <5s | 10s |
| SessionEnd | <2s | N/A |

### Memory Usage

| Namespace | Typical Size | Max Size |
|-----------|-------------|----------|
| ooda-loop | <100KB | 1MB |
| task-sentinel/active | <50KB | 500KB |

### GitHub API Calls

| Hook | API Calls | Rate Limit Impact |
|------|-----------|-------------------|
| Observe | 1-2 | Low |
| Claim | 0 | None |
| Heartbeat | 1 | Low |
| Complete | 1-2 | Low |

## Security Considerations

### Permissions Required

```yaml
GitHub:
  - issues:read     # List and view issues
  - issues:write    # Comment, edit, close issues

Claude Flow:
  - memory:read     # Retrieve task state
  - memory:write    # Store task state
  - hooks:execute   # Run hooks

Git:
  - config:read     # Get remote URL
```

### Sensitive Data Handling

```
✓ No credentials stored in memory
✓ No secrets in hook commands
✓ Repository URL sanitized
✗ Issue content may contain sensitive info
  └─ Solution: Use private repositories
```

## Scalability

### Single Repository

```
✓ Handles 100+ issues efficiently
✓ Supports multiple concurrent tasks
✓ Memory bounded by namespace limits
```

### Multi-Repository

```
✓ Repository-specific configuration
✓ Separate memory namespaces
✓ Independent OODA loops
```

### Multi-Agent Coordination

```
✓ Swarm memory coordination
✓ Distributed task claims
✓ Consensus-based decisions
```

## Future Architecture Enhancements

### Planned Improvements

1. **Native Interval Hooks**
   - Migrate to Claude Code interval support
   - Automatic 5-minute heartbeats
   - Scheduled observation cycles

2. **Distributed Consensus**
   - Multi-agent task coordination
   - Byzantine fault tolerance
   - Raft-based leader election

3. **Neural Pattern Learning**
   - Learn from successful completions
   - Adaptive task scheduling
   - Predictive dependency resolution

4. **Metrics Dashboard**
   - Real-time visualization
   - Performance analytics
   - Bottleneck detection

---

## Related Documentation

- `/workspaces/Task-Sentinel/.claude/settings.json` - Configuration file
- `/workspaces/Task-Sentinel/docs/hooks-configuration.md` - Detailed hook docs
- `/workspaces/Task-Sentinel/docs/hooks-summary.md` - Implementation summary
- `/workspaces/Task-Sentinel/docs/hooks-quick-reference.md` - Quick reference

---

**Last Updated**: 2025-10-30
**Architecture Version**: 1.0.0
