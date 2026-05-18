/**
 * NarrativeCache
 *
 * In-memory LRU-style cache for AI-generated narratives.
 * Key: irHash_inputHash_entityId
 * TTL: 1 hour (configurable)
 * Max entries: 500 (configurable, FIFO eviction)
 */
export class NarrativeCache {
  /**
   * @param {number} ttlMs   - Time-to-live in milliseconds (default: 1 hour)
   * @param {number} maxSize - Maximum number of cached entries (default: 500)
   */
  constructor(ttlMs = 3_600_000, maxSize = 500) {
    this._ttlMs = ttlMs;
    this._maxSize = maxSize;
    this._store = new Map(); // insertion-ordered for FIFO eviction
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Look up a cached narrative.
   * Returns the narrative string, or null on miss / expiry.
   *
   * @param {string} irHash
   * @param {string} inputHash
   * @param {string} entityId
   * @returns {string|null}
   */
  get(irHash, inputHash, entityId) {
    if (!irHash || !inputHash || !entityId) {
      this._misses++;
      return null;
    }

    const key = `${irHash}_${inputHash}_${entityId}`;
    const entry = this._store.get(key);

    if (!entry) {
      this._misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._misses++;
      return null;
    }

    // LRU promotion: re-insert so this entry is evicted last
    this._store.delete(key);
    this._store.set(key, entry);
    this._hits++;
    return entry.value;
  }

  /**
   * Store a narrative in the cache.
   * Skips storage when any key component is missing.
   * Evicts the oldest entry (FIFO) when maxSize is exceeded.
   *
   * @param {string} irHash
   * @param {string} inputHash
   * @param {string} entityId
   * @param {string} narrative
   */
  set(irHash, inputHash, entityId, narrative) {
    if (!irHash || !inputHash || !entityId) return;

    const key = `${irHash}_${inputHash}_${entityId}`;

    // If the key already exists, delete it first so the re-insertion
    // moves it to the end of the Map (newest position).
    if (this._store.has(key)) {
      this._store.delete(key);
    }

    // Evict the oldest entry when at capacity (FIFO: first key in the Map).
    if (this._store.size >= this._maxSize) {
      const oldestKey = this._store.keys().next().value;
      this._store.delete(oldestKey);
    }

    this._store.set(key, {
      value: narrative,
      expiresAt: Date.now() + this._ttlMs
    });
  }

  /**
   * Return cache statistics for monitoring / admin dashboard.
   *
   * @returns {{ size: number, hits: number, misses: number, hitRate: string }}
   */
  stats() {
    const total = this._hits + this._misses;
    const hitRate = total === 0 ? "0.00%" : `${((this._hits / total) * 100).toFixed(2)}%`;
    return {
      size: this._store.size,
      hits: this._hits,
      misses: this._misses,
      hitRate
    };
  }
}
