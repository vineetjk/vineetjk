import { svg, panel, text } from './common.js';
import { fmtStamp } from '../time.js';

const W = 880;
const H = 40;

export function footer(v, theme) {
  const line = `Just a game with fake money. Last updated ${fmtStamp(v.state.updatedAt, v.cfg.market)}.`;
  const body = panel(W, H, theme) + text(W / 2, 24.5, line, { size: 11, fill: theme.muted, anchor: 'middle' });
  return svg({ w: W, h: H, theme, body, weights: [400], title: line });
}
