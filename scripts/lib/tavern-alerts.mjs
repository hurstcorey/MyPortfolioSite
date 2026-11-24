// Price-move detection and the alert email for the TableTopTavern inventory.
// Everything here is pure (no network, filesystem or clock) so it can be
// tested directly; scripts/check-tavern-prices.mjs supplies the I/O.

export const DEFAULT_THRESHOLDS = {
  /** Alert when the market price moved this many percent since the last check. */
  dayPct: 15,
  /** Alert when it moved this many percent over the last 7 days. */
  weekPct: 25,
  /** Ignore moves smaller than this many dollars, whatever the percentage. */
  minUsd: 1,
  /** How long price points are kept. */
  historyDays: 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC calendar day, the unit the price history is kept in. */
export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daysBefore(dateKey, days) {
  return toDateKey(new Date(Date.parse(`${dateKey}T00:00:00Z`) - days * DAY_MS));
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function change(from, price) {
  const usd = round(price - from.price, 2);
  return {
    since: from.date,
    from: from.price,
    usd,
    pct: round((usd / from.price) * 100, 1),
  };
}

function isBigMove(move, minPct, minUsd) {
  return move !== null && Math.abs(move.usd) >= minUsd && Math.abs(move.pct) >= minPct;
}

/** The triggering move with the largest percentage, used for sorting and the subject. */
export function headlineMove(alert) {
  return alert.reasons
    .map((reason) => alert[reason])
    .reduce((a, b) => (Math.abs(b.pct) > Math.abs(a.pct) ? b : a));
}

/**
 * Compares today's market prices against the stored history.
 *
 * `history` maps an item key to `{ points: [{ date, price }], alert? }`, where
 * `alert` is the last price an alert was sent for. `quotes` is a list of
 * `{ key, price }`; a null price is skipped and leaves the history untouched.
 *
 * Returns the alerts to send and the history to store once they are sent.
 */
export function evaluate(history, quotes, today, thresholds = DEFAULT_THRESHOLDS) {
  const weekStart = daysBefore(today, 7);
  const historyStart = daysBefore(today, thresholds.historyDays);

  const next = {};
  for (const [key, entry] of Object.entries(history)) {
    const points = entry.points
      .filter((point) => point.date >= historyStart)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (points.length === 0) continue;
    next[key] = { points };
    if (entry.alert && entry.alert.date >= historyStart) next[key].alert = entry.alert;
  }

  const alerts = [];
  for (const { key, price } of quotes) {
    if (price === null || price === undefined) continue;

    const entry = next[key] ?? { points: [] };
    // A second run on the same day replaces that day's point.
    const prior = entry.points.filter((point) => point.date < today);
    const previous = prior.at(-1) ?? null;
    // After an alert the week is measured from the alerted price, so one jump
    // is reported once rather than every day until it leaves the window.
    const weekBase =
      entry.alert && entry.alert.date >= weekStart
        ? entry.alert
        : prior.find((point) => point.date >= weekStart) ?? null;

    const day = previous ? change(previous, price) : null;
    const week = weekBase ? change(weekBase, price) : null;
    const trend = prior.length > 0 ? change(prior[0], price) : null;

    const reasons = [];
    if (isBigMove(day, thresholds.dayPct, thresholds.minUsd)) reasons.push('day');
    if (isBigMove(week, thresholds.weekPct, thresholds.minUsd)) reasons.push('week');
    const alerted = reasons.length > 0 && entry.alert?.date !== today;

    next[key] = { points: [...prior, { date: today, price }] };
    if (alerted) {
      next[key].alert = { date: today, price };
      alerts.push({ key, price, day, week, trend, reasons });
    } else if (entry.alert) {
      next[key].alert = entry.alert;
    }
  }

  alerts.sort((a, b) => Math.abs(headlineMove(b).pct) - Math.abs(headlineMove(a).pct));
  return { alerts, history: next };
}

function usd(amount) {
  return `$${Math.abs(amount).toFixed(2)}`;
}

function signed(amount) {
  return `${amount < 0 ? '-' : '+'}${usd(amount)}`;
}

function describeMove(move) {
  if (!move) return 'n/a';
  return `${signed(move.usd)} (${move.pct < 0 ? '' : '+'}${move.pct.toFixed(1)}%)`;
}

function describeListPrice(listPrice, marketPrice) {
  const gap = round(listPrice - marketPrice, 2);
  if (gap === 0) return `${usd(listPrice)} (at market)`;
  return `${usd(listPrice)} (${usd(gap)} ${gap > 0 ? 'above' : 'below'} market)`;
}

function describeCard(item) {
  const finish = item.finish === 'foil' ? ', foil' : '';
  return `${item.setName} #${item.number}${finish}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const UP_COLOR = '#15803d';
const DOWN_COLOR = '#b91c1c';

function moveCell(move) {
  if (!move) return '<td style="padding:8px 12px;color:#6b7280;">n/a</td>';
  const color = move.usd < 0 ? DOWN_COLOR : UP_COLOR;
  return `<td style="padding:8px 12px;color:${color};white-space:nowrap;">${escapeHtml(describeMove(move))}</td>`;
}

/**
 * Builds the alert email. `items` are the snapshot listings the alerts refer
 * to; `storeUrl` is linked at the bottom.
 */
export function renderEmail(alerts, items, { today, storeUrl, thresholds = DEFAULT_THRESHOLDS }) {
  const itemsByKey = new Map(items.map((item) => [item.key, item]));
  const rows = alerts
    .map((alert) => ({ alert, item: itemsByKey.get(alert.key) }))
    .filter((row) => row.item);

  const first = rows[0];
  const firstMove = headlineMove(first.alert);
  const subject =
    rows.length === 1
      ? `TableTopTavern price alert: ${first.item.name} ${firstMove.usd < 0 ? 'down' : 'up'} ${Math.abs(firstMove.pct).toFixed(1)}%`
      : `TableTopTavern price alert: ${rows.length} cards moved`;

  const intro =
    `${rows.length} card${rows.length === 1 ? '' : 's'} in your inventory moved at least ` +
    `${thresholds.dayPct}% since the last check or ${thresholds.weekPct}% over 7 days ` +
    `(and at least ${usd(thresholds.minUsd)}), as of ${today}.`;

  const text = [
    intro,
    '',
    ...rows.flatMap(({ alert, item }) => [
      `${item.name} (${describeCard(item)})`,
      `  Market now:       ${usd(alert.price)}`,
      `  Since last check: ${describeMove(alert.day)}`,
      `  7-day:            ${describeMove(alert.week)}`,
      `  Your list price:  ${describeListPrice(item.listPrice, alert.price)}`,
      '',
    ]),
    `Store: ${storeUrl}`,
    'Market prices are TCGplayer market prices via Scryfall and SWU-DB.',
  ].join('\n');

  const header = ['Card', 'Market now', 'Since last check', '7-day', 'Your list price']
    .map((label) => `<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">${label}</th>`)
    .join('');
  const body = rows
    .map(
      ({ alert, item }) => `<tr style="border-bottom:1px solid #e5e7eb;">
<td style="padding:8px 12px;"><strong>${escapeHtml(item.name)}</strong><br><span style="color:#6b7280;font-size:12px;">${escapeHtml(describeCard(item))}</span></td>
<td style="padding:8px 12px;white-space:nowrap;">${usd(alert.price)}</td>
${moveCell(alert.day)}
${moveCell(alert.week)}
<td style="padding:8px 12px;">${escapeHtml(describeListPrice(item.listPrice, alert.price))}</td>
</tr>`,
    )
    .join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;">
<h2 style="margin:0 0 8px;">TableTopTavern price alert</h2>
<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
<table style="border-collapse:collapse;font-size:14px;">
<thead><tr>${header}</tr></thead>
<tbody>
${body}
</tbody>
</table>
<p style="margin:16px 0 0;"><a href="${escapeHtml(storeUrl)}">Open your store on TCGplayer</a></p>
<p style="margin:8px 0 0;color:#6b7280;font-size:12px;">Market prices are TCGplayer market prices via Scryfall and SWU-DB.</p>
</div>`;

  return { subject, html, text };
}
