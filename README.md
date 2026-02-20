# my-pi-skills

Custom [pi](https://github.com/nicholasgasior/pi-coding-agent) skills.

Each subdirectory is a self-contained skill following the [Agent Skills specification](https://agentskills.io/specification).

## Usage

Add to pi's global skills directory:

```bash
# Symlink into global skills
ln -s ~/pi-skills ~/.pi/agent/skills/pi-skills-custom
```

Or add to `~/.pi/settings.json`:

```json
{
  "skills": ["~/pi-skills"]
}
```

## Skills

| Skill | Description |
|-------|-------------|
| *none yet* | |

## Structure

```
skill-name/
├── SKILL.md       # Required: frontmatter + instructions
├── scripts/       # Helper scripts
├── references/    # Detailed docs
└── ...
```
