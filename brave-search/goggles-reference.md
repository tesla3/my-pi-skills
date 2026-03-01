# Goggles Reference

Read this when composing custom inline goggles or choosing hosted goggles for `search.js`.

## Syntax

### Actions

| Action | Effect | Example |
|--------|--------|---------|
| `$boost=N` | Boost ranking (N=1-10, multiplicative) | `$boost=5,site=docs.python.org` |
| `$downrank=N` | Lower ranking (N=1-10) | `$downrank=3,site=w3schools.com` |
| `$discard` | Remove from results | `$discard,site=pinterest.com` |

`$boost=1` = keep at natural ranking (no change). Use with generic `$discard` to create allow-lists.

**Precedence:** `$discard` > `$boost` > `$downrank`. More specific patterns override less specific.

### Targeting

| Target | Syntax | Example |
|--------|--------|---------|
| Domain | `$boost=3,site=example.com` | Target a domain |
| URL pattern | `/docs/$boost=3` | URLs containing `/docs/` |
| Wildcard | `/api/*/v2$boost=3` | Match with `*` (max 2) |
| Left anchor | `\|https://docs.$boost=3` | URLs starting with prefix |
| Right anchor | `.pdf\|$boost=2` | URLs ending with suffix |
| Caret | `/api^$boost=3` | Match followed by separator or end-of-URL |

### Allow-List Pattern

The most powerful pattern — discard everything, whitelist specific sources:
```
$discard
$boost=5,site=docs.python.org
$boost=3,site=realpython.com
$boost=1,site=stackoverflow.com      # keep at natural ranking
```

### Limits

Inline goggles: keep to ~15 rules max (URL encoding length limits). For broad filtering, use presets or hosted goggles.

## Hosted Goggles

Hosted goggles work with both `llm-context.js` and `search.js`. Pass the raw GitHub URL to `--goggles`.

### Brave Official

| Goggle | Rules | Effect |
|--------|-------|--------|
| [copycats_removal](https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/copycats_removal.goggle) | 189 | Discard SO/GitHub translation scrapers |
| [hacker_news](https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/hacker_news.goggle) | 6,238 | Boost domains popular on HN |
| [tech_blogs](https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/tech_blogs.goggle) | 1,295 | Boost tech blog domains |
| [no_pinterest](https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/no_pinterest.goggle) | — | Remove all Pinterest domains |

### Community

| Goggle | Rules | Effect |
|--------|-------|--------|
| [boost-official-docs](https://raw.githubusercontent.com/banana-boost/banana-boost/master/boost-official-docs.goggle) | 45 | Boost official doc sites (Python, Rust, JS, Go, etc.) |
| [banana-boost](https://raw.githubusercontent.com/banana-boost/banana-boost/master/banana-boost.goggle) | 7,468 | Broad quality domain filter |
| [netsec](https://raw.githubusercontent.com/forcesunseen/netsec-goggle/master/netsec.goggle) | 3,896 | Boost infosec/netsec community domains |

Usage with search.js:
```bash
search.js "query" --goggles 'https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/copycats_removal.goggle'
```

## Known Spam Domains

For composing custom inline goggles.

**Programming SEO farms** (original but low-quality content — not in copycats_removal):
w3schools.com, geeksforgeeks.org, tutorialspoint.com, javatpoint.com, programiz.com, educba.com, codegrepper.com, programcreek.com

**GitHub/SO scrapers** (verbatim content theft — mostly in copycats_removal):
githubmemory.com, githubplus.com, giters.com, bleepcoder.com, awesomeopensource.com, opensourcelibs.com, reposhub.com, stackoom.com

**General noise** (context-dependent):
pinterest.com, quora.com, wikihow.com, medium.com (downrank, not discard)

## API Parameter Details

| API | Inline rules | Hosted goggle URLs | Param name |
|-----|-------------|-------------------|------------|
| LLM Context (`llm-context.js`) | ✅ | ✅ | `goggles` (both) |
| Web Search (`search.js`) | ✅ | ✅ | `goggles` (inline) / `goggles_id` (URL) |

Note: The LLM Context API uses `goggles` for both inline rules and hosted URLs. The Web Search API uses separate params: `goggles` for inline, `goggles_id` for hosted URLs. Our `search.js` auto-detects which to use.
