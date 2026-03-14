---
name: serper-search
description: Google search via Serper API. Fallback for when Brave Search misses niche technical docs, error messages, or obscure library documentation. Uses Google's index — the most comprehensive for technical queries.
---

# Serper Search (Google Fallback)

**When to use instead of brave-search:** When Brave returns poor/no results for niche technical queries — obscure library docs, specific error messages, framework-specific APIs. Google's index is larger and has better coverage of Stack Overflow, GitHub issues, and documentation sites.

**When to use brave-search instead:** For general research, LLM-optimized content (llm-context.js), SEO filtering (Goggles), and most searches. Brave is faster (669ms vs ~2.9s) and returns pre-extracted content.

## Search

```bash
{baseDir}/search.js "query"                                    # 5 results
{baseDir}/search.js "query" -n 10                               # More results
{baseDir}/search.js "query" --content                           # Include page content as markdown
{baseDir}/search.js "query" --site docs.python.org              # Restrict to domain
{baseDir}/search.js "query" --period w                          # Last week only
{baseDir}/search.js "query" --site stackoverflow.com --content  # SO answers with content
```

### Options

- `-n <num>` — Number of results (default: 5, max: 100)
- `--content` — Fetch and extract full page content as markdown (uses Readability)
- `--period <time>` — Time filter: `d` (day), `w` (week), `m` (month), `y` (year)
- `--site <domain>` — Restrict results to a specific domain
- `--gl <country>` — Country code (default: us)
- `--hl <lang>` — Language code (default: en)

### Typical Fallback Patterns

```bash
# Brave missed it — try Google's index
{baseDir}/search.js "go-quartz library cron scheduling example" --content

# Error message lookup (Google excels at these)
{baseDir}/search.js "error: cannot find module '@prisma/client' after upgrade" -n 3 --content

# Specific library docs
{baseDir}/search.js "pgvector cosine similarity operator <=>" --site stackoverflow.com --content

# Recent content
{baseDir}/search.js "React 19 useOptimistic hook" --period m --content
```

## Setup

Requires `SERPER_API_KEY` env var. Get one at https://serper.dev — **free 2,500 queries, no credit card needed.**

```bash
export SERPER_API_KEY="your-key"    # Add to ~/.zprofile
cd {baseDir} && npm install          # Run once
```

## Cost

- **$1/1K queries** (entry tier, $50 for 50K credits)
- **$0.30/1K** at 500K+ volume
- **Free tier:** 2,500 queries (one-time, no CC)
- 5× cheaper than Brave ($5/1K)
