# Distributed Lock Flow Diagrams

## Complete Lock Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Unlocked: Issue Created

    Unlocked --> Acquiring: Worker attempts acquisition
    Acquiring --> Locked: Assignment succeeds
    Acquiring --> Conflict: Already assigned
    Acquiring --> Failed: Max retries exceeded

    Conflict --> Backoff: Exponential backoff
    Backoff --> Acquiring: Retry

    Locked --> Heartbeat: Start heartbeat
    Heartbeat --> Locked: Heartbeat active

    Locked --> Released: Worker releases
    Locked --> Stale: No heartbeat > 5min

    Stale --> Unlocked: Force release
    Released --> Unlocked: Cleanup complete
    Failed --> [*]: Give up
    Unlocked --> [*]: Issue closed
```

## Lock Acquisition Sequence

```mermaid
sequenceDiagram
    participant W1 as Worker 1
    participant LM as LockManager
    participant GH as GitHub API
    participant W2 as Worker 2

    Note over W1,W2: Scenario: Race Condition

    W1->>LM: acquireLock(issue #123)
    W2->>LM: acquireLock(issue #123)

    LM->>GH: getIssue(123)
    GH-->>LM: { assignees: [] }

    LM->>GH: assignIssue(123, worker1)
    LM->>GH: assignIssue(123, worker2)

    Note over LM,GH: GitHub processes atomically

    GH-->>LM: worker1 assigned ✓
    GH-->>LM: already assigned ✗

    LM->>GH: Verify assignment
    GH-->>LM: { assignees: [worker1] }

    LM->>GH: Post metadata comment
    LM-->>W1: Success { retries: 0 }

    Note over W2,LM: Worker 2 gets conflict
    LM->>LM: Exponential backoff (1s)

    LM->>GH: getIssue(123)
    GH-->>LM: { assignees: [worker1] }

    LM->>LM: Still locked, backoff (2s)
    LM->>LM: Retry 2/5

    LM-->>W2: Failed { retries: 5 }
```

## Heartbeat Mechanism

```mermaid
sequenceDiagram
    participant LM as LockManager
    participant HB as Heartbeat Timer
    participant GH as GitHub API
    participant M as Memory

    Note over LM,M: Lock acquired successfully

    LM->>HB: Start interval (30s)

    loop Every 30 seconds
        HB->>GH: Post heartbeat comment
        HB->>M: Update heartbeat_last

        Note over HB: Worker still alive
    end

    Note over HB: Worker crashes

    rect rgb(255, 200, 200)
        Note over HB: No more heartbeats
        Note over GH: Last heartbeat: 10 minutes ago
    end

    participant W2 as Worker 2
    W2->>LM: acquireLock(STEAL_STALE)
    LM->>GH: Check heartbeat_last
    LM->>LM: Calculate: now - heartbeat_last > 5min
    LM->>GH: Force unassign(worker1)
    LM->>GH: Assign(worker2)
    LM-->>W2: Success (stale lock claimed)
```

## Conflict Resolution Strategies

```mermaid
flowchart TD
    Start([Worker attempts lock]) --> Check{Issue assigned?}

    Check -->|No| Assign[Assign issue]
    Check -->|Yes| Strategy{Conflict Strategy}

    Assign --> Verify{Verify assignment}
    Verify -->|Success| Success([Lock acquired])
    Verify -->|Failed| Strategy

    Strategy -->|RETRY| Backoff[Exponential backoff]
    Strategy -->|FAIL_FAST| Fail([Immediate failure])
    Strategy -->|STEAL_STALE| Stale{Check heartbeat}
    Strategy -->|FORCE_ACQUIRE| Force[Force unassign]

    Backoff --> Retry{Retries left?}
    Retry -->|Yes| Check
    Retry -->|No| Fail

    Stale -->|Stale| Force
    Stale -->|Active| Backoff

    Force --> Assign

    Success --> Heartbeat[Start heartbeat]
    Heartbeat --> Execute[Execute task]
    Execute --> Release[Release lock]
    Release --> End([Complete])
```

## Multi-Worker Coordination

```mermaid
graph TB
    subgraph "GitHub Issues Queue"
        I1[Issue #101<br/>Priority: High]
        I2[Issue #102<br/>Priority: Medium]
        I3[Issue #103<br/>Priority: Low]
        I4[Issue #104<br/>Priority: High]
    end

    subgraph "Worker Pool"
        W1[Worker 1<br/>STEAL_STALE]
        W2[Worker 2<br/>RETRY]
        W3[Worker 3<br/>FAIL_FAST]
    end

    subgraph "Lock Manager"
        LM[LockManager<br/>Coordination]
    end

    W1 -->|Acquire| LM
    W2 -->|Acquire| LM
    W3 -->|Acquire| LM

    LM -->|Check/Lock| I1
    LM -->|Check/Lock| I2
    LM -->|Check/Lock| I3
    LM -->|Check/Lock| I4

    I1 -->|Locked| Lock1[🔒 W1 assigned]
    I2 -->|Locked| Lock2[🔒 W2 assigned]
    I3 -->|Available| Lock3[⭕ Available]
    I4 -->|Conflict| Lock4[⚠️ Contention]

    Lock1 -->|Heartbeat| HB1[💓 Active]
    Lock2 -->|Heartbeat| HB2[💓 Active]
    Lock4 -->|Retry| Retry1[🔄 Backoff]
```

## Lock State Transitions

```mermaid
stateDiagram-v2
    state "Lock States" as states {
        [*] --> AVAILABLE

        AVAILABLE --> CLAIMING: assignIssue()
        CLAIMING --> LOCKED: Assignment verified
        CLAIMING --> AVAILABLE: Assignment failed

        LOCKED --> HEARTBEATING: startHeartbeat()
        HEARTBEATING --> HEARTBEATING: Post heartbeat (30s)
        HEARTBEATING --> STALE: Timeout (5min)
        HEARTBEATING --> RELEASING: releaseLock()

        RELEASING --> AVAILABLE: Unassign complete

        STALE --> FORCE_RELEASING: STEAL_STALE
        FORCE_RELEASING --> AVAILABLE: Force unassign
    }

    state "Metrics Updates" as metrics {
        LOCKED --> metrics: totalAcquisitions++
        RELEASING --> metrics: totalReleases++
        CLAIMING --> metrics: totalConflicts++
        FORCE_RELEASING --> metrics: staleLocksClaimed++
    }
```

## Error Handling Flow

```mermaid
flowchart TD
    Start([acquireLock]) --> Try[Try acquisition]

    Try --> Error{Error?}

    Error -->|GitHub API| API[API Error]
    Error -->|Network| Net[Network Error]
    Error -->|Rate Limit| Rate[Rate Limit]
    Error -->|None| Check[Check result]

    API --> Retry1{Retry?}
    Net --> Retry2{Retry?}
    Rate --> Backoff1[Long backoff 60s]

    Retry1 -->|Yes| Backoff2[Exponential backoff]
    Retry1 -->|No| Fail1[Return error]

    Retry2 -->|Yes| Backoff2
    Retry2 -->|No| Fail1

    Backoff1 --> Try
    Backoff2 --> Try

    Check --> Success{Acquired?}
    Success -->|Yes| Start2[Start heartbeat]
    Success -->|No| Conflict[Handle conflict]

    Conflict --> Strategy{Strategy}
    Strategy -->|RETRY| Backoff2
    Strategy -->|FAIL_FAST| Fail1
    Strategy -->|STEAL_STALE| Stale[Check stale]

    Stale --> Force{Can force?}
    Force -->|Yes| Try
    Force -->|No| Fail1

    Start2 --> Return([Return success])
    Fail1 --> Return2([Return failure])
```

## Performance Timeline

```mermaid
gantt
    title Lock Acquisition Timeline (with conflicts)
    dateFormat  SSS
    axisFormat  %Ss

    section Worker 1
    Acquire request       :a1, 000, 50ms
    GitHub assign         :a2, after a1, 200ms
    Verify assignment     :a3, after a2, 150ms
    Post metadata         :a4, after a3, 200ms
    Success               :milestone, after a4, 0ms

    section Worker 2
    Acquire request       :b1, 050, 50ms
    GitHub assign         :b2, after b1, 200ms
    Conflict detected     :crit, b3, after b2, 50ms
    Backoff 1s            :b4, after b3, 1000ms
    Retry attempt         :b5, after b4, 200ms
    Still locked          :crit, b6, after b5, 50ms
    Backoff 2s            :b7, after b6, 2000ms
    Final failure         :milestone, after b7, 0ms
```

## System Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    subgraph "Lock Manager Layer"
        LM1[LockManager<br/>Instance 1]
        LM2[LockManager<br/>Instance 2]
        LM3[LockManager<br/>Instance 3]

        HB[Heartbeat<br/>Manager]
        MT[Metrics<br/>Collector]
    end

    subgraph "GitHub API Layer"
        GH[GitHub<br/>Issues API]
        CMD[GitHub CLI<br/>gh]
    end

    subgraph "Memory Layer"
        MCP[MCP Memory<br/>Storage]
        CACHE[Lock State<br/>Cache]
    end

    W1 --> LM1
    W2 --> LM2
    W3 --> LM3

    LM1 --> HB
    LM2 --> HB
    LM3 --> HB

    LM1 --> MT
    LM2 --> MT
    LM3 --> MT

    LM1 --> CMD
    LM2 --> CMD
    LM3 --> CMD

    CMD --> GH

    HB --> MCP
    MT --> MCP
    LM1 --> CACHE
    LM2 --> CACHE
    LM3 --> CACHE
```

## Integration with Task Sentinel

```mermaid
flowchart LR
    subgraph "Task Sentinel"
        TS[Task Orchestrator]
        WP[Worker Pool]
        QM[Queue Manager]
    end

    subgraph "Distributed Locking"
        LM[LockManager]
        GH[GitHub Issues]
    end

    subgraph "Execution"
        AG[Agent Swarm]
        EX[Task Execution]
        QA[Quality Assurance]
    end

    TS --> QM
    QM --> WP
    WP --> LM

    LM -->|Acquire| GH
    LM -->|Status| GH
    LM -->|Release| GH

    LM -->|Success| AG
    AG --> EX
    EX --> QA
    QA -->|Complete| LM
```

---

## Key Takeaways

### Lock Acquisition Flow
1. Check if issue is available
2. Attempt atomic assignment
3. Verify assignment succeeded
4. Post metadata comment
5. Start heartbeat timer
6. Return success/failure

### Conflict Resolution
1. Detect conflict (already assigned)
2. Apply strategy (RETRY, FAIL_FAST, STEAL_STALE)
3. Exponential backoff if retry
4. Check stale if steal allowed
5. Force release if stale
6. Return result

### Heartbeat Mechanism
1. Start interval timer on lock acquisition
2. Post heartbeat comment every 30s
3. Update timestamp in memory
4. Stop timer on lock release
5. Enable stale detection by other workers

### Performance Characteristics
- **Fast path**: 200-500ms (no conflicts)
- **Slow path**: 2-10s (with retries)
- **Heartbeat**: ~100ms every 30s
- **Stale detection**: 5 minute timeout
- **Max throughput**: ~5000 operations/hour

### Error Handling
- Network errors → Retry with backoff
- API errors → Retry with backoff
- Rate limits → Long backoff (60s)
- Conflicts → Strategy-dependent
- Max retries → Return failure
