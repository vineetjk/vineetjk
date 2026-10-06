// Commit Metro: the contribution graph as one long Namma Metro train. Each coach is a week and
// its seven windows are the days (Sunday first), so the train is GitHub's grid turned on its
// side: the oldest week rides at the tail and this week right behind the driver's cab. My busiest
// repos hang on sign gantries over the line, and the line ends at Commit Street, the interchange
// where the green line carries $VJK.
//
// Both the camera and the train move. The line is stretched longer than the train, so the camera
// travels along it from tail to head while the train runs forward along the viaduct. Each gantry
// stands exactly where its week's coach will be when the camera reaches it: the train slows to a
// crawl as that coach passes under the sign and the camera zooms in, then it speeds up and the
// camera zooms out. Gantries aren't platforms, so nothing suggests the head should stop there;
// the only stop is Commit Street, where the driver's cab pulls up at the front of the platform.
// That arrival is also the resting frame that static renderers and reduced motion see.

import { svg, text, width, n, truncate } from './common.js';
import { rupees, signed, arrow } from '../money.js';
import { weekStart, weekday, monthName, fmtDate } from '../time.js';

const W = 880;
const H = 324;
const COACH = 40; // one coach per week
const GAP = 0.8;
const PITCH = COACH + GAP;
const DAY = { x0: 2.2, w: 4, step: 5.3 }; // seven day windows along each coach
const DX = 6; // oblique depth: right…
const DY = 5; // …and up
const CH = 18; // coach side height
const SNOUT = 8; // how far the bullet nose reaches past the cab coach
const SNOUT_FROM = 22; // where along the cab coach the roof starts curving down into the nose
const TAG_INSET = 2; // month tags sit this far in from the month's first coach
const BEAM = 40; // headlight beam length
const RAIL = 226; // y where the near (purple) track's coaches sit
const FAR = { dx: 16, dy: 13 }; // offset of the far (green) track
const DECK = 9; // viaduct front face height
const GROUND = 266;
const BELOW = 360; // pillars and buildings run past the frame so zooming out never shows their feet
const STRETCH = 3; // world length / train length: how much faster the camera moves than the train
const ANCHOR = 352; // x in the frame where the train in focus sits (and the zoom pivot)
const PIVOT_Y = RAIL - CH;
const PARALLAX = 0.3;
const ZOOM = { rest: 1.18, start: 1.24, pass: 1.1, fastest: 0.78 };
const DURATION = 90; // seconds per loop
const HOLD = 8; // % of the loop spent resting on today before the journey
const START = 11.5; // % where the journey begins (after the fade)
const PASS = 2.2; // % of the loop each slower pass under a repo gantry lasts
const SLOW = 0.45; // speed under a gantry, as a share of the cruising average
const PEAK = 1.6; // top speed between gantries, as a share of the cruising average
const LINE_Y = 290; // route map along the bottom

export const LINES = { purple: '#8b3fa4', green: '#2f9e4f' };

const PALETTES = {
  dark: {
    skyTop: '#060a13', skyBottom: '#162133', star: '#d6deea', moon: '#f3ead0',
    city: '#1b2536', cityLit: '#f0c75e', cityLitP: 0.09,
    deckTop: '#4a5464', deck: '#3b4453', deckEdge: '#5d6878', pillar: '#2d3542', pillarSide: '#232a35',
    ground: '#0a0f17', rail: '#6c7787',
    body: '#a9b2bd', roof: '#c9d0d8', end: '#7f8996', nose: '#b9c1ca', glass: '#16202c', horn: '#3d4654', beam: 0.5,
    win: ['#1c2532', '#6b5823', '#a8852d', '#e0b33d', '#ffe37b'],
    canopy: '#566173', canopyTop: '#6c7889', post: '#465062',
    text: '#e6edf3', muted: '#8d99a6', tickOff: '#263142',
  },
  light: {
    skyTop: '#b9d3ea', skyBottom: '#eef4f9', star: null, moon: null,
    city: '#c4d1de', cityLit: '#f3cf72', cityLitP: 0.03,
    deckTop: '#c9d1da', deck: '#b5bec8', deckEdge: '#d9dfe6', pillar: '#a5afba', pillarSide: '#8f9aa6',
    ground: '#dde4ea', rail: '#8a95a2',
    body: '#e8ecf0', roof: '#f8fafb', end: '#c3cad2', nose: '#e2e7ec', glass: '#2b3644', horn: '#6f7a86', beam: 0.35,
    win: ['#55657a', '#c6a04b', '#dcae3e', '#efbf31', '#ffd23f'],
    canopy: '#8e99a6', canopyTop: '#a9b3be', post: '#7d8894',
    text: '#1f2328', muted: '#5b6670', tickOff: '#c5ced8',
  },
};

// Each hop between gantries speeds up from `from` to PEAK, then slows to `to` (speeds relative to
// the hop's average). Hops share one average speed, so the curves join without a jolt.
const EASE = {
  speedUp: (from) => `cubic-bezier(.3,${n(0.3 * from)},.7,${n(1 - 0.3 * PEAK)})`,
  slowDown: (to) => `cubic-bezier(.3,${n(0.3 * PEAK)},.7,${n(1 - 0.3 * to)})`,
  steady: 'linear',
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
 * A driver's cab with a bullet-train nose on the 'left' or 'right' end: the roof flows into a
 * long convex curve that ends in a rounded snout, like a dolphin's. The same shape is mirrored
 * for either end; only the oblique depth (up and to the right) is never mirrored.
 */
function bulletCab(side, { windowFill, stripe, lamp, head = false }, p) {
  const top = -CH;
  const X = side === 'right' ? (x) => x : (x) => COACH - x;
  const at = (x, y) => [X(x), y];
  const lift = ([x, y], k = 1) => [x + DX * k, y - DY * k];
  const f = ([x, y]) => `${n(x)},${n(y)}`;
  // The nose profile: flat roof until SNOUT_FROM, then one cubic curve down to the snout tip
  const roofEnd = at(SNOUT_FROM, top);
  const c1 = at(SNOUT_FROM + 8, top);
  const c2 = at(COACH + SNOUT + 0.5, top * 0.52);
  const tip = at(COACH + SNOUT, -2.6);
  const chin = at(COACH - 2, 0);
  const chinCtrl = at(COACH + SNOUT - 1, 0);
  const curveAt = (t) => [0, 1].map((k) => (1 - t) ** 3 * roofEnd[k] + 3 * (1 - t) ** 2 * t * c1[k] + 3 * (1 - t) * t ** 2 * c2[k] + t ** 3 * tip[k]);

  const d = side === 'right' ? 1 : -1; // direction the nose points
  const parts = [];
  // Nose skin: the curve swept back into depth
  parts.push(`<path d="M${f(roofEnd)} C${f(c1)} ${f(c2)} ${f(tip)} L${f(lift(tip))} C${f(lift(c2))} ${f(lift(c1))} ${f(lift(roofEnd))} Z" fill="${p.nose}"/>`);
  // Flat roof over the rest of the cab
  parts.push(`<polygon points="${pts(at(0, top), roofEnd, lift(roofEnd), lift(at(0, top)))}" fill="${p.roof}"/>`);
  if (side === 'right') {
    // Windscreen wrapping over the top of the nose
    const [a, b] = [curveAt(0.2), curveAt(0.48)];
    parts.push(`<polygon points="${pts(lift(a, 0.15), lift(b, 0.15), lift(b, 0.8), lift(a, 0.8))}" fill="${p.glass}"/>`);
  } else {
    // The flat end of a rear cab faces the viewer's right, like any coach end
    parts.push(`<polygon points="${pts([COACH, 0], [COACH, top], [COACH + DX, top - DY], [COACH + DX, -DY])}" fill="${p.end}"/>`);
  }
  // Side of the cab, following the nose down to its chin
  parts.push(`<path d="M${f(at(0, 0))} L${f(chin)} Q${f(chinCtrl)} ${f(tip)} C${f(c2)} ${f(c1)} ${f(roofEnd)} L${f(at(0, top))} Z" fill="${p.body}"/>`);
  // Driver's window, raked along the curve of the nose
  const [ax] = at(SNOUT_FROM - 1.5, 0);
  const [bx, by] = curveAt(0.1);
  const [cx, cy] = curveAt(0.45);
  const low = top + 0.5 * CH;
  parts.push(`<polygon points="${pts([ax, top + 3], [bx, by + 3], [cx - 1.5 * d, cy + 1.5], [cx - 1.5 * d, low], [ax, low])}" fill="${p.glass}"/>`);
  // Passenger windows behind the driver
  for (const x of [1.6, 7.2, 12.8]) {
    const [wx] = at(side === 'right' ? x : x + 4.6, 0);
    parts.push(`<rect x="${n(wx)}" y="${top + 3}" width="4.6" height="7" rx=".7" fill="${windowFill}"/>`);
  }
  // Line stripe, tapering into the tip
  parts.push(`<polygon points="${pts(at(0, -4.2), at(COACH - 2, -4.2), at(COACH + SNOUT - 1.5, -3.4), at(COACH + SNOUT - 1.5, -2.7), at(COACH - 2, -2.2), at(0, -2.2))}" fill="${stripe}"/>`);
  if (head) {
    // A small horn on the roof, just behind where the nose starts curving down
    const [hx, roof] = lift(at(SNOUT_FROM - 3, top), 0.5);
    const hy = roof - 2.1;
    parts.push(`<rect x="${n(hx - 0.4)}" y="${n(hy)}" width=".8" height="${n(roof - hy)}" fill="${p.horn}"/>`);
    parts.push(`<polygon points="${pts([hx - 2.2 * d, hy - 0.3], [hx + d, hy - 0.45], [hx + 2.6 * d, hy - 1.4], [hx + 2.6 * d, hy + 1.4], [hx + d, hy + 0.45], [hx - 2.2 * d, hy + 0.3])}" fill="${p.horn}"/>`);
    parts.push(`<ellipse cx="${n(hx + 2.6 * d)}" cy="${n(hy)}" rx=".4" ry="1.3" fill="${p.glass}"/>`);
    // Two headlights, on the near and far side of the nose, each throwing a beam down the track
    const near = at(COACH + SNOUT - 2.4, -4.6);
    const lamps = [lift(near, 0.75), near];
    for (const [lx, ly] of lamps) {
      parts.push(`<polygon points="${pts([lx, ly - 0.6], [lx + BEAM * d, ly - 3.4], [lx + BEAM * d, ly + 2.4], [lx, ly + 0.6])}" fill="url(#beam-${side})"/>`);
    }
    for (const [lx, ly] of lamps) parts.push(`<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="1.3" ry=".8" fill="${lamp}"/>`);
  } else if (lamp) {
    const [lx, ly] = at(COACH + SNOUT - 4, -4.8);
    parts.push(`<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="1.5" ry=".9" fill="${lamp}"/>`);
  }
  return parts;
}

const dayWindow = (x, fill) => `<rect x="${n(x)}" y="${-CH + 3}" width="${DAY.w}" height="7" rx=".6" fill="${fill}"/>`;

/**
 * One coach, origin at the bottom-left of its side face, standing on the rail.
 * `cab` puts a driver's cab on the 'left' or 'right' end.
 */
function coach(id, { windowFill, stripe, cab = null, lamp = null, head = false }, p) {
  const top = -CH;
  const roofTop = -CH - DY;
  const parts = [];
  if (cab) {
    parts.push(...bulletCab(cab, { windowFill, stripe, lamp, head }, p));
  } else {
    parts.push(`<polygon points="${pts([0, top], [COACH, top], [COACH + DX, roofTop], [DX, roofTop])}" fill="${p.roof}"/>`);
    parts.push(`<polygon points="${pts([COACH, 0], [COACH, top], [COACH + DX, roofTop], [COACH + DX, -DY])}" fill="${p.end}"/>`);
    parts.push(`<rect y="${top}" width="${COACH}" height="${CH}" fill="${p.body}"/>`);
    if (windowFill) parts.push(...Array.from({ length: 7 }, (_, k) => dayWindow(DAY.x0 + k * DAY.step, windowFill)));
    parts.push(`<rect y="-4.2" width="${COACH}" height="2" fill="${stripe}"/>`);
  }
  return `<g id="${id}">${parts.join('')}</g>`;
}

/** Repo names for a board, one per line: at most `max` lines, the last one "+N more" if needed. */
const boardLines = (names, max) =>
  (names.length > max ? [...names.slice(0, max - 1), `+${names.length - max + 1} more`] : names).map((name) => truncate(name, 20));

const boardSize = (lines) => ({ w: Math.max(...lines.map((line) => width(line, 8.5, 0.4))) + 16, h: 13 + (lines.length - 1) * 12 });

/** A purple name board centred on cx with its top edge at `top`. */
function board(cx, top, lines) {
  const { w, h } = boardSize(lines);
  return `<rect x="${n(cx - w / 2)}" y="${n(top)}" width="${n(w)}" height="${h}" rx="1" fill="${LINES.purple}"/>`
    + lines.map((line, k) => text(cx, top + 9.4 + k * 12, line, { size: 8.5, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 0.4 })).join('');
}

/**
 * A cantilever sign gantry over the coach at cx: a post behind the far track, an arm reaching out
 * over the near track, and the repos that peaked that week on a board hanging from it. The post
 * goes behind the train (`back`); the arm and board are drawn over it (`front`).
 */
function gantry(cx, names, p) {
  const lines = boardLines(names, 3);
  const { w, h } = boardSize(lines);
  const top = RAIL - CH - DY - 10 - h;
  const beamY = top - 5;
  const [x0, x1] = [cx - w / 2 - 4, cx + w / 2 + 4];
  const post = { x: x1 + FAR.dx + DX + 4, top: beamY - FAR.dy - DY - 4 };
  const backEdge = RAIL - FAR.dy - DY - 3;
  return {
    back: `<rect x="${n(post.x - 1.6)}" y="${n(post.top)}" width="3.2" height="${n(backEdge - post.top)}" fill="${p.post}"/>`,
    front: `<line x1="${n(x1)}" y1="${n(beamY)}" x2="${n(post.x)}" y2="${n(post.top)}" stroke="${p.post}" stroke-width="2.6"/>`
      + `<rect x="${n(x0)}" y="${n(beamY - 1.3)}" width="${n(x1 - x0)}" height="2.6" fill="${p.post}"/>`
      + [x0 + 8, x1 - 8].map((x) => `<line x1="${n(x)}" y1="${n(beamY)}" x2="${n(x)}" y2="${n(top)}" stroke="${p.post}"/>`).join('')
      + board(cx, top, lines),
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
  const stations = [...byWeek].sort((a, b) => a[0] - b[0]).map(([i, names]) => ({ i, names }));

  // Coordinates. In the train's own frame the tail cab sits at 0, week i's coach at (i + 1) * PITCH
  // and the head cab after the last week; the train runs to the right. `world(u)` is where the
  // camera looks when week u is in focus; since it grows STRETCH times faster than the train
  // moves, the camera travels along the train from tail to head while it runs.
  const coachX = (i) => (i + 1) * PITCH;
  const centre = (u) => coachX(u) + COACH / 2;
  const world = (u) => STRETCH * centre(u) + W;
  const runAt = (u) => world(u) - centre(u); // train offset along the world
  const panAt = (u) => ANCHOR - world(u); // world offset in the frame
  const xEnd = world(last) + 2 * W;

  const purple = { stripe: LINES.purple };
  const green = { windowFill: p.win[3], stripe: LINES.green };
  const defs = [
    `<linearGradient id="sky" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBottom}"/></linearGradient>`,
    `<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>`,
    ...['right', 'left'].map((side) => `<linearGradient id="beam-${side}"${side === 'left' ? ' x1="1" x2="0"' : ''}>`
      + `<stop offset="0" stop-color="#fff3b0" stop-opacity="${p.beam}"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>`),
    coach('body', purple, p),
    coach('head', { ...purple, windowFill: p.win[1], cab: 'right', lamp: '#fff3b0', head: true }, p),
    coach('tail', { ...purple, windowFill: p.win[1], cab: 'left', lamp: '#ff5a5a' }, p),
    coach('gl', { ...green, cab: 'left', lamp: '#fff3b0', head: true }, p),
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

  // Repo gantries, each where its week's coach will be when the camera arrives. A repo that peaked
  // this week gets a board under the Commit Street canopy instead (see below).
  const gantries = stations.filter((s) => s.i < last).map((s) => gantry(world(s.i), s.names, p));
  line.push(...gantries.map((g) => g.back));

  // Commit Street: a platform over both tracks long enough that the train's last coaches and the
  // driver's cab pull in under it, with the green line train waiting past the front end
  const cs = { x0: world(last) - COACH * 1.8, x1: world(last) + COACH * 1.5 + SNOUT + 220 };
  const canopyBottom = RAIL - FAR.dy - CH - DY - 18;
  const depth = FAR.dx + DX;
  const rise = FAR.dy + DY + 2;
  line.push(...[cs.x0 + 3, cs.x1 - 6].map((x) => `<rect x="${n(x)}" y="${canopyBottom}" width="2.4" height="${RAIL - DY - canopyBottom}" fill="${p.post}"/>`));
  const greenX = cs.x1 - 3 * PITCH - 26 + FAR.dx;
  ['gl', 'gm', 'gr'].forEach((id, k) => line.push(`<use href="#${id}" x="${n(greenX + k * PITCH)}" y="${RAIL - FAR.dy}"/>`));

  // The train: tail cab, one coach per week with a window per day, then the driver's cab
  const train = [`<use href="#tail" x="0" y="${RAIL}"/>`];
  weeks.forEach((w, i) => {
    const x = coachX(i);
    train.push(`<use href="#body" x="${n(x)}" y="${RAIL}"/>`);
    for (let dow = 0; dow < 7; dow++) {
      const day = w.days.find((dd) => dd.dow === dow);
      const wx = x + DAY.x0 + dow * DAY.step;
      if (day?.d === today) {
        train.push(`<rect class="pulse" x="${n(wx - 1.2)}" y="${RAIL - CH + 1.8}" width="${DAY.w + 2.4}" height="9.4" rx="1.2" fill="${p.win[4]}" opacity=".55"/>`);
      }
      // Days before the calendar starts or after today stay dark; class "d" marks real days
      const fill = day ? p.win[lightLevel(day.c, maxDay)] : p.win[0];
      train.push(`<rect${day ? ' class="d"' : ''} x="${n(wx)}" y="${RAIL - CH + 3}" width="${DAY.w}" height="7" rx=".6" fill="${fill}"/>`);
    }
    if (i === 0 || w.start.slice(0, 7) !== weeks[i - 1].start.slice(0, 7)) {
      train.push(text(x + TAG_INSET, RAIL - CH - DY - 4, monthName(w.start).toUpperCase(), { size: 7, weight: 700, fill: p.muted, ls: 1 }));
    }
  });
  train.push(`<use href="#head" x="${n(coachX(weeks.length))}" y="${RAIL}"/>`);

  // Canopies, signs and the LED price board go over the trains
  const signText = 'COMMIT STREET';
  const signW = width(signText, 9.5, 0.6) + 22;
  const signX = (cs.x0 + cs.x1) / 2 - signW / 2 + depth / 2;
  const signY = canopyBottom - rise - 17;
  const quote = `$${cfg.symbol} ${rupees(v.price)} ${arrow(v.changePct)} ${signed(v.changePct)}%`;
  const ledW = width(quote, 8, 0.3) + 14;
  const ledX = cs.x1 - ledW - 14;
  const ledY = canopyBottom + 5;
  const thisWeek = stations.find((s) => s.i === last);
  const over = [
    ...gantries.map((g) => g.front),
    `<polygon points="${pts([cs.x0, canopyBottom], [cs.x1, canopyBottom], [cs.x1 + depth, canopyBottom - rise], [cs.x0 + depth, canopyBottom - rise])}" fill="${p.canopyTop}"/>`,
    `<rect x="${n(cs.x0)}" y="${canopyBottom}" width="${n(cs.x1 - cs.x0)}" height="3" fill="${p.canopy}"/>`,
    `<rect x="${n(signX)}" y="${signY}" width="${n(signW / 2)}" height="14" fill="${LINES.purple}"/>`,
    `<rect x="${n(signX + signW / 2)}" y="${signY}" width="${n(signW / 2)}" height="14" fill="${LINES.green}"/>`,
    text(signX + signW / 2, signY + 10.2, signText, { size: 9.5, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 0.6 }),
    ...[ledX + 8, ledX + ledW - 8].map((x) => `<line x1="${n(x)}" y1="${canopyBottom + 3}" x2="${n(x)}" y2="${ledY}" stroke="${p.post}"/>`),
    `<rect x="${n(ledX)}" y="${ledY}" width="${n(ledW)}" height="12" rx="1.5" fill="#0b0b0c" stroke="#30343a"/>`,
    text(ledX + ledW / 2, ledY + 8.6, quote, { size: 8, weight: 700, fill: '#ffb21a', anchor: 'middle', ls: 0.3 }),
  ];
  if (thisWeek) {
    // This week's repos hang from the platform canopy, over this week's coach
    const lines = boardLines(thisWeek.names, 2);
    const top = canopyBottom + 6;
    const { w } = boardSize(lines);
    over.push(...[world(last) - w / 2 + 8, world(last) + w / 2 - 8].map((x) => `<line x1="${n(x)}" y1="${canopyBottom + 3}" x2="${n(x)}" y2="${top}" stroke="${p.post}"/>`));
    over.push(board(world(last), top, lines));
  }

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
    const name = s.names.length > 1 ? `${truncate(s.names[0], 11)} +${s.names.length - 1}` : truncate(s.names[0], 14);
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
    text(24, 45, 'One coach per week, one window per day. Lit windows are commits.', { size: 9, fill: p.muted }),
  ];
  const sq = W - 24 - width('MANY', 7, 0.6) - 6 - 42;
  for (let lvl = 0; lvl < 5; lvl++) header.push(`<rect x="${sq + lvl * 9}" y="38.5" width="6" height="7" rx="1" fill="${p.win[lvl]}"/>`);
  header.push(text(sq - 5, 45, 'NONE', { size: 7, fill: p.muted, anchor: 'end', ls: 0.6 }));
  header.push(text(W - 24, 45, 'MANY', { size: 7, fill: p.muted, anchor: 'end', ls: 0.6 }));

  // The journey as keyframes: rest on today, fade, start a year back, then run the whole line.
  // Between gantries the train speeds up (camera zooms out); approaching one it eases down to SLOW
  // and passes under the sign at that steady pace (camera zooms in a little), never stopping.
  // The only stop is the final one, at Commit Street.
  const frames = [];
  const add = (pct, u, zoom, ease = EASE.steady) => frames.push({ pct, u, zoom, ease });
  add(0, last, ZOOM.rest);
  add(HOLD, last, ZOOM.rest);
  add(9.59, last, ZOOM.rest);
  add(9.6, 0, ZOOM.start);
  add(START, 0, ZOOM.start);
  const gantryWeeks = [...new Set(stations.map((s) => s.i).filter((i) => i > 0 && i < last))].sort((a, b) => a - b);
  // Hop time is proportional to distance, so every hop has the same average speed. The distance
  // covered during a pass is chosen so its steady speed is exactly SLOW times that average.
  const hopTime = 100 - START - PASS * gantryWeeks.length;
  const passWeeks = (SLOW * PASS * last) / (hopTime + SLOW * PASS * gantryWeeks.length);
  const hopWeeks = last - passWeeks * gantryWeeks.length;
  const marks = [0, ...gantryWeeks.flatMap((i) => [i - passWeeks / 2, i + passWeeks / 2]), last];
  let t = START;
  for (let k = 0; k <= gantryWeeks.length; k++) {
    const [from, to] = [marks[2 * k], marks[2 * k + 1]];
    const span = ((to - from) / hopWeeks) * hopTime;
    const final = k === gantryWeeks.length;
    frames.at(-1).ease = EASE.speedUp(k === 0 ? 0 : SLOW);
    add(t + span / 2, (from + to) / 2, Math.max(ZOOM.fastest, 1 - 0.045 * (to - from)), EASE.slowDown(final ? 0 : SLOW));
    t += span;
    if (final) {
      add(100, to, ZOOM.rest);
    } else {
      add(t, to, ZOOM.pass);
      t += PASS;
      add(t, marks[2 * k + 2], ZOOM.pass);
    }
  }
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
    `<g class="pan">${line.join('')}<g class="run">${train.join('')}</g>${over.join('')}</g>`,
    '</g></g>',
    ...route,
    ...header,
    '</g>',
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${theme.border}"/>`,
  ].join('');

  const repos = stations.flatMap((s) => s.names).join(', ');
  const title = `Commit Metro: my last ${weeks.length} weeks of GitHub contributions as one long Namma Metro train on the purple line, one coach per week and one window per day, lit for days I committed. ${total} contributions since ${fmtDate(weeks[0]?.start ?? today)}.`
    + (repos ? ` It slows under a sign for each of my busiest repos: ${repos}.` : '')
    + ` Its head pulls up at Commit Street, where $${cfg.symbol} trades at ${rupees(v.price)}.`;
  return svg({ w: W, h: H, theme, css, defs, body, title });
}
