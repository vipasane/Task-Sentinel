/**
 * Distributed Systems Module for Task Sentinel
 *
 * Exports:
 * - MemorySyncManager: Cross-worker memory synchronization
 * - ConflictResolvers: Conflict resolution strategies
 * - VectorClockManager: Causality tracking
 * - LockManager: Distributed locking
 * - GitHubClient: GitHub integration
 */

// Memory synchronization
export {
  MemorySyncManager,
  ConflictResolvers,
  VectorClockManager,
  type VectorClock,
  type MemoryEntry,
  type ConflictResolution,
  type SyncOperation,
  type CacheEntry,
  type SubscriptionOptions,
  type MemorySyncConfig,
  type ConflictResolver,
  type MergeStrategy
} from './memory-sync';

// Distributed locking (existing)
export { LockManager } from './lock-manager.js';
export { GitHubClient } from './github-client.js';
export type {
  LockMetadata,
  LockResult,
  ReleaseResult,
  LockConfig,
  LockStatus,
  AcquireOptions,
  LockMetrics,
  ConflictStrategy as LockConflictStrategy
} from './types.js';
export { ConflictStrategy } from './types.js';

// Worker coordination
export { WorkerRegistry } from './worker-registry';
export type {
  Worker,
  WorkerMetrics,
  WorkerRegistration,
  WorkerFilter,
  WorkerWithPriority,
  WorkerRegistryConfig,
  HealthStatus,
} from './worker-registry';

// Default export for memory sync
import { MemorySyncManager } from './memory-sync';
export default MemorySyncManager;
