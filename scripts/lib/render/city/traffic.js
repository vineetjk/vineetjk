// Life on the street. Each week of the year owns the stretch of road under where its coach is
// when the camera passes, and that stretch is as busy as the week was: more walkers, and a
// cyclist on busier weeks. Every pull request merged this year is a BMTC bus showing its repo
// and number, driving near the week it merged; the latest one waits at the Commit Street bus
// stop. Autos and cars fill in the rest.
//
// Vehicles loop once per journey: each drives a stretch of road centred on its spot, timed so
// it's mid-stretch when the camera goes by and jumps back when the camera is far away. Walkers
// stroll back and forth, so they need no timing at all.

import { n, pts, esc, width, truncate, seeded } from '../common.js';
import { KN, kn } from '../kannada.js';
import { DURATION, START, lightLevel } from '../metro.js';
import { Y } from './layout.js';

const SPEED = { bus: 17, auto: 26, car: 30, cycle: 9 }; // px per second along the world
const LANE = { farOuter: [Y.lanes.farOuter, 1], farInner: [Y.lanes.farInner, 1], nearInner: [Y.lanes.nearInner, -1], nearOuter: [Y.lanes.nearOuter, -1] };

// ---- Templates: everything faces right with its feet (or wheels) on y = 0; `L` variants face left

const BUS = 56;

function bus(dir, p) {
  const L = BUS;
  const H = 22;
  const X = dir > 0 ? (x) => x : (x) => L - x;
  const span = (a, b) => [Math.min(X(a), X(b)), Math.abs(X(b) - X(a))];
  const rect = (a, b, y, h, fill) => {
    const [x, w] = span(a, b);
    return `<rect x="${n(x)}" y="${y}" width="${n(w)}" height="${h}" fill="${fill}"/>`;
  };
  const end = dir > 0
    ? `<polygon points="${pts([L, -10], [L, -21], [L + 4, -24.5], [L + 4, -13.5])}" fill="${p.glassDark2}"/>`
    : `<rect x="${L + 0.6}" y="-8" width="1.4" height="3" fill="#d23b3b"/>`;
  const lamps = p.lit
    ? (dir > 0
      ? `<polygon points="${pts([L + 2, -4], [L + 34, -7], [L + 34, 1], [L + 2, -2])}" fill="url(#beam-right)"/><circle cx="${L + 2}" cy="-3.6" r="1.1" fill="#fff3b0"/>`
      : '<circle cx="-0.4" cy="-4" r="1" fill="#ff5a5a"/>')
    : '';
  return `<g id="bus${dir > 0 ? 'R' : 'L'}">`
    + `<polygon points="${pts([0, -H], [L, -H], [L + 4, -H - 3.5], [4, -H - 3.5])}" fill="${p.slab}"/>`
    + `<polygon points="${pts([L, 0], [L, -H], [L + 4, -H - 3.5], [L + 4, -3.5])}" fill="${p.bus}"/>${end}`
    + `<rect width="${L}" height="${H}" y="${-H}" fill="${p.bus}"/>`
    + rect(3, L - 3, -21, 6.6, '#101317')
    + rect(2, L - 2, -13.6, 5, p.lit ? p.window : p.glassDark2)
    + [13, 24, 35, 46].map((x) => rect(x, x + 1.2, -13.6, 5, p.bus)).join('')
    + rect(0, L, -8.4, 5.6, p.busBlue) + rect(0, L, -2.8, 2.8, p.busDark)
    + [[5, 10], [36, 41]].map(([a, b]) => rect(a, b, -15, 13, p.glassDark2)).join('')
    + kn(X(23), -4.2, KN.bmtc, { size: 4.4, fill: '#ffffff', anchor: 'middle' })
    + [12, 46].map((x) => `<circle cx="${n(X(x))}" cy="-1.6" r="3.3" fill="${p.tyre}"/><circle cx="${n(X(x))}" cy="-1.6" r="1.3" fill="${p.medianTop}"/>`).join('')
    + lamps + '</g>';
}

function auto(dir, p) {
  const X = dir > 0 ? (x) => x : (x) => 22 - x;
  const P = (...xy) => pts(...xy.map(([x, y]) => [X(x), y]));
  return `<g id="auto${dir > 0 ? 'R' : 'L'}">`
    + `<path d="M${n(X(1))},-8 Q${n(X(1))},-15 ${n(X(6))},-15 H${n(X(15))} Q${n(X(19))},-15 ${n(X(20))},-10 L${n(X(20))},-8 Z" fill="${p.autoYellow}"/>`
    + `<polygon points="${P([2, -11.5], [14, -11.5], [14, -8], [2, -8])}" fill="${p.autoTop}"/>`
    + `<circle cx="${n(X(16.6))}" cy="-10.3" r="1.5" fill="${p.skin[0]}"/>`
    + `<polygon points="${P([1, -8], [20, -8], [22, -5.5], [22, -2], [1, -2])}" fill="${p.autoGreen}"/>`
    + `<polygon points="${P([19, -11.8], [20.6, -10], [20.6, -8], [19, -8])}" fill="${p.glassDark2}"/>`
    + [5, 18.5].map((x) => `<circle cx="${n(X(x))}" cy="-2" r="2.2" fill="${p.tyre}"/>`).join('')
    + (p.lit ? (dir > 0
      ? `<polygon points="${pts([22, -5], [44, -7], [44, 0], [22, -3.6])}" fill="url(#beam-right)"/><circle cx="21.8" cy="-4.4" r=".9" fill="#fff3b0"/>`
      : `<polygon points="${pts([0, -5], [-22, -7], [-22, 0], [0, -3.6])}" fill="url(#beam-left)"/><circle cx=".2" cy="-4.4" r=".9" fill="#fff3b0"/>`) : '')
    + '</g>';
}

function car(dir, p) {
  const X = dir > 0 ? (x) => x : (x) => 26 - x;
  const P = (...xy) => pts(...xy.map(([x, y]) => [X(x), y]));
  return `<g id="car${dir > 0 ? 'R' : 'L'}">`
    + `<polygon points="${P([7, -7], [9.5, -12], [19, -12], [22.5, -7])}"/>`
    + `<polygon points="${P([10.4, -11], [14.2, -11], [14.2, -7.6], [8.8, -7.6])}" fill="${p.glassDark2}"/>`
    + `<polygon points="${P([15, -11], [18.6, -11], [21.2, -7.6], [15, -7.6])}" fill="${p.glassDark2}"/>`
    + `<path d="M${n(X(0.5))},-2.4 V-6 Q${n(X(1))},-7.4 ${n(X(4))},-7.4 H${n(X(24))} Q${n(X(26))},-7 ${n(X(26))},-4.6 V-2.4 Z"/>`
    + [5.5, 20.5].map((x) => `<circle cx="${n(X(x))}" cy="-2" r="2.3" fill="${p.tyre}"/>`).join('')
    + (p.lit ? (dir > 0
      ? `<polygon points="${pts([26, -5], [52, -7.5], [52, 0], [26, -3.6])}" fill="url(#beam-right)"/><circle cx="25.8" cy="-4.4" r=".9" fill="#fff3b0"/><circle cx=".6" cy="-4.4" r=".8" fill="#ff5a5a"/>`
      : `<polygon points="${pts([0, -5], [-26, -7.5], [-26, 0], [0, -3.6])}" fill="url(#beam-left)"/><circle cx=".2" cy="-4.4" r=".9" fill="#fff3b0"/><circle cx="25.4" cy="-4.4" r=".8" fill="#ff5a5a"/>`) : '')
    + '</g>';
}

/** A cyclist: wheels that turn, a rider in whatever shirt the <use> says (fill). */
function cycle(dir, p) {
  const X = dir > 0 ? (x) => x : (x) => 12 - x;
  const wheel = (x) => `<g class="spin"><circle cx="${n(X(x))}" cy="-3" r="3" fill="none" stroke="${p.tyre}" stroke-width=".9"/><path d="M${n(X(x) - 2.6)},-3h5.2M${n(X(x))},-5.6v5.2" stroke="${p.tyre}" stroke-width=".4"/></g>`;
  return `<g id="cyc${dir > 0 ? 'R' : 'L'}">${wheel(0)}${wheel(12)}`
    + `<path d="M${n(X(0))},-3 L${n(X(5))},-3 L${n(X(9))},-8 L${n(X(4))},-8 Z M${n(X(4))},-8 L${n(X(3.4))},-10 M${n(X(9))},-8 L${n(X(10))},-11 M${n(X(12))},-3 L${n(X(9))},-8" fill="none" stroke="${p.pole}" stroke-width=".8"/>`
    + `<polygon points="${pts(...[[3, -10], [5, -10], [9, -15], [7, -16]].map(([x, y]) => [X(x), y]))}"/>`
    + `<line x1="${n(X(4))}" y1="-10" x2="${n(X(5.6))}" y2="-4" stroke="currentColor" stroke-width="1.2"/>`
    + `<line x1="${n(X(8.6))}" y1="-14.5" x2="${n(X(10))}" y2="-11" stroke="${p.skin[1]}" stroke-width=".8"/>`
    + `<circle cx="${n(X(8.6))}" cy="-17.4" r="1.6" fill="${p.skin[1]}"/></g>`;
}

/** Walkers: shirt from the <use> fill, trousers (or sari border) from its color. */
function walkers(p) {
  const skin = p.skin[1];
  const legs = (d) => `<line class="lg" x1="0" y1="-5.4" x2="0" y2="0" stroke="currentColor" stroke-width="1.3" style="animation-duration:${d}s"/>`
    + `<line class="lg lg2" x1="0" y1="-5.4" x2="0" y2="0" stroke="currentColor" stroke-width="1.3" style="animation-duration:${d}s"/>`;
  return [
    `<g id="wkA">${legs(0.8)}<rect x="-1.9" y="-10.6" width="3.8" height="5.8" rx="1.2"/><circle cy="-12.3" r="1.6" fill="${skin}"/></g>`,
    `<g id="wkB">${legs(0.66)}<rect x="-1.8" y="-10.4" width="3.6" height="5.6" rx="1.2"/><circle cy="-12.1" r="1.55" fill="${p.skin[0]}"/><path d="M-1.6,-13.2 a1.7,1.7 0 0 1 3.2,0z" fill="#1d1d1f"/></g>`,
    // A sari: one long drape, the border in `color`, a little sway as she walks
    `<g id="wkS"><g class="sway"><path d="M-1.9,-10.6 h3.8 l1.4,10.6 h-6.6 z"/><path d="M-2.6,-.8 h5.2" stroke="currentColor" stroke-width="1.1"/><path d="M1.6,-10.4 l-3,4.6" stroke="currentColor" stroke-width=".9"/></g><circle cy="-12.3" r="1.6" fill="${skin}"/><path d="M-1.7,-12.6 a1.7,1.8 0 0 1 3.4,0 v1 h-3.4z" fill="#1d1d1f"/></g>`,
    // Standing with a tumbler of filter coffee
    `<g id="wkT"><rect x="-1.5" y="-5.2" width="1.2" height="5.2" fill="currentColor"/><rect x=".3" y="-5.2" width="1.2" height="5.2" fill="currentColor"/><rect x="-1.9" y="-10.6" width="3.8" height="5.8" rx="1.2"/><circle cy="-12.3" r="1.6" fill="${skin}"/><rect class="sip" x="1.7" y="-9.6" width="1.4" height="2" fill="#c9ced3"/></g>`,
  ];
}

export function trafficDefs(p) {
  return [bus(1, p), bus(-1, p), auto(1, p), auto(-1, p), car(1, p), car(-1, p), cycle(1, p), cycle(-1, p), ...walkers(p)];
}

export const TRAFFIC_CSS = [
  '.mv{animation-duration:90s;animation-timing-function:linear;animation-iteration-count:infinite}',
  ...Object.entries(SPEED).flatMap(([kind, v]) => {
    const d = n((v * DURATION) / 2);
    return [`.${kind}R{animation-name:${kind}R}@keyframes ${kind}R{from{transform:translateX(-${d}px)}to{transform:translateX(${d}px)}}`,
      `.${kind}L{animation-name:${kind}L}@keyframes ${kind}L{from{transform:translateX(${d}px)}to{transform:translateX(-${d}px)}}`];
  }),
  // Walkers stroll there and back, turning round at each end
  ...[[1, 52, 24], [2, 80, 36], [3, 112, 50]].map(([k, d, t]) => `.w${k}{transform-box:fill-box;transform-origin:center;animation:w${k} ${t}s linear infinite}`
    + `@keyframes w${k}{0%{transform:translateX(0)}48.5%{transform:translateX(${d}px)}50%{transform:translateX(${d}px) scaleX(-1)}98.5%{transform:translateX(0) scaleX(-1)}100%{transform:translateX(0)}}`),
  '.lg{transform-box:fill-box;transform-origin:50% 0;animation:lg .8s ease-in-out infinite alternate}.lg2{animation-direction:alternate-reverse}',
  '@keyframes lg{from{transform:rotate(20deg)}to{transform:rotate(-20deg)}}',
  '.sway{transform-box:fill-box;transform-origin:50% 0;animation:sway .9s ease-in-out infinite alternate}@keyframes sway{from{transform:skewX(3deg)}to{transform:skewX(-3deg)}}',
  '.spin{transform-box:fill-box;transform-origin:center;animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}',
  '.sip{animation:sip 5s ease-in-out infinite}@keyframes sip{0%,60%,100%{transform:none}70%,85%{transform:translate(-.6px,-2.4px)}}',
].join('');

/**
 * When (in seconds into the loop) the camera is looking at world x. Spots in the resting view
 * count as 0, the start of the loop.
 */
export function cameraTime(frames, world, A, x) {
  if (x >= A - 470) return 0;
  const run = frames.filter((f) => f.pct >= START);
  if (x <= world(run[0].u)) return (START * DURATION) / 100;
  for (let k = 1; k < run.length; k++) {
    const [a, b] = [world(run[k - 1].u), world(run[k].u)];
    if (x >= a && x <= b) return ((run[k - 1].pct + ((x - a) / (b - a || 1)) * (run[k].pct - run[k - 1].pct)) * DURATION) / 100;
  }
  return 0;
}

/** A vehicle loop that is mid-stretch at time `at` (seconds), its spot being (x, y). */
function vehicle(kind, dir, x, y, at, extra = '', attrs = '') {
  const delay = (((at - DURATION / 2) % DURATION) + DURATION) % DURATION - DURATION;
  return `<g class="mv ${kind}${dir > 0 ? 'R' : 'L'}" style="animation-delay:${n(delay)}s"><use href="#${kind === 'cycle' ? 'cyc' : kind}${dir > 0 ? 'R' : 'L'}" x="${n(x)}" y="${n(y)}"${attrs}/>${extra}</g>`;
}

/** The text on a bus's side display: "#12 repo". */
function busDisplay(x, y, pr, p) {
  const label = `#${pr.number} ${truncate(pr.repo, 12)}`;
  return `<text x="${n(x + BUS / 2)}" y="${n(y - 16)}" font-size="5.6" font-weight="700" fill="${p.led}" text-anchor="middle" letter-spacing=".2">${esc(label)}</text>`;
}

/**
 * Everything that moves on the street. Returns the pieces by depth: `back` (far footpath),
 * `far` (far carriageway), `near` (near carriageway) and `front` (near footpath).
 */
export function traffic({ weeks, prs, plan, p, A, xEnd, world, frames, busStop }) {
  const layer = { back: [], far: [], near: [], front: [] };
  const at = (x) => cameraTime(frames, world, A, x);
  const totals = weeks.map((w) => w.days.reduce((s, d) => s + d.c, 0));
  const maxWeek = Math.max(1, ...totals);
  const pick = (list, r) => list[Math.floor(r * list.length)];
  const put = (lane, x, part) => layer[lane.startsWith('far') ? 'far' : 'near'].push([lane, x, part]);

  // Walkers and cyclists, week by week
  weeks.forEach((w, i) => {
    const rand = seeded(`street/${w.start}`);
    const level = lightLevel(totals[i], maxWeek);
    const people = level === 0 ? (rand() < 0.35 ? 1 : 0) : level;
    for (let k = 0; k < people; k++) {
      const x = world(i) + (rand() - 0.5) * 112;
      const far = rand() < 0.5;
      const kind = pick(['wkA', 'wkA', 'wkB', 'wkS'], rand());
      const cls = `w${1 + Math.floor(rand() * 3)}`;
      const shirt = kind === 'wkS' ? pick(['#d6336c', '#f08c00', '#7048e8', '#2b8a3e', '#e8590c'], rand()) : pick(p.shirt, rand());
      layer[far ? 'back' : 'front'].push(`<use class="${cls}" href="#${kind}" x="${n(x)}" y="${far ? Y.backFeet : Y.nearFeet}" fill="${shirt}" color="${pick(p.pants, rand())}" style="animation-delay:-${n(rand() * 50)}s"/>`);
    }
    if (level >= 2) {
      const dir = rand() < 0.5 ? 1 : -1;
      const x = world(i) + (rand() - 0.5) * 80;
      const lane = dir > 0 ? 'farOuter' : 'nearOuter';
      put(lane, x, vehicle('cycle', dir, x, LANE[lane][0] - 0.5, at(x), '', ` fill="${pick(p.shirt, rand())}" color="${pick(p.pants, rand())}"`));
    }
  });

  // BMTC buses: one per merged PR, near the week it merged, the latest at the Commit Street stop
  if (plan.has.buses) {
    const list = [...(prs ?? [])];
    const latest = list.pop();
    if (latest) {
      layer.far.push(['farOuter', busStop, `<g><use href="#busR" x="${n(busStop)}" y="${Y.lanes.farOuter}"/>${busDisplay(busStop, Y.lanes.farOuter, latest, p)}</g>`]);
    }
    const seen = new Map();
    list.forEach((pr, k) => {
      const i = weeks.findIndex((w, j) => pr.merged >= w.start && (j === weeks.length - 1 || pr.merged < weeks[j + 1].start));
      if (i < 0) return;
      const nth = seen.get(i) ?? 0;
      seen.set(i, nth + 1);
      const dir = k % 2 === 0 ? 1 : -1;
      const lane = dir > 0 ? 'farOuter' : 'nearOuter';
      const x = world(i) + (nth - 1) * 92 * dir;
      const y = LANE[lane][0];
      put(lane, x, vehicle('bus', dir, x, y, at(x), busDisplay(x, y, pr, p)));
    });
  }

  // Autos and cars all along the line
  const rand = seeded('traffic');
  if (plan.has.autos) {
    for (let x = 260; x < xEnd; x += 360 + rand() * 160) {
      const lane = pick(['farInner', 'nearInner', 'farOuter', 'nearInner'], rand());
      put(lane, x, vehicle('auto', LANE[lane][1], x, LANE[lane][0], at(x)));
    }
  }
  for (let x = 480; x < xEnd; x += 470 + rand() * 220) {
    const lane = rand() < 0.5 ? 'farInner' : 'nearInner';
    put(lane, x, vehicle('car', LANE[lane][1], x, LANE[lane][0], at(x), '', ` fill="${pick(p.car, rand())}"`));
  }

  // Back to front within each carriageway: the outer far lane first, the outer near lane last
  const order = { farOuter: 0, farInner: 1, nearInner: 0, nearOuter: 1 };
  const sorted = (list) => list.sort((a, b) => order[a[0]] - order[b[0]] || a[1] - b[1]).map(([, , part]) => part);
  return { back: layer.back, far: sorted(layer.far), near: sorted(layer.near), front: layer.front };
}

/** A person standing still (with a tumbler, at the darshini). */
export const standing = {
  stand: (x, y, rand, cup) => `<use href="#${cup ? 'wkT' : 'wkA'}" x="${n(x)}" y="${y}" fill="${['#d94f4f', '#3f7fd0', '#e7e7e7', '#52a36b', '#ef8a3c'][Math.floor(rand() * 5)]}" color="#2f3b52"/>`,
};

/** A BMTC bus shelter on the far footpath. */
export function busShelter(x, p) {
  const top = Y.backWalk - 20;
  return `<rect x="${n(x)}" y="${top}" width="40" height="2.6" fill="${p.busBlue}"/>`
    + `<rect x="${n(x + 2)}" y="${top + 2.6}" width="1.4" height="${Y.backWalk - top - 2.6}" fill="${p.pole}"/><rect x="${n(x + 36.6)}" y="${top + 2.6}" width="1.4" height="${Y.backWalk - top - 2.6}" fill="${p.pole}"/>`
    + `<rect x="${n(x + 4)}" y="${Y.backWalk - 7}" width="32" height="1.6" fill="${p.pole}"/>`
    + `<rect x="${n(x + 42)}" y="${top - 6}" width="12" height="7" rx="1" fill="${p.busBlue}"/><text x="${n(x + 48)}" y="${top - 1.2}" font-size="4.2" font-weight="700" fill="#ffffff" text-anchor="middle">BUS</text>`
    + `<rect x="${n(x + 47.4)}" y="${top + 1}" width="1.2" height="${Y.backWalk - top - 1}" fill="${p.pole}"/>`;
}
