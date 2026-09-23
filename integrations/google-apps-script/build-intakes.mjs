import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
const root = new URL('../../', import.meta.url);
const read = async path => (await readFile(new URL(path, root), 'utf8')).replaceAll('\r\n', '\n');
const primary = await read('integrations/google-apps-script/primary-learner-profile/Code.gs');
const validation = await read('src/intake/validation.ts');
const routes = validation.match(/export const LEARNER_CONSENT_ROUTES = (\[[\s\S]*?\]) as const;/)[1];
const contactMethods = validation.match(/export const CONTACT_METHODS = (\[[\s\S]*?\]) as const;/)[1];
const shared = primary.slice(primary.indexOf('function jsonOutput_'));
const isolatedPost = await read('integrations/google-apps-script/isolated-do-post.gs');
const selected = process.argv.find(arg => arg.startsWith('--form='))?.slice(7) ?? 'secondary';
if (!['secondary','adhd','all'].includes(selected)) throw new Error('Use --form=secondary, --form=adhd or --form=all');
for (const form of selected === 'all' ? ['secondary','adhd'] : [selected]) {
 const slug = form === 'secondary' ? 'secondary-learner-profile' : 'adhd-coaching-intake';
 const schema = JSON.parse(await read('integrations/google-apps-script/' + slug + '/schema.json'));
 const {name,validator:fn} = schema;
 const labels = schema.columns.map(column => column.label);
 const expressions = schema.columns.map(column => column.expression);
 if(labels.length!==expressions.length)throw new Error('Schema mapping mismatch '+name+' '+labels.length+' '+expressions.length);
 let validator = (await read(`src/intake/${name}-validation.ts`)).replace(/^import .*;\n/gm,'').replaceAll('export ','');
 if(name==='adhd')validator=`const CONTACT_METHODS = ${contactMethods};\nconst LEARNER_CONSENT_ROUTES = ${routes};\n`+validator;
 validator=ts.transpileModule(validator,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
 let storage=shared.replace(/function hasValidShape_\(request\) \{[\s\S]*?\n\}\n\nfunction text_/,`function hasValidShape_(request) {
  if (!isObject_(request) || !isFreshTimestamp_(request.issuedAt) || !isObject_(request.payload)) return false;
  return ${fn}({ ...request.payload, turnstileToken: 'verified-signed-envelope', honeypot: '' }).ok;
}

function text_`);
 // Also escape a literal leading apostrophe, so it cannot alias a formula-like answer.
 storage=storage.replace("/^[=+\\-@]/u", "/^['=+\\-@]/u");
 storage=storage.replace(/function rowFor_\(request, receivedAt\) \{[\s\S]*?\n\}\n\nfunction configuredSheet_/,`function rowFor_(request, receivedAt) {
  const payload = request.payload;
  return [\n    ${expressions.join(',\n    ')}\n  ].map(text_);
}

function configuredSheet_`);
 // A duplicate must still identify a record from this isolated schema, not only a cached ID.
 storage=storage.replace("String(storedRow[0]) === submissionId;", "String(storedRow[0]) === submissionId &&\n    String(storedRow[3]) === FORM_VERSION &&\n    Number.isFinite(new Date(storedRow[2]).getTime()) &&\n    String(storedRow[SHEET_COLUMNS.indexOf('Privacy acknowledgement')]) === 'Yes';");
 storage=storage.replace('function classifyDuplicate_(sheet, submissionId, cache) {', `function verifyStoredPayload_(sheet, rowNumber, request) {
  const range = sheet.getRange(rowNumber, 1, 1, SHEET_COLUMNS.length);
  const stored = range.getValues()[0];
  const formulas = range.getFormulas()[0];
  const canonical = rowFor_(request, String(stored[2]));
  const formColumnCount = SHEET_COLUMNS.indexOf('Notification status');
  // Compare readback to readback: Sheets consumes one leading text-escape apostrophe.
  // Never normalise stored answers or accept a formula with a coincidentally equal value.
  return formColumnCount > 0 && canonical.slice(0, formColumnCount).every((value, index) =>
    formulas[index] === '' && (index === 1 || stored[index] === (value.startsWith("'") ? value.slice(1) : value)));
}

function classifyDuplicate_(sheet, submissionId, cache, request) {`);
 storage=storage.replace("? { status: 'duplicate', rowNumber }", "? (verifyStoredPayload_(sheet, rowNumber, request) ? { status: 'duplicate', rowNumber } : { status: 'duplicate_conflict', rowNumber: 0 })");
 // An unavailable cache cannot block verification of an existing Sheet row. Without
 // a row, fail closed if the stale-marker check is unavailable instead of appending.
 storage=storage.replace("  if (cache.get(duplicateCacheKey_(submissionId)) === 'stored') {", "  if (!cache) throw new Error('Duplicate cache unavailable before storage');\n  if (cache.get(duplicateCacheKey_(submissionId)) === 'stored') {");
 storage=storage.replace("subject: 'New learner profile received'",`subject: 'New ${name==='adhd'?'coaching intake':'secondary learner profile'} received'`).replace('A new learner profile was received at','A new intake form was received at');
 // Only the two isolated integrations use this commit boundary. Primary is read-only.
 const postStart = storage.indexOf('function doPost(event) {');
 if (postStart < 0) throw new Error('Missing doPost source boundary');
 storage = storage.slice(0, postStart) + isolatedPost;
 const preamble=`// Generated by integrations/google-apps-script/build-intakes.mjs. Do not edit by hand.
// Standalone project ONLY: never install in or configure with the Primary production backend.
${validator}
const CONSENT_WORDING_VERSION = '${name}-child-explicit-consent-v1-2026-09-21';
const ADULT_CONSENT_WORDING_VERSION = 'adhd-adult-explicit-consent-v1-2026-09-21';
const AUTHORITY_WORDING_VERSION = '${name}-special-category-authority-v1-2026-09-21';
const LEARNER_CONSENT_ROUTE_WORDING_VERSION = '${name}-learner-consent-route-v1-2026-09-21';
const MAX_REQUEST_CHARACTERS = 50000;
const SIGNATURE_WINDOW_MILLISECONDS = 5 * 60 * 1000;
const DUPLICATE_CACHE_SECONDS = 6 * 60 * 60;
const SHEET_COLUMNS = ${JSON.stringify(labels,null,2)};

`;
 const directory=new URL(`integrations/google-apps-script/${slug}/`,root);await mkdir(directory,{recursive:true});
 await writeFile(new URL('Code.gs',directory),preamble+storage);
 await writeFile(new URL('appsscript.json',directory),await read('integrations/google-apps-script/primary-learner-profile/appsscript.json'));
 await writeFile(new URL('SCHEMA.md',directory),`# ${slug}: proposed private storage\n\n${labels.length} columns. Separate Sheet and standalone Apps Script project, HMAC secret and endpoint from Primary and the other new form. No production storage is provisioned by this change.\n\n| Column | Heading |\n| --- | --- |\n${labels.map((label,index)=>`| ${index+1} | ${label} |`).join('\n')}\n\nAll cells are written as plain text and formula-leading values are escaped. Consent timestamps are recorded by the receiving backend in UTC at acceptance; wording versions identify the displayed consent. Notifications contain only the received timestamp and private Sheet link. TEST_MODE suppresses mail. Withdrawal columns are operational records, not client input. The six-month prospective-record review date follows the existing intake retention workflow.\n`);
 console.log(`${slug}: ${labels.length} columns`);
}
