// The banner planes from Commit City, as links. GitHub shows the city as one image, and an image
// can only be one link, so the planes in the sky can't be clicked. Instead every DEV post that's
// flying over the city also gets a banner under it that opens the post.

import { svg, text, n, width } from './common.js';

export const MAX_FLIGHTS = 4; // as many as there are planes in the sky
const H = 40;

/** Post titles in the embedded font's characters, cut at a word to fit on a banner. */
export function bannerTitle(title, max) {
  const clean = String(title).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.:;!?-]+$/, '')}…`;
}

/** The plane from the city's sky, nose pointing left at (0, 0). */
function plane(dark) {
  const body = dark ? '#c9d0d8' : '#f4f6f8';
  const trim = dark ? '#8d99a6' : '#9aa5b1';
  return `<path d="M0,0 q1,-3.4 5,-3.8 h17 l7,-5.4 h3 l-2,6 l3,.6 v2.2 l-6,.4 h-22 q-5,-.2 -5,-1 z" fill="${body}" stroke="${trim}" stroke-width=".5"/>`
    + `<rect x="7" y="-6.4" width="12" height="1.4" rx=".6" fill="#c0392b"/>`
    + `<line x1="9" y1="-5" x2="12" y2="-1.2" stroke="${trim}" stroke-width=".6"/>`
    + `<rect x="5.2" y="-3.1" width="4.2" height="1.8" rx=".4" fill="#2a3644"/>`
    + `<ellipse cx="-.6" cy="-1.6" rx=".6" ry="4.2" fill="${trim}" opacity=".6"/>`;
}

export function flight(post, theme) {
  const title = bannerTitle(post.title, 60);
  const read = 'READ →';
  const titleW = width(title, 12, 0.2);
  const readW = width(read, 10, 1);
  const bx = 66; // the banner starts after the plane and its tow line
  const bw = 12 + titleW + 21 + readW + 12;
  const w = Math.ceil(bx + bw + 2);
  const divider = bx + 12 + titleW + 10.5;
  const body = [
    `<g transform="translate(4,25) scale(1.3)">${plane(theme.scheme === 'dark')}</g>`,
    `<line x1="46" y1="20" x2="${bx}" y2="19.5" stroke="${theme.muted}" stroke-width=".8"/>`,
    `<rect x="${bx}" y="6.5" width="${n(bw)}" height="27" rx="2.5" fill="#fff8e6" stroke="#d94f4f" stroke-width="1.2"/>`,
    text(bx + 12, 24.4, title, { size: 12, weight: 700, fill: '#2b2b2b', ls: 0.2 }),
    `<line x1="${n(divider)}" y1="11" x2="${n(divider)}" y2="29" stroke="#e8cfae"/>`,
    text(divider + 10.5, 23.8, read, { size: 10, weight: 700, fill: '#c0392b', ls: 1 }),
  ].join('');
  return svg({ w, h: H, theme, body, weights: [700], title: `${post.title}, a post of mine on DEV` });
}
