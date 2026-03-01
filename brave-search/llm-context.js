#!/usr/bin/env node

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

const goggles = extractOpt("--goggles");

const query = args.join(" ");

if (!query) {
	console.log("Usage: llm-context.js <query> [options]");
	console.log("\nFetches search results with pre-extracted content optimized for LLMs.");
	console.log("Single API call — no separate content fetching needed.\n");
	console.log("Options:");
	console.log("  --tokens <num>      Max tokens in response (default: 8192, max: 32768)");
	console.log("  --urls <num>        Max URLs to include (default: 20, max: 50)");
	console.log("  --count <num>       Search results to consider (default: 20, max: 50)");
	console.log("  --threshold <mode>  Relevance filter: strict|balanced|lenient|disabled (default: balanced)");
	console.log("  --country <code>    Two-letter country code (default: US)");
	console.log("  --freshness <p>     Filter by time: pd (day), pw (week), pm (month), py (year)");
	console.log("  --goggles <rules>   Custom re-ranking rules (newline-separated)");
	console.log("                      $boost=N,site=domain.com  — boost domain (N=1-10)");
	console.log("                      $downrank=N,site=domain.com — lower ranking");
	console.log("                      $discard,site=domain.com — remove domain");
	console.log("                      $discard (alone) — discard all not explicitly boosted");
	console.log("\nPresets:");
	console.log('  Quick fact:    llm-context.js "query" --tokens 2048 --urls 3');
	console.log('  Standard:      llm-context.js "query"');
	console.log('  Deep research: llm-context.js "query" --tokens 16384 --urls 30 --count 50');
	console.log('  Docs only:    llm-context.js "query" --goggles \'$discard\\n$boost=5,site=docs.python.org\'');
	console.log('  No spam:      llm-context.js "query" --goggles \'$discard,site=w3schools.com\'');
	console.log("\nEnvironment:");
	console.log("  BRAVE_API_KEY    Required. Your Brave Search API key.");
	process.exit(1);
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

	if (goggles) {
		// Replace literal \n with actual newlines for shell convenience
		params.append("goggles", goggles.replace(/\\n/g, "\n"));
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
