// Money is integer paise everywhere so a thousand trades never drift by a fraction of a rupee.

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 10235 → '₹102.35', 10000000 → '₹1,00,000.00' (Indian digit grouping). */
export const rupees = (paise) => `₹${inr.format(paise / 100)}`;

/** Same as rupees() without the symbol, for tight chart labels. */
export const plain = (paise) => inr.format(paise / 100);

export const toPaise = (amount) => Math.round(amount * 100);

/** Round to the nearest tick (₹0.05 on Indian exchanges), never below one tick. */
export function snap(paise, tick) {
  return Math.max(tick, Math.round(paise / tick) * tick);
}

export const pct = (from, to) => (from ? ((to - from) / from) * 100 : 0);

/** 2.345 → '+2.35', -0.004 → '+0.00' (no negative zero). */
export function signed(n, digits = 2) {
  const fixed = Math.abs(n).toFixed(digits);
  return `${n < 0 && Number(fixed) !== 0 ? '-' : '+'}${fixed}`;
}

export function arrow(n) {
  if (Math.abs(n) < 0.005) return '·';
  return n > 0 ? '▲' : '▼';
}
