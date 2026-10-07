// Kannada signs for Commit City. The embedded font (scripts/fonts/kannada-700.woff2) is a subset
// of Noto Sans Kannada Bold holding only these strings' glyphs, so a new sign means adding it here
// and rebuilding the subset. Kannada isn't monospaced: EM holds each string's width in em,
// measured in Chrome with that font.

import { text } from './common.js';

export const KN = {
  bengaluru: 'ಬೆಂಗಳೂರು',
  city: 'ಕಮಿಟ್ ನಗರ',
  street: 'ಕಮಿಟ್ ಸ್ಟ್ರೀಟ್',
  soudha: 'ಕಮಿಟ್ ಸೌಧ',
  darshini: 'ಶ್ರೀ ಕಮಿಟ್ ದರ್ಶಿನಿ',
  menu: 'ಕಾಫಿ · ತಿಂಡಿ',
  bmtc: 'ಬಿಎಂಟಿಸಿ',
  motto: 'ಕಮಿಟ್ ಕೆಲಸ ದೇವರ ಕೆಲಸ', // after Vidhana Soudha's "ಸರ್ಕಾರದ ಕೆಲಸ ದೇವರ ಕೆಲಸ"
  metro: 'ಮೆಟ್ರೋ',
};

const EM = {
  [KN.bengaluru]: 4.855,
  [KN.city]: 5.628,
  [KN.street]: 6.636,
  [KN.soudha]: 5.55,
  [KN.darshini]: 8.341,
  [KN.menu]: 4.961,
  [KN.bmtc]: 4.044,
  [KN.motto]: 11.337,
  [KN.metro]: 2.266,
};

export const knWidth = (s, size) => EM[s] * size;

/** A Kannada sign line. Only strings from KN render: the font has no other glyphs. */
export const kn = (x, y, s, o = {}) => text(x, y, s, { weight: 700, ...o, cls: 'kn' });
