# Distributed Lock Design - Architecture Decision Record

## Status
**PROPOSED** - Phase 3 Implementation

## Context

Task Sentinel requires a distributed locking mechanism to coordinate multiple workers executing tasks from a shared GitHub Issues queue. Workers may run on different machines, and we need to prevent race conditions where multiple workers attempt to process the same task simultaneously.

## Decision

We will use **GitHub Issues assignment** as the distributed lock mechanism, with the following design:

### Lock Primitive: GitHub Issue Assignment

- **Atomic operation**: `gh issue edit --add-assignee` (GitHub's API is atomic)
- **Lock identifier**: Issue number
- **Lock holder**: GitHub username of assigned worker
- **Lock metadata**: JSON in GitHub comment

### Key Design Principles

1. **Atomic Lock Acquisition**
   - GitHub's issue assignment is atomic at the API level
   - Race conditions are detected by verifying assignment after attempt
   - Failed assignments trigger exponential backoff retry

2. **Explicit Lock Release**
   - Workers must explicitly release locks via `--remove-assignee`
   - Prevents accidental lock retention
   - Enables clean completion tracking

3. **Heartbeat Monitoring**
   - Workers post heartbeat comments every 30 seconds
   - Stale locks (no heartbeat > 5 minutes) can be forcibly released
   - Enables crash recovery without manual intervention

4. **Conflict Resolution**
   - Multiple strategies: RETRY, FAIL_FAST, STEAL_STALE
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
   - Maximum 5 retries by default

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        LockManager                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  acquireLock(issueNumber, options)                 │    │
│  │  releaseLock(issueNumber, workerId)                │    │
│  │  getLockStatus(issueNumber)                        │    │
│  │  isLockStale(status)                               │    │
│  └────────────────────────────────────────────────────┘    │
│           │                  │                │             │
│           ▼                  ▼                ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Retry Logic  │  │  Heartbeat   │  │   Metrics    │    │
│  │ Exp Backoff  │  │  Monitoring  │  │  Collection  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      GitHubClient                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  getIssue(issueNumber)                             │    │
│  │  assignIssue(issueNumber, assignee)                │    │
│  │  unassignIssue(issueNumber, assignee)              │    │
│  │  addComment(issueNumber, body)                     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Issues API                         │
│              (via GitHub CLI - gh)                          │
└─────────────────────────────────────────────────────────────┘
```

### State Machine

```
                    ┌─────────────┐
                    │  UNLOCKED   │
                    └──────┬──────┘
                           │
                    assignIssue()
                           │
                           ▼
          ┌────────────────────────────────┐
          │         LOCKED                 │
          │  (assignee = worker)           │
          │                                │
          │  ┌──────────────────┐         │
          │  │ Heartbeat Active │         │
          │  │  (every 30s)     │         │
          │  └──────────────────┘         │
          └────────┬───────────────────┬───┘
                   │                   │
        releaseLock()           timeout (5min)
                   │                   │
                   ▼                   ▼
          ┌─────────────┐      ┌─────────────┐
          │  RELEASED   │      │    STALE    │
          │             │      │ (can steal) │
          └──────┬──────┘      └──────┬──────┘
                 │                    │
                 └────────┬───────────┘
                          │
                          ▼
                  ┌─────────────┐
                  │  UNLOCKED   │
                  └─────────────┘
```

## Alternatives Considered

### 1. Redis Distributed Lock (Redlock)
**Pros:**
- Industry-standard solution
- Sub-millisecond lock operations
- Built-in expiration

**Cons:**
- Requires Redis infrastructure
- Additional operational complexity
- Cost for hosted Redis
- Network dependency

**Verdict:** ❌ Rejected - Adds infrastructure complexity

### 2. DynamoDB Conditional Writes
**Pros:**
- Native AWS integration
- Strong consistency guarantees
- No additional infrastructure

**Cons:**
- AWS vendor lock-in
- Cost for low-frequency operations
- Requires AWS account

**Verdict:** ❌ Rejected - Vendor lock-in

### 3. PostgreSQL Advisory Locks
**Pros:**
- Built into PostgreSQL
- Very efficient
- Well-tested

**Cons:**
- Requires database infrastructure
- Connection management complexity
- Not ideal for long-running locks

**Verdict:** ❌ Rejected - Requires database setup

### 4. GitHub Issues (Selected)
**Pros:**
- ✅ No additional infrastructure
- ✅ Already using GitHub
- ✅ Human-readable audit trail
- ✅ Free (within API limits)
- ✅ Visual monitoring via GitHub UI

**Cons:**
- ⚠️ ~200-500ms latency per operation
- ⚠️ 5000 API requests/hour limit
- ⚠️ Not suitable for high-frequency locks

**Verdict:** ✅ **Selected** - Best fit for Task Sentinel's use case

## Trade-offs

### Performance
- **Latency**: 200-500ms per lock operation (acceptable for task processing)
- **Throughput**: ~5000 operations/hour (sufficient for expected load)
- **Scalability**: Limited by GitHub API rate limits

### Reliability
- **Atomicity**: ✅ GitHub API provides atomic assignment
- **Durability**: ✅ Persistent in GitHub
- **Crash Recovery**: ✅ Heartbeat enables stale lock detection

### Operational
- **Complexity**: ⬇️ Low - no additional infrastructure
- **Monitoring**: ✅ Visual via GitHub UI
- **Debugging**: ✅ Full audit trail in issue comments

## Implementation Details

### Lock Metadata Format

```json
{
  "lock": {
    "worker_id": "worker-local-1",
    "node_id": "node-abc123",
    "claimed_at": "2025-10-30T21:30:00Z",
    "heartbeat_last": "2025-10-30T21:35:00Z",
    "task_info": {
      "complexity": 5,
      "estimated_duration": "45min",
      "task_type": "bug-fix",
      "priority": "high"
    }
  }
}
```

### Exponential Backoff Algorithm

```typescript
function calculateBackoff(attempt: number, initialMs: number, maxMs: number): number {
  const backoff = initialMs * Math.pow(2, attempt);
  return Math.min(backoff, maxMs);
}

// Example: 1s, 2s, 4s, 8s, 16s
```

### Heartbeat Implementation

```typescript
setInterval(async () => {
  await githubClient.addComment(issueNumber, {
    body: `💓 Heartbeat from ${workerId} at ${new Date().toISOString()}`
  });
}, 30000);
```

## Consequences

### Positive

1. **Zero Infrastructure**: No additional services required
2. **Visual Monitoring**: Lock status visible in GitHub UI
3. **Audit Trail**: Complete history in issue comments
4. **Simple Integration**: Uses existing GitHub CLI
5. **Free Tier**: Within GitHub's free API limits

### Negative

1. **Latency**: Higher than in-memory locks (200-500ms)
2. **Rate Limits**: 5000 requests/hour maximum
3. **Not Real-time**: Not suitable for high-frequency locking
4. **Network Dependent**: Requires GitHub connectivity

### Neutral

1. **GitHub Dependency**: Already committed to GitHub platform
2. **Comment Clutter**: Many comments on issues (can filter)

## Risk Mitigation

### Risk: GitHub API Rate Limits
**Mitigation:**
- Monitor rate limit headers
- Exponential backoff on rate limit errors
- Batch operations where possible
- Use conditional requests (ETags)

### Risk: Stale Locks from Worker Crashes
**Mitigation:**
- Heartbeat mechanism (30s interval)
- Automatic stale detection (5min timeout)
- STEAL_STALE conflict strategy
- Manual override capability

### Risk: Network Partitions
**Mitigation:**
- Retry logic with exponential backoff
- Lock timeout for automatic recovery
- Clear error messages for debugging

### Risk: Comment Storage Limits
**Mitigation:**
- Close completed issues regularly
- Archive old issues
- Periodic cleanup of heartbeat comments

## Metrics & Monitoring

### Key Metrics

- `lock_acquisition_time_ms`: Time to acquire lock
- `lock_conflicts_total`: Number of conflicts encountered
- `lock_retries_total`: Total retry attempts
- `lock_failures_total`: Failed acquisitions
- `stale_locks_recovered_total`: Stale locks forcibly released

### Monitoring

```typescript
const metrics = lockManager.getMetrics();
console.log(`
  Acquisitions: ${metrics.totalAcquisitions}
  Releases: ${metrics.totalReleases}
  Conflicts: ${metrics.totalConflicts}
  Avg Time: ${metrics.averageAcquisitionTimeMs}ms
  Failures: ${metrics.failedAcquisitions}
  Stale Claimed: ${metrics.staleLocksClaimed}
`);
```

## Testing Strategy

1. **Unit Tests**: Mock GitHub client, test retry logic
2. **Integration Tests**: Real GitHub Issues in test repo
3. **Load Tests**: Concurrent worker simulation
4. **Chaos Tests**: Simulate crashes and network failures

## Future Enhancements

1. **Lease Extension**: Extend lock duration dynamically
2. **Fair Queuing**: FIFO lock acquisition
3. **Priority Locks**: High-priority workers get precedence
4. **Read/Write Locks**: Multiple readers, single writer
5. **Lock Analytics Dashboard**: Visual metrics and monitoring

## References

- [GitHub REST API - Issues](https://docs.github.com/en/rest/issues)
- [Distributed Locking Patterns](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Redlock Algorithm](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)

## Approval

- **Author**: Claude (System Architecture Designer)
- **Date**: 2025-10-30
- **Status**: Proposed for Phase 3 Implementation
- **Review Required**: Yes - Team review of GitHub API usage patterns
