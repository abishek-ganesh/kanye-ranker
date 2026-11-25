/**
 * Keeps the static, crawlable copy in index.html and llms.txt in sync with
 * data/songs.json. The landing page once said "16 albums" and "300+ songs"
 * long after both were wrong.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const songsData = JSON.parse(fs.readFileSync(path.join(root, 'data/songs.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

const songCount = songsData.songs.length;
const albums = songsData.albums;
const text = el => el.textContent.replace(/\s+/g, ' ').trim();

function structuredData() {
  const ld = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
  const byType = type => ld['@graph'].find(node => node['@type'] === type);
  return { app: byType('WebApplication'), faq: byType('FAQPage') };
}

describe('landing page copy matches songs.json', () => {
  test('stats line shows the real song and album counts', () => {
    const numbers = [...doc.querySelectorAll('.stats-line .stat-number')].map(text);
    expect(numbers.slice(0, 2)).toEqual([String(songCount), String(albums.length)]);
  });

  test('album list has every album with its year, in order', () => {
    const items = [...doc.querySelectorAll('.about-albums li')].map(li => ({
      name: text(li).replace(/\s*\d{4}$/, ''),
      year: Number(text(li.querySelector('.about-year')))
    }));
    expect(items).toEqual(albums.map(a => ({ name: a.name, year: a.year })));
  });

  test('meta description and FAQ use the real song count', () => {
    expect(doc.querySelector('meta[name="description"]').content).toContain(`${songCount} songs`);
    expect(text(doc.querySelector('.about-faq'))).toContain(`${songCount} of Kanye West`);
    expect(text(doc.querySelector('.about-faq'))).toContain(`${albums.length} albums`);
  });
});

describe('structured data', () => {
  test('parses and describes the real catalog', () => {
    const { app } = structuredData();
    expect(app.description).toContain(`${songCount} songs across ${albums.length} albums`);
    expect(app.offers.price).toBe('0');
  });

  test('FAQPage questions and answers match the visible FAQ exactly', () => {
    const { faq } = structuredData();
    const visible = [...doc.querySelectorAll('.faq-item')].map(item => ({
      q: text(item.querySelector('h4')),
      a: text(item.querySelector('p'))
    }));
    const declared = faq.mainEntity.map(e => ({ q: e.name, a: e.acceptedAnswer.text }));
    expect(declared).toEqual(visible);
    expect(declared.length).toBeGreaterThan(0);
  });
});

describe('search and social tags', () => {
  const meta = sel => doc.querySelector(sel).content;

  test('social titles and descriptions match the page title and description', () => {
    const description = meta('meta[name="description"]');
    expect(meta('meta[property="og:title"]')).toBe(doc.title);
    expect(meta('meta[name="twitter:title"]')).toBe(doc.title);
    expect(meta('meta[property="og:description"]')).toBe(description);
    expect(meta('meta[name="twitter:description"]')).toBe(description);
  });

  test('title and description fit in a search result', () => {
    expect(doc.title.length).toBeLessThanOrEqual(60);
    expect(meta('meta[name="description"]').length).toBeLessThanOrEqual(160);
  });

  test('structured data ties the app to the Kanye West entity, so Ye and Yeezy resolve to him', () => {
    const { about } = structuredData().app;
    expect(about.alternateName).toEqual(expect.arrayContaining(['Ye', 'Yeezy']));
    expect(about.sameAs).toEqual(expect.arrayContaining([
      'https://en.wikipedia.org/wiki/Kanye_West',
      'https://www.wikidata.org/wiki/Q15935'
    ]));
  });
});

describe('IndexNow', () => {
  test('the key in the workflow has a matching key file at the site root', () => {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows/indexnow.yml'), 'utf8');
    const key = workflow.match(/INDEXNOW_KEY: ([0-9a-f]{32})/)[1];
    expect(fs.readFileSync(path.join(root, `${key}.txt`), 'utf8')).toBe(key);
  });
});

describe('llms.txt', () => {
  test('lists the real song count and every album', () => {
    expect(llms).toContain(`${songCount} of Kanye West's most-streamed songs across ${albums.length} albums`);
    albums.forEach(a => expect(llms).toContain(`- ${a.name} (${a.year})`));
  });
});
