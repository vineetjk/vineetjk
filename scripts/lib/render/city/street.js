// The street under the metro, one long strip from x = 0 to xEnd in the near layer. Repeating
// things (walls, kerbs, lane marks, pillars, streetlights) are SVG patterns, so the strip costs
// the same however long the line gets.

import { n, pts } from '../common.js';
import { DECK } from '../metro.js';
import { RAIL_Y, Y } from './layout.js';

const PILLAR = 72; // pillar spacing, as on Commit Metro
const LAMP = 180; // streetlight spacing

export function streetDefs(p) {
  const m = p.metro;
  const pillarH = Y.median + 3 - RAIL_Y;
  const lampTop = 334;
  const glow = p.lit
    ? `<polygon points="${pts([150, lampTop + 6], [158, lampTop + 6], [176, Y.nearOuter - 2], [128, Y.nearOuter - 2])}" fill="${p.lamp}" opacity="${n(0.07 + 0.06 * p.phase.lights)}"/>`
      + `<ellipse cx="152" cy="${Y.nearInner + 3}" rx="30" ry="7" fill="${p.lamp}" opacity="${n(0.1 + 0.08 * p.phase.lights)}"/>`
      + `<circle cx="153" cy="${lampTop + 5}" r="9" fill="url(#glow)" opacity=".55"/>`
    : '';
  return [
    // Viaduct pillars standing on the median
    `<pattern id="pillars" patternUnits="userSpaceOnUse" width="${PILLAR}" height="${pillarH}" y="${RAIL_Y}">`
      + `<polygon points="24,${DECK} 52,${DECK} 45,${DECK + 7} 31,${DECK + 7}" fill="${m.pillar}"/>`
      + `<rect x="33" y="${DECK + 7}" width="10" height="${pillarH - DECK - 10}" fill="${m.pillar}"/>`
      + `<polygon points="43,${DECK + 7} 46,${DECK + 4} 46,${pillarH - 5} 43,${pillarH - 3}" fill="${m.pillarSide}"/>`
      + `<rect x="30" y="${pillarH - 4}" width="16" height="4" fill="${m.pillarSide}"/>`
      + '</pattern>',
    // Compound walls with a post every few metres and a gate now and then
    `<pattern id="wall" patternUnits="userSpaceOnUse" width="96" height="18" y="${Y.wall}">`
      + `<rect width="96" height="18" fill="${p.wall}"/><rect width="96" height="2" fill="${p.wallCap}"/>`
      + `<rect x="0" width="4" height="18" fill="${p.wallCap}"/><rect x="32" width="4" height="18" fill="${p.wallCap}"/>`
      + `<rect x="64" width="4" height="18" fill="${p.wallCap}"/><rect x="68" y="3" width="22" height="15" fill="${p.fence}"/>`
      + [72, 76, 80, 84].map((x) => `<rect x="${x}" y="3" width=".8" height="15" fill="${p.wallCap}"/>`).join('')
      + '</pattern>',
    // A clipped hedge with flowers, along the near footpath
    `<pattern id="hedge" patternUnits="userSpaceOnUse" width="30" height="12" y="${Y.verge - 3}">`
      + `<rect y="5" width="30" height="7" fill="${p.hedge}"/>`
      + [[5, 5.4, 5], [14, 4.4, 5.6], [24, 5.2, 5]].map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.hedge}"/><circle cx="${cx - 1.4}" cy="${cy - 1.6}" r="${r * 0.55}" fill="${p.tree[1]}"/>`).join('')
      + [[8, 3], [19, 2.6], [27, 4]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r=".9" fill="${p.flower}"/>`).join('')
      + '</pattern>',
    // Footpath pavers and the painted kerb stones (black and yellow, like every kerb in Bengaluru)
    `<pattern id="paver" patternUnits="userSpaceOnUse" width="12" height="10"><rect width="12" height="10" fill="${p.footpath}"/><path d="M0,.5 h12 M6,0 v5 M0,5.5 h12 M0,5 v5" stroke="${p.paver}" stroke-width=".5"/></pattern>`,
    `<pattern id="kerb" patternUnits="userSpaceOnUse" width="12" height="4"><rect width="6" height="4" fill="${p.medianYellow}"/><rect x="6" width="6" height="4" fill="${p.medianBlack}"/></pattern>`,
    // Streetlights on the near footpath, with a pool of light on the road when they're on
    `<pattern id="lamps" patternUnits="userSpaceOnUse" width="${LAMP}" height="${Y.verge - 320}" y="320">`
      + `<g transform="translate(0,-320)">${glow}`
      + `<rect x="165" y="${lampTop}" width="2" height="${Y.nearFeet - lampTop}" fill="${p.pole}"/>`
      + `<path d="M166,${lampTop + 1} q0,-4 -6,-4 h-6" fill="none" stroke="${p.pole}" stroke-width="1.6"/>`
      + `<rect x="148" y="${lampTop - 4.5}" width="9" height="3.6" rx="1.4" fill="${p.pole}"/>`
      + `<rect x="149" y="${lampTop - 1.4}" width="7" height="1.6" rx=".6" fill="${p.lamp}"/>`
      + `<rect x="163.5" y="${Y.nearFeet - 4}" width="5" height="4" fill="${p.pole}"/>`
      + '</g></pattern>',
  ];
}

/** Behind the viaduct: walls and the far footpath. */
export function backStreet(xEnd, p) {
  return [
    `<rect x="-400" y="${Y.wall}" width="${n(xEnd + 800)}" height="${Y.backWalk - Y.wall}" fill="url(#wall)"/>`,
    `<rect x="-400" y="${Y.backWalk}" width="${n(xEnd + 800)}" height="${Y.road - Y.backWalk}" fill="url(#paver)"/>`,
    `<rect x="-400" y="${Y.road - 2}" width="${n(xEnd + 800)}" height="2" fill="${p.kerb}"/>`,
  ];
}

/** The road surface, lane marks and the far half of it, up to the median. */
export function road(xEnd, p) {
  const span = `x="-400" width="${n(xEnd + 800)}"`;
  return [
    `<rect ${span} y="${Y.road}" height="${Y.nearWalk - Y.road}" fill="${p.asphalt}"/>`,
    ...[Y.road + 1.2, Y.nearWalk - 1.2].map((y) => `<line x1="-400" y1="${y}" x2="${n(xEnd + 400)}" y2="${y}" stroke="${p.laneMark}" stroke-width=".7" opacity=".7"/>`),
    ...[(Y.road + Y.median) / 2, (Y.medianBottom + Y.nearWalk) / 2].map((y) => `<line x1="-400" y1="${n(y)}" x2="${n(xEnd + 400)}" y2="${n(y)}" stroke="${p.laneMark}" stroke-width=".8" stroke-dasharray="9 13" opacity=".8"/>`),
  ];
}

/** The median the pillars stand on, and the pillars up to the deck. */
export function median(xEnd, p) {
  const span = `x="-400" width="${n(xEnd + 800)}"`;
  return [
    `<rect ${span} y="${Y.median}" height="2" fill="${p.medianTop}"/>`,
    `<rect ${span} y="${Y.median + 2}" height="${Y.medianBottom - Y.median - 2}" fill="url(#kerb)"/>`,
    `<rect x="0" y="${RAIL_Y}" width="${n(xEnd)}" height="${Y.median + 3 - RAIL_Y}" fill="url(#pillars)"/>`,
  ];
}

/** In front of the road: kerb, near footpath, streetlights and the verge. */
export function frontStreet(xEnd, p) {
  const span = `x="-400" width="${n(xEnd + 800)}"`;
  return [
    `<rect ${span} y="${Y.nearWalk}" height="2.6" fill="url(#kerb)"/>`,
    `<rect ${span} y="${Y.nearWalk + 2.6}" height="${n(Y.verge - Y.nearWalk - 2.6)}" fill="url(#paver)"/>`,
    `<rect ${span} y="${Y.verge}" height="${560 - Y.verge}" fill="${p.verge}"/>`,
    `<rect ${span} y="${Y.verge - 3}" height="12" fill="url(#hedge)"/>`,
  ];
}

/** Streetlights go over the walkers on the near footpath. */
export const lamps = (xEnd) => `<rect x="-400" y="320" width="${n(xEnd + 800)}" height="${Y.verge - 320}" fill="url(#lamps)"/>`;

/** A rain tree: a trunk and a lumpy round canopy, feet at (x, y). */
export function tree(x, y, h, p, rand) {
  const [dark, mid, light] = p.tree;
  const r = h * 0.36;
  const cy = y - h + r;
  const blobs = [[-0.55, 0.25, 0.7, dark], [0.55, 0.2, 0.72, dark], [0, 0, 1, mid], [-0.3, -0.25, 0.62, light], [0.35, -0.15, 0.55, light]];
  return `<rect x="${n(x - 1.4)}" y="${n(cy + r * 0.4)}" width="2.8" height="${n(y - cy - r * 0.4)}" fill="${p.trunk}"/>`
    + blobs.map(([dx, dy, k, c]) => `<circle cx="${n(x + dx * r * (0.9 + rand() * 0.2))}" cy="${n(cy + dy * r)}" r="${n(r * k)}" fill="${c}"/>`).join('');
}

/** A coconut palm, feet at (x, y). */
export function palm(x, y, h, p) {
  const top = y - h;
  const lean = h * 0.12;
  const fronds = [[-14, 4], [-9, 8], [10, 7], [14, 3], [-4, -2], [5, -3]]
    .map(([dx, dy]) => `<path d="M${n(x + lean)},${n(top)} q${n(dx * 0.5)},${n(dy - 6)} ${dx},${dy}" fill="none" stroke="${p.palm}" stroke-width="1.8" stroke-linecap="round"/>`).join('');
  return `<path d="M${n(x)},${n(y)} q${n(lean * 0.2)},${n(-h * 0.5)} ${n(lean)},${n(-h)}" fill="none" stroke="${p.trunk}" stroke-width="2"/>${fronds}`;
}
