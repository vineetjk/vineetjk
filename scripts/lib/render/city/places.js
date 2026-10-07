// Street-level places in the near layer: the darshini by Commit Street, the metro stairs, Cubbon
// Park's lawn and trees around Commit Soudha, and the trees along the road (one per 20
// contributions, each always in the same spot, so new ones never shuffle the old).

import { n, pts, esc, seeded } from '../common.js';
import { KN, kn, knWidth } from '../kannada.js';
import { mix } from './palette.js';
import { Y } from './layout.js';
import { tree } from './street.js';

const PILLAR = 72;
/** The gaps between viaduct pillars: bay k runs from 72k + 43 to 72k + 105. */
export const bayStart = (x) => Math.ceil((x - 43) / PILLAR) * PILLAR + 43;

/**
 * Shri Commit Darshini: a stand-up coffee and tiffin place under the viaduct, two bays wide, its
 * name in Kannada and English on a yellow board. People stand around with steel tumblers; the
 * crowd is as big as this week has been busy.
 */
export function darshini(x0, crowd, p, people) {
  const w = 134; // two bays and the pillar between them
  const top = Y.deck + 4;
  const front = Y.backWalk;
  const lit = p.lit;
  const out = [];
  out.push(`<rect x="${n(x0)}" y="${top}" width="${w}" height="${front - top}" fill="${p.wallWhite}"/>`);
  // Name board across the top: Kannada in the left bay, English in the right
  out.push(`<rect x="${n(x0)}" y="${top}" width="${w}" height="13" fill="${lit ? '#ffd23f' : p.autoYellow}"/>`);
  out.push(kn(x0 + 31, top + 9.6, KN.darshini, { size: 6.6, fill: '#b3261e', anchor: 'middle' }));
  out.push(`<text x="${n(x0 + 103)}" y="${top + 9}" font-size="5.6" font-weight="700" fill="#b3261e" text-anchor="middle" letter-spacing=".2">COMMIT DARSHINI</text>`);
  // Open front: dark inside (warm light at night), a steel counter, the coffee urn steaming
  const inside = lit ? '#d99a52' : mix(p.wallWhite, '#000000', 0.55);
  out.push(`<rect x="${n(x0 + 4)}" y="${top + 16}" width="${w - 8}" height="${front - top - 16}" fill="${inside}"/>`);
  if (lit) out.push(`<rect x="${n(x0 - 6)}" y="${front - 4}" width="${w + 12}" height="10" fill="#ffcf7a" opacity=".22"/>`);
  out.push(`<rect x="${n(x0 + 4)}" y="${front - 9}" width="${w - 8}" height="9" fill="${p.steel}"/>`);
  out.push(`<rect x="${n(x0 + 4)}" y="${front - 9}" width="${w - 8}" height="1.4" fill="#e6ebef"/>`);
  const urn = x0 + 16;
  out.push(`<rect x="${n(urn)}" y="${front - 21}" width="9" height="12" rx="2" fill="#c9a23f"/><rect x="${n(urn + 2.5)}" y="${front - 23.5}" width="4" height="3" rx="1" fill="#a5802b"/>`);
  out.push(`<g class="steam" fill="none" stroke="#ffffff" stroke-width="1" opacity=".55"><path d="M${n(urn + 3)},${front - 25} q-2,-3 0,-6 q2,-3 0,-6"/><path class="s2" d="M${n(urn + 6)},${front - 25} q2,-3 0,-6 q-2,-3 0,-6"/></g>`);
  // Menu board in the right bay
  out.push(`<path d="M${n(x0 + 30)},${top + 22}h28M${n(x0 + 30)},${top + 28}h28" stroke="${lit ? '#a8743a' : p.wallCap}" stroke-width="1"/>`);
  out.push(people.stand(x0 + 44, front - 8, () => 0.1, false));
  out.push(`<rect x="${n(x0 + 91)}" y="${top + 18}" width="${n(knWidth(KN.menu, 6) + 10)}" height="20" rx="1" fill="#2c3b2f"/>`);
  out.push(kn(x0 + 96, top + 26, KN.menu, { size: 6, fill: '#f4e9c8' }));
  out.push(`<text x="${n(x0 + 96)}" y="${top + 34}" font-size="5" font-weight="700" fill="#f4e9c8">COFFEE ₹15</text>`);
  // Regulars standing outside
  const rand = seeded('darshini');
  for (let k = 0; k < crowd; k++) {
    const px = x0 + 10 + ((k * 23 + rand() * 9) % (w - 14));
    out.push(people.stand(px, Y.backFeet, rand, k % 2 === 0));
  }
  return out.join('');
}

/** Stairs from the far footpath up to the Commit Street platform. */
export function metroStairs(x0, p) {
  const m = p.metro;
  const foot = Y.backWalk + 1;
  const topY = Y.deck - 2;
  const run = 52;
  const steps = [];
  for (let k = 1; k < 12; k++) steps.push(`M${n(x0 + (run * k) / 12)},${n(foot - ((foot - topY) * k) / 12)}h2.6`);
  return `<polygon points="${pts([x0, foot], [x0 + run, topY], [x0 + run + 10, topY], [x0 + 10, foot])}" fill="${m.deck}"/>`
    + `<path d="${steps.join('')}" stroke="${m.deckEdge}" stroke-width="1"/>`
    + `<line x1="${n(x0)}" y1="${n(foot - 9)}" x2="${n(x0 + run)}" y2="${n(topY - 9)}" stroke="${m.post}" stroke-width="1.2"/>`
    + `<rect x="${n(x0 - 14)}" y="${foot - 30}" width="2" height="30" fill="${p.pole}"/>`
    + `<rect x="${n(x0 - 24)}" y="${foot - 42}" width="22" height="14" rx="1.5" fill="${'#8b3fa4'}"/>`
    + kn(x0 - 13, foot - 33.2, KN.metro, { size: 6, fill: '#ffffff', anchor: 'middle' })
    + `<text x="${n(x0 - 13)}" y="${foot - 29.6}" font-size="3.6" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing=".2">METRO</text>`;
}

/** Cubbon Park: a lawn behind an iron fence in front of Commit Soudha. */
export function parkLawn(x0, x1, p) {
  const bars = [];
  for (let x = x0; x <= x1; x += 4) bars.push(`M${n(x)},${Y.backWalk}v-9`);
  return `<rect x="${n(x0)}" y="${Y.wall - 2}" width="${n(x1 - x0)}" height="${Y.backWalk - Y.wall + 2}" fill="${p.lawn}"/>`
    + `<path d="${bars.join('')}M${n(x0)},${Y.backWalk - 9}H${n(x1)}" stroke="${p.fence}" stroke-width=".7"/>`;
}

/**
 * Trees, one for every `treeEvery` contributions. The first few fill Cubbon Park around the
 * Soudha; the rest line the far footpath, each at a spot fixed by its number.
 */
export function trees(count, A, xEnd, p, avoid) {
  const out = [];
  const park = [A - 600, A - 560, A - 520, A - 105, A - 92, A - 640, A - 680, A - 75];
  for (let k = 0; k < count; k++) {
    const rand = seeded(`tree/${k}`);
    let x;
    if (k < park.length) x = park[k] + (rand() - 0.5) * 10;
    else {
      // Spread along the line, from Commit Street backwards, never on a reserved spot
      x = A - 760 - (k - park.length) * 150 - rand() * 90;
      if (avoid.some(([a, b]) => x > a - 14 && x < b + 14)) x -= 40;
    }
    if (x < 40 || x > xEnd) continue;
    out.push([x, tree(x, Y.backWalk + 2, 46 + rand() * 22, p, rand)]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(([, t]) => t).join('');
}

export const PLACES_CSS = [
  '.steam path{animation:steam 2.6s ease-in-out infinite}.steam .s2{animation-delay:-1.3s}',
  '@keyframes steam{0%{opacity:0;transform:translateY(3px)}40%{opacity:.8}100%{opacity:0;transform:translateY(-5px)}}',
].join('');
