# GitHub Actions Deployment Guide

## Overview

Deploy Task Sentinel workers as GitHub Actions workflows for serverless, cost-effective execution. This approach leverages GitHub's infrastructure without managing servers.

## Benefits

- **Zero Infrastructure**: No servers to manage
- **Cost-Effective**: Free for public repos, included minutes for private repos
- **Elastic Scaling**: Automatic scaling based on concurrency
- **Built-in Secrets**: Native GitHub secrets management
- **CI/CD Integration**: Seamless integration with existing workflows

## Limitations

- **Runtime Limits**: 6 hours max per job (free tier), 35 days (paid)
- **Concurrency Limits**: 20 concurrent jobs (free), higher for paid
- **Resource Constraints**: 2-4 CPU cores, 7-14 GB RAM per runner
- **Network Restrictions**: GitHub IP ranges only

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              GitHub Actions Workflows                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐      │
│  │  Worker 1  │   │  Worker 2  │   │  Worker 3  │      │
│  │            │   │            │   │            │      │
│  │ Scheduled  │   │ On-Demand  │   │ On-Demand  │      │
│  │ (cron)     │   │ (webhook)  │   │ (webhook)  │      │
│  └──────┬─────┘   └──────┬─────┘   └──────┬─────┘      │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Task Sentinel Cluster  │
              │  (GitHub Coordination) │
              └────────────────────────┘
```

## Setup

### 1. Create Workflow File

Create `.github/workflows/task-sentinel-worker.yml`:

```yaml
name: Task Sentinel Worker

on:
  # Scheduled execution (every 5 minutes)
  schedule:
    - cron: '*/5 * * * *'

  # Manual trigger
  workflow_dispatch:
    inputs:
      worker_id:
        description: 'Worker ID (optional, auto-generated if not provided)'
        required: false
        type: string
      max_tasks:
        description: 'Maximum concurrent tasks'
        required: false
        default: '5'
        type: string
      duration:
        description: 'Worker duration in minutes'
        required: false
        default: '55'
        type: string

  # Webhook trigger
  repository_dispatch:
    types: [start-worker]

env:
  # GitHub configuration (automatic)
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  GITHUB_OWNER: ${{ github.repository_owner }}
  GITHUB_REPO: ${{ github.event.repository.name }}

  # Worker configuration
  WORKER_MAX_TASKS: ${{ inputs.max_tasks || '5' }}
  WORKER_DURATION_MINUTES: ${{ inputs.duration || '55' }}

  # Distributed configuration
  LOCK_TTL_SECONDS: 300
  HEARTBEAT_INTERVAL_MS: 30000
  STALE_WORKER_THRESHOLD_MS: 120000
  LOAD_BALANCE_STRATEGY: least_loaded

jobs:
  worker:
    runs-on: ubuntu-latest

    # Allow multiple concurrent workers
    strategy:
      matrix:
        worker_number: [1, 2, 3]  # 3 concurrent workers
      fail-fast: false

    timeout-minutes: 360  # 6 hours max

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate worker ID
        id: worker-id
        run: |
          if [ -n "${{ inputs.worker_id }}" ]; then
            WORKER_ID="${{ inputs.worker_id }}"
          else
            # Generate unique worker ID
            WORKER_ID="gh-worker-${{ matrix.worker_number }}-${{ github.run_id }}"
          fi
          echo "worker_id=$WORKER_ID" >> $GITHUB_OUTPUT
          echo "Generated worker ID: $WORKER_ID"

      - name: Start worker
        env:
          WORKER_ID: ${{ steps.worker-id.outputs.worker_id }}
          WORKER_HOSTNAME: ${{ runner.name }}
        run: |
          echo "Starting worker: $WORKER_ID"
          echo "Hostname: $WORKER_HOSTNAME"
          echo "Max tasks: $WORKER_MAX_TASKS"
          echo "Duration: $WORKER_DURATION_MINUTES minutes"

          # Run worker with timeout
          timeout ${WORKER_DURATION_MINUTES}m npm start || {
            EXIT_CODE=$?
            if [ $EXIT_CODE -eq 124 ]; then
              echo "Worker reached timeout, graceful shutdown"
              exit 0
            else
              echo "Worker exited with code $EXIT_CODE"
              exit $EXIT_CODE
            fi
          }

      - name: Cleanup on failure
        if: failure()
        env:
          WORKER_ID: ${{ steps.worker-id.outputs.worker_id }}
        run: |
          echo "Worker failed, cleaning up..."
          npm run worker:cleanup -- --worker-id=$WORKER_ID || true

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: worker-logs-${{ steps.worker-id.outputs.worker_id }}
          path: logs/
          retention-days: 7
```

### 2. Configure Secrets

Add GitHub token to repository secrets:

```bash
# Using GitHub CLI
gh secret set GITHUB_TOKEN --body "$GITHUB_TOKEN"

# Or via GitHub UI:
# Repository → Settings → Secrets → Actions → New repository secret
```

For custom tokens (if needed):
```bash
# Create token with 'repo' scope
# https://github.com/settings/tokens/new

gh secret set TASK_SENTINEL_TOKEN --body "$CUSTOM_TOKEN"
```

### 3. Test Workflow

```bash
# Trigger manually
gh workflow run task-sentinel-worker.yml

# Check status
gh run list --workflow=task-sentinel-worker.yml

# View logs
gh run view --log
```

## Advanced Configurations

### Dynamic Scaling

Automatically adjust worker count based on queue size:

```yaml
name: Dynamic Worker Scaling

on:
  schedule:
    - cron: '*/5 * * * *'

jobs:
  scale-controller:
    runs-on: ubuntu-latest
    outputs:
      worker_count: ${{ steps.calculate-workers.outputs.count }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Calculate required workers
        id: calculate-workers
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Get queue size
          QUEUE_SIZE=$(npm run --silent tasks:count)

          # Calculate workers needed (1 worker per 10 tasks, max 20)
          WORKERS=$(( ($QUEUE_SIZE + 9) / 10 ))
          WORKERS=$(( $WORKERS > 20 ? 20 : $WORKERS ))
          WORKERS=$(( $WORKERS < 1 ? 1 : $WORKERS ))

          echo "Queue size: $QUEUE_SIZE"
          echo "Workers needed: $WORKERS"
          echo "count=$WORKERS" >> $GITHUB_OUTPUT

  worker:
    needs: scale-controller
    runs-on: ubuntu-latest

    strategy:
      matrix:
        worker_number: ${{ fromJson(needs.scale-controller.outputs.worker_count) }}
      fail-fast: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      # ... rest of worker steps ...
```

### On-Demand Workers

Start workers via webhook:

```yaml
name: On-Demand Worker

on:
  repository_dispatch:
    types: [start-worker]

jobs:
  worker:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Parse webhook payload
        id: payload
        run: |
          echo "task_id=${{ github.event.client_payload.task_id }}" >> $GITHUB_OUTPUT
          echo "priority=${{ github.event.client_payload.priority }}" >> $GITHUB_OUTPUT

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Process task
        env:
          TASK_ID: ${{ steps.payload.outputs.task_id }}
          PRIORITY: ${{ steps.payload.outputs.priority }}
        run: npm run task:process -- --task-id=$TASK_ID --priority=$PRIORITY
```

Trigger via API:

```bash
# Trigger on-demand worker
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/dispatches \
  -d '{
    "event_type": "start-worker",
    "client_payload": {
      "task_id": "task-123",
      "priority": "high"
    }
  }'
```

### Matrix Strategy for Specialization

Deploy specialized workers:

```yaml
name: Specialized Workers

on:
  schedule:
    - cron: '*/5 * * * *'

jobs:
  worker:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        include:
          # Build workers (high CPU)
          - worker_type: build
            worker_id: build-worker
            max_tasks: 3
            task_types: build,compile

          # Test workers (medium CPU)
          - worker_type: test
            worker_id: test-worker
            max_tasks: 5
            task_types: test,lint

          # Deploy workers (I/O bound)
          - worker_type: deploy
            worker_id: deploy-worker
            max_tasks: 2
            task_types: deploy,publish

      fail-fast: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Start specialized worker
        env:
          WORKER_ID: ${{ matrix.worker_id }}-${{ github.run_id }}
          WORKER_TYPE: ${{ matrix.worker_type }}
          WORKER_MAX_TASKS: ${{ matrix.max_tasks }}
          SUPPORTED_TASK_TYPES: ${{ matrix.task_types }}
        run: npm start
```

### Self-Hosted Runners

For higher resource limits, use self-hosted runners:

```yaml
name: Self-Hosted Worker

on:
  schedule:
    - cron: '*/5 * * * *'

jobs:
  worker:
    runs-on: self-hosted  # Uses your own infrastructure

    strategy:
      matrix:
        worker_number: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # More workers
      fail-fast: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      # No timeout limit on self-hosted runners
      - name: Start worker
        run: npm start
```

## Monitoring

### Workflow Status Dashboard

```yaml
name: Worker Status Dashboard

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:

jobs:
  dashboard:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Generate dashboard
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Collect metrics
          npm run metrics:collect

          # Generate HTML dashboard
          npm run dashboard:generate

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dashboard
```

### Slack Notifications

```yaml
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Task Sentinel worker failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Worker Failure*\nWorker: ${{ steps.worker-id.outputs.worker_id }}\nRun: <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
                  }
                }
              ]
            }
```

## Optimization Tips

### Caching

Speed up worker startup with caching:

```yaml
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Cache build artifacts
        uses: actions/cache@v3
        with:
          path: dist/
          key: ${{ runner.os }}-build-${{ hashFiles('src/**') }}
```

### Parallel Execution

Maximize throughput:

```yaml
    strategy:
      max-parallel: 20  # GitHub's concurrent limit
      matrix:
        worker_number: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      fail-fast: false
```

### Resource Optimization

```yaml
      - name: Optimize resources
        run: |
          # Increase memory for Node.js
          export NODE_OPTIONS="--max-old-space-size=6144"

          # Use all available CPU cores
          export WORKER_MAX_TASKS=$(nproc)

          npm start
```

## Cost Optimization

### Schedule During Off-Peak Hours

```yaml
on:
  schedule:
    # Run more frequently during business hours (UTC)
    - cron: '*/5 8-18 * * 1-5'   # Every 5 min, 8am-6pm, Mon-Fri

    # Less frequent during off-hours
    - cron: '*/30 0-7,19-23 * * *'  # Every 30 min, other times
```

### Conditional Execution

```yaml
jobs:
  check-queue:
    runs-on: ubuntu-latest
    outputs:
      should_run: ${{ steps.check.outputs.result }}

    steps:
      - name: Check queue size
        id: check
        run: |
          QUEUE_SIZE=$(npm run --silent tasks:count)
          if [ $QUEUE_SIZE -gt 0 ]; then
            echo "result=true" >> $GITHUB_OUTPUT
          else
            echo "result=false" >> $GITHUB_OUTPUT
          fi

  worker:
    needs: check-queue
    if: needs.check-queue.outputs.should_run == 'true'
    runs-on: ubuntu-latest
    # ... worker steps ...
```

## Troubleshooting

### Worker Not Starting

**Check workflow logs:**
```bash
gh run view --log
```

**Common issues:**
- Invalid GitHub token
- Repository permissions
- Syntax errors in workflow file

### Workers Conflicting

**Symptom:** Multiple workers processing same task

**Solution:** Ensure unique worker IDs:
```yaml
      - name: Generate unique worker ID
        run: |
          WORKER_ID="gh-worker-${{ matrix.worker_number }}-${{ github.run_id }}-${{ github.run_attempt }}"
          echo "worker_id=$WORKER_ID" >> $GITHUB_OUTPUT
```

### Exceeding Concurrency Limits

**Symptom:** Workflows queued, not starting

**Solution:** Reduce matrix size or stagger executions:
```yaml
    strategy:
      max-parallel: 10  # Lower limit
      matrix:
        worker_number: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

## Next Steps

- [Container Deployment](./docker.md)
- [API Reference](../api/distributed.md)
- [Monitoring Guide](../phase3_guide.md#monitoring--observability)
