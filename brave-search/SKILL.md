---
name: brave-search
description: Web search and content extraction via Brave Search API. Use for searching documentation, facts, or any web content. Lightweight, no browser required.
---

# Brave Search

## Which Tool

| Need | Tool |
|------|------|
| Search + read content (default) | `llm-context.js` |
| Just URLs and snippets | `search.js` |
| Fetch a specific known URL | `content.js` |

## LLM Context (Default)

Single API call — searches the web AND returns pre-extracted content optimized for LLMs.

```bash
{baseDir}/llm-context.js "query"                                    # Standard
{baseDir}/llm-context.js "query" --preset code                      # Filter SEO spam for programming
{baseDir}/llm-context.js "query" --preset research                  # Boost academic/quality sources
{baseDir}/llm-context.js "query" --preset docs                      # Only official documentation
{baseDir}/llm-context.js "query" --tokens 16384 --urls 30           # Deep research
{baseDir}/llm-context.js "query" --freshness pw                     # Last week only
{baseDir}/llm-context.js "query" --goggles '$discard,site=x.com'    # Custom inline rules
```

### Presets

Use `--preset` for common filtering patterns. These are built-in inline goggles rules — tested and working.

| Preset | Effect |
|--------|--------|
| `code` | Discard 8 SEO farms (w3schools, geeksforgeeks, tutorialspoint, etc.), boost SO + `/docs/` paths |
| `research` | Boost arxiv, ACM, HN, lobste.rs; downrank medium; discard SEO farms |
| `docs` | **Allow-list only**: official docs (Python, MDN, Rust, Go, TS, Node), realpython, SO, GitHub. Everything else discarded. |

### Options

- `--tokens <num>` — Max tokens (default: 8192, min: 1024, max: 32768)
- `--urls <num>` — Max URLs (default: 20, max: 50)
- `--count <num>` — Search results to consider (default: 20, max: 50)
- `--threshold <mode>` — Relevance: `strict`, `balanced` (default), `lenient`, `disabled`
- `--country <code>` — Two-letter country code (default: US)
- `--freshness <period>` — `pd` (day), `pw` (week), `pm` (month), `py` (year)
- `--preset <name>` — Built-in goggles: `code`, `research`, `docs`
- `--goggles <val>` — Hosted goggle URL or custom inline rules (use `\n` between rules). Cannot combine with `--preset`.

### Custom Goggles

For per-query customization beyond presets. See [goggles-reference.md](goggles-reference.md) for full syntax, hosted goggles catalog, and domain lists.

```bash
# Hosted goggle (189 copycat scrapers removed)
{baseDir}/llm-context.js "query" --goggles 'https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/copycats_removal.goggle'

# Hosted goggle (boost 6,238 HN-popular domains)
{baseDir}/llm-context.js "query" --goggles 'https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/hacker_news.goggle'

# Inline: discard specific domains
{baseDir}/llm-context.js "query" --goggles '$discard,site=pinterest.com\n$discard,site=quora.com'

# Inline: allow-list pattern
{baseDir}/llm-context.js "query" --goggles '$discard\n$boost=5,site=arxiv.org\n$boost=1,site=github.com'
```

**Key rules:** `$boost=N,site=domain` (N=1-10), `$downrank=N,site=domain`, `$discard,site=domain`, `$discard` (discard all unmatched). Precedence: discard > boost > downrank.

## Search

Returns URLs, snippets, and extra snippets.

```bash
{baseDir}/search.js "query"                          # 5 results
{baseDir}/search.js "query" -n 10                    # More results (max 20)
{baseDir}/search.js "query" --content                # Include page content as markdown
{baseDir}/search.js "query" --freshness pw           # Last week
{baseDir}/search.js "query" --goggles 'https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/copycats_removal.goggle'
```

Options: `-n <num>`, `--content`, `--country <code>`, `--freshness <period>`, `--goggles <url|rules>`

Both hosted goggles (pass URL) and inline rules work with `--goggles`. See [goggles-reference.md](goggles-reference.md) for hosted goggles catalog.

## Extract Page Content

```bash
{baseDir}/content.js https://example.com/article
```

## Setup

Requires `BRAVE_API_KEY` env var. Get one at https://api-dashboard.search.brave.com — $5/1k requests, $5 free monthly credits.

```bash
export BRAVE_API_KEY="your-key"    # Add to ~/.zprofile
cd {baseDir} && npm install         # Run once
```
