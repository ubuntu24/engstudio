/**
 * Lightweight In-Memory TTL Cache
 * Provides sub-millisecond responses for read-heavy endpoints.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data, ttlSeconds = 60) {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

const cache = new MemoryCache();

module.exports = cache;
