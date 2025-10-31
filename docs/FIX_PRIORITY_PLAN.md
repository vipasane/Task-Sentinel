# Task Sentinel - Fix Priority Plan

Generated: 2025-10-30

## Overview

11 sub-tasks created from PR reviews. This document prioritizes fixes and defines execution order.

---

## Priority Tiers

### 🔴 CRITICAL (Must Fix Before Merge) - 4 Issues

**Execution Order:**

1. **#11 - Remove node_modules from repository** (PR #5/Phase 2)
   - **Why First**: Simplest fix, unblocks PR #5 review
   - **Estimated Time**: 5 minutes
   - **Branch**: `fix/issue-4-remove-node-modules`
   - **Commands**:
     ```bash
     git checkout feature/task-sentinel-phase2-ooda-goap
     git checkout -b fix/issue-4-remove-node-modules
     echo "node_modules/" >> .gitignore
     git rm -r --cached node_modules/
     git commit -m "fix: Remove node_modules from version control\n\nCloses #11"
     git push -u origin fix/issue-4-remove-node-modules
     gh pr create --base feature/task-sentinel-phase2-ooda-goap --title "fix: Remove node_modules" --body "Closes #11"
     ```

2. **#15 - Fix command injection vulnerabilities** (PR #7/Phase 3)
   - **Why Second**: Security critical, affects 9 locations
   - **Estimated Time**: 45 minutes
   - **Branch**: `fix/issue-6-command-injection`
   - **Files**: heartbeat-monitor.ts (9 locations)
   - **Pattern**: Replace execAsync with spawn throughout

3. **#17 - Add input sanitization** (PR #7/Phase 3)
   - **Why Third**: Security critical, complements #15
   - **Estimated Time**: 30 minutes
   - **Branch**: `fix/issue-6-input-validation`
   - **Files**: lock-manager.ts, worker-registry.ts, memory-sync.ts, load-balancer.ts
   - **Add**: Validation functions for taskId, workerId, keys

4. **#16 - Implement MCP memory integration** (PR #7/Phase 3)
   - **Why Last**: Most complex, requires testing
   - **Estimated Time**: 2 hours
   - **Branch**: `fix/issue-6-mcp-integration`
   - **Files**: memory-sync.ts (4 methods to implement)
   - **Requires**: Integration tests, end-to-end validation

---

### 🟠 HIGH Priority (Should Fix Soon) - 6 Issues

**Execution Order:**

5. **#12 - Remove coverage reports** (PR #5/Phase 2)
   - **Estimated Time**: 5 minutes
   - **Branch**: `fix/issue-4-remove-coverage`
   - **Similar to #11**

6. **#13 - Fix async storage not awaited** (PR #5/Phase 2)
   - **Estimated Time**: 20 minutes
   - **Branch**: `fix/issue-4-async-storage`
   - **Files**: metrics/collector.ts

7. **#14 - Fix memory leak in decisions array** (PR #5/Phase 2)
   - **Estimated Time**: 15 minutes
   - **Branch**: `fix/issue-4-memory-leak-decisions`
   - **Files**: ooda/monitor.ts

8. **#18 - Fix race condition in lock acquisition** (PR #7/Phase 3)
   - **Estimated Time**: 30 minutes
   - **Branch**: `fix/issue-6-race-condition`
   - **Files**: lock-manager.ts

9. **#19 - Fix memory leak in HeartbeatMonitor** (PR #7/Phase 3)
   - **Estimated Time**: 10 minutes
   - **Branch**: `fix/issue-6-memory-leak-heartbeat`
   - **Files**: heartbeat-monitor.ts

10. **#20 - Add process signal handlers** (PR #7/Phase 3)
    - **Estimated Time**: 25 minutes
    - **Branch**: `fix/issue-6-signal-handlers`
    - **Files**: lock-manager.ts, heartbeat-monitor.ts, worker-registry.ts

---

### 🟡 MEDIUM Priority (Nice to Have) - 1 Issue

11. **#10 - Add heartbeat error handling** (PR #3/Phase 1)
    - **Estimated Time**: 15 minutes
    - **Branch**: `fix/issue-2-heartbeat-error-handling`
    - **Files**: .claude/commands/task/task-claim.md

---

## Workflow Pattern

For each issue:

```bash
# 1. Checkout base branch (feature/task-sentinel-phaseX-xxx)
git checkout [base-branch]
git pull origin [base-branch]

# 2. Create fix branch
git checkout -b fix/issue-[parent-id]-[short-description]

# 3. Make changes
# ... implement fix ...

# 4. Test
npm test
npm run lint

# 5. Commit with reference
git add -A
git commit -m "fix: [description]

Closes #[issue-number]
Relates to #[parent-issue]"

# 6. Push
git push -u origin fix/issue-[parent-id]-[short-description]

# 7. Create PR to FEATURE BRANCH (not main)
gh pr create \
  --base [feature-branch] \
  --head fix/issue-[parent-id]-[short-description] \
  --title "fix: [short description]" \
  --body "Closes #[issue-number]

[Description of fix]

**Testing:**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

**Related:**
- Parent Issue: #[parent-id]
- Base PR: #[pr-number]"
```

---

## Estimated Timeline

- **Critical Issues (1-4)**: ~3.5 hours
- **High Priority (5-10)**: ~1.75 hours
- **Medium Priority (11)**: ~0.25 hours

**Total**: ~5.5 hours for all 11 issues

**Recommended Approach:**
- Complete CRITICAL issues first (today)
- HIGH priority tomorrow
- MEDIUM as time permits

---

## Success Criteria

### Phase 2 (PR #5) Can Merge When:
- ✅ #11 (node_modules) fixed
- ✅ #12 (coverage) fixed
- ✅ #13 (async storage) fixed
- ✅ #14 (memory leak) fixed

### Phase 3 (PR #7) Can Merge When:
- ✅ #15 (command injection) fixed
- ✅ #16 (MCP integration) fixed
- ✅ #17 (input sanitization) fixed
- ✅ #18 (race condition) fixed
- ✅ #19 (memory leak) fixed
- ✅ #20 (signal handlers) fixed

### Phase 1 (PR #3) Can Merge When:
- ✅ #10 (heartbeat error) fixed (optional - already approved)

---

## Next Step

**START WITH #11**: Remove node_modules from Phase 2

```bash
git checkout feature/task-sentinel-phase2-ooda-goap
git checkout -b fix/issue-4-remove-node-modules
```
