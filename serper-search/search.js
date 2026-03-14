#!/usr/bin/env node

/**
 * Serper Google Search — returns URLs, titles, snippets from Google's index.
 * Use as fallback when Brave misses niche technical docs.
 *
 * Usage: search.js <query> [-n <num>] [--content] [--period <time>] [--site <domain>]
 * Env: SERPER_API_KEY required (get free at serper.dev — 2,500 queries, no CC)
 */

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const args = process.argv.slice(2);

const contentIndex = args.indexOf("--content");
const fetchContent = contentIndex !== -1;
if (fetchContent) args.splice(contentIndex, 1);

function extractOpt(flag) {
	const i = args.indexOf(flag);
	if (i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")) {
		const val = args[i + 1];
		args.splice(i, 2);
		return val;
	}
	if (i !== -1 && (!args[i + 1] || args[i + 1].startsWith("--"))) {
		console.error(`Error: ${flag} requires a value.`);
		process.exit(1);
	}
	return null;
}

let numResults = 5;
const nVal = extractOpt("-n");
if (nVal) numResults = parseInt(nVal, 10);

const period = extractOpt("--period");
const site = extractOpt("--site");
const gl = extractOpt("--gl") || "us";
const hl = extractOpt("--hl") || "en";

const query = args.join(" ");

if (!query) {
	console.log("Usage: search.js <query> [-n <num>] [--content] [--period <time>] [--site <domain>] [--gl <country>] [--hl <lang>]");
	console.log("\nGoogle search via Serper API. Cheap fallback for niche docs Brave misses.\n");
	console.log("Options:");
	console.log("  -n <num>           Number of results (default: 5, max: 100)");
	console.log("  --content          Fetch and extract page content as markdown");
	console.log("  --period <time>    Time filter: d (day), w (week), m (month), y (year)");
	console.log("  --site <domain>    Restrict to domain (e.g. stackoverflow.com)");
	console.log("  --gl <country>     Country code (default: us)");
	console.log("  --hl <lang>        Language code (default: en)");
	console.log("\nEnvironment:");
	console.log("  SERPER_API_KEY     Required. Get free key at https://serper.dev (2,500 queries, no CC)");
	console.log("\nExamples:");
	console.log('  search.js "pgvector cosine similarity operator"');
	console.log('  search.js "go-quartz cron scheduling" -n 10');
	console.log('  search.js "react useOptimistic hook" --content');
	console.log('  search.js "python asyncio" --site docs.python.org');
	console.log('  search.js "rust borrow checker" --period m');
	process.exit(1);
}

const apiKey = process.env.SERPER_API_KEY;
if (!apiKey) {
	console.error("Error: SERPER_API_KEY environment variable is required.");
	console.error("Get your free API key at: https://serper.dev (2,500 queries, no CC needed)");
	process.exit(1);
}

function htmlToMarkdown(html) {
	const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
	turndown.use(gfm);
	turndown.addRule("removeEmptyLinks", {
		filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
		replacement: () => "",
	});
	return turndown
		.turndown(html)
		.replace(/\[\\?\[\s*\\?\]\]\([^)]*\)/g, "")
		.replace(/ +/g, " ")
		.replace(/\s+,/g, ",")
		.replace(/\s+\./g, ".")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function fetchPageContent(url) {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) return `(HTTP ${response.status})`;

		const html = await response.text();
		const dom = new JSDOM(html, { url });
		const reader = new Readability(dom.window.document);
		const article = reader.parse();

		if (article && article.content) {
			return htmlToMarkdown(article.content).substring(0, 5000);
		}

		const fallbackDoc = new JSDOM(html, { url });
		const body = fallbackDoc.window.document;
		body.querySelectorAll("script, style, noscript, nav, header, footer, aside").forEach(el => el.remove());
		const main = body.querySelector("main, article, [role='main'], .content, #content") || body.body;
		const text = main?.textContent || "";

		if (text.trim().length > 100) {
			return text.trim().substring(0, 5000);
		}

		return "(Could not extract content)";
	} catch (e) {
		return `(Error: ${e.message})`;
	}
}

try {
	// Build query with site: prefix if --site provided
	const searchQuery = site ? `site:${site} ${query}` : query;

	const body = {
		q: searchQuery,
		num: Math.min(numResults, 100),
		gl: gl,
		hl: hl,
	};

	if (period) {
		const periodMap = { d: "qdr:d", w: "qdr:w", m: "qdr:m", y: "qdr:y" };
		if (periodMap[period]) {
			body.tbs = periodMap[period];
		}
	}

	const response = await fetch("https://google.serper.dev/search", {
		method: "POST",
		headers: {
			"X-API-KEY": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
	}

	const data = await response.json();

	const results = [];

	// Knowledge graph (if present, show first)
	if (data.knowledgeGraph) {
		const kg = data.knowledgeGraph;
		console.log("--- Knowledge Graph ---");
		if (kg.title) console.log(`Title: ${kg.title}`);
		if (kg.type) console.log(`Type: ${kg.type}`);
		if (kg.description) console.log(`Description: ${kg.description}`);
		if (kg.descriptionLink) console.log(`Source: ${kg.descriptionLink}`);
		if (kg.attributes) {
			for (const [k, v] of Object.entries(kg.attributes)) {
				console.log(`${k}: ${v}`);
			}
		}
		console.log("");
	}

	// Organic results
	if (data.organic) {
		for (const r of data.organic) {
			if (results.length >= numResults) break;
			results.push({
				title: r.title || "",
				link: r.link || "",
				snippet: r.snippet || "",
				date: r.date || "",
				position: r.position || 0,
			});
		}
	}

	if (results.length === 0) {
		console.error("No results found.");
		process.exit(0);
	}

	// Fetch content if requested
	if (fetchContent) {
		const contents = await Promise.all(results.map(r => fetchPageContent(r.link)));
		results.forEach((r, i) => r.content = contents[i]);
	}

	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		console.log(`--- Result ${i + 1} ---`);
		console.log(`Title: ${r.title}`);
		console.log(`URL: ${r.link}`);
		if (r.date) console.log(`Date: ${r.date}`);
		console.log(`Snippet: ${r.snippet}`);
		if (r.content) {
			console.log(`Content:\n${r.content}`);
		}
		console.log("");
	}
} catch (e) {
	console.error(`Error: ${e.message}`);
	process.exit(1);
}
