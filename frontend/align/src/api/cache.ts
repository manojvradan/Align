/**
 * Lightweight module-level stale-while-revalidate cache.
 *
 * Keyed by API path. All pages share the same store so data cached by one
 * page is immediately available when navigating to another.
 *
 * Pattern used in every page:
 *   useState(() => getCached<T>(KEY) ?? fallback)   // instant init from cache
 *   useState(() => getCached(KEY) === null)          // only show skeleton when cold
 *
 *   useEffect(() => {
 *     if (isFresh(KEY, TTL.MEDIUM)) { setIsLoading(false); return; }
 *     // fetch, setCached(KEY, data), setState(data), setIsLoading(false)
 *   }, [user?.id]);
 */

interface Entry { data: unknown; ts: number }

const store = new Map<string, Entry>();

export const TTL = {
  SHORT:   30_000,   // 30s  — notifications list
  MEDIUM:  60_000,   // 60s  — applied/saved lists
  LONG:   300_000,   // 5min — jobs list, preferences
  PROFILE: 120_000,  // 2min — user profile / skills
};

/** Return the cached value for `key`, or null if nothing is stored. */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  return entry ? (entry.data as T) : null;
}

/** True if a cache entry exists AND was stored within `ttl` ms ago. */
export function isFresh(key: string, ttl: number): boolean {
  const entry = store.get(key);
  return !!entry && Date.now() - entry.ts < ttl;
}

/** Store a value with the current timestamp. */
export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

/** Remove one or more cache entries (e.g. after a mutation). */
export function invalidate(...keys: string[]): void {
  for (const k of keys) store.delete(k);
}
