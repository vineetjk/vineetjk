// The far skyline: hazy blocks of the rest of Bengaluru, a TV tower and a couple of cranes. It
// drifts slowest of all the layers, which is most of what makes the city feel deep.

import { n, seeded, pts } from '../common.js';

/** Scattered lit windows for distant blocks: two patterns, so neighbours don't repeat. */
export function skylineDefs(p) {
  if (!p.lit) return [];
  const rand = seeded('far-windows');
  const tile = (id, w, h) => {
    const cells = [];
    for (let y = 4; y < h - 2; y += 7) {
      for (let x = 3; x < w - 2; x += 6) if (rand() < 0.04 + 0.12 * p.phase.lights) cells.push(`<rect x="${x}" y="${y}" width="2" height="2.6"/>`);
    }
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"><g fill="${p.window}" opacity=".62">${cells.join('')}</g></pattern>`;
  };
  return [tile('farA', 48, 70), tile('farB', 54, 63)];
}

function tvTower(x, base, p) {
  const top = base - 196;
  const band = p.lit ? p.far : '#c8553d';
  const legs = `<polygon points="${pts([x - 9, base], [x - 1.4, top + 30], [x + 1.4, top + 30], [x + 9, base])}" fill="${p.farDeep}"/>`;
  const bands = [0.25, 0.45, 0.62].map((k) => {
    const y = base - (base - top - 30) * k;
    const half = 9 - (9 - 1.4) * k;
    return `<rect x="${n(x - half)}" y="${n(y - 3)}" width="${n(half * 2)}" height="3" fill="${band}"/>`;
  }).join('');
  const deck = `<rect x="${x - 5}" y="${top + 26}" width="10" height="6" rx="1" fill="${p.farDeep}"/><rect x="${x - 0.6}" y="${top}" width="1.2" height="27" fill="${p.farDeep}"/>`;
  const light = p.lit ? `<circle class="blink" cx="${x}" cy="${top}" r="1.6" fill="${p.beacon}"/><circle class="blink" cx="${x}" cy="${top + 27}" r="1.2" fill="${p.beacon}"/>` : '';
  return legs + bands + deck + light;
}

function crane(x, base, h, jib, p) {
  const top = base - h;
  const c = p.farDeep;
  return `<rect x="${n(x - 1.4)}" y="${n(top)}" width="2.8" height="${n(h)}" fill="${c}"/>`
    + `<rect x="${n(x - jib * 0.3)}" y="${n(top - 2)}" width="${n(jib * 1.3)}" height="2" fill="${c}"/>`
    + `<polygon points="${pts([x - 1.4, top - 2], [x, top - 10], [x + 1.4, top - 2])}" fill="${c}"/>`
    + `<line x1="${n(x)}" y1="${n(top - 10)}" x2="${n(x + jib)}" y2="${n(top - 2)}" stroke="${c}" stroke-width=".6"/>`
    + `<line x1="${n(x + jib * 0.7)}" y1="${n(top)}" x2="${n(x + jib * 0.7)}" y2="${n(top + 22)}" stroke="${c}" stroke-width=".5"/>`
    + (p.lit ? `<circle class="blink" cx="${n(x)}" cy="${n(top - 10)}" r="1.1" fill="${p.beacon}"/>` : '');
}

/** Blocks from x = from to x = to in the far layer's own coordinates, standing on y = base. */
export function skyline(p, rand, { from, to, base }) {
  const out = [];
  const below = 40; // run past the ground so zooming out never shows their feet
  let k = 0;
  for (let x = from; x < to; k++) {
    const w = 18 + rand() * 30;
    const h = 30 + rand() ** 1.5 * 118;
    out.push(`<rect x="${n(x)}" y="${n(base - h)}" width="${n(w)}" height="${n(h + below)}" fill="${rand() < 0.5 ? p.far : p.farDeep}"/>`);
    if (p.lit && rand() < 0.85) out.push(`<rect x="${n(x + 2)}" y="${n(base - h + 3)}" width="${n(w - 4)}" height="${n(h - 6)}" fill="url(#far${rand() < 0.5 ? 'A' : 'B'})"/>`);
    if (rand() < 0.22) out.push(`<rect x="${n(x + w * 0.2)}" y="${n(base - h - 5)}" width="6" height="5" rx="1" fill="${p.farDeep}"/>`); // water tank
    if (k % 37 === 19) out.push(tvTower(x + w + 14, base, p));
    if (k % 23 === 7) out.push(crane(x + w / 2, base - h, 34 + rand() * 20, 26 + rand() * 14, p));
    x += w + 2 + rand() * 8;
  }
  return out;
}
