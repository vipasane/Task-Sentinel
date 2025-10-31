# Single Worker Deployment Guide

## Overview

This guide covers deploying Task Sentinel with a single worker, ideal for development, testing, or low-volume production use.

## Prerequisites

- Node.js 18+ installed
- GitHub account with repository access
- GitHub Personal Access Token with `repo` scope

## Setup Steps

### 1. Environment Configuration

Create a `.env` file in your project root:

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo

# Worker Configuration
WORKER_ID=worker-001
WORKER_HOSTNAME=localhost
WORKER_MAX_TASKS=5

# Distributed Configuration
LOCK_TTL_SECONDS=300
HEARTBEAT_INTERVAL_MS=30000
STALE_WORKER_THRESHOLD_MS=120000

# Load Balancing
LOAD_BALANCE_STRATEGY=least_loaded

# Memory Sync
MEMORY_SYNC_INTERVAL_MS=5000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration File

Create `task-sentinel.config.json`:

```json
{
  "distributed": {
    "enabled": true,
    "workerId": "${WORKER_ID}",
    "hostname": "${WORKER_HOSTNAME}",

    "locking": {
      "ttlSeconds": 300,
      "retryAttempts": 3,
      "retryDelayMs": 1000
    },

    "registry": {
      "healthCheckIntervalMs": 30000,
      "staleThresholdMs": 120000
    },

    "heartbeat": {
      "intervalMs": 30000,
      "staleThresholdMs": 120000,
      "recoveryEnabled": true
    },

    "loadBalancer": {
      "strategy": "least_loaded"
    },

    "memorySync": {
      "intervalMs": 5000,
      "conflictResolution": "last_write_wins",
      "cacheSize": 500
    }
  },

  "capacity": {
    "maxConcurrentTasks": 5,
    "cpuCores": 4,
    "memoryMb": 8192,
    "supportedTaskTypes": ["build", "test", "deploy"]
  }
}
```

### 4. Start the Worker

```bash
npm start
```

Expected output:
```
[INFO] Task Sentinel Worker starting...
[INFO] Worker ID: worker-001
[INFO] Hostname: localhost
[INFO] Registering worker with cluster...
[INFO] Worker registered successfully
[INFO] Starting heartbeat monitor...
[INFO] Heartbeat started (interval: 30s)
[INFO] Starting task processing loop...
[INFO] Worker ready to process tasks
```

## Verification

### Check Worker Registration

```bash
# Using GitHub CLI
gh api repos/{owner}/{repo}/issues/1/comments \
  --jq '.[] | select(.body | contains("WORKER_REGISTRATION"))'
```

Expected response:
```json
{
  "type": "WORKER_REGISTRATION",
  "worker_id": "worker-001",
  "hostname": "localhost",
  "registered_at": "2025-10-30T10:00:00Z",
  "status": "active",
  "capacity": {
    "max_tasks": 5,
    "active_tasks": 0,
    "available_slots": 5
  }
}
```

### Monitor Heartbeats

```bash
# Watch for heartbeat updates
watch -n 5 'gh api repos/{owner}/{repo}/issues/1/comments \
  --jq ".[] | select(.body | contains(\"worker-001\")) | .body | fromjson | .last_heartbeat"'
```

### Check Task Processing

```bash
# View worker logs
npm run logs

# Check task queue
npm run tasks:list
```

## Development Workflow

### Local Development

```bash
# Start in development mode (with hot reload)
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Debug Mode

Enable detailed logging:

```bash
DEBUG=task-sentinel:* npm start
```

Specific components:
```bash
# Lock manager only
DEBUG=task-sentinel:lock-manager npm start

# Worker registry
DEBUG=task-sentinel:worker-registry npm start

# All distributed components
DEBUG=task-sentinel:distributed:* npm start
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "worker_id": "worker-001",
  "uptime_seconds": 3600,
  "active_tasks": 2,
  "capacity": {
    "max": 5,
    "available": 3
  },
  "last_heartbeat": "2025-10-30T11:00:00Z"
}
```

### Metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

Response:
```json
{
  "tasks": {
    "processed": 150,
    "successful": 145,
    "failed": 5,
    "average_duration_ms": 2500
  },
  "locks": {
    "acquired": 150,
    "conflicts": 3,
    "released": 150
  },
  "memory": {
    "operations": 500,
    "cache_hits": 450,
    "cache_misses": 50
  }
}
```

## Troubleshooting

### Worker Won't Start

**Symptom:** Worker fails to start or exits immediately

**Check:**
```bash
# Verify environment variables
npm run env:check

# Test GitHub connectivity
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

**Solutions:**
1. Verify GitHub token has `repo` scope
2. Check repository exists and is accessible
3. Ensure no port conflicts (default: 3000)

### Heartbeat Not Updating

**Symptom:** `last_heartbeat` timestamp not updating

**Check:**
```bash
# View heartbeat logs
DEBUG=task-sentinel:heartbeat npm start

# Manually send heartbeat
npm run worker:heartbeat
```

**Solutions:**
1. Check GitHub API rate limits
2. Verify network connectivity
3. Increase heartbeat interval if network is slow

### Tasks Not Processing

**Symptom:** Worker running but no tasks executed

**Check:**
```bash
# List pending tasks
npm run tasks:list --status=pending

# Check worker capacity
npm run worker:status
```

**Solutions:**
1. Verify tasks exist in queue
2. Check worker capacity settings
3. Review task type compatibility
4. Look for lock conflicts

### Lock Conflicts

**Symptom:** High rate of lock acquisition failures

**Check:**
```bash
# List active locks
npm run locks:list

# Show lock statistics
npm run locks:stats
```

**Solutions:**
1. Increase lock TTL if tasks take longer
2. Check for multiple workers with same ID
3. Clear stale locks manually if needed

## Maintenance

### Graceful Shutdown

Worker handles `SIGTERM` and `SIGINT` signals:

```bash
# Graceful shutdown
kill -TERM <worker-pid>

# Or use npm
npm stop
```

Shutdown sequence:
1. Stop accepting new tasks
2. Wait for active tasks to complete (max 30s)
3. Release all locks
4. Deregister worker
5. Exit process

### Manual Cleanup

If worker crashes without deregistering:

```bash
# Cleanup stale worker
npm run worker:cleanup --worker-id=worker-001

# Release stale locks
npm run locks:cleanup --worker-id=worker-001
```

### Log Rotation

Configure log rotation in `task-sentinel.config.json`:

```json
{
  "logging": {
    "level": "info",
    "file": "logs/worker.log",
    "maxSize": "10m",
    "maxFiles": 5,
    "compress": true
  }
}
```

## Performance Tuning

### Task Capacity

Adjust based on task characteristics:

```bash
# CPU-bound tasks (1x cores)
WORKER_MAX_TASKS=4

# I/O-bound tasks (2-4x cores)
WORKER_MAX_TASKS=16

# Mixed workload (1.5-2x cores)
WORKER_MAX_TASKS=8
```

### Memory Sync

For latency-sensitive workloads:

```json
{
  "memorySync": {
    "intervalMs": 1000,  // Faster sync
    "cacheSize": 1000    // Larger cache
  }
}
```

For throughput optimization:

```json
{
  "memorySync": {
    "intervalMs": 10000, // Slower sync
    "cacheSize": 100     // Smaller cache
  }
}
```

### Lock TTL

Tune based on task duration:

```bash
# Short-running tasks (< 1 min)
LOCK_TTL_SECONDS=120

# Medium tasks (1-5 min)
LOCK_TTL_SECONDS=300

# Long-running tasks (> 5 min)
LOCK_TTL_SECONDS=600
```

## Upgrading

### Update Process

```bash
# Stop worker gracefully
npm stop

# Backup configuration
cp task-sentinel.config.json task-sentinel.config.json.bak

# Update code
git pull origin main

# Install dependencies
npm install

# Run migrations (if any)
npm run migrate

# Start worker
npm start
```

### Rollback

```bash
# Stop worker
npm stop

# Revert code
git checkout v1.0.0  # Previous version

# Restore configuration
cp task-sentinel.config.json.bak task-sentinel.config.json

# Start worker
npm start
```

## Security

### Token Security

```bash
# Never commit .env file
echo ".env" >> .gitignore

# Use encrypted secrets in CI/CD
gh secret set GITHUB_TOKEN < token.txt

# Rotate tokens regularly
# Generate new token at: https://github.com/settings/tokens
```

### Network Security

```bash
# Restrict health endpoint to localhost
HEALTH_ENDPOINT_HOST=127.0.0.1

# Use HTTPS for webhooks
WEBHOOK_URL=https://worker.example.com/webhook

# Enable request signing
WEBHOOK_SECRET=your-secret-key
```

## Next Steps

- [Scale to Multiple Workers](./multi-worker.md)
- [Deploy to GitHub Actions](./github-actions.md)
- [Container Deployment](./docker.md)
- [API Reference](../api/distributed.md)
