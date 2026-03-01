#!/usr/bin/env node

const PRESETS = {
	code: [
		"$discard,site=w3schools.com",
		"$discard,site=geeksforgeeks.org",
		"$discard,site=tutorialspoint.com",
		"$discard,site=javatpoint.com",
		"$discard,site=programiz.com",
		"$discard,site=educba.com",
		"$discard,site=codegrepper.com",
		"$discard,site=programcreek.com",
		"$boost=3,site=stackoverflow.com",
		"/docs/$boost=2",
	].join("\n"),
	research: [
		"$boost=5,site=arxiv.org",
		"$boost=3,site=dl.acm.org",
		"$boost=3,site=news.ycombinator.com",
		"$boost=2,site=reddit.com",
		"$boost=2,site=lobste.rs",
		"$downrank=3,site=medium.com",
		"$discard,site=geeksforgeeks.org",
		"$discard,site=w3schools.com",
	].join("\n"),
	docs: [
		"$discard",
		"$boost=5,site=docs.python.org",
		"$boost=5,site=developer.mozilla.org",
		"$boost=5,site=docs.rust-lang.org",
		"$boost=5,site=docs.rs",
		"$boost=5,site=go.dev",
		"$boost=5,site=typescriptlang.org",
		"$boost=5,site=nodejs.org",
		"$boost=3,site=realpython.com",
		"$boost=1,site=stackoverflow.com",
		"$boost=1,site=github.com",
	].join("\n"),
};

const PRESET_NAMES = Object.keys(PRESETS);

const args = process.argv.slice(2);

// Parse options
let maxTokens = 8192;
let maxUrls = 20;
let count = 20;
let threshold = "balanced";
let country = "US";
let freshness = null;

function extractOpt(flag) {
	const i = args.indexOf(flag);
	if (i !== -1 && args[i + 1]) {
		const val = args[i + 1];
		args.splice(i, 2);
		return val;
	}
	return null;
}

const tokVal = extractOpt("--tokens");
if (tokVal) maxTokens = parseInt(tokVal, 10);

const urlVal = extractOpt("--urls");
if (urlVal) maxUrls = parseInt(urlVal, 10);

const countVal = extractOpt("--count");
if (countVal) count = parseInt(countVal, 10);

const threshVal = extractOpt("--threshold");
if (threshVal) threshold = threshVal;

const countryVal = extractOpt("--country");
if (countryVal) country = countryVal.toUpperCase();

freshness = extractOpt("--freshness");

const preset = extractOpt("--preset");
const goggles = extractOpt("--goggles");

const query = args.join(" ");

if (!query) {
	console.log("Usage: llm-context.js <query> [options]");
	console.log("\nFetches search results with pre-extracted content optimized for LLMs.");
	console.log("Single API call — no separate content fetching needed.\n");
	console.log("Options:");
	console.log("  --tokens <num>      Max tokens in response (default: 8192, min: 1024, max: 32768)");
	console.log("  --urls <num>        Max URLs to include (default: 20, max: 50)");
	console.log("  --count <num>       Search results to consider (default: 20, max: 50)");
	console.log("  --threshold <mode>  Relevance filter: strict|balanced|lenient|disabled (default: balanced)");
	console.log("  --country <code>    Two-letter country code (default: US)");
	console.log("  --freshness <p>     Filter by time: pd (day), pw (week), pm (month), py (year)");
	console.log("  --preset <name>     Built-in goggles: code, research, docs");
	console.log("  --goggles <rules>   Custom inline re-ranking rules (newline-separated)");
	console.log("\nPresets:");
	console.log("  code      Discard SEO farms (w3schools, geeksforgeeks, etc.), boost SO + /docs/");
	console.log("  research  Boost arxiv, ACM, HN, lobste.rs; downrank medium; discard SEO farms");
	console.log("  docs      Allow-list: ONLY official docs (Python, MDN, Rust, Go, TS, Node) + SO");
	console.log("\nExamples:");
	console.log('  llm-context.js "python asyncio"');
	console.log('  llm-context.js "python asyncio" --preset code');
	console.log('  llm-context.js "transformer attention" --preset research --tokens 16384');
	console.log('  llm-context.js "fetch API" --preset docs');
	console.log('  llm-context.js "query" --goggles \'$discard,site=pinterest.com\'');
	console.log("\nEnvironment:");
	console.log("  BRAVE_API_KEY    Required. Your Brave Search API key.");
	process.exit(1);
}

if (preset && goggles) {
	console.error("Error: --preset and --goggles cannot be used together.");
	process.exit(1);
}

if (preset && !PRESETS[preset]) {
	console.error(`Error: Unknown preset '${preset}'. Available: ${PRESET_NAMES.join(", ")}`);
	process.exit(1);
}

// Resolve goggles: preset > custom > none
let resolvedGoggles = null;
if (preset) {
	resolvedGoggles = PRESETS[preset];
} else if (goggles) {
	if (goggles.startsWith("http")) {
		console.error("Error: The LLM Context API does not support hosted goggle URLs.");
		console.error("Use --preset for built-in filters, or --goggles with inline rules.");
		console.error("Hosted goggles only work with search.js (web search API).");
		process.exit(1);
	}
	resolvedGoggles = goggles.replace(/\\n/g, "\n");
}

const apiKey = process.env.BRAVE_API_KEY;
if (!apiKey) {
	console.error("Error: BRAVE_API_KEY environment variable is required.");
	console.error("Get your API key at: https://api-dashboard.search.brave.com/app/keys");
	process.exit(1);
}

try {
	const params = new URLSearchParams({
		q: query,
		country: country,
		count: Math.min(count, 50).toString(),
		maximum_number_of_tokens: Math.min(maxTokens, 32768).toString(),
		maximum_number_of_urls: Math.min(maxUrls, 50).toString(),
		context_threshold_mode: threshold,
	});

	if (freshness) {
		params.append("freshness", freshness);
	}

	if (resolvedGoggles) {
		params.append("goggles", resolvedGoggles);
	}

	const url = `https://api.search.brave.com/res/v1/llm/context?${params.toString()}`;

	const response = await fetch(url, {
		headers: {
			"Accept": "application/json",
			"Accept-Encoding": "gzip",
			"X-Subscription-Token": apiKey,
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
		process.exit(1);
	}

	const data = await response.json();

	const results = data.grounding?.generic || [];
	const sources = data.sources || {};

	if (results.length === 0) {
		console.error("No results found.");
		process.exit(0);
	}

	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		const source = sources[r.url] || {};
		const age = source.age?.[2] || "";

		console.log(`--- Result ${i + 1} ---`);
		console.log(`Title: ${r.title || ""}`);
		console.log(`URL: ${r.url || ""}`);
		if (age) console.log(`Age: ${age}`);
		if (r.snippets && r.snippets.length > 0) {
			console.log(`Content:\n${r.snippets.join("\n\n")}`);
		}
		console.log("");
	}
} catch (e) {
	console.error(`Error: ${e.message}`);
	process.exit(1);
}
