-- Docs/Current/migrations/021_prices.sql
-- Home-OS schema revision 21 — worklist D1, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS". No outer BEGIN/COMMIT.
--
-- ============================================================
-- WHY
-- ============================================================
-- Jodie, 24, ADHD, £30 a week, from the round 2 re-trace:
--
--   "It's good. I've got £30 a week. Ask me if it saved me money, not if
--    I liked it."
--
-- She is right and the app cannot answer. There is no price anywhere.
--
-- ============================================================
-- FOUR DESIGN DECISIONS, MADE HERE
-- ============================================================
--
-- 1. WHERE A PRICE COMES FROM: you type it once, and it is remembered.
--
--    Barcodes do not carry prices and Open Food Facts has none. Receipt
--    scanning is parked on per-user cost. Typing a price every shop is
--    exactly the upkeep that made Jodie uninstall in the first place.
--
--    So a price lives on the FOOD, not the purchase. Type it once and
--    every future list uses it, the same pattern as the reference file:
--    answer once, benefit forever.
--
-- 2. WHAT GETS COSTED: the shopping LIST, not "the week".
--
--    "This week cost £34" is a lie when half the pantry was bought last
--    month, and unpicking that needs a purchase ledger nobody will keep.
--
--    "This list comes to about £24" is checkable, useful before you leave
--    the house, and answerable from data that already exists. It is also
--    the number Jodie actually asked for.
--
-- 3. IT MUST SAY WHAT IT DOES NOT KNOW. A total over twelve of seventeen
--    items, presented as £24, is a wrong number. Presented as "about £24
--    for the 12 we have prices for", it is a useful one.
--
-- 4. IT IS NOT A BUDGET. No limit, no overspend, no red, no history of how
--    you did. A budgeting app that scores you is the exact thing this
--    audience has been failed by before.

alter table foods add column if not exists typical_price numeric;
alter table foods add column if not exists price_updated_at timestamptz;

alter table foods drop constraint if exists foods_typical_price_check;
alter table foods add constraint foods_typical_price_check
  check (typical_price is null or (typical_price >= 0 and typical_price < 10000));

comment on column foods.typical_price is
  'What you usually pay for one of these, in your currency. NULL = never said. Typed once and reused; never guessed, never scraped.';
comment on column foods.price_updated_at is
  'When typical_price was last set, so a stale price can say so rather than quietly being wrong.';
