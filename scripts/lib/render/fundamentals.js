import { svg, panel, text, label, width, n } from './common.js';

const W = 880;
const H = 256;

/** GitHub stats dressed up as a company's fundamentals; languages become sector allocation. */
export function fundamentals(v, theme) {
  const { derived: d, stats } = v;
  const parts = [panel(W, H, theme)];
  parts.push(label(24, 34, 'FUNDAMENTALS', theme));
  parts.push(label(24 + width('FUNDAMENTALS', 10, 1) + 12, 34, 'LIVE FROM GITHUB', theme, { weight: 400, fill: theme.faint }));
  parts.push(label(W - 24, 34, 'FAIR VALUE = f(30-DAY CONTRIBUTIONS)', theme, { weight: 400, anchor: 'end', fill: theme.faint }));

  const tiles = [
    ['30D CONTRIBUTIONS', d.last30, 'sets fair value', theme.accent],
    ['1Y CONTRIBUTIONS', d.total],
    ['CURRENT STREAK', `${d.streak}d`],
    ['BEST STREAK (1Y)', `${d.best}d`],
    ['PUBLIC REPOS', stats.repos],
    ['STARS', stats.stars],
    ['FOLLOWERS', stats.followers],
    ['MERGED PRs', stats.mergedPRs, 'pay dividends', theme.accent],
  ];
  const gap = 10;
  const tileW = (W - 48 - gap * 3) / 4;
  tiles.forEach(([name, value, note, accent], i) => {
    const x = 24 + (i % 4) * (tileW + gap);
    const y = 50 + Math.floor(i / 4) * 66;
    parts.push(`<rect x="${n(x)}" y="${y}" width="${n(tileW)}" height="56" rx="8" fill="${theme.panel2}"${accent ? ` stroke="${accent}" stroke-opacity=".35"` : ''}/>`);
    parts.push(label(x + 12, y + 20, name, theme, { weight: 400 }));
    parts.push(text(x + 12, y + 44, String(value), { size: 20, weight: 700, fill: accent }));
    if (note) parts.push(label(x + tileW - 12, y + 43, `→ ${note.toUpperCase()}`, theme, { weight: 400, anchor: 'end', fill: theme.faint, ls: 0.5 }));
  });

  // Sector allocation: one stacked bar of language share by bytes
  const langs = stats.languages ?? [];
  const total = langs.reduce((sum, l) => sum + l.size, 0) || 1;
  const by = 208;
  parts.push(label(24, by - 10, 'SECTOR ALLOCATION', theme));
  parts.push(`<clipPath id="bar"><rect x="24" y="${by}" width="${W - 48}" height="8" rx="4"/></clipPath>`);
  let x = 24;
  const segments = [];
  const legend = [];
  for (const lang of langs) {
    const w = (lang.size / total) * (W - 48);
    segments.push(`<rect x="${n(x)}" y="${by}" width="${n(w)}" height="8" fill="${lang.color}"/>`);
    legend.push(lang);
    x += w;
  }
  parts.push(`<g clip-path="url(#bar)"><rect x="24" y="${by}" width="${W - 48}" height="8" fill="${theme.panel2}"/>${segments.join('')}</g>`);
  let lx = 24;
  for (const lang of legend) {
    const share = `${lang.name} ${((lang.size / total) * 100).toFixed(1)}%`;
    if (lx + width(share, 11) + 16 > W - 24) break;
    parts.push(`<circle cx="${n(lx + 4)}" cy="${by + 25}" r="4" fill="${lang.color}"/>`);
    parts.push(text(lx + 13, by + 29, share, { size: 11, fill: theme.muted }));
    lx += width(share, 11) + 30;
  }

  const title = `Fundamentals from GitHub: ${d.last30} contributions in 30 days, ${d.total} in a year, ${d.streak}-day streak, ${stats.repos} public repos, ${stats.stars} stars, ${stats.followers} followers, ${stats.mergedPRs} merged PRs. Top languages: ${langs.slice(0, 3).map((l) => l.name).join(', ')}.`;
  return svg({ w: W, h: H, theme, body: parts.join(''), title });
}
