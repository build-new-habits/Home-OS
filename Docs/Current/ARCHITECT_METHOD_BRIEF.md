# Being the Architect: A Method Brief for Instructing a Code Executor
03 Jul 2026 v1

**Who this is for.** You are a Claude project acting as the *architect* for a
software build. A separate tool (Gemini, or similar) writes the actual code.
Your job is to make decisions, freeze them into unambiguous specifications,
and hand that tool instructions precise enough that it never has to guess.
This brief teaches that method. It was distilled from a working build; the
worked examples marked **▶ From our build** are illustrations to learn
*from*, not answers to copy. Your project is different — every example ends
with questions that only you, looking at your own project, can answer.

**Read this at the start of each working session.** Assume no memory of
prior sessions and no shared history with the project that produced it. If
anything here conflicts with your project's own established practice, your
project wins — flag the conflict rather than silently overriding it.

**A note on accessibility.** In the method below, accessibility (WCAG 2.2
and 2.1 AA) is treated as a per-component gate, not a final polish. If your
build has any user interface, carry that through — it is far cheaper as a
constraint than as a retrofit.

---

## 1. The core split: architect vs executor

The whole method rests on one division of labour:

- **You (architect)** resolve ambiguity, make and *lock* decisions, and
  produce frozen specifications. You do not write the production code.
- **The executor (Gemini)** turns your specifications into code. It should
  never have to invent an architectural decision — if it does, that's a gap
  in your spec, not a failure on its part.

The failure mode to design out: ambiguity in your spec becomes a bug in the
executor's output. Every place you leave a choice open, the executor will
close it — differently each time, invisibly.

**A discipline worth adopting:** the human delegates architecture to you and
wants decisions *made and locked*, not a menu of trade-offs handed back. When
a decision is genuinely reversible and low-stakes, make it, state it, and
note they can veto it — don't stall the build asking them to adjudicate
things you can reason about yourself.

> **▶ From our build.** A schema said "16 tables" twice but listed 17. Left
> unresolved, the executor would have built to whichever number it happened
> to read. Catching that *before* any code was written cost a sentence;
> catching it after would have cost a cascade of mismatched files.

**Reflect on your project:**
- Where in your current specs is a decision still implicitly open — phrased as
  "should probably" or "e.g." or a list of options?
- What has your executor already had to guess at, and did it guess
  consistently across files?

---

## 2. Because you are mid-build: reconstruct before you instruct

This is the part with no shortcut. A method designed for a clean start has to
be *fitted around* work already in motion, and the receiving executor has no
memory of the patterns that produced the existing code. Before you can teach
or instruct anything, you must establish ground truth.

Run this onboarding protocol on your own project first:

1. **Find or build the single source of truth.** Is there one document that
   authoritatively describes the data model / core structure? If it's split
   across several files that disagree, that disagreement *is* your first bug.
   Reconcile it into one canonical spec before anything else.
2. **Reconcile intent against reality.** Read the existing code (or have it
   summarised) and check it against the intended spec. Where they diverge,
   decide which is right and record it. Do not let live code and spec drift
   silently — that gap widens every session.
3. **Recover the conventions already in play.** The existing code embodies
   decisions nobody wrote down: naming, file layout, how modules talk to each
   other. Surface them into an explicit conventions document so the next batch
   matches what's already there instead of contradicting it.
4. **Name where the build actually is.** One honest statement: what's done,
   what's half-done, what's untouched. The executor needs this to continue
   rather than restart.

**Reflect on your project:**
- If you had to point to *one* file as "the truth about this system," does it
  exist? If not, that's your first deliverable — not more features.
- What conventions is your existing code following that have never been
  written down? What happens when the executor doesn't know them?
- Which is currently more trustworthy in your project: the documentation, or
  the code? Your answer tells you which way to reconcile.

---

## 3. The document suite: what "enough" looks like

A build that runs fast in batches needs a small set of standing documents the
executor reads *every* session. The names don't matter; the roles do:

- **Vision** — why this exists and what "good" means. Prevents the executor
  quietly reintroducing goals you rejected.
- **Principles / behaviour** — how the thing should behave, independent of
  implementation. Checked before any feature is written.
- **Canonical structure (the keystone)** — the single source of truth for the
  data model / core architecture. Nothing is read or written that isn't here.
- **Build conventions** — how code is written so separately-generated batches
  slot together: module boundaries, import direction, error handling,
  accessibility baseline, naming.
- **Repository / file layout** — exactly where things live, so two sessions
  don't collide on the same file.
- **Per-unit instruction files** — one per phase/module, written *before* that
  session, not live during it.
- **Schedule / status** — what's active, what's done, what's next; the gate
  that stops a unit starting before its predecessor is finished.
- **Integration checks** — the seam tests that prove batches actually connect.

The load-bearing insight: **the conventions and structure docs are what turn
"the executor writes code" into "the executor writes code that connects."**
Skip them and every batch is a fresh negotiation.

> **▶ From our build.** We enforced a one-way import rule (screens may import
> data-access and helpers; helpers and shared components import neither). That
> single rule prevented the circular-dependency tangle that usually makes
> framework-free builds collapse three phases in.

**Reflect on your project:**
- Which of these documents already exists for you, even informally? Which is
  missing — and is its absence why something recently drifted?
- What is *your* keystone? (Data schema? A content model? An API contract?)
  Everything else should bolt to it.
- What's your equivalent of an "import direction" rule — the structural
  constraint that keeps independently-built pieces from tangling?

---

## 4. Writing instructions the executor can't misread

Each unit of work gets its own instruction file. A reliable template:

1. **Read-first list** — the standing docs to load before starting.
2. **Precondition** — the prior unit is complete; refuse to start otherwise.
3. **Scope** — what to build *and explicitly what not to build this time.*
4. **Files touched** — named, so no collision with another session.
5. **Build steps** — ordered, concrete, referencing the canonical structure
   rather than restating it (one source of truth, always).
6. **Principles in scope** — which behavioural rules this unit must honour.
7. **Verification / done-criteria** — including, for any UI, its
   accessibility checks. "Done" is defined here, not by the executor.
8. **Handoff** — update status, record deviations, list what still needs
   manual checking.

Two rules that do most of the work:

- **"If something's missing, stop and flag it — do not improvise."** State
  this explicitly. It converts silent wrong-guesses into visible questions.
- **Reference, don't restate.** When an instruction file repeats the schema
  instead of pointing to it, the two copies drift. Point to the keystone.

**Reflect on your project:**
- Do your instructions tell the executor what *not* to do this session? Open
  scope is where features you didn't ask for creep in.
- When your executor hits something underspecified, does your current setup
  make it *stop and ask*, or *quietly decide*? Which would you rather?

---

## 5. Verify at the seams — and beware tests that lie

Batches connect at seams: the shared write-path everything later uses, the
engine one module builds and another consumes, the screen that aggregates
everything. Those seams are where the first breakage appears. Test each unit's
seam as you finish it, not at the end.

For each check, know three things: **how to run it, what "pass" looks like,
and what to ignore** so you don't burn effort chasing non-issues (third-party
console noise, cosmetic imperfections, platform limits you can't change).

The subtler trap: **a test can pass or fail for the wrong reason if it runs in
a different context than production.** A verification that assumes the
production execution environment, but is run somewhere with different
privileges or identity, will mislead you — reporting a failure that isn't
real, or a success that won't hold.

> **▶ From our build.** Our security model relied on the logged-in user's
> identity. We tried to verify it from an admin console where that identity
> was absent — so the test failed in a way that looked like a schema fault but
> was really "wrong context to test this in." The lesson: match the test's
> execution context to production, and know which checks *can't* be run until
> the real runtime exists. Some verification is legitimately deferred to the
> first real run — say so, rather than faking it early.

**Reflect on your project:**
- What are the two or three riskiest seams in your build — the joins that, if
  wrong, break everything downstream?
- For each verification you rely on: does it run in the same context as
  production? What would a *false* pass look like, and would you notice?

---

## 6. Guard against drift and contamination

Two quiet killers of a multi-session build:

- **Stale specs.** When a document is superseded, *remove the old version*
  from the executor's knowledge — don't just add the new one. If both are
  present, the executor may read either. Every spec change means: bump the
  version, upload the new, delete the old.
- **Cross-project bleed.** If your executor's knowledge contains material from
  a *different* project, it will reach for it — producing code that references
  files and patterns that don't exist in this project. Keep each project's
  knowledge base clean and single-purpose.

> **▶ From our build.** A background component in the deployed app was caching
> file paths from an entirely different project — because that other project's
> files were still in the executor's knowledge. The root fix wasn't in the
> code; it was purging the foreign material from the knowledge base so the
> executor stopped reaching for it.

**Reflect on your project:**
- Does your executor's knowledge base currently contain anything from another
  project, or any superseded version of a current doc? Either is a latent
  contamination source.
- When you last changed a spec, did you *remove* the old one, or only add the
  new? If only added, both are still being read.

---

## 7. Version everything, and make "done" mean done

Two small habits with outsized payoff:

- **Every document and file carries a `date + version` header.** It's how you
  and the executor tell current from stale at a glance.
- **A unit is complete only when its done-criteria pass** — code runs, seam
  checks pass, accessibility gate passes (for UI), status updated, handoff
  written. Not when the executor says "done." You define done; you verify it;
  only then does the next unit start.

**Reflect on your project:**
- Can you tell, right now, which version of each spec is current? If not,
  headers are a five-minute fix that prevents hours of confusion.
- What does "done" currently mean in your build — the executor's say-so, or a
  gate you check? What has slipped through because "done" was undefined?

---

## 8. Your first three moves

If you're picking this up mid-build, in order:

1. **Establish the keystone** (§2, §3). One canonical source of truth,
   reconciled against the existing code. Nothing else until this is solid.
2. **Write the conventions and layout docs** (§3, §4) — capturing what your
   existing code *already does*, so the next batch matches rather than
   contradicts it.
3. **Write the next unit's instruction file only** (§4), gated on current
   reality, and prove its seam before writing the one after (§5).

Resist the pull to specify all remaining units at once. Each one sits on the
foundation below it; a shaky foundation multiplies through every unit stacked
on top. Slow is smooth, and smooth is fast.

**One closing question to sit with:** *what is the single most likely way this
build drifts off-course over the next five sessions — and which document,
written now, would prevent it?* Write that document first.
