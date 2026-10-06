// The market keeps Dalal Street hours, so every date and clock reading here is in
// the market's own timezone (IST, UTC+05:30, no DST), never the runner's.

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Wall-clock date (YYYY-MM-DD) and minutes since midnight of `now` in market time. */
export function marketClock(now, market) {
  const shifted = new Date(now.getTime() + market.utcOffsetMinutes * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function addDays(date, n) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export const weekday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

export function isTradingDay(date, market) {
  const day = weekday(date);
  return day !== 0 && day !== 6 && !market.holidays.includes(date);
}

export function isMarketOpen(now, market) {
  const { date, minutes } = marketClock(now, market);
  return isTradingDay(date, market) && minutes >= toMinutes(market.open) && minutes < toMinutes(market.close);
}

/** Date of the next opening bell that hasn't rung yet as of `now`. */
export function nextOpenDate(now, market) {
  const { date, minutes } = marketClock(now, market);
  let next = minutes < toMinutes(market.open) ? date : addDays(date, 1);
  for (let i = 0; i < 30 && !isTradingDay(next, market); i++) next = addDays(next, 1);
  return next;
}

/** '2026-10-06' → '06 Oct' */
export function fmtDate(date) {
  return `${date.slice(8, 10)} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

/** '2026-10-12' → 'Mon 12 Oct' */
export function fmtDay(date) {
  return `${WEEKDAYS[weekday(date)]} ${fmtDate(date)}`;
}

export const monthName = (date) => MONTHS[Number(date.slice(5, 7)) - 1];

/** ISO timestamp → 'HH:MM' in market time. */
export function fmtClock(iso, market) {
  const { minutes } = marketClock(new Date(iso), market);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** ISO timestamp → '06 Oct 2026, 15:33 IST' */
export function fmtStamp(iso, market) {
  const { date } = marketClock(new Date(iso), market);
  return `${fmtDate(date)} ${date.slice(0, 4)}, ${fmtClock(iso, market)} IST`;
}
