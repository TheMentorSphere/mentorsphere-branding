import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');
const page = read('docs/adhd-coaching/index.html');
const sitemap = read('docs/sitemap.xml');
const robots = read('docs/robots.txt');

describe('online ADHD coaching SEO', () => {
  it('keeps one established, indexable canonical page for the search intent', () => {
    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(page).toContain('<h1>Online ADHD coaching</h1>');
    expect(page).toContain('<title>Online ADHD Coaching for Adults &amp; Young People | The MentorSphere</title>');
    expect(page).toMatch(/<meta name="description" content="[^"]+">/);
    expect(page).toContain('<meta name="robots" content="index,follow">');
    expect(page).toContain('<link rel="canonical" href="https://www.thementorsphere.co.uk/adhd-coaching/">');
    expect(page).toContain('<meta property="og:url" content="https://www.thementorsphere.co.uk/adhd-coaching/">');
    expect(sitemap.split('<loc>https://www.thementorsphere.co.uk/adhd-coaching/</loc>')).toHaveLength(2);
    expect(robots).toContain('Allow: /');
  });

  it('publishes valid, non-duplicated WebPage, breadcrumb and Service schema', () => {
    const blocks = [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    expect(blocks).toHaveLength(1);
    const graph = blocks[0]['@graph'];
    expect(graph.filter((item) => item['@type'] === 'WebPage')).toHaveLength(1);
    expect(graph.filter((item) => item['@type'] === 'BreadcrumbList')).toHaveLength(1);
    expect(graph.filter((item) => item['@type'] === 'Service')).toHaveLength(1);
    const service = graph.find((item) => item['@type'] === 'Service');
    expect(service.serviceType).toContain('Executive function coaching');
    expect(service.areaServed.map((area) => area.name)).toEqual(['United Kingdom', 'United States']);
  });

  it('states international availability and preserves clinical and US education boundaries', () => {
    expect(page).toContain('Online ADHD coaching for international clients');
    expect(page).toContain('United States');
    expect(page).toContain('time-zone compatibility');
    expect(page).toContain("education and SEND support remains UK-focused");
    expect(page).toContain('The MentorSphere cannot diagnose ADHD');
    expect(page).toMatch(/not therapy[\s\S]*not therapy, clinical diagnosis, medical treatment or crisis support/);
    expect(page).not.toMatch(/\b(?:IDEA|IEP|Section 504|due process|SPED)\b/i);
  });

  it('uses relevant internal anchors without creating a duplicate landing page', () => {
    expect(read('docs/index.html')).toContain('href="adhd-coaching/">Explore online ADHD coaching</a>');
    expect(read('docs/pricing/index.html')).toContain('href="../adhd-coaching/">Explore online ADHD coaching, audiences and age criteria</a>');
    expect(sitemap).not.toContain('/adhd-coaching/online-adhd-coaching/');
  });
});
