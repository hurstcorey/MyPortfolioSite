import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, evaluate, renderEmail, toDateKey } from './tavern-alerts.mjs';
import { itemKey, mtgMarketPrice, swuMarketPrice, toPrice } from './tavern-sources.mjs';

const KEY = 'mtg:558355:nonfoil';
const TODAY = '2026-11-12';

function history(points, alert) {
  return { [KEY]: alert ? { points, alert } : { points } };
}

function quote(price) {
  return [{ key: KEY, price }];
}

describe('evaluate', () => {
  it('records a baseline without alerting on the first run', () => {
    const result = evaluate({}, quote(28.45), TODAY);
    expect(result.alerts).toEqual([]);
    expect(result.history[KEY]).toEqual({ points: [{ date: TODAY, price: 28.45 }] });
  });

  it('alerts on a big move since the last check', () => {
    const result = evaluate(history([{ date: '2026-11-11', price: 20 }]), quote(24), TODAY);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({
      key: KEY,
      price: 24,
      day: { since: '2026-11-11', from: 20, usd: 4, pct: 20 },
      reasons: ['day'],
    });
    expect(result.history[KEY].alert).toEqual({ date: TODAY, price: 24 });
  });

  it('alerts on drops as well as spikes', () => {
    const result = evaluate(history([{ date: '2026-11-11', price: 20 }]), quote(16), TODAY);
    expect(result.alerts[0].day).toMatchObject({ usd: -4, pct: -20 });
  });

  it('ignores moves below the percentage threshold', () => {
    const result = evaluate(history([{ date: '2026-11-11', price: 20 }]), quote(22), TODAY);
    expect(result.alerts).toEqual([]);
  });

  it('ignores big percentage moves worth less than the dollar floor', () => {
    const result = evaluate(history([{ date: '2026-11-11', price: 1 }]), quote(1.5), TODAY);
    expect(result.alerts).toEqual([]);
  });

  it('alerts on a slow climb that only crosses the weekly threshold', () => {
    const points = [
      { date: '2026-11-06', price: 20 },
      { date: '2026-11-08', price: 22 },
      { date: '2026-11-10', price: 24 },
      { date: '2026-11-11', price: 25 },
    ];
    const result = evaluate(history(points), quote(26), TODAY);
    expect(result.alerts[0].reasons).toEqual(['week']);
    expect(result.alerts[0].week).toMatchObject({ since: '2026-11-06', from: 20, pct: 30 });
  });

  it('measures the week from the oldest point inside the 7-day window', () => {
    const points = [
      { date: '2026-11-01', price: 10 },
      { date: '2026-11-11', price: 20 },
    ];
    const result = evaluate(history(points), quote(20.5), TODAY);
    expect(result.alerts).toEqual([]);
  });

  it('does not repeat an alert for the same jump on later days', () => {
    const points = [
      { date: '2026-11-10', price: 20 },
      { date: '2026-11-11', price: 30 },
    ];
    const result = evaluate(
      history(points, { date: '2026-11-11', price: 30 }),
      quote(30.5),
      TODAY,
    );
    expect(result.alerts).toEqual([]);
    expect(result.history[KEY].alert).toEqual({ date: '2026-11-11', price: 30 });
  });

  it('does not alert twice when run again on the same day', () => {
    const points = [
      { date: '2026-11-11', price: 20 },
      { date: TODAY, price: 30 },
    ];
    const result = evaluate(history(points, { date: TODAY, price: 30 }), quote(30), TODAY);
    expect(result.alerts).toEqual([]);
    expect(result.history[KEY].points).toEqual(points);
  });

  it('drops points older than the history window', () => {
    const points = [
      { date: '2026-10-01', price: 20 },
      { date: '2026-11-11', price: 20 },
    ];
    const result = evaluate(history(points), quote(20), TODAY);
    expect(result.history[KEY].points).toEqual([
      { date: '2026-11-11', price: 20 },
      { date: TODAY, price: 20 },
    ]);
  });

  it('keeps history for a card whose price is missing today', () => {
    const points = [{ date: '2026-11-11', price: 20 }];
    const result = evaluate(history(points), quote(null), TODAY);
    expect(result.alerts).toEqual([]);
    expect(result.history[KEY].points).toEqual(points);
  });

  it('puts the biggest move first', () => {
    const result = evaluate(
      {
        a: { points: [{ date: '2026-11-11', price: 10 }] },
        b: { points: [{ date: '2026-11-11', price: 10 }] },
      },
      [
        { key: 'a', price: 12 },
        { key: 'b', price: 5 },
      ],
      TODAY,
    );
    expect(result.alerts.map((alert) => alert.key)).toEqual(['b', 'a']);
  });
});

describe('renderEmail', () => {
  const items = [
    {
      key: KEY,
      name: 'Three <Tree> City',
      setName: 'Bloomburrow',
      number: '260',
      finish: 'nonfoil',
      listPrice: 30,
    },
    {
      key: 'mtg:528287:foil',
      name: 'Mycosynth Lattice',
      setName: 'Secret Lair Drop',
      number: '1434★',
      finish: 'foil',
      listPrice: 45.95,
    },
  ];
  const options = { today: TODAY, storeUrl: 'https://example.com/store' };

  function alertsFor(quotes) {
    const prior = {
      [KEY]: { points: [{ date: '2026-11-11', price: 20 }] },
      'mtg:528287:foil': { points: [{ date: '2026-11-11', price: 50 }] },
    };
    return evaluate(prior, quotes, TODAY).alerts;
  }

  it('names the card and direction when a single card moved', () => {
    const email = renderEmail(alertsFor(quote(24)), items, options);
    expect(email.subject).toBe('TableTopTavern price alert: Three <Tree> City up 20.0%');
    expect(email.text).toContain('Since last check: +$4.00 (+20.0%)');
    expect(email.text).toContain('Your list price:  $30.00 ($6.00 above market)');
  });

  it('escapes card names in the HTML body', () => {
    const email = renderEmail(alertsFor(quote(24)), items, options);
    expect(email.html).toContain('Three &lt;Tree&gt; City');
    expect(email.html).not.toContain('<Tree>');
  });

  it('summarises several cards in the subject and notes foils and drops', () => {
    const email = renderEmail(
      alertsFor([
        { key: KEY, price: 24 },
        { key: 'mtg:528287:foil', price: 40 },
      ]),
      items,
      options,
    );
    expect(email.subject).toBe('TableTopTavern price alert: 2 cards moved');
    expect(email.text).toContain('Mycosynth Lattice (Secret Lair Drop #1434★, foil)');
    expect(email.text).toContain('-$10.00 (-20.0%)');
    expect(email.text).toContain('$45.95 ($5.95 above market)');
  });
});

describe('toDateKey', () => {
  it('uses the UTC calendar day', () => {
    expect(toDateKey(new Date('2026-11-12T23:59:59Z'))).toBe('2026-11-12');
  });
});

describe('price sources', () => {
  it('parses price strings and rejects blanks and zeroes', () => {
    expect(toPrice('12.84')).toBe(12.84);
    expect(toPrice('')).toBeNull();
    expect(toPrice(null)).toBeNull();
    expect(toPrice('0.00')).toBeNull();
  });

  it('picks the Scryfall price for the listed finish', () => {
    const card = { prices: { usd: '5.31', usd_foil: '6.26' } };
    expect(mtgMarketPrice(card, 'nonfoil')).toBe(5.31);
    expect(mtgMarketPrice(card, 'foil')).toBe(6.26);
  });

  it('falls back to the other finish when the listed one has no price', () => {
    expect(mtgMarketPrice({ prices: { usd: null, usd_foil: '46.21' } }, 'nonfoil')).toBe(46.21);
    expect(mtgMarketPrice({ prices: {} }, 'nonfoil')).toBeNull();
  });

  it('picks the SWU-DB price for the listed finish', () => {
    const card = { MarketPrice: '12.84', FoilPrice: '30.10' };
    expect(swuMarketPrice(card, 'nonfoil')).toBe(12.84);
    expect(swuMarketPrice(card, 'foil')).toBe(30.1);
  });

  it('builds the key shared by the snapshot and the history', () => {
    expect(itemKey({ game: 'swu', tcgplayerId: 678655, finish: 'nonfoil' })).toBe(
      'swu:678655:nonfoil',
    );
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  it('keeps a month of history', () => {
    expect(DEFAULT_THRESHOLDS.historyDays).toBe(30);
  });
});
