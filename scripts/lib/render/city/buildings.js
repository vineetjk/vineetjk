// One building per public repo, in the mid layer. The busiest repos get the plots by Commit Street
// that you see at rest; the rest line up leftwards past Commit Soudha, so downtown spreads back
// along the line as the city grows. How a building looks comes from its repo:
//   pushed in the last 4 months → a glass tower; in the last 2 years → an apartment block with
//   water tanks on the roof; older → a Mangalore-tile house.
// Height and lit windows follow how much work it got (commits this year, else its size).

import { n, pts, esc, width, truncate, seeded } from '../common.js';
import { addDays } from '../../time.js';
import { mix } from './palette.js';
import { Y } from './layout.js';
import { palm } from './street.js';

const DEPTH = { dx: 9, dy: 7.5 }; // oblique side, same slant as the train
const NIGHT_LEVELS = [0.18, 0.36, 0.56, 0.78]; // share of windows lit, by work

/** Busiest first: commits this year, then most recently pushed, stars, size, name. */
export function rankRepos(repos) {
  return [...(repos ?? [])].sort((a, b) => b.commits - a.commits
    || (a.pushed < b.pushed ? 1 : a.pushed > b.pushed ? -1 : 0)
    || b.stars - a.stars || b.size - a.size || (a.name < b.name ? -1 : 1));
}

/** Plot centres in the mid layer: four right of Commit Street, then leftwards past the Soudha. */
export function plotX(k, A) {
  const near = [A + 212, A + 290, A + 364, A + 36];
  return k < near.length ? near[k] : A - 552 - (k - near.length) * 88;
}

export function styleOf(repo, today) {
  if (repo.pushed >= addDays(today, -120)) return 'tower';
  if (repo.pushed >= addDays(today, -730)) return 'apartment';
  return 'house';
}

/** Window patterns, one set per style: daylight glass, and four night levels. */
export function buildingDefs(p) {
  const rand = seeded('windows');
  const cells = (cols, rows, cw, ch, draw) => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(draw(c * cw, r * ch, rand()));
    return out.join('');
  };
  const defs = [];
  const tower = (id, lit) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="48" height="70">`
    + `<rect width="48" height="70" fill="${p.lit ? p.windowOff : p.glass}"/>`
    + cells(8, 10, 6, 7, (x, y, r) => {
      if (!p.lit) return r < 0.3 ? `<rect x="${x + 0.6}" y="${y + 0.8}" width="4.8" height="5.4" fill="${p.mullion}" opacity=".35"/>` : '';
      return r < lit ? `<rect x="${x + 0.8}" y="${y + 1}" width="4.4" height="5" fill="${r < lit * 0.3 ? p.windowCool : p.window}"/>` : '';
    })
    + `<path d="${Array.from({ length: 10 }, (_, k) => `M0,${k * 7}h48`).join('')}" stroke="${p.crown}" stroke-width=".8"/>`
    + '</pattern>';
  const flat = (id, lit) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="48" height="54">`
    + cells(6, 6, 8, 9, (x, y, r) => {
      const glass = !p.lit ? p.glassDark : r < lit ? (r < lit * 0.25 ? p.windowWarm : p.window) : p.windowOff;
      return `<rect x="${x + 2}" y="${y + 1.5}" width="4" height="4.6" fill="${glass}"/>`
        + `<rect x="${x}" y="${y + 6.4}" width="8" height="1" fill="${p.slab}"/>`
        + `<path d="M${x + 0.6},${y + 6.4}v-1.6M${x + 7.4},${y + 6.4}v-1.6M${x + 0.6},${y + 4.8}h6.8" stroke="${p.fence}" stroke-width=".4"/>`;
    })
    + '</pattern>';
  for (const [k, lit] of NIGHT_LEVELS.entries()) {
    defs.push(tower(`tw${k}`, lit), flat(`ap${k}`, lit));
  }
  return defs;
}

const work = (repo, max) => (max > 0 ? Math.log1p(repo.commits) / Math.log1p(max) : 0);

/** The oblique side and roof of a box whose front face is (x, top)–(x + w, base). */
function box(x, top, w, base, side, roof) {
  const { dx, dy } = DEPTH;
  return `<polygon points="${pts([x + w, base], [x + w, top], [x + w + dx, top - dy], [x + w + dx, base - dy])}" fill="${side}"/>`
    + `<polygon points="${pts([x, top], [x + w, top], [x + w + dx, top - dy], [x + dx, top - dy])}" fill="${roof}"/>`;
}

/** A rooftop sign with the repo's name, edged in its language colour. */
function rooftopSign(cx, y, name, color, p) {
  const label = truncate(name, 14);
  const w = width(label, 6.5, 0.2) + 8;
  const glow = p.lit ? `<rect x="${n(cx - w / 2 - 1.5)}" y="${n(y - 1.5)}" width="${n(w + 3)}" height="13" rx="2" fill="${color}" opacity=".35"/>` : '';
  return `${glow}<line x1="${n(cx - w / 3)}" y1="${n(y + 10)}" x2="${n(cx - w / 3)}" y2="${n(y + 14)}" stroke="${p.crown}" stroke-width="1"/>`
    + `<line x1="${n(cx + w / 3)}" y1="${n(y + 10)}" x2="${n(cx + w / 3)}" y2="${n(y + 14)}" stroke="${p.crown}" stroke-width="1"/>`
    + `<rect x="${n(cx - w / 2)}" y="${n(y)}" width="${n(w)}" height="10" rx="1.5" fill="#14181f" stroke="${color}" stroke-width="1"/>`
    + `<text x="${n(cx)}" y="${n(y + 7.2)}" font-size="6.5" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing=".2">${esc(label)}</text>`;
}

function tower(cx, repo, w01, p) {
  const w = 44 + Math.round(w01 * 12);
  const h = 92 + Math.round(w01 * 58);
  const x = cx - w / 2;
  const top = Y.ground - h;
  const level = Math.min(3, Math.floor(w01 * 4));
  const accent = repo.color;
  return `<g>${box(x, top, w, Y.ground + 8, mix(p.glassDark, '#000000', 0.15), p.crown)}`
    + `<g transform="translate(${n(x)},${n(top)})"><rect width="${w}" height="${h + 8}" fill="url(#tw${p.lit ? level : 0})"/>`
    + `<rect width="2.4" height="${h + 8}" fill="${accent}"/><rect width="${w}" height="5" fill="${p.crown}"/></g>`
    + `<rect x="${n(cx + w / 2 - 6)}" y="${n(top - 26)}" width="1.2" height="12" fill="${p.crown}"/>`
    + (p.lit ? `<circle class="blink" cx="${n(cx + w / 2 - 5.4)}" cy="${n(top - 26)}" r="1.3" fill="${p.beacon}"/>` : '')
    + rooftopSign(cx + DEPTH.dx / 2, top - 15, repo.name, accent, p)
    + '</g>';
}

function apartment(cx, repo, w01, p, rand) {
  const w = 54 + Math.round(w01 * 14);
  const h = 58 + Math.round(w01 * 34);
  const x = cx - w / 2;
  const top = Y.ground - h;
  const level = Math.min(3, Math.floor(w01 * 4));
  const facade = p.facade[[...repo.name].reduce((s, c) => s + c.charCodeAt(0), 0) % p.facade.length];
  const tanks = [0.2, 0.62].map((k) => {
    const tx = x + w * k + 4;
    return `<rect x="${n(tx)}" y="${n(top - 9)}" width="7" height="8" rx="2" fill="${p.tank}"/><rect x="${n(tx + 1)}" y="${n(top - 10.4)}" width="5" height="2" rx="1" fill="${p.tank}"/>`;
  }).join('');
  const stair = `<rect x="${n(x + w * 0.45)}" y="${n(top - 12)}" width="10" height="12" fill="${p.parapet}"/>`;
  return `<g>${box(x, top, w, Y.ground + 8, mix(facade, '#000000', 0.22), mix(facade, '#ffffff', 0.25))}${stair}${tanks}`
    + `<g transform="translate(${n(x)},${n(top)})"><rect width="${w}" height="${h + 8}" fill="${facade}"/>`
    + `<rect x="3" y="12" width="${w - 6}" height="${h - 10}" fill="url(#ap${p.lit ? level : 0})"/>`
    + `<rect width="${w}" height="3" fill="${p.parapet}"/></g>`
    + rooftopSign(cx, top - 26, repo.name, repo.color, p)
    + `${rand() < 0.5 ? `<rect x="${n(x + 4)}" y="${n(top + 3)}" width="${n(w - 8)}" height="6" fill="${repo.color}" opacity=".55"/>` : ''}`
    + '</g>';
}

function house(cx, repo, w01, p, rand) {
  const w = 42 + Math.round(rand() * 12);
  const h = 28 + Math.round(rand() * 10);
  const x = cx - w / 2;
  const top = Y.ground - h;
  const ridge = top - 16;
  const { dx, dy } = DEPTH;
  const lit = p.lit && rand() < 0.75;
  const win = (wx) => `<rect x="${n(wx)}" y="${n(top + 8)}" width="7" height="8" fill="${lit ? p.window : p.glassDark}"/><rect x="${n(wx - 1.5)}" y="${n(top + 8)}" width="1.5" height="8" fill="${p.door}"/><rect x="${n(wx + 7)}" y="${n(top + 8)}" width="1.5" height="8" fill="${p.door}"/>`;
  return '<g>'
    + `<polygon points="${pts([x + w, Y.ground + 8], [x + w, top], [x + w + dx, top - dy], [x + w + dx, Y.ground + 8 - dy])}" fill="${mix(p.wallWhite, '#000000', 0.2)}"/>`
    + `<rect x="${n(x)}" y="${n(top)}" width="${w}" height="${h + 8}" fill="${p.wallWhite}"/>`
    + win(x + 7) + win(x + w - 15)
    + `<rect x="${n(cx - 4)}" y="${n(Y.ground - 15)}" width="8" height="15" fill="${p.door}"/>`
    // Mangalore tiles: a hipped roof overhanging the walls, ridged with rows of tiles
    + `<polygon points="${pts([x - 5, top + 1], [x + w + 5, top + 1], [x + w + dx - 4, ridge - dy + 4], [x + 10, ridge])}" fill="${p.tile}"/>`
    + `<polygon points="${pts([x + w + 5, top + 1], [x + w + dx + 5, top + 1 - dy], [x + w + dx - 4, ridge - dy + 4])}" fill="${p.tileDark}"/>`
    + [0.3, 0.6].map((k) => `<line x1="${n(x - 5 + 15 * k)}" y1="${n(top + 1 - 15 * k)}" x2="${n(x + w + 5 - 9 * k)}" y2="${n(top + 1 - 15 * k)}" stroke="${p.tileDark}" stroke-width=".6"/>`).join('')
    + rooftopSign(cx, ridge - 18, repo.name, repo.color, p)
    + '</g>';
}

/**
 * The next building going up: a concrete frame as tall as it's far along, scaffolding around it,
 * a small crane and a board saying whose building it is and how many contributions it still needs.
 */
function site(cx, repo, next, p) {
  const w = 52;
  const full = 100;
  const h = Math.max(14, Math.round(full * next.progress));
  const x = cx - w / 2;
  const top = Y.ground - h;
  const floors = [];
  for (let y = Y.ground; y >= top; y -= 9) floors.push(`<rect x="${n(x)}" y="${n(y - 2)}" width="${w}" height="2" fill="${p.slab}"/>`);
  const cols = [0, 0.33, 0.66, 1].map((k) => `<rect x="${n(x + k * (w - 3))}" y="${n(top)}" width="3" height="${h}" fill="${p.concreteDark}"/>`).join('');
  const scaffold = [];
  for (let sx = x - 4; sx <= x + w + 4; sx += 8) scaffold.push(`M${n(sx)},${Y.ground}V${n(top - 6)}`);
  for (let sy = Y.ground; sy >= top - 6; sy -= 6) scaffold.push(`M${n(x - 4)},${n(sy)}H${n(x + w + 4)}`);
  const mast = { x: x + w + 14, top: Y.ground - full - 26 };
  const jib = 58;
  const label = repo ? truncate(repo.name, 14) : 'NEW BUILDING';
  const lines = [`NEXT: ${label}`, `${next.toNext} TO GO`];
  const bw = Math.max(...lines.map((l) => width(l, 6, 0.3))) + 10;
  return '<g>'
    + `<path d="${Array.from({ length: Math.ceil(full / 9) }, (_, k) => `M${n(x)},${n(Y.ground - k * 9)}h${w}`).join('')}" stroke="${p.ghost}" stroke-width=".5" stroke-dasharray="2 2" opacity=".5"/>`
    + `<rect x="${n(x)}" y="${n(Y.ground - full)}" width="${w}" height="${full}" fill="none" stroke="${p.ghost}" stroke-width=".7" stroke-dasharray="3 2" opacity=".6"/>`
    + cols + floors.join('')
    + `<path d="${scaffold.join('')}" stroke="${p.scaffold}" stroke-width=".55"/>`
    // Tower crane: mast, jib, counter-jib, and a hook that travels along the jib
    + `<rect x="${n(mast.x - 1.6)}" y="${n(mast.top)}" width="3.2" height="${n(Y.ground - mast.top)}" fill="${p.crane}"/>`
    + `<path d="${Array.from({ length: Math.floor((Y.ground - mast.top) / 6) }, (_, k) => `M${n(mast.x - 1.6)},${n(mast.top + k * 6)}l3.2,6`).join('')}" stroke="${p.craneDark}" stroke-width=".4"/>`
    + `<rect x="${n(mast.x - jib)}" y="${n(mast.top - 3)}" width="${jib + 18}" height="3" fill="${p.crane}"/>`
    + `<rect x="${n(mast.x + 10)}" y="${n(mast.top)}" width="7" height="5" fill="${p.craneDark}"/>`
    + `<polygon points="${pts([mast.x - 1.6, mast.top - 3], [mast.x, mast.top - 12], [mast.x + 1.6, mast.top - 3])}" fill="${p.crane}"/>`
    + `<g class="hook"><line x1="${n(mast.x - jib * 0.6)}" y1="${n(mast.top)}" x2="${n(mast.x - jib * 0.6)}" y2="${n(top - 14)}" stroke="${p.hoist}" stroke-width=".5"/>`
    + `<rect x="${n(mast.x - jib * 0.6 - 5)}" y="${n(top - 14)}" width="10" height="4" fill="${p.concreteDark}"/></g>`
    + (p.lit ? `<circle class="blink" cx="${n(mast.x)}" cy="${n(mast.top - 12)}" r="1.3" fill="${p.beacon}"/>` : '')
    + `<rect x="${n(cx - bw / 2)}" y="${n(Y.ground - 30)}" width="${n(bw)}" height="18" rx="1" fill="#f6f1e1" stroke="${p.scaffold}" stroke-width=".8"/>`
    + lines.map((l, k) => `<text x="${n(cx)}" y="${n(Y.ground - 22.5 + k * 7.5)}" font-size="6" font-weight="700" fill="#2b2b2b" text-anchor="middle" letter-spacing=".3">${esc(l)}</text>`).join('')
    + '</g>';
}

export const HOOK_CSS = '.hook{animation:hook 14s ease-in-out infinite alternate}@keyframes hook{from{transform:translateX(-16px)}to{transform:translateX(18px)}}';

/** Every built repo, plus the construction site for the next one. */
export function buildings(repos, plan, A, today, p) {
  const ranked = rankRepos(repos);
  const built = ranked.slice(0, plan.buildings);
  const maxCommits = Math.max(0, ...built.map((r) => r.commits));
  const maxSize = Math.max(1, ...built.map((r) => r.size));
  const parts = built.map((repo, k) => {
    const rand = seeded(`building/${repo.name}`);
    const cx = plotX(k, A);
    const w01 = maxCommits > 0 && repo.commits > 0 ? work(repo, maxCommits) : 0.25 * Math.log1p(repo.size) / Math.log1p(maxSize);
    const style = styleOf(repo, today);
    if (style === 'tower') return tower(cx, repo, w01, p);
    if (style === 'apartment') return apartment(cx, repo, w01, p, rand);
    return house(cx, repo, w01, p, rand);
  });
  const placed = parts.map((part, k) => [plotX(k, A), part]);
  if (plan.next) placed.push([plotX(plan.buildings, A), site(plotX(plan.buildings, A), ranked[plan.buildings], plan.next, p)]);
  // Left to right, so each building's oblique side tucks behind its right-hand neighbour
  return { parts: placed.sort((a, b) => a[0] - b[0]).map(([, part]) => part), built };
}

/**
 * The outskirts, before downtown starts: low houses, coconut palms, sheds and the odd concrete
 * frame left half built. Nothing here is data; it's what the city will grow into.
 */
export function outskirts(from, to, p) {
  const out = [];
  for (let k = 0, x = from; x < to; k++) {
    const rand = seeded(`outskirts/${k}`);
    const kind = rand();
    if (kind < 0.42) {
      // A small house with a tiled roof
      const w = 30 + rand() * 14;
      const h = 18 + rand() * 8;
      const top = Y.ground - h;
      const wall = p.facade[Math.floor(rand() * p.facade.length)];
      out.push(`<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(h + 6)}" fill="${wall}"/>`
        + `<polygon points="${pts([x - 4, top + 1], [x + w + 4, top + 1], [x + w - 4, top - 10], [x + 4, top - 10])}" fill="${p.tile}"/>`
        + `<rect x="${n(x + w * 0.2)}" y="${n(top + 6)}" width="5" height="6" fill="${p.lit && rand() < 0.6 ? p.window : p.glassDark}"/>`
        + `<rect x="${n(x + w * 0.62)}" y="${n(top + 8)}" width="6" height="${n(h - 8)}" fill="${p.door}"/>`);
      x += w + 18 + rand() * 30;
    } else if (kind < 0.68) {
      // Coconut palms
      out.push(palm(x, Y.ground, 34 + rand() * 18, p) + palm(x + 9, Y.ground, 26 + rand() * 14, p));
      x += 30 + rand() * 30;
    } else if (kind < 0.84) {
      // A shed with a sloping tin roof
      const w = 40 + rand() * 20;
      const top = Y.ground - 16;
      out.push(`<rect x="${n(x)}" y="${top}" width="${n(w)}" height="22" fill="${p.concreteDark}"/>`
        + `<polygon points="${pts([x - 2, top], [x + w + 2, top - 5], [x + w + 2, top - 2], [x - 2, top + 3])}" fill="${p.medianTop}"/>`
        + `<rect x="${n(x + 6)}" y="${top + 5}" width="${n(w * 0.4)}" height="11" fill="${p.shutter}"/>`);
      x += w + 24 + rand() * 30;
    } else if (kind < 0.94) {
      // Bare concrete frame, someone's next floor
      const w = 34 + rand() * 12;
      const floors = 2 + Math.floor(rand() * 3);
      const top = Y.ground - floors * 10;
      const cols = [0, 0.5, 1].map((t) => `<rect x="${n(x + t * (w - 2.4))}" y="${top}" width="2.4" height="${floors * 10 + 6}" fill="${p.concreteDark}"/>`).join('');
      const slabs = Array.from({ length: floors + 1 }, (_, f) => `<rect x="${n(x - 1)}" y="${Y.ground - f * 10}" width="${n(w + 2)}" height="2" fill="${p.slab}"/>`).join('');
      const rods = `<path d="M${n(x + 1)},${top}v-5M${n(x + w / 2)},${top}v-5M${n(x + w - 1)},${top}v-5" stroke="${p.pole}" stroke-width=".5"/>`;
      out.push(cols + slabs + rods);
      x += w + 26 + rand() * 30;
    } else {
      x += 60 + rand() * 50;
    }
  }
  return out;
}
