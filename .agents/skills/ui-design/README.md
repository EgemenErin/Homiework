# ui-design — a Claude Code skill for the visual decisions of a screen

How to decide hierarchy, type, color, spacing and depth, and how to repair what is already
wrong. Works for web and mobile. It runs **before and while** writing UI, not after.

I wrote it because an agent designing without judgment produces flat screens: everything at
the same weight, grays that cannot be read, ambiguous spacing and no primary action. These
are mistakes people know about and still repeat in the moment of deciding. That is what is in
here, and only that: the skill is not an encyclopedia of Material or the whole HIG.

## What to expect from it

It is a help, not a solution. With the skill loaded, Claude stops making the mistakes that
repeat, but a good design does not come out on the first try. You still have to iterate: look
at the result, say what does not work, and run it again. What the skill does is make each
iteration start higher up, not make iterations unnecessary.

It is no substitute for product context either. What the user has to do on that screen and
which number matters is not something a generic document can know: you supply that.

I update it as I see which mistakes repeat, so it grows with use. If you hit one the skill
does not cover, open an issue with the case.

## Install

```bash
git clone https://github.com/jordisantamaria/claude-ui-design-skill
mkdir -p ~/.claude/skills/ui-design
cp claude-ui-design-skill/SKILL.md ~/.claude/skills/ui-design/SKILL.md
```

Invoke it with `/ui-design`. Claude also loads it on its own when the work is UI work.

## It needs a per-project profile

The skill carries the **judgment**; each project's **data** (palette, type scale, spacing
scale, radii, the utilities that already exist, what is broken today) lives in a separate
`ui-profile`:

- `<repo>/.claude/ui-profile.md` — the project's own
- `~/.claude/ui-profiles/<repo-name>.md` — the personal one, for other people's repos

With no profile, Claude invents the tokens. Section 9 of the skill explains how to write one:
by measuring what the project actually uses, not by assuming.

## Origin

The initial rules are a distillation of *Refactoring UI* (Adam Wathan and Steve Schoger),
translated into instructions for an agent and calibrated against real measurements from
oshisuki, my app in production. From there it is a living document: every new rule enters
with a real case behind it. If a rule looks arguable, argue it against the screen in front of
you.

## License

[CC BY 4.0](LICENSE). Free to use and adapt, commercially too, with attribution:

> ui-design skill — Jordi Santamaria Portoles — https://github.com/jordisantamaria/claude-ui-design-skill
