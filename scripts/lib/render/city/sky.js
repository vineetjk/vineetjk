// The sky over Commit City: it stays put while the city moves under it. Sun, moon and stars by
// phase, clouds drifting by in daylight, and a banner plane for each of my DEV posts.

import { n, esc, width, truncate } from '../common.js';

export const SKY_BOTTOM = 340;

export function skyDefs(p) {
  const [top, mid, low] = p.phase.sky;
  const defs = [
    `<linearGradient id="sky" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/></linearGradient>`,
    '<radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>',
  ];
  return defs;
}

/** The fixed sky: gradient, stars, and the sun or moon. */
export function sky(p, W, rand) {
  const out = [`<rect width="${W}" height="${SKY_BOTTOM}" fill="url(#sky)"/>`];
  const { sun, moon, stars } = p.phase;
  if (stars > 0) {
    const count = Math.round(70 * stars);
    for (let i = 0; i < count; i++) {
      const twinkle = rand() < 0.18 ? ` class="tw${i % 3}"` : '';
      out.push(`<circle${twinkle} cx="${n(rand() * W)}" cy="${n(60 + rand() * 170)}" r="${n(0.35 + rand() * 0.75)}" fill="#e3e9f2" opacity="${n((0.25 + rand() * 0.6) * Math.min(1, stars + 0.3))}"/>`);
    }
  }
  if (moon) {
    out.push(`<circle cx="${moon.x}" cy="${moon.y}" r="${moon.r * 4}" fill="url(#glow)" opacity=".12"/>`);
    out.push(`<circle cx="${moon.x}" cy="${moon.y}" r="${moon.r}" fill="${moon.color}"/>`);
    out.push(`<circle cx="${moon.x - 3}" cy="${moon.y - 2}" r="2.2" fill="#d9cfb4" opacity=".55"/><circle cx="${moon.x + 3.5}" cy="${moon.y + 3}" r="1.5" fill="#d9cfb4" opacity=".5"/>`);
  }
  if (sun) {
    out.push(`<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r * 3.2}" fill="url(#glow)" opacity=".45"/>`);
    out.push(`<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r * 1.6}" fill="${sun.glow}" opacity=".3"/>`);
    out.push(`<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${sun.color}"/>`);
  }
  return out;
}

export const SKY_CSS = [
  '.tw0,.tw1,.tw2{animation:tw 3.2s ease-in-out infinite}.tw1{animation-delay:-1.1s}.tw2{animation-delay:-2.2s;animation-duration:4.1s}',
  '@keyframes tw{50%{opacity:.15}}',
].join('');

/**
 * Things that cross the whole sky: each is drawn at its resting spot x and slides from x + L to
 * x - L, so a delay of half its period puts it back on that spot at the start of the loop.
 */
const CROSS = 1180;
function drift(cls, period, at) {
  // Without animation (reduced motion) it sits where the loop starts
  const off = CROSS - 2 * CROSS * (at % 1);
  const still = Math.abs(off) > 0.5 ? `transform:translateX(${n(off)}px);` : '';
  return `<g class="${cls}" style="${still}animation-duration:${n(period)}s;animation-delay:-${n(at * period)}s">`;
}

export function clouds(p, W, rand) {
  if (!p.phase.cloud) return { parts: [], css: '' };
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const x = 40 + ((i * 157 + rand() * 60) % (W - 80));
    const y = 82 + rand() * 90;
    const s = 0.7 + rand() * 0.8;
    const puffs = [[0, 0, 22, 7], [-14, 2, 13, 5.5], [15, 1.5, 14, 6], [4, -5, 12, 6.5]]
      .map(([dx, dy, rx, ry]) => `<ellipse cx="${n(x + dx * s)}" cy="${n(y + dy * s)}" rx="${n(rx * s)}" ry="${n(ry * s)}"/>`).join('');
    parts.push(`${drift('cloud', 160 + rand() * 120, 0.5)}<g fill="${p.phase.cloud}" opacity="${n(0.55 + rand() * 0.3)}">${puffs}</g></g>`);
  }
  return { parts, css: `.cloud{animation:cross linear infinite}@keyframes cross{from{transform:translateX(${CROSS}px)}to{transform:translateX(-${CROSS}px)}}` };
}

/** A small high-wing plane flying left, nose at (0, 0). */
function planeDef(p) {
  const night = p.lit;
  const body = night ? '#c9d0d8' : '#f4f6f8';
  return [
    '<g id="plane">',
    `<path d="M0,0 q1,-3.4 5,-3.8 h17 l7,-5.4 h3 l-2,6 l3,.6 v2.2 l-6,.4 h-22 q-5,-.2 -5,-1 z" fill="${body}"/>`,
    `<rect x="7" y="-6.4" width="12" height="1.4" rx=".6" fill="${night ? '#8d99a6' : '#c0392b'}"/>`,
    `<line x1="9" y1="-5" x2="12" y2="-1.2" stroke="${night ? '#8d99a6' : '#9aa5b1'}" stroke-width=".6"/>`,
    `<rect x="5.2" y="-3.1" width="4.2" height="1.8" rx=".4" fill="#2a3644"/>`,
    `<ellipse cx="-.6" cy="-1.6" rx=".6" ry="4.2" fill="${night ? '#8d99a6' : '#9aa5b1'}" opacity=".55"/>`,
    night ? '<circle class="nav" cx="31" cy="-8.8" r=".9" fill="#ff4d4d"/><circle cx="13" cy="-6.4" r=".7" fill="#4dff88"/>' : '',
    '</g>',
  ].join('');
}

/** Banner planes towing my DEV post titles across the sky. */
export function planes(posts, p, W) {
  if (!posts?.length) return { defs: '', parts: [], css: '' };
  const night = p.lit && p.name !== 'dawn';
  const list = posts.slice(0, 4);
  const period = 96;
  const parts = list.map((post, k) => {
    const title = truncate(post.title.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e]/g, ''), 46);
    const tw = width(title, 7.5, 0.3) + 16;
    const y = [84, 104, 94, 78][k];
    const x = 400 - tw / 2;
    const banner = night
      ? `<rect x="${n(x + 44)}" y="${y - 8}" width="${n(tw)}" height="12" rx="1.5" fill="#15181e" stroke="#3a3f48" stroke-width=".6"/>`
        + `<text x="${n(x + 44 + tw / 2)}" y="${y + 0.8}" font-size="7.5" font-weight="700" fill="${p.led}" text-anchor="middle" letter-spacing=".3">${esc(title)}</text>`
      : `<rect x="${n(x + 44)}" y="${y - 8}" width="${n(tw)}" height="12" rx="1.5" fill="#fff8e6" stroke="#d94f4f" stroke-width=".8"/>`
        + `<text x="${n(x + 44 + tw / 2)}" y="${y + 0.8}" font-size="7.5" font-weight="700" fill="#2b2b2b" text-anchor="middle" letter-spacing=".3">${esc(title)}</text>`;
    return `${drift('plane', period, 0.5 + k / list.length)}<use href="#plane" x="${n(x)}" y="${y}"/>`
      + `<line x1="${n(x + 33)}" y1="${y - 3.6}" x2="${n(x + 44)}" y2="${y - 2}" stroke="${night ? '#6b7480' : '#7d8894'}" stroke-width=".5"/>${banner}</g>`;
  });
  const css = `.plane{animation:fly linear infinite}@keyframes fly{from{transform:translateX(${CROSS}px)}to{transform:translateX(-${CROSS}px)}}`
    + (night ? '.nav{animation:nav 1.4s steps(1) infinite}@keyframes nav{50%{opacity:0}}' : '');
  return { defs: planeDef(p), parts, css };
}
