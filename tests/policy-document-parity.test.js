import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

// Cross-format checks for the policy versions pinned in the parity manifest.
// The website, editable DOCX and source snapshot are compared here by policy
// body text. PDF text was compared with the same normalisation when the PDF
// was generated (see the QA record); here each PDF is pinned by hash, so a
// changed PDF, or a website or DOCX body that drifts from it, fails.
const manifest = JSON.parse(readFileSync('business-documents/policies/policy-parity-manifest.json', 'utf8'));
const policy = (title) => manifest.policies.find((entry) => entry.title === title);
const privacy = policy('Privacy Policy');
const adhd = policy('ADHD Coaching Policy');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

// The same layout-only normalisation as the generation-time verifier.
const normal = (text) => text.normalize('NFKC').replaceAll('•', '').replace(/\s+/g, ' ').replace(/-\s+/g, '-').trim();
const bodyHash = (blocks) => sha256(normal(blocks.join(' ')));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', pound: '£' };
const decode = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  if (!(entity in ENTITIES)) throw new Error(`Unhandled entity &${entity};`);
  return ENTITIES[entity];
});

// Website policy body: the direct content of div.narrow.prose, as blocks.
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);
function proseTree(html) {
  const start = html.search(/<div class="[^"]*\bprose\b[^"]*">/);
  const root = { tag: 'div', attrs: '', children: [] };
  const stack = [root];
  const tokens = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  tokens.lastIndex = html.indexOf('>', start) + 1;
  for (let match = tokens.exec(html); match; match = tokens.exec(html)) {
    const [, closing, rawTag, attrs, text] = match;
    const parent = stack.at(-1);
    if (text !== undefined) {
      parent.children.push({ text: decode(text) });
    } else if (rawTag) {
      const tag = rawTag.toLowerCase();
      if (closing) {
        stack.pop();
        if (stack.length === 0) return root;
      } else {
        const node = { tag, attrs, children: [] };
        parent.children.push(node);
        if (!VOID.has(tag) && !attrs.trim().endsWith('/')) stack.push(node);
      }
    }
  }
  throw new Error('Unclosed prose container');
}
const textOf = (node) => (node.text !== undefined ? node.text : node.tag === 'br' ? ' ' : node.children.map(textOf).join(''));
function webBlocks(file) {
  const blocks = [];
  for (const child of proseTree(readFileSync(file, 'utf8')).children) {
    if (!child.tag) continue;
    if (['h2', 'h3', 'h4', 'p'].includes(child.tag)) blocks.push(child);
    else if (['ul', 'ol'].includes(child.tag)) blocks.push(...child.children.filter((node) => node.tag === 'li'));
    else if (child.tag === 'div' && /class="[^"]*\bcallout\b/.test(child.attrs)) blocks.push(...child.children.filter((node) => node.tag === 'p'));
  }
  return blocks.map((block) => normal(textOf(block)));
}

// DOCX: read package parts directly from the ZIP container.
function unzip(file) {
  const data = readFileSync(file);
  let end = data.length - 22;
  while (end >= 0 && data.readUInt32LE(end) !== 0x06054b50) end -= 1;
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16);
  const parts = new Map();
  for (let index = 0; index < count; index += 1) {
    const method = data.readUInt16LE(offset + 10);
    const size = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const local = data.readUInt32LE(offset + 42);
    const name = data.toString('utf8', offset + 46, offset + 46 + nameLength);
    const dataStart = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    const raw = data.subarray(dataStart, dataStart + size);
    parts.set(name, (method === 8 ? inflateRawSync(raw) : raw).toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return parts;
}
const decodeXml = (text) => text.replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-f]+);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[entity];
});
function docx(file) {
  const parts = unzip(file);
  const xml = parts.get('word/document.xml');
  const paragraphs = [...xml.matchAll(/<w:p\b(?:[^>]*\/>|[^>]*>([\s\S]*?)<\/w:p>)/g)].map(([, inner = '']) => normal(
    [...inner.matchAll(/<w:t\b[^>]*\/>|<w:t\b[^>]*>([^<]*)<\/w:t>|<w:br\b[^>]*\/>/g)]
      .map(([token, text]) => (token.startsWith('<w:br') ? ' ' : decodeXml(text ?? ''))).join(''),
  ));
  const boundary = paragraphs.indexOf('Policy wording');
  return {
    front: paragraphs.slice(0, boundary).filter(Boolean),
    body: paragraphs.slice(boundary + 1),
    core: parts.get('docProps/core.xml'),
    footers: [...parts.keys()].filter((name) => name.startsWith('word/footer')).map((name) => parts.get(name)).join(''),
  };
}

// Source snapshot: the block content after the "## Exact ..." heading.
function snapshotBlocks(file) {
  const content = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const heading = content.indexOf('\n## Exact') + 1;
  const body = content.slice(content.indexOf('\n', heading) + 1);
  return body.split(/\n\n+/).filter((block) => block.trim()).map((block) => normal(block
    .trim()
    .replace(/^(?:#{3,4} |- )/, '')
    .replace(/\\\n/g, '\n')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll('**', '')));
}
const snapshotHeader = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n## Exact')[0];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const isoDate = (date) => {
  const [day, month, year] = date.split(' ');
  return `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
};

function checkParity(entry) {
  const web = webBlocks(entry.html);
  const editable = docx(entry.docx);
  expect(web).toHaveLength(entry.bodyBlocks);
  expect(bodyHash(web)).toBe(entry.bodySha256);
  expect(editable.body).toEqual(web);
  expect(bodyHash(editable.body)).toBe(entry.bodySha256);
  expect(snapshotBlocks(entry.snapshot)).toEqual(web);
  expect(sha256(readFileSync(entry.docx))).toBe(entry.docxSha256);
  const pdf = readFileSync(entry.pdf);
  expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(sha256(pdf)).toBe(entry.pdfSha256);
  expect(entry.pdfTextParity).toMatch(/^PASS/);
}

function checkDocumentControl(entry, cardHeading) {
  const html = readFileSync(entry.html, 'utf8');
  const policies = readFileSync('docs/policies/index.html', 'utf8');
  const date = entry.effectiveDate;
  const label = `${entry.title} V${entry.version}`;
  // One effective date across every format and record. If the adoption date
  // differs, change it everywhere and regenerate the documents.
  expect(html).toContain(`<title>${label} | The MentorSphere</title>`);
  expect(html).toContain(`<meta name="description" content="${label}, effective ${date},`);
  expect(html).toContain(`<meta property="og:title" content="${label} | The MentorSphere">`);
  expect(html).toMatch(new RegExp(`<meta property="og:description" content="[^"]*effective ${date},`));
  expect(html).toContain(`<span class="policy-version">V${entry.version}, effective ${date}</span>`);
  expect(html).toContain(`<div><dt>Version</dt><dd>${entry.version}</dd></div>`);
  expect(html).toContain(`<div><dt>Effective date</dt><dd>${date}</dd></div>`);
  expect(html).toContain(`This web version reflects ${label}, effective from ${date}.`);
  expect(html).toContain(`<p><strong>V${entry.version}, ${date}:</strong>`);
  const structured = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  expect(structured).toMatchObject({ name: label, version: entry.version, datePublished: isoDate(date), dateModified: isoDate(date) });
  const card = policies.match(new RegExp(`<article class="policy-card">\\s*<span class="policy-version">([^<]+)</span>\\s*<h2>${cardHeading}</h2>([\\s\\S]*?)</article>`));
  expect(card[1]).toBe(`Version ${entry.version}`);
  expect(card[2]).toContain(`Effective from ${date}`);

  const editable = docx(entry.docx);
  expect(editable.front).toContain(`Version ${entry.version}`);
  expect(editable.front).toContain(`Version: ${entry.version}`);
  expect(editable.front).toContain(`Effective date: ${date}`);
  expect(editable.front).toContain(`Status: ${entry.status}`);
  expect(editable.core).toContain(`<dc:title>${label}</dc:title>`);
  expect(editable.footers).toContain(`Version ${entry.version}`);
  expect(editable.footers).not.toContain(`Version ${entry.previousVersion}`);

  const header = snapshotHeader(entry.snapshot);
  expect(header).toContain(`- Version: ${entry.version}`);
  expect(header).toContain(`- Effective/update date: ${date}`);
  expect(header).toContain(`- Status: ${entry.status}`);
  expect(header).toContain(`- Normalised policy body SHA-256: ${entry.bodySha256}`);

  // Adoption is not claimed while the date is provisional, and an adopted
  // version carries no provisional wording in any format.
  if (entry.effectiveDateProvisional) {
    expect(entry.status).toContain('Not yet adopted or published');
    expect(header).toContain('(provisional:');
  } else {
    expect(entry.status).toBe(`Approved and current. Owner adoption: ${date}.`);
    expect(header).not.toMatch(/provisional|in principle|not yet adopted/i);
    expect(editable.front.join(' ')).not.toMatch(/provisional|in principle|not yet adopted/i);
    expect(editable.core).toContain(`Adopted with effect from ${date}.`);
  }
}

function checkHistoricalCopies(entry) {
  expect(sha256(readFileSync(entry.previousDocx))).toBe(entry.previousDocxSha256);
  expect(sha256(readFileSync(entry.previousPdf))).toBe(entry.previousPdfSha256);
  expect(existsSync(entry.previousDocx.replace('/current/docx/', '/source-snapshots/').replace('.docx', '.md'))).toBe(true);
}

describe(`Privacy Policy V${privacy.version} across formats`, () => {
  it('has the same policy body on the website, in the editable DOCX, in the source snapshot and in the verified PDF', () => {
    checkParity(privacy);
  });

  it('carries one version, status and effective date in every format and record', () => {
    checkDocumentControl(privacy, 'Privacy Policy');
  });

  it(`retains V${privacy.previousVersion} provisions while distinguishing page context from supplied individual health information`, () => {
    const previous = docx(privacy.previousDocx).body;
    const current = webBlocks(privacy.html);
    const notRetained = previous.filter((block) => !current.includes(block));
    expect(notRetained).toEqual([
      'health, disability, diagnosis, SEND or neurodiversity information;',
    ]);
    expect(current.filter((block) => !previous.includes(block))).toEqual([
      'the page title and the address of the referring page, where available;',
      'Google may send page-view measurement when its code loads after you accept, even if you do not send an enquiry or open the booking page. Page addresses and titles may indicate that the page relates to ADHD coaching. This page or service context is separate from personal information you enter into a form and does not establish that you have ADHD or another condition.',
      'individual health, disability, diagnosis, SEND or neurodiversity information supplied through enquiries, ADHD Coaching Intake or learner profiles;',
      current.find((block) => block.startsWith(`V${privacy.version}, ${privacy.effectiveDate}:`)),
    ]);
    // Retained provisions stay in their original order.
    const retained = previous.filter((block) => current.includes(block));
    expect(retained.map((block) => current.indexOf(block))).toEqual([...retained.map((block) => current.indexOf(block))].sort((a, b) => a - b));
  });

  it(`leaves the V${privacy.previousVersion} editable copy and PDF unchanged`, () => {
    checkHistoricalCopies(privacy);
  });

  it('also preserves the previously pinned V1.6 historical copies', () => {
    expect(sha256(readFileSync('business-documents/policies/current/docx/Privacy_Policy_V1.6.docx'))).toBe('6c7266dcde8f3d99f8df53a0d6fc2a5a7e0e10c1bd637850491611f7e5ef6923');
    expect(sha256(readFileSync('business-documents/policies/current/pdf/Privacy_Policy_V1.6.pdf'))).toBe('dfbfd20912e35f971261277dcee596bd49f2ece6ba295ab263c8ba6b9e9f3fca');
    expect(existsSync('business-documents/policies/source-snapshots/Privacy_Policy_V1.6.md')).toBe(true);
  });
});

describe(`ADHD Coaching Policy V${adhd.version} across formats`, () => {
  it('has the same policy body on the website, in the editable DOCX, in the source snapshot and in the verified PDF', () => {
    checkParity(adhd);
  });

  it('carries one version, status and effective date in every format and record', () => {
    checkDocumentControl(adhd, 'ADHD Coaching Policy');
  });

  it('changes only the Privacy Policy cross-reference and adds a change-log entry', () => {
    const previous = docx(adhd.previousDocx).body;
    const current = webBlocks(adhd.html);
    const oldReference = previous.find((block) => block.includes('The Privacy Policy V1.6 explains'));
    const newReference = oldReference.replace('The Privacy Policy V1.6 explains', 'The current Privacy Policy explains');
    const changeLog = current.find((block) => block.startsWith(`V${adhd.version}, ${adhd.effectiveDate}:`));
    expect(current.filter((block) => !previous.includes(block))).toEqual([newReference, changeLog]);
    expect(previous.filter((block) => !current.includes(block))).toEqual([oldReference]);
    expect(current.indexOf(changeLog)).toBe(current.findIndex((block) => block.startsWith('V1.4, ')) - 1);
    expect(changeLog).toContain('administrative document-maintenance update');
    expect(changeLog).toContain('does not change any service terms');
    // The only remaining version-specific Privacy Policy mention is historical.
    const versioned = current.filter((block) => /Privacy Policy V\d/.test(block));
    expect(versioned).toHaveLength(1);
    expect(versioned[0]).toMatch(/^V1\.4, 25 September 2026:/);
    expect(readFileSync(adhd.html, 'utf8')).toContain('The current <a href="../privacy-policy/">Privacy Policy</a> explains');
  });

  it('keeps every service term word for word', () => {
    const previous = docx(adhd.previousDocx).body;
    const current = webBlocks(adhd.html);
    for (const term of [
      'Adults with ADHD aged 18+',
      'Young people with ADHD aged 10 to 17',
      'Single self-funded session: £70 per 60 minutes.',
      'Six-session self-funded coaching package: £390, valid for six months.',
      'Twelve-session self-funded coaching package: £740, valid for twelve months.',
      'Access to Work-funded coaching: £110 per 60-minute session.',
      'Employer-funded coaching: £110 per 60-minute session.',
      'The standard notice period for cancelling or rescheduling a coaching session is 48 hours.',
      'Coaching is private, but not absolutely confidential.',
      'Around one in every four sessions involving a parent or guardian is a general recommendation, not a fixed contractual requirement.',
      'All funding decisions are made by Access to Work.',
      'Luke Turner is the Designated Safeguarding Lead.',
      'Coaching is not therapy, clinical diagnosis, medical treatment or crisis support.',
      'Direct young-person coaching through the intake is for ages 10 to 17.',
      'This policy is due for review by 27 July 2027',
    ]) {
      const block = current.find((text) => text.includes(term));
      expect(block, term).toBeDefined();
      expect(previous, term).toContain(block);
    }
    expect(readFileSync(adhd.html, 'utf8')).toContain('<div><dt>Next review date</dt><dd>27 July 2027</dd></div>');
  });

  it('updates every current version label on the website', () => {
    for (const file of ['docs/adhd-coaching/index.html', 'docs/adhd-coaching/access-to-work/index.html', 'docs/adhd-coaching/employer-funded/index.html', 'docs/adhd-coaching/schools/index.html']) {
      const html = readFileSync(file, 'utf8');
      expect(html, file).toContain(`>Read ADHD Coaching Policy V${adhd.version}</a>`);
      expect(html, file).not.toMatch(/ADHD Coaching Policy V1\.[0-4]\b/);
    }
  });

  it(`leaves the V${adhd.previousVersion} editable copy and PDF unchanged`, () => {
    checkHistoricalCopies(adhd);
  });
});
