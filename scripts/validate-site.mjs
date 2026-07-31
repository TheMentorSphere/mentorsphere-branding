import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const workspace = process.cwd();
const docsRoot = path.join(workspace, "docs");
const failures = [];
const navigationMarker = "document.documentElement.classList.add('js');";
const navigationMarkerTag = `<script>${navigationMarker}</script>`;
const navigationMarkerHash = `sha256-${createHash("sha256").update(navigationMarker).digest("base64")}`;

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry);
    const details = await stat(target);
    if (details.isDirectory()) files.push(...(await walk(target)));
    else files.push(target);
  }
  return files;
}

function record(condition, message) {
  if (!condition) failures.push(message);
}

function matches(content, expression) {
  return [...content.matchAll(expression)];
}

function resolveLocalReference(htmlFile, reference) {
  const clean = reference.split("#", 1)[0].split("?", 1)[0];
  if (!clean) return null;
  const absolute = clean.startsWith("/")
    ? path.join(docsRoot, clean)
    : path.resolve(path.dirname(htmlFile), clean);
  return absolute;
}

const allFiles = await walk(docsRoot);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));

for (const htmlFile of htmlFiles) {
  const relative = path.relative(workspace, htmlFile);
  const content = await readFile(htmlFile, "utf8");
  record(matches(content, /<title>[^<]+<\/title>/gi).length === 1, `${relative}: expected one non-empty title`);
  record(
    matches(content, /<meta\s+name="description"\s+content="[^"]+"/gi).length === 1,
    `${relative}: expected one meta description`,
  );
  record(matches(content, /<h1\b/gi).length === 1, `${relative}: expected exactly one H1`);
  record(/assets\/js\/site\.js/.test(content), `${relative}: site.js is not loaded`);
  record(content.includes(navigationMarkerTag), `${relative}: JavaScript navigation marker is missing or changed`);
  record(!/\b(TODO|FIXME|lorem ipsum)\b/i.test(content), `${relative}: placeholder text found`);

  const ids = matches(content, /\sid="([^"]+)"/gi).map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  record(duplicateIds.length === 0, `${relative}: duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  const references = matches(content, /\s(?:href|src)="([^"]+)"/gi).map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    const target = resolveLocalReference(htmlFile, reference);
    if (!target) continue;
    const candidates = path.extname(target)
      ? [target]
      : [target, `${target}.html`, path.join(target, "index.html")];
    const exists = candidates.some((candidate) => allFiles.includes(path.normalize(candidate)));
    record(exists, `${relative}: unresolved local reference ${reference}`);
  }
}

const staticHeaders = await readFile(path.join(docsRoot, "_headers"), "utf8");
const scriptSource = staticHeaders.match(/\bscript-src\s+([^;]+);/)?.[1] ?? "";
record(scriptSource.includes("'self'"), "docs/_headers: script-src must allow same-origin scripts");
record(
  scriptSource.includes(`'${navigationMarkerHash}'`),
  "docs/_headers: script-src must allow the exact JavaScript navigation marker hash",
);
record(
  !scriptSource.includes("'unsafe-inline'"),
  "docs/_headers: script-src must not allow unsafe-inline",
);

const assistantScript = await readFile(path.join(docsRoot, "assets", "js", "assistant.js"), "utf8");
record(!/\.innerHTML\b/.test(assistantScript), "assistant.js: innerHTML must not be used");
record(!/\b(?:localStorage|sessionStorage|document\.cookie)\b/.test(assistantScript), "assistant.js: persistent browser storage found");
record(!/sk-[a-zA-Z0-9_-]{20,}/.test(assistantScript), "assistant.js: possible API key found");

const wrangler = await readFile(path.join(workspace, "wrangler.jsonc"), "utf8");
record(/"CHATBOT_ENABLED": "false"/.test(wrangler), "wrangler.jsonc: production feature flag must default to false");
record(!/"OPENAI_API_KEY"\s*:/.test(wrangler), "wrangler.jsonc: OpenAI secret must not be stored in vars");

if (failures.length > 0) {
  console.error(`Validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} HTML files, local references and chatbot privacy controls.`);
}
