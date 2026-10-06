// The Commit Street sign: a dot-matrix LED board in warm gold that sits between the metro and the
// market. Lit LEDs flicker like an old neon-era sign. It is a physical sign, so it looks the same
// (dark) in both themes.

import { svg, n } from './common.js';

const W = 880;
const H = 80;
const PITCH = 7; // LED spacing
const LED = 2.65; // LED radius
const GOLD = '#ffc23d';
const GLOW = '#ffad0a';
const SHINE = '#fff1c2';
const OFF = '#2b2415';
const MESSAGE = 'COMMIT STREET';

// Bold 7-row dot-matrix glyphs (strokes two LEDs wide) for the letters the sign needs
const FONT = {
  C: ['.####.', '##..##', '##....', '##....', '##....', '##..##', '.####.'],
  O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  M: ['##...##', '###.###', '##.#.##', '##.#.##', '##...##', '##...##', '##...##'],
  I: ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
  T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  S: ['.#####', '##....', '##....', '.####.', '....##', '....##', '#####.'],
  R: ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##'],
  E: ['######', '##....', '##....', '#####.', '##....', '##....', '######'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
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

  // The display fills the whole board edge to edge: a bezel inset just inside the rounded frame,
  // and as many whole LED rows and columns as fit inside it, lined up with the text. Unlit LEDs are
  // a pattern; only lit ones are drawn individually.
  const bezel = { x: 5, y: 5, w: W - 10, h: H - 10, rx: 7 };
  const margin = {
    cols: Math.floor((x0 - PITCH / 2 - bezel.x - 2) / PITCH),
    rows: Math.floor((y0 - PITCH / 2 - bezel.y - 2) / PITCH),
  };
  const display = {
    x: x0 - PITCH / 2 - margin.cols * PITCH,
    y: y0 - PITCH / 2 - margin.rows * PITCH,
    w: (cols.length + 2 * margin.cols) * PITCH,
    h: (7 + 2 * margin.rows) * PITCH,
  };
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
    const restless = nextRand() < 0.06 ? ` class="f${Math.floor(nextRand() * 3)}"` : '';
    glow.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(LED * 1.9)}" fill="${GLOW}" opacity=".16"/>`);
    lit.push(`<g${restless}><circle cx="${n(cx)}" cy="${n(cy)}" r="${LED}" fill="${GOLD}"/>`
      + `<circle cx="${n(cx - 0.8)}" cy="${n(cy - 0.8)}" r="${n(LED * 0.4)}" fill="${SHINE}"/></g>`);
  }));

  const css = [
    // The whole board breathes and stutters now and then, like a warm sign on a cold night
    '.lit{animation:flicker 6s infinite}',
    '@keyframes flicker{0%,100%{opacity:1}41%{opacity:1}42%{opacity:.55}43%{opacity:1}44.5%{opacity:.75}46%{opacity:1}78%{opacity:.92}80%{opacity:1}}',
    '.f0,.f1,.f2{animation:sputter 2.3s infinite}.f1{animation-delay:-.8s}.f2{animation-delay:-1.6s;animation-duration:3.1s}',
    '@keyframes sputter{0%,100%{opacity:1}8%{opacity:.15}12%{opacity:1}15%{opacity:.4}19%{opacity:1}}',
  ].join('');

  const body = [
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="#0d0b07" stroke="${theme.border}"/>`,
    `<rect x="${bezel.x}" y="${bezel.y}" width="${bezel.w}" height="${bezel.h}" rx="${bezel.rx}" fill="#090704" stroke="#3a2f17"/>`,
    `<rect x="${n(display.x)}" y="${n(display.y)}" width="${n(display.w)}" height="${n(display.h)}" fill="url(#leds)"/>`,
    `<g class="lit">${glow.join('')}${lit.join('')}</g>`,
  ].join('');
  return svg({ w: W, h: H, theme, css, defs, body, weights: [700], title: `${MESSAGE}, in golden lights` });
}
