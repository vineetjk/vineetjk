import { THEMES } from './theme.js';
import { ticker } from './ticker.js';
import { quote } from './quote.js';
import { chart } from './chart.js';
import { book } from './book.js';
import { fundamentals } from './fundamentals.js';
import { footer } from './footer.js';
import { metro } from './metro.js';
import { sign } from './sign.js';
import { BUTTONS, button, coffeeButton } from './buttons.js';

export const PANELS = { metro, sign, ticker, quote, chart, book, fundamentals, footer };

/** Every SVG for both themes, as { path, content } relative to the repo root. */
export function renderAll(view, avatars) {
  const files = [];
  for (const [name, theme] of Object.entries(THEMES)) {
    for (const [panel, draw] of Object.entries(PANELS)) {
      files.push({ path: `assets/${name}/${panel}.svg`, content: draw(view, theme, avatars) });
    }
    for (const b of BUTTONS) {
      files.push({ path: `assets/${name}/${b.id}.svg`, content: button(b, theme, view.cfg) });
    }
    if (view.cfg.buyMeACoffee) files.push({ path: `assets/${name}/coffee.svg`, content: coffeeButton(theme) });
  }
  return files;
}
