# my-pi-skills

Custom [pi](https://github.com/badlogic/pi-coding-agent) skills.

Each subdirectory is a self-contained skill following the [Agent Skills specification](https://agentskills.io/specification).

## Usage

Add to pi's global skills directory:

```bash
# Symlink into global skills
ln -s ~/pi-place/my-pi-skills ~/.pi/agent/skills/my-pi-skills
```

Or add to `~/.pi/settings.json`:

```json
{
  "skills": ["~/pi-place/my-pi-skills"]
}
```

## Skills

| Skill | Description |
|-------|-------------|
| [hn-distill](hn-distill/) | Fetch and distill insights from Hacker News threads. Given an HN URL or item ID, fetches the full comment tree and produces an opinionated analysis with key insights, sentiment, and verdict. |

## Structure

```
skill-name/
├── SKILL.md       # Required: frontmatter + instructions
├── scripts/       # Helper scripts
├── references/    # Detailed docs
└── ...
```
