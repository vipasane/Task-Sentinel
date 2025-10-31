Run comprehensive quality assurance with code-review-swarm and Agentic QE validation.

**QA Execution Protocol:**

1. **Validate QA Prerequisites:**
   ```bash
   # Check task is in correct state for QA
   gh issue view [issue-number] --json labels

   # Verify PR exists and is ready
   gh pr list --search "closes #[issue-number]" --json number,state,mergeable

   # Update task status
   gh issue edit [issue-number] --remove-label "status:in-progress" --add-label "status:qa"
   ```

2. **Initialize QA Coordination:**
   ```bash
   # Set up QA swarm topology
   mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 10 }

   # Store QA session metadata
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/qa/[issue-number]" \
     --value '{
       "started_at": "[timestamp]",
       "pr_number": [pr-number],
       "status": "running",
       "checks": {
         "code_quality": "pending",
         "security": "pending",
         "performance": "pending",
         "test_coverage": "pending",
         "documentation": "pending"
       }
     }'
   ```

3. **Spawn QA Agents (Concurrent Execution):**

   Deploy specialized QA agents via Task tool in single message:

   ```bash
   [Single Message - QA Swarm]:
     # Code Review Swarm
     Task("Code Quality Reviewer", "Analyze code quality, patterns, maintainability. Check for anti-patterns, tech debt, and style violations. Store findings in memory at task-sentinel/qa/[issue-number]/quality", "code-review-swarm")

     # Security Analysis
     Task("Security Auditor", "Perform security scanning: SAST, dependency vulnerabilities, authentication/authorization checks, input validation, injection risks. Report critical/high/medium/low findings.", "reviewer")

     # Performance Testing
     Task("Performance Analyst", "Run performance benchmarks: load testing, memory profiling, query optimization, bundle size analysis. Compare against baselines.", "perf-analyzer")

     # Test Coverage Validation
     Task("Test Coverage Validator", "Verify test coverage >= 90%, check edge cases, validate integration tests, review test quality. Run full test suite.", "tester")

     # Documentation Review
     Task("Documentation Reviewer", "Validate API docs, inline comments, README updates, architecture diagrams. Ensure completeness and accuracy.", "coder")

     # Agentic QE Orchestrator
     Task("Agentic QE Coordinator", "Orchestrate end-to-end QA workflow: coordinate agents, aggregate findings, prioritize issues, generate final QA report with pass/fail determination.", "task-orchestrator")
   ```

4. **Execute QA Checks:**

   **Code Quality Analysis:**
   ```bash
   # Run linting and static analysis
   npm run lint
   npm run typecheck

   # Complexity analysis
   npx complexity-report --format json
   ```

   **Security Scanning:**
   ```bash
   # Dependency vulnerability scan
   npm audit --json

   # SAST scanning
   npx eslint --ext .js,.ts --format json --no-eslintrc --plugin security

   # Secret detection
   npx secretlint **/*
   ```

   **Performance Testing:**
   ```bash
   # Run performance benchmarks
   npm run benchmark

   # Bundle size analysis
   npx webpack-bundle-analyzer --mode json
   ```

   **Test Coverage:**
   ```bash
   # Run full test suite with coverage
   npm run test:coverage -- --json --outputFile=coverage-report.json

   # Validate coverage threshold
   npx c8 check-coverage --lines 90 --functions 90 --branches 85
   ```

5. **Aggregate QA Findings:**

   Store consolidated results in memory:
   ```bash
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/qa/[issue-number]/results" \
     --value '{
       "code_quality": {
         "status": "[pass|fail]",
         "score": [0-100],
         "issues": [
           {"severity": "high|medium|low", "description": "...", "file": "...", "line": ...}
         ]
       },
       "security": {
         "status": "[pass|fail]",
         "vulnerabilities": {
           "critical": [count],
           "high": [count],
           "medium": [count],
           "low": [count]
         },
         "details": [...]
       },
       "performance": {
         "status": "[pass|fail]",
         "metrics": {
           "load_time": "[ms]",
           "memory_usage": "[MB]",
           "bundle_size": "[KB]"
         },
         "issues": [...]
       },
       "test_coverage": {
         "status": "[pass|fail]",
         "coverage": {
           "lines": [%],
           "functions": [%],
           "branches": [%]
         }
       },
       "documentation": {
         "status": "[pass|fail]",
         "completeness": [%],
         "issues": [...]
       },
       "overall_status": "[pass|fail]",
       "pass_rate": [%]
     }'
   ```

6. **Generate QA Report:**

   Post comprehensive QA report as GitHub PR comment:
   ```bash
   gh pr comment [pr-number] --body "## 🔍 QA Analysis Report - Task #[issue-number]

   **Overall Status:** [✅ PASS | ❌ FAIL]
   **QA Score:** [score]/100
   **Executed:** [timestamp]

   ---

   ### 📊 Quality Metrics

   | Category | Status | Score | Issues |
   |----------|--------|-------|--------|
   | Code Quality | [✅/❌] | [score] | [count] |
   | Security | [✅/❌] | [score] | [count] |
   | Performance | [✅/❌] | [score] | [count] |
   | Test Coverage | [✅/❌] | [coverage]% | [count] |
   | Documentation | [✅/❌] | [score] | [count] |

   ---

   ### 🐛 Critical Issues
   [if critical issues exist:]
   - ❌ **[Issue Title]** - [description] ([file]:[line])
   [else:]
   ✅ No critical issues found

   ---

   ### ⚠️ High Priority Issues
   [list high priority issues or "None"]

   ---

   ### 🔒 Security Analysis
   - **Critical Vulnerabilities:** [count]
   - **High Vulnerabilities:** [count]
   - **Medium Vulnerabilities:** [count]
   - **Dependencies Scanned:** [count]

   [if vulnerabilities:]
   **Action Required:** Address vulnerabilities before merge
   [else:]
   ✅ No security vulnerabilities detected

   ---

   ### ⚡ Performance Metrics
   - **Load Time:** [ms] [✅/⚠️/❌]
   - **Memory Usage:** [MB] [✅/⚠️/❌]
   - **Bundle Size:** [KB] [✅/⚠️/❌]

   ---

   ### ✅ Test Coverage
   - **Lines:** [%] (Target: 90%)
   - **Functions:** [%] (Target: 90%)
   - **Branches:** [%] (Target: 85%)

   [if coverage < target:]
   ⚠️ Coverage below target - add more tests
   [else:]
   ✅ Coverage meets requirements

   ---

   ### 📝 Documentation Review
   - **Completeness:** [%]
   - **API Docs:** [✅/❌]
   - **Inline Comments:** [✅/❌]
   - **README Updates:** [✅/❌]

   ---

   ### 🎯 Recommendation
   [if overall pass:]
   ✅ **APPROVED FOR MERGE** - All QA checks passed
   [else:]
   ❌ **CHANGES REQUESTED** - Address issues above before merge

   ---

   ### 🤖 QA Agents Deployed
   - Code Quality Reviewer
   - Security Auditor
   - Performance Analyst
   - Test Coverage Validator
   - Documentation Reviewer
   - Agentic QE Coordinator

   *Generated by Task Sentinel QA Swarm*"
   ```

7. **Update Task Status:**
   ```bash
   # Update GitHub labels based on QA result
   [if QA passed:]
   gh issue edit [issue-number] --remove-label "status:qa" --add-label "status:qa-passed"
   [else:]
   gh issue edit [issue-number] --remove-label "status:qa" --add-label "status:qa-failed"

   # Update memory state
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/tasks/[issue-number]" \
     --value '{
       "status": "[qa-passed|qa-failed]",
       "qa_completed_at": "[timestamp]",
       "qa_score": [score],
       "qa_report_url": "[pr-comment-url]"
     }'
   ```

**QA Pass Criteria:**
- Code quality score >= 80/100
- Zero critical security vulnerabilities
- Test coverage >= 90% (lines & functions), >= 85% (branches)
- Performance within acceptable thresholds
- Documentation complete and accurate

**Note:** QA must pass before task can be marked complete. Failed QA blocks completion until issues resolved.
