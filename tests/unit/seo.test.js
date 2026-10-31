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

describe('llms.txt', () => {
  test('lists the real song count and every album', () => {
    expect(llms).toContain(`${songCount} of Kanye West's most-streamed songs across ${albums.length} albums`);
    albums.forEach(a => expect(llms).toContain(`- ${a.name} (${a.year})`));
  });
});
