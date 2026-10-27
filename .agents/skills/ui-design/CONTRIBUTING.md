# Contributing and maintaining the skill

These are the rules the skill grows by. They are not inside `SKILL.md` because they help
nobody decide anything while designing: they would only take up context on every use.

**Where the starting point came from.** The initial rules are a distillation of *Refactoring
UI* (Adam Wathan and Steve Schoger), translated into code and calibrated against real
measurements. That is the origin, not the limit: **this is not "Refactoring UI"**, it is a
design criterion of its own that grows independently from here. A rule is worth no more and
no less for coming from that book.

**How a new rule gets in.** With a real case behind it: a screen that came out wrong, a
comment from somebody using it, something that was redone twice. When adding it, note where
it comes from. A rule backed only by a quote and no case yet has not earned its place.

**Only the universal goes here.** If a rule needs to name a token, a class or a file, it does
not belong in this skill: it belongs in that project's profile. The test: does it hold
equally for a consumer mobile app and for an enterprise data table? If not, it goes to the
profile.

**And only what does not get applied on its own.** A skill is not an encyclopedia: it is the
list of what people forget to apply in the moment of deciding. Before adding something, ask
which of the three it falls into:

- **Looked up when needed** → out. A component's API, the Material catalog, the whole HIG.
  Knowing it by heart improves no decision.
- **Known but not applied** → in. The 44pt touch target is the example: nobody is unaware of
  it, and it is still broken when drawing a 24px icon.
- **Depends on a version** → out, with an instruction to look it up. Material tokens, MUI
  defaults, whatever changed in the last iOS. A number recalled from memory and said with
  confidence does more damage than no number.

**What gets removed.** A rule nobody has broken for months is a habit already and only takes
up room. And when a rule can be checked by a test, its place is the test; what stays here is
the decision the test cannot make.

**Sources, as they arrive:**

- *Refactoring UI* — Adam Wathan and Steve Schoger.
