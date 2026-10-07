// Commit City: Bengaluru, built from my GitHub contributions. The Commit Metro train still runs
// through it on its viaduct (one coach per week, one window per day), and the city around the
// line grows with my all-time contributions: one building per public repo, a BMTC bus for every
// pull request merged this year, a banner plane for every DEV post, walkers and cyclists as busy
// as each week was, and Commit Soudha, the town hall, going up floor by floor. The light follows
// the real time in Bengaluru.
//
// The camera rides the same journey as Commit Metro, through four layers moving at different
// speeds: a far skyline, the buildings (mid), and the line with the street under it (near). The
// sky and the planes stay put. Everything rests on Commit Street, which is what static renderers
// and reduced motion show.

import { svg, text, width, n, seeded } from './common.js';
import { rupees } from '../money.js';
import { fmtDate } from '../time.js';
import { cityRules, cityPlan } from '../city/growth.js';
import { PALETTES, CH, LINES, weeksOf, stationsOf, lineOf, trainDefs, trainOf, viaduct, gantry, commitStreet, journey, animator, FADE, routeMap } from './metro.js';
import { KN, kn, knWidth } from './kannada.js';
import { W, H, RAIL_Y, SHIFT, ANCHOR, Y, PARALLAX, ZOOM } from './city/layout.js';
import { phasePalette } from './city/palette.js';
import { skyDefs, sky, clouds, planes, SKY_CSS } from './city/sky.js';
import { skylineDefs, skyline } from './city/skyline.js';
import { streetDefs, backStreet, road, median, frontStreet, lamps } from './city/street.js';
import { buildingDefs, buildings, outskirts, plotX, HOOK_CSS } from './city/buildings.js';
import { soudhaDefs, soudha, SOUDHA_CSS } from './city/soudha.js';
import { darshini, metroStairs, parkLawn, trees, bayStart, PLACES_CSS } from './city/places.js';
import { trafficDefs, traffic, TRAFFIC_CSS, standing, busShelter } from './city/traffic.js';

export function city(v, theme) {
  const p = phasePalette(v.phase);
  const m = p.metro;
  const { cfg, stats } = v;
  const plan = cityPlan(v.lifetime, cityRules(cfg));
  const weeks = weeksOf(stats.calendar);
  const stations = stationsOf(weeks, stats.stations);
  const geo = lineOf(weeks.length, ANCHOR);
  const { last, world, runAt, panAt, xEnd } = geo;
  const A = world(last); // Commit Street, where the camera rests
  const rand = seeded(`${cfg.login}/city`);

  // Layer offsets. The mid layer lines up with the near one at rest and lags behind it on the way.
  const pan = {
    near: (u) => panAt(u),
    mid: (u) => panAt(last) + PARALLAX.mid * (A - world(u)),
    far: (u) => panAt(u) * PARALLAX.far,
  };

  const defs = [
    ...skyDefs(p),
    `<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>`,
    ...trainDefs(m),
    ...skylineDefs(p),
    ...streetDefs(p),
    ...buildingDefs(p),
    ...soudhaDefs(p, plan.soudha.built >= 1 && p.lit),
    ...trafficDefs(p),
  ];

  // Sky and planes stay put
  const cloudLayer = clouds(p, W, rand);
  const planeLayer = plan.has.planes ? planes(stats.posts, p, W) : { defs: '', parts: [], css: '' };
  defs.push(planeLayer.defs);

  // Far layer: the rest of Bengaluru
  const farEnd = (A - ANCHOR) * PARALLAX.far + W + 400;
  const far = skyline(p, rand, { from: -300, to: farEnd, base: Y.ground });

  // Mid layer: Commit Soudha just behind Commit Street, repo buildings either side of them
  const today = stats.calendar.at(-1)?.d;
  // Downtown ends one plot past the last building (or the construction site); outskirts before that
  const downtown = Math.min(A - 560, plotX(plan.buildings + 1, A)) - 40;
  const mid = [
    `<rect x="0" y="${Y.ground}" width="${n(xEnd)}" height="${Y.backWalk - Y.ground}" fill="${p.lawnDark}"/>`,
    ...outskirts(1700, downtown, p),
    soudha(A - 300, plan, p),
    ...buildings(stats.repoList, plan, A, today, p).parts,
  ];

  // Near layer: the line and the street under it
  const gantries = stations.filter((s) => s.i < last).map((s) => gantry(world(s.i), s.names, m));
  const station = commitStreet(geo, v, m, stations, { kannada: KN.street });
  const line = [...viaduct(xEnd, m), ...gantries.map((g) => g.back), ...station.line];
  const train = trainOf(weeks, stats.calendar, m);
  const over = [...gantries.map((g) => g.front), ...station.over];
  const spots = { darshini: bayStart(A + 30), stairs: A + 236, busStop: bayStart(A - 140) + 3 };
  const reserved = [[spots.darshini, spots.darshini + 134], [spots.stairs - 26, spots.stairs + 64], [spots.busStop - 4, spots.busStop + 60], [A - 470, A - 130]];
  const thisWeek = weeks.at(-1)?.days.reduce((sum, d) => sum + d.c, 0) ?? 0;
  const moving = traffic({ weeks, prs: stats.prs, plan, p, A, xEnd, world, frames: journey(geo, stations, ZOOM), busStop: spots.busStop });
  const near = [
    ...backStreet(xEnd, p),
    parkLawn(A - 470, A - 130, p),
    trees(plan.trees, A, xEnd, p, reserved),
    plan.has.darshini ? darshini(spots.darshini, Math.min(6, 2 + Math.ceil(thisWeek / 4)), p, standing) : '',
    metroStairs(spots.stairs, p),
    plan.has.buses ? busShelter(spots.busStop + 8, p) : '',
    ...moving.back,
    ...road(xEnd, p),
    ...moving.far,
    ...median(xEnd, p),
    `<g transform="translate(0,${SHIFT})">${line.join('')}<g class="run">${train.join('')}</g>${over.join('')}</g>`,
    ...moving.near,
    ...frontStreet(xEnd, p),
    ...moving.front,
    lamps(xEnd),
  ];

  // Route map along the bottom, in the viewer's theme like the rest of the profile
  const route = routeMap(weeks, stations, PALETTES[theme.scheme], { top: Y.route, height: H - Y.route, lineY: Y.route + 18 });

  // Header over the sky: name, where and when, and how far the city has grown
  const total = plan.contributions;
  const header = cityHeader(p, plan, stats);

  const frames = journey(geo, stations, ZOOM);
  const animate = animator(frames, { u: last, zoom: ZOOM.rest });
  const css = [
    `.zoom{transform-origin:${ANCHOR}px ${RAIL_Y - CH}px}`,
    animate('zoom', (f) => `scale(${f.zoom})`),
    animate('far', (f) => `translateX(${n(pan.far(f.u))}px)`),
    animate('mid', (f) => `translateX(${n(pan.mid(f.u))}px)`),
    animate('pan', (f) => `translateX(${n(pan.near(f.u))}px)`),
    animate('run', (f) => `translateX(${n(runAt(f.u))}px)`),
    animate('marker', (f) => `translateX(${n(route.sx(f.u))}px)`),
    FADE,
    SKY_CSS,
    cloudLayer.css,
    planeLayer.css,
    '.blink{animation:blink 1.8s steps(1) infinite}@keyframes blink{60%{opacity:.15}}',
    HOOK_CSS,
    SOUDHA_CSS,
    PLACES_CSS,
    TRAFFIC_CSS,
  ].join('');

  const body = [
    `<g clip-path="url(#frame)">`,
    ...sky(p, W, rand),
    ...cloudLayer.parts,
    ...planeLayer.parts,
    '<g class="fade"><g class="zoom">',
    `<g class="far">${far.join('')}</g>`,
    `<g class="mid">${mid.join('')}</g>`,
    `<g class="pan">${near.join('')}</g>`,
    '</g></g>',
    ...route.parts,
    ...header,
    '</g>',
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${theme.border}"/>`,
  ].join('');

  const title = `Commit City: a Bengaluru that grows with my GitHub contributions. ${total} so far${stats.lifetime?.since ? ` since ${stats.lifetime.since}` : ''}. `
    + `The Commit Metro train runs through it with my last ${weeks.length} weeks, one coach per week and one window per day, lit for days I committed, `
    + `and pulls up at Commit Street, where $${cfg.symbol} trades at ${rupees(v.price)}. It's ${p.phase.label.toLowerCase()} in Bengaluru.`;
  return svg({ w: W, h: H, theme, css, defs: defs.join(''), body, title, kannada: true });
}

function cityHeader(p, plan, stats) {
  const { text: ink, muted, pill } = p.phase;
  const [top] = p.phase.sky;
  const name = 'COMMIT CITY';
  const pillX = 24 + width(name, 13) + 10;
  const where = KN.bengaluru;
  const when = `· ${p.phase.label}`;
  const gap = 5;
  const pillW = knWidth(where, 9) + gap + width(when, 8.5, 0.8) + 18;
  const right = `${plan.contributions.toLocaleString('en-IN')} CONTRIBUTIONS · ${plan.buildings} BUILDING${plan.buildings === 1 ? '' : 'S'}`;
  const out = [
    `<linearGradient id="scrim" x2="0" y2="1"><stop offset="0" stop-color="${top}" stop-opacity=".92"/><stop offset=".7" stop-color="${top}" stop-opacity=".55"/><stop offset="1" stop-color="${top}" stop-opacity="0"/></linearGradient>`,
    `<rect width="${W}" height="66" fill="url(#scrim)"/>`,
    text(24, 28, name, { size: 13, weight: 700, fill: ink }),
    `<rect x="${n(pillX)}" y="15.5" width="${n(pillW)}" height="17" rx="8.5" fill="${pill}"/>`,
    kn(pillX + 9, 28.2, where, { size: 9, fill: '#ffffff' }),
    text(pillX + 9 + knWidth(where, 9) + gap, 27.6, when, { size: 8.5, weight: 700, fill: '#ffffff', ls: 0.8 }),
    text(W - 24, 28, right, { size: 10, weight: 700, fill: muted, anchor: 'end', ls: 1 }),
    text(24, 46, 'Buildings are my repos, buses my merged PRs, planes my DEV posts.', { size: 9, fill: muted }),
  ];
  if (plan.next) {
    // Progress towards the next building
    const label = `NEXT BUILDING IN ${plan.next.toNext}`;
    const barW = 64;
    const barX = W - 24 - barW;
    const labelX = barX - 8;
    out.push(text(labelX, 46, label, { size: 7.5, weight: 700, fill: muted, anchor: 'end', ls: 0.6 }));
    out.push(`<rect x="${barX}" y="40" width="${barW}" height="6" rx="3" fill="${ink}" opacity=".18"/>`);
    out.push(`<rect x="${barX}" y="40" width="${n(Math.max(6, barW * plan.next.progress))}" height="6" rx="3" fill="${LINES.green}"/>`);
  }
  return out;
}
