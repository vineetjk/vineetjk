// Light in Commit City follows the real sky over Bengaluru (see dayPhase in time.js), not the
// viewer's GitHub theme. Everything is painted in daylight colours, then each phase pulls those
// towards its ambient light; lamps, windows and signs are added on top and ignore the ambient.

import { PALETTES } from '../metro.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** Blend colour a into b by t (0 = a, 1 = b). */
export const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));

export const PHASES = {
  dawn: {
    label: 'DAWN',
    sky: ['#29305f', '#7c6896', '#f1b089'],
    ambient: ['#2a2c5c', 0.36],
    lights: 0.45, // share of windows lit, and whether lamps are on
    sun: { x: 120, y: 236, r: 19, color: '#ffd2a1', glow: '#ff9d6e' },
    stars: 0.3,
    cloud: '#f2c3c4',
    text: '#f6f2fa',
    muted: '#d9cde3',
    pill: '#b9507a',
    metro: 0.55, // how far the train and viaduct lean towards their night colours
  },
  day: {
    label: 'DAY',
    sky: ['#4b8fd6', '#8bc0ea', '#d7edf8'],
    ambient: null,
    lights: 0,
    sun: { x: 792, y: 132, r: 13, color: '#fffbe6', glow: '#fff1b8' },
    stars: 0,
    cloud: '#ffffff',
    text: '#122233',
    muted: '#2e475f',
    pill: '#1f6fb8',
    metro: 0,
  },
  dusk: {
    label: 'DUSK',
    sky: ['#251f4c', '#94506f', '#f39a5c'],
    ambient: ['#3a1e3c', 0.42],
    lights: 0.75,
    sun: { x: 762, y: 240, r: 23, color: '#ffab5e', glow: '#ff6b3d' },
    stars: 0.15,
    cloud: '#f2a07f',
    text: '#fff3ec',
    muted: '#ecc9bf',
    pill: '#cf5b2c',
    metro: 0.6,
  },
  night: {
    label: 'NIGHT',
    sky: ['#050913', '#0c162d', '#1d2a47'],
    ambient: ['#070c18', 0.72],
    lights: 1,
    moon: { x: 742, y: 112, r: 11, color: '#f3ead0' },
    stars: 1,
    cloud: null,
    text: '#e6edf3',
    muted: '#9aa7b6',
    pill: '#474bab',
    metro: 1,
  },
};

// Daylight colours of every material in the city
const BASE = {
  far: '#a5b8cb', farDeep: '#93a8bd',
  concrete: '#dcd6c8', concreteDark: '#b9b09f', slab: '#c8c1b2',
  glass: '#6e9cc4', glassDark: '#4c7aa3', mullion: '#d2dde8', crown: '#3c4a5a',
  facade: ['#ecdcb9', '#f2d2b4', '#dbe4c9', '#ebcaca', '#d1dde8', '#e7e1d3'],
  facadeShade: '#000000',
  tile: '#b8542f', tileDark: '#8c3b20', wallWhite: '#f3efe4', door: '#3f7a5a',
  tank: '#2b2e33', parapet: '#cfc7b6',
  soudha: '#e2d8c3', soudhaShade: '#c9bda4', soudhaDark: '#a99c82', dome: '#d9cdb2', ghost: '#5f87b3',
  scaffold: '#c08a3e', crane: '#e3b52b', craneDark: '#9b7a1d', hoist: '#4a4a4a',
  lawn: '#7db368', lawnDark: '#5f9852', earth: '#c9b690', wall: '#ddd3c2', wallCap: '#b8ac97', fence: '#4b5a55',
  shop: ['#d8584a', '#3f7fb5', '#e0a63a', '#5a9b5e', '#8a5fa8'], shutter: '#9aa3a8',
  footpath: '#bdb7ab', kerb: '#8f8b82', paver: '#aaa397',
  asphalt: '#4b4f55', laneMark: '#ece8dd', medianYellow: '#e1c84a', medianBlack: '#2b2b2b', medianTop: '#9a978f',
  verge: '#86b56f', hedge: '#4f8a46', flower: '#e8659a',
  tree: ['#3f7a3a', '#56944a', '#70ad59'], trunk: '#6b4f3a', palm: '#4f8f43',
  pole: '#6c7276', water: '#6aa6c9', steel: '#b8c0c8',
  skin: ['#8d5a3b', '#a8714c', '#6f4630', '#c38a5f'],
  shirt: ['#d94f4f', '#3f7fd0', '#f2c14e', '#52a36b', '#e7e7e7', '#9b59b6', '#ef8a3c', '#2f3b52'],
  pants: ['#2f3b52', '#5a4a3a', '#222428', '#6b7a8f'],
  bus: '#f4f5f7', busBlue: '#1f5fbf', busDark: '#173f7d', glassDark2: '#1d2733', tyre: '#1f2124',
  autoGreen: '#2f8f4a', autoYellow: '#f2c230', autoTop: '#1e2a20',
  car: ['#e9ecef', '#b8bec6', '#c0392b', '#2c3e50', '#d35400', '#7f8c8d'],
};

/** The colours for one phase: daylight materials under that phase's ambient light. */
export function phasePalette(phaseName) {
  const phase = PHASES[phaseName];
  const shade = phase.ambient ? (c) => mix(c, phase.ambient[0], phase.ambient[1]) : (c) => c;
  // People and vehicles catch the streetlights, so they're shaded less than the buildings
  const ACTORS = new Set(['skin', 'shirt', 'pants', 'bus', 'busBlue', 'busDark', 'autoGreen', 'autoYellow', 'car']);
  const soft = phase.ambient ? (c) => mix(c, phase.ambient[0], phase.ambient[1] * 0.55) : (c) => c;
  const shaded = Object.fromEntries(Object.entries(BASE).map(([k, v]) => {
    const f = ACTORS.has(k) ? soft : shade;
    return [k, Array.isArray(v) ? v.map(f) : f(v)];
  }));
  const lit = phase.lights > 0;
  return {
    ...shaded,
    raw: BASE, // daylight colours, for things lit by their own floodlights
    phase,
    name: phaseName,
    lit,
    // Light sources keep their own colour in any phase
    window: '#ffd27a',
    windowWarm: '#ffb85c',
    windowCool: '#cfe4ff',
    windowOff: shade(BASE.glassDark),
    lamp: lit ? '#ffe2a0' : shade('#d9dde0'),
    beacon: '#ff3b30',
    led: '#ffb21a',
    metro: metroPalette(phase.metro),
  };
}

/** The train and viaduct, between their day (light theme) and night (dark theme) colours. */
function metroPalette(t) {
  const [a, b] = [PALETTES.light, PALETTES.dark];
  const out = {};
  for (const [k, v] of Object.entries(a)) {
    const w = b[k];
    if (typeof v === 'string' && typeof w === 'string' && v.startsWith('#')) out[k] = mix(v, w, t);
    else if (Array.isArray(v)) out[k] = v.map((c, i) => mix(c, w[i], t));
    else if (typeof v === 'number') out[k] = v + (w - v) * t;
    else out[k] = t >= 0.5 ? w : v;
  }
  return out;
}
