#!/usr/bin/env node

/**
 * Fetch a Hacker News thread (story + comment tree) as structured text.
 *
 * Usage:
 *   fetch.js <item_id_or_url> [--max N]
 *
 * Uses the official HN Firebase API. Requires curl.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HN_API = "https://hacker-news.firebaseio.com/v0/item/{ID}.json";
const CONCURRENT = 20;

// --- Argument parsing ---

const args = process.argv.slice(2);

let maxComments = 200;
const maxDepth = 10;

function consumeFlag(flag) {
	const i = args.indexOf(flag);
	if (i !== -1 && args[i + 1]) {
		const val = parseInt(args[i + 1], 10);
		args.splice(i, 2);
		return val;
	}
	return null;
}

maxComments = consumeFlag("--max") ?? maxComments;

const input = args[0];

if (!input) {
	console.log("Usage: fetch.js <item_id_or_url> [--max N]");
	console.log("");
	console.log("Fetches a Hacker News thread and outputs structured text for analysis.");
	console.log("");
	console.log("Arguments:");
	console.log("  item_id_or_url        HN item ID (e.g. 46820783) or full URL");
	console.log("");
	console.log("Options:");
	console.log("  --max N               Max comments to fetch (default: 200)");
	console.log("");
	console.log("Examples:");
	console.log("  fetch.js 46820783");
	console.log("  fetch.js https://news.ycombinator.com/item?id=46820783");
	console.log("  fetch.js 46820783 --max 500");
	process.exit(1);
}

// --- Helpers ---

function parseItemId(s) {
	const m = s.match(/(?:item\?id=|^)(\d+)/);
	if (!m) {
		console.error(`Error: cannot parse item ID from '${s}'`);
		process.exit(1);
	}
	return parseInt(m[1], 10);
}

async function fetchItem(id) {
	const url = HN_API.replace("{ID}", id);
	try {
		const { stdout } = await execFileAsync("curl", [
			"-s",
			"-f",
			"--retry",
			"3",
			"--retry-delay",
			"1",
			"--max-time",
			"10",
			"-H",
			"User-Agent: hn-distill/1.0",
			url,
		]);
		return JSON.parse(stdout);
	} catch {
		return null;
	}
}

async function fetchBatch(ids) {
	const results = new Map();
	// Process in chunks of CONCURRENT
	for (let i = 0; i < ids.length; i += CONCURRENT) {
		const chunk = ids.slice(i, i + CONCURRENT);
		const items = await Promise.all(chunk.map((id) => fetchItem(id)));
		for (let j = 0; j < chunk.length; j++) {
			if (items[j]) results.set(chunk[j], items[j]);
		}
	}
	return results;
}

function stripHtml(text) {
	if (!text) return "";
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, "/")
		.replace(/<p>/gi, "\n\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
		.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n")
		.replace(/<code>(.*?)<\/code>/gi, "`$1`")
		.replace(/<i>(.*?)<\/i>/gi, "*$1*")
		.replace(/<[^>]+>/g, "")
		.trim();
}

function relativeTime(unixTs) {
	if (!unixTs) return "unknown";
	const now = Date.now() / 1000;
	const delta = now - unixTs;
	const minutes = Math.floor(delta / 60);
	const hours = Math.floor(delta / 3600);
	const days = Math.floor(delta / 86400);
	if (days > 365) return `${Math.floor(days / 365)}y ago`;
	if (days > 30) return `${Math.floor(days / 30)}mo ago`;
	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "just now";
}

// --- Core: fetch comment tree breadth-first ---

async function fetchCommentTree(rootKids, maxComments, maxDepth) {
	const all = []; // flat list with ._depth
	// queue of { id, depth }
	let queue = rootKids.map((id) => ({ id, depth: 0 }));
	let fetched = 0;

	while (queue.length > 0 && fetched < maxComments) {
		const batchSize = Math.min(queue.length, maxComments - fetched);
		const batch = queue.splice(0, batchSize);

		const items = await fetchBatch(batch.map((b) => b.id));
		process.stderr.write(`\r  fetched ${fetched + items.size}/${maxComments} comments...`);

		// Preserve original order
		for (const { id, depth } of batch) {
			const item = items.get(id);
			if (!item) continue;
			if (item.deleted || item.dead) continue;
			if (item.type !== "comment") continue;

			item._depth = depth;
			all.push(item);
			fetched++;

			if (depth < maxDepth - 1 && item.kids && item.kids.length > 0) {
				for (const kidId of item.kids) {
					queue.push({ id: kidId, depth: depth + 1 });
				}
			}
		}
	}

	process.stderr.write("\n");
	return all;
}

// --- Build tree from flat list ---

function buildTree(comments, rootId) {
	const byId = new Map();
	for (const c of comments) {
		byId.set(c.id, { ...c, _children: [] });
	}

	const roots = [];
	for (const c of comments) {
		const node = byId.get(c.id);
		const parentId = c.parent;
		if (parentId === rootId) {
			roots.push(node);
		} else if (byId.has(parentId)) {
			byId.get(parentId)._children.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}

// --- Render tree as indented text ---

function renderTree(nodes, depth = 0) {
	const lines = [];
	const indent = "  ".repeat(depth);

	for (const node of nodes) {
		const by = node.by || "[deleted]";
		const when = relativeTime(node.time);
		const text = stripHtml(node.text || "");
		const body = text
			.split("\n")
			.map((line) => `${indent}  ${line}`)
			.join("\n");

		lines.push(`${indent}[${by}] (${when}):`);
		lines.push(body);
		lines.push("");

		if (node._children && node._children.length > 0) {
			lines.push(renderTree(node._children, depth + 1));
		}
	}
	return lines.join("\n");
}

// --- Main ---

const itemId = parseItemId(input);

process.stderr.write(`Fetching item ${itemId}...\n`);
const root = await fetchItem(itemId);
if (!root) {
	console.error("Error: could not fetch item");
	process.exit(1);
}

const title = root.title || "(no title)";
const hnUrl = `https://news.ycombinator.com/item?id=${itemId}`;
const articleUrl = root.url || null;
const by = root.by || "unknown";
const score = root.score || 0;
const numComments = root.descendants || 0;
const when = relativeTime(root.time);
const storyText = stripHtml(root.text || "");

console.log("=== HN THREAD ===");
console.log(`Title: ${title}`);
if (articleUrl) {
	console.log(`ARTICLE_URL: ${articleUrl}`);
}
console.log(`HN: ${hnUrl}`);
console.log(`By: ${by} | Score: ${score} | Comments: ${numComments} | Posted: ${when}`);
if (storyText) {
	console.log(`\n${storyText}`);
}
console.log(`\n${"=".repeat(60)}\n`);

const kids = root.kids || [];
if (kids.length === 0) {
	console.log("(no comments)");
	process.exit(0);
}

process.stderr.write(`Fetching up to ${maxComments} comments (depth ${maxDepth})...\n`);
const comments = await fetchCommentTree(kids, maxComments, maxDepth);
process.stderr.write(`Done: ${comments.length} comments fetched\n`);

const tree = buildTree(comments, itemId);
console.log(renderTree(tree));

console.log(`\n${"=".repeat(60)}`);
console.log(`Total comments fetched: ${comments.length} / ${numComments}`);
const uniqueAuthors = new Set(comments.filter((c) => c.by).map((c) => c.by)).size;
console.log(`Unique authors: ${uniqueAuthors}`);
