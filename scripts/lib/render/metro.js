// Commit Metro: the contribution graph as a Namma Metro line. Each week is a 7-coach train and
// each coach is a day (Sunday first, like GitHub's grid); lit windows mean commits that day.
// Stations are my busiest repos at their busiest week, and the line ends at Commit Street,
// the interchange where the green line carries $VJK.
//
// The view rests on today. Every loop it fades back a year and rides forward along the viaduct.
// The resting frame is also the base state, so static renderers and reduced motion see today.

import { svg, text, width, n, truncate } from './common.js';
import { rupees, signed, arrow } from '../money.js';
import { weekStart, weekday, monthName, fmtDate } from '../time.js';

const W = 880;
const H = 324;
const COACH = 24;
const GAP = 1.5;
const HITCH = 16;
const TRAIN = 7 * COACH + 6 * GAP;
const PITCH = TRAIN + HITCH;
const DX = 6; // oblique depth: right…
const DY = 5; // …and up
const CH = 14; // coach side height
const RAIL = 214; // y where the coaches sit
const DECK = 9; // viaduct front face height
const GROUND = 264;
const START = 70; // first train's x inside the ride
const TAIL = 340; // track after the last train, for Commit Street
const DURATION = 70; // seconds per loop
const PARALLAX = 0.35;
const LINE_Y = 287; // route map along the bottom

export const LINES = { purple: '#8b3fa4', green: '#2f9e4f' };

const PALETTES = {
  dark: {
    skyTop: '#060a13', skyBottom: '#162133', star: '#d6deea', moon: '#f3ead0',
    city: '#1b2536', cityLit: '#f0c75e', cityLitP: 0.09,
    deckTop: '#4a5464', deck: '#3b4453', deckEdge: '#5d6878', deckText: '#8792a1', pillar: '#2d3542', pillarSide: '#232a35',
    ground: '#0a0f17', rail: '#6c7787',
    body: '#a9b2bd', roof: '#c9d0d8', end: '#7f8996',
    win: ['#1c2532', '#6b5823', '#a8852d', '#e0b33d', '#ffe37b'],
    canopy: '#566173', canopyTop: '#6c7889', post: '#465062',
    text: '#e6edf3', muted: '#8d99a6', tickOff: '#263142',
  },
  light: {
    skyTop: '#b9d3ea', skyBottom: '#eef4f9', star: null, moon: null,
    city: '#c4d1de', cityLit: '#f3cf72', cityLitP: 0.03,
    deckTop: '#c9d1da', deck: '#b5bec8', deckEdge: '#d9dfe6', deckText: '#5f6b78', pillar: '#a5afba', pillarSide: '#8f9aa6',
    ground: '#dde4ea', rail: '#8a95a2',
    body: '#e8ecf0', roof: '#f8fafb', end: '#c3cad2',
    win: ['#55657a', '#c6a04b', '#dcae3e', '#efbf31', '#ffd23f'],
    canopy: '#8e99a6', canopyTop: '#a9b3be', post: '#7d8894',
    text: '#1f2328', muted: '#5b6670', tickOff: '#c5ced8',
  },
};

/** Calendar days grouped into Sunday-started weeks, oldest first. */
export function weeksOf(calendar) {
  const weeks = [];
  for (const { d, c } of calendar) {
    const start = weekStart(d);
    if (weeks.at(-1)?.start !== start) weeks.push({ start, days: [] });
    weeks.at(-1).days.push({ d, c, dow: weekday(d) });
  }
  return weeks;
}

/** 0 for no commits, else 1–4 by share of the busiest day (like GitHub's shades of green). */
const lightLevel = (count, max) => (count <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((count / max) * 4))));

/** Small seeded PRNG so the skyline is the same on every run (no diff, no commit). */
function seeded(seedText) {
  let seed = [...seedText].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One coach, origin at the bottom-left of its side face, standing on the rail. */
function coach(id, windowFill, stripe, p) {
  return `<g id="${id}">`
    + `<polygon points="0,${-CH} ${COACH},${-CH} ${COACH + DX},${-CH - DY} ${DX},${-CH - DY}" fill="${p.roof}"/>`
    + `<polygon points="${COACH},0 ${COACH},${-CH} ${COACH + DX},${-CH - DY} ${COACH + DX},${-DY}" fill="${p.end}"/>`
    + `<rect y="${-CH}" width="${COACH}" height="${CH}" fill="${p.body}"/>`
    + [2.4, 9.3, 16.2].map((x) => `<rect x="${x}" y="${-CH + 2.4}" width="5.4" height="5.4" rx=".7" fill="${windowFill}"/>`).join('')
    + `<rect y="-4.2" width="${COACH}" height="2" fill="${stripe}"/>`
    + '</g>';
}

/** A station canopy over the track from x0 to x1, with a hanging name board on top. */
function station(x0, x1, name, p, { colors = [LINES.purple], lift = 0 } = {}) {
  const bottom = RAIL - CH - DY - 14 - lift;
  const signW = width(name, 8.5, 0.4) + 16;
  const cx = (x0 + x1) / 2;
  const bands = colors.map((color, i) => `<rect x="${n(cx - signW / 2 + (i * signW) / colors.length)}" y="${bottom - DY - 17}" width="${n(signW / colors.length)}" height="13" fill="${color}"/>`).join('');
  return {
    back: [x0 + 3, x1 - 6].map((x) => `<rect x="${n(x)}" y="${bottom}" width="2.4" height="${RAIL - DY - bottom}" fill="${p.post}"/>`).join(''),
    front: `<polygon points="${n(x0)},${bottom} ${n(x1)},${bottom} ${n(x1 + DX)},${bottom - DY} ${n(x0 + DX)},${bottom - DY}" fill="${p.canopyTop}"/>`
      + `<rect x="${n(x0)}" y="${bottom}" width="${n(x1 - x0)}" height="3" fill="${p.canopy}"/>`
      + `<g>${bands}</g>`
      + text(cx, bottom - DY - 7.6, name, { size: 8.5, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 0.4 }),
  };
}

export function metro(v, theme) {
  const p = PALETTES[theme.scheme];
  const { cfg, stats } = v;
  const weeks = weeksOf(stats.calendar);
  const maxDay = Math.max(1, ...stats.calendar.map((d) => d.c));
  const weekTotals = weeks.map((w) => w.days.reduce((sum, d) => sum + d.c, 0));
  const maxWeek = Math.max(1, ...weekTotals);
  const today = stats.calendar.at(-1)?.d;
  const last = weeks.length - 1;
  const L = START + weeks.length * PITCH + TAIL;
  const travel = Math.max(0, L - W);
  const trainX = (i) => START + i * PITCH;
  const coachX = (i, dow) => trainX(i) + dow * (COACH + GAP);
  const stations = (stats.stations ?? [])
    .map((s) => ({ ...s, i: weeks.findIndex((w) => w.start === s.week) }))
    .filter((s) => s.i >= 0);
  const rand = seeded(cfg.login);

  const defs = [
    `<linearGradient id="sky" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBottom}"/></linearGradient>`,
    `<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>`,
    ...p.win.map((fill, lvl) => coach(`c${lvl}`, fill, LINES.purple, p)),
    coach('cg', p.win[3], LINES.green, p),
    `<pattern id="pillars" patternUnits="userSpaceOnUse" width="72" height="${GROUND - RAIL}" y="${RAIL}">`
      + `<polygon points="24,${DECK} 52,${DECK} 45,${DECK + 7} 31,${DECK + 7}" fill="${p.pillar}"/>`
      + `<rect x="33" y="${DECK + 7}" width="10" height="${GROUND - RAIL - DECK - 7}" fill="${p.pillar}"/>`
      + `<polygon points="43,${DECK + 7} 46,${DECK + 4} 46,${GROUND - RAIL - 3} 43,${GROUND - RAIL}" fill="${p.pillarSide}"/>`
      + '</pattern>',
  ].join('');

  // Sky, stars and moon stay put
  const sky = [`<rect width="${W}" height="${GROUND}" fill="url(#sky)"/>`];
  if (p.star) {
    for (let i = 0; i < 46; i++) {
      sky.push(`<circle cx="${n(rand() * W)}" cy="${n(54 + rand() * 90)}" r="${n(0.4 + rand() * 0.8)}" fill="${p.star}" opacity="${n(0.3 + rand() * 0.6)}"/>`);
    }
    sky.push(`<circle cx="792" cy="78" r="26" fill="${p.moon}" opacity=".06"/><circle cx="792" cy="78" r="10" fill="${p.moon}" opacity=".9"/>`);
  }

  // Skyline drifts slower than the trains for depth
  const city = [];
  for (let x = -20; x < travel * PARALLAX + W + 40; ) {
    const w = 22 + rand() * 38;
    const h = 50 + rand() ** 1.6 * 130;
    city.push(`<rect x="${n(x)}" y="${n(GROUND - h)}" width="${n(w)}" height="${n(h)}" fill="${p.city}" opacity="${n(0.7 + rand() * 0.3)}"/>`);
    for (let wy = GROUND - h + 6; wy < GROUND - 12; wy += 7) {
      for (let wx = x + 4; wx < x + w - 4; wx += 6) {
        if (rand() < p.cityLitP) city.push(`<rect x="${n(wx)}" y="${n(wy)}" width="2" height="2.6" fill="${p.cityLit}" opacity=".75"/>`);
      }
    }
    x += w + 3 + rand() * 10;
  }

  // The ride: viaduct, trains and stations all move together
  const ride = [
    `<rect y="${RAIL}" width="${L}" height="${GROUND - RAIL}" fill="url(#pillars)"/>`,
    `<polygon points="0,${RAIL} ${L},${RAIL} ${L + DX},${RAIL - DY} ${DX},${RAIL - DY}" fill="${p.deckTop}"/>`,
    `<line x1="0" y1="${RAIL - DY + 1.2}" x2="${L}" y2="${RAIL - DY + 1.2}" stroke="${p.rail}" stroke-width=".8"/>`,
    `<line x1="0" y1="${RAIL - 1}" x2="${L}" y2="${RAIL - 1}" stroke="${p.rail}" stroke-width=".8"/>`,
    `<rect y="${RAIL}" width="${L}" height="${DECK}" fill="${p.deck}"/>`,
    `<rect y="${RAIL}" width="${L}" height="1.2" fill="${p.deckEdge}"/>`,
  ];
  weeks.forEach((w, i) => {
    if (i > 0 && w.start.slice(0, 7) === weeks[i - 1].start.slice(0, 7)) return;
    ride.push(text(trainX(i) + 3, RAIL + 7.2, monthName(w.start).toUpperCase(), { size: 7, weight: 700, fill: p.deckText, ls: 1 }));
  });

  const boards = stations.map((s) => station(trainX(s.i) - 10, trainX(s.i) + TRAIN + 10, truncate(s.name, 16), p));
  // Commit Street is the next stop after this week's train, so a station this week still fits
  const terminusX0 = trainX(last) + TRAIN + 14;
  const greenX = terminusX0 + 16;
  const terminusX1 = greenX + 3 * (COACH + GAP) + 26;
  const terminus = station(terminusX0, terminusX1, 'COMMIT STREET', p, { colors: [LINES.purple, LINES.green], lift: 6 });
  ride.push(...boards.map((b) => b.back), terminus.back);

  weeks.forEach((w, i) => {
    for (const day of w.days) {
      if (day.d === today) {
        ride.push(`<rect class="pulse" x="${n(coachX(i, day.dow) - 2)}" y="${RAIL - CH - DY - 2}" width="${COACH + DX + 4}" height="${CH + DY + 3}" rx="2" fill="${p.win[4]}" opacity=".35"/>`);
      }
      ride.push(`<use href="#c${lightLevel(day.c, maxDay)}" x="${n(coachX(i, day.dow))}" y="${RAIL}"/>`);
    }
    const head = coachX(i, w.days.at(-1).dow) + COACH + 1;
    const tail = coachX(i, w.days[0].dow) - 0.6;
    ride.push(`<circle cx="${n(head)}" cy="${RAIL - 6}" r="1.6" fill="#fff3b0"${i === last ? ' class="pulse"' : ''}/>`);
    ride.push(`<circle cx="${n(tail)}" cy="${RAIL - 6}" r="1.2" fill="#ff5a5a"/>`);
  });

  // Commit Street: the green line train for $VJK, under an LED board with the live price
  for (let k = 0; k < 3; k++) ride.push(`<use href="#cg" x="${n(greenX + k * (COACH + GAP))}" y="${RAIL}"/>`);
  ride.push(`<circle cx="${n(greenX - 0.8)}" cy="${RAIL - 6}" r="1.6" fill="#fff3b0"/>`);
  const quote = `$${cfg.symbol} ${rupees(v.price)} ${arrow(v.changePct)} ${signed(v.changePct)}%`;
  const ledW = width(quote, 8, 0.3) + 14;
  const ledX = greenX + 1.5 * (COACH + GAP) - ledW / 2;
  const ledY = RAIL - CH - DY - 14 - 6 + 4; // just under the terminus canopy
  ride.push(`<line x1="${n(ledX + 8)}" y1="${ledY - 3}" x2="${n(ledX + 8)}" y2="${ledY}" stroke="${p.post}"/><line x1="${n(ledX + ledW - 8)}" y1="${ledY - 3}" x2="${n(ledX + ledW - 8)}" y2="${ledY}" stroke="${p.post}"/>`);
  ride.push(`<rect x="${n(ledX)}" y="${ledY}" width="${n(ledW)}" height="12" rx="1.5" fill="#0b0b0c" stroke="#30343a"/>`);
  ride.push(text(ledX + ledW / 2, ledY + 8.6, quote, { size: 8, weight: 700, fill: '#ffb21a', anchor: 'middle', ls: 0.3 }));
  ride.push(...boards.map((b) => b.front), terminus.front);

  // Route map along the bottom: the whole year at a glance, with a marker for what's in view
  const sx0 = 36;
  const sx1 = W - 70;
  const slot = (sx1 - sx0) / weeks.length;
  const sx = (i) => sx0 + (i + 0.5) * slot;
  const route = [
    `<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="${p.ground}"/>`,
    `<line x1="${sx0}" y1="${LINE_Y}" x2="${W - 44}" y2="${LINE_Y}" stroke="${LINES.purple}" stroke-width="3" stroke-linecap="round"/>`,
    ...weeks.map((_, i) => `<rect x="${n(sx(i) - 2.6)}" y="${LINE_Y - 2.6}" width="5.2" height="5.2" rx="1" fill="${weekTotals[i] ? p.win[lightLevel(weekTotals[i], maxWeek)] : p.tickOff}"/>`),
  ];
  // Station names go on the first of two rows below the line where they don't overlap
  const rows = [[], []];
  const rowFor = (x0, x1) => rows.findIndex((row) => row.every(([a, b]) => x1 < a - 8 || x0 > b + 8));
  const end = W - 44;
  route.push(`<path d="M${end},${LINE_Y - 5.5} a5.5,5.5 0 0 0 0,11 z" fill="${LINES.purple}"/><path d="M${end},${LINE_Y - 5.5} a5.5,5.5 0 0 1 0,11 z" fill="${LINES.green}"/>`);
  route.push(`<circle cx="${end}" cy="${LINE_Y}" r="5.5" fill="none" stroke="${p.text}" stroke-width="1.2"/>`);
  const endLabel = 'COMMIT STREET';
  rows[0].push([W - 24 - width(endLabel, 7.5, 0.6), W - 24]);
  route.push(text(W - 24, LINE_Y + 16, endLabel, { size: 7.5, weight: 700, fill: p.text, anchor: 'end', ls: 0.6 }));
  for (const s of stations) {
    route.push(`<circle cx="${n(sx(s.i))}" cy="${LINE_Y}" r="3.4" fill="#ffffff" stroke="${LINES.purple}" stroke-width="1.8"/>`);
    const name = truncate(s.name, 14);
    const half = width(name, 7.5) / 2;
    const row = rowFor(sx(s.i) - half, sx(s.i) + half);
    if (row >= 0) {
      rows[row].push([sx(s.i) - half, sx(s.i) + half]);
      route.push(text(sx(s.i), LINE_Y + 16 + row * 11, name, { size: 7.5, fill: p.muted, anchor: 'middle' }));
    }
  }
  // Which week sits in the middle of the view at a given ride offset
  const markerAt = (offset) => {
    const week = Math.min(last, Math.max(0, (W / 2 - offset - START) / PITCH - 0.5));
    return n(sx0 + (week + 0.5) * slot);
  };
  const [mFrom, mRest] = [markerAt(0), markerAt(-travel)];
  route.push(`<path class="marker" d="M-4,${LINE_Y - 11} h8 l-4,5 z" fill="${p.text}"/>`);

  // Header over the sky
  const total = weekTotals.reduce((sum, t) => sum + t, 0);
  const pillX = 24 + width('COMMIT METRO', 13) + 10;
  const header = [
    `<rect width="${W}" height="54" fill="${p.skyTop}" opacity=".55"/>`,
    text(24, 28, 'COMMIT METRO', { size: 13, weight: 700, fill: p.text }),
    `<rect x="${n(pillX)}" y="16" width="${n(width('PURPLE LINE', 9, 0.8) + 16)}" height="16" rx="8" fill="${LINES.purple}"/>`,
    text(pillX + 8, 27.3, 'PURPLE LINE', { size: 9, weight: 700, fill: '#ffffff', ls: 0.8 }),
    text(W - 24, 28, `${total} CONTRIBUTIONS · ${weeks.length} WEEKS`, { size: 10, weight: 700, fill: p.muted, anchor: 'end', ls: 1 }),
    text(24, 45, 'Each train is a week, each coach a day. Lit windows are commits.', { size: 9, fill: p.muted }),
  ];
  const sq = W - 24 - width('MANY', 7, 0.6) - 6 - 42;
  for (let lvl = 0; lvl < 5; lvl++) header.push(`<rect x="${sq + lvl * 9}" y="38.5" width="6" height="7" rx="1" fill="${p.win[lvl]}"/>`);
  header.push(text(sq - 5, 45, 'NONE', { size: 7, fill: p.muted, anchor: 'end', ls: 0.6 }));
  header.push(text(W - 24, 45, 'MANY', { size: 7, fill: p.muted, anchor: 'end', ls: 0.6 }));

  // Hold on today, fade, jump back a year, ride forward and ease into Commit Street
  const keyframes = (name, to, from) => `@keyframes ${name}{0%,12%,13.99%{transform:translateX(${to}px)}`
    + `14%{transform:translateX(${from}px);animation-timing-function:cubic-bezier(.35,0,.2,1)}100%{transform:translateX(${to}px)}}`;
  const css = [
    `.ride{transform:translateX(${-travel}px);animation:ride ${DURATION}s linear infinite}${keyframes('ride', -travel, 0)}`,
    `.city{transform:translateX(${n(-travel * PARALLAX)}px);animation:city ${DURATION}s linear infinite}${keyframes('city', n(-travel * PARALLAX), 0)}`,
    `.marker{transform:translateX(${mRest}px);animation:marker ${DURATION}s linear infinite}${keyframes('marker', mRest, mFrom)}`,
    `.scene{animation:fade ${DURATION}s linear infinite}@keyframes fade{0%,11.5%{opacity:1}13%,15%{opacity:0}16.5%,100%{opacity:1}}`,
  ].join('');

  const body = [
    `<g clip-path="url(#frame)">`,
    ...sky,
    `<g class="scene"><g class="city">${city.join('')}</g><g class="ride">${ride.join('')}</g></g>`,
    ...route,
    ...header,
    '</g>',
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${theme.border}"/>`,
  ].join('');

  const busiest = stations.map((s) => s.name).join(', ');
  const title = `Commit Metro: my last ${weeks.length} weeks of GitHub contributions as Namma Metro trains on the purple line, one train per week and one coach per day, with lit windows for days I committed. ${total} contributions since ${fmtDate(weeks[0]?.start ?? today)}.`
    + (busiest ? ` Stations are my busiest repos: ${busiest}.` : '')
    + ` The line ends at Commit Street, where $${cfg.symbol} trades at ${rupees(v.price)}.`;
  return svg({ w: W, h: H, theme, css, defs, body, title });
}
