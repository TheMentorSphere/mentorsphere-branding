import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';

const form = process.argv[2];
if (!['secondary-learner-profile', 'adhd-coaching-intake'].includes(form)) throw new Error('Specify secondary-learner-profile or adhd-coaching-intake');
const destination = path.resolve('.preview-assets', form);
let html = await readFile(`docs/forms/${form}/index.html`, 'utf8');
// Preview navigation uses approved live information without redeploying any other page.
html = html.replaceAll('href="../../"', 'href="https://www.thementorsphere.co.uk/"')
  .replace(/href="\.\.\/\.\.\/(contact|privacy-policy|accessibility)\/"/g, 'href="https://www.thementorsphere.co.uk/$1/"');
html = html.replace('</head>', '<link rel="stylesheet" href="../../assets/css/intake-preview-controls.css"><script src="../../assets/js/intake-preview-controls.js" defer></script></head>');
html = html.replace('<main id="main-content"', '<aside class="intake-shell intake-privacy-panel intake-owner-preview" aria-label="Owner preview controls"><h2>Owner preview: fictional information only</h2><p>Responses are simulated. Nothing is saved and no notification is sent. The success and duplicate messages demonstrate the proposed experience.</p><label for="preview-scenario">Submission outcome</label><select id="preview-scenario"><option value="created">Successful submission (simulated)</option><option value="duplicate">Verified duplicate (simulated)</option><option value="failure">Retryable upstream failure</option><option value="malformed">Malformed response</option><option value="stale-duplicate">Unverified duplicate</option><option value="timeout">Timeout (30 seconds)</option></select><p>After a failed attempt, choose a new outcome and complete a fresh security check. Reload to start again after a successful attempt.</p></aside><main id="main-content"');
await mkdir(path.join(destination, 'forms', form), { recursive: true });
await writeFile(path.join(destination, 'forms', form, 'index.html'), html);
const assets = new Set([...html.matchAll(/(?:href|src)="\.\.\/\.\.\/(assets\/[^"?]+)(?:\?[^" ]*)?"/g)].map(match => match[1]));
assets.delete('assets/js/intake-preview-controls.js');
assets.delete('assets/css/intake-preview-controls.css');
assets.add('assets/js/intake-submission-contract.js');
// Follow only local CSS dependencies. This keeps the asset bundle limited to the new form.
for (const asset of [...assets]) {
  if (!asset.endsWith('.css')) continue;
  const css = await readFile(path.join('docs', asset), 'utf8');
  for (const match of css.matchAll(/url\(['"]?([^)'"?#]+)(?:[?#][^)'" ]*)?['"]?\)/g)) {
    if (match[1].startsWith('data:') || match[1].startsWith('http')) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(asset), match[1]));
    if (!target.startsWith('assets/')) throw new Error('Unexpected CSS asset path');
    try { await access(path.join('docs', target)); assets.add(target); } catch { /* Historical unused CSS URL is not packaged. */ }
  }
}
for (const asset of assets) {
  await mkdir(path.dirname(path.join(destination, asset)), { recursive: true });
  await copyFile(path.join('docs', asset), path.join(destination, asset));
}
await writeFile(path.join(destination, 'assets/js/intake-preview-controls.js'), `(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === location.origin && url.pathname === '/api/forms/${form}' && init.method === 'POST') {
      const headers = new Headers(init.headers);
      headers.set('X-MentorSphere-Preview-Scenario', document.getElementById('preview-scenario').value);
      return originalFetch(input, { ...init, headers });
    }
    return originalFetch(input, init);
  };
})();\n`);
await writeFile(path.join(destination, 'assets/css/intake-preview-controls.css'), '.intake-owner-preview{margin-block:1rem}.intake-owner-preview select{display:block;width:100%;max-width:32rem;min-height:2.75rem;font:inherit;padding:.5rem;margin-top:.5rem}.intake-owner-preview label{font-weight:700}\n');
console.log(`Prepared isolated ${form} preview assets (${assets.size} dependencies; no Primary page).`);
