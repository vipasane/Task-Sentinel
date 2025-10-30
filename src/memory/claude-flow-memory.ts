/**
 * Claude Flow Memory Interface
 *
 * Provides persistent memory storage for distributed coordination.
 * Can be implemented using various backends (in-memory, Redis, etc.)
 */

export interface ClaudeFlowMemory {
  /**
   * Store a value with optional TTL (time-to-live)
   * @param key - Storage key
   * @param value - Value to store (serialized as string)
   * @param ttl - Optional time-to-live in milliseconds
   */
  store(key: string, value: string, ttl?: number): Promise<void>;

  /**
   * Retrieve a value by key
   * @param key - Storage key
   * @returns Value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Delete a value by key
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Search for keys matching a pattern
   * @param pattern - Search pattern (supports wildcards)
   * @returns Array of matching key-value pairs
   */
  search(pattern: string): Promise<Array<{ key: string; value: string }>>;

  /**
   * List all keys in a namespace
   * @param namespace - Optional namespace prefix
   * @returns Array of keys
   */
  list(namespace?: string): Promise<string[]>;
}

/**
 * In-memory implementation of ClaudeFlowMemory
 * For production use, replace with Redis or other persistent storage
 */
export class InMemoryClaudeFlowMemory implements ClaudeFlowMemory {
  private storage: Map<string, { value: string; ttl: number; timestamp: number }> = new Map();

  async store(key: string, value: string, ttl?: number): Promise<void> {
    this.storage.set(key, {
      value,
      ttl: ttl || 0,
      timestamp: Date.now(),
    });
  }

  async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
    if (!item) {
      return null;
    }

    // Check TTL
    if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
      this.storage.delete(key);
      return null;
    }

    return item.value;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async search(pattern: string): Promise<Array<{ key: string; value: string }>> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const results: Array<{ key: string; value: string }> = [];

    this.storage.forEach((item, key) => {
      if (regex.test(key)) {
        // Check TTL
        if (item.ttl === 0 || Date.now() - item.timestamp <= item.ttl) {
          results.push({ key, value: item.value });
        } else {
          this.storage.delete(key);
        }
      }
    });

    return results;
  }

  async list(namespace?: string): Promise<string[]> {
    const prefix = namespace || '';
    const keys: string[] = [];

    this.storage.forEach((item, key) => {
      if (key.startsWith(prefix)) {
        // Check TTL
        if (item.ttl === 0 || Date.now() - item.timestamp <= item.ttl) {
          keys.push(key);
        } else {
          this.storage.delete(key);
        }
      }
    });

    return keys;
  }

  /**
   * Clear all stored data (for testing)
   */
  clear(): void {
    this.storage.clear();
  }
}
