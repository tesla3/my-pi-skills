---
name: hn-distill
description: Fetch and distill insights from Hacker News threads. Given an HN URL or item ID, fetches the full comment tree and produces an opinionated analysis with key insights, sentiment, and verdict.
---

# HN Distill

Fetch a Hacker News thread and distill it into an opinionated insight summary.

## Dependencies

None beyond Node.js (uses `curl` for HTTP).

## Analysis guidelines

### Source critique

- **Analyze the article before the thread.** Identify core claims, evidence, and structural weaknesses.
- **Test the source's evidence against its own thesis.** Does the example actually demonstrate the claim, or reveal a confound? If the evidence undermines the thesis, lead with that.
- **Separate claims when the source bundles them.** Evaluate each independently — the thread may validate one and demolish the other.

### Thread analysis

- **Identify the important claims and push hard on them.** Find the 2-3 that matter most and stress-test: what evidence supports them, what would falsify them, do the asserters have standing?
- **Separate facts from judgment.** Distinguish verifiable claims (data, direct experience, citations) from opinion, projection, or vibes.
- **Be opinionated, not balanced.** When two camps argue past each other, check if they're making the same mistake in opposite directions — name the shared fallacy.
- **Insights must be non-obvious.** Name the *dynamic*, not the *state* (what changed, what's accelerating, what mechanism appeared).
- **Count signal, not volume.** One well-argued contrarian comment outweighs 10 "+1" replies.
- **Identify the framework** if the thread converges on one.
- **Note demographic splits.** Flag astroturf/spam.

### Quoting and attribution

- **Quote with HN usernames.**
- **Interrogate celebrated comments.** Ask *why hasn't anyone done this already?* — the answer usually reveals structural barriers the rant ignores.
- **Elevate the star comment** when one clearly outranks the rest. Don't force it.

### Synthesis

- **Verdict and "What the Thread Misses" must go beyond the thread.** Name what the thread circles but never states. Identify blind spots. Flag meta-ironies (e.g., an AI article showing AI writing tells).

### Scope

- 5-10 insights, 600-1500 words. Scale to thread complexity. Every sentence earns its place.

---

## Step 1: Fetch the original article

Get the article URL from the HN API item endpoint, then fetch and read the article before the thread.

```bash
# Get the article URL from HN API (extract the "url" field)
curl -s "https://hacker-news.firebaseio.com/v0/item/<id>.json" | jq -r '.url // empty'
```

Fetch the article using the brave-search skill's `content.js`:

```bash
~/.pi/agent/skills/pi-skills/brave-search/content.js <article-url>
```

If that fails or is unavailable, search for the article:

```bash
~/.pi/agent/skills/pi-skills/brave-search/search.js "<article title>" --content -n 1
```

Skip this step for Ask HN / Show HN threads with no external link.

## Step 2: Fetch the thread

```bash
{baseDir}/fetch.js <url-or-id>              # full thread
{baseDir}/fetch.js <url-or-id> --max 200    # cap at 200 comments
```

Accepts a full HN URL (`https://news.ycombinator.com/item?id=12345`) or a bare item ID.

Outputs a plain-text tree to stdout with metadata header and indented comments. Progress goes to stderr.

For very large threads (500+ comments), use `--max` to keep output within context limits.

## Step 3: Fetch high-signal links from comments

Scan the thread for links cited as evidence for or against key claims — data, graphs, related threads, primary sources. Fetch these with `content.js` when they'd materially strengthen your analysis. Skip product plugs, tangential references, and anything that's just color. Typical threads have 0-3 links worth chasing; don't fetch more than 5.

## Step 4: Analysis and Distill

Analyze the thread and produce a structured markdown distillation. Follow this template:

```markdown
## HN Thread Distillation: "<thread title>"

**Article summary:** <1-3 sentence summary of the linked article, or "Ask HN" description>

### Dominant Sentiment: <characterize in 3-5 words>

<1-2 sentences on overall thread mood and whether it's notable>

### Key Insights

**1. <Insight title>**

<Analysis. Include the sharpest quote with HN username attribution.>

**2. <Insight title>**

...

### Common Pushbacks

| Pushback | Quality | Note |
|----------|---------|------|
| ... | Strong / Medium / Weak / Misapplied | ... |

(Include when the thread has a clear debate axis. Omit for threads without structured disagreement.)

### What the Thread Misses

- <Blind spots, unasked questions, or angles nobody explored>

### Verdict

<2-4 sentences. Must name something the thread circles but never states.>
```

## Step 5: Review your analysis — MUST NOT SKIP

**You MUST review your analysis before saving.** Do not go straight from writing to saving. Stop here and re-read what you wrote.

Review CRITICALLY. Be thorough, tough, and fair. Ask:
- Did I actually test claims against evidence, or just summarize?
- Are my "non-obvious" insights actually non-obvious?
- Does the verdict go beyond restating the thread?
- Did I name dynamics or just describe states?

Update your analysis if needed. This step exists because you will skip it if it isn't forced.

## Step 6: Save to disk

Save the distillation as a markdown file. Default location depends on project context — follow the user's conventions for where research files go.
