import { THEMES } from './theme.js';
import { ticker } from './ticker.js';
import { quote } from './quote.js';
import { chart } from './chart.js';
import { book } from './book.js';
import { fundamentals } from './fundamentals.js';
import { footer } from './footer.js';
import { city } from './city.js';
import { sign } from './sign.js';
import { BUTTONS, button, coffeeButton } from './buttons.js';
import { LIGHTS, lightButton } from './lights.js';
import { MAX_FLIGHTS, flight } from './flights.js';
import { cityRules, cityPlan } from '../city/growth.js';

export const PANELS = { city, sign, ticker, quote, chart, book, fundamentals, footer };

/**
 * Every SVG for both themes, as { path, content } relative to the repo root. Banners for DEV
 * posts also carry the post's link as `href`.
 */
export function renderAll(view, avatars) {
  const files = [];
  const planes = cityPlan(view.lifetime, cityRules(view.cfg)).has.planes;
  const posts = planes ? (view.stats.posts ?? []).slice(0, MAX_FLIGHTS) : [];
  for (const [name, theme] of Object.entries(THEMES)) {
    for (const [panel, draw] of Object.entries(PANELS)) {
      files.push({ path: `assets/${name}/${panel}.svg`, content: draw(view, theme, avatars) });
    }
    for (const b of BUTTONS) {
      files.push({ path: `assets/${name}/${b.id}.svg`, content: button(b, theme, view.cfg) });
    }
    if (view.cfg.buyMeACoffee) files.push({ path: `assets/${name}/coffee.svg`, content: coffeeButton(theme) });
    for (const phase of LIGHTS) files.push({ path: `assets/${name}/light-${phase}.svg`, content: lightButton(phase, theme) });
    posts.forEach((post, k) => files.push({
      path: `assets/${name}/flight-${k}.svg`,
      content: flight(post, theme),
      href: post.url ?? `https://dev.to/${view.cfg.devUsername ?? ''}`,
    }));
  }
  return files;
}

/** Commit City at each time of day, for the views/ pages. They use the dark frame only. */
export const renderViews = (view) =>
  LIGHTS.map((phase) => ({ phase, path: `assets/views/city-${phase}.svg`, content: city({ ...view, phase }, THEMES.dark) }));
