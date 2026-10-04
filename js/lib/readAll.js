// js/lib/readAll.js — 04 Oct 2026 v2
// v2: survives a server page cap SMALLER than the page asked for. v1 asked
// for 1,000 and stopped at the first page that came back short — so if the
// project returns fewer rows per request than that, v1 read one page and
// quietly called it everything. That is the same silent cut-off v1 was
// written to fix. Now a short page is followed by one more request from
// where it ended; only an empty page ends the read.
// Reads EVERY row of a query, a page at a time.
//
// ---- Why ----
// Supabase (PostgREST) returns a limited number of rows per request and
// says nothing when it stops. Graeme, 4 Oct 2026: Today counted 449 kcal
// for overnight oats, a falafel bowl and a lentil ragu, the newest meals'
// ingredients missing from nutrition and the shopping list.
//
// `build()` must return a fresh, ordered query each time (ordering by a
// unique column last keeps pages from overlapping).

export const PAGE_SIZE = 1000;
const MAX_REQUESTS = 400;

/** @returns {Promise<{ ok: true, data: any[] } | { ok: false, error: Error }>} */
export async function readAll(build, pageSize = PAGE_SIZE) {
  const rows = [];
  let from = 0;
  let size = pageSize;
  let shortSeen = false;
  const seen = new Set();
  for (let i = 0; i < MAX_REQUESTS; i += 1) {
    const { data, error } = await build().range(from, from + size - 1);
    // Asking past the last row can come back as "range not satisfiable"
    // (PGRST103) rather than an empty page. After a short page, that is
    // the end of the data, not a failure.
    if (error) return shortSeen ? { ok: true, data: rows } : { ok: false, error };
    const page = data || [];
    if (page.length === 0) return { ok: true, data: rows };
    // A source that ignores the range hands back the same rows again; the
    // first repeated id means there is nothing new to read.
    const firstId = page[0] && page[0].id;
    if (firstId !== undefined && seen.has(firstId)) return { ok: true, data: rows };
    for (const row of page) if (row && row.id !== undefined) seen.add(row.id);
    rows.push(...page);
    from += page.length;
    if (page.length < size) {
      // Short page: either the end, or a server cap. One more request from
      // here tells them apart; an empty answer ends the read above.
      if (shortSeen && page.length < size) size = page.length;
      shortSeen = true;
    }
  }
  return { ok: true, data: rows };
}
