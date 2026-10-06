import { svg, panel, text } from './common.js';
import { fmtStamp } from '../time.js';

const W = 880;
const H = 56;

export function footer(v, theme) {
  const { cfg } = v;
  const line1 = `NOT A REAL SECURITY · PLAY MONEY ONLY · NOT INVESTMENT ADVICE · SEBI, PLEASE DON'T`;
  const line2 = `Last tick ${fmtStamp(v.state.updatedAt, cfg.market)} · settled by GitHub Actions · ledger in data/market.json`;
  const body = panel(W, H, theme)
    + text(W / 2, 24, line1, { size: 10, weight: 700, fill: theme.muted, anchor: 'middle', ls: 1 })
    + text(W / 2, 42, line2, { size: 11, fill: theme.faint, anchor: 'middle' });
  return svg({ w: W, h: H, theme, body, title: `${line1}. ${line2}.` });
}
