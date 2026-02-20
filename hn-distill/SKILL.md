---
name: hn-distill
description: Fetch and distill insights from Hacker News threads. Given an HN URL or item ID, fetches the full comment tree and produces an opinionated analysis with key insights, sentiment, and verdict.
---

# HN Distill

Fetch a Hacker News thread and distill it into an opinionated insight summary.

## Dependencies

None beyond Node.js (uses `curl` for HTTP).

## Step 1: Fetch the thread

```bash
{baseDir}/fetch.js <url-or-id>              # full thread
{baseDir}/fetch.js <url-or-id> --max 200    # cap at 200 comments
```

Accepts a full HN URL (`https://news.ycombinator.com/item?id=12345`) or a bare item ID.

Outputs a plain-text tree to stdout with metadata header and indented comments. Progress goes to stderr.

For very large threads (500+ comments), use `--max` to keep output within context limits.

## Step 2: Fetch the linked article (if any)

If the thread links to an external article (shown as `ARTICLE_URL:` in fetch output), fetch it for context using the brave-search skill's `content.js`:

```bash
~/.pi/agent/skills/pi-skills/brave-search/content.js <article-url>
```

If that fails or is unavailable, search for the article:

```bash
~/.pi/agent/skills/pi-skills/brave-search/search.js "<article title>" --content -n 1
```

Skip this step for Ask HN / Show HN threads with no external link.

## Step 3: Distill

Analyze the thread and produce a structured markdown distillation. Follow this template:

```markdown
## HN Thread Distillation: "<thread title>"

**Article summary:** <1-3 sentence summary of the linked article, or "Ask HN" description>

### Dominant Sentiment: <characterize in 3-5 words>

<1-2 sentences on overall thread mood and whether it's notable>

### Key Insights

**1. <Insight title>**

<2-4 sentences. Include the sharpest quote from the thread when available.>

**2. <Insight title>**

...

### What the Thread Misses

- <Blind spots, unasked questions, or angles nobody explored>

### Verdict

<2-3 sentence synthesis. What's the real takeaway?>
```

### Analysis guidelines

- **Be opinionated, not balanced.** Identify what the thread actually concluded, not "some said X, others said Y."
- **Prioritize novel insights** over restatements of conventional wisdom.
- **Quote the sharpest comments** — the ones that crystallize a point better than paraphrase.
- **Flag astroturf/spam** if you spot planted comments (patent spam, product plugs, etc.).
- **Note demographic splits** when different groups of commenters talk past each other.
- **Count signal, not volume.** A single well-argued contrarian comment matters more than 10 "+1" replies.
- **Identify the framework** if the thread converges on one (e.g., "lethal trifecta," "solution looking for a problem").
- Typical output: 5-10 insights, 300-800 words total.

## Step 4: Save to disk

Save the distillation as a markdown file. Default location depends on project context — follow the user's conventions for where research files go.
