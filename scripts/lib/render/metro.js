// Commit Metro: the contribution graph as a Namma Metro line. Each week is a 7-coach train and
// each coach is a day (Sunday first, like GitHub's grid); lit windows mean commits that day.
// Stations are my busiest repos, and the line ends at Commit Street, the interchange where the
// green line carries $VJK.
//
// Both the camera and the trains move. The line is stretched longer than the convoy, so the
// camera overtakes the trains while they run forward along the viaduct. Each station is built
// exactly where its week's train will be when the camera reaches it: the convoy brakes into the
// station, the camera zooms in, then it pulls away and the camera zooms out at speed. The
// journey ends with this week's train in focus next to Commit Street, which is also the resting
// frame that static renderers and reduced motion see.

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
const BELOW = 360; // pillars and buildings run past the frame so zooming out never shows their feet
const STRETCH = 1.7; // world length / convoy length: how much faster the camera moves than the trains
const ANCHOR = 352; // x in the frame where the train in focus sits (and the zoom pivot)
const PIVOT_Y = RAIL - CH;
const PARALLAX = 0.3;
const ZOOM = { rest: 1.18, stop: 1.24, fastest: 0.78 };
const DURATION = 96; // seconds per loop
const HOLD = 8; // % of the loop spent resting on today before the journey
const START = 11.5; // % where the journey begins (after the fade)
const DWELL = 1.8; // % of the loop each station stop lasts
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

// Accelerate out of a stop, then brake into the next one. The two curves meet at the same slope,
// so the speed is continuous at the midpoint, which is also where the camera is zoomed out most.
const EASE = { pullAway: 'cubic-bezier(.5,0,.9,.5)', brake: 'cubic-bezier(.1,.5,.5,1)', still: 'linear' };

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
 * `cab` puts a driver's cab (sloping nose, driver's window, lamp) on the 'left' or 'right' end.
 */
function coach(id, { windowFill, stripe, cab = null, lamp = null }, p) {
  const top = -CH;
  const roofTop = -CH - DY;
  const slope = top + NOSE; // where the sloping nose meets the cab front
  const win = (x) => `<rect x="${x}" y="${top + 2.4}" width="5.4" height="5.4" rx=".7" fill="${windowFill}"/>`;
  const parts = [];
  if (cab === 'right') {
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

/** A station canopy over the near track from x0 to x1, with its name board on top. */
function station(x0, x1, name, p) {
  const bottom = RAIL - CH - DY - 14;
  const signW = width(name, 8.5, 0.4) + 16;
  const cx = (x0 + x1) / 2;
  return {
    back: [x0 + 3, x1 - 6].map((x) => `<rect x="${n(x)}" y="${bottom}" width="2.4" height="${RAIL - DY - bottom}" fill="${p.post}"/>`).join(''),
    front: `<polygon points="${pts([x0, bottom], [x1, bottom], [x1 + DX, bottom - DY], [x0 + DX, bottom - DY])}" fill="${p.canopyTop}"/>`
      + `<rect x="${n(x0)}" y="${bottom}" width="${n(x1 - x0)}" height="3" fill="${p.canopy}"/>`
      + `<rect x="${n(cx - signW / 2)}" y="${bottom - DY - 17}" width="${n(signW)}" height="13" fill="${LINES.purple}"/>`
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
  const rand = seeded(cfg.login);

  // Repos grouped by the week they're busiest in (two repos can share a station)
  const byWeek = new Map();
  for (const s of stats.stations ?? []) {
    const i = weeks.findIndex((w) => w.start === s.week);
    if (i >= 0) byWeek.set(i, [...(byWeek.get(i) ?? []), s.name]);
  }
  const stations = [...byWeek].sort((a, b) => a[0] - b[0]).map(([i, names]) => ({ i, name: truncate(names.join(' · '), 24) }));

  // Coordinates. The convoy has the oldest train at 0 and runs to the right with this week's train
  // at the front. `world(u)` is where the camera looks when week u is in focus; since it grows
  // STRETCH times faster than the convoy, the camera overtakes the trains as they run.
  const coachX = (i, dow) => i * PITCH + dow * (COACH + GAP);
  const centre = (u) => u * PITCH + TRAIN / 2;
  const world = (u) => STRETCH * centre(u) + W;
  const runAt = (u) => world(u) - centre(u); // convoy offset along the world
  const panAt = (u) => ANCHOR - world(u); // world offset in the frame
  const xEnd = world(last) + 2 * W;

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
    `<pattern id="pillars" patternUnits="userSpaceOnUse" width="72" height="${BELOW - RAIL}" y="${RAIL}">`
      + `<polygon points="24,${DECK} 52,${DECK} 45,${DECK + 7} 31,${DECK + 7}" fill="${p.pillar}"/>`
      + `<rect x="33" y="${DECK + 7}" width="10" height="${BELOW - RAIL - DECK - 7}" fill="${p.pillar}"/>`
      + `<polygon points="43,${DECK + 7} 46,${DECK + 4} 46,${BELOW - RAIL} 43,${BELOW - RAIL}" fill="${p.pillarSide}"/>`
      + '</pattern>',
  ].join('');

  // Sky, stars and moon stay put; the skyline drifts past in front of the moon
  const sky = [`<rect width="${W}" height="${GROUND}" fill="url(#sky)"/>`];
  if (p.star) {
    for (let i = 0; i < 46; i++) {
      sky.push(`<circle cx="${n(rand() * W)}" cy="${n(58 + rand() * 90)}" r="${n(0.4 + rand() * 0.8)}" fill="${p.star}" opacity="${n(0.3 + rand() * 0.6)}"/>`);
    }
    sky.push('<circle cx="742" cy="118" r="28" fill="' + p.moon + '" opacity=".06"/><circle cx="742" cy="118" r="11" fill="' + p.moon + '" opacity=".92"/>');
  }
  const city = [];
  const cityEnd = (world(last) - ANCHOR) * PARALLAX + W + 400;
  for (let x = -300; x < cityEnd; ) {
    const w = 22 + rand() * 38;
    const h = 50 + rand() ** 1.6 * 130;
    city.push(`<rect x="${n(x)}" y="${n(GROUND - h)}" width="${n(w)}" height="${n(h + BELOW - GROUND)}" fill="${p.city}" opacity="${n(0.75 + rand() * 0.25)}"/>`);
    for (let wy = GROUND - h + 6; wy < GROUND - 12; wy += 7) {
      for (let wx = x + 4; wx < x + w - 4; wx += 6) {
        if (rand() < p.cityLitP) city.push(`<rect x="${n(wx)}" y="${n(wy)}" width="2" height="2.6" fill="${p.cityLit}" opacity=".75"/>`);
      }
    }
    x += w + 3 + rand() * 10;
  }

  // The line: a double-track viaduct, far track for the green line, near track for the purple line
  const backEdge = RAIL - FAR.dy - DY - 3;
  const line = [
    `<rect y="${RAIL}" width="${n(xEnd)}" height="${BELOW - RAIL}" fill="url(#pillars)"/>`,
    `<polygon points="${pts([0, RAIL], [xEnd, RAIL], [xEnd, backEdge], [0, backEdge])}" fill="${p.deckTop}"/>`,
    ...[RAIL - 1, RAIL - DY + 1, RAIL - FAR.dy - 1, RAIL - FAR.dy - DY + 1].map((y) => `<line x1="0" y1="${y}" x2="${n(xEnd)}" y2="${y}" stroke="${p.rail}" stroke-width=".8"/>`),
    `<rect y="${RAIL}" width="${n(xEnd)}" height="${DECK}" fill="${p.deck}"/>`,
    `<rect y="${RAIL}" width="${n(xEnd)}" height="1.2" fill="${p.deckEdge}"/>`,
  ];

  // Repo stations, each where its week's train will be when the camera arrives
  const boards = stations.map((s) => station(world(s.i) - TRAIN / 2 - 12, world(s.i) + TRAIN / 2 + 14, s.name, p));
  line.push(...boards.map((b) => b.back));

  // Commit Street, just past this week's train: a canopy over both tracks and the green line train
  const cs = { x0: world(last) + TRAIN / 2 + 40, x1: world(last) + TRAIN / 2 + 330 };
  const canopyBottom = RAIL - FAR.dy - CH - DY - 18;
  const depth = FAR.dx + DX;
  const rise = FAR.dy + DY + 2;
  line.push(...[cs.x0 + 3, cs.x1 - 6].map((x) => `<rect x="${n(x)}" y="${canopyBottom}" width="2.4" height="${RAIL - DY - canopyBottom}" fill="${p.post}"/>`));
  const greenX = cs.x1 - 3 * (COACH + GAP) - 60 + FAR.dx;
  ['gl', 'gm', 'gr'].forEach((id, k) => line.push(`<use href="#${id}" x="${n(greenX + k * (COACH + GAP))}" y="${RAIL - FAR.dy}"/>`));

  // The convoy: every week's train, nose to tail
  const convoy = [];
  weeks.forEach((w, i) => {
    w.days.forEach((day, k) => {
      const kind = k === w.days.length - 1 ? 'h' : k === 0 ? 't' : 'c';
      if (day.d === today) {
        convoy.push(`<rect class="pulse" x="${n(coachX(i, day.dow) - 2)}" y="${RAIL - CH - DY - 2}" width="${COACH + DX + 4}" height="${CH + DY + 3}" rx="2" fill="${p.win[4]}" opacity=".35"/>`);
      }
      convoy.push(`<use href="#${kind}${lightLevel(day.c, maxDay)}" x="${n(coachX(i, day.dow))}" y="${RAIL}"/>`);
    });
    if (i === 0 || w.start.slice(0, 7) !== weeks[i - 1].start.slice(0, 7)) {
      convoy.push(text(coachX(i, w.days[0].dow) + NOSE, RAIL - CH - DY - 4, monthName(w.start).toUpperCase(), { size: 7, weight: 700, fill: p.muted, ls: 1 }));
    }
  });

  // Canopies, signs and the LED price board go over the trains
  const signText = 'COMMIT STREET';
  const signW = width(signText, 9.5, 0.6) + 22;
  const signX = (cs.x0 + cs.x1) / 2 - signW / 2 + depth / 2;
  const signY = canopyBottom - rise - 17;
  const quote = `$${cfg.symbol} ${rupees(v.price)} ${arrow(v.changePct)} ${signed(v.changePct)}%`;
  const ledW = width(quote, 8, 0.3) + 14;
  const ledX = cs.x1 - ledW - 14;
  const ledY = canopyBottom + 5;
  const over = [
    ...boards.map((b) => b.front),
    `<polygon points="${pts([cs.x0, canopyBottom], [cs.x1, canopyBottom], [cs.x1 + depth, canopyBottom - rise], [cs.x0 + depth, canopyBottom - rise])}" fill="${p.canopyTop}"/>`,
    `<rect x="${n(cs.x0)}" y="${canopyBottom}" width="${n(cs.x1 - cs.x0)}" height="3" fill="${p.canopy}"/>`,
    `<rect x="${n(signX)}" y="${signY}" width="${n(signW / 2)}" height="14" fill="${LINES.purple}"/>`,
    `<rect x="${n(signX + signW / 2)}" y="${signY}" width="${n(signW / 2)}" height="14" fill="${LINES.green}"/>`,
    text(signX + signW / 2, signY + 10.2, signText, { size: 9.5, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 0.6 }),
    ...[ledX + 8, ledX + ledW - 8].map((x) => `<line x1="${n(x)}" y1="${canopyBottom + 3}" x2="${n(x)}" y2="${ledY}" stroke="${p.post}"/>`),
    `<rect x="${n(ledX)}" y="${ledY}" width="${n(ledW)}" height="12" rx="1.5" fill="#0b0b0c" stroke="#30343a"/>`,
    text(ledX + ledW / 2, ledY + 8.6, quote, { size: 8, weight: 700, fill: '#ffb21a', anchor: 'middle', ls: 0.3 }),
  ];

  // Route map along the bottom: the whole year at a glance, with a marker for the week in focus
  const sx0 = 36;
  const slot = (W - 70 - sx0) / weeks.length;
  const sx = (u) => sx0 + (u + 0.5) * slot;
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

  // The journey as keyframes: rest on today, fade, start a year back, then for each station pull
  // away (zooming out with speed), brake in (zooming back in) and dwell, ending on today again.
  const frames = [];
  const add = (pct, u, zoom, ease = EASE.still) => frames.push({ pct, u, zoom, ease });
  add(0, last, ZOOM.rest);
  add(HOLD, last, ZOOM.rest);
  add(9.59, last, ZOOM.rest);
  add(9.6, 0, ZOOM.stop);
  add(START, 0, ZOOM.stop, EASE.pullAway);
  const stops = [...new Set([...stations.map((s) => s.i).filter((i) => i > 0 && i < last), last])].sort((a, b) => a - b);
  const hops = stops.map((to, k) => [k ? stops[k - 1] : 0, to]);
  const weights = hops.map(([from, to]) => Math.max(to - from, 1.5) ** 0.75);
  const unit = (100 - START - DWELL * (stops.length - 1)) / weights.reduce((sum, w) => sum + w, 0);
  let t = START;
  hops.forEach(([from, to], k) => {
    const span = weights[k] * unit;
    add(t + span / 2, (from + to) / 2, Math.max(ZOOM.fastest, 1 - 0.045 * (to - from)), EASE.brake);
    t += span;
    if (k === hops.length - 1) {
      add(100, to, ZOOM.rest);
    } else {
      add(t, to, ZOOM.stop);
      t += DWELL;
      add(t, to, ZOOM.stop, EASE.pullAway);
    }
  });
  const keyframes = (name, value) => `@keyframes ${name}{${frames.map((f) => `${f.pct.toFixed(3)}%{transform:${value(f)};animation-timing-function:${f.ease}}`).join('')}}`;
  const animate = (cls, value) => {
    const rest = value({ u: last, zoom: ZOOM.rest });
    return `.${cls}{transform:${rest};animation:${cls} ${DURATION}s infinite}${keyframes(cls, value)}`;
  };
  const css = [
    `.zoom{transform-origin:${ANCHOR}px ${PIVOT_Y}px}`,
    animate('zoom', (f) => `scale(${f.zoom})`),
    animate('pan', (f) => `translateX(${n(panAt(f.u))}px)`),
    animate('run', (f) => `translateX(${n(runAt(f.u))}px)`),
    animate('city', (f) => `translateX(${n(panAt(f.u) * PARALLAX)}px)`),
    animate('marker', (f) => `translateX(${n(sx(f.u))}px)`),
    `.fade{animation:fade ${DURATION}s linear infinite}@keyframes fade{0%,${HOLD}%{opacity:1}9.4%,9.8%{opacity:0}${START}%,100%{opacity:1}}`,
  ].join('');

  const body = [
    `<g clip-path="url(#frame)">`,
    ...sky,
    `<g class="fade"><g class="zoom">`,
    `<g class="city">${city.join('')}</g>`,
    `<g class="pan">${line.join('')}<g class="run">${convoy.join('')}</g>${over.join('')}</g>`,
    '</g></g>',
    ...route,
    ...header,
    '</g>',
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${theme.border}"/>`,
  ].join('');

  const repos = stations.map((s) => s.name).join(', ');
  const title = `Commit Metro: my last ${weeks.length} weeks of GitHub contributions as Namma Metro trains on the purple line, one train per week and one coach per day, with lit windows for days I committed. ${total} contributions since ${fmtDate(weeks[0]?.start ?? today)}.`
    + (repos ? ` The trains stop at a station for each of my busiest repos: ${repos}.` : '')
    + ` This week's train ends next to Commit Street, where $${cfg.symbol} trades at ${rupees(v.price)}.`;
  return svg({ w: W, h: H, theme, css, defs, body, title });
}
