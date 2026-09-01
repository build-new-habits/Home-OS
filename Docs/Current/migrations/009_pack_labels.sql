-- Docs/Current/migrations/009_pack_labels.sql
-- Home-OS schema revision 9 — Phase 12, 01 Sep 2026
--
-- CONFIRM THE PROJECT IS "Home OS" BEFORE RUNNING.
-- No outer BEGIN/COMMIT. Run as one execution, then run the VERIFY file
-- separately.
--
-- ============================================================
-- WHAT THIS DOES
-- ============================================================
-- One nullable column. The pantry already knows you have four of
-- something and that each one weighs 400g — grams_per_item has existed
-- since Phase 1 and computeMacros() already converts through it.
--
-- What it does not know is the WORD. So the screen says "4 item", which
-- reads as broken, and the form pushes you toward grams to avoid it.
--
-- item_label is the singular noun for one item of this food: 'tin',
-- 'egg', 'slice', 'clove', 'bottle', 'bulb'. NULL falls back to the
-- generic word 'item', which is what every existing row gets and what
-- every existing row already displays. Nothing changes until a label is
-- typed, which is why there is no backfill.

alter table foods add column if not exists item_label text;

-- A label is a noun, not a sentence. The CHECK is not fussiness: this
-- string is pluralised and concatenated into shopping list lines, and a
-- 200-character 'label' would wreck every row it appeared in.
alter table foods drop constraint if exists foods_item_label_check;
alter table foods add constraint foods_item_label_check
  check (item_label is null or (length(trim(item_label)) between 1 and 30));

comment on column foods.item_label is
  'Singular noun for one item of this food (tin, egg, slice). NULL means the generic word "item".';
