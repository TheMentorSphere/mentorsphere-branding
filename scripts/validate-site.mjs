import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const workspace = process.cwd();
const docsRoot = path.join(workspace, "docs");
const failures = [];

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
  return clean.startsWith("/")
    ? path.join(docsRoot, clean)
    : path.resolve(path.dirname(htmlFile), clean);
}

const allFiles = await walk(docsRoot);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));

for (const htmlFile of htmlFiles) {
  const relative = path.relative(workspace, htmlFile);
  const content = await readFile(htmlFile, "utf8");
  record(matches(content, /<title>[^<]+<\/title>/giu).length === 1, `${relative}: expected one non-empty title`);
  record(
    matches(content, /<meta\s+name="description"\s+content="[^"]+"/giu).length === 1,
    `${relative}: expected one meta description`,
  );
  record(matches(content, /<h1\b/giu).length === 1, `${relative}: expected exactly one H1`);
  record(!/\b(TODO|FIXME|lorem ipsum)\b/iu.test(content), `${relative}: placeholder text found`);

  const ids = matches(content, /\sid="([^"]+)"/giu).map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  record(duplicateIds.length === 0, `${relative}: duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  const references = matches(content, /\s(?:href|src)="([^"]+)"/giu).map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/iu.test(reference)) continue;
    const target = resolveLocalReference(htmlFile, reference);
    if (!target) continue;
    const candidates = path.extname(target)
      ? [target]
      : [target, `${target}.html`, path.join(target, "index.html")];
    const exists = candidates.some((candidate) => allFiles.includes(path.normalize(candidate)));
    record(exists, `${relative}: unresolved local reference ${reference}`);
  }
}

const intakePath = path.join(docsRoot, "forms", "primary-learner-profile", "index.html");
const intakeHtml = await readFile(intakePath, "utf8");
record(
  intakeHtml.includes('<meta name="robots" content="noindex,nofollow,noarchive">'),
  "primary learner profile: exact noindex meta directive is missing",
);
record(!intakeHtml.includes("Owner approval required before launch"), "primary learner profile: internal owner-review wording is public");
record(!intakeHtml.includes("Draft wording for owner review"), "primary learner profile: internal draft wording is public");
record(!intakeHtml.includes("Article 6 or Article 9 legal basis"), "primary learner profile: internal legal-basis note is public");
record(intakeHtml.includes("Step 5"), "primary learner profile: review step is missing");

const sitemap = await readFile(path.join(docsRoot, "sitemap.xml"), "utf8");
record(!sitemap.includes("primary-learner-profile"), "docs/sitemap.xml: unlisted learner profile must not be included");

for (const htmlFile of htmlFiles.filter((file) => file !== intakePath)) {
  const content = await readFile(htmlFile, "utf8");
  record(
    !content.includes("forms/primary-learner-profile"),
    `${path.relative(workspace, htmlFile)}: unlisted learner profile is linked from a public page`,
  );
}

const intakeScript = await readFile(path.join(docsRoot, "assets", "js", "intake-form.js"), "utf8");
record(!/\.innerHTML\b/u.test(intakeScript), "intake-form.js: innerHTML must not be used");
record(
  !/\b(?:localStorage|sessionStorage|document\.cookie)\b/u.test(intakeScript),
  "intake-form.js: persistent browser storage found",
);
record(!/\bconsole\s*\./u.test(intakeScript), "intake-form.js: browser console logging found");

const headers = await readFile(path.join(docsRoot, "_headers"), "utf8");
record(headers.includes("/forms/primary-learner-profile/*"), "docs/_headers: intake route is missing");
record(headers.includes("X-Robots-Tag: noindex, nofollow, noarchive"), "docs/_headers: noindex response header is missing");
record(headers.includes("frame-src https://challenges.cloudflare.com"), "docs/_headers: Turnstile frame CSP is missing");
record(headers.includes("script-src 'self' https://challenges.cloudflare.com"), "docs/_headers: Turnstile script CSP is missing");

const wrangler = await readFile(path.join(workspace, "wrangler.jsonc"), "utf8");
record(wrangler.includes('"FORM_PAGE_ENABLED": "false"'), "wrangler.jsonc: production form page must default to disabled");
record(wrangler.includes('"FORM_SUBMISSIONS_ENABLED": "false"'), "wrangler.jsonc: production submissions must default to disabled");
record(wrangler.includes('"/api/forms/*"'), "wrangler.jsonc: form API route is not Worker-first");
record(wrangler.includes('"/forms/primary-learner-profile"'), "wrangler.jsonc: form page route is not Worker-first");
record(wrangler.includes('"/forms/primary-learner-profile/*"'), "wrangler.jsonc: nested form routes are not Worker-first");
record(!/"(?:TURNSTILE_SECRET_KEY|INTAKE_APPS_SCRIPT_URL|INTAKE_HMAC_SECRET)"\s*:/u.test(wrangler), "wrangler.jsonc: a secret value appears to be configured as a variable");

const appsScript = await readFile(
  path.join(workspace, "integrations", "google-apps-script", "primary-learner-profile", "Code.gs"),
  "utf8",
);
record(appsScript.includes("computeHmacSha256Signature"), "Apps Script: HMAC verification is missing");
record(appsScript.includes("getScriptLock"), "Apps Script: duplicate-submission lock is missing");
record(appsScript.includes("/^[=+\\-@]/"), "Apps Script: formula-injection protection is missing");
record(!/\bconsole\s*\./u.test(appsScript), "Apps Script: console logging found");

if (failures.length > 0) {
  console.error(`Validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} HTML files, intake privacy controls, local references and submission safeguards.`);
}
