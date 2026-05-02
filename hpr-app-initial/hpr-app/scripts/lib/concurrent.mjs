/**
 * Bounded-concurrency map: run `fn` over `items` with at most
 * `concurrency` operations in flight at once. Preserves input order
 * in the returned array. Errors per item are caught and returned as
 * `{ ok: false, error }` instead of rejecting the batch — callers
 * decide what to do with failures.
 *
 * Intentionally a tiny inline helper to keep the scraper deps minimal
 * (no p-limit / p-map import).
 */
export async function parallelMap(items, fn, concurrency = 6) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        const value = await fn(items[i], i);
        results[i] = { ok: true, value };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
