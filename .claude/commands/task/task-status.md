Check comprehensive task status, progress, and coordination state for Task Sentinel distributed orchestration.

**Task Status Query Protocol:**

1. **Retrieve GitHub Issue Status:**
   ```bash
   # Get issue details
   gh issue view [issue-number] --json number,title,state,assignees,labels,body,comments,createdAt,updatedAt
   ```

2. **Query Distributed Memory State:**
   ```bash
   # Retrieve task metadata
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/tasks/[issue-number]"

   # Get OODA loop state
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/observations/[issue-number]"

   # Get execution plan
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/plans/[issue-number]"

   # Check heartbeat status
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/heartbeat/[issue-number]"
   ```

3. **Check Distributed Lock:**
   ```bash
   # Verify task claim/lock status
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/locks/[issue-number]"
   ```

4. **Query Agent Coordination State:**
   ```bash
   # Get swarm status if task is in-progress
   mcp__claude-flow__swarm_status

   # Get agent metrics
   mcp__claude-flow__agent_metrics

   # Check active tasks
   mcp__claude-flow__task_status --detailed true
   ```

5. **Display Comprehensive Status Report:**

   Format output as structured report:

   ```
   ═══════════════════════════════════════════════════════════
   TASK STATUS REPORT - Issue #[number]
   ═══════════════════════════════════════════════════════════

   📋 TASK INFORMATION
   ───────────────────────────────────────────────────────────
   Title:          [title]
   Priority:       [priority] / 10000
   Status:         [queued|claimed|in-progress|qa|completed]
   Created:        [timestamp]
   Last Updated:   [timestamp]

   👤 ASSIGNMENT
   ───────────────────────────────────────────────────────────
   Assigned To:    [worker-id or "Unassigned"]
   Claimed At:     [timestamp or "N/A"]
   Lock TTL:       [remaining seconds or "N/A"]

   🔄 OODA LOOP STATE
   ───────────────────────────────────────────────────────────
   Current Phase:  [observe|orient|decide|act]
   Progress:       [percentage]% complete

   Phase Details:
     ✓ OBSERVE:  [completed|in-progress|pending]
     ✓ ORIENT:   [completed|in-progress|pending]
     ✓ DECIDE:   [completed|in-progress|pending]
     → ACT:      [completed|in-progress|pending]

   🤖 ACTIVE AGENTS
   ───────────────────────────────────────────────────────────
   [if task in-progress:]
     • [agent-type-1]: [status] - [current-activity]
     • [agent-type-2]: [status] - [current-activity]
     • [agent-type-3]: [status] - [current-activity]
   [if no agents:]
     No active agents (task not yet claimed)

   💓 HEARTBEAT
   ───────────────────────────────────────────────────────────
   Status:         [active|inactive|stalled]
   Last Beat:      [timestamp or "N/A"]
   Interval:       [seconds or "N/A"]
   Health:         [healthy|warning|critical]

   📊 PROGRESS TRACKING
   ───────────────────────────────────────────────────────────
   Milestones:
     [milestone-1]: [completed|in-progress|pending]
     [milestone-2]: [completed|in-progress|pending]
     [milestone-3]: [completed|in-progress|pending]

   Next Milestone: [description]
   ETA:           [estimated-completion or "Unknown"]

   🚧 BLOCKERS & ISSUES
   ───────────────────────────────────────────────────────────
   [if blockers exist:]
     ⚠ [blocker-1-description]
     ⚠ [blocker-2-description]
   [if no blockers:]
     ✓ No blockers reported

   📝 RECENT ACTIVITY
   ───────────────────────────────────────────────────────────
   [last 3-5 significant events from GitHub comments and memory]

   🔗 LINKS
   ───────────────────────────────────────────────────────────
   Issue URL:      [github-url]
   Related PRs:    [pr-urls or "None"]

   ═══════════════════════════════════════════════════════════
   ```

6. **Health Check Warnings:**
   - If heartbeat stalled > 5 minutes: "⚠ WARNING: Heartbeat stalled, task may be stuck"
   - If lock expired: "⚠ WARNING: Distributed lock expired, task may be orphaned"
   - If no progress in > 30 minutes: "⚠ WARNING: No progress detected, consider reassignment"

**Example Usage:**
```bash
/task-status 123
```

**Quick Status (Alternative Format):**
If user wants brief status only:
```
Task #[number]: [title]
Status: [status] | Progress: [%] | Phase: [ooda-phase]
Worker: [worker-id or "Unassigned"]
Agents: [count] active | Heartbeat: [active|inactive]
```

**Note:** All status queries are read-only and don't modify task state.
