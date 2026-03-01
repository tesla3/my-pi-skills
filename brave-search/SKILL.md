---
name: brave-search
description: Web search and content extraction via Brave Search API. Use for searching documentation, facts, or any web content. Lightweight, no browser required.
---

# Brave Search

Web search and content extraction using the official Brave Search API. No browser required.

## Setup

Requires a Brave Search API account. Plans start at $5/1k requests with $5 in free monthly credits (~1,000 queries). A credit card is required.

1. Create an account at https://api-dashboard.search.brave.com/register
2. Subscribe to a Search plan
3. Create an API key for the subscription
4. Add to your shell profile (`~/.profile` or `~/.zprofile` for zsh):
   ```bash
   export BRAVE_API_KEY="your-api-key-here"
   ```
5. Install dependencies (run once):
   ```bash
   cd {baseDir}
   npm install
   ```

## LLM Context (Recommended for Agent Use)

Single API call that searches the web AND returns pre-extracted content optimized for LLM consumption. No separate content fetching needed. Use this instead of `search.js --content` for most agent tasks.

```bash
{baseDir}/llm-context.js "query"                              # Standard (8K tokens, 20 URLs)
{baseDir}/llm-context.js "query" --tokens 2048 --urls 3       # Quick fact lookup
{baseDir}/llm-context.js "query" --tokens 16384 --urls 30     # Deep research
{baseDir}/llm-context.js "query" --freshness pw               # Last week only
{baseDir}/llm-context.js "query" --country DE                 # Results from Germany
{baseDir}/llm-context.js "query" --goggles '$discard\n$boost=5,site=docs.python.org'  # Docs only
{baseDir}/llm-context.js "query" --goggles '$discard,site=w3schools.com'              # Exclude domain
```

### Options

- `--tokens <num>` - Max tokens in response (default: 8192, max: 32768)
- `--urls <num>` - Max URLs to include (default: 20, max: 50)
- `--count <num>` - Search results to consider (default: 20, max: 50)
- `--threshold <mode>` - Relevance filter: `strict`, `balanced` (default), `lenient`, `disabled`
- `--country <code>` - Two-letter country code (default: US)
- `--freshness <period>` - Filter by time: `pd`, `pw`, `pm`, `py`
- `--goggles <rules>` - Custom re-ranking rules (use `\n` to separate multiple rules). See Goggles Reference below.

### Goggles Reference

#### Actions
| Action | Effect | Example |
|--------|--------|---------|
| `$boost=N` | Boost ranking (N=1-10, multiplicative) | `$boost=5,site=docs.python.org` |
| `$downrank=N` | Lower ranking (N=1-10) | `$downrank=3,site=w3schools.com` |
| `$discard` | Completely remove from results | `$discard,site=pinterest.com` |

**`$boost=1`** = keep at natural ranking (no boost). Use with `$discard` to create an allow-list.

**Precedence:** `$discard` > `$boost` > `$downrank`. More specific patterns override less specific.

#### Targeting
| Target | Syntax | Example |
|--------|--------|---------|
| Domain | `$boost=3,site=example.com` | Target a domain |
| URL pattern | `/docs/$boost=3` | URLs containing `/docs/` |
| Wildcard | `/api/*/v2$boost=3` | Match with `*` (max 2 wildcards) |
| Left anchor | `\|https://docs.$boost=3` | URLs starting with prefix |
| Right anchor | `.pdf\|$boost=2` | URLs ending with suffix |
| Title match | `tutorial$intitle,$boost=2` | Match in page title |
| URL match | `docs$inurl,$boost=2` | Match in URL |

#### Key Pattern: Allow-List with `$discard`

The most powerful pattern for focused research. Discard all noise, keep only authoritative sources:
```
$discard                              # discard everything by default
$boost=5,site=docs.python.org        # strongly boost official docs
$boost=3,site=realpython.com         # boost quality tutorials
$boost=1,site=stackoverflow.com      # keep at natural ranking (don't discard, don't boost)
```

#### Practical Limits

Keep inline goggles to **5-15 rules**. URL encoding of many rules can hit HTTP URL length limits. For broad filtering, use `$discard` + targeted `$boost` rather than listing every spam domain.

### Goggles Recipes

Use `--goggles` to control result quality. Combine rules with `\n`.

#### Programming Search (recommended default for code queries)

Discard the worst copycat/SEO farms, boost official sources:
```bash
{baseDir}/llm-context.js "python asyncio" --goggles '$discard,site=w3schools.com\n$discard,site=geeksforgeeks.org\n$discard,site=tutorialspoint.com\n$discard,site=javatpoint.com\n$discard,site=programiz.com\n$discard,site=educba.com\n$boost=3,site=stackoverflow.com\n/docs/$boost=2'
```

#### Official Docs Only (allow-list)

When you only want authoritative sources — discard everything else:
```bash
{baseDir}/llm-context.js "python asyncio" --goggles '$discard\n$boost=5,site=docs.python.org\n$boost=3,site=realpython.com\n$boost=1,site=stackoverflow.com'
```

#### Research / Academic

Boost papers and technical discussion, downrank SEO:
```bash
{baseDir}/llm-context.js "transformer attention mechanisms" --goggles '$boost=5,site=arxiv.org\n$boost=3,site=news.ycombinator.com\n$boost=2,site=reddit.com\n$boost=3,site=dl.acm.org\n$downrank=3,site=medium.com\n$discard,site=geeksforgeeks.org'
```

#### GitHub / Source Code Focused

```bash
{baseDir}/llm-context.js "query" --goggles '$boost=5,site=github.com\n$boost=3,site=stackoverflow.com\n$boost=2,site=docs.rs\n$discard,site=githubmemory.com\n$discard,site=githubplus.com\n$discard,site=giters.com\n$discard,site=bleepcoder.com'
```

#### No Pinterest / No Social Noise

For queries polluted by Pinterest, social media, or Q&A sites:
```bash
{baseDir}/llm-context.js "query" --goggles '$discard,site=pinterest.com\n$discard,site=quora.com\n$discard,site=wikihow.com\n$discard,site=linkedin.com'
```

### Known SEO Spam Domains (for agent reference)

**Programming copycats** (always safe to discard for technical queries):
w3schools.com, geeksforgeeks.org, tutorialspoint.com, javatpoint.com, programiz.com, educba.com, codegrepper.com, newbedev.com, 9to5answer.com, programcreek.com, appsloveworld.com, solveforum.com

**GitHub/SO scrapers** (always safe to discard):
githubmemory.com, githubplus.com, giters.com, bleepcoder.com, awesomeopensource.com, opensourcelibs.com, reposhub.com, geekrepos.com, stackoom.com, coder.social, issuehint.com

**General noise** (discard/downrank based on context):
pinterest.com, quora.com, wikihow.com, medium.com (downrank, not discard — occasionally has quality content)

### When to Apply Goggles

- **Programming queries:** Always consider discarding copycats + boosting official docs
- **Research/analysis:** Boost arxiv, HN, Reddit; downrank medium.com, SEO farms
- **Quick facts:** Usually don't need goggles — default results are fine
- **Product/review queries:** Downrank media conglomerate listicles (investopedia.com, lifewire.com, thespruce.com)
- **Prefer `$downrank` over `$discard`** unless the domain is a known scraper/copycat — over-filtering narrows results too aggressively

### When to Use LLM Context vs Search

| Use case | Tool |
|----------|------|
| Need content for analysis/research | `llm-context.js` |
| Just need URLs and snippets | `search.js` |
| Fetch a specific known URL | `content.js` |

## Search

```bash
{baseDir}/search.js "query"                         # Basic search (5 results)
{baseDir}/search.js "query" -n 10                   # More results (max 20)
{baseDir}/search.js "query" --content               # Include page content as markdown
{baseDir}/search.js "query" --freshness pw          # Results from last week
{baseDir}/search.js "query" --freshness 2024-01-01to2024-06-30  # Date range
{baseDir}/search.js "query" --country DE            # Results from Germany
{baseDir}/search.js "query" -n 3 --content          # Combined options
```

### Options

- `-n <num>` - Number of results (default: 5, max: 20)
- `--content` - Fetch and include page content as markdown (consider `llm-context.js` instead)
- `--country <code>` - Two-letter country code (default: US)
- `--freshness <period>` - Filter by time:
  - `pd` - Past day (24 hours)
  - `pw` - Past week
  - `pm` - Past month
  - `py` - Past year
  - `YYYY-MM-DDtoYYYY-MM-DD` - Custom date range

## Extract Page Content

```bash
{baseDir}/content.js https://example.com/article
```

Fetches a specific URL and extracts readable content as markdown. Use when you already know the URL.

## Output Format

All tools produce similar output:

```
--- Result 1 ---
Title: Page Title
URL: https://example.com/page
Age: 2 days ago
Content: Extracted page content...

--- Result 2 ---
...
```

## When to Use

- **`llm-context.js`** - Default for agent search+read tasks (single call, LLM-optimized content)
- **`search.js`** - When you only need URLs/snippets, or need `--content` with Readability extraction
- **`content.js`** - Fetching a specific known URL
