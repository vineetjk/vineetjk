// The Commit Street sign: a dot-matrix LED board in warm gold, framed by chasing marquee bulbs,
// that sits between the metro and the market. Lit LEDs flicker like an old neon-era sign. It is
// a physical sign, so it looks the same (dark) in both themes.

import { svg, n } from './common.js';

const W = 880;
const H = 132;
const PITCH = 9; // LED spacing
const LED = 3.1; // LED radius
const GOLD = '#ffc23d';
const GLOW = '#ffad0a';
const SHINE = '#fff1c2';
const OFF = '#2b2415';
const MESSAGE = 'COMMIT STREET';

// 5×7 dot-matrix glyphs for the letters the sign needs
const FONT = {
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

/** The message as columns of 7 booleans, one blank column between letters. */
function columns(message) {
  const cols = [];
  [...message].forEach((ch, k) => {
    const glyph = FONT[ch];
    if (k > 0) cols.push(Array(7).fill(false));
    for (let c = 0; c < glyph[0].length; c++) cols.push(glyph.map((row) => row[c] === '#'));
  });
  return cols;
}

export function sign(v, theme) {
  const cols = columns(MESSAGE);
  const x0 = (W - cols.length * PITCH) / 2 + PITCH / 2; // centre of the first LED column
  const y0 = (H - 7 * PITCH) / 2 + PITCH / 2;

  // Unlit LEDs fill the whole display through a pattern; only lit ones are drawn individually
  const display = { x: x0 - PITCH / 2 - 3 * PITCH, y: y0 - PITCH / 2 - PITCH, w: (cols.length + 6) * PITCH, h: 9 * PITCH };
  const defs = `<pattern id="leds" patternUnits="userSpaceOnUse" width="${PITCH}" height="${PITCH}" x="${n(x0 - PITCH / 2)}" y="${n(y0 - PITCH / 2)}">`
    + `<circle cx="${PITCH / 2}" cy="${PITCH / 2}" r="${LED}" fill="${OFF}"/></pattern>`;

  // A handful of LEDs flicker on their own, picked the same way every run
  let seed = 17;
  const nextRand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const glow = [];
  const lit = [];
  cols.forEach((col, c) => col.forEach((on, r) => {
    if (!on) return;
    const [cx, cy] = [x0 + c * PITCH, y0 + r * PITCH];
    const restless = nextRand() < 0.07 ? ` class="f${Math.floor(nextRand() * 3)}"` : '';
    glow.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(LED * 2)}" fill="${GLOW}" opacity=".18"/>`);
    lit.push(`<g${restless}><circle cx="${n(cx)}" cy="${n(cy)}" r="${LED}" fill="${GOLD}"/>`
      + `<circle cx="${n(cx - 0.9)}" cy="${n(cy - 0.9)}" r="${n(LED * 0.42)}" fill="${SHINE}"/></g>`);
  }));

  // Marquee bulbs around the frame, chasing in three phases
  const bulbs = [];
  const bulb = (x, y, k) => bulbs.push(`<circle class="b${k % 3}" cx="${n(x)}" cy="${n(y)}" r="2.6" fill="${GOLD}"/>`);
  let k = 0;
  for (let x = 20; x <= W - 20; x += 18) bulb(x, 11, k++);
  for (let y = 29; y <= H - 29; y += 18) bulb(W - 11, y, k++);
  for (let x = W - 20; x >= 20; x -= 18) bulb(x, H - 11, k++);
  for (let y = H - 29; y >= 29; y -= 18) bulb(11, y, k++);

  const css = [
    // The whole board breathes and stutters now and then, like a warm sign on a cold night
    '.lit{animation:flicker 6s infinite}',
    '@keyframes flicker{0%,100%{opacity:1}41%{opacity:1}42%{opacity:.55}43%{opacity:1}44.5%{opacity:.75}46%{opacity:1}78%{opacity:.92}80%{opacity:1}}',
    '.f0,.f1,.f2{animation:sputter 2.3s infinite}.f1{animation-delay:-.8s}.f2{animation-delay:-1.6s;animation-duration:3.1s}',
    '@keyframes sputter{0%,100%{opacity:1}8%{opacity:.15}12%{opacity:1}15%{opacity:.4}19%{opacity:1}}',
    '.b0,.b1,.b2{animation:chase 1.2s infinite}.b1{animation-delay:.4s}.b2{animation-delay:.8s}',
    '@keyframes chase{0%,30%{opacity:1}34%,100%{opacity:.2}}',
  ].join('');

  const body = [
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="#0d0b07" stroke="${theme.border}"/>`,
    `<rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="6" fill="#090704" stroke="#3a2f17"/>`,
    `<rect x="${n(display.x)}" y="${n(display.y)}" width="${n(display.w)}" height="${n(display.h)}" fill="url(#leds)"/>`,
    `<g class="lit">${glow.join('')}${lit.join('')}</g>`,
    ...bulbs,
  ].join('');
  return svg({ w: W, h: H, theme, css, defs, body, weights: [700], title: `${MESSAGE}, in golden lights` });
}
