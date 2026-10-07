// Commit Soudha, the town hall: a mock of Bengaluru's Vidhana Soudha, with its grand steps, a
// portico of twelve columns, a big central dome and smaller domes on the corners. Its motto
// rewrites the real one ("Government work is God's work") as "Commit work is God's work".
//
// It goes up between two contribution milestones. The full outline is always there as a dashed
// blueprint; the building fills it from the ground up (walls first, quickly, then the drum and
// the domes), wrapped in scaffolding, with two tower cranes and a board saying how far along it
// is. Once finished it's floodlit at night, like the real one.

import { n, pts, esc, width } from '../common.js';
import { KN, kn, knWidth } from '../kannada.js';
import { mix } from './palette.js';
import { Y } from './layout.js';

const G = Y.ground;
const PLINTH = G - 6;
const MAIN = G - 62; // top of the main block
const PAVILION = G - 72; // top of the corner pavilions
const ROOF = { dx: 16, dy: 13 }; // oblique depth of the roof
const LEVELS = [ // how high the building stands at each stage (fraction built → y)
  [0, PLINTH],
  [0.6, G - 70], // walls, columns and the portico's entablature
  [0.8, G - 100], // drum and the small domes
  [0.92, G - 128], // central dome
  [1, G - 140], // finials
];

/** The y the building has reached at fraction f, walls rising fast at first. */
export function builtTo(f) {
  if (f <= 0) return G;
  for (let k = 1; k < LEVELS.length; k++) {
    const [f0, y0] = LEVELS[k - 1];
    const [f1, y1] = LEVELS[k];
    if (f <= f1) {
      const t = (f - f0) / (f1 - f0);
      return y0 + (y1 - y0) * (k === 1 ? t ** 0.75 : t);
    }
  }
  return LEVELS.at(-1)[1];
}

const dome = (cx, base, rx, ry) => `M${n(cx - rx)},${n(base)} C${n(cx - rx)},${n(base - ry * 0.8)} ${n(cx - rx * 0.35)},${n(base - ry)} ${n(cx)},${n(base - ry * 1.08)} C${n(cx + rx * 0.35)},${n(base - ry)} ${n(cx + rx)},${n(base - ry * 0.8)} ${n(cx + rx)},${n(base)} Z`;

/** The whole building at (cx, ground), as shapes in a given set of colours. */
function building(cx, c, motto) {
  const out = [];
  const x = (dx) => cx + dx;
  const roof = (s) => `<g transform="translate(${ROOF.dx / 2},${-ROOF.dy / 2})">${s}</g>`;
  // Oblique side and roof of the main block
  out.push(`<polygon points="${pts([x(164), PLINTH], [x(164), PAVILION], [x(164 + ROOF.dx), PAVILION - ROOF.dy], [x(164 + ROOF.dx), PLINTH - ROOF.dy])}" fill="${c.side}"/>`);
  out.push(`<polygon points="${pts([x(-164), MAIN], [x(164), MAIN], [x(164 + ROOF.dx), MAIN - ROOF.dy], [x(-164 + ROOF.dx), MAIN - ROOF.dy])}" fill="${c.roof}"/>`);
  // Small domes on the roof, either side of the centre
  out.push(roof([-62, 62].map((d) => `<rect x="${n(x(d) - 9)}" y="${MAIN - 8}" width="18" height="8" fill="${c.wall}"/><path d="${dome(x(d), MAIN - 8, 10, 11)}" fill="${c.dome}"/><rect x="${n(x(d) - 0.6)}" y="${MAIN - 25}" width="1.2" height="6" fill="${c.trim}"/>`).join('')));
  // Central drum and dome, with a finial
  out.push(roof(`<rect x="${n(x(-27))}" y="${G - 100}" width="54" height="26" fill="${c.wall}"/>`
    + `<path d="${Array.from({ length: 7 }, (_, k) => `M${n(x(-21 + k * 7))},${G - 77}v-15a2.4,2.4 0 0 1 4.8,0v15z`).join('')}" fill="${c.deep}"/>`
    + `<rect x="${n(x(-30))}" y="${G - 102}" width="60" height="3" fill="${c.trim}"/>`
    + `<path d="${dome(x(0), G - 102, 29, 26)}" fill="${c.dome}"/>`
    + `<path d="M${n(x(-24))},${G - 106} q24,-6 48,0" fill="none" stroke="${c.trim}" stroke-width=".8"/>`
    + `<rect x="${n(x(-0.8))}" y="${G - 140}" width="1.6" height="12" fill="${c.trim}"/><circle cx="${n(x(0))}" cy="${G - 136}" r="2.4" fill="${c.trim}"/>`));
  // The main block and its three rows of arched windows
  out.push(`<rect x="${n(x(-164))}" y="${MAIN}" width="328" height="${PLINTH - MAIN}" fill="${c.wall}"/>`);
  out.push(`<rect x="${n(x(-126))}" y="${MAIN + 6}" width="252" height="${PLINTH - MAIN - 10}" fill="url(#sdwin)"/>`);
  out.push(...[MAIN + 4, MAIN + 22, MAIN + 40].map((y) => `<rect x="${n(x(-164))}" y="${y}" width="328" height="1.4" fill="${c.trim}"/>`));
  // Corner pavilions, a little taller, each with its own dome
  for (const d of [-145, 145]) {
    out.push(`<rect x="${n(x(d) - 19)}" y="${PAVILION}" width="38" height="${PLINTH - PAVILION}" fill="${c.wall}"/>`);
    out.push(`<rect x="${n(x(d) - 13)}" y="${PAVILION + 10}" width="26" height="${PLINTH - PAVILION - 14}" fill="url(#sdwin)"/>`);
    out.push(`<rect x="${n(x(d) - 21)}" y="${PAVILION - 2}" width="42" height="3" fill="${c.trim}"/>`);
    out.push(roof(`<rect x="${n(x(d) - 11)}" y="${PAVILION - 9}" width="22" height="7" fill="${c.wall}"/><path d="${dome(x(d), PAVILION - 9, 13, 13)}" fill="${c.dome}"/><rect x="${n(x(d) - 0.6)}" y="${PAVILION - 30}" width="1.2" height="8" fill="${c.trim}"/>`));
  }
  // The portico: twelve columns under an entablature carrying the motto, on a flight of steps
  out.push(`<rect x="${n(x(-50))}" y="${MAIN}" width="100" height="${G - 10 - MAIN}" fill="${c.deep}"/>`);
  for (let k = 0; k < 12; k++) {
    const colX = x(-47 + k * 8.55);
    out.push(`<rect x="${n(colX)}" y="${MAIN + 2}" width="3.4" height="${G - 12 - MAIN}" fill="${c.wall}"/><rect x="${n(colX + 2.2)}" y="${MAIN + 2}" width="1.2" height="${G - 12 - MAIN}" fill="${c.trim}"/>`);
  }
  out.push(`<rect x="${n(x(-55))}" y="${G - 70}" width="110" height="9" fill="${c.wall}"/><rect x="${n(x(-55))}" y="${G - 61.5}" width="110" height="1.2" fill="${c.trim}"/>`);
  out.push(`<polygon points="${pts([x(-44), G - 70], [x(-30), G - 78], [x(30), G - 78], [x(44), G - 70])}" fill="${c.wall}"/>`);
  if (motto) out.push(kn(x(0), G - 63.6, KN.motto, { size: 5.4, fill: c.ink, anchor: 'middle' }));
  out.push(`<rect x="${n(x(-170))}" y="${PLINTH}" width="340" height="6" fill="${c.trim}"/>`);
  out.push(`<polygon points="${pts([x(-70), G], [x(70), G], [x(54), G - 10], [x(-54), G - 10])}" fill="${c.wall}"/>`);
  out.push(`<path d="${[2.5, 5, 7.5].map((h) => `M${n(x(-70 + h * 1.6))},${G - h}h${n(140 - h * 3.2)}`).join('')}" stroke="${c.trim}" stroke-width=".6"/>`);
  return out.join('');
}

/** Arched windows for the facade, in the building's colours. */
export function soudhaDefs(p, lit) {
  const glass = lit ? p.window : p.lit ? p.windowOff : p.glassDark;
  return [`<pattern id="sdwin" patternUnits="userSpaceOnUse" width="10.5" height="18">`
    + `<path d="M3,15v-8a2.25,2.25 0 0 1 4.5,0v8z" fill="${glass}"/></pattern>`];
}

/**
 * Bulb strings along the rooflines and over the domes, the way the real Soudha is lit up on
 * special nights. Here the special nights are the ones after a day I committed.
 */
function festive(cx) {
  const x = (dx) => n(cx + dx);
  const lines = [
    `M${x(-164)},${MAIN}H${x(164)}`,
    ...[-145, 145].map((d) => `M${x(d - 19)},${PAVILION}H${x(d + 19)}`),
    `M${x(-55)},${G - 70}H${x(55)}`,
    `M${x(-29 + ROOF.dx / 2)},${G - 102 - ROOF.dy / 2} C${x(-29 + ROOF.dx / 2)},${G - 123 - ROOF.dy / 2} ${x(-10 + ROOF.dx / 2)},${G - 128 - ROOF.dy / 2} ${x(ROOF.dx / 2)},${G - 130 - ROOF.dy / 2} C${x(10 + ROOF.dx / 2)},${G - 128 - ROOF.dy / 2} ${x(29 + ROOF.dx / 2)},${G - 123 - ROOF.dy / 2} ${x(29 + ROOF.dx / 2)},${G - 102 - ROOF.dy / 2}`,
  ].join('');
  return `<g fill="none" stroke-linecap="round" stroke-width="1.5"><path d="${lines}" stroke="#ffe08a" stroke-dasharray="0 3.4"/>`
    + `<path class="bulbs" d="${lines}" stroke="#ff9f43" stroke-dasharray="0 3.4" stroke-dashoffset="1.7"/></g>`;
}

export const FESTIVE_CSS = '.bulbs{animation:bulbs 1.2s steps(1) infinite}@keyframes bulbs{50%{opacity:0}}';

/** Where the town hall stands and how far along it is. Returns what goes in the mid layer. */
export function soudha(cx, plan, p, { lightsOn = false } = {}) {
  const { built, start, done } = plan.soudha;
  const finished = built >= 1;
  // Floodlit when finished (warm light on granite at night); otherwise lit like everything else
  const raw = p.raw;
  const glow = finished && p.lit ? (col) => mix(col, '#ffcf8a', 0.22 * p.phase.lights) : null;
  const tone = (col) => (glow ? glow(col) : col);
  const c = {
    wall: tone(glow ? raw.soudha : p.soudha),
    side: tone(glow ? raw.soudhaDark : p.soudhaDark),
    roof: tone(glow ? raw.soudhaShade : p.soudhaShade),
    deep: tone(glow ? raw.soudhaDark : p.soudhaDark),
    dome: tone(glow ? raw.dome : p.dome),
    trim: tone(glow ? raw.soudhaShade : p.soudhaShade),
    ink: '#5a4630',
  };
  const out = [];
  if (finished) {
    out.push(building(cx, c, true));
    if (lightsOn && p.lit) out.push(festive(cx));
    return out.join('');
  }

  // Under construction: blueprint outline, the part built so far, scaffolding, cranes, a board
  const reached = builtTo(built);
  const filled = (fill) => ({ wall: fill, side: fill, roof: fill, deep: fill, dome: fill, trim: 'none', ink: 'none' });
  const blueprint = p.lit ? '#8fbcea' : p.ghost;
  out.push(`<g opacity="${p.lit ? 0.16 : 0.2}">${building(cx, filled(blueprint), false).replace(/fill="url\(#sdwin\)"/g, 'fill="none"')}</g>`);
  out.push(`<g fill="none" stroke="${blueprint}" stroke-width=".7" stroke-dasharray="3 2.5" opacity="${p.lit ? 0.8 : 0.7}">`
    + building(cx, filled('none'), false).replace(/fill="url\(#sdwin\)"/g, 'fill="none" stroke="none"') + '</g>');
  if (built > 0) {
    out.push(`<clipPath id="sdbuilt"><rect x="${n(cx - 200)}" y="${n(reached)}" width="400" height="${n(G - reached + 20)}"/></clipPath>`);
    out.push(`<g clip-path="url(#sdbuilt)">${building(cx, c, false)}</g>`);
  }
  if (built <= 0) return out.join('') + siteBoard(cx, plan, p);
  const top = Math.max(G - 140, reached - 16);
  const lines = [];
  for (let sx = cx - 172; sx <= cx + 172; sx += 11.5) lines.push(`M${n(sx)},${G}V${n(top)}`);
  for (let sy = G - 4; sy >= top; sy -= 8) lines.push(`M${n(cx - 172)},${n(sy)}H${n(cx + 172)}`);
  out.push(`<path d="${lines.join('')}" stroke="${p.scaffold}" stroke-width=".5" opacity=".9"/>`);

  // Two tower cranes, taller than the dome will be, their hooks travelling along the jibs
  for (const [dx, jib, flip, rise] of [[-22, 96, -1, 150], [128, 82, 1, 136]]) {
    const mx = cx + dx;
    const mtop = G - rise;
    const hookX = mx + flip * jib * 0.55;
    out.push(`<rect x="${n(mx - 1.8)}" y="${mtop}" width="3.6" height="${G - mtop}" fill="${p.crane}"/>`);
    out.push(`<path d="${Array.from({ length: Math.floor((G - mtop) / 7) }, (_, k) => `M${n(mx - 1.8)},${mtop + k * 7}l3.6,7`).join('')}" stroke="${p.craneDark}" stroke-width=".45"/>`);
    out.push(`<rect x="${n(flip > 0 ? mx - 22 : mx - jib)}" y="${mtop - 3.5}" width="${jib + 22}" height="3.5" fill="${p.crane}"/>`);
    out.push(`<rect x="${n(flip > 0 ? mx - 20 : mx + 12)}" y="${mtop}" width="8" height="6" fill="${p.craneDark}"/>`);
    out.push(`<polygon points="${pts([mx - 1.8, mtop - 3.5], [mx, mtop - 15], [mx + 1.8, mtop - 3.5])}" fill="${p.crane}"/>`);
    out.push(`<line x1="${n(mx)}" y1="${mtop - 15}" x2="${n(mx + flip * jib)}" y2="${mtop - 3.5}" stroke="${p.craneDark}" stroke-width=".5"/>`);
    out.push(`<g class="hook${flip > 0 ? '' : ' late'}"><line x1="${n(hookX)}" y1="${mtop}" x2="${n(hookX)}" y2="${n(reached - 22)}" stroke="${p.hoist}" stroke-width=".5"/>`
      + `<rect x="${n(hookX - 6)}" y="${n(reached - 22)}" width="12" height="5" fill="${p.concreteDark}"/></g>`);
    if (p.lit) out.push(`<circle class="blink" cx="${n(mx)}" cy="${mtop - 15}" r="1.4" fill="${p.beacon}"/><circle class="blink" cx="${n(mx + flip * jib)}" cy="${mtop - 2}" r="1.1" fill="${p.beacon}"/>`);
  }
  if (p.lit) {
    // Work lights on the site
    for (const dx of [-80, 0, 80]) out.push(`<circle cx="${n(cx + dx)}" cy="${n(reached - 6)}" r="16" fill="url(#glow)" opacity=".35"/>`);
  }

  return out.join('') + siteBoard(cx, plan, p);
}

/** The site board: what's being built and how far along it is. */
function siteBoard(cx, plan, p) {
  const { built, start, done } = plan.soudha;
  const out = [];
  const pct = Math.round(built * 100);
  const status = built > 0 ? `${pct}% BUILT · OPENS AT ${done.toLocaleString('en-IN')}` : `WORK STARTS AT ${start.toLocaleString('en-IN')}`;
  const bw = Math.max(width(status, 6.5, 0.3), width('COMMIT SOUDHA', 8, 0.8), knWidth(KN.soudha, 9)) + 18;
  // On posts in front of the left wing, so the blueprint dome stays in view
  const bx = cx - 92;
  const by = G - 58;
  out.push(...[bx - bw / 2 + 10, bx + bw / 2 - 10].map((x) => `<rect x="${n(x - 1)}" y="${by + 30}" width="2" height="${G - by - 30}" fill="${p.pole}"/>`));
  out.push(`<rect x="${n(bx - bw / 2)}" y="${by - 8}" width="${n(bw)}" height="38" rx="2" fill="#f7f2e3" stroke="${p.scaffold}" stroke-width="1.2"/>`);
  out.push(kn(bx, by + 4.5, KN.soudha, { size: 9, fill: '#7a2f1d', anchor: 'middle' }));
  out.push(`<text x="${n(bx)}" y="${by + 15}" font-size="8" font-weight="700" fill="#2b2b2b" text-anchor="middle" letter-spacing=".8">COMMIT SOUDHA</text>`);
  out.push(`<rect x="${n(bx - bw / 2 + 8)}" y="${by + 19}" width="${n(bw - 16)}" height="1" fill="#d9cfb4"/>`);
  out.push(`<text x="${n(bx)}" y="${by + 26.5}" font-size="6.5" font-weight="700" fill="#7a2f1d" text-anchor="middle" letter-spacing=".3">${esc(status)}</text>`);
  return out.join('');
}

export const SOUDHA_CSS = '.late{animation-delay:-7s}';
