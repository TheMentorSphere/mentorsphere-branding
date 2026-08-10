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
const intakePath = path.join(docsRoot, "forms", "primary-learner-profile", "index.html");
const homeEducationRoutes = [
  "home-education/index.html",
  "home-education/getting-started-foundations/index.html",
  "home-education/planning-progress-mentoring/index.html",
  "home-education/qualifications-future-pathways/index.html",
];
const educationMenuLabels = ["Overview", "SEND &amp; EHCP Support", "Meetings, Evidence &amp; Communication", "EOTAS &amp; Education Access", "Private Exams &amp; Access Arrangements"];
const homeEducationMenuLabels = ["Overview", "Getting Started &amp; Foundations", "Planning, Progress &amp; Mentoring", "Qualifications &amp; Future Pathways"];
const footerServices = [
  ["Tutoring", "tutoring"],
  ["ADHD Coaching", "adhd-coaching"],
  ["Education &amp; SEND Support", "education-send-support"],
  ["Home Education Support", "home-education"],
  ["Pricing", "pricing"],
];
const organizationServices = ["Tutoring", "ADHD Coaching", "Education & SEND Support", "Home Education Support"];
const sharedStylesVersion = "styles.css?v=20260804-home-education-v2";
const sharedScriptVersion = "site.js?v=20260804-home-education-v2";

for (const htmlFile of htmlFiles) {
  const relative = path.relative(workspace, htmlFile);
  const content = await readFile(htmlFile, "utf8");
  const sharedStylesReferences = matches(content, /styles\.css\?v=[^"']+/giu).map((match) => match[0]);
  const sharedScriptReferences = matches(content, /site\.js\?v=[^"']+/giu).map((match) => match[0]);
  record(sharedStylesReferences.length === 1, `${relative}: expected exactly one shared styles.css reference`);
  record(sharedStylesReferences.every((reference) => reference === sharedStylesVersion), `${relative}: stale shared styles.css cache key found`);
  if (sharedScriptReferences.length > 0) {
    record(sharedScriptReferences.length === 1, `${relative}: expected exactly one shared site.js reference`);
    record(sharedScriptReferences.every((reference) => reference === sharedScriptVersion), `${relative}: stale shared site.js cache key found`);
  }
  record(matches(content, /<title>[^<]+<\/title>/giu).length === 1, `${relative}: expected one non-empty title`);
  record(
    matches(content, /<meta\s+name="description"\s+content="[^"]+"/giu).length === 1,
    `${relative}: expected one meta description`,
  );
  record(matches(content, /<h1\b/giu).length === 1, `${relative}: expected exactly one H1`);
  if (htmlFile !== intakePath) {
    record(content.includes('class="skip-link" href="#main-content"'), `${relative}: site skip link is missing`);
    record(content.includes('<div class="site-notice">'), `${relative}: site notice is missing`);
    record(content.includes('<header class="site-header">'), `${relative}: site header is missing`);
    record(content.includes('class="primary-nav"'), `${relative}: primary navigation is missing`);
    record(content.includes('id="submenu-tutoring"'), `${relative}: Tutoring dropdown is missing`);
    record(content.includes('id="submenu-adhd-coaching"'), `${relative}: ADHD Coaching dropdown is missing`);
    record(content.includes('id="submenu-education-send"'), `${relative}: Education & SEND dropdown is missing`);
    record(content.includes('id="submenu-home-education"'), `${relative}: Home Education dropdown is missing`);
    const educationMenu = content.match(/<ul class="submenu" id="submenu-education-send" data-submenu>([\s\S]*?)<\/ul>/u)?.[1] || "";
    const homeEducationMenu = content.match(/<ul class="submenu" id="submenu-home-education" data-submenu>([\s\S]*?)<\/ul>/u)?.[1] || "";
    record(educationMenuLabels.every((label) => educationMenu.includes(`>${label}</a>`)), `${relative}: Education & SEND menu is incomplete or inconsistent`);
    record(homeEducationMenuLabels.every((label) => homeEducationMenu.includes(`>${label}</a>`)), `${relative}: Home Education menu is incomplete or inconsistent`);
    record(content.includes('<main id="main-content">'), `${relative}: main content landmark is missing`);
    record(content.includes('<footer class="site-footer">'), `${relative}: site footer is missing`);
    record(content.includes('class="container footer-main"'), `${relative}: footer main section is missing`);
    record(content.includes('class="container footer-bottom"'), `${relative}: footer bottom section is missing`);
    const footerServiceList = content.match(/<h2 class="footer-heading">Services<\/h2>\s*<ul class="footer-links">([\s\S]*?)<\/ul>/u)?.[1] || "";
    const footerServiceLinks = matches(footerServiceList, /<a href="([^"]+)">([^<]+)<\/a>/gu);
    record(footerServiceLinks.length === footerServices.length, `${relative}: footer must contain exactly five service links`);
    footerServices.forEach(([label, target], index) => {
      const link = footerServiceLinks[index];
      record(link?.[2] === label, `${relative}: footer service ${index + 1} must be ${label}`);
      const resolved = link ? resolveLocalReference(htmlFile, link[1]) : null;
      record(resolved === path.join(docsRoot, ...target.split("/")), `${relative}: ${label} footer link is not canonical`);
    });
    record(!footerServiceList.includes("support-services/"), `${relative}: obsolete general support-services footer link found`);
    record(
      content.includes("The MentorSphere brings tutoring, ADHD coaching, Education &amp; SEND Support and Home Education Support together through one consistent, mentoring-led approach."),
      `${relative}: four-service footer introduction is missing`,
    );
    record(matches(content, /<link rel="canonical" href="https:\/\/www\.thementorsphere\.co\.uk\/[^"]*">/giu).length === 1, `${relative}: expected one canonical URL`);
    record(!/(?:Ã‚|Ã¢â‚¬|Ã¢â€ |Ã¯Â¿Â½|�)/u.test(content), `${relative}: mojibake or replacement character found`);
  }
  record(!/\b(TODO|FIXME|lorem ipsum)\b/iu.test(content), `${relative}: placeholder text found`);

  const ids = matches(content, /\sid="([^"]+)"/giu).map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  record(duplicateIds.length === 0, `${relative}: duplicate IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  const structuredDataBlocks = matches(
    content,
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/giu,
  );
  for (const block of structuredDataBlocks) {
    try {
      const structuredData = JSON.parse(block[1]);
      if (structuredData["@type"] === "EducationalOrganization") {
        const offers = structuredData.hasOfferCatalog?.itemListElement || [];
        record(
          offers.map((offer) => offer.name).join("|") === organizationServices.join("|"),
          `${relative}: organisation structured data must list the four services in the approved order`,
        );
        record(
          organizationServices.every((service) => structuredData.description?.includes(service)),
          `${relative}: organisation structured-data description must include all four services`,
        );
      }
    } catch {
      record(false, `${relative}: application/ld+json block is not valid JSON`);
    }
  }

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

for (const route of homeEducationRoutes) {
  record(allFiles.includes(path.join(docsRoot, ...route.split("/"))), `Home Education route is missing: ${route}`);
}

const intakeHtml = await readFile(intakePath, "utf8");
record(
  intakeHtml.includes('<meta name="robots" content="noindex,nofollow,noarchive">'),
  "primary learner profile: exact noindex meta directive is missing",
);
record(!intakeHtml.includes("Owner approval required before launch"), "primary learner profile: internal owner-review wording is public");
record(!intakeHtml.includes("Draft wording for owner review"), "primary learner profile: internal draft wording is public");
record(!intakeHtml.includes("Article 6 or Article 9 legal basis"), "primary learner profile: internal legal-basis note is public");
record(intakeHtml.includes("Step 5"), "primary learner profile: review step is missing");
record(intakeHtml.includes("I explicitly consent to The MentorSphere using the optional health, disability, SEND and neurodiversity information I provide"), "primary learner profile: approved explicit-consent wording is missing");
record(intakeHtml.includes("I confirm that I am authorised to provide the learner's information to The MentorSphere for the purpose of discussing and planning support"), "primary learner profile: approved authority wording is missing");
record(intakeHtml.includes("Who is giving or authorising this consent?"), "primary learner profile: learner consent route is missing");
record(intakeHtml.includes("The learner understands how this information will be used and has authorised me to communicate this consent on their behalf."), "primary learner profile: learner-authorised route is missing");
record(
  ["supportNeeds", "helpfulStrategies", "unhelpfulApproaches", "otherBackground"].every((path) => {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`data-special-category-field[^>]+data-field-path="supportProfile\\.${escapedPath}"[^>]+hidden`, "u").test(intakeHtml);
  }),
  "primary learner profile: all narrative support fields must be hidden special-category fields",
);
record(!intakeHtml.includes("sensitive_data_confirmation"), "primary learner profile: superseded sensitive-information acknowledgement remains");

const sitemap = await readFile(path.join(docsRoot, "sitemap.xml"), "utf8");
record(!sitemap.includes("primary-learner-profile"), "docs/sitemap.xml: unlisted learner profile must not be included");
record(!sitemap.includes("support-services/ehe-eotas"), "docs/sitemap.xml: noindex legacy EHE and EOTAS route must not be included");
for (const route of homeEducationRoutes) {
  const publicRoute = route.replace(/index\.html$/u, "");
  record(sitemap.includes(`https://www.thementorsphere.co.uk/${publicRoute}`), `docs/sitemap.xml: missing ${publicRoute}`);
}

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
record(intakeScript.includes("primary-learner-profile-v5"), "intake-form.js: current form version is missing");
record(intakeScript.includes("const learnerConsentRoute = singleValue('learner_consent_route')"), "intake-form.js: learner consent route is not included in the payload");

const homepage = await readFile(path.join(docsRoot, "index.html"), "utf8");
record(
  /class="orbit-item home-education" href="home-education\/"/u.test(homepage),
  "homepage: Home Education orbit must link to /home-education/",
);
record(!homepage.includes('aria-label="The six MentorSphere service branches"'), "homepage: obsolete orbit label remains");

const contactHtml = await readFile(path.join(docsRoot, "contact", "index.html"), "utf8");
const contactSelect = contactHtml.match(/<select id="service"[\s\S]*?<\/select>/u)?.[0] || "";
const contactOptions = matches(contactSelect, /<option value="[^"]*">([^<]+)<\/option>/gu).map((option) => option[1]);
const expectedContactOptions = [
  "Choose an option",
  "Tutoring",
  "ADHD Coaching",
  "Education &amp; SEND Support",
  "Home Education Support",
  "Employer-funded support",
  "Access to Work",
  "Unsure or mixed needs",
  "Other enquiry",
];
record(
  contactOptions.join("|") === expectedContactOptions.join("|"),
  "contact form: Area of support options are missing or out of order",
);

for (const [route, obsoleteText] of [
  ["index.html", "The six MentorSphere service branches"],
  ["about/index.html", "What stays consistent across every branch"],
  ["tutoring/index.html", "one of three pathways"],
  ["adhd-coaching/index.html", "one of three pathways"],
]) {
  const content = await readFile(path.join(docsRoot, ...route.split("/")), "utf8");
  record(!content.includes(obsoleteText), `${route}: obsolete public service architecture wording remains`);
}

const headers = await readFile(path.join(docsRoot, "_headers"), "utf8");
record(headers.includes("/forms/primary-learner-profile/*"), "docs/_headers: intake route is missing");
record(headers.includes("X-Robots-Tag: noindex, nofollow, noarchive"), "docs/_headers: noindex response header is missing");
record(headers.includes("frame-src https://challenges.cloudflare.com"), "docs/_headers: Turnstile frame CSP is missing");
record(headers.includes("script-src 'self' https://challenges.cloudflare.com"), "docs/_headers: Turnstile script CSP is missing");

const wrangler = await readFile(path.join(workspace, "wrangler.jsonc"), "utf8");
record(wrangler.includes('"FORM_PAGE_ENABLED": "false"'), "wrangler.jsonc: production form page must default to disabled");
record(wrangler.includes('"FORM_SUBMISSIONS_ENABLED": "false"'), "wrangler.jsonc: production submissions must default to disabled");
record(wrangler.includes('"/support-services/"'), "wrangler.jsonc: retired support overview must run Worker-first for its redirect");
record(wrangler.includes('"/support-services/ehcp-support/"'), "wrangler.jsonc: retired EHCP route must run Worker-first for its redirect");
record(wrangler.includes('"/support-services/private-exams/"'), "wrangler.jsonc: retired private-exams route must run Worker-first for its redirect");
record(!wrangler.includes('"/support-services/ehe-eotas/"'), "wrangler.jsonc: legacy EHE/EOTAS route-choice page must remain directly served");
record(!wrangler.includes('"/support-services/referral-preparation/"'), "wrangler.jsonc: referral-preparation route must remain directly served");
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
