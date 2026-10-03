import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Run the actual whole-site validator against in-memory HTML mutations. No
// approved working-tree file is changed and no external resource is requested.
const source = (await readFile('scripts/validate-site.mjs', 'utf8')).replace(/^import .*;\r?\n/gm, '');
const validate = new (Object.getPrototypeOf(async function () {}).constructor)('readFile', 'readdir', 'stat', 'path', 'process', 'console', source);
const adultPath = path.resolve('docs/adhd-coaching/adults/index.html');
const youngPath = path.resolve('docs/adhd-coaching/young-people/index.html');
const adult = await readFile(adultPath, 'utf8');
const young = await readFile(youngPath, 'utf8');
const configPattern = /(<script type="application\/json" data-ads-measurement-config>)(.*?)(<\/script>)/;
const changeConfig = fn => html => html.replace(configPattern, (_, start, json, end) => {
  const config = JSON.parse(json); fn(config); return start + JSON.stringify(config) + end;
});
async function result(changes = {}) {
  const messages = [], fakeProcess = { cwd: () => process.cwd(), exitCode: 0 };
  await validate(async (file, encoding) => changes[path.resolve(file)] ?? readFile(file, encoding), readdir, stat, path, fakeProcess, { log: () => {}, error: (...args) => messages.push(args.join(' ')) });
  return { code: fakeProcess.exitCode, messages: messages.join('\n') };
}
describe('advertising page-specific validator', () => {
  it('accepts the exact two-page implementation and absent legacy scope', async () => expect((await result()).code).toBe(0));
  const cases = [
    ...[0, -1, '2', null, 3, 1].map(scope => [`adult scope ${JSON.stringify(scope)}`, changeConfig(config => { config.requiredConsentScopeVersion = scope; })]),
    ['missing adult scope', changeConfig(config => { delete config.requiredConsentScopeVersion; })],
    ['foreign enquiry label', changeConfig(config => { config.conversionLabels.adhd_adults_enquiry_success = '7zLXCPz_lowdEKuYye5E'; })],
    ['foreign booking label', changeConfig(config => { config.conversionLabels.adhd_adults_booking_click = 'bi_lCP__lowdEKuYye5E'; })],
    ['extra event', changeConfig(config => { config.conversionLabels.other_booking_click = 'EXTRA_LABEL'; })],
    ['wrong Ads ID', changeConfig(config => { config.googleAdsId = 'AW-000000000'; })],
    ['unapproved value', changeConfig(config => { config.value = 1; })],
    ['malformed JSON', html => html.replace(configPattern, '$1{broken$3')],
    ['duplicate configuration', html => html.replace(configPattern, '$&$&')],
    ['missing marker', html => html.replace(' data-measure-event="adhd_adults_booking_click"', '')],
    ['wrong enquiry event', html => html.replace('data-measure-event="adhd_adults_enquiry_success"', 'data-measure-event="adhd_young_people_enquiry_success"')],
    ['wrong Calendar', html => html.replace('https://calendar.google.com/calendar/', 'https://calendar.google.com/wrong/')],
    ['wrong Formspree', html => html.replace('https://formspree.io/f/meeynlze', 'https://formspree.io/f/wrong')],
    ['non-deferred runtime', html => html.replace(/(ads-measurement\.js[^>]+) defer/, '$1')],
    ['runtime before consent', html => { const tag = html.match(/  <script src="[^"\n]*ads-measurement[^\n]+/)[0]; return html.replace(tag, '').replace('  <script src="../../assets/js/site.js', tag + '\n  <script src="../../assets/js/site.js'); }],
  ];
  it.each(cases)('rejects %s', async (_, mutate) => expect((await result({ [adultPath]: mutate(adult) })).code).toBe(1));
  it('rejects expanded scope on the protected young page', async () => expect((await result({ [youngPath]: changeConfig(config => { config.requiredConsentScopeVersion = 2; })(young) })).code).toBe(1));
  it('rejects adult labels on the young page', async () => expect((await result({ [youngPath]: young.replace('bi_lCP__lowdEKuYye5E', 'zp7QCOn3tI8dEKuYye5E') })).code).toBe(1));
  it.each(['index.html', 'contact/index.html', 'pricing/index.html', 'adhd-coaching/index.html', 'forms/adhd-coaching-intake/index.html'])('rejects measurement on %s', async file => {
    const target = path.resolve('docs', file), html = await readFile(target, 'utf8');
    const injection = adult.match(configPattern)[0] + '\n<script src="/assets/js/ads-measurement.js?v=20261003-ads-scope-v3" defer></script>';
    expect((await result({ [target]: html.replace('</body>', injection + '</body>') })).code).toBe(1);
  });
});
