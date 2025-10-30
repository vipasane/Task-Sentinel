Mark task complete with evidence validation, artifact collection, and distributed resource cleanup.

**Task Completion Protocol:**

1. **Validate Completion Prerequisites:**
   ```bash
   # Check task has passed QA
   gh issue view [issue-number] --json labels | grep "status:qa-passed"

   # Verify PR is merged or ready for merge
   gh pr view [pr-number] --json state,mergeable,mergedAt

   # Retrieve QA results from memory
   npx claude-flow@alpha hooks memory-retrieve \
     --key "task-sentinel/qa/[issue-number]/results"
   ```

2. **Collect Completion Evidence:**

   **Required Artifacts:**
   - ✅ Merged PR number and URL
   - ✅ Test results and coverage report
   - ✅ QA analysis score and findings
   - ✅ Performance benchmarks (if applicable)
   - ✅ Documentation updates
   - ✅ Security scan results

   ```bash
   # Gather evidence from various sources
   EVIDENCE=$(cat <<EOF
   {
     "pr_number": [pr-number],
     "pr_url": "[pr-url]",
     "merged_at": "[timestamp]",
     "test_coverage": {
       "lines": [%],
       "functions": [%],
       "branches": [%]
     },
     "qa_score": [score],
     "security_status": "passed",
     "performance_metrics": {
       "load_time": "[ms]",
       "bundle_size": "[KB]"
     },
     "documentation": "complete",
     "artifacts": [
       "test-results.json",
       "coverage-report.html",
       "qa-analysis.json",
       "performance-benchmarks.json"
     ]
   }
   EOF
   )
   ```

3. **Post Completion Comment:**

   Add comprehensive completion summary to GitHub issue:
   ```bash
   gh issue comment [issue-number] --body "## ✅ Task Completed Successfully

   **Completion Time:** [timestamp]
   **Total Duration:** [hours/days]
   **OODA Cycles:** [count]

   ---

   ### 📦 Delivery Artifacts

   **Pull Request:** #[pr-number]
   - **Status:** ✅ Merged
   - **Merged At:** [timestamp]
   - **Commits:** [count]
   - **Files Changed:** [count]

   **Test Results:**
   - **Coverage:** [%] lines, [%] functions, [%] branches
   - **Tests Passed:** [passed]/[total]
   - **Test Duration:** [seconds]

   **Quality Assurance:**
   - **QA Score:** [score]/100 ✅
   - **Code Quality:** ✅ Passed
   - **Security Scan:** ✅ No vulnerabilities
   - **Performance:** ✅ Within thresholds

   ---

   ### 🎯 Acceptance Criteria
   [list each criterion from original issue with ✅ checkmark]

   ---

   ### 📊 Performance Metrics
   - **Load Time:** [ms]
   - **Bundle Size:** [KB] (Δ [+/-KB] from baseline)
   - **Memory Usage:** [MB]
   - **Build Time:** [seconds]

   ---

   ### 🤖 Agent Coordination
   **Agents Deployed:** [count]
   - [agent-1]: [contribution summary]
   - [agent-2]: [contribution summary]
   - [agent-3]: [contribution summary]

   **Topology:** [mesh|hierarchical]
   **Total Agent Hours:** [estimated hours]

   ---

   ### 📝 Documentation
   - [x] API documentation updated
   - [x] Inline code comments added
   - [x] README.md updated
   - [x] Architecture diagrams (if applicable)

   ---

   ### 🔗 Related Resources
   - **PR URL:** [link]
   - **Test Report:** [link]
   - **QA Analysis:** [link]
   - **Performance Benchmarks:** [link]

   ---

   ### 💾 Task Metadata
   ```json
   [embedded evidence JSON]
   ```

   ---

   **Task Sentinel Distributed Orchestration**
   *Completed via OODA loop with multi-agent coordination*"
   ```

4. **Close GitHub Issue:**
   ```bash
   # Close issue with completion label
   gh issue close [issue-number] --comment "Task completed and verified. All acceptance criteria met." --reason "completed"

   # Add completion label
   gh issue edit [issue-number] --remove-label "status:qa-passed" --add-label "status:completed"
   ```

5. **Release Distributed Lock:**
   ```bash
   # Remove task lock from distributed memory
   npx claude-flow@alpha hooks memory-delete \
     --key "task-sentinel/locks/[issue-number]"

   # Remove from active queue
   npx claude-flow@alpha memory usage \
     --action delete \
     --key "task-sentinel/queue/active/[issue-number]"
   ```

6. **Stop Heartbeat Monitoring:**
   ```bash
   # Terminate heartbeat process
   npx claude-flow@alpha hooks heartbeat-stop \
     --task-id "[issue-number]"
   ```

7. **Archive Task State:**

   Move task data to completed archive with retention:
   ```bash
   # Archive task metadata
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/archive/completed/[issue-number]" \
     --value '{
       "task_id": [issue-number],
       "title": "[title]",
       "priority": [priority],
       "completed_at": "[timestamp]",
       "duration": "[duration]",
       "worker": "[worker-id]",
       "pr_number": [pr-number],
       "qa_score": [score],
       "test_coverage": [%],
       "agents_used": ["agent-1", "agent-2", "..."],
       "ooda_cycles": [count],
       "evidence": [evidence-object]
     }' \
     --ttl 7776000

   # Clean up temporary working state
   npx claude-flow@alpha hooks memory-delete \
     --key "task-sentinel/observations/[issue-number]"
   npx claude-flow@alpha hooks memory-delete \
     --key "task-sentinel/plans/[issue-number]"
   npx claude-flow@alpha hooks memory-delete \
     --key "task-sentinel/heartbeat/[issue-number]"
   ```

8. **Cleanup Agent Resources:**
   ```bash
   # Gracefully shutdown swarm if no other active tasks
   mcp__claude-flow__swarm_destroy --swarmId "[swarm-id]"
   ```

9. **Update Completion Metrics:**

   Store completion statistics for analytics:
   ```bash
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/metrics/completions/$(date +%Y-%m-%d)" \
     --value '{
       "date": "[date]",
       "completed_tasks": [count],
       "avg_qa_score": [score],
       "avg_coverage": [%],
       "avg_duration": "[hours]"
     }'
   ```

10. **Final Status Output:**

    Display completion summary:
    ```
    ═══════════════════════════════════════════════════════════
    ✅ TASK COMPLETED SUCCESSFULLY
    ═══════════════════════════════════════════════════════════

    Task #[issue-number]: [title]

    ✓ Pull Request #[pr-number] merged
    ✓ QA Score: [score]/100
    ✓ Test Coverage: [%]
    ✓ Security: No vulnerabilities
    ✓ Documentation: Complete
    ✓ All acceptance criteria met

    Duration: [duration]
    Worker: [worker-id]
    Agents: [count] deployed

    Issue closed: [github-url]
    PR merged: [pr-url]

    ═══════════════════════════════════════════════════════════
    ```

**Validation Checklist:**
Before marking complete, ensure:
- [ ] QA passed with score >= 80
- [ ] PR merged to main branch
- [ ] Test coverage >= 90%
- [ ] Zero critical/high security issues
- [ ] All acceptance criteria met
- [ ] Documentation complete
- [ ] Evidence artifacts collected

**Rollback Procedure:**
If completion validation fails:
```bash
# Reopen issue and restore state
gh issue reopen [issue-number]
gh issue edit [issue-number] --add-label "status:in-progress" --remove-label "status:completed"

# Restore distributed lock
npx claude-flow@alpha hooks memory-store \
  --key "task-sentinel/locks/[issue-number]" \
  --value '{"worker": "[worker-id]", "restored": true}'
```

**Note:** Task completion is final and triggers cleanup of distributed resources. Ensure all criteria are met before executing this command.
