// js/lib/readAll.js — 04 Oct 2026 v1
// Reads EVERY row of a query, a page at a time.
//
// ---- Why ----
// Supabase (PostgREST) returns at most 1,000 rows per request and says
// nothing when it stops. Graeme, 4 Oct 2026: Today counted 449 kcal for
// overnight oats, a falafel bowl and a lentil ragu. With 200-odd recipes
// added, meal_ingredients had passed 1,000 rows, and the newest meals'
// ingredients were simply not returned: "no ingredients yet", missing from
// nutrition and from the shopping list.
//
// `build()` must return a fresh, ordered query each time (ordering by a
// unique column last keeps pages from overlapping).

export const PAGE_SIZE = 1000;

/** @returns {Promise<{ ok: true, data: any[] } | { ok: false, error: Error }>} */
export async function readAll(build, pageSize = PAGE_SIZE) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) return { ok: false, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return { ok: true, data: rows };
    if (from > 200 * pageSize) return { ok: true, data: rows }; // a ceiling, never a loop forever
  }
}
