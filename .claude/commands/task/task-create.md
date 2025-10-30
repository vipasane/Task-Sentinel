Create new task for Task Sentinel distributed orchestration system.

**Task Creation Protocol:**

1. **Gather Task Information:**
   - Task title (clear, actionable)
   - Detailed description with acceptance criteria
   - Priority level (1-10000, default: 5000)
   - Labels and tags (auto-add: task, status:queued)
   - Estimated complexity (if applicable)

2. **Create GitHub Issue:**
   Use gh CLI to create issue with full metadata:
   ```bash
   gh issue create \
     --title "[title]" \
     --body "[description with acceptance criteria]" \
     --label "task,status:queued,[additional-labels]" \
     --assignee "" \
     --project "Task Sentinel"
   ```

3. **Set Priority Field:**
   Add priority as custom field using gh API:
   ```bash
   gh api graphql -f query='mutation {
     updateIssue(input: {id: "[issue-id]", projectV2: {customFields: [{name: "Priority", value: "[priority]"}]}}) {
       clientMutationId
     }
   }'
   ```

4. **Store Task Metadata:**
   Store initial task state in distributed memory for OODA loop:
   ```bash
   npx claude-flow@alpha hooks memory-store \
     --key "task-sentinel/tasks/[issue-number]" \
     --value '{
       "issue_number": "[number]",
       "title": "[title]",
       "priority": [priority],
       "status": "queued",
       "created_at": "[timestamp]",
       "labels": ["task", "status:queued"],
       "ooda_phase": "observe",
       "assigned_worker": null,
       "heartbeat": null
     }'
   ```

5. **Initialize Task Queue Entry:**
   Add task to distributed queue for orchestration:
   ```bash
   npx claude-flow@alpha memory usage \
     --action store \
     --key "task-sentinel/queue/pending/[issue-number]" \
     --value '{"priority": [priority], "created": "[timestamp]"}'
   ```

6. **Output Task Summary:**
   Display created task details:
   - Issue number and URL
   - Priority level
   - Current status (queued)
   - Next steps for claiming

**Example Usage:**
- Title: "Implement user authentication API"
- Description: "Create REST API endpoints for user login/logout with JWT tokens. Acceptance: 90% test coverage, security audit passed"
- Priority: 7500
- Labels: task, status:queued, backend, security
