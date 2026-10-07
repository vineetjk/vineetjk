// Kannada signs for Commit City. The embedded font (scripts/fonts/kannada-700.woff2) is Noto Sans
// Kannada Bold cut down to the Kannada block. It keeps the whole block on purpose: with only the
// signs' own letters, the RA subscript in ಶ್ರೀ, ಸ್ಟ್ರೀಟ್ and ಮೆಟ್ರೋ stops shaping. Kannada isn't
// monospaced, so EM holds each sign's width in em, measured in Chrome with that font.

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
  [KN.street]: 6.162,
  [KN.soudha]: 5.55,
  [KN.darshini]: 7.926,
  [KN.menu]: 4.961,
  [KN.bmtc]: 4.044,
  [KN.motto]: 11.337,
  [KN.metro]: 3.527,
};

export const knWidth = (s, size) => EM[s] * size;

/** A Kannada sign line. Any Kannada renders, but only strings in EM can be measured. */
export const kn = (x, y, s, o = {}) => text(x, y, s, { weight: 700, ...o, cls: 'kn' });
