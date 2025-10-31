Claim and execute task using OODA loop methodology with distributed agent coordination.

**Task Claiming Protocol:**

1. **Claim Task (Acquire Distributed Lock):**
   ```bash
   # Self-assign GitHub issue
   gh issue edit [issue-number] --add-assignee "@me"

   # Update status label
   gh issue edit [issue-number] --remove-label "status:queued" --add-label "status:claimed"

   # Store claim in distributed memory with TTL
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/locks/[issue-number]" \
     --value '{"worker": "[worker-id]", "claimed_at": "[timestamp]", "ttl": 3600}' \
     --ttl 3600
   ```

2. **OODA LOOP EXECUTION:**

   **OBSERVE Phase:**
   - Retrieve task metadata from memory
   - Analyze GitHub issue description and acceptance criteria
   - Check codebase context and dependencies
   - Review related PRs and past similar tasks
   ```bash
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/tasks/[issue-number]"

   # Spawn observer agent
   Task("Observer Agent", "Analyze task requirements, gather context, identify dependencies. Store observations in memory at task-sentinel/observations/[issue-number]", "researcher")
   ```

   **ORIENT Phase:**
   - Synthesize observations into actionable understanding
   - Identify required agents and resources
   - Plan execution strategy with goal-planner
   - Define success metrics
   ```bash
   # Spawn goal planner agent
   Task("Goal Planner", "Create execution plan based on observations. Define milestones, agent roles, and dependencies. Store plan in memory at task-sentinel/plans/[issue-number]", "planner")
   ```

   **DECIDE Phase:**
   - Select optimal execution approach
   - Allocate agents to work streams
   - Set up coordination topology (mesh/hierarchical)
   - Initialize monitoring and heartbeat
   ```bash
   # Initialize swarm coordination
   mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 8 }

   # Update task status
   gh issue edit [issue-number] --remove-label "status:claimed" --add-label "status:in-progress"
   ```

   **ACT Phase:**
   - Spawn specialized agents via Task tool (concurrent execution)
   - Implement solution with coordination hooks
   - Run tests and validation
   - Prepare artifacts (code, tests, docs)
   ```bash
   # Spawn execution agents concurrently
   [Single Message]:
     Task("Backend Developer", "Implement core functionality. Use hooks for coordination. Store progress in memory.", "backend-dev")
     Task("Test Engineer", "Write comprehensive tests. Coordinate with implementation. Target 90% coverage.", "tester")
     Task("Code Reviewer", "Review code quality, security, performance. Document findings in memory.", "reviewer")
     Task("Documentation Writer", "Create API docs and usage examples. Check memory for decisions.", "coder")
   ```

3. **Start Heartbeat Monitoring:**
   ```bash
   # Initialize heartbeat in background with retry logic
   if ! npx claude-flow@alpha hooks heartbeat-start \
     --task-id "[issue-number]" \
     --interval 60 \
     --callback "update-task-progress"; then
     echo "❌ Heartbeat failed to start, retrying..."
     sleep 2
     npx claude-flow@alpha hooks heartbeat-start \
       --task-id "[issue-number]" \
       --interval 60 \
       --callback "update-task-progress" || {
       echo "❌ Heartbeat startup failed after retry"
       # Update task status to failed
       gh issue edit "[issue-number]" --remove-label "status:in-progress" --add-label "status:error"
       gh issue comment "[issue-number]" --body "⚠️ **Heartbeat Monitor Failed**

Unable to start heartbeat monitoring after retry.
Task status updated to error. Manual intervention required."
       exit 1
     }
   fi
   echo "✅ Heartbeat monitoring active"
   ```

4. **Update Progress Tracking:**
   Store OODA loop state and progress:
   ```bash
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/tasks/[issue-number]" \
     --value '{
       "status": "in-progress",
       "ooda_phase": "act",
       "claimed_by": "[worker-id]",
       "claimed_at": "[timestamp]",
       "agents": ["backend-dev", "tester", "reviewer", "coder"],
       "progress": 25,
       "next_milestone": "[description]"
     }'
   ```

5. **Coordinate with GitHub:**
   Add progress comment to issue:
   ```bash
   gh issue comment [issue-number] --body "✅ Task claimed and OODA loop initiated

   **Current Phase:** ACT
   **Agents Deployed:** Backend Dev, Tester, Reviewer, Documentation
   **Topology:** Mesh coordination
   **Progress:** Implementation in progress
   **Heartbeat:** Active (60s interval)

   Next update in ~15 minutes."
   ```

**Execution Flow:**
1. Claim task → Acquire distributed lock
2. OBSERVE → Gather context and requirements
3. ORIENT → Plan strategy with goal-planner
4. DECIDE → Initialize swarm and allocate agents
5. ACT → Execute with concurrent agents and hooks
6. Monitor → Track progress via heartbeat

**Note:** All agents spawned via Task tool automatically use coordination hooks for memory sharing and progress tracking.
