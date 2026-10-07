// Buttons under Commit City for seeing it at another time of day. GitHub shows README images
// without running scripts, so a button can't change the picture in place. Each one opens a page
// in the repo (views/<phase>.md) with the city drawn at that time.

import { svg, text, n, width } from './common.js';
import { PHASES } from './city/palette.js';

export const LIGHTS = ['dawn', 'day', 'dusk', 'night'];

const W = 124;
const H = 34;

/** A small sun or moon for each time of day, centred on (cx, cy). */
function icon(phase, cx, cy) {
  const rays = (r0, r1, from, to, color) => {
    const out = [];
    for (let a = from; a <= to; a += 45) {
      const t = (a * Math.PI) / 180;
      out.push(`M${n(cx + r0 * Math.cos(t))},${n(cy - r0 * Math.sin(t))}L${n(cx + r1 * Math.cos(t))},${n(cy - r1 * Math.sin(t))}`);
    }
    return `<path d="${out.join('')}" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`;
  };
  if (phase === 'day') return `<circle cx="${cx}" cy="${cy}" r="4.6" fill="#fff1b8"/>${rays(6.6, 9, 0, 315, '#fff1b8')}`;
  if (phase === 'night') {
    return `<circle cx="${cx}" cy="${cy}" r="6" fill="#f3ead0"/><circle cx="${n(cx + 3)}" cy="${n(cy - 2.2)}" r="5.2" fill="${PHASES.night.pill}"/>`
      + `<circle cx="${n(cx + 6.5)}" cy="${n(cy + 3.5)}" r=".9" fill="#f3ead0"/>`;
  }
  // Dawn and dusk: half a sun on the horizon, rising pale or setting orange
  const color = phase === 'dawn' ? '#ffe2c4' : '#ffb067';
  const base = cy + 3;
  return `<path d="M${n(cx - 5.4)},${n(base)} a5.4,5.4 0 0 1 10.8,0 z" fill="${color}"/>${rays(7.2, 9.6, 45, 135, color)}`
    + `<path d="M${n(cx - 9)},${n(base + 1.2)}h18" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`;
}

export function lightButton(phase, theme) {
  const { label, pill } = PHASES[phase];
  const textW = width(label, 12, 1.4);
  const contentW = 18 + 8 + textW;
  const x0 = (W - contentW) / 2;
  const body = [
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${H / 2 - 0.5}" fill="${pill}" stroke="${theme.border}"/>`,
    `<rect x="3" y="2.5" width="${W - 6}" height="${H / 2 - 3}" rx="${H / 4}" fill="#ffffff" opacity=".1"/>`,
    icon(phase, n(x0 + 9), 17),
    text(x0 + 26, 21.4, label, { size: 12, weight: 700, fill: '#ffffff', ls: 1.4 }),
  ].join('');
  return svg({ w: W, h: H, theme, body, weights: [700], title: `See Commit City at ${phase}` });
}
