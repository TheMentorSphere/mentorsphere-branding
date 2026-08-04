import assert from 'node:assert/strict';

const suppliedUrl = process.argv.slice(2).find((value) => /^https?:\/\//u.test(value));
const baseUrl = new URL(suppliedUrl ?? 'http://127.0.0.1:8787/');
const pages = [
  ['homepage', '/', 'Rethinking learning'],
  ['contact form', '/contact/', 'formspree.io'],
  ['tutoring overview', '/tutoring/', 'Learning and tutoring'],
  ['tutoring subject', '/tutoring/maths/', 'The Maths Mentor'],
  ['ADHD coaching overview', '/adhd-coaching/', 'ADHD coaching'],
  ['ADHD coaching detail', '/adhd-coaching/access-to-work/', 'Access to Work'],
  ['support overview', '/education-send-support/', 'Education & SEND Support'],
  ['support detail', '/education-send-support/send-ehcp/', 'SEND & EHCP Support'],
  ['policies index', '/policies/', 'Policies'],
  ['privacy policy', '/privacy-policy/', 'Privacy Policy'],
  ['safeguarding policy', '/safeguarding-policy/', 'Safeguarding Policy'],
];

const results = [];

for (const [name, path, marker] of pages) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: 'manual',
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  const body = await response.text();
  assert.equal(response.status, 200, `${name} returned ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/u, `${name} content type`);
  assert.ok(body.includes(marker), `${name} did not contain ${marker}`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${name} nosniff header`);
  assert.equal(response.headers.get('x-frame-options'), 'DENY', `${name} frame header`);
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', `${name} referrer header`);
  results.push({ name, path, status: response.status });
}

for (const assetPath of ['/assets/css/styles.css', '/assets/js/site.js', '/assets/images/main-logo.svg']) {
  const response = await fetch(new URL(assetPath, baseUrl));
  assert.equal(response.status, 200, `${assetPath} returned ${response.status}`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${assetPath} nosniff header`);
  results.push({ name: 'static asset', path: assetPath, status: response.status });
}

const missing = await fetch(new URL('/release-readiness-missing-page/', baseUrl), {
  redirect: 'manual',
  headers: { Accept: 'text/html,application/xhtml+xml' },
});
assert.equal(missing.status, 404, `missing page returned ${missing.status}`);
assert.ok((await missing.text()).includes('Page not found'), 'custom 404 body was not served');
results.push({ name: '404 handling', path: '/release-readiness-missing-page/', status: missing.status });

const slashless = await fetch(new URL('/contact', baseUrl), {
  redirect: 'manual',
  headers: { Accept: 'text/html,application/xhtml+xml' },
});
assert.ok([301, 302, 307, 308].includes(slashless.status), `slashless contact returned ${slashless.status}`);
assert.equal(new URL(slashless.headers.get('location'), baseUrl).pathname, '/contact/', 'trailing-slash target');
results.push({ name: 'trailing slash', path: '/contact', status: slashless.status, location: slashless.headers.get('location') });

const form = await fetch(new URL('/forms/primary-learner-profile/', baseUrl), {
  headers: { Accept: 'text/html,application/xhtml+xml' },
});
assert.equal(form.status, 404, `disabled intake form returned ${form.status}`);
assert.ok((await form.text()).includes('Page not found'), 'disabled intake did not use the custom 404 page');
results.push({ name: 'disabled intake page', path: '/forms/primary-learner-profile/', status: form.status });

console.log(JSON.stringify({ baseUrl: baseUrl.href, results }, null, 2));
