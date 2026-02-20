# Agent Instructions

## Project
- This repo contains custom pi skills following the [Agent Skills spec](https://agentskills.io/specification).
- Each skill is a subdirectory with a `SKILL.md` file.

## When creating a new skill
- Follow the naming rules: lowercase a-z, 0-9, hyphens only. Directory name must match frontmatter `name`.
- `SKILL.md` must have `name` and `description` frontmatter.
- Description should be specific about what the skill does and when to use it.
- Use relative paths from the skill directory for scripts/assets.
- Update the skills table in `README.md` when adding/removing skills.

## When modifying skills
- Keep `SKILL.md` frontmatter in sync with directory name.
- Test scripts before committing.
