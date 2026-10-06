// Commit Metro: the contribution graph as a Namma Metro line. Each week is a 7-coach train and
// each coach is a day (Sunday first, like GitHub's grid); lit windows mean commits that day.
//
// The camera is still. Every loop the year's trains run in from the left, oldest first, through
// Commit Street (the interchange where the green line carries $VJK) and on out of frame, until
// this week's train pulls into the platform and stops. A repo's name rides on the train of its
// busiest week. The resting frame is also the base state, so static renderers and reduced motion
// see this week's train at the platform.

import { svg, text, width, n, truncate } from './common.js';
import { rupees, signed, arrow } from '../money.js';
import { weekStart, weekday, monthName, fmtDate } from '../time.js';

const W = 880;
const H = 324;
const COACH = 24;
const GAP = 0.6;
const HITCH = 12;
const TRAIN = 7 * COACH + 6 * GAP;
const PITCH = TRAIN + HITCH;
const DX = 6; // oblique depth: right…
const DY = 5; // …and up
const CH = 14; // coach side height
const NOSE = 6; // how far the driver cab's nose slopes down
const NOSE_EXT = 4; // how far the nose sticks out past the coach
const RAIL = 226; // y where the near (purple) track's coaches sit
const FAR = { dx: 16, dy: 13 }; // offset of the far (green) track
const DECK = 9; // viaduct front face height
const GROUND = 266;
const STOP = 196; // x of this week's train when it stops at Commit Street
const STATION = { x0: 172, x1: 520 }; // Commit Street canopy
const DURATION = 70; // seconds per loop
const LINE_Y = 290; // route map along the bottom

export const LINES = { purple: '#8b3fa4', green: '#2f9e4f' };

const PALETTES = {
  dark: {
    skyTop: '#060a13', skyBottom: '#162133', star: '#d6deea', moon: '#f3ead0',
    city: '#1b2536', cityLit: '#f0c75e', cityLitP: 0.09,
    deckTop: '#4a5464', deck: '#3b4453', deckEdge: '#5d6878', pillar: '#2d3542', pillarSide: '#232a35',
    ground: '#0a0f17', rail: '#6c7787',
    body: '#a9b2bd', roof: '#c9d0d8', end: '#7f8996', nose: '#b9c1ca', glass: '#16202c',
    win: ['#1c2532', '#6b5823', '#a8852d', '#e0b33d', '#ffe37b'],
    canopy: '#566173', canopyTop: '#6c7889', post: '#465062',
    text: '#e6edf3', muted: '#8d99a6', tickOff: '#263142',
  },
  light: {
    skyTop: '#b9d3ea', skyBottom: '#eef4f9', star: null, moon: null,
    city: '#c4d1de', cityLit: '#f3cf72', cityLitP: 0.03,
    deckTop: '#c9d1da', deck: '#b5bec8', deckEdge: '#d9dfe6', pillar: '#a5afba', pillarSide: '#8f9aa6',
    ground: '#dde4ea', rail: '#8a95a2',
    body: '#e8ecf0', roof: '#f8fafb', end: '#c3cad2', nose: '#e2e7ec', glass: '#2b3644',
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

const pts = (...xy) => xy.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

/**
 * One coach, origin at the bottom-left of its side face, standing on the rail.
 * `cab` puts a driver's cab (sloped windscreen and a lamp) on the 'left' or 'right' end.
 */
function coach(id, { windowFill, stripe, cab = null, lamp = null }, p) {
  const top = -CH;
  const roofTop = -CH - DY;
  const slope = top + NOSE; // where the sloping nose meets the cab front
  const win = (x) => `<rect x="${x}" y="${top + 2.4}" width="5.4" height="5.4" rx=".7" fill="${windowFill}"/>`;
  const parts = [];
  if (cab === 'right') {
    // Driver's cab leading to the right: the roof slopes down into a short nose with the headlamp
    const nose = COACH + NOSE_EXT;
    parts.push(`<polygon points="${pts([0, top], [COACH - 1, top], [COACH - 1 + DX, roofTop], [DX, roofTop])}" fill="${p.roof}"/>`);
    parts.push(`<polygon points="${pts([COACH - 1, top], [nose, slope], [nose + DX, slope - DY], [COACH - 1 + DX, roofTop])}" fill="${p.nose}"/>`);
    parts.push(`<polygon points="${pts([nose, slope], [nose, 0], [nose + DX, -DY], [nose + DX, slope - DY])}" fill="${p.end}"/>`);
    parts.push(`<polygon points="${pts([nose, -4.2], [nose, -2.2], [nose + DX, -2.2 - DY], [nose + DX, -4.2 - DY])}" fill="${stripe}"/>`);
    parts.push(`<polygon points="${pts([0, 0], [nose, 0], [nose, slope], [COACH - 1, top], [0, top])}" fill="${p.body}"/>`);
    parts.push(`<polygon points="${pts([COACH - 4.5, top + 2.2], [COACH - 0.6, top + 2.2], [nose - 0.8, slope - 0.4], [nose - 0.8, top + 8.2], [COACH - 4.5, top + 8.2])}" fill="${p.glass}"/>`);
    parts.push(win(2.4), win(9.3));
    parts.push(`<rect y="-4.2" width="${nose}" height="2" fill="${stripe}"/>`);
    if (lamp) parts.push(`<circle cx="${n(nose + DX / 2)}" cy="${n(-6 - DY / 2)}" r="1.5" fill="${lamp}"/>`);
  } else if (cab === 'left') {
    // The same cab facing left
    const nose = -NOSE_EXT;
    parts.push(`<polygon points="${pts([nose, slope], [1, top], [1 + DX, roofTop], [nose + DX, slope - DY])}" fill="${p.nose}"/>`);
    parts.push(`<polygon points="${pts([1, top], [COACH, top], [COACH + DX, roofTop], [1 + DX, roofTop])}" fill="${p.roof}"/>`);
    parts.push(`<polygon points="${pts([COACH, 0], [COACH, top], [COACH + DX, roofTop], [COACH + DX, -DY])}" fill="${p.end}"/>`);
    parts.push(`<polygon points="${pts([nose, 0], [COACH, 0], [COACH, top], [1, top], [nose, slope])}" fill="${p.body}"/>`);
    parts.push(`<polygon points="${pts([4.5, top + 2.2], [0.6, top + 2.2], [nose + 0.8, slope - 0.4], [nose + 0.8, top + 8.2], [4.5, top + 8.2])}" fill="${p.glass}"/>`);
    parts.push(win(9.3), win(16.2));
    parts.push(`<rect x="${nose}" y="-4.2" width="${COACH - nose}" height="2" fill="${stripe}"/>`);
    if (lamp) parts.push(`<circle cx="${n(nose + 1.3)}" cy="-6" r="1.3" fill="${lamp}"/>`);
  } else {
    parts.push(`<polygon points="${pts([0, top], [COACH, top], [COACH + DX, roofTop], [DX, roofTop])}" fill="${p.roof}"/>`);
    parts.push(`<polygon points="${pts([COACH, 0], [COACH, top], [COACH + DX, roofTop], [COACH + DX, -DY])}" fill="${p.end}"/>`);
    parts.push(`<rect y="${top}" width="${COACH}" height="${CH}" fill="${p.body}"/>`);
    parts.push(win(2.4), win(9.3), win(16.2));
    parts.push(`<rect y="-4.2" width="${COACH}" height="2" fill="${stripe}"/>`);
  }
  return `<g id="${id}">${parts.join('')}</g>`;
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
  const stations = (stats.stations ?? [])
    .map((s) => ({ ...s, i: weeks.findIndex((w) => w.start === s.week) }))
    .filter((s) => s.i >= 0);
  const rand = seeded(cfg.login);

  // The convoy runs oldest-first, so in its own coordinates the newest train sits at 0 and older
  // ones queue up ahead of it to the right.
  const trainX = (i) => (last - i) * PITCH;
  const coachX = (i, dow) => trainX(i) + dow * (COACH + GAP);
  const runEnd = STOP; // newest train at the platform
  const runStart = 40 - trainX(0) - TRAIN; // oldest train just nosing into frame

  const purple = { stripe: LINES.purple };
  const green = { windowFill: p.win[3], stripe: LINES.green };
  const defs = [
    `<linearGradient id="sky" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBottom}"/></linearGradient>`,
    `<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>`,
    ...p.win.flatMap((fill, lvl) => [
      coach(`c${lvl}`, { ...purple, windowFill: fill }, p),
      coach(`h${lvl}`, { ...purple, windowFill: fill, cab: 'right', lamp: '#fff3b0' }, p),
      coach(`t${lvl}`, { ...purple, windowFill: fill, cab: 'left', lamp: '#ff5a5a' }, p),
    ]),
    coach('gl', { ...green, cab: 'left', lamp: '#fff3b0' }, p),
    coach('gm', green, p),
    coach('gr', { ...green, cab: 'right', lamp: '#ff5a5a' }, p),
    `<pattern id="pillars" patternUnits="userSpaceOnUse" width="72" height="${GROUND - RAIL}" y="${RAIL}">`
      + `<polygon points="24,${DECK} 52,${DECK} 45,${DECK + 7} 31,${DECK + 7}" fill="${p.pillar}"/>`
      + `<rect x="33" y="${DECK + 7}" width="10" height="${GROUND - RAIL - DECK - 7}" fill="${p.pillar}"/>`
      + `<polygon points="43,${DECK + 7} 46,${DECK + 4} 46,${GROUND - RAIL - 3} 43,${GROUND - RAIL}" fill="${p.pillarSide}"/>`
      + '</pattern>',
  ].join('');

  // Sky, moon, then the skyline in front of it, all still
  const scenery = [`<rect width="${W}" height="${GROUND}" fill="url(#sky)"/>`];
  const moon = { x: 742, y: 116 };
  if (p.star) {
    for (let i = 0; i < 46; i++) {
      scenery.push(`<circle cx="${n(rand() * W)}" cy="${n(58 + rand() * 90)}" r="${n(0.4 + rand() * 0.8)}" fill="${p.star}" opacity="${n(0.3 + rand() * 0.6)}"/>`);
    }
    scenery.push(`<circle cx="${moon.x}" cy="${moon.y}" r="28" fill="${p.moon}" opacity=".06"/><circle cx="${moon.x}" cy="${moon.y}" r="11" fill="${p.moon}" opacity=".92"/>`);
  }
  const building = (x, w, h) => {
    scenery.push(`<rect x="${n(x)}" y="${n(GROUND - h)}" width="${n(w)}" height="${n(h)}" fill="${p.city}" opacity="${n(0.75 + rand() * 0.25)}"/>`);
    for (let wy = GROUND - h + 6; wy < GROUND - 12; wy += 7) {
      for (let wx = x + 4; wx < x + w - 4; wx += 6) {
        if (rand() < p.cityLitP) scenery.push(`<rect x="${n(wx)}" y="${n(wy)}" width="2" height="2.6" fill="${p.cityLit}" opacity=".75"/>`);
      }
    }
  };
  for (let x = -10; x < W + 10; ) {
    const w = 22 + rand() * 38;
    building(x, w, 50 + rand() ** 1.6 * 120);
    x += w + 3 + rand() * 10;
  }
  building(moon.x + 2, 40, GROUND - moon.y - 4); // a tower in front of the moon, so it sits behind the city

  // Double-track viaduct: far track for the green line, near track for the purple line
  const backEdge = RAIL - FAR.dy - DY - 3;
  scenery.push(
    `<rect y="${RAIL}" width="${W}" height="${GROUND - RAIL}" fill="url(#pillars)"/>`,
    `<polygon points="${pts([0, RAIL], [W, RAIL], [W, backEdge], [0, backEdge])}" fill="${p.deckTop}"/>`,
    ...[RAIL - 1, RAIL - DY + 1, RAIL - FAR.dy - 1, RAIL - FAR.dy - DY + 1].map((y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${p.rail}" stroke-width=".8"/>`),
    `<rect y="${RAIL}" width="${W}" height="${DECK}" fill="${p.deck}"/>`,
    `<rect y="${RAIL}" width="${W}" height="1.2" fill="${p.deckEdge}"/>`,
  );

  // Commit Street: canopy over both tracks, the green line train waiting on the far track
  const canopyBottom = RAIL - FAR.dy - CH - DY - 18;
  const depth = FAR.dx + DX;
  const rise = FAR.dy + DY + 2;
  scenery.push(...[STATION.x0 + 3, STATION.x1 - 6].map((x) => `<rect x="${x}" y="${canopyBottom}" width="2.4" height="${RAIL - DY - canopyBottom}" fill="${p.post}"/>`));
  const greenX = STATION.x1 - 3 * (COACH + GAP) - 54 + FAR.dx;
  ['gl', 'gm', 'gr'].forEach((id, k) => scenery.push(`<use href="#${id}" x="${n(greenX + k * (COACH + GAP))}" y="${RAIL - FAR.dy}"/>`));

  // The convoy: every week's train, nose to tail
  const convoy = [];
  weeks.forEach((w, i) => {
    w.days.forEach((day, k) => {
      const lvl = lightLevel(day.c, maxDay);
      const kind = k === w.days.length - 1 ? 'h' : k === 0 ? 't' : 'c';
      if (day.d === today) {
        convoy.push(`<rect class="pulse" x="${n(coachX(i, day.dow) - 2)}" y="${RAIL - CH - DY - 2}" width="${COACH + DX + 4}" height="${CH + DY + 3}" rx="2" fill="${p.win[4]}" opacity=".35"/>`);
      }
      convoy.push(`<use href="#${kind}${lvl}" x="${n(coachX(i, day.dow))}" y="${RAIL}"/>`);
    });
    const flagged = stations.some((s) => s.i === i);
    if (!flagged && (i === 0 || w.start.slice(0, 7) !== weeks[i - 1].start.slice(0, 7))) {
      convoy.push(text(coachX(i, w.days[0].dow) + NOSE, RAIL - CH - DY - 4, monthName(w.start).toUpperCase(), { size: 7, weight: 700, fill: p.muted, ls: 1 }));
    }
  });
  for (const s of stations) {
    const name = truncate(s.name, 16);
    const flagW = width(name, 7.5, 0.3) + 10;
    const head = coachX(s.i, weeks[s.i].days.at(-1).dow) + COACH;
    const fx = head - flagW - 2;
    const fy = RAIL - CH - DY - 16;
    convoy.push(`<line x1="${n(fx + flagW - 5)}" y1="${fy + 11}" x2="${n(fx + flagW - 5)}" y2="${RAIL - CH - DY + 1}" stroke="${p.post}"/>`);
    convoy.push(`<rect x="${n(fx)}" y="${fy}" width="${n(flagW)}" height="11" rx="2" fill="${LINES.purple}"/>`);
    convoy.push(text(fx + flagW / 2, fy + 8, name, { size: 7.5, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 0.3 }));
  }

  // Canopy front, interchange sign and LED price board go over the trains
  const signText = 'COMMIT STREET';
  const signW = width(signText, 9.5, 0.6) + 22;
  const signX = (STATION.x0 + STATION.x1) / 2 - signW / 2 + depth / 2;
  const signY = canopyBottom - rise - 17;
  const quote = `$${cfg.symbol} ${rupees(v.price)} ${arrow(v.changePct)} ${signed(v.changePct)}%`;
  const ledW = width(quote, 8, 0.3) + 14;
  const ledX = STATION.x1 - ledW - 14;
  const ledY = canopyBottom + 5;
  const front = [
    `<polygon points="${pts([STATION.x0, canopyBottom], [STATION.x1, canopyBottom], [STATION.x1 + depth, canopyBottom - rise], [STATION.x0 + depth, canopyBottom - rise])}" fill="${p.canopyTop}"/>`,
    `<rect x="${STATION.x0}" y="${canopyBottom}" width="${STATION.x1 - STATION.x0}" height="3" fill="${p.canopy}"/>`,
    `<rect x="${n(signX)}" y="${signY}" width="${n(signW / 2)}" height="14" fill="${LINES.purple}"/>`,
    `<rect x="${n(signX + signW / 2)}" y="${signY}" width="${n(signW / 2)}" height="14" fill="${LINES.green}"/>`,
    text(signX + signW / 2, signY + 10.2, signText, { size: 9.5, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 0.6 }),
    ...[ledX + 8, ledX + ledW - 8].map((x) => `<line x1="${n(x)}" y1="${canopyBottom + 3}" x2="${n(x)}" y2="${ledY}" stroke="${p.post}"/>`),
    `<rect x="${n(ledX)}" y="${ledY}" width="${n(ledW)}" height="12" rx="1.5" fill="#0b0b0c" stroke="#30343a"/>`,
    text(ledX + ledW / 2, ledY + 8.6, quote, { size: 8, weight: 700, fill: '#ffb21a', anchor: 'middle', ls: 0.3 }),
  ];

  // Route map along the bottom: the whole year at a glance, with a marker for the train in view
  const sx0 = 36;
  const sx1 = W - 70;
  const slot = (sx1 - sx0) / weeks.length;
  const sx = (i) => sx0 + (i + 0.5) * slot;
  const end = W - 44;
  const route = [
    `<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="${p.ground}"/>`,
    `<line x1="${sx0}" y1="${LINE_Y}" x2="${end}" y2="${LINE_Y}" stroke="${LINES.purple}" stroke-width="3" stroke-linecap="round"/>`,
    ...weeks.map((_, i) => `<rect x="${n(sx(i) - 2.6)}" y="${LINE_Y - 2.6}" width="5.2" height="5.2" rx="1" fill="${weekTotals[i] ? p.win[lightLevel(weekTotals[i], maxWeek)] : p.tickOff}"/>`),
    `<path d="M${end},${LINE_Y - 5.5} a5.5,5.5 0 0 0 0,11 z" fill="${LINES.purple}"/><path d="M${end},${LINE_Y - 5.5} a5.5,5.5 0 0 1 0,11 z" fill="${LINES.green}"/>`,
    `<circle cx="${end}" cy="${LINE_Y}" r="5.5" fill="none" stroke="${p.text}" stroke-width="1.2"/>`,
    text(W - 24, LINE_Y + 16, signText, { size: 7.5, weight: 700, fill: p.text, anchor: 'end', ls: 0.6 }),
  ];
  // Station names take the first of two rows below the line where they don't overlap
  const rows = [[[W - 24 - width(signText, 7.5, 0.6), W - 24]], []];
  const rowFor = (x0, x1) => rows.findIndex((row) => row.every(([a, b]) => x1 < a - 8 || x0 > b + 8));
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
  // Which week is passing the middle of the frame for a given convoy offset
  const markerAt = (offset) => {
    const week = Math.min(last, Math.max(0, last - (W / 2 - offset - TRAIN / 2) / PITCH));
    return n(sx(week));
  };
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

  // Stand at the platform, fade out, reset a year back, then run in and brake into Commit Street
  const keyframes = (name, rest, from) => `@keyframes ${name}{0%,12%,13.99%{transform:translateX(${rest}px)}`
    + `14%{transform:translateX(${from}px);animation-timing-function:cubic-bezier(.25,.1,.2,1)}100%{transform:translateX(${rest}px)}}`;
  const [mFrom, mRest] = [markerAt(runStart), markerAt(runEnd)];
  const css = [
    `.convoy{transform:translateX(${runEnd}px);animation:run ${DURATION}s linear infinite}${keyframes('run', runEnd, n(runStart))}`,
    `.marker{transform:translateX(${mRest}px);animation:marker ${DURATION}s linear infinite}${keyframes('marker', mRest, mFrom)}`,
    `.fade{animation:fade ${DURATION}s linear infinite}@keyframes fade{0%,11.5%{opacity:1}13%,15%{opacity:0}16.5%,100%{opacity:1}}`,
  ].join('');

  const body = [
    `<g clip-path="url(#frame)">`,
    ...scenery,
    `<g class="fade"><g class="convoy">${convoy.join('')}</g></g>`,
    ...front,
    ...route,
    ...header,
    '</g>',
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${theme.border}"/>`,
  ].join('');

  const busiest = stations.map((s) => s.name).join(', ');
  const title = `Commit Metro: my last ${weeks.length} weeks of GitHub contributions as Namma Metro trains on the purple line, one train per week and one coach per day, with lit windows for days I committed. ${total} contributions since ${fmtDate(weeks[0]?.start ?? today)}.`
    + (busiest ? ` My busiest repos ride on their busiest week's train: ${busiest}.` : '')
    + ` This week's train stops at Commit Street, where $${cfg.symbol} trades at ${rupees(v.price)}.`;
  return svg({ w: W, h: H, theme, css, defs, body, title });
}
