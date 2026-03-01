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
```

### Options

- `--tokens <num>` - Max tokens in response (default: 8192, max: 32768)
- `--urls <num>` - Max URLs to include (default: 20, max: 50)
- `--count <num>` - Search results to consider (default: 20, max: 50)
- `--threshold <mode>` - Relevance filter: `strict`, `balanced` (default), `lenient`, `disabled`
- `--country <code>` - Two-letter country code (default: US)
- `--freshness <period>` - Filter by time: `pd`, `pw`, `pm`, `py`

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
